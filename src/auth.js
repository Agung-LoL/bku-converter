// ── Auth & namespace system ──────────────────────────────────────────────────
// Semua data disimpan di localStorage dengan prefix namespace
// Namespace = username (data pribadi) atau sekolah_id (data shared sekolah)

export const AUTH_KEY     = 'bku_auth_users_v1'
export const SESSION_KEY  = 'bku_session_v1'
export const ADMIN_USER   = 'admin'

// ── User management ──────────────────────────────────────────────────────────
export function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '[]') } catch { return [] }
}

export function saveUsers(users) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users))
}

// Inisialisasi admin default jika belum ada user
export function initAuth() {
  const users = getUsers()
  if (!users.find(u => u.username === ADMIN_USER)) {
    users.push({
      username: ADMIN_USER,
      password: 'admin123',
      nama: 'Administrator',
      sekolah: 'Admin',
      sekolahId: '__admin__',
      shareDb: false, // admin tidak share db
      role: 'admin',
      createdAt: new Date().toISOString(),
    })
    saveUsers(users)
  }
}

// ── Session ───────────────────────────────────────────────────────────────────
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ── Login ─────────────────────────────────────────────────────────────────────
export function login(username, password) {
  const users = getUsers()
  const user  = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase().trim() &&
    u.password === password
  )
  if (!user) return { ok: false, error: 'Username atau password salah.' }
  setSession(user)
  return { ok: true, user }
}

// ── Namespace: kunci prefix untuk localStorage ─────────────────────────────────
// Jika shareDb=true → pakai sekolahId (shared antar user sekolah sama)
// Jika shareDb=false atau admin → pakai username (data pribadi)
export function getNamespace(user) {
  if (!user) return 'guest'
  if (user.shareDb && user.sekolahId) return `school_${user.sekolahId}`
  return `user_${user.username}`
}

// Helper: buat key dengan namespace
export function nsKey(user, key) {
  return `${getNamespace(user)}__${key}`
}

// ── Sekolah yang sudah terdaftar (untuk dropdown) ─────────────────────────────
export function getSekolahList() {
  const users = getUsers()
  const map = new Map()
  users
    .filter(u => u.sekolahId && u.sekolahId !== '__admin__')
    .forEach(u => map.set(u.sekolahId, u.sekolah))
  return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }))
}
