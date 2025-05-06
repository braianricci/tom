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

db.run(`
  INSERT INTO tickets (chatId, userNumber, agent, username, title)
  VALUES (?, ?, ?, ?, ?)
`, ['abc123', '+1234567890', 'Agent007', 'John Doe', 'Issue with invoice upload'], function (err) {
    if (err) return console.error(err.message);

    const ticketId = this.lastID;

    // Insert messages
    const messages = [
        ['Hi, I can’t upload my invoice.', 1],
        ['I can help you with that. Can you send a screenshot?', 0],
        ['Here it is.', 1]
    ];

    messages.forEach(([content, user]) => {
        db.run(
            'INSERT INTO messages (ticket_id, content, user) VALUES (?, ?, ?)',
            [ticketId, content, user]
        );
    });
});

module.exports = db;