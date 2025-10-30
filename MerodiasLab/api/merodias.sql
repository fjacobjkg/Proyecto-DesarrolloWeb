-- Crear base de datos
CREATE DATABASE IF NOT EXISTS merodias;
USE merodias;


-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
full_name VARCHAR(120) NOT NULL,
email VARCHAR(160) NOT NULL UNIQUE,
phone VARCHAR(30) NULL,
password_hash VARCHAR(255) NOT NULL,
role ENUM('patient','admin') NOT NULL DEFAULT 'patient',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (id)
) ENGINE=InnoDB;


-- Tabla de servicios (catálogo visible en /servicios)
CREATE TABLE IF NOT EXISTS services (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
slug VARCHAR(80) NOT NULL UNIQUE,
title VARCHAR(120) NOT NULL,
description TEXT,
fasting_hrs TINYINT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (id)
) ENGINE=InnoDB;


-- Tabla de citas
CREATE TABLE IF NOT EXISTS appointments (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
user_id BIGINT UNSIGNED NOT NULL,
service_id BIGINT UNSIGNED NULL,
subject VARCHAR(140) NULL,
message TEXT NULL,
preferred_dt DATETIME NOT NULL,
status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (id),
KEY idx_user (user_id),
KEY idx_service (service_id),
CONSTRAINT fk_appt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
CONSTRAINT fk_appt_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB;


-- Tabla de mensajes del formulario de contacto
CREATE TABLE IF NOT EXISTS contact_messages (
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
name VARCHAR(120) NOT NULL,
email VARCHAR(160) NOT NULL,
phone VARCHAR(30) NULL,
subject VARCHAR(140) NULL,
message TEXT NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (id)
) ENGINE=InnoDB;


-- Datos de ejemplo para services