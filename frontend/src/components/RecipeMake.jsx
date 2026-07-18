// RecipeMake.jsx — Recipe prep screen (i18n)
import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';

const CAT_COLORS = { protein: '#FF4D6D', carb: '#FFB800', veg: '#00FFA3', addition: '#9D00FF' };

function getIngCat(name) {
  if (['鸡', '牛', '鱼', '鸭', '羊', '鹿', '火鸡', '蛋'].some(m => name.includes(m))) return 'protein';
  if (['红薯', '南瓜', '燕麦', '糙米', '米饭', '土豆', '藜麦', '山药'].some(c => name.includes(c))) return 'carb';
  if (['油', '粉', '素', '胺', '黄'].some(s => name.includes(s))) return 'addition';
  return 'veg';
}

export default function RecipeMake({ onBack, recipe, profile, onStartCooking, lang }) {
  const t = useTranslation(lang);
  const CAT_LABELS = { protein: t('protein'), carb: t('carb'), veg: t('veg'), addition: t('addition') };
  const [cookData, setCookData] = useState(null);
  const [packCount, setPackCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recipe || !profile) return;
    api.cookParams({ recipeId: recipe.id, breedId: profile.breedId, weight: profile.weight, age: profile.age }).then(d => {
      if (d.success) setCookData(d);
      setLoading(false);
    });
  }, [recipe, profile]);

  if (loading) {
    return (
      <div className="animate-fade flex-col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚖️</div>
          <div style={{ color: 'var(--gray)' }}>{t('calcIngredients')}</div>
        </div>
      </div>
    );
  }
  if (!cookData) return null;

  const { intake, ingredientList, cookParams } = cookData;
  const displayGrams = packCount * 200;
  const packOptions = [1, 2, 3];

  const displayIngredients = ingredientList.map(ing => ({
    ...ing, grams: ing.pct ? Math.round((ing.pct / 100) * displayGrams) : null,
  }));

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 100 }}>
      <TopBar onBack={onBack} title={t('recipeMake')} />
      <div style={{ padding: '0 24px 16px' }}>
        <div className="card glass" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
            {t('makingFor')} <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{profile.weight}kg</span> · <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{profile.age}{t('yr')}</span> <span style={{ color: 'white', fontWeight: 700 }}>{tData(profile.breedName, lang)}</span> {t('making')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>「{tData(recipe.name, lang)}」</div>
        </div>
      </div>
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[
            { key: 'daily', label: t('dailyTotalG', { n: intake.daily_grams }), sub: t('splitMeals', { n: intake.meals_per_day }) },
            { key: 'per_meal', label: t('perMealG', { n: intake.per_meal_grams }), sub: t('mealsDay', { n: intake.meals_per_day }) },
          ].map(opt => (
            <div key={opt.key}
              style={{ flex: 1, padding: '12px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{opt.sub}</div>
            </div>
          ))}
        </div>
        <div
          style={{ width: '100%', padding: '12px 14px', border: '1px solid #FFB800', borderRadius: 'var(--radius-sm)', background: 'rgba(255,184,0,0.08)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#FFB800' }}>{t('customAmount')}</span>
            <span style={{ fontSize: 12, color: 'var(--gray)' }}>{t('freshPackDesc')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {packOptions.map(count => {
              const active = packCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPackCount(count)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: `1px solid ${active ? '#FFB800' : 'rgba(255,184,0,0.28)'}`,
                    background: active ? 'rgba(255,184,0,0.18)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#FFB800' : 'var(--text-main)',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <div>{count}{t('packUnit')}</div>
                  <div style={{ fontSize: 11, color: active ? '#FFD56A' : 'var(--gray)', marginTop: 2 }}>{count * 200}g</div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '8px 12px', background: 'rgba(0,230,255,0.05)', border: '1px solid rgba(0,230,255,0.15)', borderRadius: 10, fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          💧 {t('addWater')} <strong>{Math.round(displayGrams * 0.15)}g</strong> {t('clearWater')}
        </div>
      </div>
      <div style={{ padding: '0 24px', flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 12 }}>
          {t('ingredientList')} · {displayIngredients.length} {t('types')} · {t('thisPrep')} <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{displayGrams}g</span>
        </div>
        {displayIngredients.map(ing => {
          const cat = getIngCat(ing.name);
          const color = CAT_COLORS[cat];
          return (
            <div key={ing.name} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div style={{ width: 6, height: 32, borderRadius: 3, background: color, marginRight: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tData(ing.name, lang)}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{CAT_LABELS[cat]}</div>
              </div>
              <div style={{ textAlign: 'center', marginRight: 16, minWidth: 36 }}>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{ing.pct ?? '—'}%</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 50 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{ing.grams ?? '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--gray)' }}>{t('gram')}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="glass" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, padding: '16px 24px', display: 'flex', gap: 12, zIndex: 100, background: 'rgba(10,13,20,0.95)', borderTop: '1px solid var(--border)' }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack}>{t('back')}</button>
        <button className="btn-primary" style={{ flex: 2, boxShadow: '0 0 24px rgba(0,230,255,0.35)' }}
          onClick={() => onStartCooking({ recipe, profile, intake, cookParams, displayGrams, displayIngredients, packCount, packGrams: 200 })}>
          {t('startCook')}
        </button>
      </div>
    </div>
  );
}
