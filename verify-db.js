const mysql = require('mysql2/promise');

// Configuración de conexión a Railway
const config = {
    host: 'gondola.proxy.rlwy.net',
    user: 'root',
    password: 'hjVrtXzQBozbBrXzJDaHfcGfpaYUSitA',
    database: 'railway',
    port: 18311,
    ssl: { rejectUnauthorized: false }
};

async function verifyDatabase() {
    let connection;
    
    try {
        console.log('🔌 Conectando a Railway...');
        connection = await mysql.createConnection(config);
        
        // Verificar tablas
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('\n📊 Tablas en la base de datos:');
        tables.forEach(table => {
            console.log(`   ✅ ${Object.values(table)[0]}`);
        });
        
        // Verificar usuarios
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM usuario');
        console.log(`\n👥 Usuarios en la base: ${users[0].count}`);
        
        // Verificar mesas
        const [mesas] = await connection.execute('SELECT COUNT(*) as count FROM mesa');
        console.log(`🎱 Mesas en la base: ${mesas[0].count}`);
        
        // Verificar productos
        const [productos] = await connection.execute('SELECT COUNT(*) as count FROM producto');
        console.log(`🛍️  Productos en la base: ${productos[0].count}`);
        
        console.log('\n🎉 ¡Base de datos lista para usar!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

verifyDatabase();
