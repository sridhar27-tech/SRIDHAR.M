const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend HTML file on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'retail_billing_system.html'));
});

let db;

async function initDB() {
  db = await open({
    filename: './shopbill_pro.sqlite',
    driver: sqlite3.Database
  });

  // Create tables automatically so no manual setup is required
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      category_id INTEGER,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Walk-in Customer',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      payment_method TEXT DEFAULT 'Cash',
      subtotal REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      gst_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    INSERT OR IGNORE INTO categories (name) VALUES 
      ('Groceries'), ('Snacks'), ('Dairy'), ('Personal Care'), ('Household'), 
      ('Beverages'), ('Bakery'), ('Frozen Foods'), ('Meat & Seafood'), 
      ('Electronics'), ('Stationery'), ('Health & Beauty'), ('Sauces'), ('General');
  `);
}

// Helper to get or create category
async function getCategoryId(categoryName) {
  if (!categoryName) return null;
  const row = await db.get('SELECT id FROM categories WHERE name = ?', [categoryName]);
  if (row) return row.id;
  const result = await db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [categoryName]);
  return result.lastID;
}

// ═══════════ CATEGORIES API ═══════════
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await db.all('SELECT name FROM categories ORDER BY name ASC');
    res.json(rows.map(r => r.name));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ═══════════ PRODUCTS API ═══════════
app.get('/api/products', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT p.id, p.name, p.sku, c.name as category, p.price, p.stock, p.unit 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, category, price, stock, unit } = req.body;
    const catId = await getCategoryId(category);
    
    const result = await db.run(
      'INSERT INTO products (name, sku, category_id, price, stock, unit) VALUES (?, ?, ?, ?, ?, ?)',
      [name, sku, catId, price, stock, unit]
    );
    res.status(201).json({ id: result.lastID, message: 'Product created' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, price, stock, unit } = req.body;
    const catId = await getCategoryId(category);
    
    await db.run(
      'UPDATE products SET name=?, sku=?, category_id=?, price=?, stock=?, unit=? WHERE id=?',
      [name, sku, catId, price, stock, unit, id]
    );
    res.json({ message: 'Product updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ═══════════ BILLS API ═══════════
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await db.all(`
      SELECT b.id, b.invoice_no as invoiceNo, c.name as customerName, c.phone as customerPhone, 
             b.payment_method as paymentMethod, b.subtotal, b.discount_pct as discPct, 
             b.discount_amount as discount, b.gst_amount as gst, b.total, b.created_at as date
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      ORDER BY b.created_at ASC
    `);

    // Fetch items for all bills
    for (let bill of bills) {
      const items = await db.all(`
        SELECT product_id as productId, product_name as name, sku, unit_price as price, quantity as qty, subtotal
        FROM bill_items WHERE bill_id = ?
      `, [bill.id]);
      bill.items = items;
    }

    res.json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.post('/api/bills', async (req, res) => {
  try {
    const bill = req.body;
    
    await db.run('BEGIN TRANSACTION');
    
    // 1. Get or Create Customer
    let customerId = null;
    if (bill.customerName) {
      const cusRow = await db.get('SELECT id FROM customers WHERE phone = ? OR name = ? LIMIT 1', [bill.customerPhone, bill.customerName]);
      if (cusRow) {
        customerId = cusRow.id;
      } else {
        const cusRes = await db.run('INSERT INTO customers (name, phone) VALUES (?, ?)', [bill.customerName, bill.customerPhone]);
        customerId = cusRes.lastID;
      }
    }

    // 2. Insert Bill
    const billRes = await db.run(
      `INSERT INTO bills (invoice_no, customer_id, payment_method, subtotal, discount_pct, discount_amount, gst_amount, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bill.invoiceNo, customerId, bill.paymentMethod, bill.subtotal, bill.discPct, bill.discount, bill.gst, bill.total, new Date(bill.date).toISOString()]
    );
    const billId = billRes.lastID;

    // 3. Insert Bill Items and update stock
    for (const item of bill.items) {
      await db.run(
        `INSERT INTO bill_items (bill_id, product_id, product_name, sku, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [billId, item.productId, item.name, item.sku, item.price, item.qty, item.price * item.qty]
      );
      
      // Update stock
      await db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, item.productId]);
    }

    await db.run('COMMIT');
    res.status(201).json({ id: billId, message: 'Bill generated successfully' });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to generate bill', details: error.message });
  }
});

// ═══════════ MAINTENANCE API ═══════════
app.post('/api/clear-data', async (req, res) => {
  try {
    await db.run('BEGIN TRANSACTION');
    
    // Delete in correct order to respect foreign key constraints
    await db.run('DELETE FROM bill_items');
    await db.run('DELETE FROM bills');
    await db.run('DELETE FROM customers');
    await db.run('DELETE FROM products');
    await db.run('DELETE FROM categories');
    
    // Reset auto-increment counters
    await db.run("DELETE FROM sqlite_sequence WHERE name IN ('bill_items', 'bills', 'customers', 'products', 'categories')");
    
    // Re-insert default categories
    await db.run(`
      INSERT INTO categories (name) VALUES 
      ('Groceries'), ('Snacks'), ('Dairy'), ('Personal Care'), ('Household'), 
      ('Beverages'), ('Bakery'), ('Frozen Foods'), ('Meat & Seafood'), 
      ('Electronics'), ('Stationery'), ('Health & Beauty'), ('Sauces'), ('General')
    `);
    
    await db.run('COMMIT');
    res.json({ message: 'All data cleared and reset successfully' });
  } catch (error) {
    if (db) await db.run('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
});
