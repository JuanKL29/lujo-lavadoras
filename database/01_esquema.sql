-- ============================================================
-- Lujo Lavadoras - Esquema de la base de datos
-- Motor: MySQL / MariaDB (XAMPP)
-- Ejecutar primero este script y después 02_datos.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `lavadoras`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `lavadoras`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Usuarios del sistema (administrador del panel)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(80) DEFAULT NULL,
  `cedula` int(11) DEFAULT NULL,
  `correo` varchar(80) DEFAULT NULL,
  `contraseña` varchar(100) DEFAULT NULL,
  `rol` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 2. Clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cliente` (
  `id_cliente` int(11) NOT NULL,
  `nombre` varchar(80) DEFAULT NULL,
  `cedula` int(11) DEFAULT NULL,
  `telefono` varchar(80) DEFAULT NULL,
  `correo` varchar(80) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `idUsuario` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  KEY `idUsuario` (`idUsuario`),
  CONSTRAINT `cliente_ibfk_1` FOREIGN KEY (`idUsuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 3. Lavadoras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lavadora` (
  `id_lavadora` int(11) NOT NULL,
  `marca` varchar(80) DEFAULT NULL,
  `modelo` varchar(70) DEFAULT NULL,
  `referencia` varchar(60) DEFAULT NULL,
  `estado` varchar(80) DEFAULT NULL,
  `precio_alquiler` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_lavadora`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 4. Tipos de servicio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tipo_de_servicio` (
  `id_tipo_servicio` int(11) NOT NULL,
  `nombre_servicio` varchar(80) DEFAULT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `precio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_tipo_servicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 5. Alquileres
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `alquiler` (
  `id_alquiler` int(11) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` varchar(200) DEFAULT NULL,
  `idCliente` int(11) DEFAULT NULL,
  `idLavadora` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_alquiler`),
  KEY `idCliente` (`idCliente`),
  KEY `idLavadora` (`idLavadora`),
  CONSTRAINT `alquiler_ibfk_1` FOREIGN KEY (`idCliente`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `alquiler_ibfk_2` FOREIGN KEY (`idLavadora`) REFERENCES `lavadora` (`id_lavadora`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 6. Órdenes de servicio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orden_de_servicio` (
  `id_orden_servicio` int(11) NOT NULL,
  `fecha_orden` date DEFAULT NULL,
  `estado` varchar(100) DEFAULT NULL,
  `observaciones` varchar(200) DEFAULT NULL,
  `idAlquiler` int(11) DEFAULT NULL,
  `idTipo_servicio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_orden_servicio`),
  KEY `idAlquiler` (`idAlquiler`),
  KEY `idTipo_servicio` (`idTipo_servicio`),
  CONSTRAINT `orden_de_servicio_ibfk_1` FOREIGN KEY (`idAlquiler`) REFERENCES `alquiler` (`id_alquiler`),
  CONSTRAINT `orden_de_servicio_ibfk_2` FOREIGN KEY (`idTipo_servicio`) REFERENCES `tipo_de_servicio` (`id_tipo_servicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 7. Comentarios de la página pública
--    visible = 0: pendiente de aprobación
--    visible = 1: publicado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comentario` (
  `id_comentario` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `correo` varchar(80) DEFAULT NULL,
  `comentario` varchar(500) NOT NULL,
  `calificacion` tinyint(4) NOT NULL,
  `visible` tinyint(1) NOT NULL DEFAULT 0,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comentario`),
  KEY `idx_comentario_visible` (`visible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
