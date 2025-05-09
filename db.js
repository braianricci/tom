const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/tickets.db');

function init() {
    db.serialize(() => {

        const schema = `
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                number TEXT NOT NULL,
                login TEXT NOT NULL,
                hash TEXT NOT NULL,
                admin BOOLEAN NOT NULL
            );

            CREATE TABLE IF NOT EXISTS states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chatId TEXT NOT NULL,
                userNumber TEXT NOT NULL,
                agent_id INTEGER NOT NULL,
                agent_name TEXT NOT NULL,
                user TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                type_id INTEGER,
                state_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(agent_id) REFERENCES agents(id),
                FOREIGN KEY(type_id) REFERENCES types(id),
                FOREIGN KEY(state_id) REFERENCES states(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user BOOLEAN NOT NULL,
                content TEXT NOT NULL,
                includes_media BOOLEAN NOT NULL,
                media_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(ticket_id) REFERENCES tickets(id) 
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                body TEXT NOT NULL,
                agent_id INTEGER NOT NULL,
                agent_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(ticket_id) REFERENCES tickets(id),
                FOREIGN KEY(agent_id) REFERENCES agents(id) 
            );
        `;

        db.run(schema, err => {
            if (err) console.error('Schema error: ', err.message);
            else console.log('Schema initialized.');
        });
    });
}

function seed() {
    db.serialize(() => {
        // Agents
        const agents = ['Braian', 'Ignacio', 'Damian'];
        agents.forEach(name => {
            db.run(`INSERT INTO agents (name, number, login, hash, admin) VALUES (?, ?, ?, ?, ?)`,
                [name, '+1234567890', name.toLowerCase(), 'hash123', true]);
        });

        // States
        const states = ['Abierto', 'En espera', 'Cerrado'];
        states.forEach(name => {
            db.run(`INSERT INTO states (name, description) VALUES (?, ?)`, [name, null]);
        });

        // Types
        const types = ['Incidente', 'Solicitud de reparacion', 'Alta de equipo'];
        types.forEach(name => {
            db.run(`INSERT INTO types (name, description) VALUES (?, ?)`, [name, null]);
        });

        // Wait a moment to ensure IDs exist
        db.get(`SELECT id, name FROM agents WHERE name = 'Braian'`, (err, agent) => {
            db.get(`SELECT id FROM types WHERE name = 'Incidente'`, (err, type) => {
                db.get(`SELECT id FROM states WHERE name = 'Abierto'`, (err, state) => {
                    db.run(`INSERT INTO tickets (chatId, userNumber, agent_id, agent_name, user, title, description, type_id, state_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        ['chat001', '+5432167890', agent.id, agent.name, 'Carlos', 'No enciende', 'La PC no prende desde ayer', type.id, state.id],
                        function (err) {
                            const ticketId = this.lastID;

                            // Messages
                            for (let i = 0; i < 10; i++) {
                                const user = i % 2 === 0 ? 1 : 0;
                                db.run(`INSERT INTO messages (ticket_id, user, content, includes_media) VALUES (?, ?, ?, ?)`,
                                    [ticketId, user, `Mensaje ${i + 1}`, false]);
                            }

                            // Comments
                            for (let i = 0; i < 2; i++) {
                                db.run(`INSERT INTO comments (ticket_id, body, agent_id, agent_name) VALUES (?, ?, ?, ?)`,
                                    [ticketId, `Comentario ${i + 1}`, agent.id, agent.name]);
                            }
                        });
                });
            });
        });
    });
}

module.exports = {
    db,
    init,
    seed
};