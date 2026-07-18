// RecentRecords.jsx — 最近烹饪记录
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

// Mock 最近记录
const MOCK_RECORDS = [
  { id: 'r1', recipeName: '鸡胸肉蔬菜杂粮饭', date: '2026-06-20', rating: 5 },
  { id: 'r2', recipeName: '三文鱼南瓜套餐', date: '2026-06-18', rating: 4 },
  { id: 'r3', recipeName: '牛肉胡萝卜饭', date: '2026-06-15', rating: 5 },
];

export default function RecentRecords() {
  const { lang } = useLanguage();
  const records = MOCK_RECORDS;

  if (!records || records.length === 0) {
    return null;
  }

  return (
    <div className="recent-records">
      <h3 className="recent-records-title">最近烹饪</h3>
      <div className="recent-records-list">
        {records.map(record => (
          <div key={record.id} className="recent-record-item">
            <span className="recent-record-icon">🍲</span>
            <div className="recent-record-info">
              <span className="recent-record-name">{record.recipeName}</span>
              <span className="recent-record-date">{record.date}</span>
            </div>
            <span className="recent-record-rating">⭐ {record.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
