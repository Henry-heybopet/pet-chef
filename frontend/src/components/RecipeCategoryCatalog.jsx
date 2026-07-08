import React, { useState } from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';

export default function RecipeCategoryCatalog({ onBack, onSelectCategory, lang }) {
  const t = useTranslation(lang);
  const [toastMessage, setToastMessage] = useState(null);

  const CATEGORIES = {
    age: [
      { key: 'puppy', label: 'B1 幼宠成长型', labelEn: 'B1 Puppy / Kitten', icon: '🍼', desc: '特配高蛋白、DHA、钙磷比例，助力成长', query: { custom_category: 'puppy' } },
      { key: 'adult', label: '成宠维持型', labelEn: 'Adult Maintenance', icon: '🐕', desc: '能量均衡配方，维持日常体能与肌群健康', query: { custom_category: 'adult' } },
      { key: 'senior', label: '老年支持型', labelEn: 'Senior Support', icon: '🦴', desc: '低磷、抗氧化、复合关节保护，延缓衰老', query: { custom_category: 'senior' } },
    ],
    function: [
      { key: 'skin', label: 'C1 美毛皮肤型', labelEn: 'C1 Skin & Coat', icon: '✨', desc: '富含 Omega-3、EPA、DHA、生物素，改善掉毛与皮肤敏感', query: { custom_category: 'skin' } },
      { key: 'digestive', label: 'C2 肠胃健康型', labelEn: 'C2 Digestive Care', icon: '🌱', desc: '添加益生元、益生菌、可溶性纤维，应对软便与挑食', query: { custom_category: 'digestive' } },
      { key: 'joint', label: 'C3 关节支持型', labelEn: 'C3 Joint Care', icon: '🦵', desc: '复配葡萄糖胺、软骨素、MSM，适合大型犬与老龄犬', query: { custom_category: 'joint' } },
      { key: 'urinary', label: 'C4 泌尿系统型', labelEn: 'C4 Urinary Care', icon: '💧', desc: '特添 DL-Methionine、蔓越莓，支持泌尿健康', query: { custom_category: 'urinary' }, isPending: true },
      { key: 'weight', label: 'C5 体重管理型', labelEn: 'C5 Weight Control', icon: '⚖️', desc: '高纤维、低脂肪，添加左旋肉碱（L-Carnitine）应对肥胖', query: { custom_category: 'weight' } },
      { key: 'anti_inflammatory', label: 'C6 抗炎免疫型', labelEn: 'C6 Anti-Inflammatory', icon: '🛡️', desc: 'Omega-3、姜黄素、复合抗氧化体系，对抗慢性炎症与衰老', query: { custom_category: 'anti_inflammatory' } },
    ],
    extended: [
      { key: 'calming', label: '焦虑舒缓配方', labelEn: 'Calming Support', icon: '🧘', desc: '舒缓紧张与焦虑情绪，提供情绪安抚支持', query: { custom_category: 'calming' }, isPending: true },
      { key: 'cardiac', label: '心脏支持配方', labelEn: 'Cardiac Support', icon: '❤️', desc: '富含牛磺酸与左旋肉碱，极效呵护心肌活力', query: { custom_category: 'cardiac' } },
      { key: 'liver', label: '肝脏支持配方', labelEn: 'Liver Support', icon: '🍀', desc: '选用易消化低铜优质蛋白，减轻肝脏代谢负担', query: { custom_category: 'liver' } },
      { key: 'renal', label: '肾脏支持配方', labelEn: 'Renal Support', icon: '🛡️', desc: '严格控制低磷、低蛋白，精细保护肾脏功能', query: { custom_category: 'renal' }, isPending: true },
      { key: 'brain', label: '认知支持配方', labelEn: 'Brain Support', icon: '🧠', desc: '高浓度 DHA、抗氧化体系，支持老龄犬脑部健康', query: { custom_category: 'brain' } },
    ]
  };

  const handleCategoryClick = (cat) => {
    if (cat.isPending) {
      setToastMessage(`【${t('pendingDev')}】${cat.label} — ${t('pendingToast')}`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    onSelectCategory({
      id: cat.key,
      label: cat.label,
      query: cat.query,
      desc: cat.desc
    });
  };

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, paddingBottom: 80 }}>
      <TopBar onBack={onBack} title={t('recipeCatalogTitle')} />
      
      <div style={{ padding: '0 20px' }}>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24, textAlign: 'center', padding: '0 10px' }}>
          {t('recipeCatalogDesc')}
        </p>

        {/* Section 1: Age Groups */}
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
                    <div style={styles.cardTitle}>{cat.label} <span style={styles.cardTitleEn}>{cat.labelEn}</span></div>
                    <div style={styles.cardDesc}>{cat.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Functional Groups */}
        <div style={{ marginBottom: 28 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>⚡</span>
            <span style={styles.sectionTitle}>{t('funcCategoryTitle')}</span>
          </div>
          <div style={styles.gridTwoCol}>
            {CATEGORIES.function.map(cat => (
              <div
                key={cat.key}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  ...styles.cardMini,
                  ...(cat.isPending ? styles.cardPending : {})
                }}
                className="card selectable-card"
              >
                <div style={styles.miniBadgeWrap}>
                  <span style={styles.cardEmoji}>{cat.icon}</span>
                  {cat.isPending && <span style={styles.pendingBadge}>{t('pendingDev')}</span>}
                </div>
                <div style={styles.miniTitle}>{cat.label}</div>
                <div style={styles.miniDesc}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Specialty/Disease Extensions */}
        <div style={{ marginBottom: 16 }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>🩺</span>
            <span style={styles.sectionTitle}>{t('extCategoryTitle')}</span>
          </div>
          <div style={styles.gridTwoCol}>
            {CATEGORIES.extended.map(cat => (
              <div
                key={cat.key}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  ...styles.cardMini,
                  ...(cat.isPending ? styles.cardPending : {})
                }}
                className="card selectable-card"
              >
                <div style={styles.miniBadgeWrap}>
                  <span style={styles.cardEmoji}>{cat.icon}</span>
                  {cat.isPending && <span style={styles.pendingBadge}>{t('pendingDev')}</span>}
                </div>
                <div style={styles.miniTitle}>{cat.label}</div>
                <div style={styles.miniDesc}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <span style={{ marginRight: 8 }}>🔬</span>
          {toastMessage}
        </div>
      )}
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
  cardTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  cardTitleEn: {
    fontSize: '10px',
    color: 'var(--gray)',
    fontWeight: '500',
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
  cardPending: {
    opacity: 0.5,
    border: '1px dashed rgba(255,255,255,0.1)',
  },
  miniBadgeWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  pendingBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#94a3b8',
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 6px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
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
  toast: {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '380px',
    background: 'rgba(9,13,20,0.95)',
    border: '1px solid rgba(157,0,255,0.4)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.4',
    zIndex: 1000,
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    textAlign: 'center',
  }
};
