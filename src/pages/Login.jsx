import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Login() {
  const { doLogin } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin() {
    if (loading) return
    if (!username || !password) { setError('Username dan password wajib diisi.'); return }
    setLoading(true)
    setError('')
    // small delay for a smoother UX feel
    setTimeout(async () => {
      const ok = await doLogin(username, password)
      if (!ok) { setError('Username atau password salah.'); setLoading(false) }
    }, 450)
  }

  function handleKey(e) { if (e.key === 'Enter') handleLogin() }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 gradient-bg overflow-hidden">
      {/* decorative glows */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden login-card">
        {/* Brand panel */}
        <div className="relative hidden md:flex flex-col justify-between p-9 text-white overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#0a1628 0%,#0f2027 45%,#14532d 100%)' }}>
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="absolute -left-8 bottom-10 w-40 h-40 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fas fa-mountain text-white text-xl"></i>
              </div>
              <div>
                <p className="font-extrabold text-lg leading-tight">TrekingHouse</p>
                <p className="text-emerald-300/80 text-xs font-semibold tracking-wide">SUPERSYS v4.0</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <h1 className="text-3xl font-extrabold leading-tight">Kelola sewa<br />gear pendakian<br /><span className="text-emerald-400">tanpa ribet.</span></h1>
            <p className="text-slate-300/80 text-sm mt-3 leading-relaxed">Inventaris, transaksi, dan pelanggan dalam satu dashboard yang real-time.</p>
          </div>

          <div className="relative space-y-2.5">
            {[
              { i: 'fa-bolt', t: 'Sinkronisasi data real-time' },
              { i: 'fa-box-open', t: 'Manajemen stok otomatis' },
              { i: 'fa-chart-line', t: 'Laporan pendapatan instan' },
            ].map(f => (
              <div key={f.t} className="flex items-center gap-3 text-sm text-slate-200/90">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300">
                  <i className={`fas ${f.i} text-xs`}></i>
                </span>
                {f.t}
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          {/* mobile logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-6">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-mountain text-white text-xl"></i>
            </div>
            <div>
              <p className="font-extrabold text-lg text-slate-800 leading-tight">TrekingHouse</p>
              <p className="text-emerald-600 text-xs font-semibold tracking-wide">SUPERSYS v4.0</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-extrabold text-2xl text-slate-800">Selamat datang 👋</h2>
            <p className="text-slate-500 text-sm mt-1">Masuk untuk melanjutkan ke dashboard.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Username</label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKey}
                  type="text" placeholder="Masukkan username" autoFocus
                  className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm transition" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-sm transition" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition">
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 shake">
                <i className="fas fa-circle-exclamation"></i>{error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl py-3 font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Memproses...</>
              ) : (
                <>Masuk <i className="fas fa-arrow-right"></i></>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-7">
            © {new Date().getFullYear()} TrekingHouse SuperSys · All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
