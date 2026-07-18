// QuickEntryRow.jsx — 快捷入口行
import React from 'react';

const QUICK_ENTRIES = [
  { key: 'ai_recipe',  label: 'AI 配餐', icon: '🤖', color: '#9D00FF' },
  { key: 'my_pet',    label: '我的宠物', icon: '🐕', color: '#00E6FF' },
  { key: 'favorites',  label: '收藏', icon: '❤️', color: '#FF6B6B' },
  { key: 'history',    label: '历史', icon: '📋', color: '#7CFFB2' },
];

export default function QuickEntryRow({ onEntry }) {
  return (
    <div className="quick-entry-row">
      {QUICK_ENTRIES.map(entry => (
        <button
          key={entry.key}
          className="quick-entry-item"
          onClick={() => onEntry?.(entry.key)}
          style={{ '--entry-color': entry.color }}
        >
          <span className="quick-entry-icon">{entry.icon}</span>
          <span className="quick-entry-label">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}
