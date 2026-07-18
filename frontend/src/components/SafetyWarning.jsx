// SafetyWarning.jsx — 危险食材警告组件
import React from 'react';

export default function SafetyWarning({ toxicIngredients, onRemove }) {
  if (!toxicIngredients || toxicIngredients.length === 0) return null;

  return (
    <div className="safety-warning">
      <div className="safety-warning-header">
        <span className="safety-warning-icon">⚠️</span>
        <span className="safety-warning-title">发现危险食材</span>
      </div>
      <div className="safety-warning-list">
        {toxicIngredients.map((item, idx) => (
          <div key={idx} className="safety-warning-item">
            <span className="safety-warning-name">{item.name}</span>
            <span className="safety-warning-reason">{item.reason}</span>
          </div>
        ))}
      </div>
      <p className="safety-warning-message">请移除危险食材后再生成食谱</p>
    </div>
  );
}
