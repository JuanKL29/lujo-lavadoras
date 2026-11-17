-- ============================================================
-- Datos de ejemplo - Lujo Lavadoras
-- Motor: MySQL / MariaDB (XAMPP - phpMyAdmin o Workbench)
-- Ejecutar DESPUÉS del script que crea las tablas.
-- ============================================================

USE lavadoras;

-- ------------------------------------------------------------
-- 1. Usuario administrador
--    Correo: admin@lujolavadoras.com
--    Contraseña: admin123  (guardada con bcrypt)
-- ------------------------------------------------------------
INSERT INTO usuario (id_usuario, nombre, cedula, correo, `contraseña`, rol) VALUES
(1, 'Administrador', 1000000000, 'admin@lujolavadoras.com',
 '$2b$10$5yLU6pJkLDRp8ch07MLhm.JkPs9OqLk06dtWcElx19UHKFuRUnwZy', 'admin');

-- ------------------------------------------------------------
-- 2. Clientes
-- ------------------------------------------------------------
INSERT INTO cliente (id_cliente, nombre, cedula, telefono, correo, direccion, idUsuario) VALUES
(1, 'Ana',          1004808155, '3113417211', 'ana@gmail.com',   'Calle 9 # 7-62', NULL),
(2, 'Juan',         1919282882, '318282882',  'juan@gmail.com',  'Calle 10',       NULL),
(3, 'Kevin Jaimes', 1093296786, '3227838861', 'kevin@gmail.com', 'Calle 20',       NULL);

-- ------------------------------------------------------------
-- 3. Lavadoras
-- ------------------------------------------------------------
INSERT INTO lavadora (id_lavadora, marca, modelo, referencia, estado, precio_alquiler) VALUES
(1, 'Samsung',    'Ai Wash',              'AWKL-IUMN',    'Disponible',    200000),
(2, 'Samsung',    'WA19T',                'SAM-WA19T',    'Disponible',    135000),
(3, 'Whirlpool',  '8MWTW',                'WHI-8MWTW',    'Disponible',    110000),
(4, 'Mabe',       'LMA7911',              'MAB-LMA7911',  'Disponible',    125000),
(5, 'Haceb',      'Carga Superior 10kg',  'HAC-10KG',     'Mantenimiento', 105000),
(6, 'Electrolux', 'EWFLS70',              'ELE-EWFLS70',  'Disponible',    145000),
(7, 'LG',         'WM3400 Plus',          'LG-MET-01',    'Alquilada',     135000);

-- ------------------------------------------------------------
-- 4. Tipos de servicio
-- ------------------------------------------------------------
INSERT INTO tipo_de_servicio (id_tipo_servicio, nombre_servicio, descripcion, precio) VALUES
(1, 'Entrega de Lavadora',
 'Llevamos, instalamos y conectamos la lavadora en tu hogar.', 20000),
(2, 'Lavado express',
 'Servicio de lavado y secado de tu ropa en un tiempo estimado de 3 horas.', 25000),
(3, 'Mantenimiento preventivo',
 'Limpieza de tambor, filtros y revisión general de la lavadora.', 20000),
(4, 'Plan mensual',
 'Lavadora en tu casa con soporte técnico incluido por 30 días.', 70000);

-- ------------------------------------------------------------
-- 5. Alquileres
-- ------------------------------------------------------------
INSERT INTO alquiler (id_alquiler, fecha_inicio, fecha_fin, estado, idCliente, idLavadora) VALUES
(1, '2026-06-09', '2026-11-29', 'Finalizado', 1, 1),
(2, '2026-11-11', '2026-12-11', 'Finalizado', 3, 6),
(3, '2026-12-01', '2026-12-05', 'Activo',     2, 7);

-- ------------------------------------------------------------
-- 6. Órdenes de servicio
-- ------------------------------------------------------------
INSERT INTO orden_de_servicio (id_orden_servicio, fecha_orden, estado, observaciones, idAlquiler, idTipo_servicio) VALUES
(1, '2026-11-09', 'Cancelado',  'Lavadora entregada a las 9 am con todas las condiciones óptimas.', 1, 2),
(2, '2026-11-11', 'Completado', 'Mantenimiento preventivo realizado en el domicilio del cliente.',   2, 3),
(3, '2026-11-15', 'Pendiente',  'Entrega de la lavadora programada para la próxima semana.',        3, 1);

-- ------------------------------------------------------------
-- 7. Comentarios aprobados (visibles en la página pública)
-- ------------------------------------------------------------
INSERT INTO comentario (id_comentario, nombre, correo, comentario, calificacion, visible) VALUES
(1, 'Ana María Rodríguez', 'ana.rodriguez@correo.com',
 'La lavadora llegó al día siguiente y la instalación fue muy rápida. Excelente servicio.', 5, 1),
(2, 'Carlos Pérez', 'carlos.perez@correo.com',
 'Buena atención por WhatsApp y el equipo funciona perfecto. Solo tardaron un poco en confirmar la fecha.', 4, 1),
(3, 'Laura Gómez', 'laura.gomez@correo.com',
 'Alquilar fue la mejor decisión: no tuve que comprar lavadora y el soporte respondió de inmediato.', 5, 1);

-- ------------------------------------------------------------
-- Verificación: cuántas filas quedaron en cada tabla
-- ------------------------------------------------------------
SELECT 'usuario' AS tabla, COUNT(*) AS filas FROM usuario
UNION ALL SELECT 'cliente',           COUNT(*) FROM cliente
UNION ALL SELECT 'lavadora',          COUNT(*) FROM lavadora
UNION ALL SELECT 'tipo_de_servicio',  COUNT(*) FROM tipo_de_servicio
UNION ALL SELECT 'alquiler',          COUNT(*) FROM alquiler
UNION ALL SELECT 'orden_de_servicio', COUNT(*) FROM orden_de_servicio
UNION ALL SELECT 'comentario',        COUNT(*) FROM comentario;
