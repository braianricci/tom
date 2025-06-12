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
                tickets.chat_id,
                tickets.user_number,
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

    //inserta un ticket y sus mensajes y comentarios
    insertFullTicket(data) {
        const now = new Date().toISOString();

        console.log(data);

        const insertTicket = db.prepare(`
            INSERT INTO tickets (
                chat_id, user_number, agent_id, agent_name, user,
                title, description, type_id, state_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMessage = db.prepare(`
            INSERT INTO messages (
                ticket_id, user, content, includes_media, media_path, sent_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertComment = db.prepare(`
            INSERT INTO comments (
                ticket_id, agent_id, agent_name, body, created_at
            ) VALUES (?, ?, ?, ?, ?)
        `);

        const tx = db.transaction(({ ticket, messages, comments }) => {
            const result = insertTicket.run(
                ticket.chat_id ?? null,
                ticket.userNumber ?? null,
                ticket.agent_id,
                ticket.agent_name,
                ticket.user,
                ticket.title,
                ticket.description,
                ticket.type_id,
                ticket.state_id
            );

            const ticketId = result.lastInsertRowid;

            for (const msg of messages) {
                insertMessage.run(
                    ticketId,
                    msg.user ? 1 : 0,
                    msg.content,
                    msg.includes_media ? 1 : 0,
                    msg.media_path || null,
                    msg.sent_at
                );
            }

            for (const comment of comments) {
                insertComment.run(
                    ticketId,
                    comment.agent_id,
                    comment.agent_name,
                    comment.body,
                    now
                );
            }

            return ticketId;
        });

        return tx(data);
    }

    getStates() {
        const stmt = this.db.prepare(`SELECT id, name FROM states ORDER BY id ASC`);
        return stmt.all();
    }

    getTypes() {
        const stmt = this.db.prepare(`SELECT id, name FROM types ORDER BY id ASC`);
        return stmt.all();
    }
}

module.exports = new TicketModel();