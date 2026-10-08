import { useState } from 'react'
import styles from './TambahTransaksi.module.css'
import { lookupHarga, simpanBKU, fmtDateInput, BULAN_LIST } from '../bkuStore'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function TambahTransaksi({ onSaved, onCancel }) {
  const [meta, setMeta] = useState({ sekolah: 'SDN 2 KALIWULU', triwulan: '2', tahun: String(new Date().getFullYear()), bulan: BULAN_LIST[new Date().getMonth()] })
  const [form, setForm] = useState({
    tanggal: todayIso(), noBukti: '', kodeKegiatan: '', kodeRekening: '',
    uraian: '', hargaSatuan: '', jumlahBarang: '', jenis: '', pengeluaran: '', namaToko: '',
  })
  const [error, setError] = useState('')
  const [autoInfo, setAutoInfo] = useState(null)

  function updateForm(field, val) {
    setForm(prev => {
      const next = { ...prev, [field]: val }

      if (field === 'hargaSatuan' || field === 'jumlahBarang') {
        const h = parseFloat(field === 'hargaSatuan' ? val : prev.hargaSatuan) || 0
        const j = parseFloat(field === 'jumlahBarang' ? val : prev.jumlahBarang) || 0
        if (h > 0 && j > 0) next.pengeluaran = h * j
      }

      if (field === 'uraian') {
        // Coba auto-fill dari master harga jika cocok persis
        const found = lookupHarga(val, prev.kodeKegiatan, prev.kodeRekening)
        if (found && !prev.hargaSatuan) {
          next.hargaSatuan = found.harga
          next.jenis = found.jenis || ''
          setAutoInfo(`Harga otomatis dari master: Rp ${(parseFloat(found.harga)||0).toLocaleString('en-US')}`)
          const h = parseFloat(found.harga) || 0
          const j = parseFloat(prev.jumlahBarang) || 0
          if (h > 0 && j > 0) next.pengeluaran = h * j
        } else {
          setAutoInfo(null)
        }
      }

      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.tanggal)      { setError('Tanggal wajib diisi.'); return }
    if (!form.noBukti.trim()) { setError('No Bukti wajib diisi.'); return }
    if (!form.uraian.trim())  { setError('Uraian wajib diisi.'); return }
    const pengeluaran = parseFloat(form.pengeluaran) || 0
    if (pengeluaran <= 0)    { setError('Jumlah pengeluaran harus lebih dari 0.'); return }
    if (!meta.sekolah.trim()) { setError('Nama sekolah wajib diisi.'); return }

    const row = {
      _idx: 0,
      tanggal: fmtDateInput(form.tanggal),
      noBukti: form.noBukti.trim(),
      kodeKegiatan: form.kodeKegiatan.trim(),
      kodeRekening: form.kodeRekening.trim(),
      uraian: form.uraian.trim(),
      pengeluaran,
      hargaSatuan: form.hargaSatuan ? parseFloat(form.hargaSatuan) : '',
      jumlahBarang: form.jumlahBarang ? parseInt(form.jumlahBarang) : '',
      jenis: form.jenis.trim(),
      namaToko: form.namaToko.trim(),
      autoFilled: false,
      matchLevel: null,
    }

    const ok = simpanBKU(meta, [row])
    if (ok) { if (onSaved) onSaved() }
    else { setError('Gagal menyimpan transaksi. Coba lagi.') }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Info dokumen */}
      <div className={styles.sectionTitle}>Info Dokumen</div>
      <div className={styles.metaGrid}>
        <div className={styles.field}>
          <label>Nama Sekolah</label>
          <input value={meta.sekolah} onChange={e => setMeta(p => ({ ...p, sekolah: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label>Triwulan</label>
          <select value={meta.triwulan} onChange={e => setMeta(p => ({ ...p, triwulan: e.target.value }))}>
            {['1','2','3','4'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Tahun</label>
          <input type="number" value={meta.tahun} onChange={e => setMeta(p => ({ ...p, tahun: e.target.value }))} />
        </div>
        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
          <label>Bulan</label>
          <select value={meta.bulan} onChange={e => setMeta(p => ({ ...p, bulan: e.target.value }))}>
            {BULAN_LIST.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Detail transaksi */}
      <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Detail Transaksi</div>
      <div className={styles.metaGrid}>
        <div className={styles.field}>
          <label>Tanggal</label>
          <input type="date" value={form.tanggal} onChange={e => updateForm('tanggal', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>No Bukti</label>
          <input value={form.noBukti} placeholder="001/BKU/..." onChange={e => updateForm('noBukti', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Kode Kegiatan</label>
          <input value={form.kodeKegiatan} placeholder="06.07.03." onChange={e => updateForm('kodeKegiatan', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </div>
        <div className={styles.field}>
          <label>Kode Rekening</label>
          <input value={form.kodeRekening} placeholder="5.2.2.01.01" onChange={e => updateForm('kodeRekening', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </div>

        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
          <label>Uraian</label>
          <input value={form.uraian} placeholder="Nama barang / kegiatan..." onChange={e => updateForm('uraian', e.target.value)} />
          {autoInfo && <div className={styles.autoHint}>✓ {autoInfo}</div>}
        </div>

        <div className={styles.field}>
          <label>Harga Satuan</label>
          <input type="number" value={form.hargaSatuan} placeholder="0" onChange={e => updateForm('hargaSatuan', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Jumlah Barang</label>
          <input type="number" value={form.jumlahBarang} placeholder="0" onChange={e => updateForm('jumlahBarang', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Jenis / Satuan</label>
          <input value={form.jenis} placeholder="pcs, rim..." onChange={e => updateForm('jenis', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Nama Toko</label>
          <input value={form.namaToko} placeholder="Nama toko..." onChange={e => updateForm('namaToko', e.target.value)} />
        </div>

        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
          <label>Jumlah Pengeluaran (Rp)</label>
          <input
            type="number"
            value={form.pengeluaran}
            placeholder="0"
            onChange={e => updateForm('pengeluaran', e.target.value)}
            className={styles.pengeluaranInput}
          />
          <span className={styles.hintSmall}>Otomatis terisi dari Harga Satuan × Jumlah Barang, atau isi manual.</span>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>Batal</button>
        <button type="submit" className={styles.btnPrimary}>+ Simpan Transaksi</button>
      </div>
    </form>
  )
}
