import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export const CATEGORIES = ['Tenda','Carrier','Sleeping Bag','Sepatu','Kompor','Matras','Aksesoris']

// ── DB row ↔ app shape mappers ──────────────────────────────────────────────
function dbToTx(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    pickup: row.pickup,
    return: row.return_date,
    items: row.items_text,
    itemIds: row.item_ids || [],
    itemQtys: row.item_qtys || [],
    subtotal: row.subtotal,
    penalty: row.penalty,
    status: row.status,
    returnNote: row.return_note,
    created_at: row.created_at,
  }
}

function txToDb(tx) {
  return {
    id: tx.id,
    name: tx.name,
    phone: tx.phone,
    pickup: tx.pickup,
    return_date: tx.return,
    items_text: tx.items,
    item_ids: tx.itemIds,
    item_qtys: tx.itemQtys,
    subtotal: tx.subtotal,
    penalty: tx.penalty,
    status: tx.status,
    return_note: tx.returnNote || '',
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
  const [notifications, setNotifications] = useState([])
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
    const [accs, its, txs, custs, notifs] = await Promise.all([
      supabase.from('accounts').select('*').order('id'),
      supabase.from('items').select('*').order('id'),
      supabase.from('rentals').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('id'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ])
    if (accs.data) setAccounts(accs.data)
    if (its.data) setItems(its.data)
    if (txs.data) setTransactions(txs.data.map(dbToTx))
    if (custs.data) setCustomers(custs.data)
    if (notifs.data) setNotifications(notifs.data)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, ({ eventType, new: row, old }) => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, ({ eventType, new: row, old }) => {
        if (eventType === 'INSERT') setNotifications(prev => [row, ...prev])
        if (eventType === 'UPDATE') setNotifications(prev => prev.map(n => n.id === row.id ? row : n))
        if (eventType === 'DELETE') setNotifications(prev => prev.filter(n => n.id !== old.id))
      })
      .subscribe()

    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [loggedIn])

  // ── Auth ───────────────────────────────────────────────────────────────────
  const doLogin = useCallback(async (username, password) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle()
    if (data && !error) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data, loginAt: Date.now() }))
      setCurrentUser(data)
      setLoading(true) // Show loading while initial data loads
      setLoggedIn(true) // Triggers useEffect → loadAll()
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
    let rented = 0
    transactions.forEach(t => {
      if (t.status === 'Sedang Disewa' || t.status === 'Booked' || t.status === 'Terlambat') {
        t.itemIds.forEach((iid, idx) => {
          if (iid === item.id) rented += (t.itemQtys[idx] || 1)
        })
      }
    })
    return Math.max(0, item.total_stock - rented)
  }, [transactions])

  // ── Items CRUD ─────────────────────────────────────────────────────────────
  const addItem = useCallback(async (form) => {
    const { error } = await supabase.from('items').insert([{
      sku: form.sku, name: form.name, category: form.category,
      variation: form.variation, rental_price: form.rental_price,
      purchase_price: form.purchase_price, total_stock: form.total_stock, notes: form.notes,
    }])
    if (error) { showToast('Gagal menambah item: ' + error.message, 'error'); return false }
    showToast('Item baru ditambahkan!', 'success')
    return true
  }, [showToast])

  const updateItem = useCallback(async (id, form) => {
    const { error } = await supabase.from('items').update({
      sku: form.sku, name: form.name, category: form.category,
      variation: form.variation, rental_price: form.rental_price,
      purchase_price: form.purchase_price, total_stock: form.total_stock, notes: form.notes,
    }).eq('id', id)
    if (error) { showToast('Gagal update item: ' + error.message, 'error'); return false }
    showToast('Item diperbarui!', 'success')
    return true
  }, [showToast])

  const deleteItem = useCallback(async (id) => {
    const item = items.find(i => i.id === id)
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) { showToast('Gagal hapus item: ' + error.message, 'error'); return false }
    showToast(`${item?.name} dihapus`, 'success')
    return true
  }, [items, showToast])

  // ── Transactions CRUD ──────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx) => {
    const { error } = await supabase.from('rentals').insert([txToDb(tx)])
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
    const { error } = await supabase.from('rentals').update(txToDb(merged)).eq('id', id)
    if (error) { showToast('Gagal update transaksi: ' + error.message, 'error'); return false }
    return true
  }, [transactions, showToast])

  const deleteTransaction = useCallback(async (id) => {
    const { error } = await supabase.from('rentals').delete().eq('id', id)
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

  // ── Notifications ──────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id)
    if (unread.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unread)
  }, [notifications])

  // ── Computed ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length
  const lowStockItems = items.filter(i => getAvailableStock(i) <= 2)
  const dueTodayTx = transactions.filter(t => t.status === 'Sedang Disewa' || t.status === 'Terlambat')
  const todayRevenue = transactions
    .filter(t => t.status !== 'Booked')
    .reduce((s, t) => s + t.subtotal + (t.penalty || 0), 0)

  return (
    <AppContext.Provider value={{
      loading, loggedIn, currentUser, accounts, items, transactions, customers, notifications, toasts,
      doLogin, doLogout, showToast, getAvailableStock,
      addItem, updateItem, deleteItem,
      addTransaction, updateTransaction, deleteTransaction,
      addAccount, removeAccount, markAllRead,
      unreadCount, lowStockItems, dueTodayTx, todayRevenue,
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
