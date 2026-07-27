BEGIN;

CREATE TABLE IF NOT EXISTS recipe_translations (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('zh','en','de','fr','es','it','ja','ko')),
  name TEXT NOT NULL,
  description TEXT,
  translation_status TEXT NOT NULL DEFAULT 'translated',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recipe_id, locale)
);
CREATE INDEX IF NOT EXISTS recipe_translations_locale_idx ON recipe_translations(locale);

CREATE TABLE IF NOT EXISTS ingredient_translations (
  ingredient_id TEXT NOT NULL REFERENCES ingredient_library(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('zh','en','de','fr','es','it','ja','ko')),
  name TEXT NOT NULL,
  benefits TEXT,
  translation_status TEXT NOT NULL DEFAULT 'translated',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ingredient_id, locale)
);
CREATE INDEX IF NOT EXISTS ingredient_translations_locale_idx ON ingredient_translations(locale);

CREATE TABLE IF NOT EXISTS pack_translations (
  pack_code TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh','en','de','fr','es','it','ja','ko')),
  canonical_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  translation_status TEXT NOT NULL DEFAULT 'translated',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pack_code, locale)
);
CREATE INDEX IF NOT EXISTS pack_translations_locale_idx ON pack_translations(locale);

COMMIT;
