// App.jsx — Heybo Lux Feeding OS v2.0 with i18n
import React, { useState } from 'react';
import { useDogProfile } from './hooks/useDogProfile';
import { LanguageProvider, useLanguage, LANGS } from './i18n/LanguageContext';
import { useTranslation } from './i18n/translations';

import DogSetup from './components/DogSetup';
import AIInputScreen from './components/AIInputScreen';
import AIAnalysisScreen from './components/AIAnalysisScreen';
import RecipeList from './components/RecipeList';
import RecipeMake from './components/RecipeMake';
import CookingScreen from './components/CookingScreen';

// ——— Language Selector (top-right globe button) ———
function LangSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 50 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '6px 14px', cursor: 'pointer', color: 'white',
        fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{current.flag}</span>
        <span style={{ fontSize: 12 }}>{current.label}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, background: 'rgba(20,23,30,0.98)',
          border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: 150,
        }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: l.code === lang ? 'rgba(0,230,255,0.12)' : 'transparent',
                color: l.code === lang ? 'var(--primary)' : 'white',
                fontSize: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— HomeScreen ———
function HomeScreen({ onDogEntry, onAIEntry }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  return (
    <div className="animate-fade flex-col" style={{ flex: 1, position: 'relative' }}>
      <LangSelector />
      <div style={{ padding: '0px 24px 24px', textAlign: 'center' }}>
        <div style={{ margin: '-12% 0 -12% 0' }}>
          <img src="/logo.png" onError={e => { e.target.src = '/logo.jpg'; e.target.onerror = null; }}
            alt="Heybo Lux" style={{ width: '90%', maxWidth: '380px', display: 'block', margin: '0 auto', transform: 'scale(1.15)' }} />
        </div>
        <div style={{ color: 'var(--primary)', marginTop: '8px', fontWeight: 800, letterSpacing: '2px', lineHeight: 1.4, fontSize: lang === 'zh' || lang === 'ja' || lang === 'ko' ? '32px' : '24px', textShadow: '0 0 16px rgba(0,230,255,0.4)', padding: '0 16px', display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ alignSelf: 'flex-start' }}>{t('slogan1')}</span>
          <span style={{ alignSelf: 'flex-end', marginTop: '8px' }}>{t('slogan2')}</span>
          <span style={{ alignSelf: 'center', color: 'var(--gray)', fontSize: '16px', letterSpacing: '1px', fontWeight: 500, marginTop: '32px', textAlign: 'center' }}>
            {t('slogan3')}
          </span>
        </div>
      </div>
      <div style={{ padding: '16px 24px' }}>
        <div style={{ height: '280px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          <img src="/machine.jpg" onError={e => { e.target.src = '/machine.png'; e.target.onerror = null; }} alt="Machine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, var(--dark) 0%, transparent 40%)' }} />
        </div>
      </div>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button onClick={onDogEntry} style={{ width: '100%', padding: '22px 24px', background: 'linear-gradient(135deg, rgba(0,230,255,0.12), rgba(0,114,255,0.12))', border: '1px solid rgba(0,230,255,0.3)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40 }}>🐕</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)', marginBottom: 4 }}>{t('myDog')}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{t('myDogDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 20 }}>→</div>
        </button>
        <button onClick={onAIEntry} style={{ width: '100%', padding: '22px 24px', background: 'linear-gradient(135deg, rgba(157,0,255,0.12), rgba(0,230,255,0.08))', border: '1px solid rgba(157,0,255,0.3)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--secondary)', marginBottom: 4 }}>{t('aiRecipe')}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{t('aiRecipeDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--secondary)', fontSize: 20 }}>→</div>
        </button>
      </div>
    </div>
  );
}

// ——— Main App Router ———
function AppInner() {
  const { profile, setProfile, hasProfile } = useDogProfile();
  const { lang } = useLanguage();
  const [screen, setScreen] = useState('home');
  const [aiProfile, setAiProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [cookingData, setCookingData] = useState(null);
  const [entrySource, setEntrySource] = useState(null);

  const goHome = () => setScreen('home');
  const handleDogEntry = () => setScreen('dog_setup');
  const handleProfileSave = (p) => { setProfile(p); setActiveProfile(p); };

  const handleSelectCategory = (cat, p) => {
    if (cat.query?.ai_shortcut) { handleAIShortcut(p); return; }
    setSelectedCategory(cat); setActiveProfile(p);
    if (!entrySource) setEntrySource('dog');
    setScreen('recipe_list');
  };

  const handleAIEntry = () => setScreen('ai_input');

  const handleAIShortcut = async (p) => {
    setActiveProfile(p); setEntrySource('ai');
    try {
      const result = await (await import('./api/index')).api.aiAnalysis({ breedId: p.breedId, breedName: p.breedName, age: p.age, weight: p.weight, lang });
      if (result.success) {
        setAiProfile({ breedId: p.breedId, breedName: p.breedName, age: p.age, weight: p.weight, breed: p.breed, analysis: result.analysis });
        setScreen('ai_analysis'); return;
      }
    } catch (e) { console.error('AI shortcut failed:', e); }
    setScreen('ai_input');
  };

  const handleAIAnalyzed = (result) => {
    setAiProfile(result);
    setActiveProfile({ breedId: result.breedId, breedName: result.breedName, age: result.age, weight: result.weight, breed: result.breed });
    setEntrySource('ai'); setScreen('ai_analysis');
  };

  const handleSelectRecipe = (recipe) => { setSelectedRecipe(recipe); setScreen('recipe_make'); };
  const handleStartCooking = (data) => { setCookingData(data); setScreen('cooking'); };

  return (
    <div id="app-container">
      {screen === 'home' && <HomeScreen onDogEntry={handleDogEntry} onAIEntry={handleAIEntry} />}
      {screen === 'dog_setup' && <DogSetup onBack={goHome} profile={hasProfile ? profile : null} onSave={handleProfileSave} onSelectCategory={handleSelectCategory} lang={lang} />}
      {screen === 'ai_input' && <AIInputScreen onBack={goHome} onAnalyze={handleAIAnalyzed} lang={lang} />}
      {screen === 'ai_analysis' && <AIAnalysisScreen onBack={() => setScreen(entrySource === 'ai' ? 'ai_input' : 'dog_setup')} profile={aiProfile} onSelectCategory={(cat, p) => { setEntrySource('ai'); handleSelectCategory(cat, p); }} lang={lang} />}
      {screen === 'recipe_list' && <RecipeList onBack={() => setScreen(entrySource === 'ai' ? 'ai_analysis' : 'dog_setup')} category={selectedCategory} profile={activeProfile} onSelectRecipe={handleSelectRecipe} lang={lang} />}
      {screen === 'recipe_make' && <RecipeMake onBack={() => setScreen('recipe_list')} recipe={selectedRecipe} profile={activeProfile} onStartCooking={handleStartCooking} lang={lang} />}
      {screen === 'cooking' && <CookingScreen onBack={goHome} cookingData={cookingData} lang={lang} />}
    </div>
  );
}

export default function App() {
  return <LanguageProvider><AppInner /></LanguageProvider>;
}
