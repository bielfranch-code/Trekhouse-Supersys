import { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Dashboard from './components/Dashboard/Dashboard'
import MasterData from './components/Master/MasterData'
import Transactions from './components/Transactions/Transactions'
import Customers from './components/Customers/Customers'
import AccountsModal from './components/Accounts/AccountsModal'
import Toast from './components/ui/Toast'

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(10,22,40,.95)' }}>
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-mountain text-white text-2xl"></i>
        </div>
        <h2 className="font-extrabold text-xl text-white mb-2">TrekingHouse SuperSys</h2>
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          Memuat data...
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { loggedIn, loading } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)

  if (loading) return <LoadingScreen />

  if (!loggedIn) return (
    <>
      <Toast />
      <Login />
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      <Toast />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onManageAccounts={() => setAccountsOpen(true)}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        <Header activeTab={activeTab} setSidebarOpen={setSidebarOpen} />
        <div className="p-4 sm:p-5 max-w-[1400px] mx-auto">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'master' && <MasterData />}
          {activeTab === 'transaksi' && <Transactions />}
          {activeTab === 'customers' && <Customers />}
        </div>
      </main>

      <AccountsModal open={accountsOpen} onClose={() => setAccountsOpen(false)} />
    </div>
  )
}
