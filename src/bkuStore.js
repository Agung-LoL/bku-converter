// ── Modul bersama: helper BKU (dipakai KonversiBKU, RiwayatBKU, TambahTransaksi) ──
import { storageGet, storageSet } from './useStorage'

export const STORAGE_KEY = 'bku_master_harga_v1'   // master harga
export const KODE_KEY    = 'bku_kode_kegiatan_v1'  // master kode kegiatan
export const KODE_REKENING_KEY = 'bku_kode_rekening_v1' // master kode rekening
export const RIWAYAT_KEY = 'bku_riwayat_v1'         // riwayat BKU tersimpan
export const PENERIMA_KEY = 'bku_master_penerima_v1' // master penerima (untuk LPJ)

export const BULAN_LIST = [
  'JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
  'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER',
]

// ── Master harga ──────────────────────────────────────────────────────────────
export function getMaster() {
  try { return storageGet(STORAGE_KEY) || [] } catch { return [] }
}

// ── Master penerima ────────────────────────────────────────────────────────────
export function getMasterPenerima() {
  try { return storageGet(PENERIMA_KEY) || [] } catch { return [] }
}

// Cari harga barang berdasarkan nama + kode kegiatan + kode rekening (prioritas berjenjang)
export function lookupHarga(uraian, kodeKegiatan, kodeRekening) {
  const master = getMaster()
  if (!uraian) return null
  const u  = uraian.trim().toLowerCase()
  const kk = (kodeKegiatan || '').trim().toLowerCase()
  const kr = (kodeRekening || '').trim().toLowerCase()

  const byNama = master.filter(m => m.nama && m.nama.trim().toLowerCase() === u)
  if (!byNama.length) return null

  const p1 = byNama.find(m =>
    (m.kodeKegiatan || '').trim().toLowerCase() === kk &&
    (m.kodeRekening || '').trim().toLowerCase() === kr
  )
  if (p1) return { ...p1, matchLevel: 'exact' }

  if (kk) {
    const p2 = byNama.find(m => (m.kodeKegiatan || '').trim().toLowerCase() === kk)
    if (p2) return { ...p2, matchLevel: 'kegiatan' }
  }
  if (kr) {
    const p3 = byNama.find(m => (m.kodeRekening || '').trim().toLowerCase() === kr)
    if (p3) return { ...p3, matchLevel: 'rekening' }
  }
  return { ...byNama[0], matchLevel: 'nama' }
}

// ── Master kode kegiatan ────────────────────────────────────────────────────────
export function lookupUraianKegiatan(kode) {
  try {
    const master = storageGet(KODE_KEY) || []
    if (!kode) return kode
    const k = kode.trim().toLowerCase()
    const found = master.find(m => m.kode && m.kode.trim().toLowerCase() === k)
    return found ? found.uraian : kode
  } catch { return kode }
}

// ── Master kode rekening ────────────────────────────────────────────────────────
export function lookupUraianRekening(kode) {
  try {
    const master = storageGet(KODE_REKENING_KEY) || []
    if (!kode) return kode
    const k = kode.trim().toLowerCase()
    const found = master.find(m => m.kode && m.kode.trim().toLowerCase() === k)
    return found ? found.uraian : kode
  } catch { return kode }
}

// ── Riwayat BKU ───────────────────────────────────────────────────────────────
export function getRiwayat() {
  try { return storageGet(RIWAYAT_KEY) || [] } catch { return [] }
}

export function simpanBKU(meta, rows) {
  try {
    const semua = getRiwayat()
    const id = `${meta.tahun}-${meta.bulan}-${Date.now()}`
    const total = rows.reduce((s, r) => s + (parseFloat(r.pengeluaran) || 0), 0)
    semua.push({ id, meta, rows, total, savedAt: new Date().toISOString() })
    storageSet(RIWAYAT_KEY, semua)
    return true
  } catch (e) { console.error('Gagal simpan riwayat', e); return false }
}

// ── Grouping helpers ────────────────────────────────────────────────────────────
export function groupByBulanTahun(data) {
  const map = new Map()
  data.forEach(entry => {
    const key = `${entry.meta.tahun}-${entry.meta.bulan}`
    if (!map.has(key)) map.set(key, { tahun: entry.meta.tahun, bulan: entry.meta.bulan, entries: [] })
    map.get(key).entries.push(entry)
  })
  return Array.from(map.values()).sort((a, b) => {
    if (b.tahun !== a.tahun) return parseInt(b.tahun) - parseInt(a.tahun)
    return BULAN_LIST.indexOf(b.bulan) - BULAN_LIST.indexOf(a.bulan)
  })
}

export function groupByNoBukti(rows) {
  const map = new Map()
  rows.forEach(r => {
    const k = r.noBukti || '__' + r._idx
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  })
  return Array.from(map.values())
}

// ── Format helpers ──────────────────────────────────────────────────────────────
// PENTING: Semua tanggal di modul ini direpresentasikan sebagai Date UTC-midnight
// (dibuat via Date.UTC) dan SELALU dibaca kembali dengan getter UTC (getUTCMonth,
// getUTCFullYear, getUTCDate). SheetJS (cellDates:true) mengembalikan Date yang
// merepresentasikan tengah malam UTC untuk tanggal Excel — jika dibaca dengan
// getter lokal (getMonth/getFullYear/toLocaleDateString), hasilnya bisa mundur
// satu hari tergantung timezone browser, yang menyebabkan alokasi bulan salah
// (contoh: 1 Agustus terbaca sebagai 31 Juli). Konsisten pakai UTC menghindari ini.

function pad2(n) { return String(n).padStart(2, '0') }

export function fmtDate(v) {
  if (!v) return ''
  if (v instanceof Date && !isNaN(v)) {
    return `${pad2(v.getUTCDate())}/${pad2(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`
  }
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    if (isNaN(d)) return String(v)
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  }
  return String(v)
}

// input type="date" (YYYY-MM-DD) -> DD/MM/YYYY
export function fmtDateInput(isoStr) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  if (!y || !m || !d) return isoStr
  return `${d}/${m}/${y}`
}

export function fmtRp(v) { return (parseFloat(v) || 0).toLocaleString('en-US') }

// Ambil objek Date JS (UTC-midnight) dari nilai cell tanggal (Date object, Excel serial number, atau string)
export function parseDateValue(v) {
  if (!v) return null
  if (v instanceof Date && !isNaN(v)) return v // sudah UTC-midnight dari SheetJS
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d) ? null : d
  }
  if (typeof v === 'string') {
    // Coba format DD/MM/YYYY — konstruksi via Date.UTC agar konsisten UTC-midnight
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const d = new Date(Date.UTC(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])))
      return isNaN(d) ? null : d
    }
    // Coba format YYYY-MM-DD
    const m2 = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m2) {
      const d = new Date(Date.UTC(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])))
      return isNaN(d) ? null : d
    }
    // Fallback: parsing browser bawaan, lalu ambil komponen lokalnya dan bangun ulang sebagai UTC
    const parsed = new Date(v)
    if (isNaN(parsed)) return null
    const d = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
    return isNaN(d) ? null : d
  }
  return null
}

// Bulan (nama, dalam BULAN_LIST) dari objek Date (pakai getter UTC)
export function getBulanFromDate(date) {
  if (!date) return null
  return BULAN_LIST[date.getUTCMonth()]
}

// Triwulan (1-4) dari nama bulan
export function getTriwulanFromBulan(bulan) {
  const idx = BULAN_LIST.indexOf(bulan)
  if (idx === -1) return null
  return String(Math.floor(idx / 3) + 1)
}

// Tentukan bulan/tahun/triwulan paling dominan dari kumpulan baris data (berdasar field tanggalRaw)
export function deriveMetaFromRows(rows) {
  const counts = {} // "tahun-bulan" -> count
  rows.forEach(r => {
    const date = r.tanggalRaw
    if (!date) return
    const bulan = getBulanFromDate(date)
    const tahun = String(date.getUTCFullYear())
    const key = `${tahun}__${bulan}`
    counts[key] = (counts[key] || 0) + 1
  })
  const keys = Object.keys(counts)
  if (!keys.length) return null
  // Ambil yang paling sering muncul
  const bestKey = keys.reduce((a, b) => (counts[a] >= counts[b] ? a : b))
  const [tahun, bulan] = bestKey.split('__')
  return { tahun, bulan, triwulan: getTriwulanFromBulan(bulan) }
}
