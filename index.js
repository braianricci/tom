const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Create a ticket
app.post('/tickets', (req, res) => {
    const { title } = req.body;
    db.run('INSERT INTO tickets (title) VALUES (?)', [title], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// Get all tickets
app.get('/tickets', (req, res) => {
    db.all('SELECT * FROM tickets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a message to a ticket
app.post('/tickets/:id/messages', (req, res) => {
    const { content } = req.body;
    const ticketId = req.params.id;
    db.run(
        'INSERT INTO messages (ticket_id, content) VALUES (?, ?)',
        [ticketId, content],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Get messages for a ticket
app.get('/tickets/:id/messages', (req, res) => {
    const ticketId = req.params.id;
    db.all(
        'SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC',
        [ticketId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});