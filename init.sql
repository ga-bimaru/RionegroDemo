-- Archivo SQL para inicializar la base de datos en Railway
-- Este archivo se ejecutará automáticamente cuando Railway configure la base de datos

-- ==================== ESTRUCTURA COMPLETA DE LA BASE DE DATOS ====================

-- Elimina primero las tablas hijas que dependen de otras por claves foráneas
DROP TABLE IF EXISTS factura_metodo_pago;
DROP TABLE IF EXISTS pedido;
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS alquiler;
DROP TABLE IF EXISTS mesa;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS gasto;

-- Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    correo VARCHAR(50) UNIQUE,
    telefono VARCHAR(20),
    password VARCHAR(255),
    rol ENUM('Administrador', 'Supervisor', 'Empleado'),
    documento VARCHAR(20) UNIQUE
);

-- Tabla Mesas
CREATE TABLE IF NOT EXISTS mesa (
    id_mesa INT AUTO_INCREMENT PRIMARY KEY,
    numero_mesa INT,
    estado ENUM('Disponible', 'Ocupada', 'Mantenimiento') DEFAULT 'Disponible',
    precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 6000.00,
    INDEX (estado)
);

-- Tabla Alquileres
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
    FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario_cierre) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX (estado),
    INDEX (id_mesa, estado)
);

-- Tabla Productos
CREATE TABLE IF NOT EXISTS producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT,
    categoria VARCHAR(50) NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    costo_unitario DECIMAL(10,2) DEFAULT 0,
    INDEX (categoria)
);

-- Tabla Pedidos
CREATE TABLE IF NOT EXISTS pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_alquiler INT NOT NULL,
    id_producto INT NOT NULL,
    hora_pedido DATETIME NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    estado ENUM('Por Pagar', 'Ya Pagada') NOT NULL DEFAULT 'Por Pagar',
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX (id_alquiler)
);

-- Tabla Gastos
CREATE TABLE IF NOT EXISTS gasto (
    id_gasto INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255),
    monto DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50)
);

-- Tabla Factura
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
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabla para registrar el valor pagado por cada método de pago en cada factura
CREATE TABLE IF NOT EXISTS factura_metodo_pago (
    id_factura INT NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id_factura, metodo_pago),
    FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
);

-- ==================== DATOS INICIALES ====================

-- Usuarios por defecto
INSERT INTO usuario (nombre, correo, telefono, password, rol, documento) VALUES 
('Administrador', 'admin@demo.com', '3000000000', 'admin123', 'Administrador', '1098623821'),
('Supervisor', 'supervisor@demo.com', '3000000001', 'supervisor123', 'Supervisor', '1098623822'),
('Empleado', 'empleado@demo.com', '3000000002', 'empleado123', 'Empleado', '1098623823')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), rol=VALUES(rol);

-- Mesas iniciales
INSERT INTO mesa (numero_mesa, estado, precio_hora) VALUES
(1, 'Disponible', 6000.00),
(2, 'Disponible', 6000.00),
(3, 'Disponible', 6000.00),
(4, 'Disponible', 6000.00),
(5, 'Disponible', 6000.00),
(6, 'Disponible', 6000.00);

-- Productos de ejemplo
INSERT INTO producto (nombre, precio, stock, categoria, imagen, costo_unitario) VALUES
('Cerveza Águila', 5000, 100, 'Bebidas', 'cerveza-aguila.jpg', 3000),
('Gaseosa Coca-Cola', 3000, 50, 'Bebidas', 'coca-cola.jpg', 2000),
('Agua', 2000, 30, 'Bebidas', 'agua.jpg', 1000),
('Papas Margarita', 4000, 25, 'Snacks', 'papas.jpg', 2500),
('Cigarrillos Marlboro', 8000, 20, 'Cigarrillos', 'marlboro.jpg', 6000)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), precio=VALUES(precio);

-- ==================== TRIGGERS ====================

DELIMITER //
CREATE TRIGGER after_alquiler_update 
AFTER UPDATE ON alquiler
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Finalizado' AND OLD.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Disponible' WHERE id_mesa = NEW.id_mesa;
    END IF;
END//

CREATE TRIGGER after_alquiler_insert
AFTER INSERT ON alquiler
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Ocupada' WHERE id_mesa = NEW.id_mesa;
    END IF;
END//
DELIMITER ;

-- ==================== PROCEDIMIENTOS ALMACENADOS ====================

DROP PROCEDURE IF EXISTS facturar_alquiler;
DELIMITER //
CREATE PROCEDURE facturar_alquiler(
    IN p_id_alquiler INT,
    IN p_id_usuario INT,
    IN p_metodo_pago VARCHAR(30),
    IN p_total DECIMAL(10,2),
    IN p_total_recibido DECIMAL(10,2),
    IN p_total_vuelto DECIMAL(10,2),
    IN p_numero_mesa INT
)
BEGIN
    -- Insertar en factura
    INSERT INTO factura (id_alquiler, id_usuario, metodo_pago, total, total_recibido, total_vuelto, numero_mesa)
    VALUES (p_id_alquiler, p_id_usuario, p_metodo_pago, p_total, p_total_recibido, p_total_vuelto, p_numero_mesa);

    -- Actualizar alquiler
    UPDATE alquiler
    SET estado = 'Finalizado',
        id_usuario_cierre = p_id_usuario,
        fecha_cierre = NOW(),
        metodo_pago = p_metodo_pago,
        total_a_pagar = p_total,
        total_recibido = p_total_recibido,
        total_vuelto = p_total_vuelto
    WHERE id_alquiler = p_id_alquiler;
END//
DELIMITER ;

-- Confirmar que todo se ejecutó correctamente
SELECT 'Base de datos inicializada correctamente' AS status;

-- ==================== DATOS DE DEMOSTRACIÓN ADICIONALES ====================

-- Usuarios adicionales para demostración
INSERT INTO usuario (nombre, correo, telefono, password, rol, documento) VALUES
('Administrador Demo', 'admin1@demo.com', '3000000003', 'admin123', 'Administrador', '1000000001'),
('Supervisor Uno', 'supervisor1@demo.com', '3000000004', 'supervisor123', 'Supervisor', '1000000002'),
('Supervisor Dos', 'supervisor2@demo.com', '3000000005', 'supervisor123', 'Supervisor', '1000000003'),
('Empleado Uno', 'empleado1@demo.com', '3000000006', 'empleado123', 'Empleado', '1000000004'),
('Empleado Dos', 'empleado2@demo.com', '3000000007', 'empleado123', 'Empleado', '1000000005'),
('Empleado Tres', 'empleado3@demo.com', '3000000008', 'empleado123', 'Empleado', '1000000006')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), rol=VALUES(rol);

-- Datos de demostración de alquileres (últimos 15 días)
INSERT INTO alquiler (id_mesa, id_usuario, hora_inicio, hora_fin, total_tiempo, total_a_pagar, estado, metodo_pago, total_recibido, total_vuelto, id_usuario_cierre, fecha_cierre) VALUES
-- Hoy
(1, 4, DATE_SUB(NOW(), INTERVAL 0 DAY), DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 1.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Efectivo', 10000.00, 1000.00, 2, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 1.5 HOUR),
(2, 5, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 3.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 9000.00, 0.00, 3, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 3.5 HOUR),
-- Hace 2 días
(3, 6, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2 HOUR, 2.0, 12000.00, 'Finalizado', 'Tarjeta', 12000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2 HOUR),
(4, 7, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Efectivo', 10000.00, 1000.00, 2, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2.5 HOUR),
-- Hace 5 días
(5, 8, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR, 3.0, 18000.00, 'Finalizado', 'Nequi', 18000.00, 0.00, 3, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR),
(6, 9, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 4 HOUR, 2.0, 12000.00, 'Finalizado', 'Tarjeta', 12000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 4 HOUR),
-- Hace 8 días
(1, 4, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 2.5, 15000.00, 'Finalizado', 'Efectivo', 15000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR),
(2, 5, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 10000.00, 1000.00, 3, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR),
-- Hace 12 días
(3, 6, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 3 HOUR, 3.0, 18000.00, 'Finalizado', 'Tarjeta', 18000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 3 HOUR),
(4, 7, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR, 2.0, 12000.00, 'Finalizado', 'Efectivo', 12000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR);

-- Facturas correspondientes a los alquileres
INSERT INTO factura (id_alquiler, id_usuario, fecha, metodo_pago, total, total_recibido, total_vuelto, numero_mesa) VALUES
(1, 2, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 1.5 HOUR, 'Efectivo', 9000.00, 10000.00, 1000.00, 1),
(2, 3, DATE_SUB(NOW(), INTERVAL 0 DAY) + INTERVAL 3.5 HOUR, 'Nequi', 9000.00, 9000.00, 0.00, 2),
(3, 1, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2 HOUR, 'Tarjeta', 12000.00, 12000.00, 0.00, 3),
(4, 2, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2.5 HOUR, 'Efectivo', 9000.00, 10000.00, 1000.00, 4),
(5, 3, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR, 'Nequi', 18000.00, 18000.00, 0.00, 5),
(6, 1, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 4 HOUR, 'Tarjeta', 12000.00, 12000.00, 0.00, 6),
(7, 2, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 'Efectivo', 15000.00, 15000.00, 0.00, 1),
(8, 3, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 'Nequi', 9000.00, 10000.00, 1000.00, 2),
(9, 1, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 3 HOUR, 'Tarjeta', 18000.00, 18000.00, 0.00, 3),
(10, 2, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR, 'Efectivo', 12000.00, 12000.00, 0.00, 4);

-- Registros de métodos de pago para las facturas
INSERT INTO factura_metodo_pago (id_factura, metodo_pago, valor) VALUES
(1, 'Efectivo', 9000.00),
(2, 'Nequi', 9000.00),
(3, 'Tarjeta', 12000.00),
(4, 'Efectivo', 9000.00),
(5, 'Nequi', 18000.00),
(6, 'Tarjeta', 12000.00),
(7, 'Efectivo', 15000.00),
(8, 'Nequi', 9000.00),
(9, 'Tarjeta', 18000.00),
(10, 'Efectivo', 12000.00);

-- Algunos gastos de ejemplo
INSERT INTO gasto (fecha, descripcion, monto, categoria) VALUES
(CURDATE(), 'Compra de cervezas', 150000, 'Inventario'),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Pago de servicios públicos', 80000, 'Servicios'),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Mantenimiento de mesas', 45000, 'Mantenimiento'),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Compra de snacks', 75000, 'Inventario'),
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'Limpieza y aseo', 35000, 'Servicios');
