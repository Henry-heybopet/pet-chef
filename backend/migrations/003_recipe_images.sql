BEGIN;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS img TEXT;

WITH recipe_images(id, img) AS (
  VALUES
    ('dog_recipe_001', '/鸡肉轻盈餐.png'),
    ('dog_recipe_002', '/鸡肉燕麦经典.png'),
    ('dog_recipe_003', '/金枪鱼均衡餐.png'),
    ('dog_recipe_004', '/牛肉能量餐.png'),
    ('dog_recipe_005', '/兔肉低脂餐.png'),
    ('dog_recipe_006', '/护关节低脂.png'),
    ('dog_recipe_007', '/鸡肉高纤.png'),
    ('dog_recipe_008', '/金枪鱼护心.png'),
    ('dog_recipe_009', '/牛肉补能.png'),
    ('dog_recipe_010', '/易消化温和.png'),
    ('dog_recipe_011', '/金枪鱼单一低敏.png'),
    ('dog_recipe_012', '/兔肉菠菜单一低敏.png'),
    ('dog_recipe_013', '/兔肉红薯单一低敏.png'),
    ('dog_recipe_014', '/鸭肉胡萝卜单一低敏.png'),
    ('dog_recipe_015', '/鸭肉南瓜单一低敏.png'),
    ('dog_recipe_016', '/鸡肉姜黄.png'),
    ('dog_recipe_017', '/鸡肉南瓜.png'),
    ('dog_recipe_018', '/金枪鱼抗氧.png'),
    ('dog_recipe_019', '/牛肉轻负担.png'),
    ('dog_recipe_020', '/兔肉低脂.png'),
    ('dog_recipe_021', '/鸡肉美毛.png'),
    ('dog_recipe_022', '/金枪鱼抗炎.png'),
    ('dog_recipe_023', '/金枪鱼亮毛.png'),
    ('dog_recipe_024', '/牛肉护肤.png'),
    ('dog_recipe_025', '/兔肉抗敏.png'),
    ('dog_recipe_026', '/鸡肉蔬菜成长.png'),
    ('dog_recipe_027', '/鸡肉稳生长.png'),
    ('dog_recipe_028', '/金枪鱼缓生长.png'),
    ('dog_recipe_029', '/牛肉控制成长.png'),
    ('dog_recipe_030', '/兔肉低钙成长.png'),
    ('dog_recipe_031', '/鸡肉燕麦均衡.png'),
    ('dog_recipe_032', '/鸡肉藜麦免疫餐.png'),
    ('dog_recipe_033', '/鸡肉苹果成长餐.png'),
    ('dog_recipe_034', '/鸡肉土豆成长.png'),
    ('dog_recipe_035', '/金枪鱼南瓜脑发育.png'),
    ('dog_recipe_036', '/金枪鱼燕麦成长.png'),
    ('dog_recipe_037', '/牛肉高蛋白成长.png'),
    ('dog_recipe_038', '/牛肉红薯活力餐.png'),
    ('dog_recipe_039', '/兔肉南瓜肠胃餐.png'),
    ('dog_recipe_040', '/鸭肉红薯成长.png')
)
UPDATE recipes AS recipe
SET img = recipe_images.img,
    updated_at = NOW()
FROM recipe_images
WHERE recipe.id = recipe_images.id
  AND (recipe.img IS NULL OR BTRIM(recipe.img) = '');

DO $$
DECLARE
  expected_count INTEGER;
  matched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected_count
  FROM (VALUES
    ('dog_recipe_001'), ('dog_recipe_002'), ('dog_recipe_003'), ('dog_recipe_004'),
    ('dog_recipe_005'), ('dog_recipe_006'), ('dog_recipe_007'), ('dog_recipe_008'),
    ('dog_recipe_009'), ('dog_recipe_010'), ('dog_recipe_011'), ('dog_recipe_012'),
    ('dog_recipe_013'), ('dog_recipe_014'), ('dog_recipe_015'), ('dog_recipe_016'),
    ('dog_recipe_017'), ('dog_recipe_018'), ('dog_recipe_019'), ('dog_recipe_020'),
    ('dog_recipe_021'), ('dog_recipe_022'), ('dog_recipe_023'), ('dog_recipe_024'),
    ('dog_recipe_025'), ('dog_recipe_026'), ('dog_recipe_027'), ('dog_recipe_028'),
    ('dog_recipe_029'), ('dog_recipe_030'), ('dog_recipe_031'), ('dog_recipe_032'),
    ('dog_recipe_033'), ('dog_recipe_034'), ('dog_recipe_035'), ('dog_recipe_036'),
    ('dog_recipe_037'), ('dog_recipe_038'), ('dog_recipe_039'), ('dog_recipe_040')
  ) AS expected(id);

  SELECT COUNT(*) INTO matched_count
  FROM recipes
  WHERE id = ANY (ARRAY[
    'dog_recipe_001', 'dog_recipe_002', 'dog_recipe_003', 'dog_recipe_004',
    'dog_recipe_005', 'dog_recipe_006', 'dog_recipe_007', 'dog_recipe_008',
    'dog_recipe_009', 'dog_recipe_010', 'dog_recipe_011', 'dog_recipe_012',
    'dog_recipe_013', 'dog_recipe_014', 'dog_recipe_015', 'dog_recipe_016',
    'dog_recipe_017', 'dog_recipe_018', 'dog_recipe_019', 'dog_recipe_020',
    'dog_recipe_021', 'dog_recipe_022', 'dog_recipe_023', 'dog_recipe_024',
    'dog_recipe_025', 'dog_recipe_026', 'dog_recipe_027', 'dog_recipe_028',
    'dog_recipe_029', 'dog_recipe_030', 'dog_recipe_031', 'dog_recipe_032',
    'dog_recipe_033', 'dog_recipe_034', 'dog_recipe_035', 'dog_recipe_036',
    'dog_recipe_037', 'dog_recipe_038', 'dog_recipe_039', 'dog_recipe_040'
  ])
    AND img IS NOT NULL
    AND BTRIM(img) <> '';

  IF expected_count <> 40 OR matched_count < expected_count THEN
    RAISE EXCEPTION 'recipe image backfill incomplete: expected %, found %', expected_count, matched_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM recipes
    WHERE status = 'active' AND (img IS NULL OR BTRIM(img) = '')
  ) THEN
    RAISE EXCEPTION 'one or more active recipes have no image path';
  END IF;
END $$;

COMMIT;
