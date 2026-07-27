import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index';
import { useLanguage } from '../i18n/LanguageContext';
import { tData } from '../i18n/dataTranslations';
import { useTranslation } from '../i18n/translations';
import FreshCheckRadar from './FreshCheckRadar';

const blankIngredient = () => ({ name: '', grams: '' });
const numeric = value => Number(value) || 0;
const SUITABILITY_LABEL_KEYS = { life_stage: 'suitabilityLifeStage', body_size: 'suitabilityBodySize', weight_energy: 'suitabilityWeightEnergy', activity_neuter: 'suitabilityActivityNeuter', physiology: 'suitabilityPhysiology', health: 'suitabilityHealth', allergy: 'suitabilityAllergy' };
const ACTIVITY_LABEL_KEYS = { low: 'activityLow', medium: 'activityMedium', high: 'activityHigh', working: 'activityWorking', very_high: 'activityVeryHigh' };
const GOAL_LABEL_KEYS = { maintenance: 'goalMaintenance', weight_loss: 'goalWeightLoss', muscle_gain: 'goalMuscleGain', post_surgery_recovery: 'goalPostSurgery', coat_care: 'goalCoatCare', gastrointestinal_care: 'goalGastrointestinal' };
const translatedCode = (t, keys, code) => keys[code] ? t(keys[code]) : (code || '-');

export function FreshCheckScreen({ profiles, authToken, onBack, onAddPet, onResult, initialDraft }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const pets = useMemo(() => (profiles || []).filter(pet => !pet.species || pet.species === 'dog'), [profiles]);
  const [petId, setPetId] = useState(initialDraft?.petId || pets[0]?.id || '');
  const [text, setText] = useState(initialDraft?.text || '');
  const [ingredients, setIngredients] = useState(initialDraft?.ingredients?.length ? initialDraft.ingredients : [blankIngredient()]);
  const [busy, setBusy] = useState(false);
  const total = ingredients.reduce((sum, item) => sum + numeric(item.grams), 0);
  const update = (index, key, value) => setIngredients(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const recognize = async () => {
    if (!text.trim()) return window.alert(t('freshCheckPasteRequired'));
    setBusy(true);
    try {
      const result = await api.freshCheckRecognize({ text, locale: lang }, authToken);
      if (!result?.success) throw new Error(lang === 'zh' && result?.error ? result.error : t('freshCheckRecognitionFailed'));
      if (result.ingredients?.length) setIngredients(result.ingredients.map(item => ({ name: item.name, grams: item.grams })));
      else window.alert(lang === 'zh' && result.warning ? result.warning : t('freshCheckNoIngredientsRecognized'));
      if (result.warning && lang === 'zh') window.alert(result.warning);
    } catch (error) { window.alert(lang === 'zh' && error?.message ? error.message : t('freshCheckRecognitionFailed')); } finally { setBusy(false); }
  };

  const validate = async () => {
    if (!petId) return window.alert(t('freshCheckSelectPetRequired'));
    const valid = ingredients.filter(item => item.name.trim() && numeric(item.grams) > 0).map(item => ({ name: item.name.trim(), grams: numeric(item.grams) }));
    if (!valid.length) return window.alert(t('freshCheckIngredientRequired'));
    setBusy(true);
    try {
      const result = await api.freshCheckAnalyze({ pet_id: petId, ingredients: valid, meal_intent: 'long_term', locale: lang }, authToken);
      if (!result?.success) throw new Error(lang === 'zh' && result?.error ? result.error : t('freshCheckAnalyzeFailed'));
      onResult(result, { petId, text, ingredients });
    } catch (error) { window.alert(lang === 'zh' && error?.message ? error.message : t('freshCheckAnalyzeFailed')); } finally { setBusy(false); }
  };

  return <div className="fresh-check-page animate-fade">
    <button className="fresh-back" type="button" onClick={onBack}>←</button>
    <header className="fresh-hero"><h1>{t('freshCheckTitle')}</h1><div className="fresh-kicker">AI Nutrition Powered by HeyboPet Agent</div></header>
    <section className="fresh-section">
      <h2>{t('selectPet')}</h2>
      {pets.length ? <select className="fresh-check-select" value={petId} onChange={event => setPetId(event.target.value)}>{pets.map(pet => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select> : <div className="fresh-empty"><p>{t('createPetFirst')}</p><button type="button" onClick={onAddPet}>{t('createPet')}</button></div>}
    </section>
    <section className="fresh-section fresh-check-recognition">
      <h2>{t('recipeInput')}</h2><label>{t('smartEdit')}<textarea value={text} onChange={event => setText(event.target.value)} placeholder={t('recipeExample')} /></label>
      <div className="fresh-check-upload"><span>{t('pasteRecipe')}</span><button type="button" className="fresh-recognize" onClick={recognize} disabled={busy}>{t('recognize')}</button></div>
    </section>
    <section className="fresh-section fresh-check-table"><div className="fresh-check-table-title"><h2>{t('pendingRecipe')}</h2><button type="button" onClick={() => setIngredients(items => [...items, blankIngredient()])}>{t('addIngredient')}</button></div><div className="fresh-check-row fresh-check-head"><span aria-hidden="true" /><span>{t('freshIngredientList')}</span><span>{t('grams')}</span></div>{ingredients.map((item, index) => <div className="fresh-check-row" key={index}><button className="fresh-check-delete" type="button" aria-label={`${t('delete')} ${item.name || index + 1}`} onClick={() => setIngredients(items => items.filter((_, itemIndex) => itemIndex !== index))}>{t('delete')}</button><input value={item.name} onChange={event => update(index, 'name', event.target.value)} placeholder={t('ingredientName')} /><label><input type="number" min="0" value={item.grams} onChange={event => update(index, 'grams', event.target.value)} placeholder="0" />g</label></div>)}<div className="fresh-check-total"><span>{t('totalWeight')}</span><strong>{total} g</strong></div></section>
    <section className="fresh-check-benefits"><span>{t('riskRecognition')}</span><span>{t('nutritionBalance')}</span><span>{t('personalizedAdjustments')}</span></section>
    <button className="fresh-submit" type="button" disabled={busy || !pets.length} onClick={validate}>{busy ? t('processing') : t('validateIngredients')}</button>
  </div>;
}

export function FreshCheckResultScreen({ result, authToken, onResultUpdate, onAdjust, onBack }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const bPack = result?.b_pack || {};
  const recommended = (bPack.options || []).find(option => option.recommended && option.enabled);
  const [showBPack, setShowBPack] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(bPack.selected?.category_code || recommended?.category_code || '');
  const [applying, setApplying] = useState(false);
  const [localizing, setLocalizing] = useState(false);
  useEffect(() => {
    setSelectedCategory(bPack.selected?.category_code || recommended?.category_code || '');
  }, [bPack.selected?.category_code, recommended?.category_code]);
  useEffect(() => {
    if (!result?.analysis_id || result.locale === lang) return undefined;
    let active = true;
    setLocalizing(true);
    api.localizeAnalysis({ analysis_id: result.analysis_id, kind: 'fresh-check', locale: lang }, authToken)
      .then(next => { if (active && next?.success) onResultUpdate(next); })
      .catch(error => { if (active) console.warn('[Fresh Check] localization refresh failed', error?.message || 'unknown'); })
      .finally(() => { if (active) setLocalizing(false); });
    return () => { active = false; };
  }, [authToken, lang, onResultUpdate, result?.analysis_id, result?.locale]);
  if (!result) return null;
  if (result.locale && result.locale !== lang) return <div className="fresh-check-page fresh-result-page animate-fade"><div className="fresh-empty"><p>{t('localizingContent')}</p></div></div>;
  if (lang !== 'zh' && result.translation_status === 'fallback') return <div className="fresh-check-page fresh-result-page animate-fade"><div className="fresh-empty"><p>{t('translationUnavailable')}</p><button type="button" onClick={onBack}>{t('backHome')}</button></div></div>;
  const danger = (result.findings || []).filter(item => (item.risk_level || item.level) === 'danger');
  const adjustments = (result.findings || []).filter(item => ['warning', 'notice'].includes(item.risk_level || item.level));
  const need = result.daily_need || {};
  const intake = need.intake_feasibility || {};
  const longTerm = result.long_term_detail || {};
  const breed = result.pet?.breed ? tData(result.pet.breed, lang) : t('unknownBreed');
  const activity = translatedCode(t, ACTIVITY_LABEL_KEYS, need.activity_level);
  const feedingGoal = translatedCode(t, GOAL_LABEL_KEYS, need.feeding_goal);
  const enabledPacks = (bPack.options || []).filter(option => option.enabled);
  const disabledPacks = (bPack.options || []).filter(option => !option.enabled);
  const applyBPack = async () => {
    if (!selectedCategory) return;
    setApplying(true);
    try {
      const next = await api.freshCheckAnalyze({ pet_id: result.pet.id, ingredients: result.recipe.ingredients, meal_intent: result.recipe.meal_intent, b_pack_category: selectedCategory, locale: lang }, authToken);
      if (!next?.success) throw new Error(next?.error || t('freshCheckBPackApplyFailed'));
      onResultUpdate(next);
      setShowBPack(false);
    } catch (error) { window.alert(error.message || t('freshCheckBPackApplyFailed')); } finally { setApplying(false); }
  };
  const FindingList = ({ items }) => items.map((item, index) => { const level = item.risk_level || item.level; return <article className={`fresh-check-finding risk-${level === 'notice' ? 'warning' : level}`} key={`${item.risk_code || item.code || 'finding'}-${index}`}><strong>{item.title}</strong><p><b>{t('why')}</b>{item.reason}</p><p><b>{t('howAdjust')}</b>{item.adjustment}</p></article>; });
  const PackOption = ({ option }) => <label className={option.enabled ? '' : 'is-disabled'}><input type="radio" name="fresh-b-pack" value={option.category_code} checked={selectedCategory === option.category_code} disabled={!option.enabled} onChange={() => setSelectedCategory(option.category_code)} /><span><strong>{option.name}{option.recommended && <em>{t('recommended')}</em>}</strong><small>{option.category} · {option.reason}</small>{option.enabled && <small className="fresh-b-pack-dose">{t('bPackDoseRule')}</small>}</span></label>;

  return <div className="fresh-check-page fresh-result-page animate-fade">
    <header className="fresh-hero"><h1>{t('freshCheckResult')}</h1><div className="fresh-kicker">{result.pet?.name} · {result.recipe?.total_weight_g || 0} g{localizing ? ' · …' : ''}</div></header>
    <FreshCheckRadar scores={result.scores} t={t} />
    {adjustments.length > 0 && <section className="fresh-result-card"><h2>{t('needsAdjustment')}</h2><FindingList items={adjustments} /></section>}
    {bPack.needed && <section className="fresh-b-pack">
      <button type="button" className={`fresh-b-pack-trigger ${bPack.selected ? 'is-selected' : ''}`} onClick={() => setShowBPack(value => !value)}>{bPack.selected ? t('bPackSelected', { name: bPack.selected.name }) : t('addBPack')}</button>
      {bPack.selected && bPack.application && <p className="fresh-b-pack-note">{t('bPackApplicationNote', { dose: bPack.application.dose_grams })}</p>}
      {showBPack && <div className="fresh-b-pack-options">
        <h2>{t('selectBPack')}</h2>
        <p>{t('bPackUsageDescription')}</p>
        {enabledPacks.map(option => <PackOption option={option} key={option.category_code} />)}
        {disabledPacks.length > 0 && <details className="fresh-b-pack-disabled"><summary>{t('incompatibleBPackCount', { n: disabledPacks.length })}</summary>{disabledPacks.map(option => <PackOption option={option} key={option.category_code} />)}</details>}
        <button type="button" className="fresh-submit" disabled={!selectedCategory || applying} onClick={applyBPack}>{applying ? t('applying') : t('confirmBPack')}</button>
      </div>}
    </section>}
    <section className="fresh-result-card fresh-check-needs">
      <h2>{t('dailyNutritionEstimate')}</h2>
      <div><strong>{need.min_kcal || '-'}-{need.max_kcal || '-'} kcal</strong><span>{t('dailyEnergy')}</span></div>
      <div><strong>{t('mealCount', { n: need.meals_per_day || '-' })}</strong><span>{t('suggestedMeals')}</span></div>
      <p>{t('petNutritionSummary', { breed, months: need.age_months || '-', current: need.current_weight_kg || '-', target: need.target_weight_kg || '-' })}</p>
      {need.target_weight_note && <p className="fresh-inline-warning">⚠ {need.target_weight_note}</p>}
      <p>{t('recipeKcalEstimate', { value: need.recipe_kcal ?? t('valueUnavailable') })}{need.note ? ` ${need.note}` : ''}</p>
      <p>{t('activityGoalSummary', { activity, activityFactor: need.activity_factor || 1, neuterFactor: need.neuter_factor || 1, goal: feedingGoal, goalFactor: need.goal_factor || 1 })}{need.recorded_activity_factor !== need.activity_factor ? ` ${t('recordedActivityNotDuplicated', { factor: need.recorded_activity_factor })}` : ''}</p>
      {need.activity_note && <p>{need.activity_note}</p>}
      {intake.daily_food_weight_pct_body_weight != null && <div className="fresh-intake-grid">
        <span><strong>{intake.daily_food_weight_pct_body_weight}%</strong><small>{t('dailyFoodBodyWeightPct')}</small></span>
        <span><strong>{intake.grams_per_meal}g</strong><small>{t('perMealFoodWeight')}</small></span>
        <span><strong>{intake.kcal_per_gram ?? '-'} kcal/g</strong><small>{t('recipeEnergyDensity')}</small></span>
        {Number.isFinite(intake.estimated_water_pct) && <span><strong>{intake.estimated_water_pct}%</strong><small>{t('estimatedWaterPct')}</small></span>}
      </div>}
      {intake.excessive_volume && <p className="fresh-intake-alert">⚠ {t('excessiveDailyVolume', { grams: intake.reference_max_daily_grams, pct: intake.exceeds_reference_by_pct })} {intake.volume_advice}</p>}
      {intake.note && <small className="fresh-intake-note">{intake.note}</small>}
      {need.digestion_note && <p>{need.digestion_note}</p>}
    </section>
    {result.suitability_detail?.components?.length > 0 && <section className="fresh-result-card fresh-suitability-card"><h2>{t('petSuitability')} <strong>{t('scorePoints', { n: result.suitability_detail.value })}</strong></h2><p>{result.suitability_detail.explanation}</p><div className="fresh-suitability-grid">{result.suitability_detail.components.map(item => <article key={item.key}><header><b>{SUITABILITY_LABEL_KEYS[item.key] ? t(SUITABILITY_LABEL_KEYS[item.key]) : item.label}</b><strong>{item.earned}/{item.max}</strong></header><p>{item.reason}</p>{item.earned < item.max && <small>{t('howImprove')}{item.adjustment}</small>}</article>)}</div><small>{t('suitabilityDisclaimer')}</small></section>}
    {result.macro_nutrition && <section className="fresh-result-card fresh-macro-card"><h2>{t('macroNutrition')}</h2><div className="fresh-macro-grid"><span>{t('macroAnimalProtein')}<strong>{result.macro_nutrition.ingredient_weight_ratios.animal_protein_pct}%</strong></span><span>{t('macroOrgan')}<strong>{result.macro_nutrition.ingredient_weight_ratios.organ_pct}%</strong></span><span>{t('macroCarb')}<strong>{result.macro_nutrition.ingredient_weight_ratios.carb_pct}%</strong></span><span>{t('macroVegetable')}<strong>{result.macro_nutrition.ingredient_weight_ratios.vegetable_pct}%</strong></span><span>{t('macroFatIngredient')}<strong>{result.macro_nutrition.ingredient_weight_ratios.fat_containing_ingredient_pct}%</strong></span><span>{t('macroAddedFat')}<strong>{result.macro_nutrition.ingredient_weight_ratios.fat_source_pct}%</strong></span></div><p>{t('estimatedNutrients', { protein: result.macro_nutrition.estimated_grams.protein_g, fat: result.macro_nutrition.estimated_grams.fat_g, carb: result.macro_nutrition.estimated_grams.carb_g })}</p><p>{t('per1000Kcal', { protein: result.macro_nutrition.per_1000_kcal.protein_g ?? '-', proteinMin: result.macro_nutrition.standards.protein_min_g_per_1000kcal, fat: result.macro_nutrition.per_1000_kcal.fat_g ?? '-', fatMin: result.macro_nutrition.standards.fat_min_g_per_1000kcal })}</p><small>{t('macroStructureExplanation')}</small><small>{t('dataCoverageDisclaimer', { pct: result.macro_nutrition.coverage.weight_pct, source: result.macro_nutrition.standards.source })}</small></section>}
    {longTerm.explanation && <section className="fresh-result-card fresh-long-term"><h2>{t('longTermSuitability')}</h2><p>{longTerm.explanation}</p>{(longTerm.adjustments || []).map(item => <p key={item}>{t('howImprove')}{item}</p>)}{longTerm.professional_confirmation_required && <small>{t('professionalConfirmationDisclaimer')}</small>}</section>}
    <section className={`fresh-result-card fresh-check-verdict ${danger.length ? 'has-danger' : ''}`}><h2>{t('verificationConclusion')}</h2><p>{result.verdict}</p>{result.ai_summary && <p><b>{t('aiAdjustment')}</b>{result.ai_summary}</p>}</section>
    {danger.length > 0 && <section className="fresh-result-card fresh-danger-card"><h2>{t('mustHandleNow')}</h2><FindingList items={danger} /></section>}
    {result.cooking_plan && <section className="fresh-result-card"><h2>{t('executableCookingPlan')}</h2><p>{t('cookingPlanMetrics', { grams: result.cooking_plan.total_weight_g, temperature: result.cooking_plan.temperature_c, minutes: result.cooking_plan.cook_minutes })}</p><p>{result.cooking_plan.note}</p></section>}
    <div className="fresh-check-result-actions"><button className="fresh-submit is-secondary" type="button" onClick={onAdjust}>{t('adjustRecipe')}</button><button className="fresh-submit" type="button" onClick={onBack}>{t('backHome')}</button></div>
  </div>;
}
