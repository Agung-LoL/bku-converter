import { useState } from 'react'
import { getUsers, saveUsers, getSekolahList } from '../auth'
import styles from './AdminPage.module.css'

function genSekolahId(nama) {
  return nama.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30)
}

export default function AdminPage() {
  const [users,   setUsers]   = useState(() => getUsers().filter(u => u.username !== 'admin'))
  const [form,    setForm]    = useState({ username: '', password: '', nama: '', sekolah: '', sekolahId: '', shareDb: false, role: 'user' })
  const [editing, setEditing] = useState(null) // username yg sedang diedit
  const [toast,   setToast]   = useState(null)
  const [confirm, setConfirm] = useState(null)

  const sekolahList = getSekolahList()

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function refresh() {
    setUsers(getUsers().filter(u => u.username !== 'admin'))
  }

  function handleSekolahChange(nama) {
    const id = genSekolahId(nama)
    setForm(f => ({ ...f, sekolah: nama, sekolahId: id }))
  }

  function handleSekolahPick(id) {
    const found = sekolahList.find(s => s.id === id)
    if (found) setForm(f => ({ ...f, sekolah: found.nama, sekolahId: found.id, shareDb: true }))
  }

  function resetForm() {
    setForm({ username: '', password: '', nama: '', sekolah: '', sekolahId: '', shareDb: false, role: 'user' })
    setEditing(null)
  }

  function startEdit(user) {
    setEditing(user.username)
    setForm({ username: user.username, password: user.password, nama: user.nama, sekolah: user.sekolah, sekolahId: user.sekolahId, shareDb: !!user.shareDb, role: user.role || 'user' })
  }

  function save() {
    const { username, password, nama, sekolah, sekolahId } = form
    if (!username.trim()) { showToast('Username wajib diisi.', 'err'); return }
    if (!password.trim()) { showToast('Password wajib diisi.', 'err'); return }
    if (!nama.trim())     { showToast('Nama wajib diisi.', 'err'); return }
    if (!sekolah.trim())  { showToast('Nama sekolah wajib diisi.', 'err'); return }

    const all = getUsers()

    if (editing) {
      const idx = all.findIndex(u => u.username === editing)
      if (idx >= 0) all[idx] = { ...all[idx], ...form, sekolahId: sekolahId || genSekolahId(sekolah) }
      showToast(`User "${username}" berhasil diperbarui.`)
    } else {
      if (all.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        showToast('Username sudah digunakan.', 'err'); return
      }
      all.push({ ...form, sekolahId: sekolahId || genSekolahId(sekolah), createdAt: new Date().toISOString() })
      showToast(`User "${username}" berhasil ditambahkan.`)
    }
    saveUsers(all)
    resetForm()
    refresh()
  }

  function hapus(username) {
    setConfirm(username)
  }

  function confirmHapus() {
    const all = getUsers().filter(u => u.username !== confirm)
    saveUsers(all)
    refresh()
    showToast(`User "${confirm}" dihapus.`)
    setConfirm(null)
  }

  return (
    <div className={styles.wrap}>
      {toast   && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.msg}</div>}
      {confirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>Hapus user?</div>
            <p className={styles.confirmDesc}>User <strong>{confirm}</strong> dan sesi aktifnya akan dihapus. Data BKU yang tersimpan dengan namespace-nya tetap ada.</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnGhost} onClick={() => setConfirm(null)}>Batal</button>
              <button className={styles.btnDanger} onClick={confirmHapus}>Ya, hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form tambah / edit ── */}
      <div className={styles.formCard}>
        <div className={styles.formTitle}>{editing ? `Edit user: ${editing}` : 'Tambah User Baru'}</div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Username</label>
            <input value={form.username} disabled={!!editing}
              placeholder="budi_sdn1" onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input value={form.password} type="text"
              placeholder="••••••••" onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Nama Lengkap</label>
            <input value={form.nama}
              placeholder="Budi Santoso" onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Sekolah */}
          <div className={styles.fieldFull}>
            <label>Sekolah</label>
            <div className={styles.sekolahRow}>
              <input
                value={form.sekolah}
                placeholder="Nama sekolah baru..."
                onChange={e => handleSekolahChange(e.target.value)}
                style={{ flex: 1 }}
              />
              {sekolahList.length > 0 && (
                <select onChange={e => e.target.value && handleSekolahPick(e.target.value)} defaultValue="">
                  <option value="">— atau pilih sekolah yang ada —</option>
                  {sekolahList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              )}
            </div>
            <div className={styles.sekolahMeta}>
              ID: <code>{form.sekolahId || '—'}</code>
              <label className={styles.shareLabel}>
                <input type="checkbox" checked={form.shareDb} onChange={e => setForm(f => ({ ...f, shareDb: e.target.checked }))} />
                Gunakan database bersama sekolah ini
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          {editing && <button className={styles.btnGhost} onClick={resetForm}>Batal</button>}
          <button className={styles.btnPrimary} onClick={save}>
            {editing ? 'Simpan Perubahan' : '+ Tambah User'}
          </button>
        </div>
      </div>

      {/* ── Tabel user ── */}
      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Daftar User <span className={styles.badge}>{users.length}</span></div>
        {users.length === 0
          ? <div className={styles.empty}>Belum ada user. Tambahkan user di atas.</div>
          : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th><th>Nama</th><th>Sekolah</th>
                    <th>Database</th><th>Role</th><th>Dibuat</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.username}>
                      <td><code className={styles.code}>{u.username}</code></td>
                      <td>{u.nama}</td>
                      <td>{u.sekolah}</td>
                      <td>
                        <span className={u.shareDb ? styles.badgeShared : styles.badgePrivate}>
                          {u.shareDb ? `Shared (${u.sekolahId})` : 'Pribadi'}
                        </span>
                      </td>
                      <td>
                        <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className={styles.dateCell}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.btnEdit} onClick={() => startEdit(u)}>Edit</button>
                          <button className={styles.btnDel}  onClick={() => hapus(u.username)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
