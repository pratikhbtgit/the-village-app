const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}))
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  if (req.method === 'DELETE') {
    console.log(`[DELETE PAYLOAD] Params:`, req.params, `Body:`, req.body);
  }
  next();
});

const dbPath = process.env.DB_PATH || './village.sqlite';
const db = new sqlite3.Database(dbPath);

const JWT_SECRET = process.env.JWT_SECRET || 'secure-village-production-key-2026';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.includes(':')) return password === stored;
  const [salt, key] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return key === hash;
}

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateToken(user) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
  id: user.id,
  username: user.username,
  role: user.role,
  volunteer_id: user.volunteer_id || null, 
  permissions: user.permissions || [],
  exp: Date.now() + 86400000
}));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.${signature}`;
}

function query(res, sql, params = []) {
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Query Error:', err.message, 'SQL:', sql);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}

function execute(res, sql, params = []) {
  db.run(sql, params, function (err) {
    if (err) {
      console.error('Execute Error:', err.message, 'SQL:', sql);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, changes: this.changes, lastID: this.lastID });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function getUserWithPermissionsByUsername(username) {
  const user = await dbGet(
    `
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.role_id,
      u.volunteer_id,
      u.is_active,
      u.created_at,
      u.resetToken,
      u.resetTokenExpires,
      r.name AS role
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.username = ?
    `,
    [username]
  );

  if (!user) return null;

  const permissionRows = await dbAll(
    `
    SELECT DISTINCT p.key
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ?
    ORDER BY p.key
    `,
    [user.id]
  );

  return {
    ...user,
    permissions: permissionRows.map((p) => p.key)
  };
}

async function getUserWithPermissionsById(id) {
  const user = await dbGet(
    `
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.role_id,
      u.volunteer_id,
      u.is_active,
      u.created_at,
      u.resetToken,
      u.resetTokenExpires,
      r.name AS role
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
    `,
    [id]
  );

  if (!user) return null;

  const permissionRows = await dbAll(
    `
    SELECT DISTINCT p.key
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ?
    ORDER BY p.key
    `,
    [id]
  );

  return {
    ...user,
    permissions: permissionRows.map((p) => p.key)
  };
}

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication missing. Please log in.' });

  try {
    const [header, payloadObj, signature] = token.split('.');
    const validSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payloadObj}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== validSignature) throw new Error('Invalid signature');

    const payload = JSON.parse(Buffer.from(payloadObj, 'base64').toString());
    if (payload.exp < Date.now()) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    req.user = payload;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid session token' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: `Permission required: ${permission}` });
    }
    next();
  };
}

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (permission_id) REFERENCES permissions(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      volunteer_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (volunteer_id) REFERENCES Volunteers(ID)
    )
  `);

  db.run(`ALTER TABLE users ADD COLUMN resetToken TEXT`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN resetTokenExpires DATETIME`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN volunteer_id INTEGER`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`, () => {});

  db.run(`
    INSERT OR IGNORE INTO roles (id, name, description) VALUES
    (1, 'admin', 'Full system access'),
    (2, 'volunteer', 'Volunteer staff access'),
    (3, 'inventory_manager', 'Can manage inventory and checkouts'),
    (4, 'reports_viewer', 'Can view reports only')
  `);

  db.run(`
    INSERT OR IGNORE INTO permissions (id, key, description) VALUES
    (1, 'volunteers.read', 'View volunteers'),
    (2, 'volunteers.create', 'Create volunteers'),
    (3, 'volunteers.update', 'Update volunteers'),
    (4, 'volunteers.delete', 'Delete volunteers'),
    (5, 'volunteerHours.read', 'View volunteer hours'),
    (6, 'volunteerHours.checkin', 'Check volunteers in'),
    (7, 'volunteerHours.checkout', 'Check volunteers out'),
    (8, 'visitors.read', 'View visitors'),
    (9, 'visitors.create', 'Create visitors'),
    (10, 'visitors.update', 'Update visitors'),
    (11, 'visitors.delete', 'Delete visitors'),
    (12, 'items.read', 'View inventory items'),
    (13, 'items.create', 'Create inventory items'),
    (14, 'items.update', 'Update inventory items'),
    (15, 'items.delete', 'Delete inventory items'),
    (16, 'checkouts.read', 'View checkout history'),
    (17, 'checkouts.create', 'Create item checkouts'),
    (18, 'checkouts.delete', 'Delete item checkouts'),
    (19, 'reports.read', 'View reports'),
    (20, 'users.read', 'View users'),
    (21, 'users.create', 'Create users'),
    (22, 'users.update', 'Update users'),
    (23, 'users.delete', 'Delete users'),
    (24, 'roles.manage', 'Manage roles and permissions')
  `);

  db.run(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
    (1,1),(1,2),(1,3),(1,4),
    (1,5),(1,6),(1,7),
    (1,8),(1,9),(1,10),(1,11),
    (1,12),(1,13),(1,14),(1,15),
    (1,16),(1,17),(1,18),
    (1,19),(1,20),(1,21),(1,22),(1,23),(1,24),

    (2,1),
    (2,5),(2,6),(2,7),
    (2,8),(2,9),
    (2,12),
    (2,16),(2,17),

    (3,12),(3,13),(3,14),(3,15),
    (3,16),(3,17),
    (3,8),(3,9),(3,10),

    (4,19)
  `);

  const defaultHash = hashPassword('admin');
  db.run(`
    INSERT OR IGNORE INTO users (id, username, password_hash, role_id, is_active)
    VALUES (1, 'admin', ?, 1, 1)
  `, [defaultHash]);
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await getUserWithPermissionsByUsername(username);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password credentials' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password credentials' });
    }

    const token = generateToken(user);
    const userOutput = {
      id: user.id,
      username: user.username,
      role: user.role || 'volunteer',
      role_id: user.role_id,
      volunteer_id: user.volunteer_id,
      permissions: user.permissions || []
    };

    res.json({ success: true, token, user: userOutput });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const row = await dbGet(`SELECT id FROM users WHERE username = ?`, [username]);
    if (!row) return res.status(404).json({ error: 'User not found' });

    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    await dbRun(
      `UPDATE users SET resetToken = ?, resetTokenExpires = datetime('now', '+1 hour') WHERE id = ?`,
      [resetToken, row.id]
    );

    res.json({
      success: true,
      message: 'Reset token generated (simulation only).',
      token: resetToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { username, token, newPassword } = req.body;
    if (!username || !token || !newPassword) {
      return res.status(400).json({ error: 'Username, token, and new password are required' });
    }

    const row = await dbGet(
      `SELECT id FROM users WHERE username = ? AND resetToken = ? AND resetTokenExpires > datetime('now')`,
      [username, token]
    );

    if (!row) return res.status(400).json({ error: 'Invalid or expired reset token' });

    await dbRun(
      `UPDATE users SET password_hash = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?`,
      [hashPassword(newPassword), row.id]
    );

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', authenticate);

app.post('/api/register', requirePermission('users.create'), async (req, res) => {
  try {
    const { username, password, role, volunteer_id } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const roleRow = await dbGet(`SELECT id, name FROM roles WHERE name = ?`, [role || 'volunteer']);
    if (!roleRow) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    await dbRun(
      `INSERT INTO users (username, password_hash, role_id, volunteer_id, is_active) VALUES (?, ?, ?, ?, 1)`,
      [username, hashPassword(password), roleRow.id, volunteer_id || null]
    );

    res.json({ success: true, message: 'User added officially' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', requirePermission('users.read'), (req, res) => {
  query(
    res,
    `
    SELECT
      u.id,
      u.username,
      r.name AS role,
      u.role_id,
      u.volunteer_id,
      u.is_active,
      u.created_at
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.id DESC
    `
  );
});

app.put('/api/users/:id', requirePermission('users.update'), async (req, res) => {
  try {
    const { password, role, volunteer_id, is_active } = req.body;

    if (role) {
      const roleRow = await dbGet(`SELECT id FROM roles WHERE name = ?`, [role]);
      if (!roleRow) {
        return res.status(400).json({ error: 'Invalid role selected' });
      }

      if (password) {
        await dbRun(
          `UPDATE users SET password_hash = ?, role_id = ?, volunteer_id = ?, is_active = COALESCE(?, is_active) WHERE id = ?`,
          [hashPassword(password), roleRow.id, volunteer_id || null, is_active, req.params.id]
        );
      } else {
        await dbRun(
          `UPDATE users SET role_id = ?, volunteer_id = ?, is_active = COALESCE(?, is_active) WHERE id = ?`,
          [roleRow.id, volunteer_id || null, is_active, req.params.id]
        );
      }
    } else if (password) {
      await dbRun(
        `UPDATE users SET password_hash = ?, volunteer_id = COALESCE(?, volunteer_id), is_active = COALESCE(?, is_active) WHERE id = ?`,
        [hashPassword(password), volunteer_id, is_active, req.params.id]
      );
    } else {
      await dbRun(
        `UPDATE users SET volunteer_id = COALESCE(?, volunteer_id), is_active = COALESCE(?, is_active) WHERE id = ?`,
        [volunteer_id, is_active, req.params.id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requirePermission('users.delete'), async (req, res) => {
  try {
    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    await dbRun(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/roles', requirePermission('users.read'), (req, res) => {
  query(res, `SELECT id, name, description FROM roles ORDER BY id`);
});

app.get('/api/me', async (req, res) => {
  try {
    const user = await getUserWithPermissionsById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      username: user.username,
      role: user.role || 'volunteer',
      role_id: user.role_id,
      volunteer_id: user.volunteer_id,
      permissions: user.permissions || [],
      is_active: user.is_active
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/volunteers', requirePermission('volunteers.read'), (req, res) => {
  query(res, 'SELECT * FROM Volunteers ORDER BY ID DESC');
});

app.post('/api/volunteers', requirePermission('volunteers.create'), (req, res) => {
  const { firstname, lastname, phone, email, Qrcode } = req.body;
  const sql = `INSERT INTO Volunteers (firstname, lastname, phone, email, Qrcode, dateadded) VALUES (?, ?, ?, ?, ?, datetime('now'))`;
  execute(res, sql, [firstname, lastname, phone, email, Qrcode]);
});

app.put('/api/volunteers/:id', requirePermission('volunteers.update'), (req, res) => {
  const { firstname, lastname, phone, email, Qrcode } = req.body;
  const sql = `UPDATE Volunteers SET firstname=?, lastname=?, phone=?, email=?, Qrcode=? WHERE ID=?`;
  execute(res, sql, [firstname, lastname, phone, email, Qrcode, req.params.id]);
});

app.delete('/api/volunteers/:id', requirePermission('volunteers.delete'), async (req, res) => {
  try {
    await dbRun(`UPDATE users SET volunteer_id = NULL WHERE volunteer_id = ?`, [req.params.id]);
    await dbRun(`DELETE FROM volunteerHours WHERE volunterID = ?`, [req.params.id]);
    await dbRun(`DELETE FROM Volunteers WHERE ID = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/volunteerHours', requirePermission('volunteerHours.read'), (req, res) => {
  query(
    res,
    `
    SELECT vh.ID, v.firstname, v.lastname, vh.TimeIn, vh.TimeOut, vh.volunterID
    FROM volunteerHours vh
    INNER JOIN Volunteers v ON vh.volunterID = v.ID
    ORDER BY vh.TimeIn DESC
    `
  );
});

app.post('/api/volunteerHours/checkin', requirePermission('volunteerHours.checkin'), (req, res) => {
  const requestedID = parseInt(req.body.volunterID);
  if (req.user.role !== 'admin' && parseInt(req.user.volunteer_id) !== requestedID) {
    return res.status(403).json({ error: 'You can only check in yourself.' });
  }
  execute(res, `INSERT INTO volunteerHours (volunterID, TimeIn) VALUES (?, datetime('now'))`, [requestedID]);
});

app.post('/api/volunteerHours/checkout', requirePermission('volunteerHours.checkout'), (req, res) => {
  const requestedID = parseInt(req.body.volunterID);
  if (req.user.role !== 'admin' && parseInt(req.user.volunteer_id) !== requestedID) {
    return res.status(403).json({ error: 'You can only check out yourself.' });
  }
  db.get(`SELECT ID FROM volunteerHours WHERE volunterID=? AND TimeOut IS NULL ORDER BY TimeIn DESC LIMIT 1`, [requestedID], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) execute(res, `UPDATE volunteerHours SET TimeOut=datetime('now') WHERE ID=?`, [row.ID]);
    else res.status(404).json({ error: 'No open check-in found' });
  });
});

app.get('/api/visitors', requirePermission('visitors.read'), (req, res) => {
  query(res, 'SELECT * FROM Visitors ORDER BY VisitorID DESC');
});

app.post('/api/visitors', requirePermission('visitors.create'), (req, res) => {
  const { VName, Childfirstname, isfirstPlacement, RPMName, Region } = req.body;
  const sql = `INSERT INTO Visitors (VName, Childfirstname, visitDate, isfirstPlacement, RPMName, Region) VALUES (?, ?, datetime('now'), ?, ?, ?)`;
  execute(res, sql, [VName, Childfirstname, isfirstPlacement ? 1 : 0, RPMName, Region]);
});

app.put('/api/visitors/:id', requirePermission('visitors.update'), (req, res) => {
  const { VName, Childfirstname, isfirstPlacement, RPMName, Region } = req.body;
  const sql = `UPDATE Visitors SET VName=?, Childfirstname=?, isfirstPlacement=?, RPMName=?, Region=? WHERE VisitorID=?`;
  execute(res, sql, [VName, Childfirstname, isfirstPlacement ? 1 : 0, RPMName, Region, req.params.id]);
});

app.delete('/api/visitors/:id', requirePermission('visitors.delete'), (req, res) => {
  execute(res, 'DELETE FROM Visitors WHERE VisitorID=?', [req.params.id]);
});

app.get('/api/items', requirePermission('items.read'), (req, res) => {
  query(res, 'SELECT * FROM Items ORDER BY itemID DESC');
});

app.post('/api/items', requirePermission('items.create'), (req, res) => {
  const { ItemName, Category, Size, Condition, Amount, Quantity } = req.body;
  const sql = `INSERT INTO Items (ItemName, Category, Size, Condition, Amount, Quantity) VALUES (?, ?, ?, ?, ?, ?)`;
  execute(res, sql, [ItemName, parseInt(Category) || 1, Size, Condition, parseFloat(Amount) || 0, parseInt(Quantity) || 1]);
});

app.put('/api/items/:id', requirePermission('items.update'), (req, res) => {
  const { ItemName, Category, Size, Condition, Amount, Quantity } = req.body;
  const sql = `UPDATE Items SET ItemName=?, Category=?, Size=?, Condition=?, Amount=?, Quantity=? WHERE itemID=?`;
  execute(res, sql, [ItemName, parseInt(Category) || 1, Size, Condition, parseFloat(Amount) || 0, parseInt(Quantity) || 0, req.params.id]);
});

app.delete('/api/items/:id', requirePermission('items.delete'), (req, res) => {
  execute(res, 'DELETE FROM Items WHERE itemID=?', [req.params.id]);
});

app.get('/api/categories', requirePermission('items.read'), (req, res) => {
  query(res, 'SELECT * FROM Category');
});

app.get('/api/checkouts', requirePermission('checkouts.read'), (req, res) => {
  query(
    res,
    `
    SELECT c.checkoutID, c.CheckoutDate, c.Quanlity, i.ItemName, v.VName as VisitorName, v.Childfirstname
    FROM ItemCheckOut c
    LEFT JOIN Items i ON c.ItemID = i.itemID
    LEFT JOIN Visitors v ON c.VisitorID = v.VisitorID
    ORDER BY c.CheckoutDate DESC
    `
  );
});

app.post('/api/checkouts', requirePermission('checkouts.create'), (req, res) => {
  const { ItemID, VisitorID, Quantity } = req.body;
  const qty = parseInt(Quantity) || 1;

  db.get(`SELECT Quantity, ItemName FROM Items WHERE itemID=?`, [ItemID], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item not found in inventory' });
    if (row.Quantity < qty) {
      return res.status(400).json({ error: `Not enough stock. Only ${row.Quantity} ${row.ItemName} left.` });
    }

    const newQty = row.Quantity - qty;
    db.run(`UPDATE Items SET Quantity=? WHERE itemID=?`, [newQty, ItemID], function (e) {
      if (e) return res.status(500).json({ error: e.message });
      execute(
        res,
        `INSERT INTO ItemCheckOut (ItemID, VisitorID, Quanlity, CheckoutDate) VALUES (?, ?, ?, datetime('now'))`,
        [ItemID, VisitorID, qty]
      );
    });
  });
});

app.delete('/api/checkouts/:id', requirePermission('checkouts.delete'), (req, res) => {
  db.get('SELECT ItemID, Quanlity FROM ItemCheckOut WHERE checkoutID=?', [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(500).json({ error: err ? err.message : 'Not found' });
    }

    db.run('UPDATE Items SET Quantity = Quantity + ? WHERE itemID=?', [row.Quanlity, row.ItemID], (err2) => {
      if (err2) console.error('Error restoring checkout quantity');
      execute(res, 'DELETE FROM ItemCheckOut WHERE checkoutID=?', [req.params.id]);
    });
  });
});

app.get('/api/reports/summary', requirePermission('reports.read'), async (req, res) => {
  try {
    const [items, hours, checkouts, visitors] = await Promise.all([
      dbAll(`SELECT * FROM Items`),
      dbAll(`SELECT * FROM volunteerHours`),
      dbAll(`SELECT * FROM ItemCheckOut`),
      dbAll(`SELECT * FROM Visitors`)
    ]);

    res.json({
      lowStock: items.filter(i => i.Quantity <= 5).length,
      totalItems: items.length,
      totalVisitors: visitors.length,
      totalCheckouts: checkouts.length,
      totalVolunteerSessions: hours.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});