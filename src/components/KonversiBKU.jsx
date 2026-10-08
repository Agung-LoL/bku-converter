import { useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import styles from './KonversiBKU.module.css'
import {
  lookupHarga, lookupUraianKegiatan, simpanBKU,
  groupByNoBukti as groupBy, fmtDate, fmtRp, BULAN_LIST,
  parseDateValue, deriveMetaFromRows, getBulanFromDate, getTriwulanFromBulan,
} from '../bkuStore'
import { getCurrentUser } from '../useStorage'

export default function KonversiBKU({ onSaved }) {
  const currentUser = getCurrentUser()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({
    sekolah: currentUser?.sekolah || '',
    triwulan: '1',
    tahun: String(new Date().getFullYear()),
    bulan: BULAN_LIST[new Date().getMonth()],
  })
  const [toast, setToast] = useState(null)
  const [fileName, setFileName] = useState('')

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.xlsx')) { showToast('Hanya file .xlsx yang didukung.', 'err'); return }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
        parseRows(raw)
      } catch (err) { showToast('Gagal membaca file: ' + err.message, 'err') }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function parseRows(raw) {
    if (!raw || raw.length < 2) { showToast('File kosong atau tidak sesuai.', 'err'); return }
    const hdr = raw[0].map(h => h ? String(h).trim().toUpperCase() : '')
    const iT  = hdr.findIndex(h => h.includes('TANGGAL'))
    const iN  = hdr.findIndex(h => h.includes('NO BUKTI') || h === 'NO BUKTI')
    const iK  = hdr.findIndex(h => h.includes('KODE KEGIATAN'))
    const iR  = hdr.findIndex(h => h.includes('KODE REKENING'))
    const iU  = hdr.findIndex(h => h.includes('URAIAN') || h === 'URAIAN')
    const iP  = hdr.findIndex(h => h.includes('PENGELUARAN'))
    const iNT = hdr.findIndex(h => h.includes('NAMA TOKO') || h.includes('TOKO'))
    if (iU === -1) { showToast('Kolom URAIAN tidak ditemukan di file.', 'err'); return }

    const data = []
    for (let i = 1; i < raw.length; i++) {
      const r = raw[i]
      if (!r || !r.some(c => c !== null)) continue
      const uraian       = iU  >= 0 && r[iU]  ? String(r[iU])  : ''
      const noBukti      = iN  >= 0 && r[iN]  ? String(r[iN])  : ''
      if (!uraian && !noBukti) continue
      const kodeKegiatan = iK  >= 0 && r[iK]  ? String(r[iK])  : ''
      const kodeRekening = iR  >= 0 && r[iR]  ? String(r[iR])  : ''
      const namaToko     = iNT >= 0 && r[iNT] ? String(r[iNT]) : ''
      const pengeluaran  = iP  >= 0 ? parseFloat(r[iP]) || 0 : 0

      const found = lookupHarga(uraian, kodeKegiatan, kodeRekening)
      const hargaMaster = found ? parseFloat(found.harga) || 0 : 0

      // Cek sisa hasil bagi: jika pengeluaran tidak habis dibagi harga master → ada selisih harga
      let hargaSatuan = ''
      let jumlahBarang = ''
      let needsConfirm = false
      let sisaHasilBagi = 0

      if (found && hargaMaster > 0 && pengeluaran > 0) {
        const bagi = pengeluaran / hargaMaster
        const bulatBawah = Math.floor(bagi)
        const sisa = pengeluaran - (bulatBawah * hargaMaster)
        if (sisa === 0) {
          // Habis dibagi — langsung auto
          hargaSatuan  = hargaMaster
          jumlahBarang = bulatBawah
        } else {
          // Ada sisa — harga di toko berbeda, perlu konfirmasi
          needsConfirm = true
          sisaHasilBagi = sisa
          // Tetap simpan harga master sebagai kandidat
        }
      } else if (found && hargaMaster > 0) {
        hargaSatuan = hargaMaster
      }

      const rawDateVal = iT >= 0 ? r[iT] : null
      data.push({
        _idx: i,
        tanggal: fmtDate(rawDateVal),
        tanggalRaw: parseDateValue(rawDateVal),
        noBukti,
        kodeKegiatan,
        kodeRekening,
        uraian,
        pengeluaran,
        hargaSatuan,
        jumlahBarang,
        jenis: (found && !needsConfirm) ? found.jenis : '',
        namaToko,
        autoFilled: !!found && !needsConfirm,
        matchLevel: needsConfirm ? 'sisa' : (found?.matchLevel || null),
        _candidate: needsConfirm ? { ...found, sisaHasilBagi } : null,
      })
    }
    if (!data.length) { showToast('Tidak ada data yang bisa dibaca.', 'err'); return }
    setRows(data)

    // Otomatis tentukan bulan/tahun/triwulan dari tanggal yang paling banyak muncul
    const derived = deriveMetaFromRows(data)
    if (derived) {
      setMeta(prev => ({ ...prev, bulan: derived.bulan, tahun: derived.tahun, triwulan: derived.triwulan }))
    }

    showToast(`${data.length} baris berhasil dibaca.`, 'ok')
  }

  function updateRow(idx, field, val) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [field]: val }
      if (field === 'hargaSatuan') {
        // Harga satuan diubah: hitung ulang jumlah barang dari pengeluaran
        const h = parseFloat(val) || 0
        if (h > 0 && r.pengeluaran > 0) {
          updated.jumlahBarang = Math.round(r.pengeluaran / h)
        } else if (h > 0 && parseFloat(r.jumlahBarang) > 0) {
          // Jika tidak ada pengeluaran, hitung pengeluaran dari jumlah barang
          updated.pengeluaran = h * parseFloat(r.jumlahBarang)
        }
      } else if (field === 'jumlahBarang') {
        // Jumlah barang diubah manual: hitung ulang pengeluaran
        const h = parseFloat(r.hargaSatuan) || 0
        const j = parseFloat(val) || 0
        if (h > 0 && j > 0) updated.pengeluaran = h * j
      }
      return updated
    }))
  }

  function reset() { setRows([]); setFileName('') }

  function downloadTemplateBKU() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['TANGGAL', 'NO BUKTI', 'KODE KEGIATAN', 'KODE REKENING', 'URAIAN', 'PENGELUARAN', 'NAMA TOKO'],
      // Baris contoh dikosongkan agar bisa langsung diisi
    ])
    ws['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
      { wch: 34 }, { wch: 16 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'BKU Import')
    XLSX.writeFile(wb, 'TEMPLATE_BKU_IMPORT.xlsx')
    showToast('Template BKU import berhasil diunduh.', 'ok')
  }

  function confirmAuto(idx) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx || !r._candidate) return r
      const h = parseFloat(r._candidate.harga) || 0
      // Gunakan pembulatan — user sudah sadar ada sisa
      const j = h > 0 && r.pengeluaran > 0 ? Math.round(r.pengeluaran / h) : ''
      return {
        ...r,
        hargaSatuan: h,
        jumlahBarang: j,
        jenis: r._candidate.jenis || '',
        autoFilled: true,
        matchLevel: 'sisa-confirmed',
        _candidate: null,
      }
    }))
  }

  function rejectAuto(idx) {
    setRows(prev => prev.map((r, i) =>
      i !== idx ? r : { ...r, matchLevel: 'rejected', _candidate: null }
    ))
  }

  function saveToHistory() {
    // Kelompokkan baris berdasarkan bulan/tahun aktual dari tanggal masing-masing
    // (bukan menyamaratakan semua baris ke satu bulan yang paling dominan)
    const byPeriod = new Map() // "tahun__bulan" -> rows[]
    rows.forEach(row => {
      let periodKey, bulan, tahun
      if (row.tanggalRaw) {
        bulan = getBulanFromDate(row.tanggalRaw)
        tahun = String(row.tanggalRaw.getUTCFullYear())
      } else {
        // Fallback jika baris tidak punya tanggal valid: pakai periode dominan
        bulan = meta.bulan
        tahun = meta.tahun
      }
      periodKey = `${tahun}__${bulan}`
      if (!byPeriod.has(periodKey)) byPeriod.set(periodKey, [])
      byPeriod.get(periodKey).push(row)
    })

    let successCount = 0
    let failCount = 0
    byPeriod.forEach((periodRows, key) => {
      const [tahun, bulan] = key.split('__')
      const periodMeta = {
        sekolah: meta.sekolah,
        tahun,
        bulan,
        triwulan: getTriwulanFromBulan(bulan) || meta.triwulan,
      }
      const ok = simpanBKU(periodMeta, periodRows)
      if (ok) successCount++
      else failCount++
    })

    if (successCount > 0) {
      const periodCount = byPeriod.size
      showToast(
        periodCount > 1
          ? `Tersimpan ke ${periodCount} periode berbeda sesuai tanggal!`
          : 'BKU berhasil disimpan ke Riwayat!',
        'ok'
      )
      setTimeout(() => { if (onSaved) onSaved() }, 500)
    } else {
      showToast('Gagal menyimpan ke riwayat.', 'err')
    }
  }

  // Helper: build excel rows with SUM for format lama (dengan kode rekening)
  // Kolom: Tanggal(A) NoBukti(B) KodeKegiatan(C) KodeRekening(D) Uraian(E) HargaSatuan(F) JmlBarang(G) Jenis(H) Jumlah(I) NamaToko(J)
  // SUM ada di kolom J baris header group, menjumlah kolom I (item detail)
  function buildV1Rows(groups, startRow = 8) {
    const wsData = []
    let currentRow = startRow
    groups.forEach(group => {
      const first = group[0]
      // Setiap item punya 2 baris: baris kode rekening + baris uraian/nilai
      const detailRowCount = group.length * 2
      const detailStart = currentRow + 1
      const detailEnd   = currentRow + detailRowCount
      // Kolom I = JUMLAH, hanya baris ke-2 tiap item (baris genap dari detailStart)
      // Kita ambil semua baris nilai (baris uraian), yaitu detailStart+1, detailStart+3, ...
      const jumlahRows = group.map((_, i) => detailStart + i * 2 + 1)
      const sumFormula = jumlahRows.length === 1
        ? `SUM(I${jumlahRows[0]})`
        : `SUM(I${jumlahRows[0]},${jumlahRows.slice(1).map(r => `I${r}`).join(',')})`

      wsData.push([first.tanggal, first.noBukti, lookupUraianKegiatan(first.kodeKegiatan), '', '', '', '', '', '', { f: sumFormula }, first.namaToko ? first.namaToko : ''])
      currentRow++
      group.forEach(item => {
        wsData.push(['', '', '', item.kodeRekening, '', '', '', '', '', '', ''])
        currentRow++
        const h = parseFloat(item.hargaSatuan) || 0
        const j = parseInt(item.jumlahBarang) || 0
        wsData.push(['', '', '', '', item.uraian, h || null, j || null, item.jenis, h && j ? h * j : (parseFloat(item.pengeluaran) || null), '', ''])
        currentRow++
      })
    })
    return wsData
  }

  // Format 1: dengan Kode Rekening + SUM
  function download() {
    const wb = XLSX.utils.book_new()
    const groups = groupBy(rows)
    const header = [
      ['BUKU KAS UMUM', '', '', '', '', '', '', '', '', '', ''],
      [meta.bulan, '', '', '', '', '', '', '', '', '', ''],
      [' Nama Sekolah', '', ':', meta.sekolah, '', '', '', '', '', '', ''],
      [' Triwulan', '', ':', parseInt(meta.triwulan), '', '', '', '', '', '', ''],
      [' Tahun', '', ':', parseInt(meta.tahun), '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['Tanggal', 'No Bukti', 'KODE KEGIATAN', 'KODE REKENING', 'URAIAN', 'HARGA SATUAN', 'JUMLAH BARANG', 'JENIS', 'JUMLAH', 'PENGELUARAN', 'Nama Toko'],
    ]
    const wsData = [...header, ...buildV1Rows(groups, 8)]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 2.5 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, 'BKU_HASIL_KONVERSI.xlsx')
    showToast('BKU_HASIL_KONVERSI.xlsx berhasil diunduh!', 'ok')
  }

  // Format 2: tanpa Kode Rekening — dengan full styling Excel
  // Kolom: A=Tanggal | B=No Bukti | C=Kode Kegiatan | D=Uraian | E=Harga Satuan | F=Jml Barang | G=Jenis | H=Jumlah | I=Pengeluaran | J=Nama Toko
  function downloadV2() {
    const groups = groupBy(rows)

    // ── Helpers ────────────────────────────────────────────────────────────
    const FONT_BASE  = { name: 'Arial Narrow', sz: 10 }
    const FONT_BOLD  = { name: 'Arial Narrow', sz: 10, bold: true }
    const ALIGN_CTR  = { horizontal: 'center', vertical: 'center' }
    const ALIGN_LEFT = { horizontal: 'left',   vertical: 'center' }
    const ALIGN_RGT  = { horizontal: 'right',  vertical: 'center' }
    // Comma style: #,##0 tanpa desimal
    const FMT_COMMA  = '#,##0'

    // Border styles
    const BORDER_THIN = {
      top:    { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left:   { style: 'thin', color: { rgb: '000000' } },
      right:  { style: 'thin', color: { rgb: '000000' } },
    }
    const BORDER_HAIR = {
      top:    { style: 'hair', color: { rgb: '000000' } },
      bottom: { style: 'hair', color: { rgb: '000000' } },
      left:   { style: 'hair', color: { rgb: '000000' } },
      right:  { style: 'hair', color: { rgb: '000000' } },
    }

    function cellStr(v, font, align, numFmt, border) {
      return { v, t: 's', s: { font: font || FONT_BASE, alignment: align || ALIGN_LEFT, ...(numFmt ? { numFmt } : {}), ...(border ? { border } : {}) } }
    }
    function cellNum(v, font, align, numFmt, border) {
      if (v === null || v === undefined || v === '') return { v: '', t: 's', s: { font: font || FONT_BASE, ...(border ? { border } : {}) } }
      return { v, t: 'n', s: { font: font || FONT_BASE, alignment: align || ALIGN_RGT, numFmt: numFmt || FMT_COMMA, ...(border ? { border } : {}) } }
    }
    function cellFml(f, font, align, numFmt, border) {
      return { f, t: 'n', s: { font: font || FONT_BOLD, alignment: align || ALIGN_RGT, numFmt: numFmt || FMT_COMMA, ...(border ? { border } : {}) } }
    }
    function cellBlank(border) {
      return { v: '', t: 's', s: { font: FONT_BASE, ...(border ? { border } : {}) } }
    }

    // ── Build rows ──────────────────────────────────────────────────────────
    // Header info (baris 1-7), kolom A-J (index 0-9)
    const NCOLS = 10
    const blank = () => Array(NCOLS).fill(null).map(cellBlank)

    const mkInfoRow = (label, val) => {
      const r = blank()
      r[0] = cellStr(label, FONT_BASE, ALIGN_LEFT)
      r[2] = cellStr(':', FONT_BASE, ALIGN_LEFT)
      r[3] = cellStr(val !== undefined ? String(val) : '', FONT_BASE, ALIGN_LEFT)
      return r
    }

    // Baris 1: BUKU KAS UMUM — bold center, akan di-merge A:J
    const row1 = blank()
    row1[0] = cellStr('BUKU KAS UMUM', FONT_BOLD, ALIGN_CTR)

    // Baris 2: Bulan — bold center, akan di-merge A:J
    const row2 = blank()
    row2[0] = cellStr(meta.bulan, FONT_BOLD, ALIGN_CTR)

    // Baris 3-5: info sekolah — titik dua terpisah di kolom C
    const row3 = mkInfoRow(' Nama Sekolah', meta.sekolah)
    const row4 = mkInfoRow(' Triwulan',     meta.triwulan)
    const row5 = mkInfoRow(' Tahun',        meta.tahun)

    // Baris 6: kosong
    const row6 = blank()

    // Baris 7: header kolom — bold, center, tinggi, border thin
    const HDR_COLS = ['Tanggal','No Bukti','KODE KEGIATAN','URAIAN','HARGA SATUAN','JUMLAH BARANG','JENIS','JUMLAH','PENGELUARAN','NAMA TOKO']
    const row7 = HDR_COLS.map(h => cellStr(h, FONT_BOLD, ALIGN_CTR, null, BORDER_THIN))

    const wsData = [row1, row2, row3, row4, row5, row6, row7]
    let currentRow = 8

    groups.forEach(group => {
      const first = group[0]
      const detailStart = currentRow + 1
      const detailEnd   = currentRow + group.length
      const sumFormula  = detailStart === detailEnd
        ? `SUM(H${detailStart})`
        : `SUM(H${detailStart}:H${detailEnd})`

      // Baris transaksi header (Tanggal, No Bukti, Kode Kegiatan, Pengeluaran) → BOLD + border hair
      const trRow = blank()
      trRow[0] = cellStr(first.tanggal,                           FONT_BOLD, ALIGN_CTR, null, BORDER_HAIR)  // A Tanggal
      trRow[1] = cellStr(first.noBukti,                           FONT_BOLD, ALIGN_CTR, null, BORDER_HAIR)  // B No Bukti
      trRow[2] = cellStr(lookupUraianKegiatan(first.kodeKegiatan),FONT_BOLD, ALIGN_LEFT, null, BORDER_HAIR) // C Kode Kegiatan
      trRow[3] = cellBlank(BORDER_HAIR)                                                                       // D Uraian (kosong di baris header)
      trRow[4] = cellBlank(BORDER_HAIR)
      trRow[5] = cellBlank(BORDER_HAIR)
      trRow[6] = cellBlank(BORDER_HAIR)
      trRow[7] = cellBlank(BORDER_HAIR)
      trRow[8] = cellFml(sumFormula, FONT_BOLD, ALIGN_RGT, FMT_COMMA, BORDER_HAIR)                           // I Pengeluaran
      trRow[9] = cellStr(first.namaToko || '', FONT_BASE, ALIGN_LEFT, null, BORDER_HAIR)                    // J Nama Toko
      wsData.push(trRow)
      currentRow++

      // Baris detail item (uraian) — tidak bold, border hair
      group.forEach(item => {
        const h = parseFloat(item.hargaSatuan) || 0
        const j = parseInt(item.jumlahBarang)  || 0
        const jumlah = h && j ? h * j : (parseFloat(item.pengeluaran) || null)

        const dtRow = blank()
        dtRow[0] = cellBlank(BORDER_HAIR)
        dtRow[1] = cellBlank(BORDER_HAIR)
        dtRow[2] = cellBlank(BORDER_HAIR)
        dtRow[3] = cellStr(item.uraian,   FONT_BASE, ALIGN_LEFT, null, BORDER_HAIR)             // D Uraian
        dtRow[4] = cellNum(h || null,     FONT_BASE, ALIGN_RGT, FMT_COMMA, BORDER_HAIR)         // E Harga Satuan
        dtRow[5] = cellNum(j || null,     FONT_BASE, ALIGN_CTR, null, BORDER_HAIR)              // F Jml Barang (tanpa comma)
        dtRow[6] = cellStr(item.jenis||'',FONT_BASE, ALIGN_CTR, null, BORDER_HAIR)             // G Jenis
        dtRow[7] = cellNum(jumlah,        FONT_BASE, ALIGN_RGT, FMT_COMMA, BORDER_HAIR)         // H Jumlah
        dtRow[8] = cellBlank(BORDER_HAIR)
        dtRow[9] = cellBlank(BORDER_HAIR)
        wsData.push(dtRow)
        currentRow++
      })
    })

    // ── Sheet & sizing ──────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Gabung (merge) baris 1 & 2 dari kolom A sampai J
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Row 1: BUKU KAS UMUM
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Row 2: Bulan
    ]

    // Lebar kolom sesuai permintaan
    ws['!cols'] = [
      { wch: 10  }, // A Tanggal
      { wch: 6   }, // B No Bukti
      { wch: 2.5 }, // C Kode Kegiatan
      { wch: 40  }, // D Uraian
      { wch: 6.5 }, // E Harga Satuan
      { wch: 4   }, // F Jml Barang
      { wch: 7   }, // G Jenis
      { wch: 13  }, // H Jumlah
      { wch: 13  }, // I Pengeluaran
      { wch: 16  }, // J Nama Toko
    ]

    // Tinggi baris: baris 7 (index 6) = header kolom lebih tinggi
    ws['!rows'] = []
    ws['!rows'][6] = { hpt: 30 } // header kolom

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, 'BKU_TANPA_REKENING.xlsx')
    showToast('BKU_TANPA_REKENING.xlsx berhasil diunduh!', 'ok')
  }

  const matched           = rows.filter(r => r.autoFilled || r.matchLevel === 'sisa-confirmed').length
  const needsConfirmCount = rows.filter(r => r.matchLevel === 'sisa').length
  const manual            = rows.length - matched - needsConfirmCount

  if (!rows.length) return (
    <div className={styles.uploadWrap}>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}
      <label className={styles.dropzone}>
        <div className={styles.dropIcon}>📂</div>
        <p><strong>Klik atau seret file BKU import</strong></p>
        <p>Format: .xlsx</p>
        <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFile} />
      </label>
      <div className={styles.uploadActions}>
        <button className={styles.templateBtn} onClick={downloadTemplateBKU}>
          ↓ Download template BKU import
        </button>
      </div>
      <p className={styles.hint}>Pastikan sudah mengisi dan menyimpan Master Harga terlebih dahulu agar harga otomatis terisi.</p>
    </div>
  )

  const groups = groupBy(rows)

  return (
    <div className={styles.wrap}>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}><span className={styles.statNum}>{rows.length}</span><span className={styles.statLbl}>Total baris</span></div>
        <div className={`${styles.stat} ${styles.statGreen}`}><span className={styles.statNum}>{matched}</span><span className={styles.statLbl}>Auto dari master</span></div>
        <div className={`${styles.stat} ${styles.statBlue}`}><span className={styles.statNum}>{needsConfirmCount}</span><span className={styles.statLbl}>Harga tidak sesuai</span></div>
        <div className={`${styles.stat} ${styles.statAmber}`}><span className={styles.statNum}>{manual}</span><span className={styles.statLbl}>Manual</span></div>
        <div className={styles.statFile}><span className={styles.fileIcon}>📄</span>{fileName}</div>
      </div>

      <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>Data Transaksi</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tanggal</th><th>No Bukti</th><th>Kode Kegiatan</th>
              <th>Kode Rekening</th><th>Uraian</th>
              <th>Harga Satuan</th><th>Jml Barang</th><th>Jenis</th>
              <th>Jumlah</th><th>Nama Toko</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) =>
              group.map((item, li) => {
                const idx = rows.indexOf(item)
                const isFirst = li === 0
                return (
                  <tr key={`${gi}-${li}`}>
                    <td className={styles.ro}>{item.tanggal}</td>
                    <td>{isFirst && <span className={styles.chip}>{item.noBukti}</span>}</td>
                    <td className={styles.ro}>{item.kodeKegiatan}</td>
                    <td className={styles.ro} style={{ fontSize: 11 }}>{item.kodeRekening}</td>
                    <td className={styles.ro}>
                      <div className={styles.uraianWrap}>
                        <span className={styles.uraianText} title={item.uraian}>{item.uraian}</span>
                        {item.matchLevel === 'sisa' && item._candidate && (
                          <div className={styles.confirmBox}>
                            <span className={styles.confirmLabel}>
                              Harga master <strong>Rp {fmtRp(item._candidate.harga)}</strong> tidak habis membagi
                              pengeluaran <strong>Rp {fmtRp(item.pengeluaran)}</strong>
                              — sisa <strong>Rp {fmtRp(item._candidate.sisaHasilBagi)}</strong>.
                              Pakai harga master (dibulatkan) atau isi manual?
                            </span>
                            <button className={styles.confirmYes} onClick={() => confirmAuto(rows.indexOf(item))}>✓ Pakai master</button>
                            <button className={styles.confirmNo}  onClick={() => rejectAuto(rows.indexOf(item))}>✕ Manual</button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`${styles.cellInput} ${item.autoFilled && item.hargaSatuan ? styles.autoInput : ''}`}
                        value={item.hargaSatuan}
                        placeholder="0"
                        onChange={e => updateRow(idx, 'hargaSatuan', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        value={item.jumlahBarang}
                        placeholder="0"
                        style={{ width: 60 }}
                        onChange={e => updateRow(idx, 'jumlahBarang', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={`${styles.cellInput} ${item.autoFilled && item.jenis ? styles.autoInput : ''}`}
                        value={item.jenis}
                        placeholder="pcs..."
                        style={{ width: 70 }}
                        onChange={e => updateRow(idx, 'jenis', e.target.value)}
                      />
                    </td>
                    <td className={styles.amt}>{fmtRp(item.pengeluaran)}</td>
                    <td>
                      {isFirst && (
                        <input
                          className={styles.cellInput}
                          value={item.namaToko}
                          placeholder="Nama toko..."
                          onChange={e => updateRow(idx, 'namaToko', e.target.value)}
                        />
                      )}
                    </td>
                    <td>
                      {(item.autoFilled || item.matchLevel === 'sisa-confirmed')
                        ? <span className={styles.badgeGreen}>✓ Auto</span>
                        : item.matchLevel === 'sisa'
                          ? <span className={styles.badgeBlue}>⚠ Sisa bagi</span>
                          : <span className={styles.badgeAmber}>✎ Manual</span>}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} onClick={reset}>↺ Reset</button>
        <button className={`${styles.btn} ${styles.success}`} onClick={saveToHistory}>💾 Simpan ke Riwayat</button>
        <div className={styles.downloadGroup}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={download}>
            ↓ Download BKU <span className={styles.dlLabel}>+ Kode Rekening</span>
          </button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={downloadV2}>
            ↓ Download BKU <span className={styles.dlLabel}>Tanpa Rekening + SUM</span>
          </button>
        </div>
      </div>
    </div>
  )
}
