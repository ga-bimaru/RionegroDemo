// Verificación de variables de entorno al iniciar
console.log('🔍 Verificando variables de entorno...');
console.log('PORT:', process.env.PORT || 'No definido (usará 3000)');
console.log('MYSQLHOST:', process.env.MYSQLHOST ? '✅ Definido' : '❌ No definido');
console.log('MYSQLUSER:', process.env.MYSQLUSER ? '✅ Definido' : '❌ No definido');
console.log('MYSQLCONTRASEÑA:', process.env.MYSQLCONTRASEÑA ? '✅ Definido' : '❌ No definido');
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE ? '✅ Definido' : '❌ No definido');
console.log('MYSQLPORT:', process.env.MYSQLPORT || 'No definido (usará 3306)');

console.log('\n🔍 Variables de entorno de respaldo:');
console.log('DB_HOST:', process.env.DB_HOST ? '✅ Definido' : '❌ No definido');
console.log('DB_USER:', process.env.DB_USER ? '✅ Definido' : '❌ No definido');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Definido' : '❌ No definido');
console.log('DB_NAME:', process.env.DB_NAME ? '✅ Definido' : '❌ No definido');
console.log('DB_PORT:', process.env.DB_PORT ? '✅ Definido' : '❌ No definido');

console.log('\n🚀 Iniciando servidor...\n');
