-- Bếp Việt · Food Reel catalogue (SQLite 3.35+). Same tables as schema.sql.
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
