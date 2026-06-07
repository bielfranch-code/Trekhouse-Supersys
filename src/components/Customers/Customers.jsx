import { useState } from 'react'
import { useApp } from '../../context/AppContext'

function stringToColor(str) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  const c = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899']
  return c[Math.abs(h) % c.length]
}

const TIER_COLORS = {
  Gold: 'bg-amber-100 text-amber-700',
  Silver: 'bg-slate-100 text-slate-600',
  Bronze: 'bg-orange-100 text-orange-700',
}

export default function Customers() {
  const { customers, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
      && (!tierFilter || c.tier === tierFilter)
  })

  function chatWA(c) {
    const msg = `Halo *${c.name}* 👋\n\nAda yang bisa kami bantu dari TrekingHouse? 🏔️`
    const phone = c.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    showToast('Membuka WhatsApp...', 'info')
  }

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau no. HP..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm transition" />
          </div>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white transition">
            <option value="">Semua Tier</option>
            <option value="Bronze">Bronze</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mob-card-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Kontak</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Sewa</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tier</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="trow">
                  <td className="px-4 py-3" data-label="">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                        style={{ background: stringToColor(c.name) }}>
                        {c.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.id_type}: {c.id_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3" data-label="Kontak">
                    <p className="text-xs font-semibold">{c.phone}</p>
                    <button onClick={() => chatWA(c)} className="text-xs text-emerald-600 font-semibold">
                      <i className="fab fa-whatsapp"></i> Chat
                    </button>
                  </td>
                  <td className="px-3 py-3 font-extrabold text-slate-800" data-label="Total Sewa">{c.total_rentals}x</td>
                  <td className="px-3 py-3" data-label="Tier">
                    <span className={`px-2 py-1 rounded-lg text-xs font-extrabold ${TIER_COLORS[c.tier] || ''}`}>{c.tier}</span>
                  </td>
                  <td className="px-3 py-3 font-extrabold text-emerald-700" data-label="Total Bayar">Rp {c.total_spent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
