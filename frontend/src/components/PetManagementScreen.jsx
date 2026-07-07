import React from 'react';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';
import TopBar from './TopBar';

export default function PetManagementScreen({ profiles = [], onAddPet, onEditPet, onSelectPet, lang }) {
  const t = useTranslation(lang);

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, padding: '0 24px 32px' }}>
      <TopBar onBack={() => window.history.back()} title={lang === 'zh' ? '宠物管理主页' : 'Pet Management'} hideBackButton={true} />
      
      {/* A Segment: Add Pet Entry */}
      <div 
        onClick={onAddPet}
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          border: '2px dashed var(--primary)',
          borderRadius: '16px',
          cursor: 'pointer',
          marginBottom: '28px',
          background: 'rgba(0, 230, 255, 0.02)',
          transition: 'all 0.2s ease',
          gap: 12
        }}
      >
        <span style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 'bold' }}>+</span>
        <span style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: 'bold' }}>
          {lang === 'zh' ? '添加我的宠物' : 'Add My Pet'}
        </span>
      </div>

      {/* B Segment: Pets List Title */}
      <h3 style={{ fontSize: '15px', color: 'var(--gray)', fontWeight: 'bold', margin: '0 0 16px 4px' }}>
        {lang === 'zh' ? '我的宠物' : 'My Pets'}
      </h3>

      {/* Pets List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)', fontSize: '13px' }}>
            {lang === 'zh' ? '暂无宠物档案，请点击上方按钮添加！' : 'No pet profiles found, click above to add!'}
          </div>
        ) : (
          profiles.map(pet => {
            const breedLabel = tData(pet.breedName, lang);
            const sex = pet.sex || pet.gender;
            const genderLabel = sex === 'female' ? (lang === 'zh' ? '母 ♀' : 'Female ♀') : (lang === 'zh' ? '公 ♂' : 'Male ♂');
            const ageText = pet.age_months 
              ? `${Math.floor(pet.age_months / 12)}岁${Math.round(pet.age_months % 12)}个月` 
              : `${pet.age || 0}岁`;
              
            const allergensList = pet.allergensText?.trim() || pet.allergens?.join('/') || (lang === 'zh' ? '无' : 'None');

            return (
              <div 
                key={pet.id}
                onClick={() => onSelectPet && onSelectPet(pet)}
                className="card selectable-card"
                style={{
                  display: 'flex',
                  padding: '16px 18px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(10, 13, 20, 0.8))',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  gap: 16,
                  alignItems: 'flex-start',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left side: Avatar & Edit button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', flexShrink: 0 }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    position: 'relative'
                  }}>
                    {pet.avatar ? (
                      <img 
                        src={pet.avatar} 
                        alt="Avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent && !parent.querySelector('.fallback-emoji')) {
                            const span = document.createElement('span');
                            span.className = 'fallback-emoji';
                            span.style.fontSize = '28px';
                            span.innerText = '🐕';
                            parent.appendChild(span);
                          }
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '28px' }}>🐕</span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPet && onEditPet(pet);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'var(--gray)',
                      fontSize: '11px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                      e.target.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = 'rgba(255,255,255,0.04)';
                      e.target.style.color = 'var(--gray)';
                    }}
                  >
                    {t('edit') || '编辑'}
                  </button>
                </div>

                {/* Right side: Information block */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Row 1: Name, Sex, Age */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#fff' }}>{pet.name}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      background: sex === 'female' ? 'rgba(255,0,163,0.1)' : 'rgba(0,230,255,0.1)',
                      color: sex === 'female' ? 'var(--secondary)' : 'var(--primary)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: 'bold'
                    }}>
                      {genderLabel}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--gray)' }}>{ageText}</span>
                  </div>

                  {/* Row 2: Breed, Weight, BCS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: 'var(--gray)', flexWrap: 'wrap' }}>
                    <span>{breedLabel}</span>
                    <span>·</span>
                    <span>{pet.weight || 0}kg</span>
                    {pet.bcs && (
                      <span style={{ 
                        fontSize: '10px', 
                        background: 'rgba(124, 255, 178, 0.1)', 
                        color: '#7CFFB2', 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        BCS {pet.bcs}分
                      </span>
                    )}
                  </div>

                  {/* Row 3: Feeding target & allergens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '11px', marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>
                        {lang === 'zh' ? '目标' : 'Goal'}:
                      </span>
                      <span style={{ color: 'var(--text)' }}>
                        {pet.feedingGoal || (lang === 'zh' ? '维持体态' : 'Maintain Body Condition')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ color: '#FF9600', fontWeight: 'bold' }}>
                        {lang === 'zh' ? '过敏' : 'Allergens'}:
                      </span>
                      <span style={{ color: 'var(--text)' }}>
                        {allergensList}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
