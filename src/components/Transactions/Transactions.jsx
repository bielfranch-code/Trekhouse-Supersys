import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import NewTxModal from './NewTxModal'

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

const STATUS_COLORS = {
  'Sedang Disewa': 'bg-blue-100 text-blue-700',
  'Booked': 'bg-amber-100 text-amber-700',
  'Terlambat': 'bg-rose-100 text-rose-700',
  'Sudah Dikembalikan': 'bg-emerald-100 text-emerald-700',
}

export default function Transactions() {
  const { transactions, currentUser, addTransaction, updateTransaction, deleteTransaction, showToast } = useApp()
  const [txFilter, setTxFilter] = useState('')
  const [newTxOpen, setNewTxOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnForm, setReturnForm] = useState({ safe: null, penalty: 0, note: '' })
  const [deleteTxTarget, setDeleteTxTarget] = useState(null)
  const [waPreview, setWaPreview] = useState(null)

  const filtered = transactions.filter(t => !txFilter || t.status === txFilter)

  function advanceStatus(t) {
    updateTransaction(t.id, { status: 'Sedang Disewa' })
    showToast(`${t.id} → Sedang Disewa`, 'success')
  }

  function openReturnCheck(t) {
    setReturnTarget(t)
    setReturnForm({ safe: null, penalty: 0, note: '' })
  }

  function processReturn() {
    if (returnForm.safe === null) return
    const updates = { status: 'Sudah Dikembalikan' }
    if (returnForm.safe === false && returnForm.penalty > 0) updates.penalty = (returnTarget.penalty || 0) + returnForm.penalty
    if (returnForm.note) updates.returnNote = returnForm.note
    updateTransaction(returnTarget.id, updates)
    showToast(`${returnTarget.id} berhasil dikembalikan${returnForm.penalty > 0 ? ` + denda Rp ${returnForm.penalty.toLocaleString()}` : ''}`, 'success')
    setReturnTarget(null)
  }

  function sendWhatsApp(t) {
    const penalty = t.penalty > 0 ? `\n⚠️ Denda: Rp ${t.penalty.toLocaleString()}` : ''
    const msg = `Halo *${t.name}* 👋\n\nPengingat dari *TrekingHouse SuperSys*:\n\n📦 Item: ${t.items}\n📅 Jatuh Tempo: ${fmtDate(t.return)}\n💰 Total: Rp ${t.subtotal.toLocaleString()}${penalty}\n\nMohon kembalikan barang tepat waktu ya 🙏\n\n_TrekingHouse — Alat Hiking Terpercaya_`
    setWaPreview({ t, msg })
  }

  function openWhatsApp() {
    const phone = waPreview.t?.phone?.replace(/\D/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waPreview.msg)}`, '_blank')
    setWaPreview(null)
    showToast('Membuka WhatsApp...', 'info')
  }

  function printReceipt(t) {
    const w = window.open('','_blank','width=380,height=620')
    w.document.write(`<!DOCTYPE html><html><head><title>${t.id}</title><style>body{font-family:monospace;padding:16px;max-width:320px;margin:0 auto;font-size:13px;}h2{text-align:center;font-size:16px;margin:0 0 4px;}p{margin:2px 0;text-align:center;color:#666;font-size:11px;}hr{border:1px dashed #aaa;margin:10px 0;}.row{display:flex;justify-content:space-between;margin:4px 0;}.bold{font-weight:bold;}.total{font-weight:900;font-size:14px;border-top:2px solid #000;padding-top:8px;margin-top:8px;}.footer{text-align:center;margin-top:12px;font-size:11px;color:#888;}</style></head><body>
    <h2>⛰️ TrekingHouse SuperSys</h2><p>Sistem Rental Alat Hiking Terpercaya</p>
    <hr><div class="row"><span>ID</span><span class="bold">${t.id}</span></div>
    <div class="row"><span>Customer</span><span>${t.name}</span></div>
    <div class="row"><span>Ambil</span><span>${fmtDate(t.pickup)}</span></div>
    <div class="row"><span>Kembali</span><span>${fmtDate(t.return)}</span></div>
    <hr><div style="margin:6px 0;">${t.items}</div>
    <hr><div class="row"><span>Subtotal</span><span>Rp ${t.subtotal.toLocaleString()}</span></div>
    <div class="row"><span>Deposit (30%)</span><span>Rp ${Math.round(t.subtotal*.3).toLocaleString()}</span></div>
    ${t.penalty ? `<div class="row"><span>Denda</span><span>Rp ${t.penalty.toLocaleString()}</span></div>` : ''}
    <div class="row total"><span>TOTAL AKHIR</span><span>Rp ${(t.subtotal+(t.penalty||0)).toLocaleString()}</span></div>
    <p class="footer">Terima kasih sudah menyewa! 🙏<br>Kembalikan barang tepat waktu.</p>
    <script>window.onload=()=>window.print();<\/script></body></html>`)
    w.document.close()
  }

  const FILTERS = [
    { val:'', label:'Semua', cnt: transactions.length, active:'bg-emerald-600 text-white', inactive:'bg-slate-100 text-slate-600 hover:bg-slate-200' },
    { val:'Booked', label:'Booked', cnt: transactions.filter(t=>t.status==='Booked').length, active:'bg-amber-500 text-white', inactive:'bg-slate-100 text-slate-600 hover:bg-slate-200' },
    { val:'Sedang Disewa', label:'Disewa', cnt: transactions.filter(t=>t.status==='Sedang Disewa').length, active:'bg-blue-600 text-white', inactive:'bg-slate-100 text-slate-600 hover:bg-slate-200' },
    { val:'Terlambat', label:'Terlambat', cnt: transactions.filter(t=>t.status==='Terlambat').length, active:'bg-rose-600 text-white', inactive:'bg-slate-100 text-slate-600 hover:bg-slate-200' },
    { val:'Sudah Dikembalikan', label:'Selesai', cnt: transactions.filter(t=>t.status==='Sudah Dikembalikan').length, active:'bg-slate-700 text-white', inactive:'bg-slate-100 text-slate-600 hover:bg-slate-200' },
  ]

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.val} onClick={() => setTxFilter(f.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${txFilter === f.val ? f.active : f.inactive}`}>
                {f.label} ({f.cnt})
              </button>
            ))}
          </div>
          <button onClick={() => setNewTxOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition whitespace-nowrap">
            <i className="fas fa-plus"></i> Transaksi Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mob-card-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Transaksi</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Periode</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Item</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400"><i className="fas fa-receipt text-3xl mb-3 block"></i>Tidak ada transaksi</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="trow">
                  <td className="px-4 py-3" data-label="">
                    <p className="font-mono font-extrabold text-slate-800 text-xs">{t.id}</p>
                    <p className="text-xs text-slate-400">{t.phone}</p>
                  </td>
                  <td className="px-3 py-3" data-label="Customer">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 flex-shrink-0">
                        {t.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <span className="font-semibold text-slate-800 text-xs">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3" data-label="Periode">
                    <p className="text-xs font-semibold text-slate-700">{fmtDate(t.pickup)}</p>
                    <p className="text-xs text-slate-400">→ {fmtDate(t.return)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 max-w-[140px]" data-label="Item">
                    <span className="truncate block">{t.items}</span>
                  </td>
                  <td className="px-3 py-3" data-label="Total">
                    <p className="font-extrabold text-slate-800 text-xs">Rp {t.subtotal.toLocaleString()}</p>
                    {t.penalty > 0 && <p className="text-xs text-rose-600 font-bold">+denda Rp {t.penalty.toLocaleString()}</p>}
                  </td>
                  <td className="px-3 py-3" data-label="Status">
                    <span className={`px-2 py-1 rounded-lg text-xs font-extrabold ${STATUS_COLORS[t.status] || ''}`}>{t.status}</span>
                  </td>
                  <td className="px-3 py-3" data-label="Aksi">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedTx(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Detail"><i className="fas fa-eye text-xs"></i></button>
                      <button onClick={() => sendWhatsApp(t)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="WA"><i className="fab fa-whatsapp text-xs"></i></button>
                      <button onClick={() => printReceipt(t)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Print"><i className="fas fa-print text-xs"></i></button>
                      {t.status === 'Booked' && (
                        <button onClick={() => advanceStatus(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Proses Ambil">
                          <i className="fas fa-arrow-right text-xs"></i>
                        </button>
                      )}
                      {(t.status === 'Sedang Disewa' || t.status === 'Terlambat') && (
                        <button onClick={() => openReturnCheck(t)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Proses Kembali">
                          <i className="fas fa-undo text-xs"></i>
                        </button>
                      )}
                      {currentUser?.role === 'superadmin' && (
                        <button onClick={() => setDeleteTxTarget(t)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Hapus">
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>{filtered.length} transaksi</span>
          <span className="font-extrabold text-emerald-700">Total: Rp {filtered.reduce((s,t) => s + t.subtotal, 0).toLocaleString()}</span>
        </div>
      </div>

      <NewTxModal open={newTxOpen} onClose={() => setNewTxOpen(false)} onSave={(tx) => { addTransaction(tx); setNewTxOpen(false) }} />

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl slide-in overflow-hidden" style={{ maxHeight: '92vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{selectedTx.id}</h3>
                <p className="text-xs text-slate-400">Detail Transaksi Sewa</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><i className="fas fa-times"></i></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3" style={{ maxHeight: 'calc(92vh - 140px)' }}>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Customer</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedTx.name}</p>
                  <p className="text-xs text-slate-500">{selectedTx.phone}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[selectedTx.status] || ''}`}>{selectedTx.status}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Tanggal Ambil</p>
                  <p className="font-semibold text-sm">{fmtDate(selectedTx.pickup)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Jatuh Tempo</p>
                  <p className={`font-semibold text-sm ${selectedTx.status === 'Terlambat' ? 'text-rose-600' : ''}`}>{fmtDate(selectedTx.return)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item Disewa</p>
                <p className="text-sm text-slate-700">{selectedTx.items}</p>
              </div>
              {selectedTx.returnNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1"><i className="fas fa-exclamation-triangle mr-1"></i>Catatan Pengembalian</p>
                  <p className="text-sm text-amber-800">{selectedTx.returnNote}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 mb-1">Subtotal</p>
                  <p className="font-bold text-emerald-800 text-sm">Rp {(selectedTx.subtotal||0).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-rose-600 mb-1">Denda</p>
                  <p className="font-bold text-rose-800 text-sm">Rp {(selectedTx.penalty||0).toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Total Akhir</span>
                  <span className="font-extrabold text-lg text-emerald-400">Rp {((selectedTx.subtotal||0)+(selectedTx.penalty||0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
              <button onClick={() => { sendWhatsApp(selectedTx); setSelectedTx(null) }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
                <i className="fab fa-whatsapp"></i> Kirim WA
              </button>
              <button onClick={() => printReceipt(selectedTx)} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition">
                <i className="fas fa-print"></i>
              </button>
              <button onClick={() => setSelectedTx(null)} className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Check Modal */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800"><i className="fas fa-clipboard-check text-emerald-500 mr-2"></i>Pengembalian Barang</h3>
              <button onClick={() => setReturnTarget(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-slate-800">{returnTarget.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{returnTarget.items}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Apakah kondisi barang aman?</p>
                <div className="flex gap-2">
                  <button onClick={() => setReturnForm(f => ({ ...f, safe: true }))}
                    className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-bold transition ${returnForm.safe === true ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-emerald-400'}`}>
                    <i className="fas fa-check mr-1"></i> Aman
                  </button>
                  <button onClick={() => setReturnForm(f => ({ ...f, safe: false }))}
                    className={`flex-1 py-2.5 border-2 rounded-xl text-sm font-bold transition ${returnForm.safe === false ? 'bg-rose-600 text-white border-rose-600' : 'border-slate-200 text-slate-600 hover:border-rose-400'}`}>
                    <i className="fas fa-times mr-1"></i> Ada Masalah
                  </button>
                </div>
              </div>
              {returnForm.safe === false && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">Denda Kerusakan (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                    <input value={returnForm.penalty} onChange={e => setReturnForm(f => ({ ...f, penalty: +e.target.value }))} type="number" min="0" placeholder="0" className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm transition" />
                  </div>
                  <label className="text-xs font-bold text-slate-600 block">Keterangan Kerusakan</label>
                  <textarea value={returnForm.note} onChange={e => setReturnForm(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="Contoh: ritsleting rusak..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm transition resize-none"></textarea>
                </div>
              )}
              {returnForm.safe === null && <div className="text-xs text-slate-400 text-center py-2">Pilih kondisi barang di atas</div>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setReturnTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
              <button onClick={processReturn} disabled={returnForm.safe === null} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition">
                <i className="fas fa-check-double mr-1"></i> Proses Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tx Confirm */}
      {deleteTxTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl slide-in p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-trash text-rose-500 text-xl"></i></div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">
              <p className="text-xs font-bold text-rose-700"><i className="fas fa-shield-alt mr-1"></i>Aksi Superadmin</p>
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Hapus Transaksi?</h3>
            <p className="text-slate-500 text-sm mb-5">Transaksi <strong>{deleteTxTarget.id}</strong> akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTxTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
              <button onClick={() => { deleteTransaction(deleteTxTarget.id); setDeleteTxTarget(null) }} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* WA Preview */}
      {waPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800"><i className="fab fa-whatsapp text-emerald-500 mr-2"></i>Kirim WhatsApp</h3>
              <button onClick={() => setWaPreview(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-5">
              <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-none p-4 text-sm text-slate-800 mb-4 font-mono leading-relaxed whitespace-pre-wrap break-words" style={{ maxHeight:'200px', overflowY:'auto' }}>{waPreview.msg}</div>
              <p className="text-xs text-slate-400 mb-4">Nomor: <strong>{waPreview.t?.phone}</strong></p>
              <div className="flex gap-2">
                <button onClick={() => setWaPreview(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
                <button onClick={openWhatsApp} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
                  <i className="fab fa-whatsapp mr-1"></i> Buka WA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
