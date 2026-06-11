// Korpus lokal fallback untuk lawRef yang teks pasalnya belum tersedia/terverifikasi
// di pasal.id (ekstraksi mereka parsial; dicek 2026-06-11). Entri berupa kutipan
// substansi — body diberi label [Kutipan] dan sourceUrl menunjuk dokumen resmi BPK,
// supaya demo tidak menyajikan teks rekaan sebagai bunyi pasal verbatim.
// seed-pasal.ts SELALU mencoba pasal.id dulu; korpus ini hanya jalan terakhir.

export type CorpusEntry = {
  lawRef: string;
  title: string;
  body: string;
  sourceUrl: string;
};

export const PASAL_CORPUS: CorpusEntry[] = [
  {
    lawRef: 'UU 45/2009 Pasal 93',
    title: 'UU 45/2009 (Perubahan UU 31/2004 tentang Perikanan) — Pasal 93',
    body: '[Kutipan] (1) Setiap orang yang memiliki dan/atau mengoperasikan kapal penangkap ikan berbendera Indonesia yang melakukan penangkapan ikan di wilayah pengelolaan perikanan Negara Republik Indonesia dan/atau di laut lepas, yang tidak memiliki SIPI, dipidana dengan pidana penjara paling lama 6 (enam) tahun dan denda paling banyak Rp2.000.000.000,00 (dua miliar rupiah). (2) Setiap orang yang memiliki dan/atau mengoperasikan kapal penangkap ikan berbendera asing yang melakukan penangkapan ikan di ZEEI yang tidak memiliki SIPI, dipidana dengan pidana penjara paling lama 6 (enam) tahun dan denda paling banyak Rp20.000.000.000,00 (dua puluh miliar rupiah).',
    sourceUrl: 'https://peraturan.bpk.go.id/Details/38790/uu-no-45-tahun-2009',
  },
  {
    lawRef: 'UU 31/2004 Pasal 7',
    title: 'UU 31/2004 tentang Perikanan — Pasal 7',
    body: '[Kutipan] (1) Dalam rangka mendukung kebijakan pengelolaan sumber daya ikan, Menteri menetapkan antara lain: rencana pengelolaan perikanan, potensi dan alokasi sumber daya ikan, jumlah tangkapan yang diperbolehkan, serta kawasan konservasi perairan. (2) Setiap orang yang melakukan usaha dan/atau kegiatan pengelolaan perikanan wajib mematuhi ketentuan sebagaimana dimaksud pada ayat (1). Teks lengkap: lihat sumber resmi.',
    sourceUrl: 'https://peraturan.bpk.go.id/Details/40653/uu-no-31-tahun-2004',
  },
  {
    lawRef: 'PM 7/2021 Pasal 6',
    title: 'Permenhub PM 7/2021 (Perubahan PM 58/2015 tentang AIS) — Pasal 6',
    body: '[Kutipan] Nakhoda kapal berbendera Indonesia dan kapal asing yang berlayar di wilayah perairan Indonesia wajib memasang dan mengaktifkan Sistem Identifikasi Otomatis (Automatic Identification System/AIS) secara terus-menerus; menonaktifkan AIS tanpa alasan yang sah dikenai sanksi sesuai ketentuan peraturan perundang-undangan. Teks lengkap: lihat sumber resmi.',
    sourceUrl: 'https://peraturan.go.id/id/permenhub-no-pm-7-tahun-2021',
  },
  {
    lawRef: 'UU 17/2008 Pasal 117',
    title: 'UU 17/2008 tentang Pelayaran — Pasal 117',
    body: '[Kutipan] (1) Keselamatan dan keamanan angkutan perairan meliputi terpenuhinya persyaratan kelaiklautan kapal dan kenavigasian, termasuk perlengkapan navigasi elektronika kapal. (2) Kapal yang dinyatakan memenuhi persyaratan kelaiklautan diberikan sertifikat dan surat kapal. Teks lengkap: lihat sumber resmi.',
    sourceUrl: 'https://peraturan.bpk.go.id/Details/39060/uu-no-17-tahun-2008',
  },
  {
    lawRef: 'UU 17/2008 Pasal 193',
    title: 'UU 17/2008 tentang Pelayaran — Pasal 193',
    body: '[Kutipan] Ketentuan mengenai tata cara berlalu lintas, alur-pelayaran, dan tertib berlayar di perairan Indonesia; pelanggaran terhadap kewajiban tertib berlayar dikenai sanksi sesuai ketentuan Undang-Undang ini. Teks lengkap: lihat sumber resmi.',
    sourceUrl: 'https://peraturan.bpk.go.id/Details/39060/uu-no-17-tahun-2008',
  },
];
