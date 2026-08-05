import React, { useState } from 'react';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';
import TopBar from './TopBar';
import CachedImage from './CachedImage';
import { fallbackPetAvatar, getPetAvatarUrl } from '../utils/petAvatar';
import { PET_AVATAR_CACHE } from '../utils/persistentImageCache';

export default function PetManagementScreen({ profiles = [], breeds = [], onAddPet, onEditPet, onDeletePet, deletingPetId, onSelectPet, onBack, lang }) {
  const t = useTranslation(lang);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = async () => {
    if (!deleteTarget || deletingPetId) return;
    const deleted = await onDeletePet?.(deleteTarget);
    if (deleted) setDeleteTarget(null);
  };

  return (
    <div className="animate-fade flex-col" style={{ flex: 1, padding: '0 24px 32px' }}>
      <TopBar onBack={onBack} title={t('petManagementTitle')} />
      
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
          background: 'var(--theme-nutrition-soft)',
          transition: 'all 0.2s ease',
          gap: 12
        }}
      >
        <span style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 'bold' }}>+</span>
        <span style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: 'bold' }}>
          {t('addMyPet')}
        </span>
      </div>

      {/* B Segment: Pets List Title */}
      <h3 style={{ fontSize: '15px', color: 'var(--gray)', fontWeight: 'bold', margin: '0 0 16px 4px' }}>
        {t('myPets')}
      </h3>

      {/* Pets List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray)', fontSize: '13px' }}>
            {t('noPetProfiles')}
          </div>
        ) : (
          profiles.map(pet => {
            const breedLabel = tData(pet.breedName, lang);
            const sex = pet.sex || pet.gender;
            const genderLabel = sex === 'female' ? t('female') : t('male');
            const ageText = pet.age_months 
              ? t('petAgeYearsMonths', { years: Math.floor(pet.age_months / 12), months: Math.round(pet.age_months % 12) })
              : t('petAgeYears', { years: pet.age || 0 });
              
            const allergensList = pet.allergensText?.trim() || pet.allergens?.join('/') || t('noneValue');
            const goalKey = {
              maintenance: 'goalMaintenance',
              weight_loss: 'goalWeightLoss',
              muscle_gain: 'goalMuscleGain',
              post_surgery: 'goalPostSurgery',
              coat_care: 'goalCoatCare',
              gastrointestinal_care: 'goalGastrointestinal',
            }[pet.feedingGoal];
            const avatar = getPetAvatarUrl(pet, breeds);

            return (
              <div 
                key={pet.id}
                onClick={() => onSelectPet && onSelectPet(pet)}
                className="card selectable-card"
                style={{
                  display: 'flex',
                  padding: '16px 18px',
                  background: 'var(--theme-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  gap: 16,
                  alignItems: 'flex-start',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left side: Avatar & action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '82px', flexShrink: 0 }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--theme-surface-soft)',
                    border: '1px solid var(--theme-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    position: 'relative'
                  }}>
                    <CachedImage
                      src={avatar}
                      fallbackSrc={fallbackPetAvatar(pet)}
                      cacheName={PET_AVATAR_CACHE}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPet && onEditPet(pet);
                      }}
                      style={{
                        background: 'var(--theme-surface-soft)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: '8px',
                        color: 'var(--gray)',
                        fontSize: '11px',
                        padding: '4px 7px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('edit')}
                    </button>
                    <button
                      disabled={deletingPetId === pet.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(pet);
                      }}
                      style={{
                        background: 'rgba(255, 80, 80, 0.08)',
                        border: '1px solid rgba(255, 80, 80, 0.25)',
                        borderRadius: '8px',
                        color: 'var(--secondary)',
                        fontSize: '11px',
                        padding: '4px 7px',
                        cursor: deletingPetId === pet.id ? 'wait' : 'pointer',
                        opacity: deletingPetId === pet.id ? 0.55 : 1
                      }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>

                {/* Right side: Information block */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Row 1: Name, Sex, Age */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--theme-text-primary)' }}>{pet.name}</span>
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
                        background: 'var(--theme-nutrition-soft)',
                        color: 'var(--theme-nutrition)',
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {t('bcsPoints', { score: pet.bcs })}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Feeding target & allergens */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '11px', marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>
                        {t('goalLabel')}:
                      </span>
                      <span style={{ color: 'var(--theme-text-primary)' }}>
                        {goalKey ? t(goalKey) : (pet.feedingGoal || t('maintainBody'))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span style={{ color: '#FF9600', fontWeight: 'bold' }}>
                        {t('allergensLabel')}:
                      </span>
                      <span style={{ color: 'var(--theme-text-primary)' }}>
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

      {deleteTarget && (
        <div
          role="presentation"
          onClick={() => { if (!deletingPetId) setDeleteTarget(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0, 0, 0, 0.45)'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pet-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 340px)',
              padding: '24px 22px 20px',
              borderRadius: 18,
              background: 'var(--theme-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 18px 60px rgba(0, 0, 0, 0.22)'
            }}
          >
            <h3 id="delete-pet-title" style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--theme-text-primary)' }}>
              {t('delete')}
            </h3>
            <p style={{ margin: 0, color: 'var(--gray)', fontSize: 14, lineHeight: 1.7 }}>
              {t('deletePetConfirm', { name: deleteTarget.name })}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                disabled={Boolean(deletingPetId)}
                onClick={() => setDeleteTarget(null)}
                style={{
                  minWidth: 74,
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--theme-border)',
                  background: 'var(--theme-surface-soft)',
                  color: 'var(--theme-text-primary)',
                  cursor: deletingPetId ? 'wait' : 'pointer'
                }}
              >
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                disabled={Boolean(deletingPetId)}
                onClick={confirmDelete}
                style={{
                  minWidth: 74,
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 80, 80, 0.35)',
                  background: 'var(--secondary)',
                  color: '#fff',
                  cursor: deletingPetId ? 'wait' : 'pointer',
                  opacity: deletingPetId ? 0.65 : 1
                }}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
