// App.jsx — Heybo Lux Feeding OS v2.0 with i18n
import React, { useRef, useState } from 'react';
import { useDogProfile } from './hooks/useDogProfile';
import { LanguageProvider, useLanguage, LANGS } from './i18n/LanguageContext';
import { useTranslation } from './i18n/translations';
import { api } from './api/index';

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
    <div style={{ position: 'absolute', top: 'var(--control-top)', right: 20, zIndex: 50 }}>
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
    <div className="animate-fade home-screen">
      <LangSelector />
      <div className="home-hero">
        <div className="home-logo-wrap">
          <img src="/logo.png" onError={e => { e.target.src = '/logo.jpg'; e.target.onerror = null; }}
            alt="Heybo Lux" className="home-logo" />
        </div>
        <div className={`home-slogan ${lang === 'zh' || lang === 'ja' || lang === 'ko' ? 'home-slogan-cjk' : ''}`}>
          <span style={{ alignSelf: 'flex-start' }}>{t('slogan1')}</span>
          <span className="home-slogan-line2">{t('slogan2')}</span>
          <span className="home-slogan-subtitle">
            {t('slogan3')}
          </span>
        </div>
      </div>
      <div className="home-machine-section">
        <div className="home-machine-card">
          <img src="/machine.jpg" onError={e => { e.target.src = '/machine.png'; e.target.onerror = null; }} alt="Machine" className="home-machine-img" />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, var(--dark) 0%, transparent 40%)' }} />
        </div>
      </div>
      <div className="home-actions">
        <button onClick={onDogEntry} className="home-action-button home-action-dog">
          <div className="home-action-icon">🐕</div>
          <div>
            <div className="home-action-title" style={{ color: 'var(--primary)' }}>{t('myDog')}</div>
            <div className="home-action-desc">{t('myDogDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 20 }}>→</div>
        </button>
        <button onClick={onAIEntry} className="home-action-button home-action-ai">
          <div className="home-action-icon">🤖</div>
          <div>
            <div className="home-action-title" style={{ color: 'var(--secondary)' }}>{t('aiRecipe')}</div>
            <div className="home-action-desc">{t('aiRecipeDesc')}</div>
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
  const swipeStartRef = useRef(null);

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
      const result = await api.aiAnalysis({ breedId: p.breedId, breedName: p.breedName, age: p.age, weight: p.weight, lang });
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
  const goBack = () => {
    if (screen === 'home') return false;
    if (screen === 'dog_setup' || screen === 'ai_input') setScreen('home');
    if (screen === 'ai_analysis') setScreen(entrySource === 'ai' ? 'ai_input' : 'dog_setup');
    if (screen === 'recipe_list') setScreen(entrySource === 'ai' ? 'ai_analysis' : 'dog_setup');
    if (screen === 'recipe_make') setScreen('recipe_list');
    if (screen === 'cooking') setScreen('recipe_make');
    return true;
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch || touch.clientX > 36) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches?.[0];
    swipeStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (deltaX > 80 && deltaY < 60) {
      goBack();
    }
  };

  return (
    <div id="app-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {screen === 'home' && <HomeScreen onDogEntry={handleDogEntry} onAIEntry={handleAIEntry} />}
      {screen === 'dog_setup' && <DogSetup onBack={goHome} profile={hasProfile ? profile : null} onSave={handleProfileSave} onSelectCategory={handleSelectCategory} lang={lang} />}
      {screen === 'ai_input' && <AIInputScreen onBack={goHome} onAnalyze={handleAIAnalyzed} lang={lang} />}
      {screen === 'ai_analysis' && <AIAnalysisScreen onBack={goBack} profile={aiProfile} onSelectCategory={(cat, p) => { setEntrySource('ai'); handleSelectCategory(cat, p); }} lang={lang} />}
      {screen === 'recipe_list' && <RecipeList onBack={goBack} category={selectedCategory} profile={activeProfile} onSelectRecipe={handleSelectRecipe} lang={lang} />}
      {screen === 'recipe_make' && <RecipeMake onBack={goBack} recipe={selectedRecipe} profile={activeProfile} onStartCooking={handleStartCooking} lang={lang} />}
      {screen === 'cooking' && <CookingScreen onBack={goHome} cookingData={cookingData} lang={lang} />}
    </div>
  );
}

export default function App() {
  return <LanguageProvider><AppInner /></LanguageProvider>;
}
