const Database = require('better-sqlite3');
const db = new Database('./data/support.db', { verbose: console.log });

function init() {

    db.pragma('foreign_keys = ON');

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
        CREATE TABLE IF NOT EXISTS types(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        );
        CREATE TABLE IF NOT EXISTS uens(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uen TEXT NOT NULL,
            local TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT,
            user_number TEXT,
            agent_id INTEGER NOT NULL,
            agent_name TEXT NOT NULL,
            user TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            type_id INTEGER NOT NULL,
            state_id INTEGER NOT NULL,
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
            sent_at DATETIME NOT NULL,
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
        CREATE TABLE IF NOT EXISTS categories(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS characteristics(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );
        CREATE TABLE IF NOT EXISTS items(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );
        CREATE TABLE IF NOT EXISTS item_characteristics(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            characteristic_id INTEGER NOT NULL,
            value TEXT NOT NULL,
            FOREIGN KEY(item_id) REFERENCES items(id),
            FOREIGN KEY(characteristic_id) REFERENCES characteristics(id)
        );
    `;

    schema = schema.trim().split(';');

    const transaction = db.transaction(() => {
        for (const stmt of schema) {
            const trimmed = stmt.trim();
            if (trimmed) db.prepare(trimmed).run();
        }
    });

    transaction();
}

function seed() {
    const transaction = db.transaction(() => {
        const tables = [
            'comments',
            'messages',
            'item_characteristics',
            'items',
            'characteristics',
            'tickets',
            'agents',
            'states',
            'types',
            'categories'
        ];

        tables.forEach(table => {
            db.prepare(`DELETE FROM ${table}`).run();
            db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
        });

        const insertAgent = db.prepare(`INSERT INTO agents (name, number, login, hash, admin) VALUES (?, ?, ?, ?, ?)`);
        ['Braian', 'Ignacio', 'Damian'].forEach(name => {
            insertAgent.run(name, '+1234567890', name.toLowerCase(), 'hash123', 1);
        });

        const insertState = db.prepare(`INSERT INTO states (name, description) VALUES (?, ?)`);
        ['Abierto', 'En espera', 'Cerrado'].forEach(name => insertState.run(name, null));

        const insertType = db.prepare(`INSERT INTO types (name, description) VALUES (?, ?)`);
        ['Incidente', 'Alta de equipo', 'Solicitud de reparacion'].forEach(name => insertType.run(name, null));

        const agent = db.prepare(`SELECT id, name FROM agents WHERE name = ?`).get('Braian');
        const type = db.prepare(`SELECT id FROM types WHERE name = ?`).get('Incidente');
        const state = db.prepare(`SELECT id FROM states WHERE name = ?`).get('Abierto');

        const insertTicket = db.prepare(`INSERT INTO tickets (chat_id, user_number, agent_id, agent_name, user, title, description, type_id, state_id, created_at)
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        const ticketResult = insertTicket.run('chat001', '+5432167890', agent.id, agent.name, 'Carlos', 'No enciende', 'La PC no prende desde ayer', type.id, state.id, '2024-04-17 14:23:00');
        const ticketId = ticketResult.lastInsertRowid;

        const insertMsg = db.prepare(`INSERT INTO messages (ticket_id, user, content, includes_media, sent_at) VALUES (?, ?, ?, ?, ?)`);
        for (let i = 0; i < 10; i++) insertMsg.run(ticketId, i % 2 === 0 ? 1 : 0, `Mensaje ${i + 1}`, 0, `2025-06-06T09:32:45`);

        const insertComment = db.prepare(`INSERT INTO comments (ticket_id, body, agent_id, agent_name) VALUES (?, ?, ?, ?)`);
        for (let i = 0; i < 2; i++) insertComment.run(ticketId, `Comentario ${i + 1}`, agent.id, agent.name);

        // Extra tickets
        for (let i = 1; i <= 400; i++) {
            const day = 1 + Math.floor((i - 1) / 4); // Every 4 tickets, advance one day
            const date = `2024-05-${String(day).padStart(2, '0')} 10:00:00`; // Fixed time, padded day

            const t = insertTicket.run(
                `chat00${i + 1}`,
                `+543210000${i}`,
                agent.id,
                agent.name,
                `Usuario ${i}`,
                `Problema #${i}`,
                `Descripción del problema número ${i}`,
                type.id,
                state.id,
                date
            ).lastInsertRowid;

            insertMsg.run(t, 1, `Mensaje inicial del ticket ${i}`, 0, `2025-06-06T09:32:45`);
        }

        // Inventory (unchanged)
        const insertCategory = db.prepare(`INSERT INTO categories (name) VALUES (?)`);
        const categoryResult = insertCategory.run('PC');
        const categoryId = categoryResult.lastInsertRowid;

        const characteristics = ['Serial', 'Procesador', 'Ram', 'Disco', 'Modelo', 'Nombre de equipo', 'Comentarios'];
        const insertCharacteristic = db.prepare(`INSERT INTO characteristics (category_id, name) VALUES (?, ?)`);

        characteristics.forEach(name => insertCharacteristic.run(categoryId, name));

        const chars = db.prepare(`SELECT id, name FROM characteristics WHERE category_id = ?`).all(categoryId);
        const insertItem = db.prepare(`INSERT INTO items (category_id) VALUES (?)`);
        const insertItemChar = db.prepare(`INSERT INTO item_characteristics (item_id, characteristic_id, value) VALUES (?, ?, ?)`);

        const pcs = [
            {
                'Serial': '123-ABC',
                'Procesador': 'Intel i5',
                'Ram': '16GB',
                'Disco': '512GB SSD',
                'Modelo': 'HP EliteDesk 800',
                'Nombre de equipo': 'PC-JUAN',
                'Comentarios': 'Equipo asignado a Juan Pérez'
            },
            {
                'Serial': '456-DEF',
                'Procesador': 'AMD Ryzen 5',
                'Ram': '8GB',
                'Disco': '256GB SSD',
                'Modelo': 'Dell OptiPlex 7070',
                'Nombre de equipo': 'PC-MARIA',
                'Comentarios': 'Equipo asignado a María López'
            }
        ];

        pcs.forEach(values => {
            const itemId = insertItem.run(categoryId).lastInsertRowid;
            chars.forEach(({ id, name }) => {
                insertItemChar.run(itemId, id, values[name]);
            });
        });

        // Cargadores
        const cargadoresId = insertCategory.run('Cargadores').lastInsertRowid;
        const modeloId = insertCharacteristic.run(cargadoresId, 'Modelo').lastInsertRowid;
        const voltajeId = insertCharacteristic.run(cargadoresId, 'Voltaje').lastInsertRowid;

        const cargadorItemId = insertItem.run(cargadoresId).lastInsertRowid;
        insertItemChar.run(cargadorItemId, modeloId, 'Modelo XYZ');
        insertItemChar.run(cargadorItemId, voltajeId, '45W');
    });

    transaction();
}

init();
seed();

module.exports = db;