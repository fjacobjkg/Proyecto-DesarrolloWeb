-- Base de datos: merodias


-- Crear base de datos
CREATE DATABASE IF NOT EXISTS merodias
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE merodias;


-- 1) Tabla: usuarios
--    Pacientes y administradores

DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre_completo    VARCHAR(160)    NOT NULL,
  correo             VARCHAR(160)    NOT NULL,
  telefono           VARCHAR(40)     NULL,
  contrasena_hash    VARCHAR(255)    NOT NULL,
  rol                ENUM('paciente','admin') NOT NULL DEFAULT 'paciente',
  creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos en usuarios
INSERT INTO usuarios (id, nombre_completo, correo, telefono, contrasena_hash, rol, creado_en) VALUES
(1, 'Administrador', 'admin@merodiaslab2.com', '+50200000000', '$2b$12$w9F6FYBS8xGzvTwoXYN/futZZBs3IutcHpOIczzxWNhmOAIpJtQ4G', 'admin', '2025-10-23 21:44:20'),
(2, 'Ana Pérez', 'anaperez0@gmail.com', '45981234', '$2b$12$mZjrD0Nme8SfPRbow88Dkudjt3DDS5K5oShU/BuKVYwaP5/f9HIlG', 'paciente', '2025-10-28 22:50:36'),
(3, 'Juan Gómez', 'juangomez1@gmail.com', '42875691', '$2b$12$B/gsCteGSuPpPknoudoCWutJdY5XEZ9WQG9qx733KPjz7IrNQl7ny', 'paciente', '2025-10-28 22:51:19'),
(4, 'María López', 'marialopez2@gmail.com', '46357821', '$2b$12$w8Yudj4GFJPaGiq20df3mO7DTkAczPsw1JO93l5WDFUTbADoHUISa', 'paciente', '2025-10-28 22:51:40'),
(5, 'Carlos Ruiz', 'carlosruiz3@gmail.com', '49761235', '$2b$12$k0NGtPMBpl5gQBzZ.GPxgOutazlb6Kp51ZMChiU5EW3R5GyJz6tie', 'paciente', '2025-10-28 22:52:12'),
(6, 'Lucía Martínez', 'luciamartinez4@gmail.com', '41239876', '$2b$12$zUYgCtTaiGQAeTaasTKJl.1yVEUUXXj/wR25GE2TvLdm2DX3Vm4Jm', 'paciente', '2025-10-28 22:52:31'),
(7, 'Diego Torres', 'diegotorres5@gmail.com', '48592347', '$2b$12$fDJ6k1uK7UPFyLsH/tBcY.hxxsaH7UKHuBWkohF9pn3IcOO0xKNm.', 'paciente', '2025-10-29 00:00:04'),
(8, 'Sofía Herrera', 'sofiaherrera6@gmail.com', '45678912', '$2b$12$HsPZS9y0XcKMUCiYY3fa4ejLPAs7UX/x89uklTYupheCFtMTPYL7q', 'paciente', '2025-10-29 00:00:24'),
(9, 'Pedro Castillo', 'pedrocastillo7@gmail.com', '47563128', '$2b$12$r7DOEjMKFYtyOOiJv.3euOVWLGInT8OBsG6O8yL6.7LF7VrmZf0AO', 'paciente', '2025-10-29 00:00:42'),
(10, 'Elena Vargas', 'elenavargas8@gmail.com', '46981237', '$2b$12$3mOa2.DvyzmTVK894tGKP.NPPJ88FOVnVcKugA25rbBqPpmLY18wi', 'paciente', '2025-10-29 00:00:58'),
(11, 'Marco Rojas', 'marcorojas9@gmail.com', '49817623', '$2b$12$9j4Y08HOuJrVSx1pFc/n.eInEOIrsv9FhY8FtZfUaVmyPUHQMyq7e', 'paciente', '2025-10-29 00:01:16');


-- 2) Tabla: servicios
--    Catálogo de pruebas/exámenes de laboratorio

DROP TABLE IF EXISTS servicios;

CREATE TABLE servicios (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug               VARCHAR(120)    NOT NULL,
  titulo             VARCHAR(160)    NOT NULL,
  descripcion        TEXT            NULL,
  horas_ayuno        TINYINT UNSIGNED NULL,
  creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_servicios_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar datos en servicios
INSERT INTO servicios (id, slug, titulo, descripcion, horas_ayuno, creado_en) VALUES
(1, 'rutina', 'Exámenes de rutina', 'Análisis básicos de sangre, orina y heces', NULL, '2025-10-21 16:41:20'),
(2, 'lipidos', 'Perfil de lípidos', 'Colesterol total, LDL, HDL, triglicéridos', 14, '2025-10-21 16:41:20'),
(3, 'diabetes', 'Panel diabético', 'Glucosa, hemoglobina glicosilada, orina', 8, '2025-10-21 16:41:20'),
(4, 'salud', 'Tarjeta de salud', 'Exámenes requeridos para tarjeta sanitaria', 6, '2025-10-21 16:41:20');


-- 3) Tabla: mensajes_contacto
--    Bandeja de mensajes del formulario de contacto

DROP TABLE IF EXISTS mensajes_contacto;

CREATE TABLE mensajes_contacto (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(120)    NOT NULL,
  correo         VARCHAR(160)    NOT NULL,
  telefono       VARCHAR(40)     NULL,
  asunto         VARCHAR(140)    NULL,
  mensaje        TEXT            NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_contacto_creado (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4) Tabla: citas
--    Estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

DROP TABLE IF EXISTS citas;

CREATE TABLE citas (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id         BIGINT UNSIGNED NOT NULL,
  servicio_id        BIGINT UNSIGNED NULL,
  asunto             VARCHAR(140)   NULL,
  mensaje            TEXT           NULL,
  fecha_preferida    DATETIME       NOT NULL,
  estado             ENUM('pendiente','confirmada','cancelada','completada')
                     NOT NULL DEFAULT 'pendiente',
  creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
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


-- 5) Tabla: resultados_citas
--    Archivos subidos con los resultados de las citas

DROP TABLE IF EXISTS resultados_citas;

CREATE TABLE resultados_citas (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cita_id        BIGINT UNSIGNED NOT NULL,
  ruta_archivo   VARCHAR(500)    NOT NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_resultados_cita (cita_id, creado_en),
  CONSTRAINT fk_resultados_cita
    FOREIGN KEY (cita_id) REFERENCES citas(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 6) Vista: vw_admin_citas (para el panel de administración)

DROP VIEW IF EXISTS vw_admin_citas;

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
  c.creado_en
FROM citas c
JOIN usuarios u ON u.id = c.usuario_id
LEFT JOIN servicios s ON s.id = c.servicio_id;

SET FOREIGN_KEY_CHECKS = 1;


-- Fin del script 