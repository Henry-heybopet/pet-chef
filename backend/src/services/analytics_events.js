// analytics_events.js - Heybo Pet analytics event catalog and payload validation.

const EVENT_NAMES = Object.freeze({
  PET_PROFILE_CREATED: 'pet_profile_created',
  PET_PROFILE_UPDATED: 'pet_profile_updated',
  RECIPE_RECOMMENDATION_VIEWED: 'recipe_recommendation_viewed',
  RECIPE_RECOMMENDATION_SELECTED: 'recipe_recommendation_selected',
  STORE_PRODUCT_VIEWED: 'store_product_viewed',
  STORE_ORDER_CREATED: 'store_order_created',
  COOKING_STARTED: 'cooking_started',
  COOKING_COMPLETED: 'cooking_completed',
  FEEDING_RECORDED: 'feeding_recorded',
  FEEDING_FEEDBACK_SUBMITTED: 'feeding_feedback_submitted',
  HEALTH_RECORD_CREATED: 'health_record_created',
  HEALTH_CHANGE_DETECTED: 'health_change_detected',
  DEVICE_FAULT_REPORTED: 'device_fault_reported',
});

const COMMON_SCHEMA = Object.freeze({
  event_id: { type: 'string', required: false },
  user_id: { type: 'string', required: false },
  household_id: { type: 'string', required: false },
  pet_id: { type: 'string', required: false },
  device_id: { type: 'string', required: false },
  session_id: { type: 'string', required: false },
  occurred_at: { type: 'iso_date', required: false },
  source: {
    type: 'enum',
    values: ['web', 'ios', 'android', 'backend', 'device', 'admin'],
    required: false,
  },
});

const EVENT_PAYLOAD_SCHEMAS = Object.freeze({
  [EVENT_NAMES.PET_PROFILE_CREATED]: {
    pet_id: { type: 'string', required: true },
    breed_id: { type: 'string', required: false },
    breed_name: { type: 'string', required: false },
    species: { type: 'enum', values: ['dog', 'cat'], required: false },
    age_years: { type: 'number', min: 0, required: false },
    weight_kg: { type: 'number', min: 0, required: false },
    sex: { type: 'enum', values: ['male', 'female', 'unknown'], required: false },
    neutered: { type: 'boolean', required: false },
    activity_level: { type: 'enum', values: ['low', 'medium', 'high', 'very_high'], required: false },
    health_tags: { type: 'array', itemType: 'string', required: false },
  },
  [EVENT_NAMES.PET_PROFILE_UPDATED]: {
    pet_id: { type: 'string', required: true },
    changed_fields: { type: 'array', itemType: 'string', required: true },
    previous_weight_kg: { type: 'number', min: 0, required: false },
    current_weight_kg: { type: 'number', min: 0, required: false },
    health_tags: { type: 'array', itemType: 'string', required: false },
  },
  [EVENT_NAMES.RECIPE_RECOMMENDATION_VIEWED]: {
    pet_id: { type: 'string', required: true },
    request_id: { type: 'string', required: false },
    recipe_ids: { type: 'array', itemType: 'string', required: true },
    algorithm_version: { type: 'string', required: false },
    recommendation_context: { type: 'object', required: false },
  },
  [EVENT_NAMES.RECIPE_RECOMMENDATION_SELECTED]: {
    pet_id: { type: 'string', required: true },
    request_id: { type: 'string', required: false },
    recipe_id: { type: 'string', required: true },
    rank: { type: 'number', min: 1, required: false },
    reason_tags: { type: 'array', itemType: 'string', required: false },
    algorithm_version: { type: 'string', required: false },
  },
  [EVENT_NAMES.STORE_PRODUCT_VIEWED]: {
    product_id: { type: 'string', required: true },
    category: { type: 'string', required: false },
    recommendation_request_id: { type: 'string', required: false },
    target_tags: { type: 'array', itemType: 'string', required: false },
  },
  [EVENT_NAMES.STORE_ORDER_CREATED]: {
    order_id: { type: 'string', required: true },
    pet_id: { type: 'string', required: false },
    product_ids: { type: 'array', itemType: 'string', required: true },
    total_cents: { type: 'number', min: 0, required: false },
    currency: { type: 'string', required: false },
    source_recommendation_request_id: { type: 'string', required: false },
  },
  [EVENT_NAMES.COOKING_STARTED]: {
    pet_id: { type: 'string', required: true },
    recipe_id: { type: 'string', required: true },
    operation_id: { type: 'string', required: false },
    total_grams: { type: 'number', min: 0, required: false },
    mode: { type: 'string', required: false },
    temperature: { type: 'number', required: false },
  },
  [EVENT_NAMES.COOKING_COMPLETED]: {
    pet_id: { type: 'string', required: true },
    recipe_id: { type: 'string', required: true },
    operation_id: { type: 'string', required: false },
    total_seconds: { type: 'number', min: 0, required: false },
    completed: { type: 'boolean', required: true },
    interruption_reason: { type: 'string', required: false },
  },
  [EVENT_NAMES.FEEDING_RECORDED]: {
    pet_id: { type: 'string', required: true },
    feeding_record_id: { type: 'string', required: false },
    recipe_id: { type: 'string', required: false },
    grams: { type: 'number', min: 0, required: true },
    meal_time: { type: 'iso_date', required: false },
    source: { type: 'enum', values: ['web', 'ios', 'android', 'backend', 'device', 'admin'], required: false },
  },
  [EVENT_NAMES.FEEDING_FEEDBACK_SUBMITTED]: {
    pet_id: { type: 'string', required: true },
    feeding_record_id: { type: 'string', required: false },
    recipe_id: { type: 'string', required: false },
    appetite_score: { type: 'number', min: 1, max: 5, required: false },
    stool_score: { type: 'number', min: 1, max: 5, required: false },
    energy_score: { type: 'number', min: 1, max: 5, required: false },
    allergy_observed: { type: 'boolean', required: false },
    notes: { type: 'string', required: false },
  },
  [EVENT_NAMES.HEALTH_RECORD_CREATED]: {
    pet_id: { type: 'string', required: true },
    health_record_id: { type: 'string', required: false },
    record_type: { type: 'string', required: false },
    weight_kg: { type: 'number', min: 0, required: false },
    body_condition_score: { type: 'number', min: 1, max: 9, required: false },
    symptoms: { type: 'array', itemType: 'string', required: false },
    measured_at: { type: 'iso_date', required: false },
  },
  [EVENT_NAMES.HEALTH_CHANGE_DETECTED]: {
    pet_id: { type: 'string', required: true },
    window_days: { type: 'number', min: 1, required: true },
    metric: { type: 'string', required: true },
    direction: { type: 'enum', values: ['up', 'down', 'stable'], required: true },
    delta_value: { type: 'number', required: false },
    confidence: { type: 'number', min: 0, max: 1, required: false },
  },
  [EVENT_NAMES.DEVICE_FAULT_REPORTED]: {
    device_id: { type: 'string', required: true },
    fault_code: { type: 'string', required: true },
    fault_level: { type: 'enum', values: ['info', 'warning', 'critical'], required: false },
    operation_id: { type: 'string', required: false },
    recipe_id: { type: 'string', required: false },
    recoverable: { type: 'boolean', required: false },
  },
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateField(name, value, rule) {
  if (value === undefined || value === null || value === '') {
    return rule.required ? `${name} is required` : null;
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) return `${name} must be an array`;
    if (rule.itemType) {
      const badIndex = value.findIndex(item => typeof item !== rule.itemType);
      if (badIndex >= 0) return `${name}[${badIndex}] must be a ${rule.itemType}`;
    }
    return null;
  }

  if (rule.type === 'enum') {
    return rule.values.includes(value) ? null : `${name} must be one of: ${rule.values.join(', ')}`;
  }

  if (rule.type === 'iso_date') {
    return Number.isNaN(Date.parse(value)) ? `${name} must be an ISO date string` : null;
  }

  if (rule.type === 'object') {
    return isPlainObject(value) ? null : `${name} must be an object`;
  }

  if (typeof value !== rule.type) return `${name} must be a ${rule.type}`;
  if (rule.type === 'number') {
    if (Number.isNaN(value)) return `${name} must be a valid number`;
    if (rule.min !== undefined && value < rule.min) return `${name} must be >= ${rule.min}`;
    if (rule.max !== undefined && value > rule.max) return `${name} must be <= ${rule.max}`;
  }
  return null;
}

function validateEventPayload(eventName, payload = {}) {
  if (!EVENT_PAYLOAD_SCHEMAS[eventName]) {
    return { valid: false, errors: [`Unknown event name: ${eventName}`] };
  }
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }

  const schema = { ...COMMON_SCHEMA, ...EVENT_PAYLOAD_SCHEMAS[eventName] };
  const errors = Object.entries(schema)
    .map(([name, rule]) => validateField(name, payload[name], rule))
    .filter(Boolean);

  return { valid: errors.length === 0, errors };
}

function createAnalyticsEvent(eventName, payload = {}) {
  const validation = validateEventPayload(eventName, payload);
  if (!validation.valid) {
    const error = new Error(`Invalid analytics event: ${validation.errors.join('; ')}`);
    error.validation = validation;
    throw error;
  }

  return {
    event_name: eventName,
    payload: {
      occurred_at: new Date().toISOString(),
      ...payload,
    },
  };
}

module.exports = {
  EVENT_NAMES,
  EVENT_PAYLOAD_SCHEMAS,
  COMMON_SCHEMA,
  validateEventPayload,
  createAnalyticsEvent,
};
