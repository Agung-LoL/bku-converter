import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx-js-style'
import styles from './RiwayatBKU.module.css'
import Modal from './Modal'
import KonversiBKU from './KonversiBKU'
import {
  getRiwayat, groupByBulanTahun, groupByNoBukti,
  lookupUraianKegiatan, fmtRp, RIWAYAT_KEY,
} from '../bkuStore'
import { storageSet } from '../useStorage'

export default function RiwayatBKU() {
  const [riwayat, setRiwayat]         = useState([])
  const [selectedKey, setSelectedKey] = useState(null) // "tahun-bulan"
  const [activeEntry, setActiveEntry] = useState(null)
  const [toast, setToast]             = useState(null)
  const [showImport, setShowImport]   = useState(false)
  const [pageSize, setPageSize]       = useState(25)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setRiwayat(getRiwayat())
  }, [])

  function reloadRiwayat() {
    const data = getRiwayat()
    setRiwayat(data)
    return data
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const grouped = groupByBulanTahun(riwayat)
  const selectedGrp = grouped.find(g => `${g.tahun}-${g.bulan}` === selectedKey) || null

  // ── Navigasi ────────────────────────────────────────────────────────────────
  function openBulan(key, grp) {
    setSelectedKey(key)
    // Pilih entry pertama dari grup secara default
    setActiveEntry(grp.entries[0] || null)
    setCurrentPage(1)
  }

  function backToGrid() {
    setSelectedKey(null)
    setActiveEntry(null)
    setCurrentPage(1)
  }

  // ── Import BKU ──────────────────────────────────────────────────────────────
  function handleImportSaved() {
    setShowImport(false)
    const data = reloadRiwayat()
    showToast('BKU berhasil diimpor ke riwayat.', 'ok')
    // Otomatis buka bulan yang baru diimpor
    const grp = groupByBulanTahun(data)
    if (grp.length) {
      const key = `${grp[0].tahun}-${grp[0].bulan}`
      setSelectedKey(key)
      setActiveEntry(grp[0].entries[0] || null)
    }
  }

  // ── Hapus entry ─────────────────────────────────────────────────────────────
  function hapusEntry(id) {
    if (!confirm('Hapus BKU ini dari riwayat?')) return
    const next = riwayat.filter(r => r.id !== id)
    storageSet(RIWAYAT_KEY, next)
    setRiwayat(next)

    const grpNext = groupByBulanTahun(next)
    const grpStill = grpNext.find(g => `${g.tahun}-${g.bulan}` === selectedKey)
    if (grpStill) {
      // Masih ada entry lain di bulan yang sama
      setActiveEntry(grpStill.entries[0] || null)
    } else {
      // Bulan sudah kosong, kembali ke grid
      backToGrid()
    }
    showToast('BKU dihapus dari riwayat.', 'ok')
  }

  // ── Export Excel V1 ─────────────────────────────────────────────────────────
  function buildXlsxV1(meta, rows) {
    const groups = groupByNoBukti(rows)
    const wb = XLSX.utils.book_new()
    const header = [
      ['BUKU KAS UMUM','','','','','','','','','',''],
      [meta.bulan,'','','','','','','','','',''],
      [' Nama Sekolah','',':',meta.sekolah,'','','','','','',''],
      [' Triwulan','',':',parseInt(meta.triwulan),'','','','','','',''],
      [' Tahun','',':',parseInt(meta.tahun),'','','','','','',''],
      ['','','','','','','','','','',''],
      ['Tanggal','No Bukti','KODE KEGIATAN','KODE REKENING','URAIAN','HARGA SATUAN','JUMLAH BARANG','JENIS','JUMLAH','PENGELUARAN','Nama Toko'],
    ]
    let currentRow = 8
    const dataRows = []
    groups.forEach(group => {
      const first = group[0]
      const detailStart = currentRow + 1
      const jumlahRows = group.map((_, i) => detailStart + i * 2 + 1)
      const sumFormula = jumlahRows.length === 1
        ? `SUM(I${jumlahRows[0]})`
        : `SUM(I${jumlahRows[0]},${jumlahRows.slice(1).map(r => `I${r}`).join(',')})`
      dataRows.push([first.tanggal, first.noBukti, lookupUraianKegiatan(first.kodeKegiatan), '', '', '', '', '', '', { f: sumFormula }, first.namaToko || ''])
      currentRow++
      group.forEach(item => {
        dataRows.push(['', '', '', item.kodeRekening, '', '', '', '', '', '', ''])
        currentRow++
        const h = parseFloat(item.hargaSatuan) || 0
        const j = parseInt(item.jumlahBarang) || 0
        dataRows.push(['', '', '', '', item.uraian, h || null, j || null, item.jenis, h && j ? h * j : (parseFloat(item.pengeluaran) || null), '', ''])
        currentRow++
      })
    })
    const ws = XLSX.utils.aoa_to_sheet([...header, ...dataRows])
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 2.5 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return wb
  }

  // ── Export Excel V2 ─────────────────────────────────────────────────────────
  function buildXlsxV2(meta, rows) {
    const groups = groupByNoBukti(rows)
    const FONT_BASE = { name: 'Arial Narrow', sz: 10 }
    const FONT_BOLD = { name: 'Arial Narrow', sz: 10, bold: true }
    const ALIGN_CTR  = { horizontal: 'center', vertical: 'center' }
    const ALIGN_LEFT = { horizontal: 'left',   vertical: 'center' }
    const ALIGN_RGT  = { horizontal: 'right',  vertical: 'center' }
    const FMT_COMMA  = '#,##0'
    const BORDER_THIN = { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } }
    const BORDER_HAIR = { top: { style: 'hair', color: { rgb: '000000' } }, bottom: { style: 'hair', color: { rgb: '000000' } }, left: { style: 'hair', color: { rgb: '000000' } }, right: { style: 'hair', color: { rgb: '000000' } } }

    function cellStr(v, font, align, _fmt, border) { return { v: v ?? '', t: 's', s: { font: font || FONT_BASE, alignment: align || ALIGN_LEFT, ...(border ? { border } : {}) } } }
    function cellNum(v, font, align, numFmt, border) {
      if (v === null || v === undefined || v === '' || v === 0) return { v: '', t: 's', s: { font: font || FONT_BASE, ...(border ? { border } : {}) } }
      return { v, t: 'n', s: { font: font || FONT_BASE, alignment: align || ALIGN_RGT, numFmt: numFmt || FMT_COMMA, ...(border ? { border } : {}) } }
    }
    function cellFml(f, font, align, border) { return { f, t: 'n', s: { font: font || FONT_BOLD, alignment: align || ALIGN_RGT, numFmt: FMT_COMMA, ...(border ? { border } : {}) } } }
    function cellBlank(border) { return { v: '', t: 's', s: { font: FONT_BASE, ...(border ? { border } : {}) } } }

    const NCOLS = 10
    const blank = (border) => Array(NCOLS).fill(null).map(() => cellBlank(border))
    const row1 = blank(); row1[0] = cellStr('BUKU KAS UMUM', FONT_BOLD, ALIGN_CTR)
    const row2 = blank(); row2[0] = cellStr(meta.bulan, FONT_BOLD, ALIGN_CTR)
    const mkInfo = (label, val) => { const r = blank(); r[0] = cellStr(label, FONT_BASE, ALIGN_LEFT); r[2] = cellStr(':', FONT_BASE, ALIGN_LEFT); r[3] = cellStr(String(val ?? ''), FONT_BASE, ALIGN_LEFT); return r }
    const row3 = mkInfo(' Nama Sekolah', meta.sekolah)
    const row4 = mkInfo(' Triwulan', meta.triwulan)
    const row5 = mkInfo(' Tahun', meta.tahun)
    const row6 = blank()
    const HDR = ['Tanggal', 'No Bukti', 'KODE KEGIATAN', 'URAIAN', 'HARGA SATUAN', 'JUMLAH BARANG', 'JENIS', 'JUMLAH', 'PENGELUARAN', 'NAMA TOKO']
    const row7 = HDR.map(h => cellStr(h, FONT_BOLD, ALIGN_CTR, null, BORDER_THIN))
    const wsData = [row1, row2, row3, row4, row5, row6, row7]
    let currentRow = 8

    groups.forEach(group => {
      const first = group[0]
      const detailStart = currentRow + 1
      const detailEnd   = currentRow + group.length
      const sumFormula  = detailStart === detailEnd ? `SUM(H${detailStart})` : `SUM(H${detailStart}:H${detailEnd})`
      const trRow = blank(BORDER_HAIR)
      trRow[0] = cellStr(first.tanggal, FONT_BOLD, ALIGN_CTR, null, BORDER_HAIR)
      trRow[1] = cellStr(first.noBukti, FONT_BOLD, ALIGN_CTR, null, BORDER_HAIR)
      trRow[2] = cellStr(lookupUraianKegiatan(first.kodeKegiatan), FONT_BOLD, ALIGN_LEFT, null, BORDER_HAIR)
      trRow[8] = cellFml(sumFormula, FONT_BOLD, ALIGN_RGT, BORDER_HAIR)
      trRow[9] = cellStr(first.namaToko || '', FONT_BASE, ALIGN_LEFT, null, BORDER_HAIR)
      wsData.push(trRow)
      currentRow++
      group.forEach(item => {
        const h = parseFloat(item.hargaSatuan) || 0
        const j = parseInt(item.jumlahBarang)  || 0
        const jumlah = h && j ? h * j : (parseFloat(item.pengeluaran) || null)
        const dtRow = blank(BORDER_HAIR)
        dtRow[3] = cellStr(item.uraian || '', FONT_BASE, ALIGN_LEFT, null, BORDER_HAIR)
        dtRow[4] = cellNum(h || null, FONT_BASE, ALIGN_RGT, FMT_COMMA, BORDER_HAIR)
        dtRow[5] = cellNum(j || null, FONT_BASE, ALIGN_CTR, '0', BORDER_HAIR)
        dtRow[6] = cellStr(item.jenis || '', FONT_BASE, ALIGN_CTR, null, BORDER_HAIR)
        dtRow[7] = cellNum(jumlah, FONT_BASE, ALIGN_RGT, FMT_COMMA, BORDER_HAIR)
        wsData.push(dtRow)
        currentRow++
      })
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ]
    ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 2.5 }, { wch: 40 }, { wch: 6.5 }, { wch: 4 }, { wch: 7 }, { wch: 13 }, { wch: 13 }, { wch: 16 }]
    ws['!rows'] = []
    ws['!rows'][6] = { hpt: 30 }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return wb
  }

  function downloadEntry(entry) {
    const wb = buildXlsxV1(entry.meta, entry.rows)
    XLSX.writeFile(wb, `BKU_${entry.meta.sekolah}_${entry.meta.bulan}_${entry.meta.tahun}.xlsx`)
    showToast('File berhasil diunduh.', 'ok')
  }

  function downloadEntryV2(entry) {
    const wb = buildXlsxV2(entry.meta, entry.rows)
    XLSX.writeFile(wb, `BKU_TANPA_REKENING_${entry.meta.bulan}_${entry.meta.tahun}.xlsx`)
    showToast('File berhasil diunduh.', 'ok')
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 1 — Grid bulan
  // ════════════════════════════════════════════════════════════════════════════
  if (!selectedGrp) {
    return (
      <div className={styles.wrap}>
        {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}

        {showImport && (
          <Modal title="Import BKU" onClose={() => setShowImport(false)} wide>
            <KonversiBKU onSaved={handleImportSaved} />
          </Modal>
        )}

        {/* Header */}
        <div className={styles.gridHeader}>
          <h2 className={styles.gridTitle}>BKU {new Date().getFullYear()}</h2>
          <button className={styles.importBtn} onClick={() => setShowImport(true)}>
            <span>↑</span> Import BKU
          </button>
        </div>

        {/* Grid bulan */}
        {!grouped.length ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📭</div>
            <p>Belum ada BKU yang disimpan.</p>
            <p className={styles.emptyHint}>Klik "Import BKU" untuk mengimpor file BKU.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {grouped.map(grp => {
              const key = `${grp.tahun}-${grp.bulan}`
              const total = grp.entries.reduce((s, e) => s + e.total, 0)
              const jmlBaris = grp.entries.reduce((s, e) => s + e.rows.length, 0)
              return (
                <button key={key} className={styles.monthCard} onClick={() => openBulan(key, grp)}>
                  <div className={styles.monthCardTop}>
                    <span className={styles.monthName}>{grp.bulan}</span>
                    <span className={styles.monthYear}>{grp.tahun}</span>
                  </div>
                  <div className={styles.monthCardStats}>
                    <div className={styles.monthStat}>
                      <span className={styles.monthStatNum}>{jmlBaris}</span>
                      <span className={styles.monthStatLbl}>Baris</span>
                    </div>
                    <div className={styles.monthStat}>
                      <span className={styles.monthStatNum}>{grp.entries.length}</span>
                      <span className={styles.monthStatLbl}>BKU</span>
                    </div>
                  </div>
                  <div className={styles.monthCardTotal}>Rp {fmtRp(total)}</div>
                  <div className={styles.monthCardArrow}>Lihat Transaksi →</div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 2 — Detail per bulan
  // ════════════════════════════════════════════════════════════════════════════
  const entries = selectedGrp.entries

  return (
    <div className={styles.wrap}>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}

      {/* Header detail */}
      <div className={styles.detailTopBar}>
        <button className={styles.backBtn} onClick={backToGrid}>← Kembali</button>
        <div className={styles.detailHeading}>
          <span className={styles.detailTitle}>BKU {selectedGrp.bulan} {selectedGrp.tahun}</span>
          <span className={styles.detailSub}>{entries.length} BKU · {entries.reduce((s, e) => s + e.rows.length, 0)} baris</span>
        </div>
      </div>

      {/* Jika ada lebih dari 1 entry, tampilkan tab/sub-selector */}
      {entries.length > 1 && (
        <div className={styles.entryTabs}>
          {entries.map((entry, i) => (
            <button
              key={entry.id}
              className={`${styles.entryTab} ${activeEntry?.id === entry.id ? styles.entryTabActive : ''}`}
              onClick={() => { setActiveEntry(entry); setCurrentPage(1) }}
            >
              BKU #{i + 1}
              <span className={styles.entryTabMeta}>{entry.rows.length} baris</span>
            </button>
          ))}
        </div>
      )}

      {activeEntry && (
        <>
          {/* Info + tombol aksi */}
          <div className={styles.detailCard}>
            <div className={styles.detailCardInfo}>
              <div className={styles.detailCardTitle}>
                {activeEntry.meta.sekolah}
              </div>
              <div className={styles.detailCardMeta}>
                Triwulan {activeEntry.meta.triwulan} · Disimpan {new Date(activeEntry.savedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className={styles.detailCardActions}>
              <button className={styles.btnDanger} onClick={() => hapusEntry(activeEntry.id)}>
                🗑 Hapus
              </button>
              <button className={styles.btnPrimary} onClick={() => downloadEntry(activeEntry)}>
                ↓ Unduh <span className={styles.dlLabel}>+ Rekening</span>
              </button>
              <button className={styles.btnPrimary} onClick={() => downloadEntryV2(activeEntry)}>
                ↓ Unduh <span className={styles.dlLabel}>Tanpa Rekening</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum}>{activeEntry.rows.length}</span>
              <span className={styles.summaryLbl}>Total baris</span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryGreen}`}>
              <span className={styles.summaryNum}>Rp {fmtRp(activeEntry.total)}</span>
              <span className={styles.summaryLbl}>Total pengeluaran</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNum}>{groupByNoBukti(activeEntry.rows).length}</span>
              <span className={styles.summaryLbl}>No. Bukti</span>
            </div>
          </div>

          {/* Tabel transaksi */}
          {(() => {
            const allGroups  = groupByNoBukti(activeEntry.rows)
            const allRows    = allGroups.flatMap((group, gi) =>
              group.map((item, li) => ({ item, gi, li, isFirst: li === 0 }))
            )
            const total      = allRows.length
            const isAll      = pageSize === 0
            const start      = isAll ? 0 : (currentPage - 1) * pageSize
            const end        = isAll ? total : Math.min(start + pageSize, total)
            const pageRows   = allRows.slice(start, end)
            const totalPages = isAll ? 1 : Math.ceil(total / pageSize)

            return (
              <>
                <div className={styles.paginationBar}>
                  <div className={styles.pageSizeWrap}>
                    <span className={styles.pageSizeLabel}>Tampilkan</span>
                    {[10, 25, 50, 100, 0].map(n => (
                      <button
                        key={n}
                        className={`${styles.pageSizeBtn} ${pageSize === n ? styles.pageSizeActive : ''}`}
                        onClick={() => { setPageSize(n); setCurrentPage(1) }}
                      >{n === 0 ? 'Semua' : n}</button>
                    ))}
                    <span className={styles.pageSizeLabel}>baris</span>
                  </div>
                  <div className={styles.pageInfo}>
                    {isAll ? `${total} baris` : `${start + 1}–${end} dari ${total} baris`}
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Tanggal</th><th>No Bukti</th><th>Kode Kegiatan</th>
                        <th>Kode Rekening</th><th>Uraian</th>
                        <th>Harga Satuan</th><th>Jml Barang</th><th>Jenis</th>
                        <th>Jumlah</th><th>Nama Toko</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(({ item, gi, li, isFirst }) => (
                        <tr key={`${gi}-${li}`}>
                          <td className={styles.ro}>{item.tanggal}</td>
                          <td>{isFirst && <span className={styles.chip}>{item.noBukti}</span>}</td>
                          <td className={styles.ro}>{item.kodeKegiatan}</td>
                          <td className={styles.ro} style={{ fontSize: 11 }}>{item.kodeRekening}</td>
                          <td className={styles.ro}>{item.uraian}</td>
                          <td className={styles.ro} style={{ textAlign: 'right' }}>{fmtRp(item.hargaSatuan)}</td>
                          <td className={styles.ro} style={{ textAlign: 'center' }}>{item.jumlahBarang}</td>
                          <td className={styles.ro}>{item.jenis}</td>
                          <td className={styles.amt}>{fmtRp(item.pengeluaran)}</td>
                          <td className={styles.ro}>{isFirst ? item.namaToko : ''}</td>
                        </tr>
                      ))}
                      {(isAll || end >= total) && (
                        <tr className={styles.totalRow}>
                          <td colSpan={8} style={{ textAlign: 'right', fontWeight: 600, paddingRight: 12 }}>Total Pengeluaran</td>
                          <td className={styles.amt} style={{ fontWeight: 700 }}>Rp {fmtRp(activeEntry.total)}</td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!isAll && totalPages > 1 && (
                  <div className={styles.pageNav}>
                    <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
                    <div className={styles.pageDots}>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const p = totalPages <= 7 ? i + 1
                          : i === 0 ? 1
                          : i === 6 ? totalPages
                          : Math.max(2, Math.min(currentPage - 2 + i, totalPages - 1))
                        return (
                          <button key={i} className={`${styles.pageNum} ${p === currentPage ? styles.pageNumActive : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                        )
                      })}
                    </div>
                    <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}
