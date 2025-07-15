const mysql = require('mysql2/promise');

// Configuración de la base de datos usando variables de entorno de Railway
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'gondola.proxy.rlwy.net',
    user: process.env.MYSQLUSER || process.env.DB_USER || process.env.USUARIO_DB || 'root',
    password: process.env.MYSQLCONTRASEÑA || process.env.DB_PASSWORD || process.env.DB_CONTRASEÑA || 'hjVrtXzQBozbBrXzJDaHfcGfpaYUSitA',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || process.env.DB_NOMBRE || 'railway',
    port: process.env.MYSQLPORT || process.env.DB_PORT || process.env.DB_PUERTO || 18311,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;