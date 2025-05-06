const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/tickets.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chatId TEXT NOT NULL,
            userNumber TEXT NOT NULL,
            agent TEXT NOT NULL,
            username TEXT NOT NULL,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER,
            user BOOLEAN NOT NULL,
            content TEXT NOT NULL,
            media_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(ticket_id) REFERENCES tickets(id) 
        )
    `);
});

module.exports = db;