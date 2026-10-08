import { useState } from 'react'
import Modal from './Modal'
import { generateSuratTugas } from './suratTugas'
import { getCurrentUser } from '../useStorage'
import { getDataSekolah } from './DataSekolahModal'
import { getMasterPenerima } from '../bkuStore'
import styles from './SuratTugasModal.module.css'

/**
 * Modal form sebelum generate Surat Tugas .docx
 *
 * Props:
 *   onClose      — tutup modal
 *   defaultData  — data pre-fill dari transaksi BKU (tanggal, namaKegiatan, dll)
 */

// Konversi "DD/MM/YYYY" atau Date → "YYYY-MM-DD" untuk input[type=date]
function toInputDate(v) {
  if (!v) return ''
  if (typeof v === 'string') {
    // DD/MM/YYYY
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
    // sudah YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  }
  return ''
}

// Format angka → terbilang sederhana (cukup untuk nilai honor SD)
const SATUAN = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh',
  'Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas','Enam Belas','Tujuh Belas',
  'Delapan Belas','Sembilan Belas']
function terbilang(n) {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'Nol'
  if (n < 20) return SATUAN[n]
  if (n < 100) return SATUAN[Math.floor(n/10)*10 - (Math.floor(n/10)*10 - Math.floor(n/10)*10)] + (n%10 ? ' ' + SATUAN[n%10] : '')
  // rebuild properly
  function eja(x) {
    if (x === 0) return ''
    if (x < 20)  return SATUAN[x]
    if (x < 100) {
      const s = Math.floor(x / 10)
      const r = x % 10
      const tens = ['','','Dua Puluh','Tiga Puluh','Empat Puluh','Lima Puluh',
                    'Enam Puluh','Tujuh Puluh','Delapan Puluh','Sembilan Puluh']
      return tens[s] + (r ? ' ' + SATUAN[r] : '')
    }
    if (x < 200) return 'Seratus' + (x%100 ? ' ' + eja(x%100) : '')
    if (x < 1000) return SATUAN[Math.floor(x/100)] + ' Ratus' + (x%100 ? ' ' + eja(x%100) : '')
    if (x < 2000) return 'Seribu' + (x%1000 ? ' ' + eja(x%1000) : '')
    if (x < 1000000) return eja(Math.floor(x/1000)) + ' Ribu' + (x%1000 ? ' ' + eja(x%1000) : '')
    if (x < 1000000000) return eja(Math.floor(x/1000000)) + ' Juta' + (x%1000000 ? ' ' + eja(x%1000000) : '')
    return eja(Math.floor(x/1000000000)) + ' Miliar' + (x%1000000000 ? ' ' + eja(x%1000000000) : '')
  }
  return eja(n) + ' Rupiah'
}

// Hari dalam Bahasa Indonesia
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember']
function formatHariTanggal(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T00:00:00')
  if (isNaN(d)) return ''
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Seksi field ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function Field({ label, required, children, hint }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}{required && <span className={styles.req}>*</span>}</label>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}

// ─── Komponen utama ───────────────────────────────────────────────────────────
export default function SuratTugasModal({ onClose, defaultData = {} }) {
  const user = getCurrentUser()
  const dataSekolah = getDataSekolah() // ambil data sekolah yang sudah disimpan

  // ── State form ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Identitas sekolah (prioritas: dataSekolah > user)
    namaSekolah:    dataSekolah?.namaSekolah    || user?.sekolah || '',
    alamatSekolah:  dataSekolah?.alamatSekolah  || user?.alamat  || '',
    kotaSekolah:    dataSekolah?.kotaSekolah    || user?.kota    || '',
    korwil:         dataSekolah?.korwil         || user?.korwil  || 'KORWIL BIDIKCAM PLERED',
    desaSekolah:    dataSekolah?.desaSekolah    || user?.desa    || '',

    // Kepala Sekolah (prioritas: dataSekolah > user)
    namaKepsek:     dataSekolah?.namaKepsek     || user?.namaKepsek || '',
    nipKepsek:      dataSekolah?.nipKepsek      || user?.nipKepsek  || '',

    // Logo (dari dataSekolah)
    logoKiri:       dataSekolah?.logoKiri       || '',
    logoKanan:      dataSekolah?.logoKanan      || '',

    // Data surat
    nomorSurat:     defaultData.nomorSurat   || '',
    namaKegiatan:   defaultData.namaKegiatan || '',
    dasarKegiatan:  defaultData.dasarKegiatan || '',

    // Penerima tugas
    namaPenerima:   defaultData.namaPenerima  || '',
    nipPenerima:    defaultData.nipPenerima   || '',
    jabatanPenerima: defaultData.jabatanPenerima || 'Guru Kelas',

    // Pelaksanaan
    tanggalISO:     toInputDate(defaultData.tanggal) || '',
    waktu:          defaultData.waktu    || 'Pukul 08.00 WIB s/d Selesai',
    tempat:         defaultData.tempat   || '',

    // Keuangan
    honorJumlah:    String(defaultData.honorJumlah || ''),
    nomorKwitansi:  defaultData.nomorKwitansi || '',
    keteranganBayar: defaultData.keteranganBayar || 'Dibayarkan Transport Perjalanan Dinas Kegiatan KKG',

    // Bendahara (prioritas: dataSekolah > defaultData)
    namaBendahara:  dataSekolah?.namaBendahara  || defaultData.namaBendahara || '',
    nipBendahara:   dataSekolah?.nipBendahara   || defaultData.nipBendahara  || '',
  })

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const masterPenerima = getMasterPenerima()

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // Pilih penerima dari master → auto-fill nama, NIP, jabatan
  function handlePilihPenerima(nama) {
    if (!nama) return
    const p = masterPenerima.find(m => m.nama === nama)
    if (p) {
      setForm(f => ({
        ...f,
        namaPenerima:   p.nama || '',
        nipPenerima:    p.nip || '',
        jabatanPenerima: p.jabatan || '',
      }))
    }
  }

  // Auto-hitung terbilang saat honor berubah
  function handleHonor(val) {
    set('honorJumlah', val)
  }
  const terbilangAuto = terbilang(parseFloat(form.honorJumlah) || 0)
  const hariTanggalAuto = formatHariTanggal(form.tanggalISO)

  // ── Validasi & generate ────────────────────────────────────────────────────
  async function handleGenerate() {
    // Validasi data sekolah harus sudah disetup
    if (!dataSekolah) {
      setError('Data sekolah belum disetup. Klik tombol "⚙️ Setup Data Sekolah" terlebih dahulu.')
      return
    }
    if (!dataSekolah.namaSekolah || !dataSekolah.namaKepsek || !dataSekolah.nipKepsek || 
        !dataSekolah.namaBendahara || !dataSekolah.nipBendahara) {
      setError('Data sekolah tidak lengkap. Silakan setup ulang data sekolah.')
      return
    }

    const required = [
      ['nomorSurat',     'Nomor Surat'],
      ['namaKegiatan',   'Nama Kegiatan'],
      ['dasarKegiatan',  'Dasar Kegiatan'],
      ['waktu',          'Waktu'],
      ['tempat',         'Tempat Pelaksanaan'],
      ['namaPenerima',   'Nama Penerima Tugas'],
      ['nipPenerima',    'NIP Penerima Tugas'],
      ['jabatanPenerima','Jabatan Penerima Tugas'],
      ['tanggalISO',     'Tanggal Pelaksanaan'],
      ['honorJumlah',    'Jumlah Honor'],
      ['keteranganBayar','Keterangan Pembayaran'],
    ]
    for (const [key, label] of required) {
      if (!form[key]?.toString().trim()) {
        setError(`Field "${label}" wajib diisi.`)
        return
      }
    }
    setError('')
    setLoading(true)
    try {
      await generateSuratTugas({
        ...form,
        hariTanggal:  hariTanggalAuto,
        honorJumlah:  parseFloat(form.honorJumlah) || 0,
        terbilang:    terbilangAuto,
      })
      onClose()
    } catch (e) {
      setError('Gagal membuat dokumen: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal title="Buat Surat Tugas" onClose={onClose} wide>
      <div className={styles.wrap}>

        <Section title="Data Surat">
          <div className={styles.row2}>
            <Field label="Nomor Surat" required>
              <input value={form.nomorSurat} onChange={e => set('nomorSurat', e.target.value)}
                placeholder="421.2/048/SD.V/2026" />
            </Field>
            <Field label="Tanggal Pelaksanaan" required>
              <input type="date" value={form.tanggalISO} onChange={e => set('tanggalISO', e.target.value)} />
              {hariTanggalAuto && <span className={styles.hint}>{hariTanggalAuto}</span>}
            </Field>
          </div>
          <Field label="Nama Kegiatan" required>
            <input value={form.namaKegiatan} onChange={e => set('namaKegiatan', e.target.value)}
              placeholder="Sosialisasi KKG Perihal Penginputan Nilai Ijazah" />
          </Field>
          <Field label="Dasar Kegiatan" required>
            <textarea rows={2} value={form.dasarKegiatan} onChange={e => set('dasarKegiatan', e.target.value)}
              placeholder="Dalam rangka sosialisasi Kelompok Kerja Guru (KKG)…" />
          </Field>
          <div className={styles.row2}>
            <Field label="Waktu" required>
              <input value={form.waktu} onChange={e => set('waktu', e.target.value)}
                placeholder="Pukul 08.00 WIB s/d Selesai" />
            </Field>
            <Field label="Tempat" required>
              <input value={form.tempat} onChange={e => set('tempat', e.target.value)}
                placeholder="Gedung Guru Kec. Plered" />
            </Field>
          </div>
        </Section>

        <Section title="Penerima Tugas">
          {masterPenerima.length > 0 && (
            <Field label="Pilih dari Master Penerima" hint="Memilih akan mengisi otomatis field di bawah">
              <select
                value=""
                onChange={e => handlePilihPenerima(e.target.value)}
              >
                <option value="">— Pilih penerima —</option>
                {masterPenerima.map((p, i) => (
                  <option key={i} value={p.nama}>
                    {p.nama}{p.jabatan ? ` — ${p.jabatan}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Nama Lengkap" required>
            <input value={form.namaPenerima} onChange={e => set('namaPenerima', e.target.value)}
              placeholder="Kusnaeni, S.Pd." />
          </Field>
          <div className={styles.row2}>
            <Field label="NIP" required>
              <input value={form.nipPenerima} onChange={e => set('nipPenerima', e.target.value)}
                placeholder="196904282005011003" />
            </Field>
            <Field label="Jabatan" required>
              <input value={form.jabatanPenerima} onChange={e => set('jabatanPenerima', e.target.value)}
                placeholder="Guru Kelas" />
            </Field>
          </div>
        </Section>

        <Section title="Keuangan">
          <Field label="Keterangan Pembayaran" required>
            <input value={form.keteranganBayar} onChange={e => set('keteranganBayar', e.target.value)}
              placeholder="Dibayarkan Transport Perjalanan Dinas Kegiatan KKG" />
          </Field>
          <div className={styles.row2}>
            <Field label="Jumlah Honor (Rp)" required>
              <input type="number" min="0" value={form.honorJumlah} onChange={e => handleHonor(e.target.value)}
                placeholder="30000" />
              {form.honorJumlah && <span className={styles.hint}>{terbilangAuto}</span>}
            </Field>
            <Field label="No. Kwitansi">
              <input value={form.nomorKwitansi} onChange={e => set('nomorKwitansi', e.target.value)}
                placeholder="(opsional)" />
            </Field>
          </div>
        </Section>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={loading}>Batal</button>
          <button className={styles.btnGenerate} onClick={handleGenerate} disabled={loading}>
            {loading ? '⏳ Membuat dokumen…' : '📄 Unduh Surat Tugas (.docx)'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
