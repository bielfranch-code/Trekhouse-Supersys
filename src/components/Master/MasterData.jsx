import { useState } from 'react'
import { useApp, CATEGORIES } from '../../context/AppContext'
import ItemModal from './ItemModal'

function getCatIcon(cat) {
  const m = { Tenda:'fas fa-campground', Carrier:'fas fa-shopping-bag', 'Sleeping Bag':'fas fa-bed', Sepatu:'fas fa-shoe-prints', Kompor:'fas fa-fire', Matras:'fas fa-layer-group', Aksesoris:'fas fa-tools' }
  return m[cat] || 'fas fa-box'
}

export default function MasterData() {
  const { items, getAvailableStock, addItem, updateItem, deleteItem } = useApp()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      && (!catFilter || i.category === catFilter)
  })

  function openAdd() { setEditingItem(null); setModalOpen(true) }
  function openEdit(item) { setEditingItem(item); setModalOpen(true) }
  function handleSave(form) {
    if (editingItem) updateItem(editingItem.id, form)
    else addItem(form)
    setModalOpen(false)
  }
  function confirmDelete() {
    deleteItem(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari item..." className="w-full sm:w-48 pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm transition" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white transition">
              <option value="">Semua Kategori</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition whitespace-nowrap">
            <i className="fas fa-plus"></i> Tambah Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mob-card-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Item</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Kategori</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Harga/Hari</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Stok Tersedia</th>
                <th className="text-left px-3 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400"><i className="fas fa-box-open text-3xl mb-3 block"></i>Tidak ada item</td></tr>
              )}
              {filtered.map(item => {
                const avail = getAvailableStock(item)
                return (
                  <tr key={item.id} className="trow">
                    <td className="px-4 py-3" data-label="">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <i className={getCatIcon(item.category)}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.variation || 'Standard'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-bold text-slate-600" data-label="SKU">{item.sku}</td>
                    <td className="px-3 py-3" data-label="Kategori">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{item.category}</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-800" data-label="Harga/Hari">Rp {item.rental_price.toLocaleString()}</td>
                    <td className="px-3 py-3" data-label="Stok Tersedia">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${avail === 0 ? 'bg-rose-500' : avail <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                        <span className={`font-extrabold ${avail === 0 ? 'text-rose-600' : 'text-slate-800'}`}>{avail}</span>
                        <span className="text-slate-400 text-xs">/{item.total_stock}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3" data-label="Aksi">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Edit"><i className="fas fa-edit text-xs"></i></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Hapus"><i className="fas fa-trash text-xs"></i></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <span>{filtered.length} dari {items.length} item</span>
          <span className={`font-bold ${items.filter(i => getAvailableStock(i) === 0).length > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
            {items.filter(i => getAvailableStock(i) === 0).length} item habis
          </span>
        </div>
      </div>

      <ItemModal open={modalOpen} editingItem={editingItem} onClose={() => setModalOpen(false)} onSave={handleSave} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl slide-in p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-trash text-rose-500 text-xl"></i></div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">Hapus Item?</h3>
            <p className="text-slate-500 text-sm mb-5">Item <strong>{deleteTarget.name}</strong> akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">Batal</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
