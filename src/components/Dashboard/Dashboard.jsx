import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import RevenueChart from './RevenueChart'

const ID_MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agt','sep','okt','nov','des']
function parseDate(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str)
  const parts = str.trim().split(/\s+/)
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const mon = ID_MONTHS.indexOf(parts[1].toLowerCase())
    const year = parseInt(parts[2], 10)
    if (mon !== -1 && !isNaN(day) && !isNaN(year)) return new Date(year, mon, day)
  }
  return new Date(str)
}
function fmtDate(str) {
  const d = parseDate(str)
  if (!d || isNaN(d)) return str || '-'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCatIcon(cat) {
  const m = { Tenda:'fas fa-campground', Carrier:'fas fa-shopping-bag', 'Sleeping Bag':'fas fa-bed', Sepatu:'fas fa-shoe-prints', Kompor:'fas fa-fire', Matras:'fas fa-layer-group', Aksesoris:'fas fa-tools' }
  return m[cat] || 'fas fa-box'
}

function stringToColor(str) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  const c = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899']
  return c[Math.abs(h) % c.length]
}

const CHART_PERIODS = [
  { key:'7d', label:'7 Hari' },
  { key:'30d', label:'30 Hari' },
  { key:'3m', label:'3 Bulan' },
  { key:'6m', label:'6 Bulan' },
  { key:'1y', label:'1 Tahun' },
]

const CAT_COLORS = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#94a3b8']

const DAY_LBL = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const MONTH_LBL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

const txRevenue = t => (t.subtotal || 0) + (t.penalty || 0)
const txDate = t => new Date(t.created_at || t.pickup || Date.now())
const startOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x }

// Build real revenue buckets from transactions for the given period
function getRevenueData(transactions, period) {
  const now = new Date()
  const buckets = []

  const addDayRange = (days, labelEvery) => {
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(new Date(now.getTime() - i * 86400000))
      const show = days <= 7 || (days - i) % labelEvery === 0
      buckets.push({
        start: day.getTime(),
        end: day.getTime() + 86400000,
        label: show ? (days <= 7 ? DAY_LBL[day.getDay()] : `${day.getDate()}/${day.getMonth() + 1}`) : '',
        val: 0,
      })
    }
  }

  if (period === '7d') addDayRange(7, 1)
  else if (period === '30d') addDayRange(30, 5)
  else if (period === '3m') {
    // weekly buckets, ~13 weeks
    for (let i = 12; i >= 0; i--) {
      const start = startOfDay(new Date(now.getTime() - i * 7 * 86400000))
      buckets.push({
        start: start.getTime(),
        end: start.getTime() + 7 * 86400000,
        label: i % 2 === 0 ? `${start.getDate()}/${start.getMonth() + 1}` : '',
        val: 0,
      })
    }
  } else { // 6m or 1y -> monthly buckets
    const months = period === '6m' ? 6 : 12
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      buckets.push({
        start: d.getTime(),
        end: next.getTime(),
        label: MONTH_LBL[d.getMonth()],
        val: 0,
      })
    }
  }

  // fill buckets with real revenue
  for (const t of transactions) {
    const ts = txDate(t).getTime()
    const b = buckets.find(bk => ts >= bk.start && ts < bk.end)
    if (b) b.val += txRevenue(t)
  }
  return buckets.map(({ label, val }) => ({ label, val }))
}

function getCategoryStats(transactions, items) {
  const countMap = {}
  for (const t of transactions) {
    if (!t.items) continue
    // Try to match items_summary text to item categories
    const names = t.items.split(',').map(s => s.trim())
    for (const name of names) {
      const found = items.find(i => i.name && name.toLowerCase().includes(i.name.toLowerCase()))
      const cat = found?.category || 'Lainnya'
      countMap[cat] = (countMap[cat] || 0) + 1
    }
  }
  const total = Object.values(countMap).reduce((s, v) => s + v, 0)
  if (total === 0) return []
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], i) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
      color: CAT_COLORS[i] || '#94a3b8',
    }))
}

export default function Dashboard({ setActiveTab }) {
  const { items, transactions, customers, todayRevenue, lowStockItems, dueTodayTx, activeTx, getAvailableStock, showToast } = useApp()
  const [chartPeriod, setChartPeriod] = useState('7d')

  const categoryStats = useMemo(() => getCategoryStats(transactions, items), [transactions, items])
  const chartData = useMemo(() => getRevenueData(transactions, chartPeriod), [transactions, chartPeriod])
  const chartTotal = useMemo(() => chartData.reduce((s, v) => s + v.val, 0), [chartData])
  const chartAvg = chartData.length ? chartTotal / chartData.length : 0
  const chartPeak = useMemo(() => chartData.reduce((m, v) => v.val > m ? v.val : m, 0), [chartData])
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0
    const half = Math.floor(chartData.length / 2)
    const prev = chartData.slice(0, half).reduce((s, v) => s + v.val, 0)
    const curr = chartData.slice(half).reduce((s, v) => s + v.val, 0)
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }, [chartData])

  function sendWhatsApp(t) {
    const msg = `Halo *${t.name}* 👋\n\nPengingat dari *TrekingHouse SuperSys*:\n\n📦 Item: ${t.items}\n📅 Jatuh Tempo: ${fmtDate(t.return)}\n💰 Total: Rp ${t.subtotal.toLocaleString()}\n\nMohon kembalikan barang tepat waktu ya 🙏`
    const url = `https://wa.me/${t.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    showToast('Membuka WhatsApp...', 'info')
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="stat-card bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0"><i className="fas fa-wallet text-sm"></i></div>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">+12%</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-tight">Pendapatan Hari Ini</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1 leading-tight">Rp {todayRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0"><i className="fas fa-box-open text-sm"></i></div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">Aktif</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-tight">Sedang Disewa</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1">{activeTx.length} Aktif</p>
        </div>
        <div className="stat-card bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0"><i className="fas fa-exclamation-triangle text-sm"></i></div>
            <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg">Low</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-tight">Stok Menipis</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1">{lowStockItems.length} SKU</p>
        </div>
        <div className="stat-card bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="w-9 h-9 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center flex-shrink-0"><i className="fas fa-clock text-sm"></i></div>
            <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg">Due</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold leading-tight">Jatuh Tempo</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-800 mt-1">{dueTodayTx.length} Transaksi</p>
        </div>
      </div>

      {/* Chart + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800">Grafik Pendapatan</h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg ${trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                  <i className={`fas fa-arrow-${trend >= 0 ? 'up' : 'down'}`}></i>{Math.abs(trend)}%
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-800 mt-1 leading-none">Rp {chartTotal.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
              {CHART_PERIODS.map(p => (
                <button key={p.key} onClick={() => setChartPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${chartPeriod === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <RevenueChart data={chartData} />

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Rata-rata</p>
              <p className="text-sm font-extrabold text-slate-700 mt-0.5">Rp {Math.round(chartAvg).toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Tertinggi</p>
              <p className="text-sm font-extrabold text-emerald-600 mt-0.5">Rp {chartPeak.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Transaksi</p>
              <p className="text-sm font-extrabold text-slate-700 mt-0.5">{transactions.length}x</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-slate-800 mb-4">Kategori Terlaris</h3>
          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <i className="fas fa-chart-bar text-2xl mb-2 block text-slate-200"></i>
                <p className="text-xs">Data akan muncul setelah ada transaksi</p>
              </div>
            ) : categoryStats.map(cat => (
              <div key={cat.name}>
                <div className="flex justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700">{cat.name}</span>
                    <span className="text-[10px] text-slate-400">{cat.count}x</span>
                  </div>
                  <span className="text-slate-400 font-semibold">{cat.pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${cat.pct}%`, background: cat.color }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Inventaris</span><span className="font-bold">{items.length} item</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Total Customer</span><span className="font-bold">{customers.length} orang</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Transaksi Aktif</span><span className="font-bold text-blue-600">{activeTx.length}x</span></div>
          </div>
        </div>
      </div>

      {/* Due Today + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm"><i className="fas fa-calendar-check text-rose-500 mr-2"></i>Jatuh Tempo</h3>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-full font-extrabold">{dueTodayTx.length} transaksi</span>
          </div>
          <div className="divide-y divide-slate-100">
            {dueTodayTx.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm"><i className="fas fa-check-circle text-2xl text-emerald-400 mb-2 block"></i>Tidak ada jatuh tempo</div>
            ) : dueTodayTx.slice(0, 4).map(t => (
              <div key={t.id} className="p-3 flex items-center justify-between trow">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0"
                    style={{ background: stringToColor(t.name) }}>
                    <span className="text-white">{t.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 truncate">{t.items}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-extrabold text-rose-600">{fmtDate(t.return)}</p>
                  <button onClick={() => sendWhatsApp(t)} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                    <i className="fab fa-whatsapp"></i> Ingatkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm"><i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i>Stok Menipis</h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-extrabold">{lowStockItems.length} SKU</span>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm"><i className="fas fa-boxes text-2xl text-emerald-400 mb-2 block"></i>Stok semua aman</div>
            ) : lowStockItems.slice(0, 4).map(item => (
              <div key={item.id} className="p-3 flex items-center justify-between trow">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 text-xs">
                    <i className={getCatIcon(item.category)}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 leading-tight">{item.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.sku}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-sm font-extrabold leading-tight ${getAvailableStock(item) === 0 ? 'text-rose-600' : 'text-amber-600'}`}>Tersisa {getAvailableStock(item)}</p>
                  <p className="text-xs text-slate-400">dari {item.total_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
