/**
 * Generator Surat Tugas Perjalanan Dinas (Word .docx)
 * Mengikuti template: SPT → Daftar Hadir → Daftar Honor → Notula → Kwitansi
 *
 * Data yang dibutuhkan (object `data`):
 * {
 *   // Identitas sekolah
 *   namaSekolah      : 'SD NEGERI 2 KALIWULU',
 *   alamatSekolah    : 'Jl. Kinatagama Desa Kaliwulu Kec.Plered Telp. 321048',
 *   kotaSekolah      : 'Cirebon 45158',
 *   korwil           : 'KORWIL BIDIKCAM PLERED',
 *   desaSekolah      : 'Kaliwulu',
 *
 *   // Kepala Sekolah
 *   namaKepsek       : 'YANA MULYANA, S.Pd.I',
 *   nipKepsek        : '198702192019031006',
 *
 *   // Surat
 *   nomorSurat       : '421.2/048/SD.V/2026',
 *   dasarKegiatan    : 'Dalam rangka sosialisasi Kelompok Kerja Guru (KKG) Perihal Penginputan Nilai Ijazah',
 *   namaKegiatan     : 'Sosialisasi KKG Perihal Penginputan Nilai Ijazah',
 *
 *   // Penerima tugas
 *   namaPenerima     : 'Kusnaeni, S.Pd.',
 *   nipPenerima      : '196904282005011003',
 *   jabatanPenerima  : 'Guru Kelas',
 *
 *   // Pelaksanaan
 *   hariTanggal      : 'Selasa, 09 Juni 2026',
 *   tanggalISO       : '2026-06-09',    // untuk format DD-MM-YYYY di daftar hadir
 *   waktu            : 'Pukul 08.00 WIB s/d Selesai',
 *   tempat           : 'Gedung Guru Kec. Plered',
 *
 *   // Keuangan
 *   honorJumlah      : 30000,           // angka
 *   nomorKwitansi    : '',              // boleh kosong
 *   terbilang        : 'Tiga Puluh Ribu Rupiah',
 *   keteranganBayar  : 'Dibayarkan Transport Perjalanan Dinas Kegiatan KKG',
 *
 *   // Bendahara (wajib, berbeda dengan penerima)
 *   namaBendahara    : 'KUSNAENI, S.Pd',
 *   nipBendahara     : '198012222003122007',
 *
 *   // Logo (opsional, base64 image data)
 *   logoKiri         : 'data:image/png;base64,...',
 *   logoKanan        : 'data:image/png;base64,...',
 * }
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, HeightRule,
  PageBreak, SectionType, convertMillimetersToTwip,
  TableLayoutType, VerticalAlign, TabStopType, ImageRun,
} from 'docx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT  = 'Times New Roman'

/** Twip dari pt */
const pt = (n) => n * 20

/** Format angka → "30.000,00" */
function fmtRpDoc(v) {
  const n = parseFloat(v) || 0
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format tanggal ISO → DD-MM-YYYY */
function fmtTglISO(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

/** Border penuh tipis */
const BORDER_ALL = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
}
/** Border none */
const BORDER_NONE = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'ffffff'},
  bottom: { style: BorderStyle.NONE, size: 0, color: 'ffffff'},
  left:   { style: BorderStyle.NONE, size: 0, color: 'ffffff'},
  right:  { style: BorderStyle.NONE, size: 0, color: 'ffffff'},
}

const BORDER_HEADER = {
      insideH: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
      insideV: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
      top:    { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
      bottom: { style: BorderStyle.THIN_THICK_MEDIUM_GAP, size: 18, color: '000000' },
      left:   { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
      right:  { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
    }


/** Paragraf teks biasa */
function para(text, opts = {}) {
  const {
    bold = false, size = 22, align = AlignmentType.LEFT,
    font = FONT, spacing = {}, indent = {}, underline = false,
  } = opts
  return new Paragraph({
    alignment: align,
    spacing: { after: 0, before: 0, ...spacing },
    indent,
    children: [new TextRun({ text, bold, size, font, underline: underline ? {} : undefined })],
  })
}

/** Paragraf kosong sebagai spacer */
function spacer(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun({ text: '' })] }))
}

/** Cell tabel dengan opsi lengkap */
function cell(children, opts = {}) {
  const {
    borders = BORDER_ALL,
    width,
    widthType = WidthType.DXA,
    colspan = 1,
    rowspan = 1,
    shading,
    vAlign = VerticalAlign.CENTER,
  } = opts
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    borders,
    columnSpan: colspan,
    rowSpan: rowspan,
    verticalAlign: vAlign,
    ...(width ? { width: { size: width, type: widthType } } : {}),
    ...(shading ? { shading } : {}),
  })
}

/** Baris tabel */
function row(cells, height) {
  return new TableRow({
    children: cells,
    ...(height ? { height: { value: height, rule: HeightRule.ATLEAST } } : {}),
  })
}

/** Hapus "Selasa, " dari "Selasa, 09 Juni 2026" → "09 Juni 2026" */
function tanpaPrefixHari(s) {
  return s ? s.replace(/^\w+,\s*/, '') : ''
}

// ─── HEADER KOP SURAT ─────────────────────────────────────────────────────────

function buildKopSurat(data) {
  // Helper: deteksi tipe gambar dari data URI base64
  // "data:image/png;base64,..." → { type: "png", data: "..." }
  function parseLogo(base64) {
    if (!base64 || typeof base64 !== 'string') return null
    try {
      // Jika ada prefix data URI, ekstrak tipe & datanya
      if (base64.startsWith('data:')) {
        const match = base64.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!match) return null
        let type = match[1].toLowerCase()
        // "jpeg" → "jpg" (docx hanya terima "jpg")
        if (type === 'jpeg') type = 'jpg'
        // docx hanya support: jpg, png, gif, bmp
        if (!['jpg', 'png', 'gif', 'bmp'].includes(type)) return null
        return { type, data: match[2] }
      }
      // Jika tidak ada prefix, asumsikan PNG
      return { type: 'png', data: base64 }
    } catch (err) {
      console.error('Error parsing logo base64:', err)
      return null
    }
  }

  const logoKiri  = parseLogo(data.logoKiri)
  const logoKanan = parseLogo(data.logoKanan)

  // Kolom logo kiri
  const logoKiriCell = new TableCell({
    width: { size: 1300, type: WidthType.DXA },
    borders: BORDER_HEADER,
    verticalAlign: VerticalAlign.CENTER,
    children: logoKiri ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: logoKiri.type,
            data: logoKiri.data,
            transformation: { width: 90, height: 90 },
          }),
        ],
      }),
    ] : [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '', size: 18, font: FONT })],
      }),
    ],
  })

  // Kolom logo kanan
  const logoKananCell = new TableCell({
    width: { size: 1300, type: WidthType.DXA },
    borders: BORDER_HEADER,
    verticalAlign: VerticalAlign.CENTER,
    children: logoKanan ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: logoKanan.type,
            data: logoKanan.data,
            transformation: { width: 90, height: 90 },
          }),
        ],
      }),
    ] : [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '', size: 18, font: FONT })],
      }),
    ],
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          logoKiriCell,
          // Kolom teks kop
          new TableCell({
            borders: BORDER_HEADER,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para('PEMERINTAH KABUPATEN CIREBON',    { size: 24, align: AlignmentType.CENTER, font: FONT }),
              para('DINAS PENDIDIKAN',                 { size: 24, align: AlignmentType.CENTER, font: FONT }),
              para(data.korwil,                        { size: 24, align: AlignmentType.CENTER, font: FONT }),
              para(data.namaSekolah,                   { bold: true,  size: 28, align: AlignmentType.CENTER, font: FONT }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Alamat : ${data.alamatSekolah} `, size: 20, font: FONT}),
                           new TextRun({ text: data.kotaSekolah, size: 20, font: FONT})],
              }),
            ],
          }),
          logoKananCell,
        ],
      }),
    ],
  })
}

// ─── HALAMAN 1: SURAT PERINTAH TUGAS ─────────────────────────────────────────

function buildSPT(data) {
  return [
    buildKopSurat(data),
    ...spacer(1),

    para('SURAT PERINTAH TUGAS', { bold: true, size: 24, align: AlignmentType.CENTER, font: FONT }),
    para(`NOMOR : ${data.nomorSurat}`,  { size: 22, align: AlignmentType.CENTER, font: FONT, spacing: { after: 120 } }),

    // Baris Dasar
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: { insideH: BORDER_NONE.top, insideV: BORDER_NONE.top,
                 top: BORDER_NONE.top, bottom: BORDER_NONE.top,
                 left: BORDER_NONE.top, right: BORDER_NONE.top },
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 1400, type: WidthType.DXA },
            children: [para('Dasar', { size: 22, font: FONT })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 300, type: WidthType.DXA },
            children: [para(':', { size: 22, font: FONT, align: AlignmentType.CENTER })] }),
          new TableCell({ borders: BORDER_NONE,
            children: [para(data.dasarKegiatan, { size: 22, font: FONT })] }),
        ]}),
      ],
    }),

    ...spacer(1),
    para('MEMERINTAHKAN', { bold: true, size: 22, align: AlignmentType.CENTER, font: FONT }),
    ...spacer(1),

    // Tabel Kepada
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: [
          cell(para('Kepada',      { size: 22, font: FONT }), { width: 1400, borders: BORDER_NONE,verticalAlign: VerticalAlign.TOP}),
          cell(para(':',           { size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 300, borders: BORDER_NONE,verticalAlign: VerticalAlign.TOP }),
          cell(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({ children: [
                new TableCell({ borders: BORDER_NONE, width: { size: 1800, type: WidthType.DXA },
                  children: [para('Nama',    { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE, width: { size: 300, type: WidthType.DXA },
                  children: [para(':',        { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE,
                  children: [para(data.namaPenerima,     { size: 22, font: FONT})],
                  verticalAlign: VerticalAlign.CENTER }),
              ]}),
              new TableRow({ children: [
                new TableCell({ borders: BORDER_NONE,
                  children: [para('NIP', { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE,
                  children: [para(':', { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE,
                  children: [para(data.nipPenerima, { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
              ]}),
              new TableRow({ children: [
                new TableCell({ borders: BORDER_NONE,
                  children: [para('Jabatan', { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE,
                  children: [para(':', { size: 22, font: FONT })],
                  verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ borders: BORDER_NONE,
                  children: [para(data.jabatanPenerima, { size: 22, font: FONT})],
                  verticalAlign: VerticalAlign.CENTER }),
              ]}),
            ],
          }), { borders: BORDER_NONE }),
        ]}),
      ],
    }),

    ...spacer(1),

    // Baris Untuk
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: { insideH: BORDER_NONE.top, insideV: BORDER_NONE.top,
                 top: BORDER_NONE.top, bottom: BORDER_NONE.top,
                 left: BORDER_NONE.top, right: BORDER_NONE.top },
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 1400, type: WidthType.DXA },
            children: [para('Untuk', { size: 22, font: FONT })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 300, type: WidthType.DXA },
            children: [para(':', { size: 22, font: FONT, align: AlignmentType.CENTER })] }),
          new TableCell({ borders: BORDER_NONE,
            children: [new Paragraph({
              children: [
                new TextRun({ text: 'Melaksanakan perjalanan dinas dalam rangka ', size: 22, font: FONT }),
                new TextRun({ text: data.namaKegiatan, size: 22, font: FONT, underline: {} }),
                new TextRun({ text: ' yang diselenggarakan pada :', size: 22, font: FONT }),
              ],
            })] }),
        ]}),
      ],
    }),

    // Hari/waktu/tempat — paragraf dengan tab stop (label : nilai)
    ...spacer(1),
    ...[
      ['Hari/tanggal', data.hariTanggal],
      ['Waktu',        data.waktu],
      ['Tempat',       data.tempat],
    ].map(([lbl, val]) => new Paragraph({
      spacing: { after: 0, before: 0 },
      indent: { left: 1700 },
      tabStops: [
        { type: TabStopType.LEFT, position: 1700 + 1600 },  // posisi titik dua
        { type: TabStopType.LEFT, position: 1700 + 1600 + 300 }, // posisi nilai
      ],
      children: [
        new TextRun({ text: lbl,   size: 22, font: FONT }),
        new TextRun({ text: '\t:', size: 22, font: FONT }),
        new TextRun({ text: '\t' + val, size: 22, font: FONT }),
      ],
    })),

    ...spacer(1),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({
        text: 'Demikian surat ini kami berikan kepada yang bersangkutan untuk diketahui dan dilaksanakan sebagaimana mestinya.',
        size: 22, font: FONT,
      })],
      spacing: { after: 200 },
    }),

    // TTD Kepsek (kanan) — paragraf dengan indent kiri untuk posisi kolom kanan
    para(`Dikeluarkan    : ${data.desaSekolah}`,            { size: 22, font: FONT, indent: { left: 5500 } }),
    para(`Pada tanggal   : ${tanpaPrefixHari(data.hariTanggal)}`, { size: 22, font: FONT, indent: { left: 5500 } }),
    para('Kepala Sekolah', { size: 22, font: FONT, indent: { left: 5500 }, spacing: { after: 1200 } }),
    ...spacer(3),
    para(data.namaKepsek,        { size: 22, font: FONT, bold: true, underline: true, indent: { left: 5500 } }),
    para(`NIP.${data.nipKepsek}`, { size: 22, font: FONT, indent: { left: 5500 } }),
  ]
}

// ─── HALAMAN 2: DAFTAR HADIR & PENERIMAAN HONOR (1 lembar) ───────────────────

function buildDaftarHadirHonor(data) {
  const tglFormatted = fmtTglISO(data.tanggalISO)
  return [
    buildKopSurat(data),
    ...spacer(1),

    // ── Bagian 1: Daftar Hadir ──────────────────────────────────────────────
    para('DAFTAR HADIR', { bold: true, size: 24, align: AlignmentType.CENTER, font: FONT }),
    ...spacer(1),

    ...[
      ['Hari/tanggal', data.hariTanggal],
      ['Kegiatan',     data.namaKegiatan],
      ['Tempat',       data.tempat],
    ].map(([lbl, val]) => new Paragraph({
      alignment:AlignmentType.JUSTIFIED,
      spacing: { after: 0, before: 0 },
      tabStops: [
        { type: TabStopType.LEFT, position: 1200 },
        { type: TabStopType.LEFT, position: 1200 + 200 },
      ],
      indent: { start:1400, hanging: 1400, },
      children: [
        new TextRun({ text: lbl,   size: 22, font: FONT }),
        new TextRun({ text: '\t:', size: 22, font: FONT }),
        new TextRun({ text: '\t' + val, size: 22, font: FONT }),
      ],
    })),
    ...spacer(1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        // Header
        row([
          cell(para('NO',    { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 700 }),
          cell(para('NAMA',  { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER })),
          cell(para('JABATAN',  { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 2000 }),
          cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: 'PARAF', bold: true, size: 22, font: FONT }),
          ]}), { width: 1500 }),
          
        ], pt(28)),
        // Baris peserta
        row([
          cell(para('1', { size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 700 }),
          cell(para(data.namaPenerima, { size: 22, font: FONT, indent: { left: 100 } })),
          cell(para(data.jabatanPenerima, { size: 22, font: FONT, align:AlignmentType.CENTER, width: 2000 })),
          cell(para('', { size: 22, font: FONT }), { width: 1500, vAlign: VerticalAlign.CENTER }),
        ], pt(48)),
      ],
    }),

    ...spacer(3),

    // ── Bagian 2: Daftar Penerimaan Honor ───────────────────────────────────
    para('DAFTAR PENERIMAAN HONOR', { bold: true, size: 24, align: AlignmentType.CENTER, font: FONT, spacing: { after: 80 } }),
    ...spacer(1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: [
        row([
          cell(para('NO',   { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 700 }),
          cell(para('NAMA', { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER })),
          cell(new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: 'HONOR YANG DITERIMA ', bold: true, size: 22, font: FONT, break: 0 }),
            new TextRun({ text: '(Rp.)', bold: true, size: 22, font: FONT }),
          ]}), { width: 2400 }),
          cell(para('TANDA TANGAN', { bold: true, size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 2200 }),
        ], pt(40)),
        row([
          cell(para('1', { size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 700 }),
          cell(para(data.namaPenerima, { size: 22, font: FONT,  indent: { left: 100 } })),
          cell(para(fmtRpDoc(data.honorJumlah), { size: 22, font: FONT, align: AlignmentType.CENTER }), { width: 2400 }),
          cell(para('', { size: 22, font: FONT }), { width: 2200, vAlign: VerticalAlign.CENTER }),
        ], pt(48)),
      ],
    }),

    ...spacer(2),

    // ── TTD Kepala Sekolah (kanan) ───────────────────────────────────────────
    para(`${data.desaSekolah}, ${tanpaPrefixHari(data.hariTanggal)}`, { size: 22, font: FONT, indent: { left: 5500 } }),
    para('Kepala Sekolah', { size: 22, font: FONT, indent: { left: 5500 }, spacing: { after: 1200 } }),
    ...spacer(3),
    para(data.namaKepsek,        { size: 22, font: FONT, bold: true, underline: true, indent: { left: 5500 } }),
    para(`NIP.${data.nipKepsek}`, { size: 22, font: FONT, indent: { left: 5500 } }),
  ]
}

// ─── HALAMAN 4: NOTULA KEGIATAN ───────────────────────────────────────────────

function buildNotula(data) {
  const itemsA = [
    'Pembukaan.',
    'Sambutan dan arahan dari koordinator KKG.',
    `Penyampaian materi mengenai teknis ${data.namaKegiatan.toLowerCase()}.`,
    'Penjelasan prosedur dan tahapan penginputan data.',
    'Praktik dan simulasi.',
    'Diskusi dan tanya jawab.',
    'Penutup.',
  ]
  const itemsC = [
    `Penjelasan mengenai tujuan dan pentingnya ${data.namaKegiatan.toLowerCase()} secara tepat dan akurat.`,
    'Pembahasan persiapan data dan dokumen yang diperlukan.',
    'Penjelasan mengenai tata cara dan tahapan pelaksanaan.',
    'Penegasan pentingnya kesesuaian antara data yang diinput dengan dokumen resmi.',
    'Pembahasan mengenai pemeriksaan ulang data sebelum finalisasi.',
    'Identifikasi kendala yang mungkin terjadi serta langkah penyelesaiannya.',
    'Penekanan terhadap ketelitian, ketepatan waktu, dan tanggung jawab.',
  ]
  const itemsD = [
    `Peserta memahami prosedur dan mekanisme ${data.namaKegiatan.toLowerCase()}.`,
    'Peserta mengetahui dokumen dan data yang perlu dipersiapkan.',
    'Peserta memahami pentingnya melakukan verifikasi dan validasi data sebelum finalisasi.',
    'Peserta memperoleh solusi terhadap kendala yang mungkin ditemukan.',
    'Terbangun kesepahaman untuk melaksanakan kegiatan secara tepat, akurat, dan sesuai jadwal.',
  ]
  const itemsE = [
    'Menyiapkan dan memeriksa kelengkapan data.',
    'Melakukan pelaksanaan sesuai dengan prosedur yang telah disampaikan.',
    'Melakukan verifikasi dan validasi ulang terhadap data yang telah diinput.',
    'Melakukan perbaikan apabila ditemukan ketidaksesuaian data sebelum proses finalisasi.',
    'Berkoordinasi dengan kepala sekolah dan pihak terkait apabila terdapat kendala.',
  ]

  const bullet = (no, text) => new Paragraph({
    children: [new TextRun({ text: `${no}. ${text}`, size: 22, font: FONT })],
    indent: { left: 360 },
    spacing: { after: 40 },
  })

  const section = (letter, title) => new Paragraph({
    children: [new TextRun({ text: `${letter}. ${title}`, size: 22, font: FONT, bold: true })],
    spacing: { before: 120, after: 60 },
  })

  return [
    para('NOTULA KEGIATAN', { bold: true, size: 22, align: AlignmentType.CENTER, font: FONT }),
    para(data.namaKegiatan, { size: 22, align: AlignmentType.CENTER, font: FONT, spacing: { after: 120 } }),

    // Info kegiatan
    new Table({
      width: { size: 5000, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: { insideH: BORDER_NONE.top, insideV: BORDER_NONE.top,
                 top: BORDER_NONE.top, bottom: BORDER_NONE.top,
                 left: BORDER_NONE.top, right: BORDER_NONE.top },
      rows: [
        ...([
          ['Hari/Tanggal', data.hariTanggal],
          ['Waktu',        data.waktu.replace('s/d', 's.d.')],
          ['Tempat',       data.tempat],
        ].map(([lbl, val]) => new TableRow({ children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 1600, type: WidthType.DXA },
            children: [para(lbl, { size: 22, font: FONT })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 300, type: WidthType.DXA },
            children: [para(':', { size: 22, font: FONT, align: AlignmentType.CENTER })] }),
          new TableCell({ borders: BORDER_NONE,
            children: [para(val, { size: 22, font: FONT })] }),
        ]}))),
      ],
    }),

    ...spacer(1),
    section('A', 'Dasar Kegiatan'),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: `Kegiatan ini dilaksanakan dalam rangka perjalanan dinas untuk mengikuti ${data.namaKegiatan} sebagai upaya meningkatkan pemahaman dan kinerja sesuai dengan ketentuan yang berlaku.`, size: 22, font: FONT })],
      spacing: { after: 60 },
    }),

    section('B', 'Agenda Kegiatan'),
    ...itemsA.map((t, i) => bullet(i + 1, t)),

    section('C', 'Pokok-Pokok Pembahasan'),
    ...itemsC.map((t, i) => bullet(i + 1, t)),

    section('D', 'Hasil Kegiatan'),
    ...itemsD.map((t, i) => bullet(i + 1, t)),

    section('E', 'Tindak Lanjut'),
    ...itemsE.map((t, i) => bullet(i + 1, t)),

    section('F', 'Penutup'),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: `Demikian notula kegiatan ${data.namaKegiatan} ini dibuat sebagai laporan pelaksanaan perjalanan dinas dan sebagai dokumentasi hasil kegiatan.`, size: 22, font: FONT })],
      spacing: { after: 60 },
    }),
  ]
}

// ─── HALAMAN 5: KWITANSI ──────────────────────────────────────────────────────

function buildKwitansi(data) {
  return [
    
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        left:   { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        right:  { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideH: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
        insideV: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
      },
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: BORDER_ALL, children: [
            buildKopSurat(data),
    ...spacer(1),

    para('KWITANSI', { bold: true, size: 26, align: AlignmentType.CENTER, font: FONT, spacing: { after: 120 } }),
    
    // ── Tabel data kwitansi ──────────────────────────────────────────────────
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: { insideH: BORDER_NONE.top, insideV: BORDER_NONE.top,
                 top: BORDER_NONE.top, bottom: BORDER_NONE.top,
                 left: BORDER_NONE.top, right: BORDER_NONE.top },
      rows: [
        ...([
          ['No. Kwitansi',     data.nomorKwitansi || ''],
          ['Sudah Terima Dari', data.namaSekolah],
          ['Uang Sejumlah',     fmtRpDoc(data.honorJumlah)],
          ['Untuk Pembayaran',  data.keteranganBayar],
          ['',                  '(Daftar Terlampir)'],
          ['Terbilang',         data.terbilang],
        ].map(([lbl, val]) => new TableRow({ children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 2400, type: WidthType.DXA },
            children: [para(lbl, { size: 22, font: FONT })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 200, type: WidthType.DXA },
            children: [para(':', { size: 22, font: FONT, align: AlignmentType.CENTER })] }),
          new TableCell({ borders: BORDER_NONE,
            children: [para(val, { size: 22, font: FONT })] }),
        ]}))),
      ],
    }),

    ...spacer(2),
    para(`${data.desaSekolah}, ${tanpaPrefixHari(data.hariTanggal)}`, { size: 22, font: FONT, indent: { left: 5500 } }),
    ...spacer(1),
    // ── TTD 3 kolom: Setuju dibayar | Lunas dibayar | Penerima ─────────────────
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: { insideH: BORDER_NONE.top, insideV: BORDER_NONE.top,
                 top: BORDER_NONE.top, bottom: BORDER_NONE.top,
                 left: BORDER_NONE.top, right: BORDER_NONE.top },
      rows: [
        new TableRow({ children: [
          // Kolom 1: Setuju dibayar (Kepsek)
          new TableCell({ borders: BORDER_NONE, children: [
            para('Setuju di bayar', { size: 22, font: FONT, align: AlignmentType.CENTER }),
            para('Kepala Sekolah', { size: 22, font: FONT, spacing: { after: 1200 }, align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para(data.namaKepsek, { size: 22, font: FONT, bold: true, underline: true, align: AlignmentType.CENTER }),
            para(`NIP.${data.nipKepsek}`, { size: 22, font: FONT, align: AlignmentType.CENTER }),
          ]}),
          // Kolom 2: Lunas dibayar (Bendahara)
          new TableCell({ borders: BORDER_NONE, children: [
            para('Lunas di bayar', { size: 22, font: FONT, align: AlignmentType.CENTER }),
            para('Bendahara:', { size: 22, font: FONT, spacing: { after: 1200 }, align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para((data.namaBendahara || '').toUpperCase(), { size: 22, font: FONT, bold: true, underline: true, align: AlignmentType.CENTER }),
            para(`NIP.${data.nipBendahara || ''}`, { size: 22, font: FONT, align: AlignmentType.CENTER }),
          ]}),
          // Kolom 3: Penerima
          new TableCell({ borders: BORDER_NONE, children: [
            para('', { align: AlignmentType.CENTER }),
            para('Penerima', { size: 22, font: FONT, spacing: { after: 1200 }, align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para('', { align: AlignmentType.CENTER }),
            para(data.namaPenerima, { size: 22, font: FONT, bold: true, underline: true, align: AlignmentType.CENTER }),
            para(`NIP.${data.nipPenerima}`, { size: 22, font: FONT, align: AlignmentType.CENTER }),
          ]}),
        ]}),
      ],
    }),

          ]}),
        ]}),
      ],
    }),
  ]
}

// ─── ENTRY POINT: Generate & download ────────────────────────────────────────

export async function generateSuratTugas(data) {
  const margin = {
    top:    convertMillimetersToTwip(15),
    bottom: convertMillimetersToTwip(20),
    left:   convertMillimetersToTwip(30),
    right:  convertMillimetersToTwip(20),
  }

  const pageBreak = new Paragraph({
    pageBreakBefore: true,
    children: [],
  })

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin } },
        children: [
          // Hal 1: SPT
          ...buildSPT(data),
          // Hal 2: Daftar Hadir & Penerimaan Honor (1 lembar)
          pageBreak,
          ...buildDaftarHadirHonor(data),
          // Hal 3: Notula
          pageBreak,
          // ...buildNotula(data),
          // // Hal 4: Kwitansi
          // pageBreak,
          ...buildKwitansi(data),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safeNama  = data.namaPenerima ? data.namaPenerima.replace(/[^a-zA-Z0-9]/g, '_') : 'noname'
  const fileName  = `SuratTugas_${safeNama}_${data.tanggalISO || 'nodate'}.docx`
  a.href     = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
