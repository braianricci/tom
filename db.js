const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/support.db');

function init() {

    //db.run('PRAGMA foreign_keys = ON;');

    //tickets
    let schema = `
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

    //inventory
    schema += `
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS caracteristicas(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(categoria_id) REFERENCES categorias(id)
        );
        CREATE TABLE IF NOT EXISTS items(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            FOREIGN KEY(categoria_id) REFERENCES categorias(id)
        );
        CREATE TABLE IF NOT EXISTS item_caracteristicas(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            caracteristica_id INTEGER NOT NULL,
            value TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(id),
            FOREIGN KEY(caracteristica_id) REFERENCES caracteristicas(id)
        );
    `;

    db.serialize(() => {

        db.run('BEGIN TRANSACTION;');
        schema.split(';').forEach(stmt => {
            const trimmed = stmt.trim();
            if (trimmed) {
                db.run(trimmed, err => {
                    if (err) console.error('Init error:', err.message);
                });
            }
        });
        db.run('COMMIT;');

        /*db.run(schema, err => {
            if (err) console.error('Schema error: ', err.message);
            else console.log('Schema initialized.');
        });*/
    });
}

function seed() {
    db.serialize(() => {
        // Cleanup
        const tables = ['comments', 'messages', 'tickets', 'states', 'types', 'agents', 'categorias', 'caracteristicas', 'items', 'item_caracteristicas'];
        tables.forEach(table => {
            db.run(`DELETE FROM ${table}`);
            db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]);
        });

        // Agents
        ['Braian', 'Ignacio', 'Damian'].forEach(name => {
            db.run(`INSERT INTO agents (name, number, login, hash, admin) VALUES (?, ?, ?, ?, ?)`,
                [name, '+1234567890', name.toLowerCase(), 'hash123', true]);
        });

        // States
        ['Abierto', 'En espera', 'Cerrado'].forEach(name => {
            db.run(`INSERT INTO states (name, description) VALUES (?, ?)`, [name, null]);
        });

        // Types
        ['Incidente', 'Solicitud de reparacion', 'Alta de equipo'].forEach(name => {
            db.run(`INSERT INTO types (name, description) VALUES (?, ?)`, [name, null]);
        });

        // Tickets (after inserts)
        db.get(`SELECT id, name FROM agents WHERE name = 'Braian'`, (err, agent) => {
            db.get(`SELECT id FROM types WHERE name = 'Incidente'`, (err, type) => {
                db.get(`SELECT id FROM states WHERE name = 'Abierto'`, (err, state) => {
                    db.run(`INSERT INTO tickets (chatId, userNumber, agent_id, agent_name, user, title, description, type_id, state_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        ['chat001', '+5432167890', agent.id, agent.name, 'Carlos', 'No enciende', 'La PC no prende desde ayer', type.id, state.id],
                        function (err) {
                            const ticketId = this.lastID;
                            for (let i = 0; i < 10; i++) {
                                const user = i % 2 === 0 ? 1 : 0;
                                db.run(`INSERT INTO messages (ticket_id, user, content, includes_media) VALUES (?, ?, ?, ?)`,
                                    [ticketId, user, `Mensaje ${i + 1}`, false]);
                            }
                            for (let i = 0; i < 2; i++) {
                                db.run(`INSERT INTO comments (ticket_id, body, agent_id, agent_name) VALUES (?, ?, ?, ?)`,
                                    [ticketId, `Comentario ${i + 1}`, agent.id, agent.name]);
                            }
                        });
                });
            });
        });

        // INVENTORY - PC Category
        db.run(`INSERT INTO categorias (name) VALUES (?)`, ['PC'], function (err) {
            if (err) return console.error('Error inserting categoria:', err.message);
            const categoriaId = this.lastID;
            const caracteristicas = ['Serial', 'Procesador', 'Ram', 'Disco', 'Modelo', 'Nombre de equipo', 'Comentarios'];
            let inserted = 0;

            caracteristicas.forEach(nombre => {
                db.run(`INSERT INTO caracteristicas (categoria_id, name) VALUES (?, ?)`, [categoriaId, nombre], function (err) {
                    if (err) return console.error('Error inserting caracteristica:', err.message);
                    inserted++;
                    if (inserted === caracteristicas.length) {
                        db.all(`SELECT id, name FROM caracteristicas WHERE categoria_id = ?`, [categoriaId], (err, rows) => {
                            if (err) return console.error('Error selecting caracteristicas:', err.message);

                            const pcs = [
                                {
                                    values: {
                                        'Serial': '123-ABC',
                                        'Procesador': 'Intel i5',
                                        'Ram': '16GB',
                                        'Disco': '512GB SSD',
                                        'Modelo': 'HP EliteDesk 800',
                                        'Nombre de equipo': 'PC-JUAN',
                                        'Comentarios': 'Equipo asignado a Juan Pérez'
                                    }
                                },
                                {
                                    values: {
                                        'Serial': '456-DEF',
                                        'Procesador': 'AMD Ryzen 5',
                                        'Ram': '8GB',
                                        'Disco': '256GB SSD',
                                        'Modelo': 'Dell OptiPlex 7070',
                                        'Nombre de equipo': 'PC-MARIA',
                                        'Comentarios': 'Equipo asignado a María López'
                                    }
                                }
                            ];

                            pcs.forEach(pc => {
                                db.run(`INSERT INTO items (categoria_id) VALUES (?)`, [categoriaId], function (err) {
                                    if (err) return console.error('Error inserting item:', err.message);
                                    const itemId = this.lastID;
                                    rows.forEach(row => {
                                        db.run(`INSERT INTO item_caracteristicas (item_id, caracteristica_id, value) VALUES (?, ?, ?)`,
                                            [itemId, row.id, pc.values[row.name]]);
                                    });
                                });
                            });
                        });
                    }
                });
            });
        });

        // INVENTORY - Cargadores
        db.run(`INSERT INTO categorias (name) VALUES (?)`, ['Cargadores'], function (err) {
            if (err) return console.error('Error inserting categoria:', err.message);
            const categoriaId = this.lastID;

            // Insert Modelo characteristic first
            db.run(`INSERT INTO caracteristicas (categoria_id, name) VALUES (?, ?)`, [categoriaId, 'Modelo'], function (err) {
                if (err) return console.error('Error inserting caracteristica Modelo:', err.message);
                const modeloId = this.lastID;

                // Insert Voltaje characteristic second
                db.run(`INSERT INTO caracteristicas (categoria_id, name) VALUES (?, ?)`, [categoriaId, 'Voltaje'], function (err) {
                    if (err) return console.error('Error inserting caracteristica Voltaje:', err.message);
                    const voltajeId = this.lastID;

                    // Insert item
                    db.run(`INSERT INTO items (categoria_id) VALUES (?)`, [categoriaId], function (err) {
                        if (err) return console.error('Error inserting item:', err.message);
                        const itemId = this.lastID;

                        // Insert Modelo value
                        db.run(
                            `INSERT INTO item_caracteristicas (item_id, caracteristica_id, value) VALUES (?, ?, ?)`,
                            [itemId, modeloId, 'Modelo XYZ'],
                            err => {
                                if (err) return console.error('Error inserting item_caracteristica Modelo:', err.message);
                            }
                        );

                        // Insert Voltaje value
                        db.run(
                            `INSERT INTO item_caracteristicas (item_id, caracteristica_id, value) VALUES (?, ?, ?)`,
                            [itemId, voltajeId, '45W'],
                            err => {
                                if (err) return console.error('Error inserting item_caracteristica Voltaje:', err.message);
                            }
                        );
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