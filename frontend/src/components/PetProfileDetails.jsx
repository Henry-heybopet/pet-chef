import React, { useState } from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';
import { tData, tBreedDesc } from '../i18n/dataTranslations';

export default function PetProfileDetails({ profile, onEdit, onSelectCategory, onSaveHealthHistory, lang }) {
  const t = useTranslation(lang);
  
  // Local state for inline health history editing
  const [allergies, setAllergies] = useState(profile?.allergies || '');
  const [diseases, setDiseases] = useState(profile?.diseases || '');
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Derive daily nutrition goals based on average calculations
  const weight = profile?.weight || 15;
  const age = profile?.age || 3;
  const breed = profile?.breed;

  // Simple daily intake estimator matching the AI analyzer
  const calcIntake = () => {
    let dailyGrams = Math.round(weight * 40);
    if (age < 1) dailyGrams = Math.round(weight * 60);
    else if (age >= 8) dailyGrams = Math.round(weight * 30);
    
    // Adjust by breed activity
    const activity = breed?.activity || 'medium';
    if (activity === 'high' || activity === 'extremely_high') dailyGrams = Math.round(dailyGrams * 1.2);
    else if (activity === 'low') dailyGrams = Math.round(dailyGrams * 0.85);

    const meals = age < 1 ? 3 : 2;
    return {
      daily: dailyGrams,
      meals: meals,
      perMeal: Math.round(dailyGrams / meals)
    };
  };

  const intake = calcIntake();

  // Derive key nutrition tags
  const getNutritionNeeds = () => {
    let needs = ['均衡蛋白质', '优质脂肪', '丰富蔬菜纤维'];
    if (age < 1) {
      needs = ['高蛋白促进生长', 'DHA脑部发育', '适量钙质骨骼健康', '免疫增强'];
    } else if (age >= 8) {
      needs = ['易消化低脂', '关节保护', '抗氧化护心', '视力支持'];
    }
    const activity = breed?.activity || 'medium';
    if (activity === 'high' || activity === 'extremely_high') {
      needs.push('高能量需求');
    }
    if (weight > 25) {
      needs.push('大型犬关节支持');
    }
    return needs;
  };

  const needs = getNutritionNeeds();

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
    // Determine age-appropriate category to filter
    let ageKey = 'adult';
    let label = '成宠维持型';
    let query = { custom_category: 'adult' };

    if (age < 1) {
      ageKey = 'puppy';
      label = 'B1 幼宠成长型';
      query = { custom_category: 'puppy' };
    } else if (age >= 8) {
      ageKey = 'senior';
      label = '老年支持型';
      query = { custom_category: 'senior' };
    }

    onSelectCategory({
      id: ageKey,
      label: label,
      query: query
    });
  };

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 90 }}>
      <TopBar title={t('petProfileTitle')} showBack={false} />

      <div style={{ padding: '0 20px' }}>
        
        {/* Profile Card */}
        <div className="card glass" style={styles.profileCard}>
          <div style={styles.avatarRow}>
            {breed?.img ? (
              <img src={breed.img} alt="" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>🐕</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={styles.dogName}>{tData(profile?.breedName, lang)}</div>
              <div style={styles.dogMeta}>
                {weight}kg · {age}{t('yr')} · {age < 1 ? t('puppyStage') : (age >= 8 ? t('seniorStage') : t('adultStage'))}
              </div>
            </div>
            <button onClick={onEdit} style={styles.editBtn}>{t('editProfile')}</button>
          </div>
          {breed?.breed_desc && (
            <div style={styles.breedDesc}>
              {tBreedDesc(breed.name, breed.breed_desc, lang)}
            </div>
          )}
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
              <div style={styles.statVal}>{intake.meals}次</div>
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
            {needs.map((n, idx) => (
              <span key={idx} style={styles.needTag}>{n}</span>
            ))}
          </div>
        </div>

        {/* Health Notes (Allergies and Diseases) */}
        <div style={{ marginBottom: 24 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🩺</span>
            <span style={styles.sectionTitle}>{t('healthHistory')}</span>
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
            <div style={styles.healthRow}>
              <div style={styles.healthLabel}>⚠️ {t('allergyHistory')}：</div>
              {isEditingHealth ? (
                <textarea
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                  placeholder={t('allergyPlaceholder')}
                  style={styles.healthTextarea}
                />
              ) : (
                <div style={styles.healthValue}>{profile?.allergies || t('noAllergy')}</div>
              )}
            </div>
            <div style={{ ...styles.healthRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 12 }}>
              <div style={styles.healthLabel}>🏥 {t('diseaseHistory')}：</div>
              {isEditingHealth ? (
                <textarea
                  value={diseases}
                  onChange={e => setDiseases(e.target.value)}
                  placeholder={t('diseasePlaceholder')}
                  style={styles.healthTextarea}
                />
              ) : (
                <div style={styles.healthValue}>{profile?.diseases || t('noDisease')}</div>
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
