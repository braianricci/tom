const express = require('express');
const cors = require('cors');
const { db, init, seed } = require('./db.js');

const app = express();
const PORT = 3001;

init();
seed();

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

// List all items with category
app.get('/items', (req, res) => {
    const sql = `
        SELECT items.id, items.name AS item_name, categorias.name AS category_name
        FROM items
        JOIN categorias ON items.categoria_id = categorias.id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get characteristics of an item
app.get('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = `
        SELECT caracteristicas.name AS key, item_caracteristicas.value
        FROM item_caracteristicas
        JOIN caracteristicas ON item_caracteristicas.caracteristica_id = caracteristicas.id
        WHERE item_caracteristicas.item_id = ?
    `;
    db.all(sql, [itemId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ item_id: itemId, characteristics: rows });
        console.log(res.json);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});