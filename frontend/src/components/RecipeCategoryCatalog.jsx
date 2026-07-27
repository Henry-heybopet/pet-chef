import React from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';

const CATEGORIES = {
  age: [
    { key: 'puppy_general', labelKey: 'categoryPuppyGeneral', descKey: 'categoryPuppyGeneralDesc', icon: '🍼', query: { custom_category: 'puppy_general' } },
    { key: 'puppy_calcium', labelKey: 'categoryPuppyCalcium', descKey: 'categoryPuppyCalciumDesc', icon: '🦴', query: { custom_category: 'puppy_calcium' } },
    { key: 'adult_general', labelKey: 'categoryAdultGeneral', descKey: 'categoryAdultGeneralDesc', icon: '🐕', query: { custom_category: 'adult_general' } },
    { key: 'senior_general', labelKey: 'categorySeniorGeneral', descKey: 'categorySeniorGeneralDesc', icon: '🦮', query: { custom_category: 'senior_general' } },
  ],
  ingredient: [
    { key: 'protein_chicken', labelKey: 'categoryProteinChicken', descKey: 'categoryProteinChickenDesc', icon: '🍗', query: { custom_category: 'protein_chicken' } },
    { key: 'protein_beef', labelKey: 'categoryProteinBeef', descKey: 'categoryProteinBeefDesc', icon: '🥩', query: { custom_category: 'protein_beef' } },
    { key: 'protein_fish', labelKey: 'categoryProteinFish', descKey: 'categoryProteinFishDesc', icon: '🐟', query: { custom_category: 'protein_fish' } },
    { key: 'protein_other', labelKey: 'categoryProteinOther', descKey: 'categoryProteinOtherDesc', icon: '🍖', query: { custom_category: 'protein_other' } },
  ],
  health: [
    { key: 'skin', labelKey: 'categorySkin', descKey: 'categorySkinDesc', icon: '/recipe-category-icons/skin.png', query: { custom_category: 'skin' } },
    { key: 'liver', labelKey: 'categoryLiver', descKey: 'categoryLiverDesc', icon: '/recipe-category-icons/liver.png', query: { custom_category: 'liver' } },
    { key: 'hypoallergenic', labelKey: 'categoryHypoallergenic', descKey: 'categoryHypoallergenicDesc', icon: '/recipe-category-icons/hypoallergenic.png', query: { custom_category: 'hypoallergenic' } },
    { key: 'low_fat', labelKey: 'categoryLowFat', descKey: 'categoryLowFatDesc', icon: '/recipe-category-icons/low-fat.png', query: { custom_category: 'low_fat' } },
    { key: 'joint', labelKey: 'categoryJoint', descKey: 'categoryJointDesc', icon: '/recipe-category-icons/joint.png', query: { custom_category: 'joint' } },
  ],
};

export default function RecipeCategoryCatalog({ onBack, onSelectCategory, lang }) {
  const t = useTranslation(lang);

  const handleCategoryClick = (cat) => {
    onSelectCategory({
      id: cat.key,
      label: t(cat.labelKey),
      query: cat.query,
      desc: t(cat.descKey)
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
          <div style={styles.miniTitle}>{t(cat.labelKey)}</div>
          <div style={styles.miniDesc}>{t(cat.descKey)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 80 }}>
      <TopBar onBack={onBack} title={t('recipeCatalogTitle')} tone="recipe" />

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
                    <div style={styles.cardTitle}>{t(cat.labelKey)}</div>
                    <div style={styles.cardDesc}>{t(cat.descKey)}</div>
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
    borderBottom: '1px solid var(--theme-divider)',
    paddingBottom: '8px',
  },
  sectionIcon: {
    fontSize: '16px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--theme-nutrition)',
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
    background: 'var(--theme-card)',
    border: '1px solid var(--theme-border)',
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
    color: 'var(--theme-text-primary)',
  },
  cardDesc: {
    fontSize: '11px',
    color: 'var(--theme-text-secondary)',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  cardMini: {
    padding: '14px',
    background: 'var(--theme-card)',
    border: '1px solid var(--theme-border)',
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
    color: 'var(--theme-text-primary)',
  },
  miniDesc: {
    fontSize: '10px',
    color: 'var(--theme-text-secondary)',
    lineHeight: '1.4',
    textAlign: 'left',
  },
};
