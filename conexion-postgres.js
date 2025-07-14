const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rionegro_demo',
    user: process.env.DB_USER || 'rionegro_user',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Función para ejecutar consultas
const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        pool.query(text, params, (err, result) => {
            if (err) {
                console.error('Error en consulta PostgreSQL:', err);
                reject(err);
            } else {
                // PostgreSQL devuelve result.rows, no result directamente
                resolve({ 
                    rows: result.rows, 
                    rowCount: result.rowCount,
                    insertId: result.rows[0]?.id_usuario || result.rows[0]?.id_mesa || null
                });
            }
        });
    });
};

// Evento de conexión exitosa
pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
});

// Evento de error
pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err);
});

// Función para cerrar conexiones
const closePool = () => {
    return pool.end();
};

// Función de compatibilidad con MySQL - convertir consultas
const convertMySQLToPostgreSQL = (query, params) => {
    let pgQuery = query;
    let paramIndex = 1;
    
    // Convertir ? a $1, $2, etc.
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
    
    return { query: pgQuery, params };
};

// Función query compatible con sintaxis MySQL
const queryMySQL = async (text, params = []) => {
    const { query: pgQuery, params: pgParams } = convertMySQLToPostgreSQL(text, params);
    const result = await query(pgQuery, pgParams);
    
    // Simular estructura de respuesta MySQL
    return [result.rows, { insertId: result.insertId, affectedRows: result.rowCount }];
};

module.exports = {
    query: queryMySQL,  // Usar la versión compatible
    pool,
    closePool
};
