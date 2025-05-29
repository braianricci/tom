const db = require('./db.js');

class TicketModel {

    constructor() {
        this.db = db;
    }

    //devuelve todas los tickets
    getTickets(limit = 10, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT 
                tickets.id,
                tickets.chatId,
                tickets.userNumber,
                tickets.user,
                tickets.title,
                tickets.description,
                tickets.created_at,
                agents.name AS agent_name,
                states.name AS state_name,
                types.name AS type_name
            FROM tickets
            JOIN agents ON tickets.agent_id = agents.id
            LEFT JOIN states ON tickets.state_id = states.id
            LEFT JOIN types ON tickets.type_id = types.id
            ORDER BY tickets.id DESC
            LIMIT ? OFFSET ?
        `);

        return stmt.all(limit, offset);
    }
}

module.exports = new TicketModel();