// CautionNotice.jsx — 警告食材提示组件
import React from 'react';

export default function CautionNotice({ cautionIngredients }) {
  if (!cautionIngredients || cautionIngredients.length === 0) return null;

  return (
    <div className="caution-notice">
      <div className="caution-notice-header">
        <span className="caution-notice-icon">💡</span>
        <span className="caution-notice-title">注意事项</span>
      </div>
      <div className="caution-notice-list">
        {cautionIngredients.map((item, idx) => (
          <div key={idx} className="caution-notice-item">
            <span className="caution-notice-name">{item.name}</span>
            <span className="caution-notice-reason">{item.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
