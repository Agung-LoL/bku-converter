import { storageGet, storageSet, storageRemove } from '../useStorage'
import { useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import styles from './MasterHarga.module.css' // reuse same styles

export const KODE_REKENING_KEY = 'bku_kode_rekening_v1'

export function getMasterKodeRekening() {
  try { return storageGet(KODE_REKENING_KEY) || [] } catch { return [] }
}

function loadFromStorage() {
  const data = getMasterKodeRekening()
  return data.length ? data : [{ kode: '', uraian: '' }]
}

export default function MasterKodeRekening() {
  const [rows, setRows] = useState(loadFromStorage)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function save() {
    const clean = rows.filter(r => r.kode.trim() || r.uraian.trim())
    storageSet(KODE_REKENING_KEY, clean)
    setRows(clean.length ? clean : [{ kode: '', uraian: '' }])
    showToast(`Master kode rekening disimpan — ${clean.length} item.`, 'ok')
  }

  function addRow() {
    setRows(prev => [...prev, { kode: '', uraian: '' }])
  }

  function delRow(i) {
    setRows(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      return next.length ? next : [{ kode: '', uraian: '' }]
    })
  }

  function update(i, field, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function hapusSemua() {
    if (!confirm(`Hapus semua ${rows.filter(r => r.kode.trim()).length} data master kode rekening? Tindakan ini tidak bisa dibatalkan.`)) return
    storageRemove(KODE_REKENING_KEY)
    setRows([{ kode: '', uraian: '' }])
    showToast('Semua data master kode rekening telah dihapus.', 'ok')
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Kode Rekening', 'Uraian Kegiatan'],
      ['5.2.2.01.01', 'Belanja Alat Tulis Kantor'],
      ['5.2.2.02.01', 'Belanja Bahan Habis Pakai'],
    ])
    ws['!cols'] = [{ wch: 20 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Kode Rekening')
    XLSX.writeFile(wb, 'TEMPLATE_KODE_REKENING.xlsx')
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
        const current = getMasterKodeRekening()
        let imported = 0
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i]
          if (!r || !r[0]) continue
          const kode   = String(r[0]).trim()
          const uraian = r[1] ? String(r[1]).trim() : ''
          if (!kode) continue
          const ex = current.findIndex(m => m.kode.toLowerCase() === kode.toLowerCase())
          if (ex >= 0) current[ex] = { kode, uraian }
          else current.push({ kode, uraian })
          imported++
        }
        const clean = current.filter(r => r.kode)
        storageSet(KODE_REKENING_KEY, clean)
        setRows(clean.length ? clean : [{ kode: '', uraian: '' }])
        showToast(`Berhasil import ${imported} kode rekening.`, 'ok')
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
        Kode rekening akan ditampilkan sebagai uraian di dropdown LPJ. Kode harus sama persis dengan yang ada di file BKU import.
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
              <th style={{ width: 40 }}>No</th>
              <th style={{ width: 180 }}>Kode Rekening</th>
              <th>Uraian Rekening</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className={styles.empty}>Belum ada data. Klik "+ Tambah baris" untuk mulai.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={styles.num}>{i + 1}</td>
                <td>
                  <input
                    value={r.kode}
                    placeholder="contoh: 5.2.2.01.01"
                    onChange={ev => update(i, 'kode', ev.target.value)}
                    className={styles.cellInput}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    value={r.uraian}
                    placeholder="Uraian rekening..."
                    onChange={ev => update(i, 'uraian', ev.target.value)}
                    className={styles.cellInput}
                  />
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
