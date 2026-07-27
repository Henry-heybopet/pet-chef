// TopBar.jsx — 顶部导航栏（独立组件）
import React from 'react';

export default function TopBar({ onBack, title = '', tone = 'default' }) {
  const isRecipeTone = tone === 'recipe';

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: 'var(--topbar-padding)',
      position: 'sticky', top: 0, zIndex: 10,
      background: isRecipeTone ? 'var(--theme-nutrition-soft)' : 'var(--theme-surface)',
      borderBottom: '1px solid var(--theme-divider)',
      boxShadow: '0 6px 18px rgba(48, 75, 57, 0.08)',
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: isRecipeTone ? 'var(--theme-surface)' : 'var(--theme-surface-soft)',
          border: '1px solid var(--theme-border)',
          borderRadius: '50%', width: 44, height: 44,
          color: isRecipeTone ? 'var(--theme-nutrition)' : 'var(--theme-text-primary)', cursor: 'pointer',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(73, 85, 76, 0.10)',
        }}>←</button>
      )}
      {title && (
        <span style={{
          marginLeft: 12,
          fontWeight: 800,
          fontSize: 17,
          color: isRecipeTone ? 'var(--theme-nutrition)' : 'var(--text-main)',
        }}>{title}</span>
      )}
    </div>
  );
}
