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

                characteristics.forEach(c => {
                    stmt.run(categoryId, c.name, err => {
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
}

module.exports = new InventoryModel();