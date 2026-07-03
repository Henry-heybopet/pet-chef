// AIInputScreen.jsx — AI健康食谱：三角形输入界面 (i18n)
import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import SafetyWarning from './SafetyWarning';
import CautionNotice from './CautionNotice';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';

export default function AIInputScreen({ onBack, onAnalyze, lang }) {
  const t = useTranslation(lang);
  const [breeds, setBreeds] = useState([]);
  const [breedId, setBreedId] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [age, setAge] = useState(3);
  const [weight, setWeight] = useState(15);
  const [ingredients, setIngredients] = useState('');
  const [safetyResult, setSafetyResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBreeds().then(d => { if (d.success) setBreeds(d.breeds); });
  }, []);

  const handleBreedChange = (id) => {
    setBreedId(id);
    const b = breeds.find(b => b.id === id);
    if (b) setWeight(b.weight_avg || 15);
  };

  // 食材安全检查
  const checkIngredientSafety = async (ingredientList) => {
    setChecking(true);
    try {
      const res = await fetch('/api/ingredients/safety-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientList }),
      });
      const data = await res.json();
      setSafetyResult(data);
      return data;
    } catch (err) {
      console.error('Safety check failed:', err);
      return null;
    } finally {
      setChecking(false);
    }
  };

  const handleAnalyze = async () => {
    if (!breedId) return;

    // 如果有食材输入，先执行安全检查
    if (ingredients.trim()) {
      const ingredientList = ingredients.split(/[,，;\n]+/).map(s => s.trim()).filter(Boolean);
      const safety = await checkIngredientSafety(ingredientList);

      if (safety?.has_toxic) {
        // 有毒性食材，不继续
        return;
      }
    }

    setLoading(true);
    const breed = breeds.find(b => b.id === breedId);
    const breedName = breedId === 'custom' ? customBreed : breed?.name;
    const result = await api.aiAnalysis({ breedId, breedName, age, weight, ingredients: ingredients.trim(), customBreedName: customBreed, lang });
    setLoading(false);
    if (result.success) {
      onAnalyze({ breedId, breedName, age, weight, breed, analysis: result.analysis });
    }
  };

  const isReady = breedId && (breedId !== 'custom' || customBreed);
  const selectedBreed = breeds.find(b => b.id === breedId);
  const toxicIngredients = safetyResult?.toxic_ingredients || [];
  const cautionIngredients = safetyResult?.caution_ingredients || [];
  const hasToxic = safetyResult?.has_toxic;
  const canProceed = !hasToxic;

  // 三角形顶点位置
  const circleStyle = {
    width: 130, height: 130, borderRadius: '50%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid', position: 'relative',
    cursor: 'pointer',
  };

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <TopBar onBack={onBack} title={t('aiTitle')} />
      <div style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 32, textAlign: 'center' }}>
          {t('aiSubtitle')}
        </p>

        {/* 三角形三圆输入 */}
        <div style={{ position: 'relative', height: 320, marginBottom: 32 }}>
          {/* SVG 连接线 */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="50,8 10,78 90,78"
              fill="none" stroke="rgba(0,230,255,0.15)" strokeWidth="0.5" />
          </svg>

          {/* 顶部：犬种 */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{
              ...circleStyle,
              borderColor: breedId ? 'var(--primary)' : 'rgba(0,230,255,0.3)',
              background: breedId ? 'rgba(0,230,255,0.08)' : 'rgba(255,255,255,0.03)',
              boxShadow: breedId ? '0 0 20px rgba(0,230,255,0.2)' : 'none',
            }}>
              {selectedBreed?.img ? (
                <img src={selectedBreed.img} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginBottom: 6 }} />
              ) : (
                <div style={{ fontSize: 32, marginBottom: 6 }}>🐕</div>
              )}
              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                {breedId === 'custom' ? (customBreed || t('breed')) : (selectedBreed?.name ? tData(selectedBreed.name, lang) : t('selectBreed'))}
              </span>
            </div>
            {/* 犬种下拉选择器（绝对定位，触摸整个圆形区域） */}
            <select
              value={breedId}
              onChange={e => handleBreedChange(e.target.value)}
              style={{
                position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%',
              }}
            >
              <option value="">{t('selectBreed')}</option>
              {breeds.filter(b => !b.is_custom).map(b => (
                <option key={b.id} value={b.id}>{tData(b.name, lang)}</option>
              ))}
              <option value="custom">{t('otherCustom')}</option>
            </select>
          </div>

          {/* 左下：年龄 */}
          <div style={{ position: 'absolute', bottom: 0, left: '8%' }}>
            <div style={{
              ...circleStyle,
              borderColor: 'rgba(157,0,255,0.5)',
              background: 'rgba(157,0,255,0.05)',
              boxShadow: '0 0 16px rgba(157,0,255,0.15)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--secondary)' }}>{age}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{t('yr')}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button onClick={() => setAge(Math.max(0.1, parseFloat((age - 0.5).toFixed(1))))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(157,0,255,0.2)', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: 14 }}>−</button>
                <button onClick={() => setAge(Math.min(20, parseFloat((age + 0.5).toFixed(1))))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(157,0,255,0.2)', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: 14 }}>+</button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>{t('age')}</div>
            </div>
          </div>

          {/* 右下：体重 */}
          <div style={{ position: 'absolute', bottom: 0, right: '8%' }}>
            <div style={{
              ...circleStyle,
              borderColor: 'rgba(0,255,163,0.5)',
              background: 'rgba(0,255,163,0.05)',
              boxShadow: '0 0 16px rgba(0,255,163,0.15)',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#00FFA3' }}>{weight}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{t('kg')}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button onClick={() => setWeight(Math.max(1, parseFloat((weight - 0.5).toFixed(1))))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,255,163,0.1)', border: 'none', color: '#00FFA3', cursor: 'pointer', fontSize: 14 }}>−</button>
                <button onClick={() => setWeight(Math.min(80, parseFloat((weight + 0.5).toFixed(1))))}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,255,163,0.1)', border: 'none', color: '#00FFA3', cursor: 'pointer', fontSize: 14 }}>+</button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>{t('weight')}</div>
            </div>
          </div>
        </div>

        {/* 自定义犬种输入 */}
        {breedId === 'custom' && (
          <input
            placeholder={t('enterBreed')}
            value={customBreed}
            onChange={e => setCustomBreed(e.target.value)}
            style={{
              width: '100%', marginBottom: 24, padding: '12px 16px',
              background: 'rgba(0,230,255,0.05)', border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 15, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}

        {/* 食材输入 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--gray)', marginBottom: 8 }}>
            食材列表（可选，逗号分隔）
          </label>
          <textarea
            placeholder="例如：鸡胸肉, 胡萝卜, 南瓜"
            value={ingredients}
            onChange={e => { setIngredients(e.target.value); setSafetyResult(null); }}
            style={{
              width: '100%', minHeight: 80, padding: '12px 16px',
              background: 'rgba(157,0,255,0.05)', border: '1px solid rgba(157,0,255,0.3)',
              borderRadius: 'var(--radius-sm)', color: 'white', fontSize: 14, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 安全检查结果 */}
        {safetyResult && (
          <div style={{ marginBottom: 16 }}>
            <SafetyWarning toxicIngredients={toxicIngredients} />
            <CautionNotice cautionIngredients={cautionIngredients} />
          </div>
        )}

        <button
          className="btn-primary"
          disabled={!isReady || loading || checking || hasToxic}
          onClick={handleAnalyze}
          style={{ opacity: (!isReady || loading || checking || hasToxic) ? 0.5 : 1, boxShadow: isReady ? '0 0 30px rgba(0,230,255,0.4)' : 'none' }}
        >
          {checking ? '安全检查中...' : loading ? t('analyzing') : t('startAnalysis')}
        </button>
      </div>
    </div>
  );
}
