import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export const CATEGORIES = ['Tenda','Carrier','Sleeping Bag','Sepatu','Kompor','Matras','Aksesoris']

// ── Date helpers ─────────────────────────────────────────────────────────────
const ID_MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agt','sep','okt','nov','des']

// Parse both ISO "2026-05-03" and Indonesian "3 Mei 2026" into a Date object
function parseDate(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str)
  // Indonesian format: "3 Mei 2026"
  const parts = str.trim().split(/\s+/)
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const mon = ID_MONTHS.indexOf(parts[1].toLowerCase())
    const year = parseInt(parts[2], 10)
    if (mon !== -1 && !isNaN(day) && !isNaN(year)) {
      return new Date(year, mon, day)
    }
  }
  return new Date(str)
}

// Format a date string for display: always show as Indonesian "3 Mei 2026"
function formatDateDisplay(str) {
  const d = parseDate(str)
  if (!d || isNaN(d)) return str
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── DB row ↔ app shape mappers ──────────────────────────────────────────────
function dbToTx(row) {
  return {
    id: row.id,
    name: row.customer_name,
    phone: row.phone,
    pickup: row.pickup_date,
    return: row.return_date,
    items: row.items_summary,
    itemIds: [],
    itemQtys: [],
    subtotal: row.subtotal || 0,
    penalty: row.penalty || 0,
    status: row.status,
    returnNote: row.return_note,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    notes: row.notes,
    createdBy: row.created_by,
    created_at: row.created_at,
  }
}

function txToDb(tx) {
  return {
    id: tx.id,
    customer_name: tx.name,
    phone: tx.phone,
    pickup_date: tx.pickup,
    return_date: tx.return,
    items_summary: tx.items,
    subtotal: tx.subtotal,
    penalty: tx.penalty || 0,
    status: tx.status,
    return_note: tx.returnNote || '',
    payment_method: tx.paymentMethod || '',
    payment_status: tx.paymentStatus || '',
    notes: tx.notes || '',
    created_by: tx.createdBy || '',
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const SESSION_KEY = 'trekhouse_session'
  const SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours in ms

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const { user, loginAt } = JSON.parse(raw)
      if (Date.now() - loginAt > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY)
        return null
      }
      return user
    } catch {
      return null
    }
  }

  const savedUser = loadSession()
  const [loading, setLoading] = useState(!!savedUser) // true only when auto-resuming session
  const [loggedIn, setLoggedIn] = useState(!!savedUser)
  const [currentUser, setCurrentUser] = useState(savedUser)
  const [accounts, setAccounts] = useState([])
  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [customers, setCustomers] = useState([])
  const [notifications] = useState([])
  const [toasts, setToasts] = useState([])
  const channelRef = useRef(null)

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // ── Load all data ──────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true)
    const [accs, its, txs, custs] = await Promise.all([
      supabase.from('accounts').select('*').order('id'),
      supabase.from('items').select('*').order('id'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('id'),
    ])
    if (accs.data) setAccounts(accs.data)
    if (its.data) setItems(its.data)
    if (txs.data) setTransactions(txs.data.map(dbToTx))
    if (custs.data) setCustomers(custs.data)
    setLoading(false)
  }

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return // Don't load data or subscribe when not logged in

    loadAll()

    const channel = supabase.channel('trekhouse-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, ({ eventType, new: row, old }) => {
        if (eventType === 'INSERT') setItems(prev => [...prev, row])
        if (eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === row.id ? row : i))
        if (eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, ({ eventType, new: row, old }) => {
        if (eventType === 'INSERT') setTransactions(prev => [dbToTx(row), ...prev])
        if (eventType === 'UPDATE') setTransactions(prev => prev.map(t => t.id === row.id ? dbToTx(row) : t))
        if (eventType === 'DELETE') setTransactions(prev => prev.filter(t => t.id !== old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, ({ eventType, new: row, old }) => {
        if (eventType === 'INSERT') setCustomers(prev => [...prev, row])
        if (eventType === 'UPDATE') setCustomers(prev => prev.map(c => c.id === row.id ? row : c))
        if (eventType === 'DELETE') setCustomers(prev => prev.filter(c => c.id !== old.id))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, ({ eventType, new: row, old }) => {
        if (eventType === 'INSERT') setAccounts(prev => [...prev, row])
        if (eventType === 'UPDATE') setAccounts(prev => prev.map(a => a.id === row.id ? row : a))
        if (eventType === 'DELETE') setAccounts(prev => prev.filter(a => a.id !== old.id))
      })
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [loggedIn])

  // ── Auth ───────────────────────────────────────────────────────────────────
  const doLogin = useCallback(async (username, password) => {
    const SEED_ACCOUNTS = [
      { id: 1, username: 'superadmin', password: 'super123', name: 'Super Admin', role: 'superadmin' },
      { id: 2, username: 'admin',      password: 'admin123', name: 'Admin Utama', role: 'admin' },
      { id: 3, username: 'staff',      password: 'staff123', name: 'Staff Operasional', role: 'staff' },
    ]

    let { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle()

    // Fallback: jika DB kosong/belum di-seed, pakai akun default
    if (!data && !error) {
      data = SEED_ACCOUNTS.find(a => a.username === username && a.password === password) || null
      // Coba seed tabel accounts jika masih kosong
      if (data) {
        await supabase.from('accounts').upsert(SEED_ACCOUNTS, { onConflict: 'username' })
      }
    }

    if (data) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data, loginAt: Date.now() }))
      setCurrentUser(data)
      setLoading(true)
      setLoggedIn(true)
      showToast(`Selamat datang, ${data.name}!`, 'success')
      return true
    }
    return false
  }, [showToast])

  const doLogout = useCallback(() => {
    setLoggedIn(false)
    setCurrentUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  // ── Stock helper ───────────────────────────────────────────────────────────
  const getAvailableStock = useCallback((item) => {
    return item.total_stock || 0
  }, [])

  // ── Items CRUD ─────────────────────────────────────────────────────────────
  const addItem = useCallback(async (form) => {
    const { data, error } = await supabase.from('items').insert([{
      sku: form.sku, name: form.name, category: form.category,
      variation: form.variation, size: form.size || '',
      rental_price: form.rental_price, purchase_price: form.purchase_price,
      total_stock: form.total_stock, notes: form.notes,
    }]).select().single()
    if (error) { showToast('Gagal menambah item: ' + error.message, 'error'); return false }
    if (data) setItems(prev => [...prev, data])
    showToast('Item baru ditambahkan!', 'success')
    return true
  }, [showToast])

  const updateItem = useCallback(async (id, form) => {
    const { data, error } = await supabase.from('items').update({
      sku: form.sku, name: form.name, category: form.category,
      variation: form.variation, size: form.size || '',
      rental_price: form.rental_price, purchase_price: form.purchase_price,
      total_stock: form.total_stock, notes: form.notes,
    }).eq('id', id).select().single()
    if (error) { showToast('Gagal update item: ' + error.message, 'error'); return false }
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i))
    showToast('Item diperbarui!', 'success')
    return true
  }, [showToast])

  const deleteItem = useCallback(async (id) => {
    const item = items.find(i => i.id === id)
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) { showToast('Gagal hapus item: ' + error.message, 'error'); return false }
    setItems(prev => prev.filter(i => i.id !== id))
    showToast(`${item?.name} dihapus`, 'success')
    return true
  }, [items, showToast])

  const bulkImportItems = useCallback(async (rows) => {
    let success = 0
    const errors = []
    for (const row of rows) {
      const { data, error } = await supabase.from('items').insert([{ ...row, size: row.size || '' }]).select().single()
      if (error) errors.push(`${row.name}: ${error.message}`)
      else { success++; if (data) setItems(prev => [...prev, data]) }
    }
    if (success > 0) showToast(`${success} item berhasil diimport!`, 'success')
    return { success, failed: errors.length, errors }
  }, [showToast])

  // ── Transactions CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx) => {
    const { error } = await supabase.from('transactions').insert([txToDb(tx)])
    if (error) { showToast('Gagal simpan transaksi: ' + error.message, 'error'); return false }
    // Also upsert customer record
    const existing = customers.find(c => c.phone.replace(/\D/g,'') === tx.phone.replace(/\D/g,''))
    if (existing) {
      await supabase.from('customers').update({
        total_rentals: existing.total_rentals + 1,
        total_spent: existing.total_spent + tx.subtotal,
        tier: getTier(existing.total_rentals + 1),
      }).eq('id', existing.id)
    } else {
      await supabase.from('customers').insert([{
        name: tx.name, phone: tx.phone.replace(/\D/g,''),
        id_type: tx.idType || 'KTP', id_number: tx.idNumber || '',
        total_rentals: 1, tier: 'Bronze', total_spent: tx.subtotal,
      }])
    }
    showToast(`Transaksi ${tx.id} disimpan!`, 'success')
    return true
  }, [customers, showToast])

  const updateTransaction = useCallback(async (id, updates) => {
    const current = transactions.find(t => t.id === id)
    if (!current) return false
    const merged = { ...current, ...updates }
    const { error } = await supabase.from('transactions').update(txToDb(merged)).eq('id', id)
    if (error) { showToast('Gagal update transaksi: ' + error.message, 'error'); return false }
    return true
  }, [transactions, showToast])

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { showToast('Gagal hapus transaksi: ' + error.message, 'error'); return false }
    showToast(`Transaksi ${id} dihapus`, 'success')
    return true
  }, [showToast])

  // ── Accounts CRUD ──────────────────────────────────────────────────────────
  const addAccount = useCallback(async (form) => {
    const exists = accounts.find(a => a.username === form.username)
    if (exists) { showToast('Username sudah ada!', 'error'); return false }
    const { error } = await supabase.from('accounts').insert([form])
    if (error) { showToast('Gagal tambah akun: ' + error.message, 'error'); return false }
    showToast(`Akun @${form.username} ditambahkan`, 'success')
    return true
  }, [accounts, showToast])

  const removeAccount = useCallback(async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) { showToast('Gagal hapus akun: ' + error.message, 'error'); return false }
    showToast('Akun dihapus', 'success')
    return true
  }, [showToast])

  const markAllRead = useCallback(() => {}, [])

  // ── Computed ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length
  const lowStockItems = items.filter(i => getAvailableStock(i) <= 2)

  // Jatuh tempo: transaksi aktif yang tanggal kembalinya hari ini atau besok (H-1)
  const dueTodayTx = (() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayAfter = new Date(today.getTime() + 2 * 86400000)
    return transactions.filter(t => {
      if (t.status !== 'Sedang Disewa' && t.status !== 'Booked') return false
      const ret = parseDate(t.return)
      if (!ret || isNaN(ret)) return false
      const retDay = new Date(ret.getFullYear(), ret.getMonth(), ret.getDate())
      return retDay >= today && retDay < dayAfter
    })
  })()

  const activeTx = transactions.filter(t => t.status === 'Sedang Disewa' || t.status === 'Booked')

  const todayRevenue = transactions
    .filter(t => t.status !== 'Booked')
    .reduce((s, t) => s + t.subtotal + (t.penalty || 0), 0)

  return (
    <AppContext.Provider value={{
      loading, loggedIn, currentUser, accounts, items, transactions, customers, notifications, toasts,
      doLogin, doLogout, showToast, getAvailableStock,
      addItem, updateItem, deleteItem, bulkImportItems,
      addTransaction, updateTransaction, deleteTransaction,
      addAccount, removeAccount, markAllRead,
      unreadCount, lowStockItems, dueTodayTx, activeTx, todayRevenue,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

function getTier(totalRentals) {
  if (totalRentals >= 7) return 'Gold'
  if (totalRentals >= 4) return 'Silver'
  return 'Bronze'
}
