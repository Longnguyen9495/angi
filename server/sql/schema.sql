-- Ăn gì? catalogue (MariaDB 10.4+, utf8mb4).
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

CREATE TABLE IF NOT EXISTS dish_youtube_videos (
  dish_id VARCHAR(80) NOT NULL,
  video_id VARCHAR(11) NOT NULL,
  position INT NOT NULL,
  metadata TEXT NOT NULL,
  PRIMARY KEY (dish_id, video_id),
  UNIQUE KEY uq_youtube_position (dish_id, position),
  CONSTRAINT fk_youtube_dish FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ——— Content translations (Vietnamese stays in dishes/ingredients; one row per extra locale) ———
-- Empty strings mean "not translated": clients fall back to the Vietnamese field.

CREATE TABLE IF NOT EXISTS dish_translations (
  dish_id VARCHAR(80) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  name VARCHAR(160) NOT NULL DEFAULT '',
  subtitle VARCHAR(200) NOT NULL DEFAULT '',
  story VARCHAR(400) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dish_id, locale),
  CONSTRAINT fk_dt_dish FOREIGN KEY (dish_id) REFERENCES dishes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ingredient_translations (
  ingredient_id VARCHAR(64) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  description VARCHAR(400) NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ingredient_id, locale),
  CONSTRAINT fk_it_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ——— Guest accounts (optional: email + one-time code, see plans/anh-check-in-va-tai-khoan.md) ———
-- Times are Unix seconds so the same queries run on MariaDB and SQLite.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  marketing TINYINT(1) NOT NULL DEFAULT 0,
  consent_version VARCHAR(20) NOT NULL,
  consent_at INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_codes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  link_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  marketing TINYINT(1) NOT NULL DEFAULT 0,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at INT UNSIGNED NOT NULL,
  used_at INT UNSIGNED NULL,
  created_at INT UNSIGNED NOT NULL,
  KEY idx_codes_email (email, created_at),
  KEY idx_codes_ip (ip_hash, created_at),
  KEY idx_codes_link (link_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  last_seen INT UNSIGNED NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_progress (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  data MEDIUMTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at INT UNSIGNED NOT NULL,
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ——— Khu vườn bạn bè: garden code, friends, and help/gift events ———

CREATE TABLE IF NOT EXISTS garden_profiles (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  friend_code CHAR(6) NOT NULL,
  garden_name VARCHAR(40) NOT NULL DEFAULT '',
  created_at INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_garden_code (friend_code),
  CONSTRAINT fk_garden_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS friendships (
  user_id INT UNSIGNED NOT NULL,
  friend_id INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, friend_id),
  KEY idx_friend (friend_id),
  CONSTRAINT fk_friend_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_friend_friend FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per thing a guest should receive (water from a friend, Cô Ba's gift, XP for helping).
-- `uniq` makes the daily limits hold even under double-clicks: e.g. water:<from>:<to>:<day>.
CREATE TABLE IF NOT EXISTS farm_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  to_user INT UNSIGNED NOT NULL,
  from_user INT UNSIGNED NULL,
  type VARCHAR(10) NOT NULL,
  plot_id INT NULL,
  crop VARCHAR(20) NULL,
  day CHAR(10) NOT NULL,
  uniq VARCHAR(80) NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  delivered_at INT UNSIGNED NULL,
  UNIQUE KEY uq_event (uniq),
  KEY idx_events_to (to_user, delivered_at),
  KEY idx_events_from (from_user, day),
  CONSTRAINT fk_events_to FOREIGN KEY (to_user) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
