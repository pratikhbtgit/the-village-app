const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const now = new Date();
const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, '');
const dbPath = path.join(__dirname, 'village.sqlite');
const backupPath = path.join(backupDir, `village_${timestamp}.sqlite`);

if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Database backup created successfully: ${backupPath}`);
} else {
    console.error(`⚠️ Error: ${dbPath} not found.`);
    process.exit(1);
}
