const mysql = require('mysql2/promise');

// Configuración de la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'andres123',
    database: 'negocio_pool',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool;