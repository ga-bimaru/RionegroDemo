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
DROP TABLE IF EXISTS gasto;



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
