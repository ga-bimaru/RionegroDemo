// Script temporal para inicializar la base de datos
// Ejecutar UNA SOLA VEZ y luego eliminar este archivo

const db = require('./conexion-postgres');
const fs = require('fs');
const path = require('path');

async function inicializarBaseDatos() {
    try {
        console.log('🚀 Iniciando inicialización de base de datos...');
        
        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'init-postgres.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Ejecutar el SQL
        console.log('📝 Ejecutando script SQL...');
        await db.query(sqlContent);
        
        console.log('✅ Base de datos inicializada correctamente!');
        console.log('🔑 Credenciales por defecto:');
        console.log('   - Admin: admin@demo.com / admin123');
        console.log('   - Supervisor: supervisor@demo.com / supervisor123');
        console.log('   - Empleado: empleado@demo.com / empleado123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al inicializar base de datos:', error);
        process.exit(1);
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    inicializarBaseDatos();
}

module.exports = inicializarBaseDatos;
