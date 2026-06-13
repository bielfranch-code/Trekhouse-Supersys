-- =============================================
-- TrekingHouse SuperSys — Supabase Setup SQL
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. CREATE TABLES

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  variation TEXT DEFAULT '',
  rental_price INTEGER DEFAULT 0,
  purchase_price INTEGER DEFAULT 0,
  total_stock INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pickup TEXT NOT NULL,
  return_date TEXT NOT NULL,
  items_text TEXT NOT NULL,
  item_ids INTEGER[] DEFAULT '{}',
  item_qtys INTEGER[] DEFAULT '{}',
  subtotal INTEGER DEFAULT 0,
  penalty INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Booked',
  return_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_type TEXT DEFAULT 'KTP',
  id_number TEXT DEFAULT '',
  total_rentals INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'Bronze',
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  msg TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISABLE ROW LEVEL SECURITY (re-enable with proper auth later)
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 3. ENABLE REAL-TIME ON ALL TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 4. SEED: Accounts
INSERT INTO accounts (username, password, name, role) VALUES
  ('superadmin', 'super123', 'Super Admin', 'superadmin'),
  ('admin', 'admin123', 'Admin Utama', 'admin'),
  ('staff', 'staff123', 'Staff Operasional', 'staff')
ON CONFLICT (username) DO NOTHING;

-- 5. SEED: Items
INSERT INTO items (sku, name, category, variation, rental_price, purchase_price, total_stock, notes) VALUES
  ('TND-001', 'Tenda Kapasitas 4P Consina', 'Tenda', 'Standard', 75000, 850000, 5, ''),
  ('TND-002', 'Tenda Kapasitas 2P Eiger', 'Tenda', 'Compact', 55000, 650000, 4, ''),
  ('CRR-012', 'Carrier 60L Eiger', 'Carrier', 'Size L', 50000, 650000, 8, ''),
  ('CRR-013', 'Carrier 45L Deuter', 'Carrier', 'Size M', 40000, 520000, 6, ''),
  ('SLB-004', 'Sleeping Bag -5°C Consina', 'Sleeping Bag', 'Winter', 35000, 350000, 10, ''),
  ('SEP-009', 'Sepatu Hiking Consina 42', 'Sepatu', 'Size 42', 40000, 480000, 4, 'Sol mulai lepas'),
  ('KMP-003', 'Kompor Portable + Gas', 'Kompor', 'Standard', 25000, 180000, 12, ''),
  ('MTR-001', 'Matras Sleeping Pad', 'Matras', 'Standard', 15000, 120000, 15, '');

-- 6. SEED: Transactions
INSERT INTO rentals (id, name, phone, pickup, return_date, items_text, item_ids, item_qtys, subtotal, penalty, status, return_note) VALUES
  ('TRX-2401-001', 'Budi Santoso', '628123456789', '20 Jan 2024', '24 Jan 2024', 'Tenda 4P Consina, Carrier 60L', ARRAY[1,3], ARRAY[1,1], 500000, 0, 'Sedang Disewa', ''),
  ('TRX-2401-002', 'Siti Rahma', '628571234567', '21 Jan 2024', '25 Jan 2024', 'Sleeping Bag x2', ARRAY[5], ARRAY[2], 140000, 0, 'Booked', ''),
  ('TRX-2401-003', 'Agus Wibowo', '628789876543', '15 Jan 2024', '19 Jan 2024', 'Kompor + Matras', ARRAY[7,8], ARRAY[1,1], 180000, 0, 'Sudah Dikembalikan', ''),
  ('TRX-2401-004', 'Dewi Lestari', '628215678123', '22 Jan 2024', '26 Jan 2024', 'Tenda 2P, Sepatu 42', ARRAY[2,6], ARRAY[1,1], 290000, 50000, 'Terlambat', ''),
  ('TRX-2401-005', 'Reza Pratama', '628119876543', '18 Jan 2024', '22 Jan 2024', 'Carrier 45L, Sleeping Bag', ARRAY[4,5], ARRAY[1,2], 300000, 0, 'Sudah Dikembalikan', '');

-- 7. SEED: Customers
INSERT INTO customers (name, phone, id_type, id_number, total_rentals, tier, total_spent) VALUES
  ('Budi Santoso', '0812-3456-789', 'KTP', '3174xxx', 5, 'Silver', 2100000),
  ('Siti Rahma', '0857-1234-567', 'KTM', '1901xxx', 2, 'Bronze', 560000),
  ('Agus Wibowo', '0878-9876-543', 'KTP', '3201xxx', 8, 'Gold', 4800000),
  ('Dewi Lestari', '0821-5678-123', 'SIM', 'B-xxx', 3, 'Bronze', 850000),
  ('Reza Pratama', '0811-9876-543', 'KTP', '3173xxx', 6, 'Silver', 3100000);

-- 8. SEED: Notifications
INSERT INTO notifications (type, title, msg, read) VALUES
  ('danger', 'Dewi Lestari Terlambat', 'Tenda 2P belum dikembalikan', FALSE),
  ('warning', 'Stok Sepatu Menipis', 'SEP-009 ukuran 42 stok kritis', FALSE),
  ('warning', 'Stok Tenda Menipis', 'TND-001 tersisa sedikit', TRUE),
  ('info', 'Transaksi Baru', 'TRX-2401-005 selesai', TRUE);
