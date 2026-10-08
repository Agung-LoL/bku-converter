import { useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import styles from './MasterHarga.module.css'

import { storageGet, storageSet, storageRemove } from '../useStorage'
const STORAGE_KEY = 'bku_master_harga_v1'

const EMPTY_ROW = { kodeKegiatan: '', kodeRekening: '', namaToko: '', nama: '', harga: '', jenis: '' }

function loadFromStorage() {
  try {
    const data = storageGet(STORAGE_KEY)
    if (data) return data.map(r => ({ kodeKegiatan: '', kodeRekening: '', namaToko: '', ...r }))
  } catch {}
  return [{ ...EMPTY_ROW }]
}

export default function MasterHarga({ onSave }) {
  const [rows, setRows] = useState(loadFromStorage)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function save() {
    const clean = rows.filter(r => r.nama.trim())
    storageSet(STORAGE_KEY, clean)
    setRows(clean.length ? clean : [{ ...EMPTY_ROW }])
    showToast(`Master harga disimpan — ${clean.length} item.`, 'ok')
    if (onSave) onSave(clean)
  }

  function addRow() { setRows(prev => [...prev, { ...EMPTY_ROW }]) }

  function delRow(i) {
    setRows(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      return next.length ? next : [{ ...EMPTY_ROW }]
    })
  }

  function update(i, field, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function hapusSemua() {
    if (!confirm(`Hapus semua ${rows.filter(r => r.nama.trim()).length} data master harga? Tindakan ini tidak bisa dibatalkan.`)) return
    storageRemove(STORAGE_KEY)
    setRows([{ ...EMPTY_ROW }])
    showToast('Semua data master harga telah dihapus.', 'ok')
    if (onSave) onSave([])
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Kode Kegiatan', 'Kode Rekening', 'Nama Toko', 'Nama Barang / Uraian', 'Harga Satuan', 'Jenis/Satuan'],
      ['06.07.03.', '5.2.2.01.01', 'Toko Maju',  'Isi ulang air galon', '5000',  'galon'],
      ['06.07.03.', '5.2.2.01.01', 'Toko Sejati', 'Isi ulang air galon', '5500',  'galon'],
      ['06.07.03.', '5.2.2.01.02', 'Toko Maju',  'Kertas A4 80gr',      '45000', 'rim'],
      ['', '', '', 'Spidol whiteboard', '8000', 'buah'],
    ])
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 34 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Master Harga')
    XLSX.writeFile(wb, 'TEMPLATE_MASTER_HARGA.xlsx')
    showToast('Template berhasil diunduh.', 'ok')
  }

  function importFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
        const current = loadFromStorage().filter(r => r.nama.trim())
        let imported = 0
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i]
          if (!r) continue
          let kodeKegiatan, kodeRekening, namaToko, nama, harga, jenis
          if (r.length >= 6 && (r[0] || r[1] || r[2])) {
            // format baru: KodeKegiatan|KodeRekening|NamaToko|Nama|Harga|Jenis
            kodeKegiatan = r[0] ? String(r[0]).trim() : ''
            kodeRekening = r[1] ? String(r[1]).trim() : ''
            namaToko     = r[2] ? String(r[2]).trim() : ''
            nama         = r[3] ? String(r[3]).trim() : ''
            harga        = parseFloat(r[4]) || 0
            jenis        = r[5] ? String(r[5]).trim() : ''
          } else if (r.length >= 5 && (r[0] || r[1])) {
            // format lama (5 kolom): KodeKegiatan|KodeRekening|Nama|Harga|Jenis
            kodeKegiatan = r[0] ? String(r[0]).trim() : ''
            kodeRekening = r[1] ? String(r[1]).trim() : ''
            namaToko     = ''
            nama         = r[2] ? String(r[2]).trim() : ''
            harga        = parseFloat(r[3]) || 0
            jenis        = r[4] ? String(r[4]).trim() : ''
          } else {
            // format paling lama (3 kolom): Nama|Harga|Jenis
            kodeKegiatan = ''; kodeRekening = ''; namaToko = ''
            nama  = r[0] ? String(r[0]).trim() : ''
            harga = parseFloat(r[1]) || 0
            jenis = r[2] ? String(r[2]).trim() : ''
          }
          if (!nama) continue
          const ex = current.findIndex(m =>
            m.nama.toLowerCase()          === nama.toLowerCase() &&
            (m.kodeKegiatan||'').toLowerCase() === kodeKegiatan.toLowerCase() &&
            (m.kodeRekening||'').toLowerCase() === kodeRekening.toLowerCase() &&
            (m.namaToko||'').toLowerCase()     === namaToko.toLowerCase()
          )
          const entry = { kodeKegiatan, kodeRekening, namaToko, nama, harga, jenis }
          if (ex >= 0) current[ex] = entry
          else current.push(entry)
          imported++
        }
        const clean = current.filter(r => r.nama)
        storageSet(STORAGE_KEY, clean)
        setRows(clean.length ? clean : [{ ...EMPTY_ROW }])
        showToast(`Berhasil import ${imported} item.`, 'ok')
        if (onSave) onSave(clean)
      } catch (err) {
        showToast('Gagal import: ' + err.message, 'err')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <div className={styles.wrap}>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}

      <div className={styles.info}>
        <span className={styles.infoIcon}>ℹ</span>
        <span>
          Nama barang harus <strong>sama persis</strong> dengan uraian di BKU import.
          Nama Toko digunakan agar barang yang sama di toko berbeda bisa punya harga berbeda.
          Semua kolom selain Nama Barang bersifat opsional.
        </span>
      </div>

      <div className={styles.toolbar}>
        <button className={styles.btn} onClick={downloadTemplate}>↓ Download template</button>
        <label className={styles.btn}>
          ↑ Import file Excel
          <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={importFile} />
        </label>
        <button className={styles.btn} onClick={addRow}>+ Tambah baris</button>
        <button className={`${styles.btn} ${styles.danger}`} onClick={hapusSemua}>🗑 Hapus semua</button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={save} style={{ marginLeft: 'auto' }}>
          Simpan master
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>No</th>
              <th style={{ width: 140 }}>Kode Kegiatan <span className={styles.optional}>(opsional)</span></th>
              <th style={{ width: 140 }}>Kode Rekening <span className={styles.optional}>(opsional)</span></th>
              <th style={{ width: 150 }}>Nama Toko <span className={styles.optional}>(opsional)</span></th>
              <th>Nama Barang / Uraian BKU</th>
              <th style={{ width: 140 }}>Harga Satuan (Rp)</th>
              <th style={{ width: 90 }}>Satuan/Jenis</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className={styles.empty}>Belum ada data. Klik "+ Tambah baris" untuk mulai.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={styles.num}>{i + 1}</td>
                <td>
                  <input value={r.kodeKegiatan || ''} placeholder="06.07.03."
                    onChange={ev => update(i, 'kodeKegiatan', ev.target.value)}
                    className={styles.cellInput} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </td>
                <td>
                  <input value={r.kodeRekening || ''} placeholder="5.2.2.01.01"
                    onChange={ev => update(i, 'kodeRekening', ev.target.value)}
                    className={styles.cellInput} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </td>
                <td>
                  <input value={r.namaToko || ''} placeholder="Nama toko..."
                    onChange={ev => update(i, 'namaToko', ev.target.value)}
                    className={styles.cellInput} />
                </td>
                <td>
                  <input value={r.nama} placeholder="Nama barang / uraian"
                    onChange={ev => update(i, 'nama', ev.target.value)}
                    className={styles.cellInput} />
                </td>
                <td>
                  <input type="number" value={r.harga} placeholder="0"
                    onChange={ev => update(i, 'harga', ev.target.value)}
                    className={styles.cellInput} style={{ textAlign: 'right' }} />
                </td>
                <td>
                  <input value={r.jenis} placeholder="pcs, rim..."
                    onChange={ev => update(i, 'jenis', ev.target.value)}
                    className={styles.cellInput} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className={styles.delBtn} onClick={() => delRow(i)} title="Hapus baris">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.priorityNote}>
        <strong>Prioritas pencocokan saat konversi:</strong>
        <span className={styles.priorityStep}>①</span> Nama + Kode Kegiatan + Kode Rekening
        <span className={styles.priorityStep}>②</span> Nama + Kode Kegiatan
        <span className={styles.priorityStep}>③</span> Nama + Kode Rekening
        <span className={styles.priorityStep}>④</span> Nama saja — jika pengeluaran tidak habis dibagi harga master, muncul konfirmasi
      </div>

      <p className={styles.hint}>Data tersimpan di browser Anda dan tidak hilang saat halaman di-refresh.</p>
    </div>
  )
}
