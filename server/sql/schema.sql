-- Bếp Việt · Food Reel catalogue (MariaDB 10.4+, utf8mb4).
-- Apply with: php server/bin/migrate.php

CREATE DATABASE IF NOT EXISTS angi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE angi;

CREATE TABLE IF NOT EXISTS ingredients (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  -- Farm crop this ingredient feeds in the Journey game (NULL = none).
  crop ENUM('rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dishes (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  position INT NOT NULL DEFAULT 0,
  source_image_id INT NULL,
  name VARCHAR(160) NOT NULL,
  subtitle VARCHAR(200) NOT NULL DEFAULT '',
  price INT NOT NULL DEFAULT 0,
  vegetarian TINYINT(1) NOT NULL DEFAULT 0,
  region ENUM('north', 'central', 'south', 'world') NOT NULL DEFAULT 'world',
  tone ENUM('amber', 'copper', 'herb', 'crimson', 'ivory', 'ocean', 'gold') NOT NULL DEFAULT 'amber',
  story VARCHAR(400) NOT NULL DEFAULT '',
  flavor_spicy TINYINT NOT NULL DEFAULT 0,
  flavor_sweet TINYINT NOT NULL DEFAULT 0,
  flavor_rich TINYINT NOT NULL DEFAULT 0,
  flavor_fresh TINYINT NOT NULL DEFAULT 0,
  flavor_crunchy TINYINT NOT NULL DEFAULT 0,
  image VARCHAR(255) NOT NULL,
  thumbnail VARCHAR(255) NOT NULL,
  credit VARCHAR(255) NOT NULL DEFAULT '',
  video_src VARCHAR(255) NULL,
  video_poster VARCHAR(255) NULL,
  video_credit VARCHAR(255) NULL,
  -- Where the descriptive content came from, and the raw AI answer for audit.
  content_source ENUM('curated', 'ai', 'manual') NOT NULL DEFAULT 'curated',
  ai_model VARCHAR(80) NULL,
  ai_raw MEDIUMTEXT NULL,
  ai_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_position (position),
  KEY idx_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dish_ingredients (
  dish_id VARCHAR(80) NOT NULL,
  ingredient_id VARCHAR(64) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (dish_id, ingredient_id),
  KEY idx_ingredient (ingredient_id),
  CONSTRAINT fk_di_dish FOREIGN KEY (dish_id) REFERENCES dishes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_di_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
