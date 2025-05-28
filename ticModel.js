const db = require('./db.js');

class TicketModel {

    constructor() {
        this.db = db;
    }

    //devuelve todas los tickets
    getTickets(limit = 10, offset = 0) {
        const stmt = this.db.prepare(`
        SELECT * FROM tickets
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    `);

        return stmt.all(limit, offset);
    }
}

module.exports = new TicketModel();