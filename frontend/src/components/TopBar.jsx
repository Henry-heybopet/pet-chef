// TopBar.jsx — 顶部导航栏（独立组件）
import React from 'react';

export default function TopBar({ onBack, title = '' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: 'calc(16px + var(--safe-top)) 24px 12px',
      position: 'sticky', top: 0, zIndex: 10,
      background: 'linear-gradient(to bottom, rgba(10,13,20,1) 60%, transparent)',
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50%', width: 40, height: 40, color: 'white', cursor: 'pointer',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>←</button>
      )}
      {title && (
        <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 17, color: 'var(--text-main)' }}>{title}</span>
      )}
    </div>
  );
}
