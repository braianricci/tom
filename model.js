const { db, init, seed } = require('./db.js');

class InventoryModel {

    constructor() {
        this.db = db;
        this.queue = [];
        init();
        seed();
    }

    /*------------------------------- Inventory ---------------------------------*/

    //devuelve todas las categorias
    getCategories(callback) {
        db.all('SELECT * FROM categories', [], (err, rows) => {
            if (err) return callback(err);
            callback(null, rows);
        });
    }

    //devuelve todos los items de una categoria
    getItemsByCategory(categoryId, callback) {
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

        this.db.all(sql, params, (err, rows) => {
            if (err) return callback(err);

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

            callback(null, Object.values(grouped));
        });
    }

    //devuelve las caracteristivas de un item por id    
    getItemCharacteristics(itemId, callback) {
        const sql = `
            SELECT characteristics.name AS key, item_characteristics.value
            FROM item_characteristics
            JOIN characteristics ON item_characteristics.characteristic_id = characteristics.id
            WHERE item_caracteristics.item_id = ?
        `;
        this.db.all(sql, [itemId], callback);
    };

    //inserta una nueva categoria y sus respectivas caracteristicas
    insertCategory(name, characteristics, callback) {
        const db = this.db;

        db.serialize(() => {
            db.run(`INSERT INTO categories (name) VALUES (?)`, [name], function (err) {
                if (err) return callback(err);

                const categoryId = this.lastID;
                const stmt = db.prepare(`INSERT INTO characteristics (category_id, name) VALUES (?,? )`);

                characteristics.forEach(name => {
                    stmt.run(categoryId, name, err => {
                        if (err) console.error('Error insertando caracteristica:', err.message);
                    });
                });

                stmt.finalize(err => {
                    if (err) return callback(err);
                    callback(null, { id: categoryId, name, characteristics });
                });
            })
        });
    }

    //devuelve caracteristicas de una categoria
    getCharacteristicsByCategory(categoryId, callback) {
        const sql = `
            SELECT * FROM characteristics 
            WHERE category_id = ?;
        `;
        this.db.all(sql, [categoryId], callback);
    }

    //agrega un item y sus caracteristicas
    insertItem(categoryId, item, callback) {
        db.serialize(() => {
            db.run(
                `INSERT INTO items (category_id) VALUES (?)`,
                [categoryId],
                function (err) {
                    if (err) return callback(err);

                    const itemId = this.lastID;

                    db.all(
                        `SELECT id, name FROM characteristics WHERE category_id = ?`,
                        [categoryId],
                        (err, characteristics) => {
                            if (err) return callback(err);

                            const stmt = db.prepare(`
                            INSERT INTO item_characteristics (item_id, characteristic_id, value)
                            VALUES (?, ?, ?)
                        `);

                            characteristics.forEach(({ id, name }) => {
                                stmt.run(itemId, id, item.characteristics[name] || '');
                            });

                            stmt.finalize(err => {
                                if (err) return callback(err);
                                callback(null, {
                                    id: itemId,
                                    categoryId,
                                    characteristics: item.characteristics,
                                });
                            });
                        }
                    );
                }
            );
        });
    }

    //actualiza un item
    updateItem(itemId, newItem, callback) {
        db.serialize(() => {
            const stmt = db.prepare(`
            UPDATE item_characteristics
            SET value = ?
            WHERE item_id = ? AND characteristic_id = (
                SELECT id FROM characteristics WHERE name = ? AND category_id = (
                    SELECT category_id FROM items WHERE id = ?
                )
            )
        `);

            for (const [key, value] of Object.entries(newItem.characteristics)) {
                stmt.run([value, itemId, key, itemId], err => {
                    if (err) console.error('Error updating item characteristic:', err.message);
                });
            }

            stmt.finalize(err => {
                if (err) return callback(err);
                callback(null, { id: itemId, ...newItem });
            });
        });
    }
}

module.exports = new InventoryModel();