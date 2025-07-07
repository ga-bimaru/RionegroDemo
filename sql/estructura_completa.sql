-- Borra todas las tablas relacionadas antes de crearlas para dejar la base de datos limpia

CREATE DATABASE IF NOT EXISTS negocio_pool;
USE negocio_pool;

-- Elimina primero las tablas hijas que dependen de otras por claves foráneas
DROP TABLE IF EXISTS factura_metodo_pago;
DROP TABLE IF EXISTS pedido;
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS alquiler;
DROP TABLE IF EXISTS mesa;
DROP TABLE IF EXISTS usuario;
-- DROP TABLE IF EXISTS producto;





-- Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    
    nombre VARCHAR(50),
    correo VARCHAR(50) UNIQUE,
    telefono VARCHAR(20),
    password VARCHAR(255),
    rol ENUM('Administrador', 'Supervisor', 'Empleado'), -- <--- Agregado Supervisor
    documento VARCHAR(20) UNIQUE -- ← agregado campo documento único
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
    metodo_pago VARCHAR(30), -- NUEVO: método de pago (efectivo, tarjeta, etc)
    total_recibido DECIMAL(10,2), -- NUEVO: cuánto recibió el cajero
    total_vuelto DECIMAL(10,2), -- NUEVO: cuánto devolvió de cambio
    id_usuario_cierre INT, -- NUEVO: quién cerró/facturó
    fecha_cierre DATETIME, -- NUEVO: cuándo se cerró/facturó
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
    id_usuario INT, -- quien generó la factura (debe permitir NULL para ON DELETE SET NULL)
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(30),
    total DECIMAL(10,2) NOT NULL,
    total_recibido DECIMAL(10,2),
    total_vuelto DECIMAL(10,2),
    numero_mesa INT, -- <-- Agregado para saber en qué mesa se vendió
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- NUEVO: Tabla para registrar el valor pagado por cada método de pago en cada factura
CREATE TABLE IF NOT EXISTS factura_metodo_pago (
    id_factura INT NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id_factura, metodo_pago),
    FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
);

-- Usuario por defecto (con documento)
INSERT INTO usuario (nombre, correo, telefono, password, rol, documento)
VALUES 
    ('Administrador', 'admin@demo.com', '3000000000', 'admin123', 'Administrador', '1098623821'),
    ('Supervisor', 'supervisor@demo.com', '3000000001', 'supervisor123', 'Supervisor', '1098623822'),
    ('Empleado', 'empleado@demo.com', '3000000002', 'empleado123', 'Empleado', '1098623823')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), rol=VALUES(rol);

-- ===================== DATOS SIMULADOS DE USUARIOS =====================
INSERT INTO usuario (nombre, correo, telefono, password, rol, documento) VALUES
('Administrador Demo', 'admin1@demo.com', '3000000003', 'admin123', 'Administrador', '1000000001'),
('Supervisor Uno', 'supervisor1@demo.com', '3000000004', 'supervisor123', 'Supervisor', '1000000002'),
('Supervisor Dos', 'supervisor2@demo.com', '3000000005', 'supervisor123', 'Supervisor', '1000000003'),
('Empleado Uno', 'empleado1@demo.com', '3000000006', 'empleado123', 'Empleado', '1000000004'),
('Empleado Dos', 'empleado2@demo.com', '3000000007', 'empleado123', 'Empleado', '1000000005'),
('Empleado Tres', 'empleado3@demo.com', '3000000008', 'empleado123', 'Empleado', '1000000006'),
('Empleado Cuatro', 'empleado4@demo.com', '3000000009', 'empleado123', 'Empleado', '1000000007'),
('Empleado Cinco', 'empleado5@demo.com', '3000000010', 'empleado123', 'Empleado', '1000000008'),
('Empleado Seis', 'empleado6@demo.com', '3000000011', 'empleado123', 'Empleado', '1000000009'),
('Empleado Siete', 'empleado7@demo.com', '3000000012', 'empleado123', 'Empleado', '1000000010'),
('Empleado Ocho', 'empleado8@demo.com', '3000000013', 'empleado123', 'Empleado', '1000000011'),
('Empleado Nueve', 'empleado9@demo.com', '3000000014', 'empleado123', 'Empleado', '1000000012'),
('Empleado Diez', 'empleado10@demo.com', '3000000015', 'empleado123', 'Empleado', '1000000013');

-- ===================== DATOS SIMULADOS DE MESAS =====================
INSERT INTO mesa (numero_mesa, estado, precio_hora) VALUES
(1, 'Disponible', 6000.00),
(2, 'Disponible', 6000.00),
(3, 'Disponible', 6000.00),
(4, 'Disponible', 6000.00),
(5, 'Disponible', 6000.00),
(6, 'Disponible', 6000.00);

-- ===================== DATOS SIMULADOS DE ALQUILERES Y FACTURAS =====================
-- Simulación de 20 ventas reales, distribuidas entre empleados, supervisores y administrador, con fechas desde hoy hasta hace 30 días
-- Incluye variedad de métodos de pago, montos y mesas

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
(1, 10, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 2.5, 15000.00, 'Finalizado', 'Efectivo', 15000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR),
(2, 11, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 10000.00, 1000.00, 3, DATE_SUB(NOW(), INTERVAL 8 DAY) + INTERVAL 2.5 HOUR),
-- Hace 12 días
(3, 12, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 3 HOUR, 3.0, 18000.00, 'Finalizado', 'Tarjeta', 18000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 3 HOUR),
(4, 13, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR, 2.0, 12000.00, 'Finalizado', 'Efectivo', 12000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR),
-- Hace 15 días
(5, 4, DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 1.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 9000.00, 0.00, 3, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 1.5 HOUR),
(6, 5, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 3.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Tarjeta', 9000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 3.5 HOUR),
-- Hace 18 días
(1, 6, DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2 HOUR, 2.0, 12000.00, 'Finalizado', 'Efectivo', 13000.00, 1000.00, 2, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2 HOUR),
(2, 7, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 9000.00, 0.00, 3, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2.5 HOUR),
-- Hace 21 días
(3, 8, DATE_SUB(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 3 HOUR, 3.0, 18000.00, 'Finalizado', 'Tarjeta', 18000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 3 HOUR),
(4, 9, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 2 HOUR, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 4 HOUR, 2.0, 12000.00, 'Finalizado', 'Efectivo', 12000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 4 HOUR),
-- Hace 25 días
(5, 10, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR, 2.5, 15000.00, 'Finalizado', 'Nequi', 15000.00, 0.00, 3, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR),
(6, 11, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Tarjeta', 9000.00, 0.00, 1, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR),
-- Hace 28 días
(1, 12, DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2 HOUR, 2.0, 12000.00, 'Finalizado', 'Efectivo', 12000.00, 0.00, 2, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2 HOUR),
(2, 13, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 1 HOUR, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2.5 HOUR, 1.5, 9000.00, 'Finalizado', 'Nequi', 10000.00, 1000.00, 3, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2.5 HOUR);

-- ===================== DATOS SIMULADOS DE FACTURAS =====================
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
(10, 2, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR, 'Efectivo', 12000.00, 12000.00, 0.00, 4),
(11, 3, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 1.5 HOUR, 'Nequi', 9000.00, 9000.00, 0.00, 5),
(12, 1, DATE_SUB(NOW(), INTERVAL 15 DAY) + INTERVAL 3.5 HOUR, 'Tarjeta', 9000.00, 9000.00, 0.00, 6),
(13, 2, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2 HOUR, 'Efectivo', 12000.00, 13000.00, 1000.00, 1),
(14, 3, DATE_SUB(NOW(), INTERVAL 18 DAY) + INTERVAL 2.5 HOUR, 'Nequi', 9000.00, 9000.00, 0.00, 2),
(15, 1, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 3 HOUR, 'Tarjeta', 18000.00, 18000.00, 0.00, 3),
(16, 2, DATE_SUB(NOW(), INTERVAL 21 DAY) + INTERVAL 4 HOUR, 'Efectivo', 12000.00, 12000.00, 0.00, 4),
(17, 3, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR, 'Nequi', 15000.00, 15000.00, 0.00, 5),
(18, 1, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 2.5 HOUR, 'Tarjeta', 9000.00, 9000.00, 0.00, 6),
(19, 2, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2 HOUR, 'Efectivo', 12000.00, 12000.00, 0.00, 1),
(20, 3, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2.5 HOUR, 'Nequi', 9000.00, 10000.00, 1000.00, 2);

-- ===================== DATOS SIMULADOS DE FACTURA_METODO_PAGO =====================
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
(10, 'Efectivo', 12000.00),
(11, 'Nequi', 9000.00),
(12, 'Tarjeta', 9000.00),
(13, 'Efectivo', 12000.00),
(14, 'Nequi', 9000.00),
(15, 'Tarjeta', 18000.00),
(16, 'Efectivo', 12000.00),
(17, 'Nequi', 15000.00),
(18, 'Tarjeta', 9000.00),
(19, 'Efectivo', 12000.00),
(20, 'Nequi', 9000.00);

-- ===================== FIN DE DATOS SIMULADOS =====================

-- Triggers para actualizar automáticamente el estado de la mesa cuando cambia un alquiler
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

-- Ejemplo de procedimiento almacenado para facturar y actualizar alquiler
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
select * from alquiler;
select * from factura;
select * from factura_metodo_pago