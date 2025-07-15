const mysql = require('mysql2/promise');

const config = {
    host: 'gondola.proxy.rlwy.net',
    user: 'root',
    password: 'hjVrtXzQBozbBrXzJDaHfcGfpaYUSitA',
    database: 'railway',
    port: 18311,
    ssl: { rejectUnauthorized: false }
};

async function createBasicTables() {
    let connection;
    
    try {
        console.log('🔌 Conectando a Railway...');
        connection = await mysql.createConnection(config);
        console.log('✅ Conexión exitosa!');
        
        // Crear tablas una por una
        console.log('📝 Creando tablas...');
        
        // 1. Tabla usuario
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuario (
                id_usuario INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50),
                correo VARCHAR(50) UNIQUE,
                telefono VARCHAR(20),
                password VARCHAR(255),
                rol ENUM('Administrador', 'Supervisor', 'Empleado'),
                documento VARCHAR(20) UNIQUE
            )
        `);
        console.log('✅ Tabla usuario creada');
        
        // 2. Tabla mesa
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS mesa (
                id_mesa INT AUTO_INCREMENT PRIMARY KEY,
                numero_mesa INT,
                estado ENUM('Disponible', 'Ocupada', 'Mantenimiento') DEFAULT 'Disponible',
                precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 6000.00
            )
        `);
        console.log('✅ Tabla mesa creada');
        
        // 3. Tabla producto
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS producto (
                id_producto INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL,
                precio DECIMAL(10, 2) NOT NULL,
                stock INT,
                categoria VARCHAR(50) NOT NULL,
                imagen VARCHAR(255) NOT NULL,
                costo_unitario DECIMAL(10,2) DEFAULT 0
            )
        `);
        console.log('✅ Tabla producto creada');
        
        // 4. Tabla alquiler
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS alquiler (
                id_alquiler INT AUTO_INCREMENT PRIMARY KEY,
                id_mesa INT NOT NULL,
                id_usuario INT,
                hora_inicio DATETIME NOT NULL,
                hora_fin DATETIME,
                total_tiempo DECIMAL(10, 2),
                total_a_pagar DECIMAL(10, 2),
                estado ENUM('Activo', 'Finalizado') NOT NULL DEFAULT 'Activo',
                metodo_pago VARCHAR(30),
                total_recibido DECIMAL(10,2),
                total_vuelto DECIMAL(10,2),
                id_usuario_cierre INT,
                fecha_cierre DATETIME,
                FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa),
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
                FOREIGN KEY (id_usuario_cierre) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('✅ Tabla alquiler creada');
        
        // 5. Tabla pedido
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pedido (
                id_pedido INT AUTO_INCREMENT PRIMARY KEY,
                id_alquiler INT NOT NULL,
                id_producto INT NOT NULL,
                hora_pedido DATETIME NOT NULL,
                cantidad INT NOT NULL DEFAULT 1,
                subtotal DECIMAL(10, 2) NOT NULL,
                descuento DECIMAL(10,2) DEFAULT 0,
                estado ENUM('Por Pagar', 'Ya Pagada') NOT NULL DEFAULT 'Por Pagar',
                FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler),
                FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
            )
        `);
        console.log('✅ Tabla pedido creada');
        
        // 6. Tabla factura
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS factura (
                id_factura INT AUTO_INCREMENT PRIMARY KEY,
                id_alquiler INT NOT NULL,
                id_usuario INT,
                fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                metodo_pago VARCHAR(30),
                total DECIMAL(10,2) NOT NULL,
                total_recibido DECIMAL(10,2),
                total_vuelto DECIMAL(10,2),
                numero_mesa INT,
                FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler),
                FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
            )
        `);
        console.log('✅ Tabla factura creada');
        
        // 7. Tabla gasto
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS gasto (
                id_gasto INT AUTO_INCREMENT PRIMARY KEY,
                fecha DATE NOT NULL,
                descripcion VARCHAR(255),
                monto DECIMAL(10,2) NOT NULL,
                categoria VARCHAR(50)
            )
        `);
        console.log('✅ Tabla gasto creada');
        
        // 8. Tabla factura_metodo_pago
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS factura_metodo_pago (
                id_factura INT NOT NULL,
                metodo_pago VARCHAR(30) NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                PRIMARY KEY (id_factura, metodo_pago),
                FOREIGN KEY (id_factura) REFERENCES factura(id_factura)
            )
        `);
        console.log('✅ Tabla factura_metodo_pago creada');
        
        // Insertar datos iniciales
        console.log('\n📊 Insertando datos iniciales...');
        
        // Usuarios
        await connection.execute(`
            INSERT IGNORE INTO usuario (nombre, correo, telefono, password, rol, documento) VALUES 
            ('Administrador', 'admin@demo.com', '3000000000', 'admin123', 'Administrador', '1098623821'),
            ('Supervisor', 'supervisor@demo.com', '3000000001', 'supervisor123', 'Supervisor', '1098623822'),
            ('Empleado', 'empleado@demo.com', '3000000002', 'empleado123', 'Empleado', '1098623823')
        `);
        console.log('✅ Usuarios insertados');
        
        // Mesas
        await connection.execute(`
            INSERT IGNORE INTO mesa (numero_mesa, estado, precio_hora) VALUES
            (1, 'Disponible', 6000.00),
            (2, 'Disponible', 6000.00),
            (3, 'Disponible', 6000.00),
            (4, 'Disponible', 6000.00),
            (5, 'Disponible', 6000.00),
            (6, 'Disponible', 6000.00)
        `);
        console.log('✅ Mesas insertadas');
        
        // Productos
        await connection.execute(`
            INSERT IGNORE INTO producto (nombre, precio, stock, categoria, imagen, costo_unitario) VALUES
            ('Cerveza Águila', 5000, 100, 'Bebidas', 'cerveza-aguila.jpg', 3000),
            ('Gaseosa Coca-Cola', 3000, 50, 'Bebidas', 'coca-cola.jpg', 2000),
            ('Agua', 2000, 30, 'Bebidas', 'agua.jpg', 1000),
            ('Papas Margarita', 4000, 25, 'Snacks', 'papas.jpg', 2500),
            ('Cigarrillos Marlboro', 8000, 20, 'Cigarrillos', 'marlboro.jpg', 6000)
        `);
        console.log('✅ Productos insertados');
        
        console.log('\n🎉 ¡Base de datos completamente inicializada!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Conexión cerrada');
        }
    }
}

createBasicTables();
