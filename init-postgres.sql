-- Archivo SQL para inicializar la base de datos PostgreSQL en Render
-- Este archivo se ejecutará para configurar la estructura de la base de datos

-- ==================== ESTRUCTURA COMPLETA DE LA BASE DE DATOS ====================

-- Elimina primero las tablas hijas que dependen de otras por claves foráneas
DROP TABLE IF EXISTS factura_metodo_pago CASCADE;
DROP TABLE IF EXISTS pedido CASCADE;
DROP TABLE IF EXISTS factura CASCADE;
DROP TABLE IF EXISTS alquiler CASCADE;
DROP TABLE IF EXISTS mesa CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS gasto CASCADE;

-- Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50),
    correo VARCHAR(50) UNIQUE,
    telefono VARCHAR(20),
    password VARCHAR(255),
    rol VARCHAR(20) CHECK (rol IN ('Administrador', 'Supervisor', 'Empleado')),
    documento VARCHAR(20) UNIQUE
);

-- Tabla Mesas
CREATE TABLE IF NOT EXISTS mesa (
    id_mesa SERIAL PRIMARY KEY,
    numero_mesa INTEGER,
    estado VARCHAR(20) CHECK (estado IN ('Disponible', 'Ocupada', 'Mantenimiento')) DEFAULT 'Disponible',
    precio_hora DECIMAL(10, 2) NOT NULL DEFAULT 6000.00
);
CREATE INDEX IF NOT EXISTS idx_mesa_estado ON mesa(estado);

-- Tabla Alquileres
CREATE TABLE IF NOT EXISTS alquiler (
    id_alquiler SERIAL PRIMARY KEY,
    id_mesa INTEGER NOT NULL,
    id_usuario INTEGER,
    hora_inicio TIMESTAMP NOT NULL,
    hora_fin TIMESTAMP,
    total_tiempo DECIMAL(10, 2),
    total_a_pagar DECIMAL(10, 2),
    estado VARCHAR(20) CHECK (estado IN ('Activo', 'Finalizado')) NOT NULL DEFAULT 'Activo',
    metodo_pago VARCHAR(30),
    total_recibido DECIMAL(10,2),
    total_vuelto DECIMAL(10,2),
    id_usuario_cierre INTEGER,
    fecha_cierre TIMESTAMP,
    FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario_cierre) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_alquiler_estado ON alquiler(estado);
CREATE INDEX IF NOT EXISTS idx_alquiler_mesa_estado ON alquiler(id_mesa, estado);

-- Tabla Productos
CREATE TABLE IF NOT EXISTS producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INTEGER,
    categoria VARCHAR(50) NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    costo_unitario DECIMAL(10,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto(categoria);

-- Tabla Pedidos
CREATE TABLE IF NOT EXISTS pedido (
    id_pedido SERIAL PRIMARY KEY,
    id_alquiler INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    hora_pedido TIMESTAMP NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) CHECK (estado IN ('Por Pagar', 'Ya Pagada')) NOT NULL DEFAULT 'Por Pagar',
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pedido_alquiler ON pedido(id_alquiler);

-- Tabla Gastos
CREATE TABLE IF NOT EXISTS gasto (
    id_gasto SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion VARCHAR(255),
    monto DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(50)
);

-- Tabla Factura
CREATE TABLE IF NOT EXISTS factura (
    id_factura SERIAL PRIMARY KEY,
    id_alquiler INTEGER NOT NULL,
    id_usuario INTEGER,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(30),
    total DECIMAL(10,2) NOT NULL,
    total_recibido DECIMAL(10,2),
    total_vuelto DECIMAL(10,2),
    numero_mesa INTEGER,
    FOREIGN KEY (id_alquiler) REFERENCES alquiler(id_alquiler) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabla para registrar el valor pagado por cada método de pago en cada factura
CREATE TABLE IF NOT EXISTS factura_metodo_pago (
    id_factura INTEGER NOT NULL,
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
ON CONFLICT (correo) DO NOTHING;

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
('Cigarrillos Marlboro', 8000, 20, 'Cigarrillos', 'marlboro.jpg', 6000);

-- ==================== FUNCIONES Y TRIGGERS ====================

-- Función para actualizar estado de mesa después de alquiler
CREATE OR REPLACE FUNCTION actualizar_mesa_alquiler()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'Finalizado' AND OLD.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Disponible' WHERE id_mesa = NEW.id_mesa;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar mesa cuando alquiler termina
DROP TRIGGER IF EXISTS trigger_alquiler_update ON alquiler;
CREATE TRIGGER trigger_alquiler_update
    AFTER UPDATE ON alquiler
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_mesa_alquiler();

-- Función para marcar mesa como ocupada
CREATE OR REPLACE FUNCTION marcar_mesa_ocupada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'Activo' THEN
        UPDATE mesa SET estado = 'Ocupada' WHERE id_mesa = NEW.id_mesa;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para marcar mesa como ocupada cuando se crea alquiler
DROP TRIGGER IF EXISTS trigger_alquiler_insert ON alquiler;
CREATE TRIGGER trigger_alquiler_insert
    AFTER INSERT ON alquiler
    FOR EACH ROW
    EXECUTE FUNCTION marcar_mesa_ocupada();

-- Confirmar que todo se ejecutó correctamente
SELECT 'Base de datos PostgreSQL inicializada correctamente' AS status;
