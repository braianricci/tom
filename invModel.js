const db = require('./db.js');

class InventoryModel {
    constructor() {
        this.db = db;
    }

    //devuelve todas las categorias
    getCategories() {
        const stmt = this.db.prepare('SELECT * FROM categories');
        return stmt.all();
    }

    //devuelve todos los items de una categoria
    getItemsByCategory(categoryId) {
        let sql = `
        SELECT 
            items.id AS item_id, 
            categories.name AS category_name,
            characteristics.name AS characteristic_name,
            item_characteristics.value AS characteristic_value
        FROM items
        JOIN categories ON items.category_id = categories.id
        LEFT JOIN item_characteristics ON item_characteristics.item_id = items.id
        LEFT JOIN characteristics ON characteristics.id = item_characteristics.characteristic_id
    `;

        const params = [];
        if (categoryId) {
            sql += ' WHERE categories.id = ?';
            params.push(categoryId);
        }

        sql += ' ORDER BY items.id, characteristics.id';

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);

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

        return Object.values(grouped);
    }

    //devuelve las caracteristivas de un item por id    
    getItemCharacteristics(itemId) {
        const sql = `
            SELECT characteristics.name AS key, item_characteristics.value
            FROM item_characteristics
            JOIN characteristics ON item_characteristics.characteristic_id = characteristics.id
            WHERE item_characteristics.item_id = ?
        `;
        const stmt = this.db.prepare(sql);
        return stmt.all(itemId);
    };

    //inserta una nueva categoria y sus respectivas caracteristicas
    insertCategory(name, characteristics) {
        const insertCategoryStmt = this.db.prepare(`INSERT INTO categories (name) VALUES (?)`);
        const info = insertCategoryStmt.run(name);
        const categoryId = info.lastInsertRowid;

        const insertCharacteristicStmt = this.db.prepare(`INSERT INTO characteristics (category_id, name) VALUES (?, ?)`);

        const insertMany = this.db.transaction((chars) => {
            for (const charName of chars) {
                insertCharacteristicStmt.run(categoryId, charName);
            }
        });

        insertMany(characteristics);

        return { id: categoryId, name, characteristics };
    }

    //devuelve caracteristicas de una categoria
    getCharacteristicsByCategory(categoryId) {
        const sql = `
            SELECT * FROM characteristics 
            WHERE category_id = ?;
        `;
        const stmt = this.db.prepare(sql);
        return stmt.all(categoryId);
    }

    //agrega un item y sus caracteristicas
    insertItem(categoryId, item) {
        const insertItemStmt = this.db.prepare(`INSERT INTO items (category_id) VALUES (?)`);
        const info = insertItemStmt.run(categoryId);
        const itemId = info.lastInsertRowid;

        const getCharacteristicsStmt = this.db.prepare(`SELECT id, name FROM characteristics WHERE category_id = ?`);
        const characteristics = getCharacteristicsStmt.all(categoryId);

        const insertItemCharStmt = this.db.prepare(`
            INSERT INTO item_characteristics (item_id, characteristic_id, value)
            VALUES (?, ?, ?)
        `);

        const insertMany = this.db.transaction((chars) => {
            for (const { id, name } of chars) {
                insertItemCharStmt.run(itemId, id, item.characteristics[name] || '');
            }
        });

        insertMany(characteristics);

        return {
            id: itemId,
            categoryId,
            characteristics: item.characteristics,
        };
    }

    //actualiza un item
    updateItem(itemId, newItem) {
        const updateStmt = this.db.prepare(`
            UPDATE item_characteristics
            SET value = ?
            WHERE item_id = ? AND characteristic_id = (
                SELECT id FROM characteristics WHERE name = ? AND category_id = (
                    SELECT category_id FROM items WHERE id = ?
                )
            )
        `);

        const updateMany = this.db.transaction((characteristics) => {
            for (const [key, value] of Object.entries(characteristics)) {
                updateStmt.run(value, itemId, key, itemId);
            }
        });

        updateMany(newItem.characteristics);

        return { id: itemId, ...newItem };
    }

    deleteItemCharacteristics(itemId) {
        const stmt = this.db.prepare('DELETE FROM item_characteristics WHERE item_id = ?');
        stmt.run(itemId);
        return { id: itemId };
    }

    deleteItem(id) {
        const stmt = this.db.prepare('DELETE FROM items WHERE id = ?');
        stmt.run(id);
        return { id };
    }
}

module.exports = new InventoryModel();