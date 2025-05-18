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
    const { categoryId } = req.query;
    let sql = `
        SELECT 
            items.id AS item_id, 
            categorias.name AS category_name,
            caracteristicas.name AS characteristic_name,
            item_caracteristicas.value AS characteristic_value
        FROM items
        JOIN categorias ON items.categoria_id = categorias.id
        LEFT JOIN item_caracteristicas ON item_caracteristicas.item_id = items.id
        LEFT JOIN caracteristicas ON caracteristicas.id = item_caracteristicas.caracteristica_id
    `;

    const params = [];
    if (categoryId) {
        sql += ' WHERE categorias.id = ?';
        params.push(categoryId);
    }

    sql += 'ORDER BY items.id, caracteristicas.id';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Group by item
        const grouped = {};
        rows.forEach(row => {
            if (!grouped[row.item_id]) {
                grouped[row.item_id] = {
                    id: row.item_id,
                    category: row.category_name,
                    characteristics: {}
                };
            }
            if (row.characteristic_name) {
                grouped[row.item_id].characteristics[row.characteristic_name] = row.characteristic_value;
            }
        });

        res.json(Object.values(grouped));
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

// Get all categories
app.get('/categorias', (req, res) => {
    db.all('SELECT * FROM categorias', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

//agregar categoria con caracteristicas
app.post('/categorias', (req, res) => {
    const { name, caracteristicas } = req.body;
    console.log('REQ BODY:', req.body);

    if (!name || !Array.isArray(caracteristicas)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    db.serialize(() => {
        db.run(`INSERT INTO categorias (name) VALUES (?)`, [name], function (err) {
            if (err) {
                console.error('Error inserting categoria:', err.message);
                return res.status(500).json({ error: 'Error creating category' });
            }

            const categoriaId = this.lastID;

            const stmt = db.prepare(`INSERT INTO caracteristicas (categoria_id, name) VALUES (?, ?)`);
            caracteristicas.forEach(caracteristica => {
                // extract the name property from each object
                stmt.run(categoriaId, caracteristica.name, err => {
                    if (err) console.error('Error inserting caracteristica:', err.message);
                });
            });
            stmt.finalize(() => {
                // After all inserts complete, send back the new category and characteristics
                res.status(201).json({
                    id: categoriaId,
                    name,
                    caracteristicas,
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});