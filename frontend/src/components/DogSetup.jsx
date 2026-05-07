// DogSetup.jsx — i18n enabled
import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData, tBreedDesc } from '../i18n/dataTranslations';

export default function DogSetup({ onBack, profile, onSave, onSelectCategory, lang }) {
  const t = useTranslation(lang);
  const RECIPE_CATEGORIES = [
    { key: 'puppy', label: t('catPuppy'), icon: '🐶', desc: t('catPuppyD'), query: { life_stage: '幼犬' } },
    { key: 'senior', label: t('catSenior'), icon: '🦴', desc: t('catSeniorD'), query: { life_stage: '老年犬' } },
    { key: 'chicken', label: t('catChicken'), icon: '🍗', desc: t('catChickenD'), query: { protein: '鸡' } },
    { key: 'beef', label: t('catBeef'), icon: '🥩', desc: t('catBeefD'), query: { protein: '牛肉' } },
    { key: 'fish', label: t('catFish'), icon: '🐟', desc: t('catFishD'), query: { protein: '鱼' } },
    { key: 'other', label: t('catOther'), icon: '🍖', desc: t('catOtherD'), query: { protein_other: true } },
    { key: 'func', label: t('catFunc'), icon: '⭐', desc: t('catFuncD'), query: { functional: '' } },
    { key: 'ai', label: t('catAI'), icon: '🤖', desc: t('catAID'), query: { ai_shortcut: true } },
  ];

  const [breeds, setBreeds] = useState([]);
  const [breedId, setBreedId] = useState(profile?.breedId || '');
  const [customBreed, setCustomBreed] = useState(profile?.customBreed || '');
  const [weight, setWeight] = useState(profile?.weight || 15);
  const [age, setAge] = useState(profile?.age || 3);
  const [showSetup, setShowSetup] = useState(!profile);

  useEffect(() => { api.getBreeds().then(d => { if (d.success) setBreeds(d.breeds); }); }, []);

  const handleBreedChange = (id) => { setBreedId(id); const b = breeds.find(b => b.id === id); if (b && !profile) setWeight(b.weight_avg || 15); };
  const handleSave = () => {
    const breed = breeds.find(b => b.id === breedId);
    onSave({ breedId, breedName: breed?.name || customBreed, customBreed, weight, age, breed });
    setShowSetup(false);
  };

  const selectedBreed = breeds.find(b => b.id === breedId);

  if (showSetup) {
    return (
      <div className="animate-fade flex-col" style={{ flex: 1 }}>
        <TopBar onBack={onBack} title={t('myDog')} />
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: 'var(--gray)', fontSize: 13, letterSpacing: 1 }}>{t('selectBreed')}</label>
            <select value={breedId} onChange={e => handleBreedChange(e.target.value)}
              style={{ width: '100%', marginTop: 10, padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 16, outline: 'none', cursor: 'pointer', appearance: 'none' }}>
              <option value="" disabled style={{ background: '#1a1d26' }}>{t('pleaseSelect')}</option>
              {breeds.filter(b => !b.is_custom).map(b => (
                <option key={b.id} value={b.id} style={{ background: '#1a1d26' }}>{tData(b.name, lang)}</option>
              ))}
              <option value="custom" style={{ background: '#1a1d26' }}>{t('otherCustom')}</option>
            </select>
            {breedId === 'custom' && (
              <input placeholder={t('enterBreed')} value={customBreed} onChange={e => setCustomBreed(e.target.value)}
                style={{ width: '100%', marginTop: 10, padding: '12px 16px', background: 'rgba(0,230,255,0.05)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 15, outline: 'none' }} />
            )}
          </div>
          {selectedBreed && selectedBreed.id !== 'custom' && (
            <div className="card glass" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 12 }}>
              <img src={selectedBreed.img} alt={selectedBreed.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{tData(selectedBreed.name, lang)}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 }}>{tBreedDesc(selectedBreed.name, selectedBreed.breed_desc, lang)}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <div className="card glass" style={{ flex: 1, textAlign: 'center', padding: 20 }}>
              <div style={{ color: 'var(--gray)', fontSize: 12, marginBottom: 12 }}>{t('weightKg')}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button onClick={() => setWeight(Math.max(1, weight - 0.5))} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,230,255,0.15)', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', minWidth: 60, textAlign: 'center' }}>{weight}</span>
                <button onClick={() => setWeight(Math.min(80, weight + 0.5))} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,230,255,0.15)', border: 'none', color: 'var(--primary)', fontSize: 20, cursor: 'pointer' }}>+</button>
              </div>
            </div>
            <div className="card glass" style={{ flex: 1, textAlign: 'center', padding: 20 }}>
              <div style={{ color: 'var(--gray)', fontSize: 12, marginBottom: 12 }}>{t('ageYr')}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button onClick={() => setAge(Math.max(0.1, parseFloat((age - 0.5).toFixed(1))))} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(157,0,255,0.15)', border: 'none', color: 'var(--secondary)', fontSize: 20, cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary)', minWidth: 60, textAlign: 'center' }}>{age}</span>
                <button onClick={() => setAge(Math.min(20, parseFloat((age + 0.5).toFixed(1))))} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(157,0,255,0.15)', border: 'none', color: 'var(--secondary)', fontSize: 20, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          </div>
          <button className="btn-primary" disabled={!breedId || (breedId === 'custom' && !customBreed)} onClick={handleSave}
            style={{ opacity: (!breedId || (breedId === 'custom' && !customBreed)) ? 0.4 : 1 }}>
            {t('confirmView')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <TopBar onBack={onBack} title={t('selectRecipe')} />
      <div style={{ padding: '0 24px 32px' }}>
        <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16 }}>
          {profile?.breed?.img && <img src={profile.breed.img} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{tData(profile?.breedName, lang)}</div>
            <div style={{ color: 'var(--gray)', fontSize: 13 }}>{profile?.weight}kg · {profile?.age}{t('yr')}</div>
          </div>
          <button onClick={() => setShowSetup(true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--gray)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>{t('edit')}</button>
        </div>
        <h3 style={{ marginBottom: 16, fontSize: 15, color: 'var(--gray)' }}>{t('selectType')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {RECIPE_CATEGORIES.map(cat => (
            <div key={cat.key} className="card selectable-card"
              style={{ padding: 18, textAlign: 'center', ...(cat.key === 'ai' ? { background: 'linear-gradient(135deg, rgba(157,0,255,0.12), rgba(0,230,255,0.08))', border: '1px solid rgba(157,0,255,0.3)' } : {}) }}
              onClick={() => onSelectCategory(cat, profile)}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: cat.key === 'ai' ? 'var(--secondary)' : 'var(--text-main)', marginBottom: 4 }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{cat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
