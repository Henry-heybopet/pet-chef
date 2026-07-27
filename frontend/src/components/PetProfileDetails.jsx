import React, { useState } from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';
import { tData, tBreedDesc } from '../i18n/dataTranslations';
import { getPetAvatarUrl, handlePetAvatarError } from '../utils/petAvatar';

export default function PetProfileDetails({ profile, onEdit, onSelectCategory, onSaveHealthHistory, onShowAnalysis, lang }) {
  const t = useTranslation(lang);
  
  // Local state for inline health history editing
  const [allergies, setAllergies] = useState(profile?.allergies || '');
  const [diseases, setDiseases] = useState(profile?.diseases || '');
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Extract metadata values
  const name = profile?.name || t('petDefaultName');
  const sex = profile?.sex || 'male';
  const breed = profile?.breed;
  const avatar = getPetAvatarUrl(profile || {}, breed ? [breed] : []);
  const breedName = profile?.breedName || t('unknownBreed');
  const bodySize = profile?.bodySize || 'medium';
  const activityLevel = profile?.activityLevel || 'medium';
  const environment = profile?.environment || 'indoor';
  const weight = profile?.weight || 15;
  const targetWeight = profile?.targetWeight || 15;
  const bcs = profile?.bcs || 5;
  const feedingGoal = profile?.feedingGoal || 'maintenance';
  const age = profile?.age || 3;
  const ageMonths = profile?.age_months || 36;

  // Page 2 health fields
  const neutered = profile?.neutered || false;
  const healthTags = profile?.healthTags || profile?.health_tags || [];
  const allergensText = profile?.allergensText || (Array.isArray(profile?.allergens) ? profile.allergens[0] : '') || '';
  const allergySymptomsText = profile?.allergySymptomsText || (Array.isArray(profile?.allergySymptoms || profile?.allergy_symptoms) ? (profile.allergySymptoms || profile?.allergy_symptoms)[0] : '') || (typeof (profile?.allergySymptoms || profile?.allergy_symptoms) === 'string' ? (profile.allergySymptoms || profile?.allergy_symptoms) : '') || '';
  const allergySeverity = profile?.allergySeverity || profile?.allergy_severity || 'mild';
  const specialPeriod = profile?.specialPeriod || profile?.special_period || '';

  // Mapped labels
  const genderLabels = { male: t('male'), female: t('female'), unknown: t('genderPrivate') };
  const sizeLabels = { mini: t('sizeMini'), small: t('sizeSmall'), medium: t('sizeMedium'), large: t('sizeLarge'), giant: t('sizeGiant') };
  const activityLabels = { low: t('activityLowFull'), medium: t('activityMediumFull'), high: t('activityHighFull'), working: t('activityWorkingFull') };
  const envLabels = { indoor: t('environmentIndoor'), outdoor: t('environmentOutdoor'), mixed: t('environmentMixed') };
  const goalLabels = {
    maintenance: t('goalMaintenance'), weight_loss: t('goalWeightLoss'), muscle_gain: t('goalMuscleGain'),
    post_surgery_recovery: t('goalPostSurgery'), coat_care: t('goalCoatCare'), gastrointestinal_care: t('goalGastrointestinal')
  };

  const healthIssues = {
    obesity: t('healthObesity'), cardiac: t('healthCardiac'), kidney: t('healthKidney'), liver: t('healthLiver'),
    gastrointestinal: t('healthGastrointestinal'), urinary: t('healthUrinary'), dermatological: t('healthDermatological'),
    joint: t('healthJoint'), gallbladder: t('healthGallbladder'), pancreatitis: t('healthPancreatitis'), diabetes: t('healthDiabetes'),
    thyroid: t('healthThyroid'), oral: t('healthOral'), dental: t('healthDental'), immunity: t('healthImmunity')
  };

  const severityLabels = {
    mild: t('severityMild'), moderate: t('severityModerate'), severe: t('severitySevere')
  };

  const periodLabels = {
    pregnancy: t('statusPregnancy'), lactation: t('statusLactation'), post_op_rest: t('statusPostOp'), illness_recovery: t('statusIllnessRecovery')
  };

  // 1. Dynamic Energy & Feed Intake calculation incorporating Activity, Environment, and Goals
  const calcIntake = () => {
    let dailyGrams = Math.round(weight * 40);
    if (age < 1) dailyGrams = Math.round(weight * 60);
    else if (age >= 8) dailyGrams = Math.round(weight * 30);
    
    // Adjust by activity level
    if (activityLevel === 'working') dailyGrams = Math.round(dailyGrams * 1.4);
    else if (activityLevel === 'high') dailyGrams = Math.round(dailyGrams * 1.2);
    else if (activityLevel === 'low') dailyGrams = Math.round(dailyGrams * 0.85);

    // Adjust by feeding environment (outdoor pets require more energy in winter)
    if (environment === 'outdoor') dailyGrams = Math.round(dailyGrams * 1.1);

    // Adjust by feeding goal
    if (feedingGoal === 'weight_loss') dailyGrams = Math.round(dailyGrams * 0.8);
    else if (feedingGoal === 'muscle_gain') dailyGrams = Math.round(dailyGrams * 1.15);

    const meals = age < 1 ? 3 : 2;
    return {
      daily: dailyGrams,
      meals: meals,
      perMeal: Math.round(dailyGrams / meals)
    };
  };

  const intake = calcIntake();

  // 2. Nutrition Needs Rules
  const getNutritionNeeds = () => {
    let needs = ['needBalancedProtein', 'needQualityFat', 'needVegetableFiber'];
    if (age < 1) {
      needs = ['needGrowthProtein', 'needDha', 'needCalcium', 'needImmunity'];
    } else if (age >= 8) {
      needs = ['needDigestibleLowFat', 'needJoint', 'needHeart', 'needVision'];
    }
    
    if (activityLevel === 'working' || activityLevel === 'high') {
      needs.push('needHighEnergy');
    }
    if (bodySize === 'large' || bodySize === 'giant') {
      needs.push('needLargeBreedBones');
    }
    if (feedingGoal === 'coat_care') {
      needs.push('needOmegaBiotin');
    } else if (feedingGoal === 'gastrointestinal_care') {
      needs.push('needPrebiotics');
    }
    return needs;
  };

  const needs = getNutritionNeeds();

  // --- Expected puppy growth curve standard weight estimator ---
  const getExpectedWeightForAge = (adultWeight, ageMonths) => {
    if (ageMonths >= 12) return adultWeight;
    let factor = 1.0;
    if (ageMonths <= 1) {
      factor = 0.1;
    } else if (ageMonths <= 2) {
      factor = 0.1 + (ageMonths - 1) * 0.1;
    } else if (ageMonths <= 3) {
      factor = 0.2 + (ageMonths - 2) * 0.1;
    } else if (ageMonths <= 4) {
      factor = 0.3 + (ageMonths - 3) * 0.15;
    } else if (ageMonths <= 6) {
      factor = 0.45 + (ageMonths - 4) * 0.1;
    } else if (ageMonths <= 8) {
      factor = 0.65 + (ageMonths - 6) * 0.075;
    } else {
      factor = 0.8 + (ageMonths - 8) * 0.05;
    }
    return parseFloat((adultWeight * factor).toFixed(1));
  };

  // 3. BCS data mapping with Puppy Growth dynamic standard weights
  const getBCSDetails = () => {
    const adultWeightRef = breed?.weight_avg || 15;
    const standardWeightRef = getExpectedWeightForAge(adultWeightRef, ageMonths);
    const ratio = weight / standardWeightRef;

    let calculatedBcs = 5;
    if (ratio <= 0.65) calculatedBcs = 1;
    else if (ratio <= 0.75) calculatedBcs = 2;
    else if (ratio <= 0.85) calculatedBcs = 3;
    else if (ratio <= 0.95) calculatedBcs = 4;
    else if (ratio <= 1.05) calculatedBcs = 5;
    else if (ratio <= 1.15) calculatedBcs = 6;
    else if (ratio <= 1.25) calculatedBcs = 7;
    else if (ratio <= 1.40) calculatedBcs = 8;
    else calculatedBcs = 9;

    // Prioritize the saved BCS from profile
    const activeBcs = profile?.bcs || calculatedBcs;

    const bcsColors = {
      1: 'bcs-color-1-3', 2: 'bcs-color-1-3', 3: 'bcs-color-1-3',
      4: 'bcs-color-4', 5: 'bcs-color-5', 6: 'bcs-color-6',
      7: 'bcs-color-7-9', 8: 'bcs-color-7-9', 9: 'bcs-color-7-9'
    };

    return {
      bcs: activeBcs,
      label: t(`bcsLabel${activeBcs || calculatedBcs}`),
      colorClass: bcsColors[activeBcs] || bcsColors[calculatedBcs],
      desc: t(`bcsDesc${activeBcs || calculatedBcs}`),
      standardWeight: standardWeightRef,
      adultWeight: adultWeightRef
    };
  };

  const bcsDetails = getBCSDetails();

  const handleSaveHealth = () => {
    onSaveHealthHistory({
      ...profile,
      allergies: allergies.trim(),
      diseases: diseases.trim()
    });
    setIsEditingHealth(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const triggerTailoredRecipes = () => {
    if (onShowAnalysis) {
      onShowAnalysis(profile);
    } else {
      // Determine category to filter recipes
      let ageKey = 'adult';
      let label = t('categoryAdultGeneral');
      let query = { custom_category: 'adult' };

      if (age < 1) {
        ageKey = 'puppy';
        label = t('categoryPuppyGeneral');
        query = { custom_category: 'puppy' };
      } else if (age >= 8) {
        ageKey = 'senior';
        label = t('categorySeniorGeneral');
        query = { custom_category: 'senior' };
      }

      // Weight loss overrides
      if (feedingGoal === 'weight_loss') {
        ageKey = 'weight';
        label = t('goalWeightLoss');
        query = { custom_category: 'weight' };
      }

      onSelectCategory({
        id: ageKey,
        label: label,
        query: query
      });
    }
  };

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 100 }}>
      <TopBar title={t('petProfileTitle')} showBack={false} />

      <div style={{ padding: '0 20px' }}>
        
        {/* Profile Card */}
        <div className="card glass" style={styles.profileCard}>
          <div style={styles.avatarRow}>
            <img
              src={avatar}
              alt=""
              style={styles.avatar}
              onError={(event) => handlePetAvatarError(event, profile || {}, 'pet-detail')}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.dogName}>{name}</span>
                <span style={styles.genderTag}>{genderLabels[sex]}</span>
                <span style={{ ...styles.genderTag, background: neutered ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: neutered ? '#34d399' : '#f87171' }}>
                  {neutered ? t('statusNeutered') : t('statusNotNeutered')}
                </span>
              </div>
              <div style={styles.dogMeta}>
                {tData(breedName, lang)} · {t('ageSummary', { age, months: ageMonths })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>
                {sizeLabels[bodySize]} · {envLabels[environment]}
              </div>
            </div>
            <button onClick={onEdit} style={styles.editBtn}>{t('editProfile')}</button>
          </div>
          
          <div style={styles.detailAttributesGrid}>
            <div style={styles.detailAttrItem}>
              <div style={styles.detailAttrLabel}>{t('activityLevelLabel')}</div>
              <div style={styles.detailAttrValue}>{activityLabels[activityLevel]}</div>
            </div>
            <div style={styles.detailAttrItem}>
              <div style={styles.detailAttrLabel}>{t('feedingGoalLabel')}</div>
              <div style={styles.detailAttrValue}>{goalLabels[feedingGoal]}</div>
            </div>
            <div style={styles.detailAttrItem}>
              <div style={styles.detailAttrLabel}>{t('targetWeight')}</div>
              <div style={styles.detailAttrValue}>{targetWeight} kg</div>
            </div>
          </div>

          {breed?.breed_desc && (
            <div style={styles.breedDesc}>
              {tBreedDesc(breed.name, breed.breed_desc, lang)}
            </div>
          )}
        </div>

        {/* BCS Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⚖️</span>
            <span style={styles.sectionTitle}>{t('bcsSectionTitle')}</span>
          </div>
          <div className="card glass" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 600 }}>{t('currentWeightValue', { weight })}</div>
              <span className={`bcs-scale-label ${bcsDetails.colorClass}`}>
                {t('bcsScoreValue', { score: bcsDetails.bcs, label: bcsDetails.label })}
              </span>
            </div>
            <div className="bcs-scale-bar-bg" style={{ marginBottom: 12 }}>
              <div 
                className={`bcs-scale-bar-fill ${bcsDetails.colorClass}`} 
                style={{ 
                  width: `${(bcsDetails.bcs / 9) * 100}%`,
                  background: bcsDetails.bcs <= 3 ? '#60a5fa' : bcsDetails.bcs === 4 ? '#22d3ee' : bcsDetails.bcs === 5 ? '#34d399' : bcsDetails.bcs === 6 ? '#fbbf24' : '#f87171'
                }} 
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {bcsDetails.desc}
              {breed?.weight_avg && (
                <div style={{ marginTop: 6, color: 'var(--gray)', fontSize: 11 }}>
                  {t('growthWeightReference', { standard: bcsDetails.standardWeight, adult: bcsDetails.adultWeight })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nutrition Goals */}
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📊</span>
            <span style={styles.sectionTitle}>{t('dailyNutrition')}</span>
          </div>
          <div style={styles.statsGrid}>
            <div className="card glass" style={styles.statCard}>
              <div style={styles.statVal}>{intake.daily}g</div>
              <div style={styles.statLabel}>{t('dailyTotalLabel')}</div>
            </div>
            <div className="card glass" style={styles.statCard}>
              <div style={styles.statVal}>{t('timesValue', { value: intake.meals })}</div>
              <div style={styles.statLabel}>{t('mealsCount')}</div>
            </div>
            <div className="card glass" style={styles.statCard}>
              <div style={styles.statVal}>{intake.perMeal}g</div>
              <div style={styles.statLabel}>{t('perMealLabel')}</div>
            </div>
          </div>
        </div>

        {/* Key Nutrition Needs */}
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🧬</span>
            <span style={styles.sectionTitle}>{t('coreNeeds')}</span>
          </div>
          <div style={styles.tagWrap}>
            {needs.map((key) => (
              <span key={key} style={styles.needTag}>{t(key)}</span>
            ))}
          </div>
        </div>

        {/* Health Notes (Allergies and Diseases) */}
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🩺</span>
            <span style={styles.sectionTitle}>{t('petHealthAllergyProfile')}</span>
            {!isEditingHealth ? (
              <button onClick={() => setIsEditingHealth(true)} style={styles.healthEditLink}>{t('editNotes')}</button>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                <button onClick={handleSaveHealth} style={styles.healthSaveBtn}>{t('saveBtn')}</button>
                <button onClick={() => { setAllergies(profile?.allergies || ''); setDiseases(profile?.diseases || ''); setIsEditingHealth(false); }} style={styles.healthCancelBtn}>{t('cancelBtn')}</button>
              </div>
            )}
          </div>

          <div className="card glass" style={styles.healthCard}>
            
            {/* 1. Health Problems List */}
            <div style={styles.healthRow}>
              <div style={styles.healthLabel}>{t('healthConditionsLabel')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, width: '100%' }}>
                {healthTags.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--gray)' }}>{t('noMajorHealthIssues')}</span>
                ) : (
                  healthTags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: 4 }}>
                      {healthIssues[tag] || tag}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 2. Allergy Info */}
            <div style={{ ...styles.healthRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 12, width: '100%' }}>
              <div style={styles.healthLabel}>{t('allergyProfileLabel')}</div>
              <div style={{ fontSize: 12, color: 'white', marginTop: 4, lineHeight: 1.6, width: '100%' }}>
                <div><strong>{t('allergenField')}</strong>{allergensText || t('noAllergenRecord')}</div>
                {allergensText && (
                  <>
                    <div style={{ marginTop: 2 }}>
                      <strong>{t('allergySymptomsField')}</strong>
                      {allergySymptomsText || t('noObviousSymptoms')}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <strong>{t('allergySeverityField')}</strong>
                      <span style={{ color: allergySeverity === 'severe' ? '#f87171' : allergySeverity === 'moderate' ? '#fbbf24' : '#60a5fa', fontWeight: '700', marginLeft: 4 }}>
                        {severityLabels[allergySeverity] || allergySeverity}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Special Period */}
            {specialPeriod && (
              <div style={{ ...styles.healthRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 12, width: '100%' }}>
                <div style={styles.healthLabel}>{t('currentSpecialPeriod')}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, background: 'rgba(0,230,255,0.1)', color: 'var(--primary)', border: '1px solid rgba(0,230,255,0.2)', padding: '3px 10px', borderRadius: 12, fontWeight: '700' }}>
                    {periodLabels[specialPeriod] || specialPeriod}
                  </span>
                </div>
              </div>
            )}

            {/* 4. Text Notes (Allergies and Diseases details) */}
            <div style={{ ...styles.healthRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 12, width: '100%' }}>
              <div style={styles.healthLabel}>{t('detailedHistoryNotes')}</div>
              {isEditingHealth ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{t('allergyDetails')}</div>
                    <textarea
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                      placeholder={t('allergyPlaceholder')}
                      style={styles.healthTextarea}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{t('diseaseDetails')}</div>
                    <textarea
                      value={diseases}
                      onChange={e => setDiseases(e.target.value)}
                      placeholder={t('diseasePlaceholder')}
                      style={styles.healthTextarea}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, lineHeight: 1.4, width: '100%' }}>
                  {profile?.allergies && <div style={{ marginBottom: 4 }}>• <strong>{t('allergyNote')}</strong>{profile.allergies}</div>}
                  {profile?.diseases && <div>• <strong>{t('diseaseNote')}</strong>{profile.diseases}</div>}
                  {!profile?.allergies && !profile?.diseases && <span>{t('noExtraHealthNotes')}</span>}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <button onClick={triggerTailoredRecipes} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>🍽️</span> {t('tailoredRecipes')}
          </button>
          {saveSuccess && (
            <div style={styles.successToast}>
              ✓ {t('healthSaved')}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  profileCard: {
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(20,27,45,0.8), rgba(9,13,20,0.9))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    marginBottom: '24px',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(0,230,255,0.2)',
  },
  avatarPlaceholder: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  dogName: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ffffff',
  },
  genderTag: {
    fontSize: '11px',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 8px',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontWeight: '700'
  },
  dogMeta: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  editBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '6px 14px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  detailAttributesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  detailAttrItem: {
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
    padding: '6px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.04)'
  },
  detailAttrLabel: {
    fontSize: '9px',
    color: 'var(--gray)',
    fontWeight: '700',
    marginBottom: '2px'
  },
  detailAttrValue: {
    fontSize: '11px',
    color: 'white',
    fontWeight: '700'
  },
  breedDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '12px',
    lineHeight: '1.5',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '6px',
  },
  sectionIcon: {
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#00e6ff',
    letterSpacing: '0.5px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
  },
  statCard: {
    padding: '12px 6px',
    textAlign: 'center',
    background: 'rgba(20,27,45,0.5)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '10px',
  },
  statVal: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--primary)',
  },
  statLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  tagWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  needTag: {
    background: 'rgba(157,0,255,0.12)',
    border: '1px solid rgba(157,0,255,0.25)',
    color: 'var(--secondary)',
    borderRadius: '16px',
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: '700',
  },
  healthEditLink: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  healthSaveBtn: {
    background: 'linear-gradient(90deg, #00e6ff, #00a8ff)',
    border: 'none',
    color: '#090d14',
    fontSize: '11px',
    fontWeight: '800',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  healthCancelBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '6px',
    padding: '3px 10px',
    cursor: 'pointer',
  },
  healthCard: {
    padding: '14px 16px',
    background: 'rgba(20,27,45,0.5)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
  },
  healthRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
  },
  healthLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#f8fafc',
  },
  healthValue: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
    textAlign: 'left',
  },
  healthTextarea: {
    width: '100%',
    height: '54px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(0,230,255,0.3)',
    borderRadius: '6px',
    color: 'white',
    padding: '8px',
    fontSize: '12px',
    outline: 'none',
    resize: 'none',
    lineHeight: '1.4',
  },
  successToast: {
    textAlign: 'center',
    color: '#10b981',
    fontSize: '11px',
    fontWeight: '700',
    marginTop: '4px',
  }
};
