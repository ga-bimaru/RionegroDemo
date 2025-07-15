const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración de conexión a Railway (usando host público)
const config = {
    host: 'gondola.proxy.rlwy.net',
    user: 'root',
    password: 'hjVrtXzQBozbBrXzJDaHfcGfpaYUSitA',
    database: 'railway',
    port: 18311,
    ssl: { rejectUnauthorized: false }
};

async function initializeDatabase() {
    let connection;
    
    try {
        console.log('🔌 Conectando a la base de datos de Railway...');
        
        // Crear conexión
        connection = await mysql.createConnection(config);
        
        console.log('✅ Conexión exitosa!');
        
        // Leer el archivo SQL
        console.log('📖 Leyendo archivo init.sql...');
        const sqlContent = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        
        // Dividir el contenido en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Ejecutando ${statements.length} statements SQL...`);
        
        // Ejecutar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} ejecutado`);
                } catch (error) {
                    console.log(`⚠️  Warning en statement ${i + 1}: ${error.message}`);
                    // Continuamos con el siguiente statement
                }
            }
        }
        
        console.log('🎉 ¡Base de datos inicializada correctamente!');
        
        // Verificar que las tablas se crearon
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📊 Tablas creadas:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Conexión cerrada');
        }
    }
}

// Ejecutar la función
initializeDatabase();
