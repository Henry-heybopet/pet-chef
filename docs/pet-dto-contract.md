# PetDTO Data Contract

This file is the single contract for pet profile data across PostgreSQL, API, the 5173 user app, the 5174 admin app, and AI nutrition analysis.

## Source of Truth

The source of truth is `schema.prisma` `model Pet`.

Formal business calculations must read a persisted pet by `pet_id` from PostgreSQL. Page state and localStorage are drafts only.

## PetDTO

All pet APIs return `PetDTO` using these field names:

```ts
type PetDTO = {
  id: string
  household_id: string
  owner_user_id: string
  name: string
  species: 'dog' | 'cat'
  breed: string | null
  sex: 'male' | 'female' | 'unknown' | null
  neutered: boolean
  birth_date: string | null
  age_months: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  body_condition_score: string | null
  activity_level: 'low' | 'medium' | 'high' | 'working'
  life_stage: 'puppy' | 'adult' | 'senior'
  allergens: string[]
  food_restrictions: string[]
  health_tags: string[]
  doctor_notes: string | null
  user_notes: string | null
  avatar_url: string | null
  feeding_goal: 'maintenance' | 'weight_loss' | 'muscle_gain' | 'post_surgery_recovery' | 'coat_care' | 'gastrointestinal_care' | null
  body_size: 'mini' | 'small' | 'medium' | 'large' | 'giant' | null
  environment: 'indoor' | 'outdoor' | 'mixed' | null
  allergy_symptoms: string[]
  allergy_severity: 'mild' | 'moderate' | 'severe' | null
  special_period: 'pregnancy' | 'lactation' | 'post_op_rest' | 'illness_recovery' | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

Owner display fields may be appended for admin views:

```ts
owner_display_name?: string
owner_primary_phone?: string
```

## API Rules

- `GET /api/pets` returns `PetDTO[]`.
- `GET /api/pets/:id` returns one `PetDTO`.
- `POST /api/pets` accepts form payload aliases but returns `PetDTO`.
- `PATCH /api/pets/:id` accepts form payload aliases but returns `PetDTO`.
- `DELETE /api/pets/:id` is idempotent and requires authentication plus owner matching. In one PostgreSQL transaction it deletes feeding, health, medical, and device-binding records; detaches retained cooking/order audit records; and soft-deletes the pet profile. The JSON-backed MVP record store applies the same pet-data cleanup.
- `GET /api/admin/pets` returns `PetDTO[]`.
- `POST /api/uploads/avatar` returns a relative `{ avatar_url }` in the form `/uploads/avatars/<filename>`; pet save then writes it to `PetDTO`.
- `PETCHEF_UPLOADS_DIR` may point multiple local worktrees at one absolute runtime upload directory. When absent, the backend uses `backend/public/uploads`.
- `POST /api/recommend` accepts `{ pet_id }` only for pet-specific recommendation.
- `POST /api/recommend/compare` accepts `{ pet_id, currentSelection, proposedSelection }` only.
- `POST /api/recommend/compare/batch` accepts `{ pet_id, currentSelection, proposedSelections }` only.

## 5173 User App Rules

- `PetFormDraft` is page state only.
- Before saving, base64 avatars must be uploaded through `/api/uploads/avatar`.
- Avatar URLs stored in PostgreSQL must be relative `/uploads/...` paths; clients resolve them against their configured API origin.
- The pet save payload must contain formal pet fields only.
- After save, replace local state with returned `PetDTO`.
- localStorage may store auth/onboarding state, but not persisted pet profiles.
- Frontend API clients must not return demo recipe, demo AI, or mock pet success responses when the backend fails.

## 5174 Admin Rules

- Admin reads only `PetDTO` from `GET /api/admin/pets`.
- Admin must show an error/empty state if PostgreSQL pet loading fails; it must not fall back to mock pets.
- Admin displays all `PetDTO` fields.
- Missing values display as `-`.
- Avatar display uses `avatar_url` only.

## AI Analysis Input

AI and recommendation APIs only accept `pet_id` for pet-specific analysis and scoring.

The backend converts `PetDTO` to `PetAnalysisInput`:

```ts
type PetAnalysisInput = {
  pet_id: string
  species: string
  breedName: string | null
  sex: string | null
  neutered: boolean
  age_months?: number
  age: number
  weight: number | null
  targetWeight: number | null
  bcs: number | string | null
  bodySize: string | null
  activityLevel: string
  lifeStage: string
  environment: string | null
  feedingGoal: string | null
  goals: string[]
  allergens: string[]
  foodRestrictions: string[]
  healthTags: string[]
  allergySymptoms: string[]
  allergySeverity: string | null
  specialPeriod: string | null
  pet_updated_at: string
}
```

AI and recommendation logic must not use frontend draft objects when `pet_id` is available.
