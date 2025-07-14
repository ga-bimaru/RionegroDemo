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

// Evento de conexión exitosa
pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
});

// Evento de error
pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err);
});

// Función query que simula MySQL exactamente
const query = (text, params = []) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Convertir sintaxis MySQL (?) a PostgreSQL ($1, $2, etc.)
            let pgText = text;
            let paramIndex = 1;
            pgText = pgText.replace(/\?/g, () => `$${paramIndex++}`);
            
            // Ejecutar consulta
            const result = await pool.query(pgText, params);
            
            // Simular exactamente la respuesta de MySQL
            const mysqlResponse = [
                result.rows,  // Primer elemento: filas
                {
                    insertId: result.rows[0]?.id_usuario || result.rows[0]?.id_mesa || result.rows[0]?.id_producto || result.rows[0]?.id_alquiler || result.rows[0]?.id_pedido || result.rows[0]?.id_factura || result.rows[0]?.id_gasto || 0,
                    affectedRows: result.rowCount || 0,
                    fieldCount: result.fields?.length || 0
                }
            ];
            
            resolve(mysqlResponse);
        } catch (error) {
            console.error('Error en consulta PostgreSQL:', error);
            reject(error);
        }
    });
};

// Función para cerrar conexiones
const closePool = () => {
    return pool.end();
};

module.exports = {
    query,
    pool,
    closePool
};
