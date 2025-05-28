-- Borra todas las tablas relacionadas antes de crearlas para dejar la base de datos limpia

CREATE DATABASE IF NOT EXISTS negocio_pool;
USE negocio_pool;

DROP TABLE IF EXISTS pedido;
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
    rol ENUM('Administrador', 'Empleado')
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
    FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX (estado),
    INDEX (id_mesa, estado)
);

-- Tabla Productos
CREATE TABLE IF NOT EXISTS producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT,
    categoria VARCHAR(50) DEFAULT NULL,
    imagen VARCHAR(255) DEFAULT NULL,
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

-- Usuario por defecto
INSERT INTO usuario (nombre, correo, telefono, password, rol)
VALUES ('Administrador', 'admin@demo.com', '3000000000', 'admin123', 'Administrador')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

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

-- Fin del script limpio y funcional
