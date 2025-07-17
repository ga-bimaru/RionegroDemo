const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');

console.log('✅ Todas las dependencias principales se cargaron correctamente');
console.log('✅ Express:', express.version || 'cargado');
console.log('✅ MySQL2:', 'cargado');
console.log('✅ Express-session:', 'cargado');
console.log('✅ Bcryptjs:', 'cargado');

// Verificar conexión a base de datos
const testConnection = async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.MYSQLHOST || 'localhost',
            user: process.env.MYSQLUSER || 'root',
            password: process.env.MYSQLCONTRASEÑA || '',
            database: process.env.MYSQLDATABASE || 'test',
            port: process.env.MYSQLPORT || 3306,
            ssl: { rejectUnauthorized: false },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        console.log('🔄 Probando conexión a base de datos...');
        const connection = await pool.getConnection();
        console.log('✅ Conexión a base de datos exitosa');
        connection.release();
        await pool.end();
    } catch (error) {
        console.log('❌ Error de conexión a base de datos (normal en local):', error.message);
    }
};

testConnection();
