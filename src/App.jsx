import { useState, useEffect } from 'react'
import MasterHarga from './components/MasterHarga'
import MasterPenerima from './components/MasterPenerima'
import MasterKodeKegiatan from './components/MasterKodeKegiatan'
import MasterKodeRekening from './components/MasterKodeRekening'
import RiwayatBKU from './components/RiwayatBKU'
import Lpj from './components/Lpj'
import Dashboard from './components/Dashboard'
import AdminPage from './components/AdminPage'
import LoginPage from './components/LoginPage'
import { getSession, clearSession, initAuth } from './auth'
import { setCurrentUser } from './useStorage'
import styles from './App.module.css'

initAuth()

// SVG icons — simpel, konsisten 16×16
const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard:   <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    convert:     <><path d="M5 12H19M19 12L15 8M19 12L15 16"/><path d="M19 6H5M5 6L9 2M5 6L9 10"/></>,
    history:     <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></>,
    harga:       <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
    kode:        <><path d="M9 9H4a1 1 0 00-1 1v9a1 1 0 001 1h16a1 1 0 001-1v-9a1 1 0 00-1-1h-5"/><path d="M9 9V5a3 3 0 016 0v4"/></>,
    rekening:    <><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></>,
    lpj:         <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></>,
    admin:       <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    logout:      <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    chevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
    chevronRight:<><polyline points="9 18 15 12 9 6"/></>,
    menu:        <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

const TABS_USER = [
  { id: 'dashboard',    label: 'Dashboard',           icon: 'dashboard' },
  { id: 'riwayat',      label: 'Riwayat BKU',          icon: 'history'   },
  { id: 'lpj',          label: 'LPJ',                  icon: 'lpj'       },
  { id: 'master-harga', label: 'Master Harga',         icon: 'harga'     },
  { id: 'master-penerima', label: 'Master Penerima',     icon: 'admin'     },
  { id: 'master-kode',  label: 'Kode Kegiatan',        icon: 'kode'      },
  { id: 'master-rekening', label: 'Kode Rekening',     icon: 'rekening'  },
]
const TABS_ADMIN = [
  ...TABS_USER,
  { id: 'admin', label: 'Kelola User', icon: 'admin' },
]

const PAGE_INFO = {
  dashboard:      { title: 'Dashboard',             desc: 'Ringkasan pengeluaran berdasarkan riwayat BKU.' },
  'master-harga': { title: 'Master Harga Barang',   desc: 'Daftarkan nama barang, harga satuan, dan satuan.' },
  'master-penerima': { title: 'Master Penerima',   desc: 'Daftarkan nama, NIP, jabatan, dan golongan penerima untuk LPJ.' },
  'master-kode':  { title: 'Master Kode Kegiatan',  desc: 'Daftarkan kode kegiatan dan uraiannya.' },
  'master-rekening': { title: 'Master Kode Rekening', desc: 'Daftarkan kode rekening dan uraiannya, dipakai sebagai label di dropdown LPJ.' },
  riwayat:        { title: 'Riwayat BKU',            desc: 'Konversi file, tambah transaksi manual, dan lihat riwayat BKU tersimpan.' },
  lpj:            { title: 'LPJ',                     desc: 'Pilih bulan, lalu pilih kode rekening dan transaksi untuk menyusun dokumen LPJ (Surat Tugas, dll).' },
  admin:          { title: 'Kelola User',            desc: 'Tambah, edit, atau hapus akun pengguna.' },
}

export { Icon }

export default function App() {
  const [user,      setUser]      = useState(() => getSession())
  const [tab,       setTab]       = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [dark,      setDark]      = useState(() => {
    const s = localStorage.getItem('bku_theme')
    return s ? s === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('bku_theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => { setCurrentUser(user) }, [user])

  function handleLogin(u) { setCurrentUser(u); setUser(u); setTab('dashboard') }
  function handleLogout() { clearSession(); setCurrentUser(null); setUser(null) }

  if (!user) return (
    <div data-theme={dark ? 'dark' : 'light'} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <LoginPage onLogin={handleLogin} />
    </div>
  )

  const TABS = user.role === 'admin' ? TABS_ADMIN : TABS_USER
  const info = PAGE_INFO[tab] || PAGE_INFO['dashboard']

  return (
    <div className={styles.layout}>

      {/* Topbar */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} title="Toggle sidebar">
              <Icon name="menu" size={18} />
            </button>
            <div className={styles.brand}>
              <div className={styles.brandDot} />
              <span className={styles.brandName}>BKU</span>
            </div>
            <div className={styles.breadcrumb}>
              <span className={styles.breadSep}>/</span>
              <span className={styles.breadCurrent}>{info.title}</span>
            </div>
          </div>
          <div className={styles.topRight}>
            <div className={styles.userChip}>
              <div className={styles.userAvatar}>{user.nama.charAt(0).toUpperCase()}</div>
              <span className={styles.userName}>{user.nama}</span>
            </div>
            <button className={styles.iconBtn} onClick={() => setDark(d => !d)} title={dark ? 'Mode terang' : 'Mode gelap'}>
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>
            <button className={styles.iconBtn} onClick={handleLogout} title="Keluar">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className={styles.body}>

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
          <nav className={styles.nav}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.navActive : ''}`}
                onClick={() => setTab(t.id)}
                title={collapsed ? t.label : ''}
              >
                <span className={styles.navIcon}><Icon name={t.icon} size={17} /></span>
                {!collapsed && <span className={styles.navLabel}>{t.label}</span>}
                {!collapsed && tab === t.id && <span className={styles.navPip} />}
              </button>
            ))}
          </nav>

          <div className={styles.sidebarBottom}>
            {!collapsed && (
              <div className={styles.sidebarUserCard}>
                <div className={styles.sidebarAvatar}>{user.nama.charAt(0).toUpperCase()}</div>
                <div>
                  <div className={styles.sidebarUserName}>{user.nama}</div>
                  <div className={styles.sidebarUserSub}>{user.sekolah}</div>
                </div>
              </div>
            )}
            <button
              className={styles.collapseToggle}
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            >
              <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
            </button>
          </div>
        </aside>

        {/* Konten */}
        <main className={styles.main}>
          {tab === 'dashboard'    && <Dashboard />}
          {tab === 'master-harga' && <MasterHarga />}
          {tab === 'master-penerima' && <MasterPenerima />}
          {tab === 'master-kode'  && <MasterKodeKegiatan />}
          {tab === 'master-rekening' && <MasterKodeRekening />}
          {tab === 'riwayat'      && <RiwayatBKU />}
          {tab === 'lpj'          && <Lpj />}
          {tab === 'admin'        && user.role === 'admin' && <AdminPage />}
        </main>
      </div>
    </div>
  )
}
