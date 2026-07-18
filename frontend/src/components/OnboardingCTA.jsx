// OnboardingCTA.jsx — 引导完成后未烹饪用户的行动号召
import React from 'react';
import { useLanguage, LANGS } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';

export default function OnboardingCTA({ onStart }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);

  return (
    <div className="animate-fade onboarding-cta">
      <div className="onboarding-cta-hero">
        <div className="onboarding-cta-icon">🎉</div>
        <h2 className="onboarding-cta-title">准备好了！</h2>
        <p className="onboarding-cta-desc">
          你的宠物档案已设置完成，现在开始为你生成专属食谱吧！
        </p>
      </div>
      <button className="btn-primary onboarding-cta-button" onClick={onStart}>
        开始探索食谱
      </button>
    </div>
  );
}
