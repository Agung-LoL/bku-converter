import { storageGet } from '../useStorage'
import { useState, useMemo } from 'react'
import styles from './Dashboard.module.css'

const RIWAYAT_KEY = 'bku_riwayat_v1'
const KODE_KEY    = 'bku_kode_kegiatan_v1'

const BULAN_ORDER  = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']
const BULAN_SHORT  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function getRiwayat()  { try { return storageGet(RIWAYAT_KEY) || [] } catch { return [] } }
function getKodeList() { try { return storageGet(KODE_KEY) || [] } catch { return [] } }

function fmtRp(v) { return (parseFloat(v) || 0).toLocaleString('en-US') }
function fmtRpShort(v) {
  const n = parseFloat(v) || 0
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1).replace('.0','')} M`
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1).replace('.0','')} Jt`
  if (n >= 1_000)         return `${(n/1_000).toFixed(0)} Rb`
  return String(n)
}

function lookupUraian(kode, kodeList) {
  if (!kode) return kode
  const k = kode.trim().toLowerCase()
  const f = kodeList.find(m => m.kode && m.kode.trim().toLowerCase() === k)
  return f ? f.uraian : kode
}

// Mini bar chart SVG
function BarChart({ data, maxVal, color = 'var(--accent)' }) {
  const W = 100, H = 48, pad = 2
  const barW = (W - pad * (data.length - 1)) / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const h = maxVal > 0 ? (d.val / maxVal) * (H - 4) : 0
        const x = i * (barW + pad)
        const y = H - h
        const isActive = d.active
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h}
              rx={2}
              fill={isActive ? color : 'var(--border-strong)'}
              opacity={isActive ? 1 : 0.5}
            />
          </g>
        )
      })}
    </svg>
  )
}

// Sparkline SVG
function Sparkline({ values, color = 'var(--accent)' }) {
  if (!values || values.length < 2) return null
  const W = 120, H = 36
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - (v / max) * (H - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={(values.length - 1) / (values.length - 1) * W}
        cy={H - (values[values.length - 1] / max) * (H - 4) - 2}
        r="3" fill={color}
      />
    </svg>
  )
}

// Progress ring
function Ring({ pct, size = 72, stroke = 6, color = 'var(--accent)' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct / 100, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-strong)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  )
}

export default function Dashboard() {
  const riwayat  = useMemo(() => getRiwayat(), [])
  const kodeList = useMemo(() => getKodeList(), [])

  // Tahun yang tersedia
  const tahunList = useMemo(() => {
    const s = new Set(riwayat.map(r => r.meta.tahun))
    return Array.from(s).sort((a, b) => parseInt(b) - parseInt(a))
  }, [riwayat])

  const [tahun, setTahun] = useState(() => tahunList[0] || String(new Date().getFullYear()))

  // Filter data tahun terpilih
  const dataYear = useMemo(() => riwayat.filter(r => r.meta.tahun === tahun), [riwayat, tahun])

  // ── Per bulan ──────────────────────────────────────────────────────────────
  const perBulan = useMemo(() => {
    const map = {}
    BULAN_ORDER.forEach(b => { map[b] = 0 })
    dataYear.forEach(e => { map[e.meta.bulan] = (map[e.meta.bulan] || 0) + e.total })
    return BULAN_ORDER.map((b, i) => ({ bulan: b, short: BULAN_SHORT[i], val: map[b] || 0 }))
  }, [dataYear])

  const bulanAktif   = perBulan.filter(b => b.val > 0).length
  const totalTahun   = perBulan.reduce((s, b) => s + b.val, 0)
  const maxBulan     = Math.max(...perBulan.map(b => b.val), 1)
  const avgBulan     = bulanAktif > 0 ? totalTahun / bulanAktif : 0
  const bulanTertinggi = perBulan.reduce((a, b) => b.val > a.val ? b : a, perBulan[0])
  const progressPct  = Math.round((bulanAktif / 12) * 100)

  // Triwulan
  const triwulan = useMemo(() => {
    const tw = { '1': 0, '2': 0, '3': 0, '4': 0 }
    dataYear.forEach(e => { tw[e.meta.triwulan] = (tw[e.meta.triwulan] || 0) + e.total })
    return tw
  }, [dataYear])

  // ── Per kode kegiatan ──────────────────────────────────────────────────────
  const perKegiatan = useMemo(() => {
    const map = {}
    dataYear.forEach(entry => {
      entry.rows.forEach(row => {
        const kode  = row.kodeKegiatan || '(Tidak ada kode)'
        const label = lookupUraian(kode, kodeList)
        map[label] = (map[label] || 0) + (parseFloat(row.pengeluaran) || 0)
      })
    })
    return Object.entries(map)
      .map(([label, val]) => ({ label, val }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 7)
  }, [dataYear, kodeList])

  const maxKegiatan = Math.max(...perKegiatan.map(k => k.val), 1)

  // ── Transaksi terbanyak (uraian) ───────────────────────────────────────────
  const perUraian = useMemo(() => {
    const map = {}
    dataYear.forEach(entry => {
      entry.rows.forEach(row => {
        const u = row.uraian || '(kosong)'
        if (!map[u]) map[u] = { total: 0, count: 0 }
        map[u].total += parseFloat(row.pengeluaran) || 0
        map[u].count++
      })
    })
    return Object.entries(map)
      .map(([uraian, v]) => ({ uraian, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [dataYear])

  // Sparkline values (Jan–Des)
  const sparkValues = perBulan.map(b => b.val)

  if (!riwayat.length) return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>📊</div>
      <p>Belum ada data riwayat BKU.</p>
      <p className={styles.emptyHint}>Konversi dan simpan BKU terlebih dahulu untuk melihat dashboard.</p>
    </div>
  )

  return (
    <div className={styles.dash}>

      {/* ── Tahun selector ── */}
      <div className={styles.topBar}>
        <div className={styles.tahunWrap}>
          {tahunList.map(t => (
            <button
              key={t}
              className={`${styles.tahunBtn} ${t === tahun ? styles.tahunActive : ''}`}
              onClick={() => setTahun(t)}
            >{t}</button>
          ))}
        </div>
        <div className={styles.topMeta}>Data {dataYear.length} BKU tersimpan pada tahun {tahun}</div>
      </div>

      {/* ── KPI cards ── */}
      <div className={styles.kpiRow}>

        {/* Total pengeluaran */}
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Total Pengeluaran {tahun}</div>
          <div className={styles.kpiVal}>Rp {fmtRp(totalTahun)}</div>
          <div className={styles.kpiSub}>{bulanAktif} dari 12 bulan tercatat</div>
          <div className={styles.kpiSpark}>
            <Sparkline values={sparkValues} color="var(--accent)" />
          </div>
        </div>

        {/* Progress tahun */}
        <div className={`${styles.kpi} ${styles.kpiCenter}`}>
          <div className={styles.kpiLabel}>Progress Tahun</div>
          <div className={styles.ringWrap}>
            <Ring pct={progressPct} size={80} stroke={7} color="var(--accent)" />
            <div className={styles.ringLabel}>{progressPct}%</div>
          </div>
          <div className={styles.kpiSub}>{bulanAktif} bulan selesai</div>
        </div>

        {/* Rata-rata per bulan */}
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Rata-rata / Bulan</div>
          <div className={styles.kpiVal}>Rp {fmtRp(avgBulan)}</div>
          <div className={styles.kpiSub}>
            Tertinggi: <strong>{bulanTertinggi.short}</strong> — Rp {fmtRpShort(bulanTertinggi.val)}
          </div>
        </div>

        {/* Triwulan */}
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Per Triwulan</div>
          <div className={styles.twGrid}>
            {['1','2','3','4'].map(tw => (
              <div key={tw} className={styles.twItem}>
                <div className={styles.twNum}>Rp {fmtRpShort(triwulan[tw] || 0)}</div>
                <div className={styles.twLbl}>TW {tw}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bar chart bulan ── */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Pengeluaran per Bulan</div>
          <div className={styles.cardSub}>Tahun {tahun}</div>
        </div>
        <div className={styles.barWrap}>
          {perBulan.map((b, i) => (
            <div key={i} className={styles.barCol}>
              <div className={styles.barValLabel}>
                {b.val > 0 ? fmtRpShort(b.val) : ''}
              </div>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${b.val > 0 ? styles.barActive : ''}`}
                  style={{ height: `${maxBulan > 0 ? (b.val / maxBulan) * 100 : 0}%` }}
                />
              </div>
              <div className={`${styles.barLabel} ${b.val > 0 ? styles.barLabelActive : ''}`}>
                {b.short}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom row: kegiatan + top uraian ── */}
      <div className={styles.bottomRow}>
        {/* Per kode kegiatan */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>Pengeluaran per Kegiatan</div>
            <div className={styles.cardSub}>Top {perKegiatan.length} kode kegiatan</div>
          </div>
          {perKegiatan.length === 0
            ? <div className={styles.noData}>Tidak ada data kode kegiatan</div>
            : (
              <div className={styles.kegiatanList}>
                {perKegiatan.map((k, i) => (
                  <div key={i} className={styles.kegiatanRow}>
                    <div className={styles.kegiatanMeta}>
                      <span className={styles.kegiatanRank}>#{i+1}</span>
                      <span className={styles.kegiatanLabel}>{k.label}</span>
                      <span className={styles.kegiatanAmt}>Rp {fmtRp(k.val)}</span>
                    </div>
                    <div className={styles.kegiatanBar}>
                      <div
                        className={styles.kegiatanFill}
                        style={{ width: `${(k.val / maxKegiatan) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Top uraian belanja */}
        <div className={styles.card} >
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>Belanja Terbanyak</div>
            <div className={styles.cardSub}>Berdasarkan total nilai</div>
          </div>
          {perUraian.length === 0
            ? <div className={styles.noData}>Tidak ada data</div>
            : (
              <div className={styles.uraianList}>
                {perUraian.map((u, i) => (
                  <div key={i} className={styles.uraianRow}>
                    <div className={styles.uraianIdx}>{i + 1}</div>
                    <div className={styles.uraianMid}>
                      <div className={styles.uraianName}>{u.uraian}</div>
                      <div className={styles.uraianCount}>{u.count}× transaksi</div>
                    </div>
                    <div className={styles.uraianAmt}>Rp {fmtRpShort(u.total)}</div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

      </div>
    </div>
  )
}
