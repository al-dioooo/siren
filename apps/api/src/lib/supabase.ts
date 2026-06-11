// Supabase server client (service role) — hanya untuk Storage di VPS. JANGAN bocor ke client.
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env';

export const CASE_ATTACHMENTS_BUCKET = 'case-attachments';

let client: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (!client) {
    client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return client;
}
