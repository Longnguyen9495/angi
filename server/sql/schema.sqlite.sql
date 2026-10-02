-- Ăn gì? catalogue (SQLite 3.35+). Same tables as schema.sql.
-- Apply with: DB_DRIVER=sqlite php server/bin/migrate.php

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- Farm crop this ingredient feeds in the Journey game (NULL = none).
  crop TEXT NULL CHECK (crop IN ('rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT NOT NULL PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 0,
  source_image_id INTEGER NULL,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  vegetarian INTEGER NOT NULL DEFAULT 0,
  region TEXT NOT NULL DEFAULT 'world' CHECK (region IN ('north', 'central', 'south', 'world')),
  tone TEXT NOT NULL DEFAULT 'amber' CHECK (tone IN ('amber', 'copper', 'herb', 'crimson', 'ivory', 'ocean', 'gold')),
  story TEXT NOT NULL DEFAULT '',
  flavor_spicy INTEGER NOT NULL DEFAULT 0,
  flavor_sweet INTEGER NOT NULL DEFAULT 0,
  flavor_rich INTEGER NOT NULL DEFAULT 0,
  flavor_fresh INTEGER NOT NULL DEFAULT 0,
  flavor_crunchy INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  credit TEXT NOT NULL DEFAULT '',
  video_src TEXT NULL,
  video_poster TEXT NULL,
  video_credit TEXT NULL,
  content_source TEXT NOT NULL DEFAULT 'curated' CHECK (content_source IN ('curated', 'ai', 'manual')),
  ai_model TEXT NULL,
  ai_raw TEXT NULL,
  ai_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_position ON dishes (position);
CREATE INDEX IF NOT EXISTS idx_region ON dishes (region);

CREATE TABLE IF NOT EXISTS dish_ingredients (
  dish_id TEXT NOT NULL REFERENCES dishes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dish_id, ingredient_id)
);
CREATE INDEX IF NOT EXISTS idx_ingredient ON dish_ingredients (ingredient_id);

CREATE TABLE IF NOT EXISTS dish_youtube_videos (
  dish_id TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  video_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK(position >= 0 AND position < 5),
  metadata TEXT NOT NULL,
  PRIMARY KEY (dish_id, video_id),
  UNIQUE (dish_id, position)
);

-- Stand-in for MySQL's ON UPDATE CURRENT_TIMESTAMP (Catalogue::version() relies on it).
CREATE TRIGGER IF NOT EXISTS trg_dishes_touch AFTER UPDATE ON dishes
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE dishes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_ingredients_touch AFTER UPDATE ON ingredients
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ingredients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ——— Content translations (same tables as schema.sql) ———

CREATE TABLE IF NOT EXISTS dish_translations (
  dish_id TEXT NOT NULL REFERENCES dishes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (dish_id, locale)
);

CREATE TABLE IF NOT EXISTS ingredient_translations (
  ingredient_id TEXT NOT NULL REFERENCES ingredients (id) ON DELETE CASCADE ON UPDATE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ingredient_id, locale)
);

-- ——— Guest accounts (same tables as schema.sql; times are Unix seconds) ———

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  marketing INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  marketing INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codes_email ON login_codes (email, created_at);
CREATE INDEX IF NOT EXISTS idx_codes_ip ON login_codes (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_codes_link ON login_codes (link_hash);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT NOT NULL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions (user_id);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- ——— Khu vườn bạn bè (same tables as schema.sql) ———

CREATE TABLE IF NOT EXISTS garden_profiles (
  user_id INTEGER NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  friend_code TEXT NOT NULL UNIQUE,
  garden_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friend ON friendships (friend_id);

CREATE TABLE IF NOT EXISTS farm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  from_user INTEGER NULL,
  type TEXT NOT NULL,
  plot_id INTEGER NULL,
  crop TEXT NULL,
  day TEXT NOT NULL,
  uniq TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NULL
);
CREATE INDEX IF NOT EXISTS idx_events_to ON farm_events (to_user, delivered_at);
CREATE INDEX IF NOT EXISTS idx_events_from ON farm_events (from_user, day);

CREATE TABLE IF NOT EXISTS referrals (
  invitee_id INTEGER NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  inviter_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals (inviter_id);
