-- Borra todas las tablas relacionadas antes de crearlas para dejar la base de datos limpia

CREATE DATABASE IF NOT EXISTS negocio_pool;
USE negocio_pool;

DROP TABLE IF EXISTS pedida;
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
-- Tabla MesasF NOT EXISTS mesa (
CREATE TABLE IF NOT EXISTS mesa (IMARY KEY,
    id_mesa INT AUTO_INCREMENT PRIMARY KEY,
    numero_mesa INT,ponible', 'Ocupada', 'Mantenimiento') DEFAULT 'Disponible',
    estado ENUM('Disponible', 'Ocupada', 'Mantenimiento') DEFAULT 'Disponible',
    precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 6000.00,
    INDEX (estado) -- Índice para buscar por estado
);
-- Tabla Alquileres
-- Tabla Alquileres EXISTS alquiler (
CREATE TABLE IF NOT EXISTS alquiler (IMARY KEY,
    id_alquiler INT AUTO_INCREMENT PRIMARY KEY,
    id_mesa INT NOT NULL,
    id_usuario INT,ETIME NOT NULL,
    hora_inicio DATETIME NOT NULL,
    hora_fin DATETIME,AL(10, 2),
    total_tiempo DECIMAL(10, 2),,
    total_a_pagar DECIMAL(10, 2),zado') NOT NULL DEFAULT 'Activo',
    estado ENUM('Activo', 'Finalizado') NOT NULL DEFAULT 'Activo',
    FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,o) REFERENCES usuario(id_usuario)
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE SET NULL 
        ON UPDATE CASCADE,ice para buscar alquileres activos
    INDEX (estado), -- Índice para buscar alquileres activosalquileres activos de una mesa
    INDEX (id_mesa, estado) -- Índice compuesto para buscar alquileres activos de una mesa
);
-- Tabla Productos
CREATE TABLE IF NOT EXISTS producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,NT PRIMARY KEY,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT,IMAL(10, 2) NOT NULL,
    categoria VARCHAR(50) DEFAULT NULL,
    imagen VARCHAR(255) DEFAULT NULL,L,
    INDEX (categoria) -- Índice para buscar por categoría
);  INDEX (categoria) -- Índice para buscar por categoría
);
-- Tabla Pedidos
CREATE TABLE IF NOT EXISTS pedido (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_alquiler INT NOT NULL,ENT PRIMARY KEY,
    id_producto INT NOT NULL,
    hora_pedido DATETIME NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    estado ENUM('Por Pagar', 'Ya Pagada') NOT NULL DEFAULT 'Por Pagar',r Pagar',
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler)
        ON DELETE CASCADE -- Si se borra un alquiler, se borran sus pedidos-- Si se borra un alquiler, se borran sus pedidos
        ON UPDATE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
        ON DELETE RESTRICT -- No permitir borrar productos con pedidos -- No permitir borrar productos con pedidos
        ON UPDATE CASCADE,
    INDEX (id_alquiler) -- Índice para buscar pedidos por alquilerÑ  INDEX (id_alquiler) -- Índice para buscar pedidos por alquilerÑ
););

-- Después de crear las tablas, inserta un usuario por defecto para pruebas
INSERT INTO usuario (nombre, correo, telefono, password, rol)
VALUES ('Administrador', 'admin@demo.com', '3000000000', 'admin123', 'Administrador')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);    fecha DATE NOT NULL,

-- Crear un trigger para actualizar automáticamente el estado de la mesa cuando cambia un alquilerCIMAL(10,2) NOT NULL,
DELIMITER //
CREATE TRIGGER after_alquiler_update 
AFTER UPDATE ON alquiler
FOR EACH ROWspués de crear las tablas, inserta un usuario por defecto para pruebas
BEGIN
    IF NEW.estado = 'Finalizado' AND OLD.estado = 'Activo' THENnistrador')
        UPDATE mesa SET estado = 'Disponible' WHERE id_mesa = NEW.id_mesa;E KEY UPDATE nombre=VALUES(nombre);
    END IF;
END//-- Crear un trigger para actualizar automáticamente el estado de la mesa cuando cambia un alquiler

CREATE TRIGGER after_alquiler_insertuiler_update 
AFTER INSERT ON alquiler ON alquiler
FOR EACH ROWACH ROW
BEGIN
    IF NEW.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Ocupada' WHERE id_mesa = NEW.id_mesa;ATE mesa SET estado = 'Disponible' WHERE id_mesa = NEW.id_mesa;
    END IF;ND IF;
END//
DELIMITER ;

-- Esquema limpio y funcional. No existe la tabla 'pedida' ni referencias a ella.AFTER INSERT ON alquiler



ALTER TABLE producto ADD COLUMN costo_unitario DECIMAL(10,2) DEFAULT 0;FOR EACH ROW
BEGIN
    IF NEW.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Ocupada' WHERE id_mesa = NEW.id_mesa;
    END IF;
END//
DELIMITER ;

-- Esquema limpio y funcional. No existe la tabla 'pedida' ni referencias a ella.
