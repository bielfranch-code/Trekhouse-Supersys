import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const TAB_META = {
  dashboard: { title: 'Dashboard Ringkasan', subtitle: 'Pantau performa rental real-time' },
  master: { title: 'Master Data Inventaris', subtitle: 'Kelola barang & stok' },
  transaksi: { title: 'Log Transaksi Sewa', subtitle: 'Semua aktivitas peminjaman' },
  customers: { title: 'Database Customer', subtitle: 'Data penyewa & loyalty program' },
}

export default function Header({ activeTab, setSidebarOpen }) {
  const { notifications, unreadCount, markAllRead } = useApp()
  const [showNotif, setShowNotif] = useState(false)
  const { title, subtitle } = TAB_META[activeTab] || {}

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl flex-shrink-0">
          <i className="fas fa-bars"></i>
        </button>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800 truncate">{title}</h2>
          <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot"></span>
          <i className="fab fa-whatsapp text-emerald-600 text-sm"></i>
          <span className="text-xs font-bold text-slate-700">WA Aktif</span>
        </div>

        <div className="relative">
          <button onClick={() => setShowNotif(v => !v)} className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <i className="fas fa-bell text-lg"></i>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 slide-in z-50">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Notifikasi</h3>
                <button onClick={() => { markAllRead(); setShowNotif(false) }} className="text-xs text-emerald-600 hover:underline font-semibold">Baca Semua</button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 hover:bg-slate-50 cursor-pointer transition ${!n.read ? 'bg-emerald-50/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${n.type === 'warning' ? 'bg-amber-100 text-amber-600' : n.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                        <i className={n.type === 'warning' ? 'fas fa-exclamation-triangle' : n.type === 'danger' ? 'fas fa-clock' : 'fas fa-info-circle'}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.msg}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1"></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
