const express = require('express');
const cors = require('cors');
const InvModel = require('./model.js');
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

//------------------------------------------------------------------------------------------

// List all items with category
app.get('/items', (req, res) => {
    const { categoryId } = req.query;
    InvModel.getItemsByCategory(categoryId, createCallback(res));
});

//consigue las caracteristicas de un item 
app.get('/items/:id', (req, res) => {
    const itemId = req.params.id;
    InvModel.getItemCharacteristics(itemId, createCallback(res));
});

//consigue las categorias
app.get('/categories', (req, res) => {
    InvModel.getCategories(createCallback(res));
});

//agrega categoria con caracteristicas
app.post('/categories', (req, res) => {
    const { name, characteristics } = req.body;

    //se asegura de recibir la data correcta
    if (!name || !Array.isArray(characteristics)) {
        return res.status(400).json({ error: 'Error de data format' });
    }

    //pasamos la data al modelo
    InvModel.insertCategory(name, characteristics, createCallback(res));
});

//consigue las caracccteristicas de una categoria
app.get('/characteristics', (req, res) => {
    const { categoryId } = req.query;
    InvModel.getCharacteristicsByCategory(categoryId, createCallback(res));
});

//agrega un item y sus caracteristicas
app.post('/items', (req, res) => {
    const { categoryId, characteristics } = req.body;
    InvModel.insertItem(categoryId, { characteristics }, createCallback(res));
});

//actualiza un item y sus caracteristicas
app.put('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const updatedData = req.body; // ya no espera "newItem", toma todo el body

    InvModel.updateItem(itemId, updatedData, createCallback(res));
});

//crear callback general
function createCallback(res) {
    return (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    };
}

//escucha en el puerto designado
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});