{/* Pet Chef Ver B1.00 — 2026-06-22 */}
import React from 'react';

/**
 * BottomTabBar - Fixed bottom tab bar with glass morphism
 * Props: { tabs, activeTab, onSelect }
 * Default tabs: 🏠 首页, 🍲 食谱, 🐶 宠物, 🤖 烹饪, 📊 数据
 */
export default function BottomTabBar({ tabs, activeTab, onSelect }) {
  const defaultTabs = [
    { key: 'home', label: '首页', emoji: '🏠' },
    { key: 'recipes', label: '食谱', emoji: '🍲' },
    { key: 'pet', label: '宠物', emoji: '🐶' },
    { key: 'cook', label: '烹饪', emoji: '🤖' },
    { key: 'data', label: '数据', emoji: '📊' },
  ];

  const tabList = tabs || defaultTabs;

  return (
    <nav style={styles.container} role="tablist" aria-label="主导航">
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
            <span style={styles.emoji}>{tab.emoji}</span>
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
    background: 'rgba(10,13,20,0.85)',
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
    color: 'rgba(255,255,255,0.4)',
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
  label: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
};
