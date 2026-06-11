// Template Evidence PDF (plan 08 P2.1.3) — @react-pdf/renderer di VPS.
// Helvetica bawaan (latin) cukup untuk Bahasa Indonesia; gambar peta di-embed bytes.
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { EvidenceData } from '../services/evidence.service';

const C = {
  ink: '#111827',
  muted: '#6b7280',
  line: '#d1d5db',
  accent: '#7c3aed',
  danger: '#dc2626',
  bgSoft: '#f5f3ff',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: C.ink, fontFamily: 'Helvetica' },
  headerBar: { borderBottom: `2 solid ${C.accent}`, paddingBottom: 10, marginBottom: 14 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 9, color: C.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: C.accent,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 130, color: C.muted },
  value: { flex: 1, fontFamily: 'Helvetica-Bold' },
  map: { width: 515, height: 322, marginTop: 4, border: `1 solid ${C.line}` },
  mapPlaceholder: {
    width: 515,
    height: 120,
    marginTop: 4,
    border: `1 solid ${C.line}`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  chronoRow: { flexDirection: 'row', borderBottom: `0.5 solid ${C.line}`, paddingVertical: 4 },
  chronoTime: { width: 110, color: C.muted },
  chronoActor: { width: 100 },
  chronoText: { flex: 1 },
  explanationBox: {
    backgroundColor: C.bgSoft,
    border: `1 solid ${C.accent}`,
    padding: 10,
    marginTop: 4,
    lineHeight: 1.5,
  },
  citationBox: { border: `1 solid ${C.line}`, padding: 8, marginBottom: 6 },
  citationRef: { fontFamily: 'Helvetica-Bold', color: C.accent, marginBottom: 2 },
  citationBody: { lineHeight: 1.4, color: C.ink },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  signatureBox: { width: 200, alignItems: 'center' },
  signatureLine: { borderBottom: `1 solid ${C.ink}`, width: 180, height: 60 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: C.muted,
    borderTop: `0.5 solid ${C.line}`,
    paddingTop: 6,
  },
});

const fmt = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
});
const wib = (d: Date) => `${fmt.format(d)} WIB`;

function EvidenceDocument({ data, mapPng }: { data: EvidenceData; mapPng: Buffer | null }) {
  return (
    <Document title={`Evidence ${data.caseCode}`} author="SIREN">
      <Page size="A4" style={styles.page}>
        {/* Header resmi */}
        <View style={styles.headerBar}>
          <Text style={styles.title}>BERITA ACARA BUKTI ELEKTRONIK — {data.caseCode}</Text>
          <Text style={styles.subtitle}>
            SIREN — Spatial Intelligence for Illegal Fishing Response · {data.agency.name} (
            {data.agency.code}) · Dibuat {wib(new Date())}
          </Text>
        </View>

        {/* Identitas case & kapal */}
        <View>
          <Row label="Kode Case" value={data.caseCode} />
          <Row label="Status" value={data.caseStatus.toUpperCase()} />
          <Row label="Dibuka" value={`${wib(data.caseCreatedAt)} oleh ${data.openedBy}`} />
          <Row label="Kapal" value={data.vessel.name ?? '(tanpa nama)'} />
          <Row label="MMSI / IMO" value={`${data.vessel.mmsi} / ${data.vessel.imo ?? '-'}`} />
          <Row label="Bendera / Tipe" value={`${data.vessel.flag ?? '-'} / ${data.vessel.vesselType ?? '-'}`} />
          <Row label="Pelanggaran" value={`${data.alert.ruleLabel} (${data.alert.severity.toUpperCase()})`} />
          <Row label="Waktu Deteksi" value={wib(data.alert.createdAt)} />
          <Row
            label="Koordinat"
            value={`${data.alert.lat.toFixed(5)}, ${data.alert.lng.toFixed(5)}`}
          />
        </View>

        {/* Peta lokasi */}
        <Text style={styles.sectionTitle}>Lokasi Pelanggaran</Text>
        {mapPng ? (
          <Image style={styles.map} src={{ data: mapPng, format: 'png' }} />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={{ color: C.muted }}>Peta tidak tersedia</Text>
            <Text style={{ color: C.muted, fontSize: 8, marginTop: 2 }}>
              Koordinat: {data.alert.lat.toFixed(5)}, {data.alert.lng.toFixed(5)}
            </Text>
          </View>
        )}

        {/* Analisis AI */}
        {data.explanation && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Analisis SIREN</Text>
            <View style={styles.explanationBox}>
              <Text>{data.explanation}</Text>
            </View>
          </View>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Kronologi */}
        <Text style={styles.sectionTitle}>Kronologi Penanganan</Text>
        {data.chronology.length === 0 ? (
          <Text style={{ color: C.muted }}>Belum ada aktivitas tercatat.</Text>
        ) : (
          data.chronology.map((entry, i) => (
            <View key={i} style={styles.chronoRow} wrap={false}>
              <Text style={styles.chronoTime}>{wib(entry.at)}</Text>
              <Text style={styles.chronoActor}>{entry.actor}</Text>
              <Text style={styles.chronoText}>{entry.text}</Text>
            </View>
          ))
        )}

        {/* Dasar hukum */}
        <Text style={styles.sectionTitle}>Dasar Hukum</Text>
        {data.citations.length === 0 ? (
          <Text style={{ color: C.muted }}>Tidak ada kutipan pasal.</Text>
        ) : (
          data.citations.map((ct) => (
            <View key={ct.lawRef} style={styles.citationBox} wrap={false}>
              <Text style={styles.citationRef}>{ct.lawRef} — {ct.title}</Text>
              <Text style={styles.citationBody}>{ct.body}</Text>
              <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>Sumber: {ct.sourceUrl}</Text>
            </View>
          ))
        )}

        {/* Signature block */}
        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={{ marginBottom: 4 }}>Disusun oleh,</Text>
            <View style={styles.signatureLine} />
            <Text style={{ marginTop: 4, color: C.muted }}>Nama & Jabatan</Text>
            <Text style={{ color: C.muted }}>Tanggal: ____ / ____ / ______</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ marginBottom: 4 }}>Disetujui oleh,</Text>
            <View style={styles.signatureLine} />
            <Text style={{ marginTop: 4, color: C.muted }}>Pejabat Berwenang</Text>
            <Text style={{ color: C.muted }}>Tanggal: ____ / ____ / ______</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Dokumen dihasilkan otomatis oleh SIREN — verifikasi pada sistem.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Render PDF final sebagai Buffer (dipanggil route evidence). */
export async function renderEvidencePdf(data: EvidenceData, mapPng: Buffer | null): Promise<Buffer> {
  return renderToBuffer(<EvidenceDocument data={data} mapPng={mapPng} />);
}
