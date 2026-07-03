{/* Pet Chef Ver B1.00 — 2026-06-22 */}
// App.jsx — Heybo Lux Feeding OS v2.0 with i18n
import React, { useEffect, useRef, useState } from 'react';
import { useDogProfile } from './hooks/useDogProfile';
import { LanguageProvider, useLanguage, LANGS } from './i18n/LanguageContext';
import { useTranslation } from './i18n/translations';
import { api } from './api/index';
import { HeyboTuya } from './native/heyboTuya';

import DogSetup from './components/DogSetup';
import PetManagementScreen from './components/PetManagementScreen';
import AIInputScreen from './components/AIInputScreen';
import AIAnalysisScreen from './components/AIAnalysisScreen';
import RecipeList from './components/RecipeList';
import RecipeMake from './components/RecipeMake';
import CookingScreen from './components/CookingScreen';
import TuyaDeviceFlow from './components/TuyaDeviceFlow';
import BottomTabBar from './components/BottomTabBar';
import RecipeCategoryCatalog from './components/RecipeCategoryCatalog';
import PetProfileDetails from './components/PetProfileDetails';

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

// ——— Native Tuya SDK test panel ———
function TuyaSdkPanel() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('检测中...');
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    try {
      const nextStatus = await HeyboTuya.status();
      setStatus(nextStatus);
      if (!nextStatus.nativeAvailable) {
        setMessage('Web 预览模式，Tuya SDK 仅在手机 App 壳内可用');
      } else if (!nextStatus.configured) {
        setMessage('已接入原生 SDK，等待填写本地 AppSecret');
      } else if (nextStatus.initialized) {
        setMessage('Tuya SDK 已初始化');
      } else {
        setMessage('已配置密钥，可以初始化 SDK');
      }
    } catch (error) {
      setMessage(error?.message || 'Tuya SDK 状态检测失败');
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleInit = async () => {
    setLoading(true);
    try {
      await HeyboTuya.init();
      await refreshStatus();
    } catch (error) {
      setMessage(error?.message || 'Tuya SDK 初始化失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tuya-sdk-panel">
      <div>
        <div className="tuya-sdk-title">Tuya SDK</div>
        <div className="tuya-sdk-status">{message}</div>
        {status?.appKey && <div className="tuya-sdk-key">AppKey: {status.appKey}</div>}
      </div>
      <button
        className="tuya-sdk-button"
        onClick={handleInit}
        disabled={loading || !status?.nativeAvailable || status?.initialized}
      >
        {status?.initialized ? '已启动' : loading ? '启动中' : '初始化'}
      </button>
    </div>
  );
}

// ——— HomeScreen ———
function HomeScreen({ onDogEntry, onAIEntry, onDeviceEntry }) {
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
        <button onClick={onDeviceEntry} className="home-action-button home-action-device">
          <div className="home-action-icon">⚙</div>
          <div>
            <div className="home-action-title" style={{ color: '#7CFFB2' }}>{t('deviceControl')}</div>
            <div className="home-action-desc">{t('deviceControlDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#7CFFB2', fontSize: 20 }}>→</div>
        </button>
      </div>
    </div>
  );
}

// ——— Main App Router ———
function AppInner() {
  const { profiles, profile, setActiveId, addProfile, updateProfile, deleteProfile, hasProfile } = useDogProfile();
  const { lang } = useLanguage();
  const [screen, setScreen] = useState('home');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCookedBefore, setHasCookedBefore] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [cookingData, setCookingData] = useState(null);
  const [entrySource, setEntrySource] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const swipeStartRef = useRef(null);

  // Derived active tab based on current screen
  const activeTab = (() => {
    switch (screen) {
      case 'home':
        return 'home';
      case 'recipe_catalog':
      case 'recipe_list':
      case 'recipe_make':
        return 'recipes';
      case 'pet_management':
      case 'dog_setup':
      case 'pet_details':
        return 'pet';
      case 'cooking':
      case 'device_flow':
        return 'cook';
      case 'mall_placeholder':
        return 'mall';
      default:
        return 'home';
    }
  })();

  // 挂载时从 localStorage 恢复状态
  useEffect(() => {
    const onboardingDone = localStorage.getItem('petchef_onboarding_completed') === 'true';
    const hasCooked = localStorage.getItem('petchef_has_cooked') === 'true';
    setHasCompletedOnboarding(onboardingDone);
    setHasCookedBefore(hasCooked);
    if (onboardingDone) {
      setScreen('home');
    }
  }, []);

  // 标记引导完成
  const markOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('petchef_onboarding_completed', 'true');
  };

  // 标记已烹饪
  const markHasCooked = () => {
    setHasCookedBefore(true);
    localStorage.setItem('petchef_has_cooked', 'true');
  };

  // Tab 切换处理
  const handleTabChange = (tabKey) => {
    switch (tabKey) {
      case 'home':
        setScreen('home');
        break;
      case 'recipes':
        setSelectedCategory(null);
        setEntrySource('catalog');
        setScreen('recipe_catalog');
        break;
      case 'pet':
        setScreen('pet_management');
        break;
      case 'cook':
        if (cookingData) {
          setScreen('cooking');
        } else {
          setScreen('device_flow');
        }
        break;
      case 'mall':
        setScreen('mall_placeholder');
        break;
      default:
        setScreen('home');
    }
  };

  const goHome = () => { setScreen('home'); };
  const handleDogEntry = () => setScreen('pet_management');
  
  const handleAddPet = () => {
    setEditingPet(null);
    setScreen('dog_setup');
  };

  const handleEditPet = (pet) => {
    setEditingPet(pet);
    setScreen('dog_setup');
  };

  const handleSelectPet = async (pet) => {
    setActiveId(pet.id);
    setEntrySource('dog');
    try {
      const result = await api.aiAnalysis({ breedId: pet.breedId, breedName: pet.breedName, age: pet.age, weight: pet.weight, lang });
      if (result.success) {
        setAiProfile({
          id: pet.id,
          breedId: pet.breedId,
          breedName: pet.breedName,
          age: pet.age,
          weight: pet.weight,
          breed: pet.breed,
          goals: pet.feedingGoal ? [pet.feedingGoal] : [],
          analysis: result.analysis
        });
        setScreen('ai_analysis');
        return;
      }
    } catch (e) {
      console.error('AI analysis request failed for pet:', e);
    }
    setScreen('pet_management');
  };

  const handleProfileSave = (p) => {
    if (editingPet && editingPet.id) {
      updateProfile(editingPet.id, p);
    } else {
      addProfile(p);
    }
  };

  const handleSelectCategory = (cat, p) => {
    if (cat.query?.ai_shortcut) { handleAIShortcut(p); return; }
    setSelectedCategory(cat);
    if (p && p.id) setActiveId(p.id);
    if (!entrySource) setEntrySource('dog');
    setScreen('recipe_list');
  };

  const handleAIEntry = () => setScreen('ai_input');
  const handleDeviceEntry = () => setScreen('device_flow');

  const handleAIShortcut = async (p) => {
    if (p && p.id) setActiveId(p.id);
    setEntrySource('ai');
    try {
      const result = await api.aiAnalysis({ breedId: p.breedId, breedName: p.breedName, age: p.age, weight: p.weight, lang });
      if (result.success) {
        setAiProfile({
          breedId: p.breedId,
          breedName: p.breedName,
          age: p.age,
          weight: p.weight,
          breed: p.breed,
          goals: p.feedingGoal ? [p.feedingGoal] : [],
          analysis: result.analysis
        });
        setScreen('ai_analysis'); return;
      }
    } catch (e) { console.error('AI shortcut failed:', e); }
    setScreen('ai_input');
  };

  const handleAIAnalyzed = (result) => {
    setAiProfile(result);
    setEntrySource('ai'); setScreen('ai_analysis');
  };

  const handleShowAnalysis = async (p) => {
    let savedPet = p;
    if (editingPet && editingPet.id) {
      updateProfile(editingPet.id, p);
      savedPet = { ...editingPet, ...p };
    } else {
      savedPet = addProfile(p);
    }
    setActiveId(savedPet.id);
    setEntrySource('dog');
    try {
      const result = await api.aiAnalysis({ breedId: savedPet.breedId, breedName: savedPet.breedName, age: savedPet.age, weight: savedPet.weight, lang });
      if (result.success) {
        setAiProfile({
          id: savedPet.id,
          breedId: savedPet.breedId,
          breedName: savedPet.breedName,
          age: savedPet.age,
          weight: savedPet.weight,
          breed: savedPet.breed,
          goals: savedPet.feedingGoal ? [savedPet.feedingGoal] : [],
          analysis: result.analysis
        });
        setScreen('ai_analysis');
        return;
      }
    } catch (e) {
      console.error('AI analysis request failed on setup completion:', e);
    }
    setScreen('pet_management');
  };

  const handleSelectRecipe = (recipe) => { setSelectedRecipe(recipe); setScreen('recipe_make'); };
  const handleStartCooking = (data) => {
    setCookingData(data);
    setScreen('cooking');
    // 首次烹饪时标记引导完成和已烹饪
    if (!hasCookedBefore) {
      markHasCooked();
      markOnboardingComplete();
    }
  };
  // 处理保存过敏史 / 疾病史到 profile
  const handleSaveHealthHistory = (updatedProfile) => {
    if (updatedProfile.id) {
      updateProfile(updatedProfile.id, updatedProfile);
    }
  };

  // 从食谱分类目录中选择一个分类 → 跳转到食谱列表
  const handleCatalogSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setEntrySource('catalog');
    setScreen('recipe_list');
  };

  const goBack = () => {
    if (screen === 'home') return false;
    if (screen === 'dog_setup') setScreen('pet_management');
    if (screen === 'pet_management' || screen === 'ai_input' || screen === 'device_flow' || screen === 'mall_placeholder') setScreen('home');
    if (screen === 'ai_analysis') setScreen(entrySource === 'ai' ? 'ai_input' : 'pet_management');
    if (screen === 'recipe_catalog') setScreen('home');
    if (screen === 'recipe_list') {
      if (entrySource === 'catalog') setScreen('recipe_catalog');
      else if (entrySource === 'ai') setScreen('ai_analysis');
      else setScreen('pet_management');
    }
    if (screen === 'recipe_make') setScreen('recipe_list');
    if (screen === 'cooking') setScreen('recipe_make');
    if (screen === 'pet_details') setScreen('pet_management');
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
    <div id="app-container" className={hasCompletedOnboarding ? 'app-with-tabs' : ''} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {screen === 'home' && (
        <HomeScreen
          onDogEntry={handleDogEntry}
          onAIEntry={handleAIEntry}
          onDeviceEntry={handleDeviceEntry}
        />
      )}
      {screen === 'recipe_catalog' && (
        <RecipeCategoryCatalog
          onBack={goBack}
          onSelectCategory={handleCatalogSelectCategory}
          lang={lang}
        />
      )}
      {screen === 'pet_management' && (
        <PetManagementScreen
          profiles={profiles}
          onAddPet={handleAddPet}
          onEditPet={handleEditPet}
          onSelectPet={handleSelectPet}
          lang={lang}
        />
      )}
      {screen === 'pet_details' && (
        <PetProfileDetails
          profile={profile}
          onEdit={() => setScreen('dog_setup')}
          onSelectCategory={(cat) => { setEntrySource('catalog'); handleSelectCategory(cat, profile); }}
          onSaveHealthHistory={handleSaveHealthHistory}
          lang={lang}
        />
      )}
      {screen === 'dog_setup' && <DogSetup onBack={goHome} profile={editingPet} onSave={handleProfileSave} onSelectCategory={handleSelectCategory} onShowAnalysis={handleShowAnalysis} lang={lang} />}
      {screen === 'ai_input' && <AIInputScreen onBack={goHome} onAnalyze={handleAIAnalyzed} lang={lang} />}
      {screen === 'ai_analysis' && <AIAnalysisScreen onBack={goBack} profile={aiProfile} onSelectCategory={(cat, p) => { setEntrySource('ai'); handleSelectCategory(cat, p); }} onSelectRecipe={handleSelectRecipe} lang={lang} />}
      {screen === 'recipe_list' && <RecipeList onBack={goBack} category={selectedCategory} profile={profile} onSelectRecipe={handleSelectRecipe} lang={lang} />}
      {screen === 'recipe_make' && <RecipeMake onBack={goBack} recipe={selectedRecipe} profile={profile} onStartCooking={handleStartCooking} lang={lang} />}
      {screen === 'cooking' && <CookingScreen onBack={goHome} cookingData={cookingData} lang={lang} />}
      {screen === 'device_flow' && <TuyaDeviceFlow onBack={goHome} />}
      {screen === 'mall_placeholder' && (
        <div className="animate-fade flex-col" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: '40px 20px', color: 'var(--gray)', textAlign: 'center', background: 'var(--dark)' }}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</span>
          <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0' }}>宠物商城</h2>
          <p style={{ fontSize: '13px', color: 'var(--gray)', margin: 0 }}>全新宠物鲜食与功能用品商城筹备中，敬请期待！</p>
          <button className="btn btn-secondary" style={{ marginTop: '24px', padding: '8px 24px' }} onClick={goHome}>返回首页</button>
        </div>
      )}

      {/* 引导完成后显示底部标签栏 */}
      {hasCompletedOnboarding && (
        <BottomTabBar activeTab={activeTab} onSelect={handleTabChange} />
      )}
    </div>
  );
}

export default function App() {
  return <LanguageProvider><AppInner /></LanguageProvider>;
}
