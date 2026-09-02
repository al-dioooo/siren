// Hub LISTEN/NOTIFY untuk feed alert realtime (pengganti Supabase Realtime).
// Satu koneksi pg dedicated dipakai bersama semua client SSE — LISTEN tidak
// boleh lewat pooler transaction-mode, jadi pakai DIRECT_URL bila tersedia.
import pg from 'pg';
import { requireEnv } from './env';

export const ALERT_CHANNEL = 'alert_insert';

/** Payload trigger notify_alert_insert() — snake_case, sama seperti row Alert. */
export type AlertNotifyPayload = {
  id: string;
  lat: number;
  lng: number;
  severity: string;
  rule_type: string;
  assigned_agency_id: string | null;
};

type Listener = (payload: AlertNotifyPayload) => void;

const listeners = new Set<Listener>();

let client: pg.Client | null = null;
let connecting: Promise<void> | null = null;
let retryDelay = 1_000;
const MAX_RETRY_DELAY = 30_000;

function connectionString(): string {
  // DIRECT_URL = koneksi non-pooler; LISTEN butuh session yang persistent.
  return process.env.DIRECT_URL || requireEnv('DATABASE_URL');
}

function handleNotification(message: pg.Notification) {
  if (message.channel !== ALERT_CHANNEL || !message.payload) return;
  let payload: AlertNotifyPayload;
  try {
    payload = JSON.parse(message.payload) as AlertNotifyPayload;
  } catch {
    console.error('[alert-notify] payload bukan JSON valid, diabaikan');
    return;
  }
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      console.error('[alert-notify] listener error', error);
    }
  }
}

function scheduleReconnect() {
  client = null;
  connecting = null;
  if (listeners.size === 0) return;
  const delay = retryDelay;
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
  setTimeout(() => {
    void ensureListening().catch(() => {
      /* percobaan berikutnya dijadwalkan oleh handler error */
    });
  }, delay).unref?.();
}

/** Pastikan koneksi LISTEN hidup; aman dipanggil berkali-kali. */
async function ensureListening(): Promise<void> {
  if (client) return;
  if (connecting) return connecting;

  connecting = (async () => {
    const next = new pg.Client({ connectionString: connectionString() });
    next.on('notification', handleNotification);
    next.on('error', (error) => {
      console.error('[alert-notify] koneksi LISTEN error', error);
      scheduleReconnect();
    });
    next.on('end', scheduleReconnect);

    await next.connect();
    await next.query(`LISTEN ${ALERT_CHANNEL}`);

    client = next;
    connecting = null;
    retryDelay = 1_000;
    console.log(`[alert-notify] LISTEN ${ALERT_CHANNEL} aktif`);
  })();

  try {
    await connecting;
  } catch (error) {
    connecting = null;
    scheduleReconnect();
    throw error;
  }
}

/**
 * Daftarkan listener alert baru. Mengembalikan fungsi unsubscribe.
 * Koneksi LISTEN dibuka saat subscriber pertama dan ditutup saat yang terakhir
 * pergi, supaya API idle tidak menahan koneksi Postgres.
 */
export function subscribeAlertInsert(listener: Listener): () => void {
  listeners.add(listener);
  void ensureListening().catch((error) => {
    console.error('[alert-notify] gagal membuka koneksi LISTEN', error);
  });

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners.delete(listener);
    if (listeners.size === 0 && client) {
      const closing = client;
      client = null;
      closing.removeAllListeners('end');
      closing.removeAllListeners('error');
      void closing.end().catch(() => {
        /* koneksi sudah tertutup */
      });
    }
  };
}
