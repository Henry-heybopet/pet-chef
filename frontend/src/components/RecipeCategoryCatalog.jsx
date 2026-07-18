import React from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';

const CATEGORIES = {
  age: [
    { key: 'puppy_general', label: '幼犬通用', icon: '🍼', desc: '幼犬成长基础配方，覆盖日常发育需求', query: { custom_category: 'puppy_general' } },
    { key: 'puppy_calcium', label: '控钙幼犬（大型幼犬）', icon: '🦴', desc: '大型幼犬稳骨控钙，控制钙磷比例', query: { custom_category: 'puppy_calcium' } },
    { key: 'adult_general', label: '成犬通用', icon: '🐕', desc: '成犬日常维护，能量与营养均衡', query: { custom_category: 'adult_general' } },
    { key: 'senior_general', label: '老年犬通用', icon: '🦮', desc: '老年犬轻负担配方，支持消化与活力', query: { custom_category: 'senior_general' } },
  ],
  ingredient: [
    { key: 'protein_chicken', label: '鸡肉蛋白质', icon: '🍗', desc: '含鸡肉、鸡心或鸡肝的蛋白来源', query: { custom_category: 'protein_chicken' } },
    { key: 'protein_beef', label: '牛肉蛋白质', icon: '🥩', desc: '含牛肉、牛心或牛肝的蛋白来源', query: { custom_category: 'protein_beef' } },
    { key: 'protein_fish', label: '鱼肉蛋白质', icon: '🐟', desc: '含金枪鱼等鱼肉蛋白来源', query: { custom_category: 'protein_fish' } },
    { key: 'protein_other', label: '其它肉类蛋白质', icon: '🍖', desc: '含兔肉、鸭肉等其它肉类蛋白', query: { custom_category: 'protein_other' } },
  ],
  health: [
    { key: 'skin', label: '美毛护肤', icon: '/recipe-category-icons/skin.png', desc: '围绕皮肤屏障、亮毛与抗敏护理', query: { custom_category: 'skin' } },
    { key: 'liver', label: '护肝', icon: '/recipe-category-icons/liver.png', desc: '护肝功能包与低负担蛋白组合', query: { custom_category: 'liver' } },
    { key: 'hypoallergenic', label: '低敏单一蛋白', icon: '/recipe-category-icons/hypoallergenic.png', desc: '单一蛋白来源，降低过敏干扰', query: { custom_category: 'hypoallergenic' } },
    { key: 'low_fat', label: '低脂食谱', icon: '/recipe-category-icons/low-fat.png', desc: '标注低脂的轻负担配方', query: { custom_category: 'low_fat' } },
    { key: 'joint', label: '关节养护', icon: '/recipe-category-icons/joint.png', desc: '含关节支持功能包或护关节标签', query: { custom_category: 'joint' } },
  ],
};

export default function RecipeCategoryCatalog({ onBack, onSelectCategory, lang }) {
  const t = useTranslation(lang);

  const handleCategoryClick = (cat) => {
    onSelectCategory({
      id: cat.key,
      label: cat.label,
      query: cat.query,
      desc: cat.desc
    });
  };

  const renderMiniCards = (items) => (
    <div style={styles.gridTwoCol}>
      {items.map(cat => (
        <div
          key={cat.key}
          onClick={() => handleCategoryClick(cat)}
          style={styles.cardMini}
          className="card selectable-card"
        >
          {typeof cat.icon === 'string' && cat.icon.startsWith('/') ? (
            <img src={cat.icon} alt="" style={styles.cardIconImage} />
          ) : (
            <span style={styles.cardEmoji}>{cat.icon}</span>
          )}
          <div style={styles.miniTitle}>{cat.label}</div>
          <div style={styles.miniDesc}>{cat.desc}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 80 }}>
      <TopBar onBack={onBack} title={t('recipeCatalogTitle')} />

      <div style={{ padding: '0 20px' }}>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24, textAlign: 'center', padding: '0 10px' }}>
          {t('recipeCatalogDesc')}
        </p>

        <div style={{ marginBottom: 28 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📅</span>
            <span style={styles.sectionTitle}>{t('ageCategoryTitle')}</span>
          </div>
          <div style={styles.gridOneCol}>
            {CATEGORIES.age.map(cat => (
              <div
                key={cat.key}
                onClick={() => handleCategoryClick(cat)}
                style={styles.card}
                className="card selectable-card"
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardEmoji}>{cat.icon}</span>
                  <div>
                    <div style={styles.cardTitle}>{cat.label}</div>
                    <div style={styles.cardDesc}>{cat.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🥣</span>
            <span style={styles.sectionTitle}>{t('ingredientCategoryTitle')}</span>
          </div>
          {renderMiniCards(CATEGORIES.ingredient)}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⚡</span>
            <span style={styles.sectionTitle}>{t('funcCategoryTitle')}</span>
          </div>
          {renderMiniCards(CATEGORIES.health)}
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '8px',
  },
  sectionIcon: {
    fontSize: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#00e6ff',
    letterSpacing: '0.5px',
  },
  gridOneCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  gridTwoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  card: {
    padding: '16px',
    background: 'rgba(20,27,45,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  cardEmoji: {
    fontSize: '28px',
    flexShrink: 0,
  },
  cardIconImage: {
    width: 34,
    height: 34,
    objectFit: 'contain',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  cardMini: {
    padding: '14px',
    background: 'rgba(20,27,45,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
  },
  miniTitle: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#ffffff',
  },
  miniDesc: {
    fontSize: '10px',
    color: '#94a3b8',
    lineHeight: '1.4',
    textAlign: 'left',
  },
};
