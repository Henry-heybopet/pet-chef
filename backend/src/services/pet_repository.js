const crypto = require('crypto');
const { query } = require('../data/pg_client');
const { getDefaultHouseholdForUser } = require('./user_repository');

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,，、;；\s]+/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function firstDefined(...values) {
  return values.find(value => value !== undefined);
}

function asEnum(value, allowed, fallback = null) {
  return allowed.includes(value) ? value : fallback;
}

function asDate(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(/\//g, '-'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function monthsFromBirthDate(value) {
  const date = asDate(value);
  if (!date) return null;
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(diffDays) || diffDays < 0) return null;
  return Math.round(diffDays / 30.4);
}

function deriveLifeStage(ageMonths, birthDate, fallback = 'adult') {
  const months = ageMonths ?? monthsFromBirthDate(birthDate);
  if (months !== null && months < 12) return 'puppy';
  if (months !== null && months >= 96) return 'senior';
  return fallback;
}

function normalizePetPayload(payload = {}, { partial = false } = {}) {
  const normalized = {};
  const set = (key, value, fallback) => {
    if (value !== undefined) normalized[key] = value;
    else if (!partial) normalized[key] = fallback;
  };

  const feedingGoal = firstDefined(payload.feeding_goal, payload.feedingGoal);
  const activityLevel = firstDefined(payload.activity_level, payload.activityLevel);
  const bodySize = firstDefined(payload.body_size, payload.bodySize);
  const birthDate = firstDefined(payload.birth_date, payload.birthDate);
  const ageMonths = payload.age_months === undefined ? undefined : asInt(payload.age_months);
  const explicitLifeStage = asEnum(firstDefined(payload.life_stage, payload.lifeStage), ['puppy', 'adult', 'senior'], null);

  set('name', payload.name, '我的爱犬');
  set('species', asEnum(payload.species || 'dog', ['dog', 'cat'], 'dog'), 'dog');
  set('breed', firstDefined(payload.breed, payload.breedName), null);
  set('sex', asEnum(payload.sex, ['male', 'female', 'unknown']), null);
  set('neutered', payload.neutered === undefined ? undefined : Boolean(payload.neutered), false);
  set('birth_date', asDate(birthDate), null);
  set('age_months', ageMonths, null);
  set('current_weight_kg', firstDefined(payload.current_weight_kg, payload.weight) === undefined ? undefined : Number(firstDefined(payload.current_weight_kg, payload.weight)), null);
  set('target_weight_kg', firstDefined(payload.target_weight_kg, payload.targetWeight) === undefined ? undefined : Number(firstDefined(payload.target_weight_kg, payload.targetWeight)), null);
  set('body_condition_score', firstDefined(payload.body_condition_score, payload.bcs) === undefined ? undefined : String(firstDefined(payload.body_condition_score, payload.bcs)), null);
  set('activity_level', asEnum(activityLevel, ['low', 'medium', 'high', 'working'], 'medium'), 'medium');
  set('life_stage', deriveLifeStage(ageMonths, birthDate, explicitLifeStage || 'adult'), 'adult');
  set('allergens', firstDefined(payload.allergens, payload.allergensText) === undefined ? undefined : normalizeArray(firstDefined(payload.allergens, payload.allergensText)), []);
  set('food_restrictions', firstDefined(payload.food_restrictions, payload.foodRestrictions) === undefined ? undefined : normalizeArray(firstDefined(payload.food_restrictions, payload.foodRestrictions)), []);
  set('health_tags', firstDefined(payload.health_tags, payload.healthTags) === undefined ? undefined : normalizeArray(firstDefined(payload.health_tags, payload.healthTags)), []);
  set('doctor_notes', firstDefined(payload.doctor_notes, payload.doctorNotes), null);
  set('user_notes', firstDefined(payload.user_notes, payload.userNotes), null);
  set('avatar_url', firstDefined(payload.avatar_url, payload.avatar), null);
  set('feeding_goal', asEnum(feedingGoal, ['maintenance', 'weight_loss', 'muscle_gain', 'post_surgery_recovery', 'coat_care', 'gastrointestinal_care']), null);
  set('body_size', asEnum(bodySize, ['mini', 'small', 'medium', 'large', 'giant']), null);
  set('environment', asEnum(payload.environment, ['indoor', 'outdoor', 'mixed']), null);
  set('allergy_symptoms', firstDefined(payload.allergy_symptoms, payload.allergySymptoms, payload.allergySymptomsText) === undefined ? undefined : normalizeArray(firstDefined(payload.allergy_symptoms, payload.allergySymptoms, payload.allergySymptomsText)), []);
  set('allergy_severity', asEnum(firstDefined(payload.allergy_severity, payload.allergySeverity), ['mild', 'moderate', 'severe']), null);
  set('special_period', asEnum(firstDefined(payload.special_period, payload.specialPeriod), ['pregnancy', 'lactation', 'post_op_rest', 'illness_recovery']), null);
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
}

function mapPet(row) {
  if (!row) return null;
  return {
    ...row,
    allergens: Array.isArray(row.allergens) ? row.allergens : [],
    food_restrictions: Array.isArray(row.food_restrictions) ? row.food_restrictions : [],
    health_tags: Array.isArray(row.health_tags) ? row.health_tags : [],
    allergy_symptoms: Array.isArray(row.allergy_symptoms) ? row.allergy_symptoms : [],
  };
}

function toPetDTO(pet) {
  const mapped = mapPet(pet);
  if (!mapped) return null;
  const lifeStage = deriveLifeStage(mapped.age_months, mapped.birth_date, mapped.life_stage || 'adult');
  return {
    id: mapped.id,
    household_id: mapped.household_id,
    owner_user_id: mapped.owner_user_id,
    name: mapped.name,
    species: mapped.species,
    breed: mapped.breed,
    sex: mapped.sex,
    neutered: Boolean(mapped.neutered),
    birth_date: mapped.birth_date,
    age_months: mapped.age_months,
    current_weight_kg: mapped.current_weight_kg,
    target_weight_kg: mapped.target_weight_kg,
    body_condition_score: mapped.body_condition_score,
    activity_level: mapped.activity_level,
    life_stage: lifeStage,
    allergens: mapped.allergens,
    food_restrictions: mapped.food_restrictions,
    health_tags: mapped.health_tags,
    doctor_notes: mapped.doctor_notes,
    user_notes: mapped.user_notes,
    avatar_url: mapped.avatar_url,
    feeding_goal: mapped.feeding_goal,
    body_size: mapped.body_size,
    environment: mapped.environment,
    allergy_symptoms: mapped.allergy_symptoms,
    allergy_severity: mapped.allergy_severity,
    special_period: mapped.special_period,
    created_at: mapped.created_at,
    updated_at: mapped.updated_at,
    deleted_at: mapped.deleted_at,
    owner_display_name: mapped.owner_display_name,
    owner_primary_phone: mapped.owner_primary_phone,
  };
}

async function listPetsForUser(userId) {
  const household = await getDefaultHouseholdForUser(userId);
  if (!household) return [];
  const result = await query(
    `SELECT * FROM pets
      WHERE household_id = $1 AND owner_user_id = $2 AND deleted_at IS NULL
      ORDER BY created_at ASC`,
    [household.id, userId]
  );
  return result.rows.map(toPetDTO);
}

async function listAdminPets() {
  const result = await query(
    `SELECT p.*, u.display_name AS owner_display_name, u.primary_phone AS owner_primary_phone
       FROM pets p
       LEFT JOIN users u ON u.id = p.owner_user_id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC`
  );
  return result.rows.map(toPetDTO);
}

async function getPetForUser(userId, petId) {
  const result = await query(
    `SELECT p.*
       FROM pets p
       JOIN household_members hm ON hm.household_id = p.household_id
      WHERE p.id = $1 AND hm.user_id = $2 AND hm.status = 'active' AND p.deleted_at IS NULL
      LIMIT 1`,
    [petId, userId]
  );
  return toPetDTO(result.rows[0]);
}

async function getPetById(petId) {
  const result = await query(
    `SELECT * FROM pets WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [petId]
  );
  return toPetDTO(result.rows[0]);
}

async function createPetForUser(userId, payload = {}) {
  const household = await getDefaultHouseholdForUser(userId);
  if (!household) {
    const error = new Error('Default household not found');
    error.status = 400;
    throw error;
  }
  const pet = normalizePetPayload(payload);
  const result = await query(
    `INSERT INTO pets
      (id, household_id, owner_user_id, name, species, breed, sex, neutered, birth_date, age_months,
       current_weight_kg, target_weight_kg, body_condition_score, activity_level, life_stage,
       allergens, food_restrictions, health_tags, doctor_notes, user_notes, avatar_url,
       feeding_goal, body_size, environment, allergy_symptoms, allergy_severity, special_period,
       created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15,
       $16, $17, $18, $19, $20, $21,
       $22, $23, $24, $25, $26, $27,
       NOW(), NOW())
     RETURNING *`,
    [
      id('pet'), household.id, userId, pet.name, pet.species, pet.breed, pet.sex, pet.neutered,
      pet.birth_date, pet.age_months, pet.current_weight_kg, pet.target_weight_kg, pet.body_condition_score,
      pet.activity_level, pet.life_stage, JSON.stringify(pet.allergens), JSON.stringify(pet.food_restrictions),
      JSON.stringify(pet.health_tags), pet.doctor_notes, pet.user_notes, pet.avatar_url, pet.feeding_goal,
      pet.body_size, pet.environment, JSON.stringify(pet.allergy_symptoms), pet.allergy_severity, pet.special_period,
    ]
  );
  return toPetDTO(result.rows[0]);
}

async function updatePetForUser(userId, petId, payload = {}) {
  const existing = await getPetForUser(userId, petId);
  if (!existing) return null;
  const patch = normalizePetPayload(payload, { partial: true });
  const entries = Object.entries(patch);
  if (!entries.length) return existing;
  const params = [petId, userId];
  const assignments = entries.map(([key, value], idx) => {
    params.push(['allergens', 'food_restrictions', 'health_tags', 'allergy_symptoms'].includes(key) ? JSON.stringify(value) : value);
    return `${key} = $${idx + 3}`;
  });
  const result = await query(
    `UPDATE pets
        SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND owner_user_id = $2 AND deleted_at IS NULL
      RETURNING *`,
    params
  );
  return toPetDTO(result.rows[0]);
}

function toPetAnalysisInput(pet, extras = {}) {
  if (!pet) return null;
  const ageMonths = Number(pet.age_months || 0);
  const age = ageMonths > 0 ? Number((ageMonths / 12).toFixed(1)) : Number(extras.age || 3);
  const bcsMatch = String(pet.body_condition_score || '').match(/\d+/);
  const bcs = bcsMatch ? Number(bcsMatch[0]) : pet.body_condition_score;
  const lifeStage = deriveLifeStage(ageMonths || null, pet.birth_date, pet.life_stage || 'adult');
  return {
    id: pet.id,
    pet_id: pet.id,
    name: pet.name,
    species: pet.species,
    sex: pet.sex,
    breedName: pet.breed,
    age,
    age_months: ageMonths || undefined,
    weight: pet.current_weight_kg,
    targetWeight: pet.target_weight_kg,
    bcs,
    bodySize: pet.body_size,
    activityLevel: pet.activity_level,
    lifeStage,
    environment: pet.environment,
    feedingGoal: pet.feeding_goal,
    goals: pet.feeding_goal ? [pet.feeding_goal] : [],
    foodRestrictions: pet.food_restrictions || [],
    healthTags: pet.health_tags || [],
    allergens: pet.allergens || [],
    allergySymptoms: pet.allergy_symptoms || [],
    allergySeverity: pet.allergy_severity,
    specialPeriod: pet.special_period,
    neutered: pet.neutered,
    updated_at: pet.updated_at,
    pet_updated_at: pet.updated_at,
    ...extras,
  };
}

const petToDogProfile = toPetAnalysisInput;

module.exports = {
  listPetsForUser,
  listAdminPets,
  getPetForUser,
  getPetById,
  createPetForUser,
  updatePetForUser,
  toPetDTO,
  toPetAnalysisInput,
  petToDogProfile,
};
