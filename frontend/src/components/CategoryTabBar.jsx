{/* Pet Chef Ver B1.00 — 2026-06-22 */}
import React, { useRef } from 'react';

/**
 * CategoryTabBar - 5-category tab bar for recipe browsing
 * Props: { categories, activeCategory, onSelect }
 * Default categories: 🍗 基础营养, 🦴 功能调理, 🐕 品种专属, 🏥 医疗辅助, 😺 猫专用
 */
export default function CategoryTabBar({ categories, activeCategory, onSelect }) {
  const tabs = categories || [
    { key: 'basic', label: '基础营养', emoji: '🍗' },
    { key: 'functional', label: '功能调理', emoji: '🦴' },
    { key: 'breed', label: '品种专属', emoji: '🐕' },
    { key: 'medical', label: '医疗辅助', emoji: '🏥' },
    { key: 'cat', label: '猫专用', emoji: '😺' },
  ];

  const scrollRef = useRef(null);

  return (
    <div
      ref={scrollRef}
      style={styles.container}
      role="tablist"
      aria-label="食谱分类"
    >
      {tabs.map((tab) => {
        const isActive = activeCategory === tab.key;
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
            {isActive && <div style={styles.underline} />}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    scrollBehavior: 'smooth',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    cursor: 'pointer',
    position: 'relative',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: 'var(--color-primary)',
    background: 'rgba(0,230,255,0.08)',
  },
  emoji: {
    fontSize: '22px',
    lineHeight: 1,
  },
  label: {
    fontWeight: 600,
    fontSize: '11px',
    letterSpacing: '0.3px',
  },
  underline: {
    position: 'absolute',
    bottom: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '20px',
    height: '2px',
    borderRadius: '1px',
    background: 'var(--color-primary)',
  },
};
