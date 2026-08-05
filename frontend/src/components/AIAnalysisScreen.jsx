// AIAnalysisScreen.jsx — AI analysis results + categories (i18n)
import React from 'react';
import TopBar from './TopBar';
import { useTranslation, VALIDATION_REASON_KEYS } from '../i18n/translations';
import { tData, tTag, tBreedDesc, tBenefit, tPack } from '../i18n/dataTranslations';
import { api } from '../api';
import { demoRecipes } from '../data/demoRecipes';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import { sortRecipeIngredientEntries } from '../utils/recipeIngredients';
import { filterRankedRecipes, splitTopItems } from '../utils/recommendationDisplay';
import FreshCheckRadar from './FreshCheckRadar';

// Nutrition needs translation map for rule-engine fallback
const NEED_TR = {
  '高蛋白促进生长':['High protein for growth','Hochwertiges Protein für Wachstum','Protéines élevées pour la croissance','Alta proteína para crecimiento','Proteine elevate per la crescita','成長のための高タンパク','성장을 위한 고단백'],
  'DHA脑部发育':['DHA for brain development','DHA für Gehirnentwicklung','DHA pour le développement cérébral','DHA para desarrollo cerebral','DHA per lo sviluppo cerebrale','DHA脳の発達','DHA 두뇌 발달'],
  '适量钙质骨骼健康':['Calcium for bone health','Kalzium für Knochengesundheit','Calcium pour la santé osseuse','Calcio para salud ósea','Calcio per la salute delle ossa','骨の健康のためのカルシウム','뼈 건강을 위한 칼슘'],
  '易消化低脂':['Easy-digest low-fat','Leicht verdaulich fettarm','Facile à digérer faible en gras','Fácil digestión bajo en grasa','Facile da digerire basso contenuto di grassi','消化に良い低脂肪','소화하기 쉬운 저지방'],
  '关节保护':['Joint protection','Gelenkschutz','Protection articulaire','Protección articular','Protezione articolare','関節保護','관절 보호'],
  '抗氧化护心':['Antioxidant heart care','Antioxidativer Herzschutz','Antioxydant soins cardiaques','Antioxidante cuidado cardíaco','Antiossidante cura cardiaca','抗酸化心臓ケア','항산화 심장 케어'],
  '均衡蛋白质':['Balanced protein','Ausgewogenes Protein','Protéines équilibrées','Proteína equilibrada','Proteine bilanciate','バランスの取れたタンパク質','균형 잡힌 단백질'],
  '优质脂肪':['Quality fats','Hochwertige Fette','Graisses de qualité','Grasas de calidad','Grassi di qualità','良質な脂肪','양질의 지방'],
  '丰富蔬菜纤维':['Rich vegetable fiber','Reichhaltige Gemüsefaser','Fibres végétales riches','Fibra vegetal rica','Fibre vegetali ricche','豊富な野菜繊維','풍부한 채소 섬유'],
  '美毛':['Coat care','Fellpflege','Soin du poil','Cuidado del pelo','Cura del pelo','被毛ケア','피모 케어'],
  '高蛋白需求':['High protein needs','Hoher Proteinbedarf','Besoins élevés en protéines','Necesidades altas de proteína','Fabbisogno proteico elevato','高タンパク質の必要性','고단백 필요'],
  'Omega-3':['Omega-3','Omega-3','Omega-3','Omega-3','Omega-3','Omega-3','Omega-3'],
  '体重管理':['Weight management','Gewichtskontrolle','Gestion du poids','Control de peso','Gestione del peso','体重管理','체중 관리'],
  '皮肤健康':['Skin health','Hautgesundheit','Santé de la peau','Salud de la piel','Salute della pelle','皮膚の健康','피부 건강'],
  '高能量需求':['High energy needs','Hoher Energiebedarf','Besoins énergétiques élevés','Necesidades de alta energía','Fabbisogno energetico elevato','高エネルギーの必要性','고에너지 필요'],
  '眼睛保健':['Eye health','Augengesundheit','Santé oculaire','Salud ocular','Salute oculare','目の健康','눈 건강'],
  '耐寒脂肪储备':['Cold-resistant fat reserves','Kältebeständige Fettreserven','Réserves de graisse résistantes au froid','Reservas de grasa resistentes al frío','Riserve di grasso resistenti al freddo','耐寒脂肪蓄積','내한 지방 비축'],
  '白毛护理':['White coat care','Weiße Fellpflege','Soins du poil blanc','Cuidado del pelo blanco','Cura del pelo bianco','白い被毛ケア','흰 털 관리'],
  '高蛋白':['High protein','Hohes Protein','Haute protéine','Alta proteína','Proteine elevate','高タンパク','고단백'],
  '骨骼支撑':['Bone support','Knochenstütze','Soutien osseux','Soporte óseo','Supporto osseo','骨のサポート','골격 지지'],
  '高能量':['High energy','Hohe Energie','Haute énergie','Alta energía','Alta energia','高エネルギー','고에너지'],
  '脑部发育':['Brain development','Gehirnentwicklung','Développement cérébral','Desarrollo cerebral','Sviluppo cerebrale','脳の発達','두뇌 발달'],
  '眼部保健':['Eye care','Augenpflege','Soins oculaires','Cuidado ocular','Cura oculare','目のケア','눈 관리'],
  '免疫增强':['Immunity boost','Immunstärkung','Renforcement immunitaire','Refuerzo inmunológico','Potenziamento immunitario','免疫強化','면역 강화'],
  '耳道护理':['Ear care','Ohrenpflege','Soins auriculaires','Cuidado auditivo','Cura dell\'orecchio','耳のケア','귀 관리'],
  '脊背保护':['Spine protection','Wirbelsäulenschutz','Protection de la colonne','Protección de la columna','Protezione della colonna','脊椎保護','척추 보호'],
  '控脂':['Fat control','Fettkontrolle','Contrôle des graisses','Control de grasa','Controllo dei grassi','脂肪制御','지방 조절'],
  '牙齿护理':['Dental care','Zahnpflege','Soins dentaires','Cuidado dental','Cura dentale','歯のケア','치아 관리'],
  '低过敏':['Hypoallergenic','Hypoallergen','Hypoallergénique','Hipoalergénico','Ipoallergenico','低アレルゲン','저알레르기'],
  '牙齿健康':['Dental health','Zahngesundheit','Santé dentaire','Salud dental','Salute dentale','歯の健康','치아 건강'],
  '心脏保健':['Heart health','Herzgesundheit','Santé cardiaque','Salud cardíaca','Salute cardiaca','心臓の健康','심장 건강'],
  '骨骼密度':['Bone density','Knochendichte','Densité osseuse','Densidad ósea','Densità ossea','骨密度','골밀도'],
  '低血糖预防':['Low blood sugar prevention','Unterzucker-Prävention','Prévention hypoglycémie','Prevención hipoglucemia','Prevenzione ipoglicemia','低血糖予防','저혈당 예방'],
  '肝脏保护':['Liver protection','Leberschutz','Protection du foie','Protección del hígado','Protezione del fegato','肝臓保護','간 보호'],
  '胰腺保护':['Pancreas protection','Bauchspeicheldrüsenschutz','Protection du pancréas','Protección pancreática','Protezione del pancreas','膵臓保護','췌장 보호'],
  '低脂':['Low-fat','Fettarm','Faible en gras','Bajo en grasa','Basso contenuto di grassi','低脂肪','저지방'],
  '泌尿系统健康':['Urinary health','Harnwegsgesundheit','Santé urinaire','Salud urinaria','Salute urinaria','泌尿器の健康','비뇨기 건강'],
  '脊椎保护':['Spine protection','Wirbelsäulenschutz','Protection vertébrale','Protección vertebral','Protezione vertebrale','脊椎保護','척추 보호'],
  '关节健康':['Joint health','Gelenkgesundheit','Santé articulaire','Salud articular','Salute articolare','関節の健康','관절 건강'],
  '肌肉维持':['Muscle maintenance','Muskelerhaltung','Maintien musculaire','Mantenimiento muscular','Mantenimento muscolare','筋肉維持','근육 유지'],
  '骨骼健康':['Bone health','Knochengesundheit','Santé osseuse','Salud ósea','Salute ossea','骨の健康','뼈 건강'],
  '泪痕管理':['Tear stain management','Tränenfleck-Management','Gestion des traces de larmes','Gestión de manchas de lágrimas','Gestione macchie lacrimali','涙やけ管理','눈물자국 관리'],
  '低敏':['Hypoallergenic','Hypoallergen','Hypoallergénique','Hipoalergénico','Ipoallergenico','低アレルゲン','저알레르기'],
  '过敏体质':['Allergy-prone','Allergisch veranlagt','Terrain allergique','Propenso a alergias','Soggetto ad allergie','アレルギー体質','알레르기 체질'],
  '低敏饮食':['Hypoallergenic diet','Hypoallergene Diät','Régime hypoallergénique','Dieta hipoalergénica','Dieta ipoallergenica','低アレルゲン食','저알레르기 식이'],
  '免疫':['Immunity','Immunität','Immunité','Inmunidad','Immunità','免疫','면역'],
  '肠胃健康':['Gut health','Magen-Darm-Gesundheit','Santé intestinale','Salud intestinal','Salute intestinale','胃腸の健康','장 건강'],
  '嗅觉保护':['Scent protection','Geruchsschutz','Protection olfactive','Protección olfativa','Protezione olfattiva','嗅覚保護','후각 보호'],
  '呼吸系统':['Respiratory system','Atmungssystem','Système respiratoire','Sistema respiratorio','Sistema respiratorio','呼吸器系','호흡기계'],
  '皮肤褶皱护理':['Skin fold care','Hautfaltenpflege','Soins des plis cutanés','Cuidado pliegues cutáneos','Cura delle pieghe cutanee','皮膚のシワケア','피부 주름 관리'],
  '均衡营养':['Balanced nutrition','Ausgewogene Ernährung','Nutrition équilibrée','Nutrición equilibrada','Nutrizione bilanciata','バランスの取れた栄養','균형 잡힌 영양'],
  '高质量蛋白质':['High-quality protein','Hochwertiges Protein','Protéines de qualité','Proteína de calidad','Proteine di qualità','高品質なたんぱく質','고품질 단백질'],
  '适量脂肪':['Moderate fat','Angemessener Fettanteil','Matières grasses modérées','Grasa moderada','Grassi moderati','適量の脂質','적정 지방'],
  '关节保护营养':['Joint-support nutrients','Nährstoffe für die Gelenke','Nutriments pour les articulations','Nutrientes para las articulaciones','Nutrienti per le articolazioni','関節サポート栄養','관절 보호 영양'],
};
const LANGS = ['en','de','fr','es','it','ja','ko'];
function tNeed(zhNeed, lang) {
  if (!lang || lang === 'zh') return zhNeed;
  const idx = LANGS.indexOf(lang);
  if (idx < 0) return zhNeed;
  return NEED_TR[zhNeed]?.[idx] || tTag(zhNeed, lang) || zhNeed;
}

// Generate fallback nutrition_analysis in target language
function tFallbackAnalysis(text, breedName, age, weight, analysis, lang) {
  const bn = tData(breedName, lang);
  const dg = analysis?.daily_grams || '--';
  const mpd = analysis?.meals_per_day || 2;
  const pmg = analysis?.per_meal_grams || '--';
  const templates = {
    zh: `当前每日鲜食建议约 ${dg}g，分 ${mpd} 餐，每餐约 ${pmg}g。应结合体重、BCS和活动量持续调整。`,
    en: `Based on your ${bn}, ${age} years old, ${weight}kg, the recommended daily fresh food intake is about ${dg}g. We suggest feeding ${mpd} times per day, about ${pmg}g per meal.`,
    de: `Basierend auf Ihrem ${bn}, ${age} Jahre alt, ${weight}kg, beträgt die empfohlene tägliche Frischfuttermenge ca. ${dg}g. Wir empfehlen ${mpd} Mahlzeiten pro Tag, ca. ${pmg}g pro Mahlzeit.`,
    fr: `D'après votre ${bn}, ${age} ans, ${weight}kg, l'apport quotidien recommandé est d'environ ${dg}g. Nous suggérons ${mpd} repas par jour, environ ${pmg}g par repas.`,
    es: `Según su ${bn}, ${age} años, ${weight}kg, la ingesta diaria recomendada es de aprox. ${dg}g. Sugerimos ${mpd} comidas al día, aprox. ${pmg}g por comida.`,
    it: `In base al vostro ${bn}, ${age} anni, ${weight}kg, l'assunzione giornaliera raccomandata è di circa ${dg}g. Suggeriamo ${mpd} pasti al giorno, circa ${pmg}g per pasto.`,
    ja: `${bn}（${age}歳、${weight}kg）の情報に基づき、1日の推奨鮮食量は約${dg}gです。1日${mpd}回、1回約${pmg}gの給餌をお勧めします。`,
    ko: `${bn}(${age}세, ${weight}kg) 정보를 바탕으로 일일 권장 신선식 섭취량은 약 ${dg}g입니다. 하루 ${mpd}회, 1회 약 ${pmg}g 급여를 권장합니다.`,
  };
  return templates[lang || 'zh'] || text;
}

function localizeCaution(text, lang, t) {
  if (!text || !lang || lang === 'zh') return text;
  if (text.includes('控制总热量') || text.includes('防止肥胖')) return t('cautionCalorieControl');
  if (text.includes('低脂') && text.includes('肉')) return t('cautionLeanMeat');
  return text;
}

const SCORE_LABEL_KEYS = {
  safety: 'freshScoreSafety',
  suitability: 'freshScoreSuitability',
  structure: 'freshScoreStructure',
  nutrition: 'freshScoreNutrition',
  long_term: 'freshScoreLongTerm',
  energy: 'freshScoreEnergy',
};

const NUTRITION_PACK_IDS = {
  puppy: 'dog_pack_001',
  largePuppy: 'dog_pack_002',
  adult: 'dog_pack_003',
  senior: 'dog_pack_004',
  brain: 'dog_pack_005',
  joint: 'dog_pack_006',
  coat: 'dog_pack_007',
  liver: 'dog_pack_008',
  hypoallergenic: 'dog_pack_009',
};

const NUTRITION_PACK_FALLBACK_NAMES = {
  dog_pack_001: '幼犬通用全价营养包',
  dog_pack_002: '大型幼犬控钙全价营养包',
  dog_pack_003: '成年犬通用全价营养包',
  dog_pack_004: '老年犬通用全价营养包',
  dog_pack_005: '脑发育功能支持全价营养包',
  dog_pack_006: '关节保护功能支持全价营养包',
  dog_pack_007: '美毛护肤功能支持全价营养包',
  dog_pack_008: '护肝功能支持全价营养包',
  dog_pack_009: '低敏无动物蛋白全价营养包',
};

function validationReasonText(deduction, t) {
  if (deduction?.code === 'LIFE_STAGE_MACRO_CHECK') {
    const stageKey = {
      puppy: 'puppyStage',
      adult: 'adultStage',
      senior: 'seniorStage',
    }[deduction.facts?.stage_standard];
    return t('validationSuitabilityLifeStage', {
      ...deduction.facts,
      stage_standard: stageKey ? t(stageKey) : deduction.facts?.stage_standard,
    });
  }
  if (deduction?.code === 'HEALTH_CONSTRAINTS_REVIEWED') {
    const healthTagKeys = {
      obesity: 'healthObesity',
      cardiac: 'healthCardiac',
      kidney: 'healthKidney',
      liver: 'healthLiver',
      diabetes: 'healthDiabetes',
      pancreatitis: 'healthPancreatitis',
      gastrointestinal: 'healthGastrointestinal',
    };
    const healthTags = (deduction.facts?.health_tags || [])
      .map(tag => healthTagKeys[tag] ? t(healthTagKeys[tag]) : tag)
      .join('、');
    return t('validationSuitabilityHealth', { ...deduction.facts, health_tags: healthTags || '-' });
  }
  const key = VALIDATION_REASON_KEYS[deduction?.code];
  return key
    ? t(key, deduction.facts || {})
    : t('validationLocalizationUnavailable', { code: deduction?.code || '-' });
}

function getRecipeScore(recipe, comparisons) {
  if (!recipe || !comparisons) return null;
  const score = Number(comparisons?.[recipe.name]?.a_comparison?.proposed_score);
  return Number.isFinite(score) ? score : null;
}

function getBestScoredRecipeId(recipes, comparisons) {
  const best = recipes.reduce((current, recipe) => {
    const score = getRecipeScore(recipe, comparisons);
    if (score === null) return current;
    if (!current || score > current.score) return { id: recipe.id, score };
    return current;
  }, null);
  return best?.id || recipes[0]?.id || '';
}

function RecipeDetailPage({ recipe, analysis, feedingPlan, recommendedEnergyDensity: recommendedDensity, comparison, isRecommended, onBack, t, lang }) {
  if (!recipe) return null;

  const perMealGrams = feedingPlan?.per_meal_grams || analysis?.per_meal_grams || 100;
  const score = Number(comparison?.proposed_score);
  const hasScore = Number.isFinite(score);
  const tags = recipe.tags || [];
  const ingredients = sortRecipeIngredientEntries(Object.entries(recipe.ingredients || {}));
  const totalIngredientRatio = ingredients.reduce((sum, [, ratio]) => sum + (Number(ratio) || 0), 0) || 100;
  const benefits = Object.entries(recipe.ingredient_benefits || {});
  const displayName = recipe.presentation?.name || tData(recipe.name, lang);
  const ingredientName = name => recipe.presentation?.ingredients?.[name]?.name || tData(name, lang);
  const radarScores = ['safety', 'suitability', 'structure', 'nutrition', 'long_term', 'energy']
    .map(key => ({ key, value: Number(feedingPlan?.validation_scores?.[key]) }))
    .filter(item => Number.isFinite(item.value));
  const lowScoreDetails = radarScores
    .filter(item => item.value <= 85 && item.key !== 'long_term')
    .map(item => ({ ...item, detail: feedingPlan?.validation_details?.[item.key] || {} }));
  const currentEnergyDensity = Number(feedingPlan?.kcal_per_gram);
  const recommendedEnergyDensity = Number(recommendedDensity ?? analysis?.kcal_per_gram);
  const hasEnergyDensityComparison = Number.isFinite(currentEnergyDensity)
    && Number.isFinite(recommendedEnergyDensity)
    && currentEnergyDensity < recommendedEnergyDensity;

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, minHeight: 0 }}>
      <TopBar onBack={onBack} title={t('recipeDetailTitle')} tone="recipe" />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 20px calc(24px + env(safe-area-inset-bottom))'
        }}
      >
        <div
          className="card glass"
        style={{
          width: '100%',
          overflow: 'hidden',
          padding: 0,
          border: '1px solid rgba(0,230,255,0.28)',
          borderRadius: 22,
          background: 'linear-gradient(180deg, rgba(10,17,28,0.98), rgba(5,11,20,0.98))',
          boxShadow: '0 0 34px rgba(0,230,255,0.12)'
        }}
      >
        <div style={{ width: '100%', height: 'min(22dvh, 190px)', background: 'rgba(0,230,255,0.05)' }}>
          {recipe.img ? (
            <img
              src={resolveRecipeImageUrl(recipe.img)}
              alt=""
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--gray)', fontSize: 13 }}>
              {t('freshFoodFormula')}
            </div>
          )}
        </div>

        <div style={{ padding: '18px 16px 4px' }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ color: 'var(--primary)', margin: '0 0 6px', fontSize: 24, lineHeight: 1.18, fontWeight: 900 }}>
              {displayName}
            </h2>
            {tags.length > 0 && (
              <div style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                {tags.map(tag => tTag(tag, lang)).join(' · ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hasScore && (
                <span style={{ fontSize: 12, color: 'var(--primary)', background: 'rgba(0,230,255,0.12)', border: '1px solid rgba(0,230,255,0.28)', borderRadius: 999, padding: '5px 10px', fontWeight: 800 }}>
                  {t('matchPercent', { score })}
                </span>
              )}
              {isRecommended && (
                <span style={{ fontSize: 12, color: 'var(--theme-nutrition)', background: 'var(--theme-nutrition-soft)', border: '1px solid color-mix(in srgb, var(--theme-nutrition) 28%, var(--theme-border))', borderRadius: 999, padding: '5px 10px', fontWeight: 800 }}>
                  {t('recommended')}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 999, padding: '5px 10px', fontWeight: 700 }}>
                {t('packABase')}
              </span>
            </div>
          </div>

          <section style={{ marginBottom: 18 }}>
            <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 10px', fontWeight: 800 }}>{t('recipeIngredients')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {ingredients.map(([ing, pct]) => {
                const grams = Math.round((Number(pct) / totalIngredientRatio) * perMealGrams);
                return (
                  <div key={ing} style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 10, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ingredientName(ing)}</div>
                    <div style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 900, marginTop: 4 }}>{pct}% ({grams}g)</div>
                  </div>
                );
              })}
            </div>
          </section>

          {feedingPlan?.daily_kcal && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 10px', fontWeight: 800 }}>{t('dailyNutritionEstimate')}</h3>
              <div style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65, background: feedingPlan.excessive_volume ? 'rgba(255,150,0,0.08)' : 'rgba(0,230,255,0.06)', border: `1px solid ${feedingPlan.excessive_volume ? 'rgba(255,150,0,0.3)' : 'rgba(0,230,255,0.15)'}`, borderRadius: 12, padding: 12 }}>
                <div>{t('dailyEnergy')}: <strong>{feedingPlan.daily_kcal} kcal</strong></div>
                <div>{t('recipeEnergyDensity')}: <strong>{feedingPlan.kcal_per_gram} kcal/g</strong></div>
                <div>{t('dailyFoodBodyWeightPct')}: <strong>{feedingPlan.daily_food_weight_pct_body_weight}%</strong></div>
                {feedingPlan.excessive_volume && <div style={{ color: '#FFB020', marginTop: 6 }}>{t('excessiveDailyVolume', { grams: feedingPlan.reference_max_daily_grams, pct: feedingPlan.exceeds_reference_by_pct })}</div>}
              </div>
            </section>
          )}

          {benefits.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 10px', fontWeight: 800 }}>{t('ingredientBenefits')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {benefits.map(([name, ben]) => (
                  <div key={name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{ingredientName(name)}</div>
                    <div style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.55 }}>{recipe.presentation?.ingredient_benefits?.[name] || tBenefit(name, ben, lang)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {radarScores.length === 6 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 10px', fontWeight: 800 }}>{t('freshCheckResult')}</h3>
              <FreshCheckRadar scores={radarScores} t={t} />
            </section>
          )}

          {lowScoreDetails.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={{ color: '#FFB020', fontSize: 15, margin: '0 0 10px', fontWeight: 800 }}>{t('cautions')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lowScoreDetails.map(({ key, value, detail }) => (
                  <article key={key} style={{ background: 'rgba(255,150,0,0.08)', borderLeft: '3px solid #FF9600', borderRadius: 10, padding: '11px 12px' }}>
                    <strong style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.5 }}>
                      {t('validationScoreReasonTitle', { label: t(SCORE_LABEL_KEYS[key]), score: value })}
                    </strong>
                    {key === 'nutrition' && detail.components && (
                      <div style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65, marginTop: 5 }}>
                        {t('validationNutritionBreakdown', {
                          protein: detail.components.protein,
                          fat: detail.components.fat,
                          micronutrients: detail.components.micronutrients,
                        })}
                      </div>
                    )}
                    {key === 'energy' && hasEnergyDensityComparison ? (
                      <div style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65, marginTop: 5 }}>
                        {t('validationMainDeduction')}{t('validationEnergyDensityBelowRecommended', {
                          actual: currentEnergyDensity,
                          recommended: recommendedEnergyDensity,
                          dailyGrams: feedingPlan.daily_grams,
                          referenceGrams: feedingPlan.reference_max_daily_grams,
                        })}
                      </div>
                    ) : (
                      (detail.deductions?.length > 0 ? detail.deductions : [{ code: null }]).map((deduction, index) => (
                        <div key={`${deduction.code || key}-${index}`} style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.65, marginTop: 5 }}>
                          {index === 0 ? t('validationMainDeduction') : '· '}{validationReasonText(deduction, t)}
                        </div>
                      ))
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

        </div>

        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(5,10,18,0.96)' }}>
          <button
            className="btn"
            style={{
              width: '100%',
              borderRadius: 999,
              border: '1px solid rgba(0, 230, 255, 0.45)',
              background: 'rgba(0, 230, 255, 0.13)',
              color: 'var(--primary)',
              fontWeight: 900,
              boxShadow: '0 0 18px rgba(0, 230, 255, 0.12)'
            }}
            onClick={onBack}
          >
            {t('backToRecommendations')}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function ComparisonSheet({ data, hoveredCard, setHoveredCard, onClose, t, lang }) {
  if (!data) return null;

  const actionButtonStyle = {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    padding: '12px 16px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const scoreCard = (kind, title, name, score, color, onClick) => (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHoveredCard(kind)}
      onMouseLeave={() => setHoveredCard(null)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '14px 10px',
        background: 'rgba(255,255,255,0.035)',
        borderRadius: 14,
        border: hoveredCard === kind ? `1.5px solid ${color}` : '1px dashed rgba(255,255,255,0.18)',
        cursor: 'pointer',
        boxShadow: hoveredCard === kind ? `0 0 16px ${color}33` : 'none',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tData(name, lang)}</div>
      <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 900, color }}>{score}%</div>
      <div style={{ fontSize: 11, color, marginTop: 6 }}>{t('matchScore')}</div>
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 10px calc(12px + env(safe-area-inset-bottom))'
      }}
      onClick={onClose}
    >
      <div
        className="card glass animate-fade"
        style={{
          width: '100%',
          maxWidth: 480,
          height: '72dvh',
          maxHeight: '72dvh',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          border: '1px solid rgba(0,230,255,0.38)',
          borderRadius: 22,
          background: 'linear-gradient(180deg, rgba(10,17,28,0.98), rgba(5,11,20,0.98))',
          boxShadow: '0 -18px 50px rgba(0,0,0,0.45), 0 0 34px rgba(0,230,255,0.12)'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '22px 18px 12px' }}>
          <div style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.22)', margin: '0 auto 18px' }} />
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📊</div>
            <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: 22, lineHeight: 1.2, fontWeight: 900 }}>{t('comparisonTitle')}</h3>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {scoreCard('current', t('currentRecommendation'), data.currentName, data.currentScore, '#4CAF50', onClose)}
            {scoreCard('proposed', t('plannedReplacement'), data.proposedName, data.proposedScore, 'var(--primary)', data.onConfirm)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.035)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 800, marginBottom: 6 }}>{t('nutritionComparison')}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{data.details}</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.035)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: '#4CAF50', fontWeight: 800, marginBottom: 6 }}>{t('scoreExplanation')}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{data.reason}</div>
            </div>
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(5,10,18,0.96)' }}>
          <button className="btn btn-secondary" style={actionButtonStyle} onClick={onClose}>{t('keepRecommendation')}</button>
          <button className="btn" style={{ ...actionButtonStyle, background: 'var(--primary)', color: '#000', border: '1px solid var(--primary)', fontWeight: 900 }} onClick={data.onConfirm}>{t('confirmReplacement')}</button>
        </div>
      </div>
    </div>
  );
}

export default function AIAnalysisScreen({ onBack, profile, onSelectRecipe, lang, authToken }) {
  const t = useTranslation(lang);
  const { analysis, breedName, age, weight } = profile;
  const [catalogRecipes, setCatalogRecipes] = React.useState(demoRecipes);
  const [bPacks, setBPacks] = React.useState([]);

  React.useEffect(() => {
    let active = true;
    api.getRecipes({ all: 1, locale: lang })
      .then(result => {
        if (!active || !result?.success) return;
        const fallbackById = new Map(demoRecipes.map(recipe => [recipe.id, recipe]));
        setCatalogRecipes(result.recipes.map(recipe => {
          const fallback = fallbackById.get(recipe.id) || {};
          return {
            ...fallback,
            ...recipe,
            img: recipe.img || fallback.img || '',
            ingredient_benefits: {
              ...(fallback.ingredient_benefits || {}),
              ...(recipe.presentation?.ingredient_benefits || {}),
            },
          };
        }));
      })
      .catch(error => console.warn('[RecipeCatalog] localized catalog unavailable:', error?.message || 'unknown'));
    return () => { active = false; };
  }, [lang]);

  React.useEffect(() => {
    let active = true;
    api.getNutritionPacks({ locale: lang })
      .then(result => {
        if (active && result?.success) setBPacks(result.packs || []);
      })
      .catch(error => console.warn('[NutritionPackCatalog] catalog unavailable:', error?.message || 'unknown'));
    return () => { active = false; };
  }, [lang]);

  const lifeStageLabel = { '幼犬': `🐾 ${t('puppyStage')}`, '成年犬': `🐕 ${t('adultStage')}`, '老年犬': `🦴 ${t('seniorStage')}` }[analysis?.life_stage] || `🐕 ${t('adultStage')}`;
  const activityLabel = { low: t('activityLow'), medium: t('activityMedium'), high: t('activityHigh'), very_high: t('activityWorking') }[analysis?.activity_level] || t('activityMedium');

  // Translate breed_intro: if it looks like Chinese fallback, use tBreedDesc
  const breedIntro = (() => {
    if (!analysis?.breed_intro) return '';
    if (lang && lang !== 'zh') {
      const translated = tBreedDesc(breedName, analysis.breed_intro, lang);
      if (translated !== analysis.breed_intro) return translated;
    }
    return analysis.breed_intro;
  })();

  // 只展示后端按宠物生命阶段筛选并由 HeyboPet Agent 完整评分的 A 基础包。
  const categoryRecipes = React.useMemo(() => {
    return filterRankedRecipes(catalogRecipes, analysis?.ranked_recipe_ids || []);
  }, [analysis?.ranked_recipe_ids, catalogRecipes]);

  const defaultSelectedAId = React.useMemo(() => {
    const rankedId = (analysis?.ranked_recipe_ids || []).find(id => categoryRecipes.some(recipe => recipe.id === id));
    if (rankedId) return rankedId;
    return getBestScoredRecipeId(categoryRecipes, profile?.comparisons);
  }, [analysis?.ranked_recipe_ids, categoryRecipes, profile?.comparisons]);

  // 2. 状态管理
  // 当前选中的 A 包食谱 ID (必选, 单选)
  const [selectedAId, setSelectedAId] = React.useState(defaultSelectedAId);

  React.useEffect(() => {
    setSelectedAId(defaultSelectedAId);
  }, [defaultSelectedAId]);

  const isLargePuppy = profile?.bodySize === 'large' || profile?.bodySize === 'giant' || weight >= 25;

  const getAllowedBPackIds = React.useCallback(() => {
    if (analysis?.life_stage === '幼犬') {
      return [isLargePuppy ? NUTRITION_PACK_IDS.largePuppy : NUTRITION_PACK_IDS.puppy, NUTRITION_PACK_IDS.brain];
    }
    if (analysis?.life_stage === '老年犬') {
      return [NUTRITION_PACK_IDS.senior, NUTRITION_PACK_IDS.joint];
    }
    return [NUTRITION_PACK_IDS.adult, NUTRITION_PACK_IDS.joint, NUTRITION_PACK_IDS.coat, NUTRITION_PACK_IDS.liver, NUTRITION_PACK_IDS.hypoallergenic];
  }, [analysis?.life_stage, isLargePuppy]);

  const recommendedBId = React.useMemo(() => {
    const allowed = getAllowedBPackIds();
    const aiPackId = analysis?.selected_b_pack?.pack_id;
    return allowed.includes(aiPackId) ? aiPackId : allowed[0];
  }, [analysis?.selected_b_pack?.pack_id, getAllowedBPackIds]);

  // 当前选中的 B 包
  const [selectedBId, setSelectedBId] = React.useState(recommendedBId);
  const selectedBPack = React.useMemo(() => bPacks.find(pack => pack.pack_id === selectedBId), [bPacks, selectedBId]);
  const selectedBName = selectedBPack?.canonical_name || selectedBPack?.name || NUTRITION_PACK_FALLBACK_NAMES[selectedBId] || '全价营养包';

  React.useEffect(() => {
    const allowed = getAllowedBPackIds();
    if (!allowed.includes(selectedBId)) {
      setSelectedBId(allowed[0]);
    }
  }, [getAllowedBPackIds, selectedBId]);

  // 弹窗与控制状态
  const [showBSelector, setShowBSelector] = React.useState(false);
  const [showDetailRecipe, setShowDetailRecipe] = React.useState(null);
  const [warningData, setWarningData] = React.useState(null);
  const [aComparisonData, setAComparisonData] = React.useState(null);
  const [hoveredCard, setHoveredCard] = React.useState(null);
  const [isComparing, setIsComparing] = React.useState(false);
  const [showOtherARecipes, setShowOtherARecipes] = React.useState(false);

  // 缓存与预取比对数据状态
  const [comparisonsCache, setComparisonsCache] = React.useState(() => {
    return profile?.comparisons || {};
  });

  React.useEffect(() => {
    if (profile?.comparisons) {
      setComparisonsCache(profile.comparisons);
    }
  }, [profile]);

  const findMatchedAllergen = React.useCallback((ingredients = []) => {
    if (!profile || !profile.allergens || profile.allergens.length === 0) return null;

    // 支持历史未拆分的长字符串动态分拆
    const splitAllergens = [];
    profile.allergens.forEach(allg => {
      if (typeof allg === 'string') {
        splitAllergens.push(...allg.split(/[,，、;；\s]+/).map(s => s.trim()).filter(Boolean));
      } else {
        splitAllergens.push(allg);
      }
    });

    const ALLERGEN_ALIASES = {
      '土豆': ['红薯', '马铃薯', '甘薯', '紫薯', '薯'],
      '红薯': ['红薯', '甘薯', '马铃薯', '紫薯', '土豆'],
      '燕麦': ['燕麦', '麦', '麸质', '谷物', '燕麦片', '全熟燕麦片'],
      '鸡肉': ['鸡', '鸡肉', '鸡小胸', '鸡胸'],
      '牛肉': ['牛', '牛肉', '牛腩', '牛腱'],
      '鱼': ['鱼', '鱼肉', '海鲜', '海鱼', '金枪鱼', '三文鱼', '鳕鱼'],
      '鱼肉': ['鱼', '鱼肉', '海鲜', '海鱼', '金枪鱼', '三文鱼', '鳕鱼'],
      '鸭肉': ['鸭', '鸭肉'],
      '兔肉': ['兔', '兔肉', '兔脊肉'],
      '大豆': ['大豆', '黄豆', '豆'],
      '鸡蛋': ['蛋', '鸡蛋', '卵磷脂'],
      '蛋': ['蛋', '鸡蛋', '卵磷脂'],
      '贝壳': ['贝壳', '贝类', '甲壳', '虾', '蟹'],
      '贝类': ['贝壳', '贝类', '甲壳', '虾', '蟹']
    };

    for (const allergen of splitAllergens) {
      if (allergen && typeof allergen === 'string' && allergen.trim() !== '') {
        const cleanAllergen = allergen.trim();
        // 1. 直切匹配
        for (const ing of ingredients) {
          if (ing.includes(cleanAllergen) || cleanAllergen.includes(ing)) {
            return cleanAllergen;
          }
        }
        // 2. 别名匹配
        const aliases = ALLERGEN_ALIASES[cleanAllergen];
        if (aliases) {
          for (const alias of aliases) {
            for (const ing of ingredients) {
              if (ing.includes(alias) || alias.includes(ing)) {
                return cleanAllergen;
              }
            }
          }
        }
      }
    }
    return null;
  }, [profile]);

  // 检测食谱是否包含宠物的过敏原
  const checkRecipeAllergen = React.useCallback((recipe) => {
    return findMatchedAllergen(Object.keys(recipe?.ingredients || {}));
  }, [findMatchedAllergen]);

  // 封装调用对比接口的流程
  const handleApplySelection = async (type, value) => {
    const nextAId = type === 'A' ? value : selectedAId;
    const nextB = selectedBName;
    if (!nextAId) {
      alert(t('selectAFirst'));
      return;
    }

    const currentA = catalogRecipes.find(r => r.id === selectedAId)?.name || '';
    const proposedA = catalogRecipes.find(r => r.id === nextAId)?.name || '';
    if (!profile?.id) {
      alert(t('savePetBeforeCompare'));
      return;
    }

    const payload = {
      pet_id: profile.id,
      lang,
      currentSelection: {
        a_recipe_name: currentA,
        pack_id: selectedBId,
        b_pack_name: selectedBName
      },
      proposedSelection: {
        a_recipe_name: proposedA,
        pack_id: selectedBId,
        b_pack_name: nextB
      }
    };

    setIsComparing(true);
    try {
      const res = await api.compareSelection(payload, authToken);
      setIsComparing(false);
      if (res.success && res.comparison && res.comparison.a_comparison && res.comparison.a_comparison.show_dialog) {
        setAComparisonData({
          currentName: currentA,
          proposedName: proposedA,
          currentScore: res.comparison.a_comparison.current_score,
          proposedScore: res.comparison.a_comparison.proposed_score,
          details: res.comparison.a_comparison.comparison_details,
          reason: res.comparison.a_comparison.score_reason,
          onConfirm: () => {
            setSelectedAId(nextAId);
            if (res.comparison.has_warning) {
              setWarningData({
                text: res.comparison.warning_text,
                pendingAction: () => {}
              });
            }
            setAComparisonData(null);
          }
        });
      } else if (res.success && res.comparison && res.comparison.has_warning) {
        setWarningData({
          text: res.comparison.warning_text,
          pendingAction: () => {
            setSelectedAId(nextAId);
          }
        });
      } else if (res.success) {
        setSelectedAId(nextAId);
      }
    } catch (e) {
      setIsComparing(false);
      alert(e.message || t('compareFailed'));
    }
  };

  const continueSelectA = async (id) => {
    const proposedRecipe = catalogRecipes.find(r => r.id === id);
    if (!proposedRecipe) return;

    const proposedName = proposedRecipe.name;
    const cached = comparisonsCache[proposedName];

    if (cached && cached.a_comparison && cached.a_comparison.show_dialog) {
      const currentRecipe = catalogRecipes.find(r => r.id === selectedAId);
      setAComparisonData({
        currentName: currentRecipe?.name || '',
        proposedName: proposedName,
        currentScore: getRecipeScore(currentRecipe, comparisonsCache) ?? cached.a_comparison.current_score,
        proposedScore: getRecipeScore(proposedRecipe, comparisonsCache) ?? cached.a_comparison.proposed_score,
        details: cached.a_comparison.comparison_details,
        reason: cached.a_comparison.score_reason,
        onConfirm: () => {
          setSelectedAId(id);
          if (cached.has_warning) {
            setWarningData({
              text: cached.warning_text,
              pendingAction: () => {}
            });
          }
          setAComparisonData(null);
        }
      });
    } else {
      handleApplySelection('A', id);
    }
  };

  const handleSelectA = async (id) => {
    const proposedRecipe = catalogRecipes.find(r => r.id === id);
    if (!proposedRecipe) return;

    const matchedAllergen = checkRecipeAllergen(proposedRecipe);
    if (matchedAllergen) {
      setWarningData({
        text: t('allergenRecipeWarning', { recipe: tData(proposedRecipe.name, lang), allergen: tData(matchedAllergen, lang) }),
        pendingAction: () => continueSelectA(id)
      });
      return;
    }

    continueSelectA(id);
  };

  const scoredCategoryRecipes = React.useMemo(() => {
    const aiRank = new Map((analysis?.ranked_recipe_ids || []).map((id, index) => [id, index]));
    return categoryRecipes
      .map((recipe, index) => ({ recipe, index, aiRank: aiRank.get(recipe.id), score: getRecipeScore(recipe, comparisonsCache) }))
      .sort((a, b) => {
        if (a.aiRank !== undefined || b.aiRank !== undefined) {
          return (a.aiRank ?? Number.MAX_SAFE_INTEGER) - (b.aiRank ?? Number.MAX_SAFE_INTEGER);
        }
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.index - b.index;
      });
  }, [analysis?.ranked_recipe_ids, categoryRecipes, comparisonsCache]);

  const {
    primary: primaryARecipes,
    folded: foldedARecipes,
  } = splitTopItems(scoredCategoryRecipes);
  React.useEffect(() => {
    setShowOtherARecipes(false);
  }, [analysis?.life_stage]);

  const renderARecipeCard = (r) => {
    const isSelected = selectedAId === r.id;
    const matchedAllergen = checkRecipeAllergen(r);
    const cachedScore = comparisonsCache[r.name]?.a_comparison?.proposed_score;
    const suitability = comparisonsCache[r.name]?.suitability;
    const suitabilityLabel = { high: '高度适配', medium: '适配', low: '谨慎适配', blocked: '不适合' }[suitability];
    return (
      <div key={r.id} className={`card ${isSelected ? 'glass-active' : 'glass'}`} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, border: matchedAllergen ? '1px dashed #ef4444' : (isSelected ? '1px solid var(--primary)' : '1px solid var(--border)'), background: matchedAllergen ? 'rgba(239,68,68,0.03)' : '', cursor: 'pointer' }} onClick={() => handleSelectA(r.id)}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: matchedAllergen ? '2px solid #ef4444' : '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? (matchedAllergen ? '#ef4444' : 'var(--primary)') : 'transparent' }}>
          {isSelected && <span style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{r.presentation?.name || tData(r.name, lang)}</span>
            {cachedScore !== undefined && cachedScore !== null && (
              <span style={{ fontSize: 11, color: matchedAllergen ? '#f87171' : 'var(--primary)', fontWeight: 800 }}>({t('matchPercent', { score: cachedScore })})</span>
            )}
            {suitabilityLabel && <span style={{ fontSize: 9, color: 'var(--primary)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)' }}>{suitabilityLabel}</span>}
            {matchedAllergen ? (
              <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '1px 5px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700 }}>{t('containsAllergen', { name: tData(matchedAllergen, lang) })}</span>
            ) : (
              primaryARecipes.some(item => item.recipe.id === r.id) && (
                <span style={{ fontSize: 9, background: 'rgba(0,230,255,0.15)', color: 'var(--primary)', padding: '1px 5px', borderRadius: 4 }}>{t('recommended')}</span>
              )
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
            {Object.keys(r.ingredients || {}).slice(0, 4).map(name => r.presentation?.ingredients?.[name]?.name || tData(name, lang)).join('/')}...
          </div>
          {comparisonsCache[r.name]?.a_comparison?.score_reason && <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>{comparisonsCache[r.name].a_comparison.score_reason}</div>}
        </div>
        <button className="btn btn-secondary" style={{ flex: '0 0 76px', width: 76, padding: '4px 10px', fontSize: 11, height: 'fit-content', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); setShowDetailRecipe(r); }}>
          {t('viewDetail')}
        </button>
      </div>
    );
  };

  const activeRecipeObj = React.useMemo(() => {
    return catalogRecipes.find(r => r.id === selectedAId) || categoryRecipes[0];
  }, [selectedAId, categoryRecipes, catalogRecipes]);
  const activeFeedingPlan = analysis?.recipe_feeding_plans?.[activeRecipeObj?.id] || analysis;
  const referenceFeedingPlan = analysis?.reference_feeding_plan || activeFeedingPlan;
  const activeNutritionText = tFallbackAnalysis(
    analysis?.nutrition_analysis,
    breedName,
    age,
    weight,
    { ...analysis, ...referenceFeedingPlan },
    lang
  );

  if (showDetailRecipe) {
    const detailFeedingPlan = analysis?.recipe_feeding_plans?.[showDetailRecipe.id] || analysis;
    return (
      <RecipeDetailPage
        recipe={showDetailRecipe}
        analysis={analysis}
        feedingPlan={detailFeedingPlan}
        recommendedEnergyDensity={referenceFeedingPlan?.kcal_per_gram}
        comparison={comparisonsCache[showDetailRecipe.name]?.a_comparison}
        isRecommended={Boolean(primaryARecipes.some(item => item.recipe.id === showDetailRecipe.id))}
        onBack={() => setShowDetailRecipe(null)}
        t={t}
        lang={lang}
      />
    );
  }

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <TopBar onBack={onBack} title={t('aiAnalysis')} />
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          {/* 宠物卡片 */}
          <div className="card glass" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>{tData(breedName, lang)}</div>
                <div style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>{weight}kg · {age}{t('yr')} · {lifeStageLabel}</div>
              </div>
              <div style={{ background: 'rgba(0,230,255,0.1)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 12px', fontSize: 12, color: 'var(--primary)', height: 'fit-content' }}>{activityLabel}</div>
            </div>
            <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{breedIntro}</p>
          </div>

          {/* 能量计算卡片 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: t('dailyTotal'), value: `${referenceFeedingPlan?.daily_grams || '--'}g`, color: 'var(--primary)' },
              { label: t('mealsPerDay'), value: `${referenceFeedingPlan?.meals_per_day || 2}`, color: 'var(--secondary)' },
              { label: t('perMeal'), value: `${referenceFeedingPlan?.per_meal_grams || '--'}g`, color: 'var(--theme-nutrition)' },
            ].map(item => (
              <div key={item.label} className="card glass" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {referenceFeedingPlan?.daily_kcal && (
            <div className="card glass" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', color: 'var(--gray)', fontSize: 12, lineHeight: 1.5 }}>
                <span>{t('dailyEnergy')}: <strong>{referenceFeedingPlan.daily_kcal} kcal</strong></span>
                <span>{t('recommendedRecipeEnergyDensity')}: <strong>{referenceFeedingPlan.kcal_per_gram} kcal/g</strong></span>
                <span>{t('dailyFoodBodyWeightPct')}: <strong>{referenceFeedingPlan.daily_food_weight_pct_body_weight}%</strong></span>
              </div>
            </div>
          )}

          {/* 诉求与建议 */}
          {analysis?.key_nutrition_needs?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8 }}>{t('keyNeeds')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.key_nutrition_needs.map((n, i) => (
                  <span key={i} style={{ background: 'rgba(0,230,255,0.08)', border: '1px solid rgba(0,230,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--primary)' }}>{tNeed(n, lang)}</span>
                ))}
              </div>
            </div>
          )}

          <div className="card glass" style={{ padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 8, fontWeight: 600 }}>{analysis?.recommendation_source_label || 'HeyboPet Agent 个体化推荐'}</div>
            <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{activeNutritionText}</p>
            {analysis?.fallback_message && <p style={{ color: '#FF9600', fontSize: 12, lineHeight: 1.6 }}>{analysis.fallback_message}</p>}
            {analysis?.factors_used?.length > 0 && <div style={{ color: 'var(--gray)', fontSize: 11, marginTop: 8 }}>本次读取：{analysis.factors_used.join(' · ')}</div>}
            {analysis?.cautions?.length > 0 && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,150,0,0.08)', borderRadius: 8, borderLeft: '3px solid #FF9600' }}>
                <div style={{ fontSize: 11, color: '#FF9600', marginBottom: 4 }}>{t('cautions')}</div>
                {analysis.cautions.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 }}>· {localizeCaution(c, lang, t)}</div>
                ))}
              </div>
            )}
          </div>

          {/* A+B 组合定制部分 */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, position: 'relative' }}>
            {isComparing && (
              <div style={{ position: 'absolute', top: 20, right: 0, fontSize: 12, color: 'var(--primary)' }}>
                {t('aiComparing')}
              </div>
            )}
            <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              🎯 {t('recommendedForYou')}
            </h3>

            {/* A 鲜食基础包 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{t('packA')}</span>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>{t('addRecipeHint')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {primaryARecipes.map(item => renderARecipeCard(item.recipe))}
                {foldedARecipes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
                      onClick={() => setShowOtherARecipes(value => !value)}
                    >
                      {showOtherARecipes ? t('collapseOtherRecipes') : t('expandOtherRecipes', { n: foldedARecipes.length })}
                    </button>
                    {showOtherARecipes && foldedARecipes.map(item => renderARecipeCard(item.recipe))}
                  </div>
                )}
              </div>
            </div>

            {/* B 全价营养包 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', marginBottom: 10 }}>{t('packB')}</div>
              <div className="card glass" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', justifyContent: 'space-between', border: '1px solid var(--secondary)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedBPack?.name || NUTRITION_PACK_FALLBACK_NAMES[selectedBId] || '全价营养包'}
                    <span style={{ fontSize: 9, background: 'rgba(255,0,163,0.15)', color: 'var(--secondary)', padding: '1px 5px', borderRadius: 4 }}>{t('currentSelection')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 6, lineHeight: 1.4, maxWidth: '80%' }}>
                    {selectedBPack?.description || ''}
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ flex: '0 0 76px', width: 76, padding: '4px 10px', fontSize: 11, height: 'fit-content', whiteSpace: 'nowrap' }} onClick={() => setShowBSelector(true)}>
                  {t('changePackB')}
                </button>
              </div>
            </div>

            {/* 立即烹饪 A+B 组合 */}
            <button className="btn" style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 'bold', background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)', color: '#000', border: 'none', borderRadius: 12 }} onClick={() => {
              // 携带定制参数跳转至烹饪制作界面
              const finalRecipe = {
                ...activeRecipeObj,
                feeding_plan: activeFeedingPlan,
                customB: selectedBName,
                pack_id: selectedBId,
                composition_summary: `A基础食材包（${activeRecipeObj.name}）+ 全价营养包（${selectedBName}）`
              };
              onSelectRecipe(finalRecipe);
            }}>
              {t('makeCombination', { name: tData(activeRecipeObj?.name, lang) })}
            </button>
          </div>
        </div>
      </div>

      {/* B 包更换模态弹窗 */}
      {showBSelector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card glass animate-fade" style={{ width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto', padding: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--secondary)', margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>{t('changeBPackTitle')}</h3>
            <p style={{ color: 'var(--gray)', fontSize: 12, lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {t('changeBPackHelp')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {bPacks.map(b => {
                const isSelected = selectedBId === b.pack_id;
                const isAllowed = getAllowedBPackIds().includes(b.pack_id) && b.available;
                return (
                  <div key={b.pack_id} style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(255,0,163,0.08)' : isAllowed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.015)',
                    border: isSelected ? '1px solid var(--secondary)' : isAllowed ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
                    cursor: isAllowed ? 'pointer' : 'not-allowed',
                    opacity: isAllowed ? 1 : 0.38,
                    transition: 'all 0.2s'
                  }} onClick={() => {
                    if (!isAllowed) return;
                    setShowBSelector(false);
                    setSelectedBId(b.pack_id);
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--secondary)' : '#fff' }}>
                        {b.name}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: 9, background: 'rgba(255,0,163,0.15)', color: 'var(--secondary)', padding: '2px 6px', borderRadius: 4 }}>{t('currentSelection')}</span>
                      )}
                      {!isAllowed && (
                        <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', color: 'var(--gray)', padding: '2px 6px', borderRadius: 4 }}>{t('notApplicable')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 6, lineHeight: 1.4 }}>
                      {b.description}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowBSelector(false)}>{t('closeBtn')}</button>
          </div>
        </div>
      )}

      {/* 调整配方安全警告确认弹窗 */}
      {warningData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card glass animate-fade" style={{ width: '100%', maxWidth: 400, padding: 24, border: '1px solid #FF9600', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: '#FF9600', margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>{t('recipeSafetyWarning')}</h3>
            <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.6, margin: '0 0 24px 0', textAlign: 'left' }}>
              {warningData.text}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn" style={{ flex: 1, background: '#FF9600', color: '#000', border: 'none', fontWeight: 700 }} onClick={() => {
                warningData.pendingAction();
                setWarningData(null);
              }}>
                {t('confirmAdjustment')}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWarningData(null)}>
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ComparisonSheet
        data={aComparisonData}
        hoveredCard={hoveredCard}
        setHoveredCard={setHoveredCard}
        onClose={() => setAComparisonData(null)}
        t={t}
        lang={lang}
      />
    </div>
  );
}
