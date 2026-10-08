import { useState, useMemo } from 'react'
import styles from './Lpj.module.css'
import SuratTugasModal from './SuratTugasModal'
import DataSekolahModal from './DataSekolahModal'
import {
  getRiwayat, groupByBulanTahun, lookupUraianKegiatan, lookupUraianRekening, fmtRp,
} from '../bkuStore'

// Gabungkan seluruh baris transaksi dari semua entri riwayat dalam satu periode
function flattenRows(grp) {
  return grp.entries.flatMap(e => e.rows.map(r => ({ ...r, __entryId: e.id, __sekolah: e.meta.sekolah })))
}

// Kelompokkan baris per No Bukti
function groupByNoBukti(rows) {
  const map = new Map()
  rows.forEach((r, i) => {
    const key = r.noBukti || `__nobukti_${i}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ ...r, __rowIdx: i })
  })
  return Array.from(map.entries()).map(([noBukti, items]) => ({ noBukti, items }))
}

export default function Lpj() {
  const riwayat  = useMemo(() => getRiwayat(), [])
  const grouped  = useMemo(() => groupByBulanTahun(riwayat), [riwayat])

  const [selectedKey, setSelectedKey] = useState(null) // "tahun-bulan"
  const [kodeRekening, setKodeRekening] = useState('')
  const [selectedNoBukti, setSelectedNoBukti] = useState('') // No Bukti terpilih
  const [showSuratModal, setShowSuratModal] = useState(false)
  const [showSekolahModal, setShowSekolahModal] = useState(false)

  const selectedGrp = grouped.find(g => `${g.tahun}-${g.bulan}` === selectedKey) || null
  const flatRows = selectedGrp ? flattenRows(selectedGrp) : []

  // Daftar kode rekening unik di periode ini
  const kodeRekeningList = useMemo(() => {
    const set = new Set()
    flatRows.forEach(r => { if (r.kodeRekening && r.kodeRekening.trim()) set.add(r.kodeRekening.trim()) })
    return Array.from(set).sort()
  }, [flatRows])

  // Filter baris berdasarkan kode rekening, lalu kelompokkan per No Bukti
  const noBuktiList = useMemo(() => {
    if (!kodeRekening) return []
    const filtered = flatRows.filter(r => (r.kodeRekening || '').trim() === kodeRekening)
    return groupByNoBukti(filtered)
  }, [flatRows, kodeRekening])

  // Grup terpilih berdasarkan No Bukti
  const selectedGroup = selectedNoBukti
    ? noBuktiList.find(g => g.noBukti === selectedNoBukti) || null
    : null

  // Representasi satu transaksi dari grup (ambil item pertama untuk data header)
  const headerItem = selectedGroup?.items[0] || null

  function openPeriod(key) {
    setSelectedKey(key)
    setKodeRekening('')
    setSelectedNoBukti('')
  }

  function backToGrid() {
    setSelectedKey(null)
    setKodeRekening('')
    setSelectedNoBukti('')
  }

  // ── Pre-fill data untuk modal surat tugas ───────────────────────────────────
  function buildDefaultData() {
    if (!selectedGroup || !headerItem) return {}
    const namaKegiatan = lookupUraianKegiatan(headerItem.kodeKegiatan) || ''
    const totalHonor   = selectedGroup.items.reduce((s, r) => s + (parseFloat(r.pengeluaran) || 0), 0)
    return {
      namaKegiatan,
      dasarKegiatan: `Dalam rangka ${namaKegiatan}`,
      tanggal:       headerItem.tanggal || '',
      honorJumlah:   totalHonor,
      nomorKwitansi: headerItem.noBukti || '',
      keteranganBayar: `Dibayarkan Transport Perjalanan Dinas Kegiatan ${namaKegiatan}`,
    }
  }

  // ── Grid bulan ──────────────────────────────────────────────────────────────
  if (!selectedGrp) {
    return (
      <div className={styles.wrap}>
        {!grouped.length ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🗂️</div>
            <p>Belum ada riwayat BKU.</p>
            <p className={styles.emptyHint}>Konversi atau tambah transaksi terlebih dahulu di tab Riwayat BKU.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {grouped.map(grp => {
              const key = `${grp.tahun}-${grp.bulan}`
              const total = grp.entries.reduce((s, e) => s + e.total, 0)
              const jmlTransaksi = grp.entries.reduce((s, e) => s + e.rows.length, 0)
              return (
                <button key={key} className={styles.monthCard} onClick={() => openPeriod(key)}>
                  <div className={styles.monthCardTop}>
                    <span className={styles.monthName}>{grp.bulan}</span>
                    <span className={styles.monthYear}>{grp.tahun}</span>
                  </div>
                  <div className={styles.monthCardStats}>
                    <div className={styles.monthStat}>
                      <span className={styles.monthStatNum}>{jmlTransaksi}</span>
                      <span className={styles.monthStatLbl}>Transaksi</span>
                    </div>
                    <div className={styles.monthStat}>
                      <span className={styles.monthStatNum}>Rp {fmtRp(total)}</span>
                      <span className={styles.monthStatLbl}>Total</span>
                    </div>
                  </div>
                  <div className={styles.monthCardArrow}>Buat LPJ →</div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Detail LPJ per bulan ────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      {showSuratModal && (
        <SuratTugasModal
          onClose={() => setShowSuratModal(false)}
          defaultData={buildDefaultData()}
        />
      )}
      {showSekolahModal && (
        <DataSekolahModal
          onClose={() => setShowSekolahModal(false)}
          onSaved={() => setShowSekolahModal(false)}
        />
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className={styles.backBtn} onClick={backToGrid}>← Kembali ke daftar bulan</button>
        <button 
          className={styles.setupBtn} 
          onClick={() => setShowSekolahModal(true)}
          style={{ marginLeft: 'auto', padding: '0.5rem 1rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ⚙️ Setup Data Sekolah
        </button>
      </div>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>LPJ — {selectedGrp.bulan} {selectedGrp.tahun}</div>
        <div className={styles.detailSub}>{flatRows.length} transaksi tercatat pada periode ini</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Pilih Transaksi</div>
        <div className={styles.cardDesc}>Pilih Kode Rekening, lalu pilih No. Bukti untuk membuat LPJ.</div>

        <div className={styles.dropdownRow}>
          {/* Kode Rekening */}
          <div className={styles.field}>
            <label>Kode Rekening</label>
            <select
              value={kodeRekening}
              onChange={e => { setKodeRekening(e.target.value); setSelectedNoBukti('') }}
            >
              <option value="">— Pilih kode rekening —</option>
              {kodeRekeningList.map(kr => (
                <option key={kr} value={kr}>{kr} — {lookupUraianRekening(kr)}</option>
              ))}
            </select>
            {!kodeRekeningList.length && (
              <span className={styles.hintWarn}>Tidak ada data Kode Rekening pada periode ini.</span>
            )}
          </div>

          {/* No Bukti */}
          <div className={styles.field}>
            <label>No. Bukti</label>
            <select
              value={selectedNoBukti}
              onChange={e => setSelectedNoBukti(e.target.value)}
              disabled={!kodeRekening}
            >
              <option value="">{kodeRekening ? '— Pilih no. bukti —' : 'Pilih kode rekening dahulu'}</option>
              {noBuktiList.map(g => (
                <option key={g.noBukti} value={g.noBukti}>
                  {g.noBukti} · {g.items.length} item · Rp {fmtRp(g.items.reduce((s, r) => s + (parseFloat(r.pengeluaran) || 0), 0))}
                </option>
              ))}
            </select>
            {kodeRekening && !noBuktiList.length && (
              <span className={styles.hintWarn}>Tidak ada transaksi untuk kode rekening ini.</span>
            )}
          </div>
        </div>
      </div>

      {/* Detail No Bukti terpilih */}
      {selectedGroup && headerItem && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitle}>Detail Transaksi — No. Bukti {selectedGroup.noBukti}</div>
            <button className={styles.btnLpj} onClick={() => setShowSuratModal(true)}>
              📄 Buat LPJ
            </button>
          </div>

          {/* Header transaksi (data dari baris pertama) */}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Tanggal</span>
              <span className={styles.detailVal}>{headerItem.tanggal}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>No. Bukti</span>
              <span className={styles.detailVal}>{headerItem.noBukti}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Kode Kegiatan</span>
              <span className={styles.detailVal}>{lookupUraianKegiatan(headerItem.kodeKegiatan) || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Kode Rekening</span>
              <span className={styles.detailVal}>{lookupUraianRekening(headerItem.kodeRekening) || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Nama Toko</span>
              <span className={styles.detailVal}>{headerItem.namaToko || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLbl}>Total Pengeluaran</span>
              <span className={`${styles.detailVal} ${styles.detailAmt}`}>
                Rp {fmtRp(selectedGroup.items.reduce((s, r) => s + (parseFloat(r.pengeluaran) || 0), 0))}
              </span>
            </div>
          </div>

          {/* Tabel item dalam No Bukti ini */}
          <div className={styles.itemTableWrap}>
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Uraian</th>
                  <th>Harga Satuan</th>
                  <th>Jml</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroup.items.map((item, i) => (
                  <tr key={i}>
                    <td className={styles.tdMuted}>{i + 1}</td>
                    <td>{item.uraian || '—'}</td>
                    <td className={styles.tdNum}>{item.hargaSatuan ? `Rp ${fmtRp(item.hargaSatuan)}` : '—'}</td>
                    <td className={styles.tdCenter}>{item.jumlahBarang || '—'}</td>
                    <td className={styles.tdCenter}>{item.jenis || '—'}</td>
                    <td className={styles.tdAmt}>Rp {fmtRp(item.pengeluaran)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
