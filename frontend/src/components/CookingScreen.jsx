// CookingScreen.jsx — Cooking with 4-stage progress (i18n)
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';

export default function CookingScreen({ onBack, cookingData, lang }) {
  const t = useTranslation(lang);
  const STAGES = [
    { id: 'load', name: t('stageLoad'), icon: '🥣' },
    { id: 'preheat', name: t('stagePreheat'), icon: '🔥' },
    { id: 'cook', name: t('stageCook'), icon: '♨️' },
    { id: 'done', name: t('stageDone'), icon: '✅' },
  ];

  const { recipe, profile, intake, cookParams, displayGrams } = cookingData;
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [tuyaStatus, setTuyaStatus] = useState(null);
  const timerRef = useRef(null);
  const tuyaRef = useRef(null);

  const waterGrams = Math.round(displayGrams * 0.15);
  const waterContent = (cookParams.water_content_pct || 70) / 100;
  const waterDelta = Math.max(0, waterContent - 0.60);
  const preheat_per_100g = Math.max(10, 22.5 - waterDelta * 60);
  const cook_per_100g = Math.max(120, 270 - waterDelta * 120);
  const preheatSec = Math.round(preheat_per_100g * Math.pow(displayGrams / 100, 0.9));
  const cookSec = Math.round(cook_per_100g * Math.pow(displayGrams / 100, 0.75));
  const totalCookTime = preheatSec + cookSec;
  const stageDurations = [0, preheatSec, cookSec, 0];

  const handleStart = async () => {
    setStarted(true); setStage(1); setElapsed(0);
    try { await api.tuyaStart({ temperature: cookParams.temperature, power: cookParams.power, speed: cookParams.speed, cook_time: totalCookTime }); } catch {}
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    tuyaRef.current = setInterval(async () => { try { const s = await api.tuyaStatus(); setTuyaStatus(s.status); } catch {} }, 5000);
  };

  const handleStop = async () => {
    clearInterval(timerRef.current); clearInterval(tuyaRef.current);
    try { await api.tuyaStop(); } catch {}
    setStarted(false); setStage(0); setElapsed(0);
  };

  useEffect(() => {
    if (!started) return;
    const dur = stageDurations[stage];
    if (dur > 0 && elapsed >= dur) {
      setStage(s => { const next = s + 1; if (next >= STAGES.length - 1) { clearInterval(timerRef.current); clearInterval(tuyaRef.current); } return next; });
      setElapsed(0);
    }
  }, [elapsed, stage, started]);

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(tuyaRef.current); }, []);

  const formatTime = (sec) => {
    if (sec <= 0) return '--';
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? (sec % 60) + 's' : ''}`;
  };

  const stageProgress = stage >= 1 && stageDurations[stage] > 0 ? Math.min(100, (elapsed / stageDurations[stage]) * 100) : (stage === 0 ? 0 : 100);

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <div style={{ padding: '12px 24px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <img src="/logo.png" alt="HeyboPet" style={{ width: '60%', maxWidth: 220, display: 'block', margin: '0 auto' }} />
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>
          {tData(profile.breedName, lang)} · 「{tData(recipe.name, lang)}」· {displayGrams}g
        </div>
      </div>
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 240 }}>
          <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
            <img src="/machine.jpg" alt="Machine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = '/machine.png'; e.target.onerror = null; }} />
            {started && stage > 0 && stage < 3 && (
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, ${stage === 1 ? 'rgba(255,150,0,0.25)' : 'rgba(0,230,255,0.2)'} 0%, transparent 70%)`, animation: 'pulse 2s ease-in-out infinite' }} />
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: t('temperature'), value: `${cookParams.temperature}℃`, color: '#FF6B35', icon: '🌡' },
              { label: t('speed'), value: '60 rpm', color: 'var(--primary)', icon: '🔄' },
              { label: t('powerLevel'), value: `${cookParams.power} ${t('level')}`, color: 'var(--theme-warning)', icon: '⚡' },
              { label: t('waterAmount'), value: `${waterGrams}g`, color: 'var(--theme-nutrition)', icon: '💧' },
            ].map(p => (
              <div key={p.label} className="card glass" style={{ padding: '10px 12px', flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--gray)' }}>{p.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {STAGES.map((s, i) => {
            const isDone = stage > i; const isActive = stage === i;
            return (
              <div key={s.id} style={{ flex: 1 }}>
                <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: isDone ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
                  {isActive && stageDurations[i] > 0 && <div style={{ width: `${stageProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 1s linear' }} />}
                  {isActive && stageDurations[i] === 0 && <div style={{ width: '100%', height: '100%', background: 'rgba(0,230,255,0.3)' }} />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {STAGES.map((s, i) => {
            const isDone = stage > i; const isActive = stage === i;
            return (
              <div key={s.id} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16 }}>{isDone ? '✅' : s.icon}</div>
                <div style={{ fontSize: 9, color: isActive || isDone ? 'var(--primary)' : 'var(--gray)', marginTop: 2, fontWeight: isActive ? 700 : 400 }}>{s.name}</div>
                <div style={{ fontSize: 8, color: 'var(--gray)', marginTop: 1 }}>
                  {stageDurations[i] > 0 ? formatTime(stageDurations[i]) : (i === 0 ? t('userOp') : t('done'))}
                </div>
              </div>
            );
          })}
        </div>
        {stage === 0 && !started && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,183,0,0.08)', borderRadius: 12, border: '1px solid rgba(255,183,0,0.2)' }}>
            <div style={{ fontWeight: 700, color: 'var(--theme-warning)', marginBottom: 4 }}>{t('prepSteps')}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6 }}>
              1. {t('prep1')}<br />
              2. {t('prep2')}<br />
              3. {t('prep3Add')} <strong style={{ color: 'var(--primary)' }}>{waterGrams}g</strong> {t('prep3Water')}<br />
              4. {t('prep4')}
            </div>
          </div>
        )}
        {stage > 0 && stage < 3 && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray)', marginBottom: 12 }}>
            {STAGES[stage].name} · {t('elapsed')} {formatTime(elapsed)} / {t('estimated')} {formatTime(stageDurations[stage])}
          </div>
        )}
        {stage === 3 && (
          <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,230,255,0.08)', borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{t('cookDone')}</div>
            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{t('cookDoneText')}</div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>{t('cookDoneDesc')}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack}>{t('back')}</button>
          {!started ? (
            <button className="btn-primary" style={{ flex: 2, boxShadow: '0 0 30px rgba(0,230,255,0.4)' }} onClick={handleStart}>{t('btnStart')}</button>
          ) : stage < 3 ? (
            <button onClick={handleStop} style={{ flex: 2, padding: '14px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--theme-danger-soft)', border: '1px solid var(--theme-danger)', color: 'var(--theme-danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{t('btnStop')}</button>
          ) : (
            <button className="btn-primary" style={{ flex: 2 }} onClick={onBack}>{t('btnHome')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
