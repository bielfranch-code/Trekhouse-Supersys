import { useApp } from '../../context/AppContext'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
  { id: 'master', label: 'Master Data', icon: 'fas fa-box' },
  { id: 'transaksi', label: 'Transaksi', icon: 'fas fa-receipt' },
  { id: 'customers', label: 'Customer', icon: 'fas fa-users' },
]

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, desktopSidebarOpen, onManageAccounts }) {
  const { currentUser, doLogout, items, transactions, customers } = useApp()

  function getBadge(id) {
    if (id === 'master') return items.length
    if (id === 'transaksi') return `${transactions.filter(t => t.status === 'Sedang Disewa').length} aktif`
    if (id === 'customers') return customers.length
    return null
  }

  return (
    <aside className={`
      fixed lg:static z-40 h-full gradient-bg text-white flex flex-col no-print flex-shrink-0
      transition-all duration-300 ease-in-out overflow-hidden
      w-64
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
      ${desktopSidebarOpen ? 'lg:max-w-[16rem] lg:opacity-100' : 'lg:max-w-0 lg:opacity-0'}
    `}>
      <div className="w-64 flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <i className="fas fa-mountain text-lg"></i>
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-base leading-tight truncate">TrekingHouse</h1>
            <p className="text-[10px] text-slate-400">SuperSys v4.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-3 py-2">Operasional</p>
        {NAV_ITEMS.map(nav => {
          const badge = getBadge(nav.id)
          return (
            <button key={nav.id}
              onClick={() => { setActiveTab(nav.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-semibold ${activeTab === nav.id ? 'nav-active' : 'nav-item text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <i className={`${nav.icon} w-4 text-center`}></i>
              <span>{nav.label}</span>
              {badge !== null && (
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === nav.id ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10 safe-bottom">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${currentUser?.role === 'superadmin' ? 'bg-rose-500' : currentUser?.role === 'admin' ? 'bg-amber-500' : 'bg-blue-500'}`}>
            {currentUser?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">@{currentUser?.username}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${currentUser?.role === 'superadmin' ? 'bg-rose-500/20 text-rose-400' : currentUser?.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {currentUser?.role}
          </span>
        </div>
        <div className="flex gap-2">
          {currentUser?.role === 'superadmin' && (
            <button onClick={onManageAccounts} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition font-semibold">
              <i className="fas fa-users-cog"></i> Kelola Akun
            </button>
          )}
          <button onClick={doLogout} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition font-semibold">
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>
      </div>
      </div>
    </aside>
  )
}
