const express = require('express');
const cors = require('cors');
const InvModel = require('./modelInv.js');
const TicModel = require('./modelTic.js');
const db = require('./db'); // assuming your better-sqlite3 db instance is exported here
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/*------------------------------- Tickets ---------------------------------*/

app.get('/tickets', (req, res) => {                     //NOT FINAL
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tickets = TicModel.getTickets(limit, offset);
    res.json(tickets);
});

app.post('/tickets', (req, res) => {
    const data = req.body;
    const fn = () => TicModel.insertFullTicket(data);

    handleRequest(res, fn, 'Fallo POST /tickets');
});

app.get('/states', (req, res) => {
    const fn = () => TicModel.getStates();

    handleRequest(res, fn, 'Fallo GET /states');
});

app.get('/types', (req, res) => {
    const fn = () => TicModel.getTypes();

    handleRequest(res, fn, 'Fallo GET /types');
});

app.get('/agents', (req, res) => {
    const fn = () => TicModel.getAgents();

    handleRequest(res, fn, 'Fallo GET /agents');
});

/*----------------------------------------------------------------*/

app.post('/tickets/:id/messages', (req, res) => {
    const { content } = req.body;
    const ticketId = req.params.id;
    handleRequest(res, () => {
        const stmt = db.prepare('INSERT INTO messages (ticket_id, content, user, includes_media) VALUES (?, ?, ?, ?)');
        // assuming user and includes_media fields required - default 0 for user (agent) and false for includes_media
        const info = stmt.run(ticketId, content, 0, 0);
        return { id: info.lastInsertRowid };
    }, 'Failed to add message');
});

app.get('/tickets/:id/messages', (req, res) => {
    const ticketId = req.params.id;
    handleRequest(res, () => {
        return db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
    }, 'Failed to get messages');
});

/*------------------------------- Inventory ---------------------------------*/

app.get('/items', (req, res) => {
    const { categoryId } = req.query;
    const fn = () => InvModel.getItemsByCategory(categoryId);

    handleRequest(res, fn, 'Fallo GET /items');
});

app.get('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const fn = () => InvModel.getItemCharacteristics(itemId);

    handleRequest(res, fn, 'Fallo GET /items/:id');
});

app.get('/categories', (req, res) => {
    const fn = () => InvModel.getCategories();

    handleRequest(res, fn, 'Fallo GET /categories');
});

app.post('/categories', (req, res) => {
    const { name, characteristics } = req.body;
    if (!name || !Array.isArray(characteristics)) {
        return res.status(400).json({ error: 'Error de data format' });
    }

    const fn = () => InvModel.insertCategory(name, characteristics);
    handleRequest(res, fn, 'Fallo POST /categories');
});

app.get('/characteristics', (req, res) => {
    const { categoryId } = req.query;
    const fn = () => InvModel.getCharacteristicsByCategory(categoryId);

    handleRequest(res, fn, 'Fallo GET /characteristics');
});

app.post('/items', (req, res) => {
    const { categoryId, characteristics } = req.body;
    const fn = () => InvModel.insertItem(categoryId, { characteristics });

    handleRequest(res, fn, 'Fallo POST /items');
});

app.put('/items/:id', (req, res) => {
    const itemId = req.params.id;
    const updatedData = req.body;
    const fn = () => InvModel.updateItem(itemId, updatedData);

    handleRequest(res, fn, 'Fallo PUT /items/:id');
});

app.delete('/item_characteristics', (req, res) => {
    const { itemId } = req.query;
    const fn = () => InvModel.deleteItemCharacteristics(itemId);

    handleRequest(res, fn, 'Fallo DELETE /item_characteristics');
});

app.delete('/items/:id', (req, res) => {
    const id = req.params.id;
    const fn = () => InvModel.deleteItem(id);

    handleRequest(res, fn, 'Fallo DELETE /items/:id');
});

/*------------------------------- General ---------------------------------*/

function handleRequest(res, fn, errorMessage = 'Error interno del servidor') {
    try {
        const result = fn();
        res.json(result);
    } catch (err) {
        console.error(errorMessage, err);
        res.status(500).json({ error: errorMessage });
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});