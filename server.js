const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    if (req.method === 'DELETE') {
        console.log(`[DELETE PAYLOAD] Params:`, req.params, `Body:`, req.body);
    }
    next();
});

const dbPath = process.env.DB_PATH || './village.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    resetToken TEXT,
    resetTokenExpires DATETIME
  )`, (err) => {
    if (err) console.error("Error creating users table:", err.message);
  });

  // Safely attempt to add the role column for backwards compatibility
  db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'volunteer'`, (err) => {
      // It's fine if this errors out (meaning the column already exists)
      
      // Now it's safe to update existing admin and insert default
      db.run(`UPDATE users SET role = 'admin' WHERE username = 'admin'`);
      const defaultHash = hashPassword('admin');
      db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '${defaultHash}', 'admin')`);
  });
});

// Utility to handle queries
function query(res, sql, params = []) {
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Query Error:", err.message, "SQL:", sql);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}

function execute(res, sql, params = []) {
  db.run(sql, params, function(err) {
    if (err) {
      console.error("Execute Error:", err.message, "SQL:", sql);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, changes: this.changes, lastID: this.lastID });
  });
}

// Security Helpers
const crypto = require('crypto');
const JWT_SECRET = 'secure-village-production-key-2026'; // Should be in .env

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored.includes(':')) return password === stored; // Allow legacy plain text to login
    const [salt, key] = stored.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return key === hash;
}

function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateToken(user) {
    const header = base64url(JSON.stringify({alg: "HS256", typ: "JWT"}));
    const payload = base64url(JSON.stringify({id: user.id, username: user.username, role: user.role || 'volunteer', exp: Date.now() + 86400000})); // 24h
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${header}.${payload}.${signature}`;
}

// Authentication Middlewares
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({error: 'Authentication missing. Please log in.'});

    try {
        const [header, payloadObj, signature] = token.split('.');
        const validSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadObj}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        if (signature !== validSignature) throw new Error();
        
        const payload = JSON.parse(Buffer.from(payloadObj, 'base64').toString());
        if (payload.exp < Date.now()) return res.status(401).json({error: 'Session expired. Please log in again.'});
        
        req.user = payload;
        next();
    } catch (e) {
        return res.status(403).json({error: 'Invalid session token'});
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({error: 'Admin clearance required for this action.'});
    }
    next();
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && verifyPassword(password, row.password)) {
            // Upgrade legacy text passwords instantly upon login
            if (!row.password.includes(':')) {
                db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashPassword(password), row.id]);
            }
            const token = generateToken(row);
            const userOutput = { id: row.id, username: row.username, role: row.role || 'volunteer' };
            res.json({ success: true, token, user: userOutput });
        } else {
            res.status(401).json({ error: 'Invalid username or password credentials' });
        }
    });
});

// Admin ONLY: Register an account
app.post('/api/register', authenticate, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    const assignedRole = role === 'admin' ? 'admin' : 'volunteer';
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashPassword(password), assignedRole], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'User added officially' });
    });
});

// Admin ONLY: Manage Users
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
    // Exclude passwords from response
    query(res, 'SELECT id, username, role FROM users ORDER BY id DESC');
});

app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    const { password, role } = req.body;
    if (password) {
        const sql = `UPDATE users SET password=?, role=? WHERE id=?`;
        execute(res, sql, [hashPassword(password), role, req.params.id]);
    } else {
        const sql = `UPDATE users SET role=? WHERE id=?`;
        execute(res, sql, [role, req.params.id]);
    }
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
    execute(res, 'DELETE FROM users WHERE id=?', [req.params.id]);
});

app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars simple token for demo
        // Expire in 1 hour
        db.run(`UPDATE users SET resetToken = ?, resetTokenExpires = datetime('now', '+1 hour') WHERE id = ?`, [resetToken, row.id], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            // In a real app we would email this token. Here we just return it in the response for demo purposes.
            res.json({ success: true, message: 'Reset token generated (simulation only).', token: resetToken });
        });
    });
});

app.post('/api/reset-password', (req, res) => {
    const { username, token, newPassword } = req.body;
    if (!username || !token || !newPassword) return res.status(400).json({ error: 'Username, token, and new password are required' });

    db.get(`SELECT id FROM users WHERE username = ? AND resetToken = ? AND resetTokenExpires > datetime('now')`, [username, token], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(400).json({ error: 'Invalid or expired reset token' });

        db.run(`UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?`, [hashPassword(newPassword), row.id], function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, message: 'Password has been reset successfully' });
        });
    });
});

// Protect all following routes
app.use('/api', authenticate);

// Volunteers
app.get('/api/volunteers', (req, res) => query(res, 'SELECT * FROM Volunteers ORDER BY ID DESC'));
app.post('/api/volunteers', requireAdmin, (req, res) => {
  const { firstname, lastname, phone, email, Qrcode } = req.body;
  const sql = `INSERT INTO Volunteers (firstname, lastname, phone, email, Qrcode, dateadded) VALUES (?, ?, ?, ?, ?, datetime('now'))`;
  execute(res, sql, [firstname, lastname, phone, email, Qrcode]);
});
app.put('/api/volunteers/:id', requireAdmin, (req, res) => {
    const { firstname, lastname, phone, email, Qrcode } = req.body;
    const sql = `UPDATE Volunteers SET firstname=?, lastname=?, phone=?, email=?, Qrcode=? WHERE ID=?`;
    execute(res, sql, [firstname, lastname, phone, email, Qrcode, req.params.id]);
});
app.delete('/api/volunteers/:id', requireAdmin, (req, res) => {
    execute(res, 'DELETE FROM Volunteers WHERE ID=?', [req.params.id]);
});

// Volunteer Hours
app.get('/api/volunteerHours', (req, res) => {
    query(res, `SELECT vh.ID, v.firstname, v.lastname, vh.TimeIn, vh.TimeOut, vh.volunterID FROM volunteerHours vh INNER JOIN Volunteers v ON vh.volunterID = v.ID ORDER BY vh.TimeIn DESC`);
});
app.post('/api/volunteerHours/checkin', (req, res) => {
    execute(res, `INSERT INTO volunteerHours (volunterID, TimeIn) VALUES (?, datetime('now'))`, [req.body.volunterID]);
});
app.post('/api/volunteerHours/checkout', (req, res) => {
    const { volunterID } = req.body;
    db.get(`SELECT ID FROM volunteerHours WHERE volunterID=? AND TimeOut IS NULL ORDER BY TimeIn DESC LIMIT 1`, [volunterID], (err, row) => {
        if (err) return res.status(500).json({error: err.message});
        if (row) execute(res, `UPDATE volunteerHours SET TimeOut=datetime('now') WHERE ID=?`, [row.ID]);
        else res.status(404).json({ error: 'No open check-in found' });
    });
});

// Visitors
app.get('/api/visitors', (req, res) => query(res, 'SELECT * FROM Visitors ORDER BY VisitorID DESC'));
app.post('/api/visitors', (req, res) => {
  const { VName, Childfirstname, isfirstPlacement, RPMName, Region } = req.body;
  const sql = `INSERT INTO Visitors (VName, Childfirstname, visitDate, isfirstPlacement, RPMName, Region) VALUES (?, ?, datetime('now'), ?, ?, ?)`;
  execute(res, sql, [VName, Childfirstname, isfirstPlacement ? 1 : 0, RPMName, Region]);
});
app.put('/api/visitors/:id', requireAdmin, (req, res) => {
    const { VName, Childfirstname, isfirstPlacement, RPMName, Region } = req.body;
    const sql = `UPDATE Visitors SET VName=?, Childfirstname=?, isfirstPlacement=?, RPMName=?, Region=? WHERE VisitorID=?`;
    execute(res, sql, [VName, Childfirstname, isfirstPlacement ? 1 : 0, RPMName, Region, req.params.id]);
});
app.delete('/api/visitors/:id', requireAdmin, (req, res) => {
    execute(res, 'DELETE FROM Visitors WHERE VisitorID=?', [req.params.id]);
});

// Items
app.get('/api/items', (req, res) => query(res, 'SELECT * FROM Items ORDER BY itemID DESC'));
app.post('/api/items', requireAdmin, (req, res) => {
  const { ItemName, Category, Size, Condition, Amount, Quantity } = req.body;
  const sql = `INSERT INTO Items (ItemName, Category, Size, Condition, Amount, Quantity) VALUES (?, ?, ?, ?, ?, ?)`;
  execute(res, sql, [ItemName, parseInt(Category)||1, Size, Condition, parseFloat(Amount)||0, parseInt(Quantity)||1]);
});
app.put('/api/items/:id', requireAdmin, (req, res) => {
  const { ItemName, Category, Size, Condition, Amount, Quantity } = req.body;
  const sql = `UPDATE Items SET ItemName=?, Category=?, Size=?, Condition=?, Amount=?, Quantity=? WHERE itemID=?`;
  execute(res, sql, [ItemName, parseInt(Category)||1, Size, Condition, parseFloat(Amount)||0, parseInt(Quantity)||0, req.params.id]);
});
app.delete('/api/items/:id', requireAdmin, (req, res) => {
    execute(res, 'DELETE FROM Items WHERE itemID=?', [req.params.id]);
});

// Categories (Helper endpoint)
app.get('/api/categories', (req, res) => query(res, 'SELECT * FROM Category'));

// CheckOuts (Giving Items to Visitors)
app.get('/api/checkouts', (req, res) => {
    query(res, `
        SELECT c.checkoutID, c.CheckoutDate, c.Quanlity, i.ItemName, v.VName as VisitorName, v.Childfirstname
        FROM ItemCheckOut c
        LEFT JOIN Items i ON c.ItemID = i.itemID
        LEFT JOIN Visitors v ON c.VisitorID = v.VisitorID
        ORDER BY c.CheckoutDate DESC
    `);
});

app.post('/api/checkouts', (req, res) => {
  const { ItemID, VisitorID, Quantity } = req.body;
  const qty = parseInt(Quantity) || 1;
  db.get(`SELECT Quantity, ItemName FROM Items WHERE itemID=?`, [ItemID], (err, row) => {
      if (err) return res.status(500).json({error: err.message});
      if (!row) return res.status(404).json({error: 'Item not found in inventory'});
      if (row.Quantity < qty) return res.status(400).json({error: `Not enough stock. Only ${row.Quantity} ${row.ItemName} left.`});
      
      const newQty = row.Quantity - qty;
      db.run(`UPDATE Items SET Quantity=? WHERE itemID=?`, [newQty, ItemID], function(e) {
          if (e) return res.status(500).json({error: e.message});
          execute(res, `INSERT INTO ItemCheckOut (ItemID, VisitorID, Quanlity, CheckoutDate) VALUES (?, ?, ?, datetime('now'))`, [ItemID, VisitorID, qty]);
      });
  });
});
app.delete('/api/checkouts/:id', requireAdmin, (req, res) => {
    // When deleting a checkout, should we return items to inventory? Yes, ideally.
    db.get('SELECT ItemID, Quanlity FROM ItemCheckOut WHERE checkoutID=?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(500).json({error: err ? err.message : 'Not found'});
        db.run('UPDATE Items SET Quantity = Quantity + ? WHERE itemID=?', [row.Quanlity, row.ItemID], (err2) => {
            if(err2) console.error("Error restoring checkout quantity");
            execute(res, 'DELETE FROM ItemCheckOut WHERE checkoutID=?', [req.params.id]);
        });
    });
});

// Serve the frontend static files in production
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Catch-all route for React Router (must be placed after all API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
