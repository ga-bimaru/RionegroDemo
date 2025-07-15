const mysql = require('mysql2/promise');

// Configuración de la base de datos usando variables de entorno de Railway
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.USUARIO_DB || process.env.DB_USER || 'root',
    password: process.env.MYSQLCONTRASEÑA || process.env.DB_CONTRASEÑA || process.env.DB_PASSWORD || 'andres123',
    database: process.env.MYSQLDATABASE || process.env.DB_NOMBRE || process.env.DB_NAME || 'negocio_pool',
    port: process.env.MYSQLPORT || process.env.DB_PUERTO || process.env.DB_PORT || 3306,
    ssl: process.env.NODE_ENV === 'production' || process.env.NODO_ENV === 'producción' ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;