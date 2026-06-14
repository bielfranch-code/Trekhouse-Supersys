import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'

function today() { return new Date().toISOString().split('T')[0] }
function plusDays(d, n) { return new Date(new Date(d).getTime() + n * 86400000).toISOString().split('T')[0] }

const EMPTY_FORM = () => ({
  customerName:'', phone:'', idType:'KTP', idNumber:'',
  pickupDate: today(), returnDate: plusDays(today(), 4),
  items: [{ itemId:'', qty:1, price:0 }],
  paymentMethod:'Cash', paymentStatus:'Lunas', notes:''
})

function ItemSearchRow({ ti, idx, items, getAvailableStock, onChangeItem, onChangeQty, onRemove, txDays }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef()

  const selectedItem = items.find(i => i.id === +ti.itemId)
  const filtered = items
    .filter(i => getAvailableStock(i) > 0 || ti.itemId == i.id)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())
      || i.sku.toLowerCase().includes(search.toLowerCase())
      || (i.category || '').toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function onClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="flex gap-2 items-start bg-slate-50 rounded-xl p-2">
      <div className="flex-1 min-w-0" ref={wrapRef}>
        {/* Selected item pill or search trigger */}
        {selectedItem && !open ? (
          <button
            type="button"
            onClick={() => { setSearch(''); setOpen(true) }}
            className="w-full text-left flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-2 py-1.5"
          >
            <span className="flex-1 text-xs font-bold text-emerald-800 truncate">{selectedItem.name}</span>
            <span className="text-[10px] text-emerald-600 whitespace-nowrap">Rp {selectedItem.rental_price.toLocaleString()}</span>
            <i className="fas fa-pen text-[9px] text-emerald-400"></i>
          </button>
        ) : (
          <input
            autoFocus={open}
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Cari nama, SKU, atau kategori..."
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white transition"
          />
        )}
        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto w-72">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Tidak ada item</p>
            ) : filtered.map(it => {
              const avail = getAvailableStock(it)
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => { onChangeItem(idx, it.id); setSearch(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{it.name}</p>
                      <p className="text-[10px] text-slate-400">{it.sku} · {it.category}{it.size ? ` · ${it.size}` : ''}{it.variation ? ` · ${it.variation}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-emerald-700">Rp {it.rental_price.toLocaleString()}</p>
                      <p className={`text-[10px] font-semibold ${avail === 0 ? 'text-rose-500' : 'text-slate-400'}`}>{avail} tersedia</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <input
        value={ti.qty}
        onChange={e => onChangeQty(idx, e.target.value)}
        type="number" min="1" max="20"
        className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center transition flex-shrink-0"
      />
      <span className="text-xs text-slate-500 w-20 text-right shrink-0 pt-1.5">
        Rp {(ti.price * ti.qty * txDays).toLocaleString()}
      </span>
      <button onClick={() => onRemove(idx)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex-shrink-0">
        <i className="fas fa-times text-xs"></i>
      </button>
    </div>
  )
}

export default function NewTxModal({ open, onClose, onSave }) {
  const { items, getAvailableStock } = useApp()
  const [form, setForm] = useState(EMPTY_FORM())

  useEffect(() => { if (open) setForm(EMPTY_FORM()) }, [open])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const txDays = (() => {
    if (!form.pickupDate || !form.returnDate) return 4
    const d = Math.ceil((new Date(form.returnDate) - new Date(form.pickupDate)) / 86400000)
    return d > 0 ? d : 1
  })()

  const txSubtotal = form.items.reduce((s, i) => s + (i.price * i.qty * txDays), 0)
  const txDeposit = Math.round(txSubtotal * 0.3)

  function updateItemPrice(idx, itemId) {
    const found = items.find(i => i.id === +itemId)
    const newItems = [...form.items]
    newItems[idx] = { ...newItems[idx], itemId, price: found ? found.rental_price : 0 }
    set('items', newItems)
  }
  function updateItemQty(idx, qty) {
    const newItems = [...form.items]
    newItems[idx] = { ...newItems[idx], qty: +qty }
    set('items', newItems)
  }
  function removeItem(idx) { set('items', form.items.filter((_, i) => i !== idx)) }
  function addItemRow() { set('items', [...form.items, { itemId:'', qty:1, price:0 }]) }

  function handleSave() {
    if (!form.customerName || !form.phone) { alert('Nama dan nomor WA wajib diisi!'); return }
    const validItems = form.items.filter(i => i.itemId && i.qty > 0)
    if (validItems.length === 0) { alert('Tambahkan minimal 1 item!'); return }
    const yr = new Date().getFullYear().toString().slice(-2)
    const mo = String(new Date().getMonth() + 1).padStart(2, '0')
    const id = `TRX-${yr}${mo}-${String(Date.now()).slice(-3)}`
    const itemNames = validItems.map(i => items.find(it => it.id === +i.itemId)?.name || '?').join(', ')
    const tx = {
      id, name: form.customerName, phone: form.phone.replace(/\D/g,''),
      idType: form.idType, idNumber: form.idNumber,
      pickup: new Date(form.pickupDate).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),
      return: new Date(form.returnDate).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}),
      items: itemNames, itemIds: validItems.map(i => +i.itemId), itemQtys: validItems.map(i => i.qty),
      subtotal: txSubtotal + txDeposit, penalty: 0, status: 'Booked', returnNote: ''
    }
    onSave(tx)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl slide-in overflow-hidden" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Transaksi Baru</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><i className="fas fa-times"></i></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(92vh - 145px)' }}>
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Data Customer</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input value={form.customerName} onChange={e => set('customerName', e.target.value)} type="text" placeholder="Nama Lengkap *" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
              </div>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} type="tel" placeholder="No. WhatsApp *" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
              <select value={form.idType} onChange={e => set('idType', e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
                <option value="KTP">KTP</option><option value="SIM">SIM</option><option value="KTM">KTM</option>
              </select>
              <div className="col-span-2">
                <input value={form.idNumber} onChange={e => set('idNumber', e.target.value)} type="text" placeholder="Nomor ID (opsional)" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition font-mono" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Periode Sewa</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Ambil</label>
                <input value={form.pickupDate} onChange={e => { set('pickupDate', e.target.value); set('returnDate', plusDays(e.target.value, 4)) }} type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm transition" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Kembali</label>
                <input value={form.returnDate} onChange={e => set('returnDate', e.target.value)} type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm transition" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Item Disewa</p>
            <div className="space-y-2 mb-2 relative">
              {form.items.map((ti, idx) => (
                <ItemSearchRow
                  key={idx}
                  ti={ti} idx={idx}
                  items={items}
                  getAvailableStock={getAvailableStock}
                  onChangeItem={updateItemPrice}
                  onChangeQty={updateItemQty}
                  onRemove={removeItem}
                  txDays={txDays}
                />
              ))}
            </div>
            <button onClick={addItemRow} className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 text-slate-400 hover:text-emerald-600 rounded-xl py-2 text-xs font-bold transition">
              <i className="fas fa-plus mr-1"></i> Tambah Item
            </button>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
                <option value="Cash">Cash</option><option value="QRIS">QRIS</option><option value="Transfer">Transfer</option>
              </select>
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
                <option value="Lunas">Lunas</option><option value="DP">DP / Belum Lunas</option>
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500">Lama Sewa</span><span className="font-bold">{txDays} hari</span></div>
            <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500">Subtotal Sewa</span><span className="font-bold">Rp {txSubtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500">Deposit (30%)</span><span className="font-bold">Rp {txDeposit.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm font-extrabold border-t border-emerald-200 pt-2 mt-1">
              <span>Total</span><span className="text-emerald-700">Rp {(txSubtotal + txDeposit).toLocaleString()}</span>
            </div>
          </div>

          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Catatan tambahan (opsional)..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm transition resize-none"></textarea>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
            <i className="fas fa-save mr-1"></i> Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
