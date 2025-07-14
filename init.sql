-- Archivo SQL para inicializar la base de datos en Railway
-- Este archivo se ejecutará automáticamente cuando Railway configure la base de datos

-- Si necesitas crear las tablas automáticamente, puedes incluir aquí el contenido de estructura_completa.sql
-- Por ahora, este archivo sirve como placeholder para Railway

-- Ejemplo de tabla básica (reemplazar con tu estructura real)
CREATE TABLE IF NOT EXISTS `test_connection` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `test_connection` (`created_at`) VALUES (NOW());
