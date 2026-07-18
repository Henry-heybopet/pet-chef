DO $$ BEGIN
  CREATE TYPE "FeedingGoal" AS ENUM ('maintenance', 'weight_loss', 'muscle_gain', 'post_surgery_recovery', 'coat_care', 'gastrointestinal_care');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BodySize" AS ENUM ('mini', 'small', 'medium', 'large', 'giant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Environment" AS ENUM ('indoor', 'outdoor', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AllergySeverity" AS ENUM ('mild', 'moderate', 'severe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SpecialPeriod" AS ENUM ('pregnancy', 'lactation', 'post_op_rest', 'illness_recovery');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ActivityLevel" ADD VALUE IF NOT EXISTS 'working';

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS feeding_goal "FeedingGoal",
  ADD COLUMN IF NOT EXISTS body_size "BodySize",
  ADD COLUMN IF NOT EXISTS environment "Environment",
  ADD COLUMN IF NOT EXISTS allergy_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allergy_severity "AllergySeverity",
  ADD COLUMN IF NOT EXISTS special_period "SpecialPeriod";
