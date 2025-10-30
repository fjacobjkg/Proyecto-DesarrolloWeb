
CREATE DATABASE merodias_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE merodias_lab;

SET NAMES utf8mb4;
SET time_zone = '+00:00';


-- 1) Tabla: usuarios
--    Pacientes y administradores

CREATE TABLE usuarios (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre_completo    VARCHAR(160)    NOT NULL,
  correo             VARCHAR(160)    NOT NULL,
  telefono           VARCHAR(40)     NULL,
  contrasena_hash    VARCHAR(255)    NOT NULL,
  rol                ENUM('paciente','administrador') NOT NULL DEFAULT 'paciente',
  fecha_creacion     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 2) Tabla: servicios (catálogo de estudios/exámenes)

CREATE TABLE servicios (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identificador      VARCHAR(120)    NOT NULL,    
  titulo             VARCHAR(160)    NOT NULL,
  descripcion        TEXT            NULL,
  horas_ayuno        TINYINT UNSIGNED NULL,        
  fecha_creacion     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servicios_identificador (identificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3) Tabla: mensajes_contacto (buzón)

CREATE TABLE mensajes_contacto (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(120)    NOT NULL,
  correo         VARCHAR(160)    NOT NULL,
  telefono       VARCHAR(40)     NULL,
  asunto         VARCHAR(140)    NULL,
  mensaje        TEXT            NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_contacto_creacion (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4) Tabla: citas
--    Estados: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

CREATE TABLE citas (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id         BIGINT UNSIGNED NOT NULL,      -- paciente
  servicio_id        BIGINT UNSIGNED NULL,
  asunto             VARCHAR(140)   NULL,
  mensaje            TEXT           NULL,
  fecha_preferida    DATETIME       NOT NULL,       -- fecha/hora solicitada
  estado             ENUM('pendiente','confirmada','cancelada','completada')
                     NOT NULL DEFAULT 'pendiente',
  fecha_creacion     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_citas_usuario (usuario_id),
  KEY ix_citas_servicio (servicio_id),
  KEY ix_citas_estado_fecha (estado, fecha_preferida),
  CONSTRAINT fk_citas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_citas_servicio
    FOREIGN KEY (servicio_id) REFERENCES servicios(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 5) Tabla: resultados_citas (archivos subidos)
--    Se guarda la ruta/URL pública del archivo

CREATE TABLE resultados_citas (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cita_id        BIGINT UNSIGNED NOT NULL,
  ruta_archivo   VARCHAR(500)    NOT NULL,  
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_resultados_cita (cita_id, fecha_creacion),
  CONSTRAINT fk_resultados_cita
    FOREIGN KEY (cita_id) REFERENCES citas(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 6) Vista: vw_admin_citas (para panel de administración)
--
CREATE OR REPLACE VIEW vw_admin_citas AS
SELECT
  c.id,
  c.fecha_preferida,
  c.estado,
  c.asunto,
  c.mensaje,
  u.nombre_completo,
  u.correo,
  u.telefono,
  s.titulo AS servicio_titulo,
  (
    SELECT r.ruta_archivo
    FROM resultados_citas r
    WHERE r.cita_id = c.id
    ORDER BY r.id DESC
    LIMIT 1
  ) AS url_resultado,
  c.fecha_creacion
FROM citas c
JOIN usuarios u   ON u.id = c.usuario_id
LEFT JOIN servicios s ON s.id = c.servicio_id;


-- 7) Datos de ejemplo (opcional)


-- Servicios
INSERT INTO servicios (identificador, titulo, descripcion, horas_ayuno) VALUES
  ('examenes-rutina',  'Exámenes de rutina', 'Perfil básico para control general', 8),
  ('perfil-lipidos',   'Perfil de lípidos',  'Colesterol total, HDL, LDL, triglicéridos', 12),
  ('panel-diabetico',  'Panel diabético',    'Glucosa, HbA1c y pruebas relacionadas', 8);

-- Usuario administrador de ejemplo
-- contrasena_hash = bcrypt de "Admin123!" (debes cambiarlo por el tuyo si quieres)
INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, rol) VALUES
('Administrador', 'admin@merodiaslab.com', '+50200000000',
'$2b$12$0eCFkF0H6Qq0nq2c3pUu8Oc4n8Jf0hQ3mC6a2H1z7wQyI2Jb9YgG2', 'administrador');

-- Usuario paciente de ejemplo
INSERT INTO usuarios (nombre_completo, correo, telefono, contrasena_hash, rol) VALUES
('VILMA DIAZ', 'jacobgt890@gmail.com', '30649377',
'$2b$12$Csk2bTvF6cGmUQ0gkz3tEefmXz8c0b8QnZyC9G3sGZC6r2zXx9a8a', 'paciente');

-- Citas de ejemplo 
-- Para el ejemplo, usamos el último id insertado 
SET @paciente_id = LAST_INSERT_ID();

INSERT INTO citas (usuario_id, servicio_id, asunto, mensaje, fecha_preferida, estado) VALUES
  (@paciente_id, 1, 'Prueba', 'Consulta general',   '2025-12-12 06:12:00', 'cancelada'),
  (@paciente_id, 3, 'Prueba', 'Seguimiento HbA1c',  '2025-12-12 04:10:00', 'cancelada');

-- Si se quiere asociar un resultado a una cita, descomenta y usa el id real:
-- INSERT INTO resultados_citas (cita_id, ruta_archivo)
-- VALUES (1, '/uploads/resultados/res_1730000000.pdf');

-- Fin del script
