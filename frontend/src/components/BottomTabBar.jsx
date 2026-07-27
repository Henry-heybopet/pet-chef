{/* Pet Chef Ver B1.00 — 2026-06-22 */}
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';

/**
 * BottomTabBar - Fixed bottom tab bar with glass morphism
 * Props: { tabs, activeTab, onSelect }
 * Default tabs: 🏠 首页, 🍲 食谱, 🐶 宠物, 鲜食机 烹饪, 🛒 商城
 */
export default function BottomTabBar({ tabs, activeTab, onSelect }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const defaultTabs = [
    { key: 'home', label: t('navHome'), emoji: '🏠' },
    { key: 'recipes', label: t('navRecipes'), emoji: '🍲' },
    { key: 'pet', label: t('navPet'), emoji: '🐶' },
    { key: 'cook', label: t('navCook'), iconSrc: '/fresh-food-machine-nav.png' },
    { key: 'mall', label: t('navMall'), emoji: '🛒' },
  ];

  const tabList = tabs || defaultTabs;

  return (
    <nav style={styles.container} role="tablist" aria-label={t('navAria')}>
      {tabList.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect && onSelect(tab.key)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
          >
            {tab.iconSrc ? (
              <img src={tab.iconSrc} alt="" aria-hidden="true" style={styles.icon} />
            ) : (
              <span style={styles.emoji}>{tab.emoji}</span>
            )}
            <span style={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '430px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 'var(--safe-bottom, 0px)',
    background: 'var(--theme-nav-bg)',
    backdropFilter: 'blur(var(--glass-blur))',
    WebkitBackdropFilter: 'blur(var(--glass-blur))',
    borderTop: '1px solid var(--glass-border)',
    zIndex: 100,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--theme-caption)',
    cursor: 'pointer',
    flex: 1,
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: 'var(--color-primary)',
  },
  emoji: {
    fontSize: '22px',
    lineHeight: 1,
  },
  icon: {
    display: 'block',
    width: '26px',
    height: '26px',
    objectFit: 'contain',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
};
