// Pet Chef Ver B1.00 — Safety Filter · 2026-06-22
// safety_filter.js — 食材安全过滤服务（硬规则，无 AI 参与安全决策）

const { ingredientsDb } = require('../data/ingredients_db');

/**
 * 对用户输入的食材名称进行模糊匹配
 * 支持大小写不敏感、子字符串匹配
 * @param {string} inputName - 用户输入的食材名称
 * @returns {string|null} - 匹配到的数据库中的食材名称，未匹配返回 null
 */
function fuzzyMatchIngredient(inputName) {
  if (!inputName || typeof inputName !== 'string') return null;

  const normalizedInput = inputName.trim().toLowerCase();

  // 精确匹配（大小写不敏感）
  const exactMatch = Object.keys(ingredientsDb).find(
    key => key.toLowerCase() === normalizedInput
  );
  if (exactMatch) return exactMatch;

  // 子字符串匹配：用户输入包含数据库中的食材名
  const containsMatch = Object.keys(ingredientsDb).find(
    key => normalizedInput.includes(key.toLowerCase())
  );
  if (containsMatch) return containsMatch;

  // 子字符串匹配：数据库中的食材名包含用户输入
  const withinMatch = Object.keys(ingredientsDb).find(
    key => key.toLowerCase().includes(normalizedInput)
  );
  if (withinMatch) return withinMatch;

  return null;
}

/**
 * Validate ingredient safety against the hard-coded ingredient database.
 * MUST run BEFORE any Gemini API call.
 *
 * @param {string[]} ingredientNames - Raw ingredient names from user input
 * @returns {{ safe: [], caution: [], toxic: [], unknown: [] }}
 */
function validateIngredientSafety(ingredientNames) {
  const result = {
    safe: [],
    caution: [],
    toxic: [],
    unknown: [],
  };

  if (!Array.isArray(ingredientNames)) return result;

  for (const name of ingredientNames) {
    const matchedName = fuzzyMatchIngredient(name);

    if (!matchedName) {
      result.unknown.push({ name, matched_ingredient: null });
      continue;
    }

    const ingredient = ingredientsDb[matchedName];
    const entry = {
      name,
      matched_ingredient: matchedName,
      note: ingredient.safety_note || null,
    };

    switch (ingredient.safety_level) {
      case 'toxic':
        result.toxic.push(entry);
        break;
      case 'caution':
        result.caution.push(entry);
        break;
      case 'safe':
      default:
        result.safe.push(entry);
        break;
    }
  }

  return result;
}

/**
 * Check if any toxic ingredients are present.
 * @param {object} result - Result from validateIngredientSafety()
 * @returns {boolean}
 */
function hasToxicIngredients(result) {
  return result && Array.isArray(result.toxic) && result.toxic.length > 0;
}

/**
 * Check if any caution ingredients are present.
 * @param {object} result - Result from validateIngredientSafety()
 * @returns {boolean}
 */
function hasCautionIngredients(result) {
  return result && Array.isArray(result.caution) && result.caution.length > 0;
}

/**
 * Format safety result into a user-facing message.
 * @param {object} result - Result from validateIngredientSafety()
 * @returns {string[]} - Array of warning messages
 */
function formatSafetyMessage(result) {
  const warnings = [];

  if (!result) return warnings;

  if (result.toxic && result.toxic.length > 0) {
    for (const item of result.toxic) {
      warnings.push(`🚫 ${item.matched_ingredient}：${item.note || '对犬只有毒，严禁喂食！'}`);
    }
  }

  if (result.caution && result.caution.length > 0) {
    for (const item of result.caution) {
      warnings.push(`⚠️ ${item.matched_ingredient}：${item.note || '需谨慎喂食'}`);
    }
  }

  if (result.unknown && result.unknown.length > 0) {
    for (const item of result.unknown) {
      warnings.push(`❓ "${item.name}"：未能识别该食材，请确认食材名称是否正确`);
    }
  }

  return warnings;
}

/**
 * Generate safety warnings array (for API response)
 * @param {object} result - Result from validateIngredientSafety()
 * @returns {string[]} - Array of warning messages
 */
function generateSafetyWarnings(result) {
  return formatSafetyMessage(result);
}

module.exports = {
  validateIngredientSafety,
  hasToxicIngredients,
  hasCautionIngredients,
  formatSafetyMessage,
  generateSafetyWarnings,
};
