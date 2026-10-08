import { useState } from 'react'
import { login, initAuth } from '../auth'
import styles from './LoginPage.module.css'

initAuth()

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Isi username dan password.'); return }
    setLoading(true)
    setError('')
    setTimeout(() => {
      const result = login(username, password)
      setLoading(false)
      if (result.ok) onLogin(result.user)
      else setError(result.error)
    }, 300)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>📒</span>
          <div>
            <div className={styles.brandName}>Konverter BKU</div>
            <div className={styles.brandSub}>Buku Kas Umum — Sekolah</div>
          </div>
        </div>

        <div className={styles.divider} />

        <h1 className={styles.title}>Masuk</h1>
        <p className={styles.desc}>Masukkan kredensial Anda untuk mengakses aplikasi.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              type="text"
              placeholder="contoh: budi_sdn1"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passWrap}>
              <input
                className={styles.input}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowPass(s => !s)}
                tabIndex={-1}
              >{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk →'}
          </button>
        </form>

        <p className={styles.hint}>
          Belum punya akun? Hubungi administrator untuk pendaftaran.
        </p>
      </div>
    </div>
  )
}
