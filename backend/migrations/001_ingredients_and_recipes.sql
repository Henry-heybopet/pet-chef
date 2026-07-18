-- Pet Chef Ver B1.00 — 2026-06-22
-- Phase 1 Migration: Ingredient Library + Recipes

CREATE TABLE IF NOT EXISTS ingredient_library (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    category        VARCHAR(20) NOT NULL,       -- protein/carb/veg/fruit/supplement
    safety_level    VARCHAR(20) DEFAULT 'safe', -- safe/caution/toxic
    safety_note     TEXT,
    water_pct      DECIMAL(5,2),
    protein_pct     DECIMAL(5,2),
    fat_pct        DECIMAL(5,2),
    carb_pct       DECIMAL(5,2),
    fiber_pct      DECIMAL(5,2),
    calories_per_100g DECIMAL(6,2),
    benefits        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
    id              TEXT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    name_en         VARCHAR(200),
    species         VARCHAR(20) DEFAULT 'dog',
    category        VARCHAR(50),
    category_code   INTEGER,
    life_stage      VARCHAR(20),              -- puppy/adult/senior
    dog_size        VARCHAR(20),              -- small/medium/large
    functional      VARCHAR(50),
    protein         VARCHAR(50),
    tags            TEXT[],
    description     TEXT,
    suitable_for    TEXT,
    ingredients     JSONB NOT NULL,           -- {"食材名": 百分比}
    nutrition_highlights TEXT,
    water_content_pct DECIMAL(5,2),
    protein_pct     DECIMAL(5,2),
    carb_pct       DECIMAL(5,2),
    veg_pct        DECIMAL(5,2),
    add_pct        DECIMAL(5,2),
    cooking_base    JSONB,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category_code);
CREATE INDEX IF NOT EXISTS idx_recipes_life_stage ON recipes(life_stage);
CREATE INDEX IF NOT EXISTS idx_recipes_dog_size ON recipes(dog_size);
CREATE INDEX IF NOT EXISTS idx_recipes_species ON recipes(species);
CREATE INDEX IF NOT EXISTS idx_ingredient_safety ON ingredient_library(safety_level);
CREATE INDEX IF NOT EXISTS idx_ingredient_category ON ingredient_library(category);
