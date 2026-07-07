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
import AIAnalysisScreen from './components/AIAnalysisScreen';
import RecipeList from './components/RecipeList';
import RecipeMake from './components/RecipeMake';
import CookingScreen from './components/CookingScreen';
import TuyaDeviceFlow from './components/TuyaDeviceFlow';
import BottomTabBar from './components/BottomTabBar';
import RecipeCategoryCatalog from './components/RecipeCategoryCatalog';
import PetProfileDetails from './components/PetProfileDetails';
import { dogBreeds } from './data/breeds';

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

function AuthWidget({ user, token, authPrompt, onLogin, onLogout }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authPrompt) setMessage('请先注册/登录');
  }, [authPrompt]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await api.phoneLogin({ phone, password });
      if (!result?.success) throw new Error(result?.error || '注册/登录失败');
      onLogin(result);
      setPassword('');
      setMessage('登录成功');
    } catch (error) {
      setMessage(error?.message || '注册/登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home-auth-widget">
      <div className="home-auth-title">{token ? '已登录' : '注册/登录'}</div>
      {token ? (
        <div className="home-auth-session">
          <span>{user?.primary_phone || user?.display_name || '当前用户'}</span>
          <button type="button" onClick={onLogout}>退出</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="home-auth-form">
          <input
            value={phone}
            onChange={event => setPhone(event.target.value)}
            inputMode="tel"
            placeholder="手机号"
            autoComplete="tel"
          />
          <input
            value={password}
            onChange={event => setPassword(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            type="password"
            placeholder="6位数字密码"
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy}>{busy ? '处理中' : '注册/登录'}</button>
        </form>
      )}
      {message && <div className="home-auth-message">{message}</div>}
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
function HomeScreen({ onDogEntry, onAIEntry, onDeviceEntry, authUser, authToken, authPrompt, onLogin, onLogout }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);

  return (
    <div className="animate-fade home-screen">
      <AuthWidget user={authUser} token={authToken} authPrompt={authPrompt} onLogin={onLogin} onLogout={onLogout} />
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
  const { profiles, profile, setActiveId, addProfile, updateProfile, deleteProfile, replaceProfiles, hasProfile } = useDogProfile();
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
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authPrompt, setAuthPrompt] = useState(0);
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
    const savedToken = localStorage.getItem('petchef_auth_token') || '';
    const savedUser = localStorage.getItem('petchef_auth_user');
    setHasCompletedOnboarding(onboardingDone);
    setHasCookedBefore(hasCooked);
    setAuthToken(savedToken);
    if (savedUser) {
      try { setAuthUser(JSON.parse(savedUser)); } catch {}
    }
    if (onboardingDone) {
      setScreen('home');
    }
  }, []);

  const handleAuthLogin = (result) => {
    setAuthToken(result.token);
    setAuthUser(result.user);
    localStorage.setItem('petchef_auth_token', result.token);
    localStorage.setItem('petchef_auth_user', JSON.stringify(result.user || null));
  };

  const handleAuthLogout = () => {
    setAuthToken('');
    setAuthUser(null);
    replaceProfiles([]);
    localStorage.removeItem('petchef_auth_token');
    localStorage.removeItem('petchef_auth_user');
    setScreen('home');
  };

  const requireAuth = (next) => {
    if (authToken) {
      next();
      return;
    }
    setAuthPrompt(value => value + 1);
    setScreen('home');
  };

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
  const handleDogEntry = () => requireAuth(() => setScreen('pet_management'));
  
  const handleAddPet = () => {
    setEditingPet(null);
    setScreen('dog_setup');
  };

  const handleEditPet = (pet) => {
    setEditingPet(pet);
    setScreen('dog_setup');
  };

  const toDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
  };

  const toUiPet = (pet) => {
    const breedName = pet.breed || pet.breedName;
    const breed = dogBreeds.find(item =>
      item.id === pet.breedId ||
      item.name === breedName ||
      (breedName && (breedName.includes(item.name) || item.name.includes(breedName)))
    );
    const ageMonths = pet.age_months ?? pet.ageMonths;
    return {
      ...pet,
      birthDate: toDateInput(pet.birth_date || pet.birthDate),
      breedId: pet.breedId || breed?.id || (breedName ? 'custom' : ''),
      breedName,
      customBreed: breed ? '' : (pet.customBreed || breedName || ''),
      breed: breed || pet.breed,
      bodySize: pet.body_size || pet.bodySize || breed?.size,
      activityLevel: pet.activity_level || pet.activityLevel,
      targetWeight: pet.target_weight_kg ?? pet.targetWeight,
      weight: pet.current_weight_kg ?? pet.weight,
      bcs: pet.body_condition_score ?? pet.bcs,
      feedingGoal: pet.feeding_goal || pet.feedingGoal,
      healthTags: pet.health_tags || pet.healthTags || [],
      allergySymptoms: pet.allergy_symptoms || pet.allergySymptoms || [],
      allergySeverity: pet.allergy_severity || pet.allergySeverity,
      specialPeriod: pet.special_period || pet.specialPeriod,
      avatar: pet.avatar_url || pet.avatar,
      gender: pet.sex || pet.gender,
      age: ageMonths ? Number((Number(ageMonths) / 12).toFixed(1)) : pet.age,
    };
  };

  useEffect(() => {
    if (!authToken) return;
    api.listPets(authToken)
      .then(result => {
        if (result?.success) replaceProfiles((result.pets || []).map(toUiPet));
      })
      .catch(error => console.error('Load DB pets failed:', error));
  }, [authToken]);

  const savePetProfile = async (draft) => {
    if (!authToken) return draft;
    const { avatar } = draft;
    const ageMonths = draft.age_months ?? draft.ageMonths ?? null;
    const lifeStage = ageMonths !== null
      ? (Number(ageMonths) < 12 ? 'puppy' : Number(ageMonths) >= 96 ? 'senior' : 'adult')
      : (draft.lifeStage || null);
    const payload = {
      name: draft.name,
      species: draft.species || 'dog',
      breed: draft.breedName || draft.breed || draft.customBreed || null,
      sex: draft.sex || null,
      neutered: Boolean(draft.neutered),
      birth_date: draft.birthDate || null,
      age_months: ageMonths,
      current_weight_kg: draft.weight ?? null,
      target_weight_kg: draft.targetWeight ?? null,
      body_condition_score: draft.bcs === undefined || draft.bcs === null ? null : String(draft.bcs),
      activity_level: draft.activityLevel || 'medium',
      life_stage: lifeStage,
      allergens: draft.allergens || [],
      food_restrictions: draft.foodRestrictions || [],
      health_tags: draft.healthTags || [],
      doctor_notes: draft.doctorNotes || null,
      user_notes: draft.userNotes || null,
      feeding_goal: draft.feedingGoal || null,
      body_size: draft.bodySize || null,
      environment: draft.environment || null,
      allergy_symptoms: draft.allergySymptoms || [],
      allergy_severity: draft.allergySeverity || null,
      special_period: draft.specialPeriod || null,
    };
    if (avatar) {
      if (String(avatar).startsWith('data:')) {
        const uploaded = await api.uploadAvatar(avatar, authToken);
        if (!uploaded?.success) throw new Error(uploaded?.error || '上传宠物头像失败');
        payload.avatar_url = uploaded.avatar_url;
      } else {
        payload.avatar_url = avatar;
      }
    }
    let result = editingPet?.id
      ? await api.updatePet(editingPet.id, payload, authToken)
      : await api.createPet(payload, authToken);
    if (!result?.success && editingPet?.id) {
      result = await api.createPet(payload, authToken);
    }
    if (!result?.success) throw new Error(result?.error || '保存宠物档案失败');
    return toUiPet(result.pet);
  };

  const analyzePetProfile = async (pet) => {
    if (pet?.id) {
      const byPetId = await api.aiAnalysisByPet(pet.id, lang, authToken);
      if (byPetId?.success) return byPetId;
      throw new Error(byPetId?.error || 'AI 分析失败');
    }
    throw new Error('请先保存宠物档案后再进行 AI 分析');
  };

  const handleSelectPet = async (pet) => {
    setActiveId(pet.id);
    setEntrySource('dog');
    try {
      const result = await analyzePetProfile(pet);
      if (result.success) {
        setAiProfile({
          ...pet,
          goals: pet.feedingGoal ? [pet.feedingGoal] : (pet.goals || []),
          analysis: result.analysis,
          comparisons: result.comparisons
        });
        setScreen('ai_analysis');
        return;
      }
    } catch (e) {
      console.error('AI analysis request failed for pet:', e);
      window.alert(e?.message || 'AI 分析失败');
    }
    setScreen('pet_management');
  };

  const handleProfileSave = async (p) => {
    let savedPet = p;
    try {
      savedPet = await savePetProfile(p);
    } catch (error) {
      console.error('Save pet profile failed:', error);
      window.alert(error?.message || '保存宠物档案失败，请稍后重试');
      return;
    }
    if (editingPet && editingPet.id) {
      updateProfile(editingPet.id, savedPet);
    } else {
      addProfile(savedPet);
    }
    setScreen('pet_management');
  };

  const handleSelectCategory = (cat, p) => {
    if (cat.query?.ai_shortcut) { handleAIShortcut(p); return; }
    setSelectedCategory(cat);
    if (p && p.id) setActiveId(p.id);
    if (!entrySource) setEntrySource('dog');
    setScreen('recipe_list');
  };

  const handleAIEntry = () => requireAuth(() => {
    if (profile?.id) handleAIShortcut(profile);
    else setScreen('pet_management');
  });
  const handleDeviceEntry = () => requireAuth(() => setScreen('device_flow'));

  const handleAIShortcut = async (p) => {
    if (p && p.id) setActiveId(p.id);
    setEntrySource('ai');
    try {
      const result = await analyzePetProfile(p);
      if (result.success) {
        setAiProfile({
          ...p,
          goals: p.feedingGoal ? [p.feedingGoal] : (p.goals || []),
          analysis: result.analysis,
          comparisons: result.comparisons
        });
        setScreen('ai_analysis'); return;
      }
    } catch (e) {
      console.error('AI shortcut failed:', e);
      alert(e.message || 'AI 分析失败，请先确认宠物档案已保存。');
    }
    setScreen('pet_management');
  };

  const handleShowAnalysis = async (p) => {
    let savedPet = p;
    try {
      savedPet = await savePetProfile(p);
    } catch (error) {
      console.error('Save pet profile failed:', error);
      window.alert(error?.message || '保存宠物档案失败，请稍后重试');
      return;
    }
    if (editingPet && editingPet.id) {
      updateProfile(editingPet.id, savedPet);
    } else {
      savedPet = addProfile(savedPet);
    }
    setActiveId(savedPet.id);
    setEntrySource('dog');
    try {
      const result = await analyzePetProfile(savedPet);
      if (result.success) {
        setAiProfile({
          ...savedPet,
          goals: savedPet.feedingGoal ? [savedPet.feedingGoal] : (savedPet.goals || []),
          analysis: result.analysis,
          comparisons: result.comparisons
        });
        setScreen('ai_analysis');
        return;
      }
    } catch (e) {
      console.error('AI analysis request failed on setup completion:', e);
      window.alert(e?.message || 'AI 分析失败');
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
    if (screen === 'pet_management' || screen === 'device_flow' || screen === 'mall_placeholder') setScreen('home');
    if (screen === 'ai_analysis') setScreen('pet_management');
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
          authUser={authUser}
          authToken={authToken}
          authPrompt={authPrompt}
          onLogin={handleAuthLogin}
          onLogout={handleAuthLogout}
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
      {screen === 'ai_analysis' && <AIAnalysisScreen onBack={goBack} profile={aiProfile} onSelectCategory={(cat, p) => { setEntrySource('ai'); handleSelectCategory(cat, p); }} onSelectRecipe={handleSelectRecipe} lang={lang} authToken={authToken} />}
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
