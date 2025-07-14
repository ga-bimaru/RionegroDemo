#!/usr/bin/env node

/**
 * Script de verificación para Railway
 * Verifica que todos los archivos necesarios estén presentes y configurados correctamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración para Railway...\n');

const requiredFiles = [
    'package.json',
    'server.js',
    'conexion.js',
    'railway.json',
    'init.sql',
    '.gitignore',
    'README.md',
    '.env.example'
];

const requiredDirs = [
    'public',
    'public/css',
    'public/js',
    'public/images'
];

let allGood = true;

// Verificar archivos requeridos
console.log('📄 Verificando archivos requeridos:');
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANTE`);
        allGood = false;
    }
}

// Verificar directorios requeridos
console.log('\n📁 Verificando directorios requeridos:');
for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/`);
    } else {
        console.log(`❌ ${dir}/ - FALTANTE`);
        allGood = false;
    }
}

// Verificar package.json
console.log('\n📦 Verificando package.json:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log('✅ Script "start" configurado');
    } else {
        console.log('❌ Script "start" faltante');
        allGood = false;
    }
    
    if (packageJson.engines && packageJson.engines.node) {
        console.log('✅ Versión de Node.js especificada');
    } else {
        console.log('❌ Versión de Node.js no especificada');
        allGood = false;
    }
    
    const requiredDeps = ['express', 'mysql2', 'cors', 'body-parser'];
    for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ Dependencia ${dep}`);
        } else {
            console.log(`❌ Dependencia ${dep} faltante`);
            allGood = false;
        }
    }
} catch (error) {
    console.log('❌ Error al leer package.json:', error.message);
    allGood = false;
}

// Verificar railway.json
console.log('\n🚂 Verificando railway.json:');
try {
    const railwayJson = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
    
    if (railwayJson.build && railwayJson.build.builder) {
        console.log('✅ Builder configurado');
    } else {
        console.log('❌ Builder no configurado');
        allGood = false;
    }
    
    if (railwayJson.deploy && railwayJson.deploy.startCommand) {
        console.log('✅ Comando de inicio configurado');
    } else {
        console.log('❌ Comando de inicio no configurado');
        allGood = false;
    }
} catch (error) {
    console.log('❌ Error al leer railway.json:', error.message);
    allGood = false;
}

// Verificar server.js
console.log('\n🖥️ Verificando server.js:');
try {
    const serverJs = fs.readFileSync('server.js', 'utf8');
    
    if (serverJs.includes('process.env.PORT')) {
        console.log('✅ Puerto configurado con variable de entorno');
    } else {
        console.log('❌ Puerto no usa variable de entorno');
        allGood = false;
    }
    
    if (serverJs.includes('process.env.DB_HOST') || serverJs.includes('process.env.DATABASE_URL')) {
        console.log('✅ Base de datos configurada con variables de entorno');
    } else {
        console.log('❌ Base de datos no usa variables de entorno');
        allGood = false;
    }
} catch (error) {
    console.log('❌ Error al leer server.js:', error.message);
    allGood = false;
}

// Verificar init.sql
console.log('\n🗄️ Verificando init.sql:');
try {
    const initSql = fs.readFileSync('init.sql', 'utf8');
    
    if (initSql.includes('CREATE TABLE') && initSql.includes('usuario')) {
        console.log('✅ Estructura de base de datos presente');
    } else {
        console.log('❌ Estructura de base de datos incompleta');
        allGood = false;
    }
    
    if (initSql.includes('INSERT INTO usuario')) {
        console.log('✅ Datos iniciales de usuarios presentes');
    } else {
        console.log('❌ Datos iniciales de usuarios faltantes');
        allGood = false;
    }
} catch (error) {
    console.log('❌ Error al leer init.sql:', error.message);
    allGood = false;
}

// Resultado final
console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 ¡Todo está listo para Railway!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Sube el proyecto a GitHub');
    console.log('2. Conéctalo a Railway');
    console.log('3. Crea la base de datos MySQL');
    console.log('4. ¡Disfruta tu aplicación en la web!');
} else {
    console.log('⚠️ Hay problemas que necesitan ser corregidos antes del despliegue.');
    console.log('Por favor, revisa los elementos marcados con ❌');
}
console.log('='.repeat(50));

process.exit(allGood ? 0 : 1);
