import { useState } from 'react'
import Modal from './Modal'
import styles from './SuratTugasModal.module.css'

const SEKOLAH_KEY = 'bku_data_sekolah'

/**
 * Modal untuk setup data sekolah yang akan disimpan dan digunakan berkali-kali
 * Data disimpan di localStorage
 */

export function getDataSekolah() {
  try {
    const stored = localStorage.getItem(SEKOLAH_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveDataSekolah(data) {
  localStorage.setItem(SEKOLAH_KEY, JSON.stringify(data))
}

// ─── Helper: convert file ke base64 ──────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
export default function DataSekolahModal({ onClose, onSaved }) {
  const existing = getDataSekolah()

  const [form, setForm] = useState({
    namaSekolah:    existing?.namaSekolah    || '',
    alamatSekolah:  existing?.alamatSekolah  || '',
    kotaSekolah:    existing?.kotaSekolah    || '',
    korwil:         existing?.korwil         || 'KORWIL BIDIKCAM PLERED',
    desaSekolah:    existing?.desaSekolah    || '',
    namaKepsek:     existing?.namaKepsek     || '',
    nipKepsek:      existing?.nipKepsek      || '',
    namaBendahara:  existing?.namaBendahara  || '',
    nipBendahara:   existing?.nipBendahara   || '',
    logoKiri:       existing?.logoKiri       || '', // base64
    logoKanan:      existing?.logoKanan      || '', // base64
  })

  const [error, setError] = useState('')
  const [previewKiri, setPreviewKiri]   = useState(existing?.logoKiri || '')
  const [previewKanan, setPreviewKanan] = useState(existing?.logoKanan || '')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ── Handle upload logo ──────────────────────────────────────────────────────
  async function handleLogoKiri(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG, JPG, dll)')
      return
    }
    if (file.size > 500 * 1024) {
      setError('Ukuran file maksimal 500KB')
      return
    }
    try {
      const base64 = await fileToBase64(file)
      set('logoKiri', base64)
      setPreviewKiri(base64)
      setError('')
    } catch (err) {
      setError('Gagal membaca file: ' + err.message)
    }
  }

  async function handleLogoKanan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG, JPG, dll)')
      return
    }
    if (file.size > 500 * 1024) {
      setError('Ukuran file maksimal 500KB')
      return
    }
    try {
      const base64 = await fileToBase64(file)
      set('logoKanan', base64)
      setPreviewKanan(base64)
      setError('')
    } catch (err) {
      setError('Gagal membaca file: ' + err.message)
    }
  }

  // ── Validasi & simpan ───────────────────────────────────────────────────────
  function handleSimpan() {
    const required = [
      ['namaSekolah',   'Nama Sekolah'],
      ['namaKepsek',    'Nama Kepala Sekolah'],
      ['nipKepsek',     'NIP Kepala Sekolah'],
      ['alamatSekolah', 'Alamat Sekolah'],
      ['kotaSekolah',   'Kota / Kode Pos'],
      ['namaBendahara', 'Nama Bendahara'],
      ['nipBendahara',  'NIP Bendahara'],
    ]
    for (const [key, label] of required) {
      if (!form[key]?.toString().trim()) {
        setError(`Field "${label}" wajib diisi.`)
        return
      }
    }
    setError('')
    saveDataSekolah(form)
    if (onSaved) onSaved()
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal title="Setup Data Sekolah" onClose={onClose} wide>
      <div className={styles.wrap}>
        <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
          Data ini akan disimpan dan digunakan untuk semua Surat Tugas ke depannya.
        </div>

        <Section title="Identitas Sekolah">
          <Field label="Nama Sekolah" required>
            <input value={form.namaSekolah} onChange={e => set('namaSekolah', e.target.value)}
              placeholder="SD NEGERI 2 KALIWULU" />
          </Field>
          <div className={styles.row2}>
            <Field label="Korwil">
              <input value={form.korwil} onChange={e => set('korwil', e.target.value)}
                placeholder="KORWIL BIDIKCAM PLERED" />
            </Field>
            <Field label="Nama Desa/Kota Sekolah" hint="Untuk &quot;Dikeluarkan di…&quot;">
              <input value={form.desaSekolah} onChange={e => set('desaSekolah', e.target.value)}
                placeholder="Kaliwulu" />
            </Field>
          </div>
          <Field label="Alamat Sekolah" required>
            <input value={form.alamatSekolah} onChange={e => set('alamatSekolah', e.target.value)}
              placeholder="Jl. Kinatagama Desa Kaliwulu Kec.Plered Telp. 321048" />
          </Field>
          <Field label="Kota / Kode Pos" required>
            <input value={form.kotaSekolah} onChange={e => set('kotaSekolah', e.target.value)}
              placeholder="Cirebon 45158" />
          </Field>
        </Section>

        <Section title="Kepala Sekolah">
          <div className={styles.row2}>
            <Field label="Nama Kepsek" required>
              <input value={form.namaKepsek} onChange={e => set('namaKepsek', e.target.value)}
                placeholder="YANA MULYANA, S.Pd.I" />
            </Field>
            <Field label="NIP Kepsek" required>
              <input value={form.nipKepsek} onChange={e => set('nipKepsek', e.target.value)}
                placeholder="198702192019031006" />
            </Field>
          </div>
        </Section>

        <Section title="Bendahara">
          <div className={styles.row2}>
            <Field label="Nama Bendahara" required>
              <input value={form.namaBendahara} onChange={e => set('namaBendahara', e.target.value)}
                placeholder="KUSNAENI, S.Pd" />
            </Field>
            <Field label="NIP Bendahara" required>
              <input value={form.nipBendahara} onChange={e => set('nipBendahara', e.target.value)}
                placeholder="198012222003122007" />
            </Field>
          </div>
        </Section>

        <Section title="Logo Kop Surat (opsional)">
          <div className={styles.row2}>
            <Field label="Logo Kiri" hint="PNG/JPG, maks 500KB">
              <input type="file" accept="image/*" onChange={handleLogoKiri} />
              {previewKiri && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={previewKiri} alt="Logo Kiri" style={{ maxWidth: '100px', maxHeight: '100px', border: '1px solid #ddd' }} />
                </div>
              )}
            </Field>
            <Field label="Logo Kanan" hint="PNG/JPG, maks 500KB">
              <input type="file" accept="image/*" onChange={handleLogoKanan} />
              {previewKanan && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img src={previewKanan} alt="Logo Kanan" style={{ maxWidth: '100px', maxHeight: '100px', border: '1px solid #ddd' }} />
                </div>
              )}
            </Field>
          </div>
        </Section>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Batal</button>
          <button className={styles.btnGenerate} onClick={handleSimpan}>
            💾 Simpan Data Sekolah
          </button>
        </div>
      </div>
    </Modal>
  )
}
