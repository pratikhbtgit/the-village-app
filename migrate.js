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
    });

    try {
        const volunteers = await connection.query('SELECT * FROM Volunteers');
        const stmtVol = sqlite.prepare('INSERT INTO Volunteers (ID, firstname, lastname, phone, email, Qrcode, dateadded) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const v of volunteers) {
            let d = v.dateadded;
            if (d && typeof d === 'object') d = v.dateadded.toISOString();
            else if (d) d = new Date(d).toISOString();
            stmtVol.run(v.ID, v.firstname, v.lastname, v.phone, v.email, v.Qrcode, d);
        }
        stmtVol.finalize();
        console.log(`Migrated ${volunteers.length} volunteers.`);

        const hours = await connection.query('SELECT * FROM volunteerHours');
        const stmtHrs = sqlite.prepare('INSERT INTO volunteerHours (ID, volunterID, TimeIn, TimeOut) VALUES (?, ?, ?, ?)');
        for (const h of hours) {
            let tin = h.TimeIn;
            let tout = h.TimeOut;
            if (tin && typeof tin === 'object') tin = tin.toISOString(); else if (tin) tin = new Date(tin).toISOString();
            if (tout && typeof tout === 'object') tout = tout.toISOString(); else if (tout) tout = new Date(tout).toISOString();
            stmtHrs.run(h.ID, h.volunterID, tin, tout);
        }
        stmtHrs.finalize();
        console.log(`Migrated ${hours.length} volunteer hours.`);
        
        const items = await connection.query('SELECT * FROM Items');
        const stmtItems = sqlite.prepare('INSERT INTO Items (itemID, ItemName, Category, Size, Condition, Amount, Quantity) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const i of items) {
           let am = typeof i.Amount === 'number' ? i.Amount : 0;
           stmtItems.run(i.itemID, i.ItemName, parseInt(i.Category), i.Size, i.Condition, am, parseInt(i.Quantity));
        }
        stmtItems.finalize();
        console.log(`Migrated ${items.length} items.`);

        const cats = await connection.query('SELECT * FROM Category');
        const stmtCats = sqlite.prepare('INSERT INTO Category (ID, category) VALUES (?, ?)');
        for (const c of cats) {
            stmtCats.run(c.ID, c.category);
        }
        stmtCats.finalize();
        console.log(`Migrated ${cats.length} categories.`);

        const checkouts = await connection.query('SELECT * FROM ItemCheckOut');
        const stmtCh = sqlite.prepare('INSERT INTO ItemCheckOut (checkoutID, ItemID, VisitorID, Quanlity, CheckoutDate) VALUES (?, ?, ?, ?, ?)');
        for (const c of checkouts) {
            let cd = c.CheckoutDate;
            if (cd && typeof cd === 'object') cd = cd.toISOString(); else if (cd) cd = new Date(cd).toISOString();
            stmtCh.run(c.checkoutID, c.ItemID, c.VisitorID, c.Quanlity, cd);
        }
        stmtCh.finalize();
        console.log(`Migrated ${checkouts.length} checkouts.`);

    } catch (e) {
        console.error("Migration error: ", e);
    }
}

migrate();
