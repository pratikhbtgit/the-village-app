const sqlite3 = require('sqlite3').verbose();
const ADODB = require('node-adodb');

const dbPath = 'C:\\Users\\Pratik.Patel\\Downloads\\SETUP\\SETUP\\villagedb\\THEVILLAGE.accdb';
const connection = ADODB.open(`Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${dbPath};Mode=Share Deny None;Persist Security Info=False;`, true);

const sqlite = new sqlite3.Database('./village.sqlite');

async function migrate() {
    sqlite.serialize(() => {
        // Create tables
        sqlite.run(`CREATE TABLE IF NOT EXISTS Volunteers (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT,
            lastname TEXT,
            phone TEXT,
            email TEXT,
            Qrcode TEXT,
            dateadded TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS volunteerHours (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            volunterID INTEGER,
            TimeIn TEXT,
            TimeOut TEXT,
            FOREIGN KEY(volunterID) REFERENCES Volunteers(ID)
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS Visitors (
            VisitorID INTEGER PRIMARY KEY AUTOINCREMENT,
            VName TEXT,
            Childfirstname TEXT,
            visitDate TEXT,
            isfirstPlacement INTEGER,
            RPMName TEXT,
            Region TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS Category (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS Items (
            itemID INTEGER PRIMARY KEY AUTOINCREMENT,
            ItemName TEXT,
            Category INTEGER,
            Size TEXT,
            Condition TEXT,
            Amount REAL,
            Quantity INTEGER
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS ItemCheckOut (
            checkoutID INTEGER PRIMARY KEY AUTOINCREMENT,
            ItemID INTEGER,
            VisitorID INTEGER,
            Quanlity INTEGER,
            CheckoutDate TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            description TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER NOT NULL,
            permission_id INTEGER NOT NULL,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id),
            FOREIGN KEY (permission_id) REFERENCES permissions(id)
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role_id INTEGER NOT NULL,
            volunteer_id INTEGER,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id),
            FOREIGN KEY (volunteer_id) REFERENCES Volunteers(ID)
        )`);
        
        sqlite.run(`INSERT OR IGNORE INTO roles (id, name, description) VALUES
            (1, 'admin', 'Full system access'),
            (2, 'volunteer', 'Volunteer staff access'),
            (3, 'inventory_manager', 'Can manage inventory and checkouts'),
            (4, 'reports_viewer', 'Can view reports only')
        `);

        sqlite.run(`INSERT OR IGNORE INTO permissions (id, key, description) VALUES
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

        sqlite.run(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
            -- admin gets everything
            (1,1),(1,2),(1,3),(1,4),
            (1,5),(1,6),(1,7),
            (1,8),(1,9),(1,10),(1,11),
            (1,12),(1,13),(1,14),(1,15),
            (1,16),(1,17),(1,18),
            (1,19),(1,20),(1,21),(1,22),(1,23),(1,24),

            -- volunteer
            (2,1),
            (2,5),(2,6),(2,7),
            (2,8),(2,9),
            (2,12),
            (2,16),(2,17),

            -- inventory manager
            (3,12),(3,13),(3,14),(3,15),
            (3,16),(3,17),
            (3,8),(3,9),(3,10),

            -- reports viewer
            (4,19)
        `);
    });

    try {
        const volunteers = await connection.query('SELECT * FROM Volunteers');
        const stmtVol = sqlite.prepare('INSERT OR IGNORE INTO Volunteers (ID, firstname, lastname, phone, email, Qrcode, dateadded) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const v of volunteers) {
        let d = v.dateadded;
        if (d && typeof d === 'object') d = v.dateadded.toISOString();
        else if (d) d = new Date(d).toISOString();
        stmtVol.run(v.ID, v.firstname, v.lastname, v.phone, v.email, v.Qrcode, d);
        }
        stmtVol.finalize();
        console.log(`Migrated ${volunteers.length} volunteers.`);

        const hours = await connection.query('SELECT * FROM volunteerHours');
        const stmtHrs = sqlite.prepare('INSERT OR IGNORE INTO volunteerHours (ID, volunterID, TimeIn, TimeOut) VALUES (?, ?, ?, ?)');
        for (const h of hours) {
        let tin = h.TimeIn;
        let tout = h.TimeOut;
        if (tin && typeof tin === 'object') tin = tin.toISOString();
        else if (tin) tin = new Date(tin).toISOString();
        if (tout && typeof tout === 'object') tout = tout.toISOString();
        else if (tout) tout = new Date(tout).toISOString();
        stmtHrs.run(h.ID, h.volunterID, tin, tout);
        }
        stmtHrs.finalize();
        console.log(`Migrated ${hours.length} volunteer hours.`);

        const items = await connection.query('SELECT * FROM Items');
        const stmtItems = sqlite.prepare('INSERT OR IGNORE INTO Items (itemID, ItemName, Category, Size, Condition, Amount, Quantity) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const i of items) {
        let am = typeof i.Amount === 'number' ? i.Amount : 0;
        stmtItems.run(i.itemID, i.ItemName, parseInt(i.Category), i.Size, i.Condition, am, parseInt(i.Quantity));
        }
        stmtItems.finalize();
        console.log(`Migrated ${items.length} items.`);

        const cats = await connection.query('SELECT * FROM Category');
        const stmtCats = sqlite.prepare('INSERT OR IGNORE INTO Category (ID, category) VALUES (?, ?)');
        for (const c of cats) {
        stmtCats.run(c.ID, c.category);
        }
        stmtCats.finalize();
        console.log(`Migrated ${cats.length} categories.`);

        const visitors = await connection.query('SELECT * FROM Visitors');
        const stmtVisitors = sqlite.prepare('INSERT OR IGNORE INTO Visitors (VisitorID, VName, Childfirstname, visitDate, isfirstPlacement, RPMName, Region) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const v of visitors) {
        let vd = v.visitDate;
        if (vd && typeof vd === 'object') vd = vd.toISOString();
        else if (vd) vd = new Date(vd).toISOString();
        stmtVisitors.run(v.VisitorID, v.VName, v.Childfirstname, vd, v.isfirstPlacement, v.RPMName, v.Region);
        }
        stmtVisitors.finalize();
        console.log(`Migrated ${visitors.length} visitors.`);

        const checkouts = await connection.query('SELECT * FROM ItemCheckOut');
        const stmtCh = sqlite.prepare('INSERT OR IGNORE INTO ItemCheckOut (checkoutID, ItemID, VisitorID, Quanlity, CheckoutDate) VALUES (?, ?, ?, ?, ?)');
        for (const c of checkouts) {
        let cd = c.CheckoutDate;
        if (cd && typeof cd === 'object') cd = cd.toISOString();
        else if (cd) cd = new Date(cd).toISOString();
        stmtCh.run(c.checkoutID, c.ItemID, c.VisitorID, c.Quanlity, cd);
        }
        stmtCh.finalize();
        console.log(`Migrated ${checkouts.length} checkouts.`);

    } catch (e) {
        console.error('Migration error: ', e);
    }

}

migrate();
