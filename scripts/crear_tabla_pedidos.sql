CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_alquiler INT NOT NULL,
    id_producto INT NOT NULL,
    hora_pedido DATETIME NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    -- Ajusta los nombres de las tablas y columnas de acuerdo a tus claves foráneas reales
    FOREIGN KEY (id_alquiler) REFERENCES alquileres(id_alquiler),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);
