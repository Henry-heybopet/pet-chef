export const INGREDIENT_CATEGORY_COLORS = {
  protein: 'var(--theme-danger)',
  carb: 'var(--theme-warning)',
  veg: 'var(--theme-nutrition)',
  addition: '#8B5CF6',
};

const CATEGORY_ORDER = {
  protein: 0,
  carb: 1,
  veg: 2,
  addition: 3,
};

const ADDITION_MARKERS = [
  '油', '粉', '盐', '钙', '矿物', '酵母', '藻', '胶', '磷脂',
  '牛磺酸', '胆碱', '辅酶', '葡萄糖胺', '软骨素', 'MSM', '生物素',
];
const ANIMAL_MARKERS = ['鸡', '牛', '鱼', '鸭', '羊', '鹿', '火鸡', '兔', '猪', '鹅', '虾', '蟹', '贝', '蛋'];
const STARCH_MARKERS = ['红薯', '甘薯', '紫薯', '南瓜', '燕麦', '糙米', '米饭', '大米', '小米', '土豆', '马铃薯', '藜麦', '山药'];

export function getIngredientCategory(name = '') {
  if (ADDITION_MARKERS.some(marker => name.includes(marker))) return 'addition';
  if (ANIMAL_MARKERS.some(marker => name.includes(marker))) return 'protein';
  if (STARCH_MARKERS.some(marker => name.includes(marker))) return 'carb';
  return 'veg';
}

function compareIngredients(nameA, pctA, nameB, pctB) {
  const categoryDiff = CATEGORY_ORDER[getIngredientCategory(nameA)] - CATEGORY_ORDER[getIngredientCategory(nameB)];
  if (categoryDiff !== 0) return categoryDiff;
  return (Number(pctB) || 0) - (Number(pctA) || 0);
}

export function sortRecipeIngredientEntries(entries = []) {
  return [...entries].sort(([nameA, pctA], [nameB, pctB]) => compareIngredients(nameA, pctA, nameB, pctB));
}

export function sortRecipeIngredientList(items = []) {
  return [...items].sort((a, b) => compareIngredients(a?.name || '', a?.pct, b?.name || '', b?.pct));
}
