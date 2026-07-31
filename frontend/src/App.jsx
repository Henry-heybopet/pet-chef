{/* Pet Chef Ver B1.00 — 2026-06-22 */}
// App.jsx — HeyboPet Feeding OS v2.0 with i18n
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDogProfile } from './hooks/useDogProfile';
import { LanguageProvider, useLanguage, LANGS } from './i18n/LanguageContext';
import { useTranslation } from './i18n/translations';
import { api } from './api/index';
import { HeyboTuya } from './native/heyboTuya';
import { AppUpdate, isNativeAndroid } from './native/appUpdate';
import { applyTheme, readStoredTheme } from './theme';

import DogSetup from './components/DogSetup';
import PetManagementScreen from './components/PetManagementScreen';
import AIAnalysisScreen from './components/AIAnalysisScreen';
import RecipeList from './components/RecipeList';
import RecipeMake from './components/RecipeMake';
import CookingScreen from './components/CookingScreen';
import CookingCenterPage from './components/CookingCenterPage';
import { FreshCheckResultScreen, FreshCheckScreen } from './components/FreshCheckScreen';
import BottomTabBar from './components/BottomTabBar';
import RecipeCategoryCatalog from './components/RecipeCategoryCatalog';
import PetProfileDetails from './components/PetProfileDetails';
import { dogBreeds } from './data/breeds';

const SESSION_MS = 15 * 24 * 60 * 60 * 1000;

function AppUpdateGate({ state, onRetry, onUpgrade, onContinueOffline }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const checking = state.status === 'checking';
  const blocked = state.status === 'blocked';
  return (
    <main className="app-update-gate">
      <section className="app-update-card" role="alert">
        <div className="app-update-icon">{blocked ? '⬆️' : '🔄'}</div>
        <h1>{blocked ? t('updateAvailable') : t('checkingVersion')}</h1>
        {checking && <p>{t('checkingVersionHelp')}</p>}
        {state.status === 'error' && (
          <>
            <p>{lang === 'zh' && state.message ? state.message : t('versionNetworkError')}</p>
            <button type="button" onClick={onRetry}>{t('retryCheck')}</button>
            <button type="button" className="app-update-retry" onClick={onContinueOffline}>{t('continueOffline')}</button>
          </>
        )}
        {blocked && (
          <>
            <p>{t('forcedUpdateMessage', { installed: state.installedName, required: state.release.version_name })}</p>
            {state.release.release_notes?.length > 0 && (
              <ul>{state.release.release_notes.map(note => <li key={note}>{note}</li>)}</ul>
            )}
            {state.message && lang === 'zh' && <p className="app-update-error">{state.message}</p>}
            <button type="button" onClick={onUpgrade}>{t('openAppStore')}</button>
            <button type="button" className="app-update-retry" onClick={onRetry}>{t('updatedRetry')}</button>
          </>
        )}
      </section>
    </main>
  );
}

// ——— Language Selector (top-right globe button) ———
function LangSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div className="language-selector">
      <button className="language-selector-button" onClick={() => setOpen(!open)}>
        <span>{current.flag}</span>
        <span style={{ fontSize: 12 }}>{current.label}</span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div className="language-selector-menu">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className={`language-selector-option ${l.code === lang ? 'is-active' : ''}`}>
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

function ThemeToggle({ theme, onToggle }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const label = theme === 'light' ? t('switchToDarkTheme') : t('switchToLightTheme');
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      aria-pressed={theme === 'dark'}
      onClick={onToggle}
    >
      <img src="/theme-toggle.png" alt="" aria-hidden="true" />
    </button>
  );
}

function AuthWidget({ user, token, authPrompt, authPromptMessage, onLogin, onLogout }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [authAction, setAuthAction] = useState('login');

  useEffect(() => {
    if (!authPrompt) return;
    setMode('login');
    setOpen(true);
    setMessage(lang === 'zh' && authPromptMessage ? authPromptMessage : t('loginRequired'));
  }, [authPrompt, authPromptMessage, lang]);

  const resetModal = () => {
    setOpen(false);
    setMode('login');
    setMessage('');
    setPassword('');
    setUsername('');
  };

  const finishLogin = (result) => {
    onLogin(result);
    resetModal();
  };

  const handleSubmit = async (event, action = 'login') => {
    event.preventDefault();
    const loginValue = login.trim();
    if (!loginValue) {
      setMessage(t('enterUsernameOrPhone'));
      return;
    }
    if (action === 'signup' && !/^1[3-9]\d{9}$/.test(loginValue)) {
      setMessage(t('signupPhoneRequired'));
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      setMessage(t('passwordMustSixDigits'));
      return;
    }
    setBusy(true);
    setAuthAction(action);
    setMessage('');
    try {
      const result = await api.phoneLogin({ login: loginValue, password });
      if (!result?.success) throw new Error(result?.error || t('authFailed'));
      if (result.needsUsername) {
        setSignupPhone(result.phone);
        setMaskedPhone(result.maskedPhone);
        setMode('signup');
        return;
      }
      finishLogin(result);
    } catch (error) {
      setMessage(lang === 'zh' && error?.message ? error.message : t('authFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    const name = username.trim();
    if (!name) {
      setMessage(t('usernameRequired'));
      return;
    }
    if (name.length > 18) {
      setMessage(t('usernameTooLong'));
      return;
    }
    if (!/^[\u4e00-\u9fa5A-Za-z0-9]{1,18}$/.test(name)) {
      setMessage(t('usernameInvalidChars'));
      return;
    }
    if (/^\d+$/.test(name)) {
      setMessage(t('usernameOnlyNumbers'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await api.phoneSignup({ phone: signupPhone, password, username: name });
      if (!result?.success) throw new Error(result?.error || t('authFailed'));
      finishLogin(result);
    } catch (error) {
      setMessage(lang === 'zh' && error?.message ? error.message : t('usernameTaken'));
    } finally {
      setBusy(false);
    }
  };

  const displayName = user?.display_name || user?.username || t('currentUser');

  return (
    <>
      <div className="home-auth-entry">
        <button
          type="button"
          className="home-auth-pill"
          onClick={() => token ? setMenuOpen(value => !value) : setOpen(true)}
        >
          {token ? displayName : t('login')}
        </button>
        {token && menuOpen && (
          <div className="home-auth-menu">
            <div className="home-auth-account">{t('currentAccount', { name: displayName })}</div>
            <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>{t('logout')}</button>
          </div>
        )}
      </div>

      {open && !token && (
        <div className="auth-modal-backdrop" onClick={resetModal}>
          <div className="auth-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="auth-modal-form">
                <div>
                  <h2>{t('loginHeybo')}</h2>
                  <p>{t('loginBenefits')}</p>
                </div>
                {message && (
                  <div className="auth-modal-message">
                    <strong>{message}</strong>
                    <span>{t('loginRequiredDetail')}</span>
                  </div>
                )}
                <input
                  value={login}
                  onChange={event => setLogin(event.target.value)}
                  placeholder={t('usernameOrPhone')}
                  autoComplete="username"
                />
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  type="password"
                  placeholder={t('sixDigitPassword')}
                  autoComplete="current-password"
                />
                <div className="auth-modal-actions">
                  <button type="button" className="auth-modal-register" disabled={busy} onClick={event => handleSubmit(event, 'signup')}>
                    {busy && authAction === 'signup' ? t('signingUp') : t('newUserSignup')}
                  </button>
                  <button type="submit" disabled={busy}>
                    {busy && authAction === 'login' ? t('loggingIn') : t('login')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="auth-modal-form">
                <div>
                  <h2>{t('setUsername')}</h2>
                  <p>{t('firstUseSetUsername')}</p>
                </div>
                <div className="auth-modal-phone">{t('phoneLabel', { phone: maskedPhone })}</div>
                {message && <div className="auth-modal-message"><strong>{message}</strong></div>}
                <input
                  value={username}
                  onChange={event => setUsername(event.target.value.trim())}
                  placeholder={t('usernameRulesPlaceholder')}
                  maxLength={18}
                  autoComplete="nickname"
                />
                <button type="submit" disabled={busy}>{busy ? t('processing') : t('completeLogin')}</button>
              </form>
            )}
            <button type="button" className="auth-modal-close" onClick={resetModal}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

function AiWaitingModal() {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  return (
    <div className="ai-waiting-overlay" role="status" aria-live="polite">
      <div className="ai-waiting-modal">
        <div className="ai-waiting-title">{t('profileReanalyzing')}</div>
        <div className="ai-waiting-visual" aria-hidden="true">
          <img src="/heybo-ai-thinking.png" alt="" />
        </div>
        <div className="ai-waiting-powered">Powered by HeyboPet Agent</div>
      </div>
    </div>
  );
}

// ——— HomeScreen ———
function HomeScreen({ onDogEntry, onAIEntry, onDeviceEntry, authUser, authToken, authPrompt, authPromptMessage, onLogin, onLogout, theme, onToggleTheme }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);

  return (
    <div className="animate-fade home-screen">
      <AuthWidget user={authUser} token={authToken} authPrompt={authPrompt} authPromptMessage={authPromptMessage} onLogin={onLogin} onLogout={onLogout} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <LangSelector />
      <div className="home-hero">
        <div className="home-logo-wrap">
          <img src="/logo.png" alt="HeyboPet" className="home-logo" />
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
          <div className="home-machine-overlay" />
        </div>
      </div>
      <div className="home-actions">
        <button onClick={onDogEntry} className={`home-action-button home-action-dog ${authToken ? '' : 'is-locked'}`}>
          <div className="home-action-icon">🐕</div>
          <div>
            <div className="home-action-title" style={{ color: 'var(--primary)' }}>{t('myDog')}</div>
            <div className="home-action-desc">{t('myDogDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 20 }}>→</div>
        </button>
        <button onClick={onAIEntry} className={`home-action-button home-action-ai ${authToken ? '' : 'is-locked'}`}>
          <img className="home-action-icon-image" src="/fresh-check-icon.png" alt={t('aiRecipe')} />
          <div>
            <div className="home-action-title" style={{ color: 'var(--theme-fresh)' }}>{t('aiRecipe')}</div>
            <div className="home-action-desc">{t('aiRecipeDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--theme-fresh)', fontSize: 20 }}>→</div>
        </button>
        <button onClick={onDeviceEntry} className={`home-action-button home-action-device ${authToken ? '' : 'is-locked'}`}>
          <div className="home-action-icon">🍲</div>
          <div>
            <div className="home-action-title" style={{ color: 'var(--theme-recipe)' }}>{t('homeCookTitle')}</div>
            <div className="home-action-desc">{t('homeCookDesc')}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--theme-recipe)', fontSize: 20 }}>→</div>
        </button>
      </div>
    </div>
  );
}

// ——— Main App Router ———
function AppInner({ theme, onToggleTheme }) {
  const { profiles, profile, setActiveId, addProfile, updateProfile, deleteProfile, replaceProfiles, hasProfile } = useDogProfile();
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [screen, setScreen] = useState('home');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasCookedBefore, setHasCookedBefore] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeMakeReturnScreen, setRecipeMakeReturnScreen] = useState('recipe_list');
  const [freshCheckResult, setFreshCheckResult] = useState(null);
  const [freshCheckDraft, setFreshCheckDraft] = useState(null);
  const [cookingData, setCookingData] = useState(null);
  const [entrySource, setEntrySource] = useState(null);
  const [editingPet, setEditingPet] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authPrompt, setAuthPrompt] = useState(0);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [deletingPetId, setDeletingPetId] = useState(null);
  const [breedOptions, setBreedOptions] = useState(dogBreeds);
  const [updateGate, setUpdateGate] = useState(() => ({ status: isNativeAndroid ? 'checking' : 'ready' }));
  const swipeStartRef = useRef(null);

  const checkAppVersion = async () => {
    if (!isNativeAndroid) return;
    setUpdateGate({ status: 'checking' });
    try {
      const [installed, release] = await Promise.all([
        AppUpdate.getInfo(),
        api.getAndroidRelease(),
      ]);
      const installedCode = Number(installed.versionCode);
      const minimumCode = Number(release.minimum_supported_version_code);
      if (!Number.isInteger(installedCode) || !Number.isInteger(minimumCode)) {
        throw new Error(t('invalidVersionResponse'));
      }
      if (installedCode < minimumCode) {
        setUpdateGate({
          status: 'blocked',
          installedName: installed.versionName,
          release,
          message: '',
        });
        return;
      }
      setUpdateGate({ status: 'ready' });
    } catch (error) {
      setUpdateGate({ status: 'error', message: lang === 'zh' && error?.message ? error.message : t('versionNetworkError') });
    }
  };

  const openAppUpdate = async () => {
    const url = updateGate.release?.update_url;
    if (!url) {
      setUpdateGate(current => ({ ...current, message: t('appStoreUnavailable') }));
      return;
    }
    try {
      await AppUpdate.openUpdate({ url });
    } catch (error) {
      setUpdateGate(current => ({ ...current, message: lang === 'zh' && error?.message ? error.message : t('openAppStoreFailed') }));
    }
  };

  useEffect(() => {
    checkAppVersion();
  }, []);

  // Derived active tab based on current screen
  const activeTab = (() => {
    switch (screen) {
      case 'home':
        return 'home';
      case 'recipe_catalog':
      case 'recipe_list':
      case 'recipe_make':
      case 'fresh_check':
      case 'fresh_check_result':
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
    const savedToken = localStorage.getItem('authToken') || localStorage.getItem('petchef_auth_token') || '';
    const expiresAt = Number(localStorage.getItem('sessionExpiresAt') || 0);
    setHasCompletedOnboarding(onboardingDone);
    setHasCookedBefore(hasCooked);
    if (savedToken && expiresAt > Date.now()) {
      setAuthToken(savedToken);
      setAuthUser({
        id: localStorage.getItem('userId') || '',
        display_name: localStorage.getItem('username') || t('currentUser'),
      });
      api.heyboMe(savedToken)
        .then(result => {
          if (!result?.success) throw new Error(result?.error || t('sessionExpired'));
          saveAuthSession(result);
        })
        .catch(() => clearAuthSession());
    } else {
      clearAuthSession();
    }
    if (onboardingDone) {
      setScreen('home');
    }
  }, []);

  useEffect(() => {
    api.getBreeds()
      .then(result => {
        if (result?.success && result.breeds?.length) setBreedOptions(result.breeds);
      })
      .catch(error => console.error('Load breeds failed:', error));
  }, []);

  const saveAuthSession = (result) => {
    const user = result.user || null;
    const token = result.token || '';
    const expiresAt = String(Date.now() + SESSION_MS);
    setAuthToken(token);
    setAuthUser(user);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', user?.id || '');
    localStorage.setItem('username', user?.display_name || '');
    localStorage.setItem('sessionExpiresAt', expiresAt);
    localStorage.removeItem('petchef_auth_token');
    localStorage.removeItem('petchef_auth_user');
    HeyboTuya.syncAuthState({
      token,
      userId: user?.id || '',
      nickname: user?.display_name || '',
      tuyaUid: result.tuyaMapping?.tuya_uid || (user?.id ? `heybo_${user.id}` : ''),
      tuyaPassword: result.tuyaMapping?.tuya_test_password || (user?.id ? `heybo_${user.id}` : ''),
    }).catch(error => console.warn('Sync native auth failed:', error));
  };

  const clearAuthSession = () => {
    setAuthToken('');
    setAuthUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('sessionExpiresAt');
    localStorage.removeItem('petchef_auth_token');
    localStorage.removeItem('petchef_auth_user');
    HeyboTuya.clearAuthState().catch(error => console.warn('Clear native auth failed:', error));
  };

  const handleAuthLogin = (result) => {
    saveAuthSession(result);
    if (pendingAuthAction) {
      pendingAuthAction();
      setPendingAuthAction(null);
    }
  };

  const handleAuthLogout = () => {
    clearAuthSession();
    replaceProfiles([]);
    setScreen('home');
  };

  const requireAuth = (next) => {
    if (authToken) {
      next();
      return;
    }
    setPendingAuthAction(() => next);
    setAuthPromptMessage(t('loginRequired'));
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
        requireAuth(() => {
          setSelectedCategory(null);
          setEntrySource('catalog');
          setScreen('recipe_catalog');
        });
        break;
      case 'pet':
        requireAuth(() => setScreen('pet_management'));
        break;
      case 'cook':
        requireAuth(() => setScreen('device_flow'));
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

  const handleDeletePet = async (pet) => {
    if (!pet?.id || deletingPetId) return false;
    setDeletingPetId(pet.id);
    try {
      const result = await api.deletePet(pet.id, authToken);
      if (!result?.success) throw new Error(result?.error || t('deletePetFailed'));
      deleteProfile(pet.id);
      if (editingPet?.id === pet.id) setEditingPet(null);
      if (aiProfile?.id === pet.id) setAiProfile(null);
      try {
        await reloadPets('after-delete');
      } catch (error) {
        console.warn('Reload pets after delete failed:', error);
      }
      return true;
    } catch (error) {
      console.error('Delete pet profile failed:', error);
      window.alert(lang === 'zh' && error?.message ? error.message : t('deletePetFailed'));
      return false;
    } finally {
      setDeletingPetId(null);
    }
  };

  const toDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toISOString().slice(0, 10);
  };

  const toUiPet = (pet) => {
    const breedName = typeof pet.breed === 'object' ? pet.breed?.name : (pet.breed || pet.breedName);
    const breed = breedOptions.find(item =>
      item.id === pet.breedId ||
      item.name === breedName ||
      (breedName && (breedName.includes(item.name) || item.name.includes(breedName)))
    );
    const ageMonths = pet.age_months ?? pet.ageMonths;
    const avatarUrl = pet.avatar_url || pet.avatarUrl || pet.photoUrl || pet.profileImage || pet.imageUrl || pet.photo || pet.avatar || '';
    const mapped = {
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
      avatar: avatarUrl,
      avatar_url: avatarUrl,
      avatarUpdatedAt: pet.avatar_updated_at || pet.updated_at || pet.updatedAt || '',
      gender: pet.sex || pet.gender,
      age: ageMonths ? Number((Number(ageMonths) / 12).toFixed(1)) : pet.age,
    };
    return mapped;
  };

  const reloadPets = async (reason = 'manual') => {
    if (!authToken) return [];
    const result = await api.listPets(authToken);
    if (result?.success) {
      const mapped = (result.pets || []).map(toUiPet);
      replaceProfiles(mapped);
      return mapped;
    }
    return [];
  };

  useEffect(() => {
    if (!authToken) return;
    reloadPets('auth-or-breed-change')
      .catch(error => console.error('Load DB pets failed:', error));
  }, [authToken, breedOptions]);

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
        if (!uploaded?.success) throw new Error(lang === 'zh' && uploaded?.error ? uploaded.error : t('uploadAvatarFailed'));
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
    if (!result?.success) throw new Error(lang === 'zh' && result?.error ? result.error : t('saveProfileFailed'));
    return toUiPet(result.pet);
  };

  const analyzePetProfile = async (pet) => {
    if (!pet?.id) throw new Error(t('saveBeforeAi'));
    let loadingTimer = setTimeout(() => setIsAiLoading(true), 300);
    try {
      const byPetId = await api.aiAnalysisByPet(pet.id, lang, authToken);
      if (byPetId?.success) return byPetId;
      throw new Error(lang === 'zh' && byPetId?.error ? byPetId.error : t('aiAnalysisFailed'));
    } finally {
      clearTimeout(loadingTimer);
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (screen !== 'ai_analysis' || !aiProfile?.id || !authToken || aiProfile.analysis?.locale === lang) return undefined;
    let active = true;
    setIsAiLoading(true);
    api.aiAnalysisByPet(aiProfile.id, lang, authToken)
      .then(result => {
        if (!active || !result?.success) return;
        setAiProfile(current => current && current.id === aiProfile.id ? {
          ...current,
          analysis: result.analysis,
          comparisons: result.comparisons,
        } : current);
      })
      .catch(error => { if (active) console.warn('[AI Analysis] locale refresh failed', error?.message || 'unknown'); })
      .finally(() => { if (active) setIsAiLoading(false); });
    return () => { active = false; };
  }, [aiProfile?.analysis?.locale, aiProfile?.id, authToken, lang, screen]);

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
      window.alert(e?.message || t('aiAnalysisFailed'));
    }
    setScreen('pet_management');
  };

  const handleProfileSave = async (p) => {
    let savedPet = p;
    try {
      savedPet = await savePetProfile(p);
    } catch (error) {
      console.error('Save pet profile failed:', error);
      window.alert(lang === 'zh' && error?.message ? error.message : t('saveProfileRetry'));
      return;
    }
    if (editingPet && editingPet.id) {
      updateProfile(editingPet.id, savedPet);
    } else {
      addProfile(savedPet);
    }
    try {
      await reloadPets('after-save');
    } catch (error) {
      console.warn('Reload pets after save failed:', error);
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
    setScreen('fresh_check');
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
      alert(lang === 'zh' && e?.message ? e.message : t('aiAnalysisProfileFailed'));
    }
    setScreen('pet_management');
  };

  const handleShowAnalysis = async (p) => {
    let savedPet = p;
    try {
      savedPet = await savePetProfile(p);
    } catch (error) {
      console.error('Save pet profile failed:', error);
      window.alert(lang === 'zh' && error?.message ? error.message : t('saveProfileRetry'));
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
      window.alert(lang === 'zh' && e?.message ? e.message : t('aiAnalysisFailed'));
    }
    setScreen('pet_management');
  };

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setRecipeMakeReturnScreen(screen === 'ai_analysis' ? 'ai_analysis' : 'recipe_list');
    setScreen('recipe_make');
  };
  const handleStartCooking = (data) => {
    setCookingData(data);
    setScreen('device_flow');
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
    if (screen === 'fresh_check') setScreen('home');
    if (screen === 'fresh_check_result') setScreen('fresh_check');
    if (screen === 'recipe_catalog') setScreen('home');
    if (screen === 'recipe_list') {
      if (entrySource === 'catalog') setScreen('recipe_catalog');
      else if (entrySource === 'ai') setScreen('ai_analysis');
      else setScreen('pet_management');
    }
    if (screen === 'recipe_make') setScreen(recipeMakeReturnScreen);
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

  if (updateGate.status !== 'ready') {
    return <AppUpdateGate state={updateGate} onRetry={checkAppVersion} onUpgrade={openAppUpdate} onContinueOffline={() => setUpdateGate({ status: 'ready' })} />;
  }

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
          authPromptMessage={authPromptMessage}
          onLogin={handleAuthLogin}
          onLogout={handleAuthLogout}
          theme={theme}
          onToggleTheme={onToggleTheme}
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
          breeds={breedOptions}
          onAddPet={handleAddPet}
          onEditPet={handleEditPet}
          onDeletePet={handleDeletePet}
          deletingPetId={deletingPetId}
          onSelectPet={handleSelectPet}
          onBack={goHome}
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
      {screen === 'fresh_check' && (
        <FreshCheckScreen
          profiles={profiles}
          authToken={authToken}
          onBack={goHome}
          onAddPet={handleAddPet}
          initialDraft={freshCheckDraft}
          onResult={(result, draft) => { setFreshCheckDraft(draft); setFreshCheckResult(result); setScreen('fresh_check_result'); }}
        />
      )}
      {screen === 'fresh_check_result' && <FreshCheckResultScreen result={freshCheckResult} authToken={authToken} onResultUpdate={setFreshCheckResult} onAdjust={() => setScreen('fresh_check')} onBack={goHome} />}
      {screen === 'dog_setup' && <DogSetup onBack={goHome} profile={editingPet} onSave={handleProfileSave} onSelectCategory={handleSelectCategory} onShowAnalysis={handleShowAnalysis} lang={lang} />}
      {screen === 'ai_analysis' && <AIAnalysisScreen onBack={goBack} profile={aiProfile} onSelectCategory={(cat, p) => { setEntrySource('ai'); handleSelectCategory(cat, p); }} onSelectRecipe={handleSelectRecipe} lang={lang} authToken={authToken} />}
      {screen === 'recipe_list' && <RecipeList onBack={goBack} category={selectedCategory} profile={profile} onSelectRecipe={handleSelectRecipe} lang={lang} />}
      {screen === 'recipe_make' && <RecipeMake onBack={goBack} recipe={selectedRecipe} profile={profile} onStartCooking={handleStartCooking} lang={lang} />}
      {screen === 'cooking' && <CookingScreen onBack={goHome} cookingData={cookingData} lang={lang} />}
      {screen === 'device_flow' && (
        <CookingCenterPage
          onBack={goHome}
          authToken={authToken}
          recipeContext={cookingData}
          onChooseRecipe={() => {
            setSelectedCategory(null);
            setEntrySource('catalog');
            setScreen('recipe_catalog');
          }}
        />
      )}
      {screen === 'mall_placeholder' && (
        <div className="animate-fade flex-col" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: '40px 20px', color: 'var(--gray)', textAlign: 'center', background: 'var(--dark)' }}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</span>
          <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0' }}>{t('mallTitle')}</h2>
          <p style={{ fontSize: '13px', color: 'var(--gray)', margin: 0 }}>{t('mallComingSoon')}</p>
          <button className="btn btn-secondary" style={{ marginTop: '24px', padding: '8px 24px' }} onClick={goHome}>{t('backHome')}</button>
        </div>
      )}

      {isAiLoading && <AiWaitingModal />}

      {/* 引导完成后显示底部标签栏 */}
      {hasCompletedOnboarding && (
        <BottomTabBar activeTab={activeTab} onSelect={handleTabChange} />
      )}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(readStoredTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <LanguageProvider>
      <AppInner theme={theme} onToggleTheme={() => setTheme(current => current === 'light' ? 'dark' : 'light')} />
    </LanguageProvider>
  );
}
