// DogSetup.jsx — Compact Pet Profile Form with DeepSeek API BCS Evaluation
import React, { useState, useEffect, useRef } from 'react';
import TopBar from './TopBar';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';

export default function DogSetup({ onBack, profile, onSave, onSelectCategory, onShowAnalysis, lang }) {
  const t = useTranslation(lang);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState(1); // 1 = Basic, 2 = Health

  // Page 1: Basic Profile States
  const [name, setName] = useState(profile?.name || '');
  const [sex, setSex] = useState(profile?.sex || 'male');
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '2023-01-01');
  const [breedId, setBreedId] = useState(profile?.breedId || '');
  const [customBreed, setCustomBreed] = useState(profile?.customBreed || '');
  const [bodySize, setBodySize] = useState(profile?.bodySize || 'medium');
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel || 'medium');
  const [environment, setEnvironment] = useState(profile?.environment || 'indoor');
  const [weight, setWeight] = useState(profile?.weight || 15);
  const [targetWeight, setTargetWeight] = useState(profile?.targetWeight || 15);
  const [feedingGoal, setFeedingGoal] = useState(profile?.feedingGoal || 'maintenance');

  // Page 2: Health Profile States
  const getInitialSpecialOption = () => {
    if (profile?.neutered) return 'neutered';
    const period = profile?.specialPeriod || profile?.special_period;
    if (period) return period;
    return 'none';
  };
  const [specialOption, setSpecialOption] = useState(getInitialSpecialOption());

  const [healthTags, setHealthTags] = useState(profile?.healthTags || profile?.health_tags || []);
  const [allergensText, setAllergensText] = useState(
    profile?.allergensText || 
    (Array.isArray(profile?.allergens) ? profile.allergens[0] : '') || 
    (typeof profile?.allergens === 'string' ? profile.allergens : '') || 
    ''
  );
  const [allergySymptomsText, setAllergySymptomsText] = useState(
    profile?.allergySymptomsText || 
    (Array.isArray(profile?.allergySymptoms || profile?.allergy_symptoms) ? (profile.allergySymptoms || profile?.allergy_symptoms)[0] : '') ||
    (typeof (profile?.allergySymptoms || profile?.allergy_symptoms) === 'string' ? (profile.allergySymptoms || profile?.allergy_symptoms) : '') ||
    ''
  );
  const [allergySeverity, setAllergySeverity] = useState(profile?.allergySeverity || profile?.allergy_severity || 'mild');

  // Validations & Autocomplete search
  const [dateError, setDateError] = useState('');
  const [breeds, setBreeds] = useState([]);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  
  // AI BCS Evaluation State
  const [bcsLoading, setBcsLoading] = useState(false);
  const [aiBcsData, setAiBcsData] = useState(null); // { standard_weight, bcs_score, bcs_label, bcs_description }

  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load breeds on mount
  useEffect(() => {
    api.getBreeds().then(d => {
      if (d.success) {
        setBreeds(d.breeds);
        if (profile?.breedId) {
          const selected = d.breeds.find(b => b.id === profile.breedId);
          if (selected) {
            setBreedSearch(selected.name);
          } else if (profile.breedId === 'custom') {
            setBreedSearch('其他（自定义）');
          }
        }
      }
    });

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowBreedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profile]);

  const selectedBreed = breeds.find(b => b.id === breedId);

  // Helper for local growth calculations (used as default and fallback)
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

  // Age/Months detail computation
  const calculateAgeDetails = (dateStr) => {
    if (!dateStr) return { age: 3, age_months: 36 };
    try {
      const birth = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.max(0, now - birth);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const age_months = parseFloat((diffDays / 30.4).toFixed(1));
      const age = parseFloat((diffDays / 365).toFixed(1));
      return { age, age_months };
    } catch (e) {
      return { age: 3, age_months: 36 };
    }
  };

  // Local calculation defaults
  const bcsLocalFallback = () => {
    let adultWeight = 15;
    if (selectedBreed && selectedBreed.id !== 'custom' && selectedBreed.weight_avg) {
      adultWeight = selectedBreed.weight_avg;
    } else {
      const sizeFallbacks = { mini: 3, small: 6, medium: 15, large: 30, giant: 50 };
      adultWeight = sizeFallbacks[bodySize] || 15;
    }
    const ageDetails = calculateAgeDetails(birthDate);
    const standardWeight = getExpectedWeightForAge(adultWeight, ageDetails.age_months);
    const ratio = weight / standardWeight;

    let score = 5;
    let label = '理想体态';
    let description = '理想体态。该成长阶段发育标准符合标准指标。';
    if (ratio <= 0.65) { score = 1; label = '极度消瘦'; description = '极度消瘦。发育受阻，请咨询兽医。'; }
    else if (ratio <= 0.75) { score = 2; label = '偏瘦'; description = '偏瘦。建议逐渐补充营养。'; }
    else if (ratio <= 0.85) { score = 3; label = '稍瘦'; description = '稍瘦。可适当增加日粮供给。'; }
    else if (ratio <= 0.95) { score = 4; label = '偏苗条'; description = '偏苗条。体态匀称，状态较好。'; }
    else if (ratio <= 1.05) { score = 5; label = '理想体态'; description = '理想体态。该成长阶段发育标准符合标准指标。'; }
    else if (ratio <= 1.15) { score = 6; label = '偏丰满'; description = '偏丰满。生长稍微有些圆润。'; }
    else if (ratio <= 1.25) { score = 7; label = '超重'; description = '超重。建议适当增加活动量并控卡。'; }
    else if (ratio <= 1.40) { score = 8; label = '肥胖'; description = '肥胖。建议制定科学的减重饮食。'; }
    else { score = 9; label = '极度肥胖'; description = '极度肥胖。骨骼和内脏负荷大，建议寻求医疗减重。'; }

    return { score, label, description, standardWeight, adultWeight };
  };

  const localBcs = bcsLocalFallback();

  // --- DeepSeek AI BCS Evaluation call ---
  useEffect(() => {
    if (!breedId || !weight || dateError) return;
    const breed = breeds.find(b => b.id === breedId);
    const breedName = breedId === 'custom' ? customBreed : (breed?.name || '未知犬种');
    if (!breedName || breedName === '未知犬种') return;

    const ageDetails = calculateAgeDetails(birthDate);

    setBcsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const BASE = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${BASE}/api/pets/evaluate-bcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breedName,
            ageMonths: ageDetails.age_months,
            weight
          })
        });
        const data = await response.json();
        if (data.success && data.evaluation) {
          setAiBcsData(data.evaluation);
          
          // Update target weight to dynamically match the AI-calculated standard range average
          if (data.evaluation.standard_weight) {
            setTargetWeight(data.evaluation.standard_weight);
          }
        }
      } catch (err) {
        console.warn('DeepSeek AI BCS fetch failed:', err);
      } finally {
        setBcsLoading(false);
      }
    }, 700); // 700ms debounce

    return () => clearTimeout(timer);
  }, [breedId, customBreed, birthDate, weight, dateError]);

  // Set default weights locally first on breed/DOB modifications to maintain responsiveness
  useEffect(() => {
    if (!profile && selectedBreed && selectedBreed.id !== 'custom') {
      const ageDetails = calculateAgeDetails(birthDate);
      const expected = getExpectedWeightForAge(selectedBreed.weight_avg, ageDetails.age_months);
      setWeight(expected);
      setTargetWeight(expected);
    }
  }, [breedId, birthDate]);

  // --- Validations & Handlers ---

  const handleDateChange = (val) => {
    setBirthDate(val);
    if (!val) {
      setDateError('请输入出生日期');
      return;
    }
    const parts = val.split('-');
    if (parts.length !== 3) {
      setDateError('日期格式不正确');
      return;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month - 1, day);
    const now = new Date();
    
    if (isNaN(d.getTime())) {
      setDateError('无效日期');
    } else if (d.getFullYear() !== year || (d.getMonth() + 1) !== month || d.getDate() !== day) {
      setDateError('该日期在日历中不存在（例如2月无31天）');
    } else if (d > now) {
      setDateError('出生日期不能晚于今天');
    } else if (year < now.getFullYear() - 30) {
      setDateError('日期超出合理范围');
    } else {
      setDateError('');
    }
  };

  const isSizeDisabled = (sizeOption) => {
    if (!selectedBreed || selectedBreed.id === 'custom') return false;
    const naturalSize = selectedBreed.size;
    const breedNameLower = (selectedBreed.name || '').toLowerCase();

    if (breedNameLower.includes('贵宾') || breedNameLower.includes('poodle')) {
      return false;
    }

    const smallBreeds = ['chihuahua', 'pomeranian', 'bichon', 'yorkshire', 'pug', 'maltese', '吉娃娃', '博美', '比熊', '约克夏', '巴哥', '马尔济斯'];
    if (smallBreeds.some(name => breedNameLower.includes(name) || selectedBreed.id === name)) {
      return ['medium', 'large', 'giant'].includes(sizeOption);
    }

    const largeBreeds = ['great_dane', 'alaskan', 'doberman', 'golden', 'labrador', '德牧', '大丹', '阿拉斯加', '杜宾', '金毛', '拉布拉多'];
    if (largeBreeds.some(name => breedNameLower.includes(name) || selectedBreed.id === name)) {
      return ['mini', 'small', 'medium'].includes(sizeOption);
    }

    return naturalSize !== sizeOption;
  };

  useEffect(() => {
    if (selectedBreed && selectedBreed.id !== 'custom') {
      if (isSizeDisabled(bodySize)) {
        setBodySize(selectedBreed.size);
      }
    }
  }, [breedId]);

  useEffect(() => {
    if (sex === 'male') {
      if (specialOption === 'pregnancy' || specialOption === 'lactation') {
        setSpecialOption('none');
      }
    }
  }, [sex]);

  const handleBreedSelect = (b) => {
    setBreedId(b.id);
    setBreedSearch(b.name);
    setShowBreedDropdown(false);

    if (b.size && b.id !== 'custom') {
      setBodySize(b.size);
    }
  };

  const handleCustomBreedSelect = () => {
    setBreedId('custom');
    setBreedSearch('其他（自定义）');
    setShowBreedDropdown(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (shouldGoToAnalysis = false) => {
    if (dateError) {
      setActiveTab(1);
      window.alert(dateError);
      return;
    }
    const ageDetails = calculateAgeDetails(birthDate);
    const breed = breeds.find(b => b.id === breedId);

    let neuteredVal = false;
    let specialPeriodVal = null;
    
    if (specialOption === 'neutered') {
      neuteredVal = true;
    } else if (specialOption !== 'none' && specialOption !== '') {
      specialPeriodVal = specialOption;
    }

    const finalBcs = aiBcsData?.bcs_score || localBcs.score;

    const profileData = {
      name: name.trim() || '爱宠',
      sex,
      avatar,
      birthDate,
      breedId,
      breedName: breedId === 'custom' ? customBreed : (breed?.name || '未知犬种'),
      customBreed: breedId === 'custom' ? customBreed : '',
      bodySize,
      activityLevel,
      environment,
      weight,
      targetWeight,
      bcs: finalBcs,
      feedingGoal,
      age: ageDetails.age,
      age_months: ageDetails.age_months,
      breed: breedId === 'custom' ? { id: 'custom', name: customBreed, weight_avg: 15, size: bodySize } : breed,
      
      // Page 2 Health fields
      neutered: neuteredVal,
      healthTags,
      allergensText,
      allergens: allergensText.trim() ? allergensText.split(/[,，、;；\s]+/).map(s => s.trim()).filter(Boolean) : [],
      allergySymptomsText,
      allergySymptoms: allergySymptomsText.trim() ? allergySymptomsText.split(/[,，、;；\s]+/).map(s => s.trim()).filter(Boolean) : [],
      allergySeverity,
      specialPeriod: specialPeriodVal,
      
      // Cache the DeepSeek output explicitly
      aiBcsData
    };

    localStorage.setItem('petchef_onboarding_completed', 'true');
    
    if (shouldGoToAnalysis) {
      if (onShowAnalysis) {
        onShowAnalysis(profileData);
      } else {
        let ageKey = 'adult';
        let label = '成宠维持型';
        let query = { custom_category: 'adult' };

        if (ageDetails.age < 1) {
          ageKey = 'puppy';
          label = 'B1 幼宠成长型';
          query = { custom_category: 'puppy' };
        } else if (ageDetails.age >= 8) {
          ageKey = 'senior';
          label = '老年支持型';
          query = { custom_category: 'senior' };
        }

        if (feedingGoal === 'weight_loss') {
          ageKey = 'weight';
          label = '体重控制型';
          query = { custom_category: 'weight' };
        }

        onSelectCategory({ id: ageKey, label, query });
      }
    } else {
      onSave(profileData);
    }
  };

  // Mapped options dictionary
  const goalLabels = {
    maintenance: '维持体态',
    weight_loss: '减重控体',
    muscle_gain: '增肌强壮',
    post_surgery_recovery: '术后恢复',
    coat_care: '美毛亮毛',
    gastrointestinal_care: '调理肠胃'
  };

  const healthIssues = {
    obesity: '肥胖问题',
    cardiac: '心脏问题',
    kidney: '肾脏问题',
    liver: '肝脏问题',
    gastrointestinal: '肠胃敏感',
    urinary: '泌尿问题',
    dermatological: '皮肤问题',
    joint: '关节问题',
    gallbladder: '胆囊问题',
    pancreatitis: '胰腺问题',
    diabetes: '糖尿病',
    thyroid: '甲状腺问题',
    oral: '口腔问题',
    dental: '牙齿问题',
    immunity: '免疫力差'
  };

  const severityLabels = {
    mild: '轻微',
    moderate: '中等',
    severe: '严重'
  };

  const periodOptions = {
    neutered: '已经绝育 ✂️',
    pregnancy: '妊娠期 🤰',
    lactation: '哺乳期 🍼',
    post_op_rest: '术后休养 🏥',
    illness_recovery: '病后恢复 ❤️',
    none: '无特殊情况'
  };

  const filteredBreeds = breeds.filter(b => 
    !b.is_custom && 
    (b.name.toLowerCase().includes(breedSearch.toLowerCase()) || 
     (b.name_en && b.name_en.toLowerCase().includes(breedSearch.toLowerCase())))
  );

  // Determine current display values (AI first, fallback local next)
  const displayBcsScore = aiBcsData?.bcs_score || localBcs.score;
  const displayBcsLabel = aiBcsData?.bcs_label || localBcs.label;
  const displayBcsDescription = aiBcsData?.bcs_description || localBcs.description;
  const displayStandardWeight = aiBcsData?.standard_weight || localBcs.standardWeight;

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 100 }}>
      <TopBar onBack={onBack} title="我的爱犬" />
      
      <div style={{ padding: '0 20px' }}>
        
        {/* Step Tabs Indicator */}
        <div className="form-step-indicator">
          <div 
            className={`form-step-item ${activeTab === 1 ? 'active' : 'completed'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab(1)}
          >
            <span>① 基础档案</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.1)' }}>——</div>
          <div 
            className={`form-step-item ${activeTab === 2 ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (!dateError) setActiveTab(2);
            }}
          >
            <span>② 健康档案</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PAGE 1: BASIC PROFILE PANEL                                    */}
        {/* ============================================================== */}
        {activeTab === 1 && (
          <div className="animate-fade">
            {/* Row 1: Avatar Upload + Pet Name */}
            <div className="form-field-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <div className="avatar-upload-circle" style={{ margin: 0, width: 70, height: 70, flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>
                {avatar ? (
                  <>
                    <img src={avatar} alt="Avatar" className="avatar-upload-preview" />
                    <div className="avatar-upload-overlay" style={{ fontSize: 8, padding: '2px 0' }}>换照片</div>
                  </>
                ) : (
                  <>
                    <span className="avatar-upload-icon" style={{ fontSize: 18, marginBottom: 2 }}>📸</span>
                    <span className="avatar-upload-label" style={{ fontSize: 8 }}>上传</span>
                  </>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">🏷️</span>
                  <span>宠物姓名</span>
                </label>
                <input 
                  type="text" 
                  placeholder="爱宠姓名" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="text-input-field"
                />
              </div>
            </div>

            {/* Row 2: Gender & Birthdate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">⚧️</span>
                  <span>宠物性别</span>
                </label>
                <select 
                  value={sex} 
                  onChange={e => setSex(e.target.value)} 
                  className="text-input-field"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="male">公 ♂</option>
                  <option value="female">母 ♀</option>
                  <option value="unknown">保密 🔒</option>
                </select>
              </div>
              
              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">📅</span>
                  <span>出生日期</span>
                </label>
                <input 
                  type="date" 
                  value={birthDate} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => handleDateChange(e.target.value)} 
                  className="text-input-field"
                  style={{ colorScheme: 'dark', background: 'rgba(0,0,0,0.3)' }}
                />
              </div>
            </div>

            {dateError && (
              <div style={{ color: 'var(--color-error)', fontSize: 11, fontWeight: '700', padding: '0 4px', marginTop: -14, marginBottom: 14 }}>
                ⚠️ {dateError}
              </div>
            )}

            {/* Row 3: Breed & Body Size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-field-card" style={{ margin: 0, position: 'relative' }} ref={dropdownRef}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">🐶</span>
                  <span>品种</span>
                </label>
                <input 
                  type="text" 
                  placeholder="搜索品种" 
                  value={breedSearch} 
                  onChange={e => { setBreedSearch(e.target.value); setShowBreedDropdown(true); }}
                  onFocus={() => setShowBreedDropdown(true)}
                  className="text-input-field"
                />
                {showBreedDropdown && (
                  <div className="search-select-dropdown">
                    {filteredBreeds.map(b => (
                      <div 
                        key={b.id} 
                        className="search-select-dropdown-item"
                        onClick={() => handleBreedSelect(b)}
                      >
                        <img src={b.img || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=100'} alt="" />
                        <span>{b.name}</span>
                      </div>
                    ))}
                    <div 
                      className="search-select-dropdown-item"
                      style={{ fontWeight: 600, color: 'var(--primary)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      onClick={handleCustomBreedSelect}
                    >
                      <span>✨ 其它（自定义）</span>
                    </div>
                  </div>
                )}
                {breedId === 'custom' && (
                  <input 
                    placeholder="名称..." 
                    value={customBreed} 
                    onChange={e => setCustomBreed(e.target.value)}
                    className="text-input-field" 
                    style={{ marginTop: 8, borderColor: 'var(--primary)', background: 'rgba(0,230,255,0.02)' }}
                  />
                )}
              </div>

              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">📐</span>
                  <span>体型</span>
                </label>
                <select 
                  value={bodySize} 
                  onChange={e => setBodySize(e.target.value)} 
                  className="text-input-field"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="mini" disabled={isSizeDisabled('mini')}>迷你型</option>
                  <option value="small" disabled={isSizeDisabled('small')}>小型</option>
                  <option value="medium" disabled={isSizeDisabled('medium')}>中型</option>
                  <option value="large" disabled={isSizeDisabled('large')}>大型</option>
                  <option value="giant" disabled={isSizeDisabled('giant')}>巨型</option>
                </select>
              </div>
            </div>

            {/* Row 4: Activity & Environment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">⚡</span>
                  <span>活动水平</span>
                </label>
                <select 
                  value={activityLevel} 
                  onChange={e => setActivityLevel(e.target.value)} 
                  className="text-input-field"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="low">低度活跃</option>
                  <option value="medium">中度活跃</option>
                  <option value="high">高度活跃</option>
                  <option value="working">工作犬 🐕‍🦺</option>
                </select>
              </div>

              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">🏠</span>
                  <span>喂养环境</span>
                </label>
                <select 
                  value={environment} 
                  onChange={e => setEnvironment(e.target.value)} 
                  className="text-input-field"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="indoor">室内喂养</option>
                  <option value="outdoor">室外喂养</option>
                  <option value="mixed">混合喂养</option>
                </select>
              </div>
            </div>

            {/* Row 5: Weight & Target Weight & BCS */}
            <div className="form-field-card">
              <label className="form-field-label">
                <span className="form-field-icon">⚖️</span>
                <span>体重指标与 BCS 评分</span>
              </label>
              
              <div className="weight-row-grid">
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 6 }}>当前体重 (kg)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setWeight(Math.max(0.5, parseFloat((weight - 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,255,0.12)', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', minWidth: 40, textAlign: 'center' }}>{weight}</span>
                    <button onClick={() => setWeight(Math.min(100, parseFloat((weight + 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,230,255,0.12)', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 6 }}>目标体重 (kg)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setTargetWeight(Math.max(0.5, parseFloat((targetWeight - 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(157,0,255,0.12)', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--secondary)', minWidth: 40, textAlign: 'center' }}>{targetWeight}</span>
                    <button onClick={() => setTargetWeight(Math.min(100, parseFloat((targetWeight + 0.5).toFixed(1))))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(157,0,255,0.12)', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>

              <div className="bcs-scale-card">
                <div className="bcs-scale-header">
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                    {bcsLoading ? '🤖 AI 评估中...' : '体况评分 (BCS)'}
                  </div>
                  <span className={`bcs-scale-label ${displayBcsScore <= 3 ? 'bcs-color-1-3' : displayBcsScore === 4 ? 'bcs-color-4' : displayBcsScore === 5 ? 'bcs-color-5' : displayBcsScore === 6 ? 'bcs-color-6' : 'bcs-color-7-9'}`}>
                    {displayBcsScore} 分 - {displayBcsLabel}
                  </span>
                </div>
                
                <div className="bcs-scale-bar-bg">
                  <div 
                    className={`bcs-scale-bar-fill`} 
                    style={{ 
                      width: `${(displayBcsScore / 9) * 100}%`,
                      background: displayBcsScore <= 3 ? '#60a5fa' : displayBcsScore === 4 ? '#22d3ee' : displayBcsScore === 5 ? '#34d399' : displayBcsScore === 6 ? '#fbbf24' : '#f87171'
                    }} 
                  />
                </div>
                
                <div className="bcs-scale-description" style={{ opacity: bcsLoading ? 0.5 : 1 }}>
                  {displayBcsDescription} 
                  {selectedBreed && selectedBreed.id !== 'custom' && (
                    <span style={{ color: 'var(--primary)', marginLeft: 4 }}>
                      (当前标准重参考：{displayStandardWeight}kg，成年：{selectedBreed.weight_avg}kg)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 6: Feeding Goal */}
            <div className="form-field-card">
              <label className="form-field-label">
                <span className="form-field-icon">🎯</span>
                <span>喂养目标</span>
              </label>
              <div className="selector-chip-grid">
                {Object.entries(goalLabels).map(([key, label]) => (
                  <button 
                    key={key} 
                    className={`select-chip-btn ${feedingGoal === key ? 'active' : ''}`}
                    onClick={() => setFeedingGoal(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transition CTA */}
            <button 
              className="btn-primary" 
              disabled={!!dateError || !breedId || (breedId === 'custom' && !customBreed)} 
              onClick={() => setActiveTab(2)}
              style={{ 
                marginTop: 10,
                opacity: (dateError || !breedId || (breedId === 'custom' && !customBreed)) ? 0.4 : 1 
              }}
            >
              下一步：健康档案录入 →
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PAGE 2: HEALTH PROFILE PANEL                                   */}
        {/* ============================================================== */}
        {activeTab === 2 && (
          <div className="animate-fade">
            
            {/* 1. Special Period */}
            <div className="form-field-card">
              <label className="form-field-label">
                <span className="form-field-icon">🕒</span>
                <span>宠物特殊时期与绝育状态 (单选)</span>
              </label>
              <div className="selector-grid-three" style={{ gap: 8 }}>
                {Object.entries(periodOptions).map(([key, label]) => {
                  const isPregnancyOrLactation = key === 'pregnancy' || key === 'lactation';
                  const disabled = sex === 'male' && isPregnancyOrLactation;
                  return (
                    <button 
                      key={key} 
                      disabled={disabled}
                      className={`select-card-btn ${specialOption === key ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => setSpecialOption(key)}
                      style={{ fontSize: 11, padding: '10px 4px' }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {sex === 'male' && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#f87171', lineHeight: 1.4 }}>
                  * 公 ♂ 宠物已自动禁用“妊娠期”及“哺乳期”选项。
                </div>
              )}
            </div>

            {/* 2. Allergens & Symptoms (Row 2: Combined Text Inputs) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">🦠</span>
                  <span>过敏源类型</span>
                </label>
                <input 
                  type="text" 
                  placeholder="如：牛肉、避开谷物" 
                  value={allergensText} 
                  onChange={e => setAllergensText(e.target.value)} 
                  className="text-input-field" 
                />
              </div>

              <div className="form-field-card" style={{ margin: 0 }}>
                <label className="form-field-label" style={{ marginBottom: 6 }}>
                  <span className="form-field-icon">🤢</span>
                  <span>过敏表现</span>
                </label>
                <input 
                  type="text" 
                  placeholder="如：红斑、软便脱水" 
                  value={allergySymptomsText} 
                  onChange={e => setAllergySymptomsText(e.target.value)} 
                  className="text-input-field" 
                />
              </div>
            </div>

            {/* 3. Allergy Severity */}
            <div className="form-field-card">
              <label className="form-field-label">
                <span className="form-field-icon">⚠️</span>
                <span>过敏反应程度</span>
              </label>
              <div className="selector-grid-three">
                {Object.entries(severityLabels).map(([key, label]) => (
                  <button 
                    key={key} 
                    className={`select-card-btn ${allergySeverity === key ? 'active' : ''}`}
                    onClick={() => setAllergySeverity(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Health Issues List */}
            <div className="form-field-card">
              <label className="form-field-label">
                <span className="form-field-icon">🩺</span>
                <span>宠物健康历史 (可多选)</span>
              </label>
              <div className="selector-chip-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {Object.entries(healthIssues).map(([key, label]) => {
                  const isSelected = healthTags.includes(key);
                  return (
                    <button 
                      key={key} 
                      className={`select-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setHealthTags(healthTags.filter(t => t !== key));
                        } else {
                          setHealthTags([...healthTags, key]);
                        }
                      }}
                      style={{ fontSize: 11, padding: '8px 4px' }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm Save */}
            <div style={{ display: 'flex', gap: 12, marginTop: 15 }}>
              <button 
                className="select-card-btn" 
                style={{ width: '30%', padding: '14px 0' }}
                onClick={() => handleSave(false)}
              >
                保存
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => handleSave(true)}
              >
                保存并进行AI分析 →
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
