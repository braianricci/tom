const db = require('./db.js');

class TicketModel {

    constructor() {
        this.db = db;
    }

    //devuelve todas los tickets
    getTickets() {
        const stmt = this.db.prepare('SELECT * FROM tickets');
        return stmt.all();
    }
}

module.exports = new TicketModel();