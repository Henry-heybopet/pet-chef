// TodayRecommendCard.jsx — 今日推荐食谱卡片
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';

// Mock 推荐食谱数据
const MOCK_RECIPE = {
  id: 'rec_001',
  name: '鸡胸肉蔬菜杂粮饭',
  name_en: 'Chicken & Veggie Grain Bowl',
  image: '/recipe_placeholder.jpg',
  tags: ['高蛋白', '低敏', '均衡'],
  nutrition: { calories: 320, protein: 28, fat: 12 },
  rating: 4.8,
};

export default function TodayRecommendCard({ onClick }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const recipe = MOCK_RECIPE;

  return (
    <div className="today-recommend-card" onClick={onClick}>
      <div className="today-recommend-badge">今日推荐</div>
      <div className="today-recommend-content">
        <div className="today-recommend-img-wrap">
          <div className="today-recommend-img-placeholder">🍲</div>
        </div>
        <div className="today-recommend-info">
          <h3 className="today-recommend-name">
            {lang === 'en' ? recipe.name_en : recipe.name}
          </h3>
          <div className="today-recommend-tags">
            {recipe.tags.map(tag => (
              <span key={tag} className="today-recommend-tag">{tag}</span>
            ))}
          </div>
          <div className="today-recommend-nutrition">
            <span>{recipe.nutrition.calories} kcal</span>
            <span>·</span>
            <span>蛋白质 {recipe.nutrition.protein}g</span>
          </div>
        </div>
      </div>
      <div className="today-recommend-rating">
        ⭐ {recipe.rating}
      </div>
    </div>
  );
}
