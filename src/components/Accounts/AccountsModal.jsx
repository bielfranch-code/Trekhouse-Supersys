import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const EMPTY_FORM = { username:'', password:'', name:'', role:'admin' }

export default function AccountsModal({ open, onClose }) {
  const { accounts, addAccount, removeAccount } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd() {
    if (!form.username || !form.password || !form.name) { alert('Semua field wajib diisi!'); return }
    const ok = await addAccount(form)
    if (ok) setForm(EMPTY_FORM)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl slide-in overflow-hidden" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-800"><i className="fas fa-users-cog text-emerald-500 mr-2"></i>Manajemen Akun</h3>
            <p className="text-xs text-slate-400">Tambah & kelola akun admin/staff</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><i className="fas fa-times"></i></button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 70px)' }}>
          <div className="p-5 border-b border-slate-100">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Tambah Akun Baru</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={form.username} onChange={e => set('username', e.target.value)} type="text" placeholder="Username" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
              <input value={form.password} onChange={e => set('password', e.target.value)} type="password" placeholder="Password" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
              <select value={form.role} onChange={e => set('role', e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
                <option value="admin">Admin (tidak bisa hapus transaksi)</option>
                <option value="staff">Staff (operasional saja)</option>
              </select>
              <input value={form.name} onChange={e => set('name', e.target.value)} type="text" placeholder="Nama Lengkap" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
            </div>
            <button onClick={handleAdd} className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-bold transition">
              <i className="fas fa-user-plus mr-1"></i> Tambah Akun
            </button>
          </div>
          <div className="p-5">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">Daftar Akun</p>
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${acc.role==='superadmin'?'bg-rose-500':acc.role==='admin'?'bg-amber-500':'bg-blue-500'}`}>
                    {acc.name.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800">{acc.name}</p>
                    <p className="text-xs text-slate-400">@{acc.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${acc.role==='superadmin'?'bg-rose-100 text-rose-700':acc.role==='admin'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                    {acc.role === 'superadmin' ? 'Superadmin' : acc.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                  {acc.role !== 'superadmin' && (
                    <button onClick={() => removeAccount(acc.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                      <i className="fas fa-trash text-xs"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <i className="fas fa-info-circle mr-1"></i> <strong>Admin</strong> tidak bisa menghapus transaksi. Hanya <strong>Superadmin</strong> yang memiliki akses tersebut.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
