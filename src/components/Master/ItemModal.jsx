import { useState, useEffect } from 'react'
import { CATEGORIES } from '../../context/AppContext'

const EMPTY_FORM = { name:'', sku:'', category:'', rental_price:0, purchase_price:0, total_stock:1, variation:'', size:'', notes:'' }

export default function ItemModal({ open, editingItem, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) setForm(editingItem ? { ...editingItem } : EMPTY_FORM)
  }, [open, editingItem])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSave() {
    if (!form.name || !form.sku || !form.category) {
      alert('Nama, SKU, dan Kategori wajib diisi!')
      return
    }
    onSave(form)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl slide-in overflow-hidden" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{editingItem ? 'Edit Item' : 'Tambah Item Baru'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"><i className="fas fa-times"></i></button>
        </div>
        <div className="overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ maxHeight: 'calc(92vh - 130px)' }}>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Nama Barang <span className="text-rose-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} type="text" placeholder="Tenda Kapasitas 4P Consina" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">SKU <span className="text-rose-500">*</span></label>
            <input value={form.sku} onChange={e => set('sku', e.target.value)} type="text" placeholder="TND-001" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition font-mono" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Kategori <span className="text-rose-500">*</span></label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white transition">
              <option value="">-- Pilih --</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Harga Sewa/4 Hari (Rp)</label>
            <input value={form.rental_price} onChange={e => set('rental_price', +e.target.value)} type="number" min="0" placeholder="50000" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Harga Modal (Rp)</label>
            <input value={form.purchase_price} onChange={e => set('purchase_price', +e.target.value)} type="number" min="0" placeholder="450000" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Total Stok</label>
            <input value={form.total_stock} onChange={e => set('total_stock', +e.target.value)} type="number" min="1" placeholder="5" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Varian</label>
            <input value={form.variation} onChange={e => set('variation', e.target.value)} type="text" placeholder="Merah, Biru, dll" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Ukuran</label>
            <input value={form.size} onChange={e => set('size', e.target.value)} type="text" placeholder="S, M, L, 42, dll" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm transition" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Catatan</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Catatan tambahan..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm transition resize-none"></textarea>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
            <i className="fas fa-save mr-1"></i>{editingItem ? 'Simpan' : 'Tambah Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
