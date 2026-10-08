import { useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import styles from './MasterHarga.module.css'

import { storageGet, storageSet, storageRemove } from '../useStorage'
import { PENERIMA_KEY } from '../bkuStore'

const EMPTY_ROW = { nama: '', nip: '', jabatan: '', golongan: '' }

function loadFromStorage() {
  try {
    const data = storageGet(PENERIMA_KEY)
    if (data) return data.map(r => ({ nama: '', nip: '', jabatan: '', golongan: '', ...r }))
  } catch {}
  return [{ ...EMPTY_ROW }]
}

export default function MasterPenerima({ onSave }) {
  const [rows, setRows] = useState(loadFromStorage)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function save() {
    const clean = rows.filter(r => r.nama.trim())
    storageSet(PENERIMA_KEY, clean)
    setRows(clean.length ? clean : [{ ...EMPTY_ROW }])
    showToast(`Master penerima disimpan — ${clean.length} orang.`, 'ok')
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
    if (!confirm(`Hapus semua ${rows.filter(r => r.nama.trim()).length} data master penerima? Tindakan ini tidak bisa dibatalkan.`)) return
    storageRemove(PENERIMA_KEY)
    setRows([{ ...EMPTY_ROW }])
    showToast('Semua data master penerima telah dihapus.', 'ok')
    if (onSave) onSave([])
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama', 'NIP', 'Jabatan', 'Golongan'],
      ['Kusnaeni, S.Pd.', '196904282005011003', 'Guru Kelas', 'IV/a'],
      ['Yana Mulyana, S.Pd.I', '198702192019031006', 'Kepala Sekolah', 'IV/b'],
    ])
    ws['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Master Penerima')
    XLSX.writeFile(wb, 'TEMPLATE_MASTER_PENERIMA.xlsx')
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
          const nama     = r[0] ? String(r[0]).trim() : ''
          const nip      = r[1] ? String(r[1]).trim() : ''
          const jabatan  = r[2] ? String(r[2]).trim() : ''
          const golongan = r[3] ? String(r[3]).trim() : ''
          if (!nama) continue
          const ex = current.findIndex(m =>
            m.nama.toLowerCase() === nama.toLowerCase()
          )
          const entry = { nama, nip, jabatan, golongan }
          if (ex >= 0) current[ex] = entry
          else current.push(entry)
          imported++
        }
        const clean = current.filter(r => r.nama)
        storageSet(PENERIMA_KEY, clean)
        setRows(clean.length ? clean : [{ ...EMPTY_ROW }])
        showToast(`Berhasil import ${imported} orang.`, 'ok')
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
          Data penerima ini akan otomatis muncul sebagai dropdown saat membuat Surat Tugas di LPJ.
          Isi <strong>Nama</strong>, <strong>NIP</strong>, <strong>Jabatan</strong>, dan <strong>Golongan</strong>.
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
              <th>Nama Lengkap</th>
              <th style={{ width: 200 }}>NIP</th>
              <th style={{ width: 160 }}>Jabatan</th>
              <th style={{ width: 100 }}>Golongan</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>Belum ada data. Klik "+ Tambah baris" untuk mulai.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={styles.num}>{i + 1}</td>
                <td>
                  <input value={r.nama} placeholder="Nama lengkap..."
                    onChange={ev => update(i, 'nama', ev.target.value)}
                    className={styles.cellInput} />
                </td>
                <td>
                  <input value={r.nip} placeholder="NIP..."
                    onChange={ev => update(i, 'nip', ev.target.value)}
                    className={styles.cellInput} style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </td>
                <td>
                  <input value={r.jabatan} placeholder="Jabatan..."
                    onChange={ev => update(i, 'jabatan', ev.target.value)}
                    className={styles.cellInput} />
                </td>
                <td>
                  <input value={r.golongan} placeholder="IV/a"
                    onChange={ev => update(i, 'golongan', ev.target.value)}
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

      <p className={styles.hint}>Data tersimpan di browser Anda dan tidak hilang saat halaman di-refresh.</p>
    </div>
  )
}
