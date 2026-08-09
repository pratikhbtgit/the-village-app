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
    
    // Cleanup: Keep only the 5 most recent backups
    const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('village_') && file.endsWith('.sqlite'))
        .map(file => ({ name: file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time); // Newest first
        
    if (backups.length > 5) {
        const toDelete = backups.slice(5);
        toDelete.forEach(file => {
            fs.unlinkSync(path.join(backupDir, file.name));
            console.log(`🗑️ Deleted old backup: ${file.name}`);
        });
    }
} else {
    console.error(`⚠️ Error: ${dbPath} not found.`);
    process.exit(1);
}
