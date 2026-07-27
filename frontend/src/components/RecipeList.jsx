// RecipeList.jsx — Recipe waterfall list (i18n)
import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import { api } from '../api/index';
import { useTranslation } from '../i18n/translations';
import { tData, tTag } from '../i18n/dataTranslations';
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import {
  getIngredientCategory,
  INGREDIENT_CATEGORY_COLORS,
  sortRecipeIngredientEntries,
} from '../utils/recipeIngredients';

function RecipeCard({ recipe, onSelect, t, lang }) {
  const [expanded, setExpanded] = useState(false);
  const ingredients = sortRecipeIngredientEntries(Object.entries(recipe.ingredients || {}));
  const totalPct = ingredients.reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0);
  const displayName = recipe.presentation?.name || tData(recipe.name, lang);
  const ingredientName = name => recipe.presentation?.ingredients?.[name]?.name || tData(name, lang);
  const imageUrl = resolveRecipeImageUrl(recipe.img);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', minHeight: expanded ? 'auto' : 160 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!expanded ? (
            <>
              <div style={{ height: 160, overflow: 'hidden', background: 'var(--theme-surface-soft)' }}>
                <img src={imageUrl} loading="lazy" alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=200&q=80'; e.target.onerror = null; }} />
              </div>
              <div style={{
                padding: '11px 14px 3px',
                background: 'var(--theme-surface)',
                color: 'var(--theme-nutrition)',
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.3,
              }}>
                {displayName}
              </div>
            </>
          ) : (
            <div style={{ padding: '14px 14px 0' }}>
              <div style={{ color: 'var(--theme-nutrition)', fontWeight: 900, fontSize: 18, marginBottom: 12 }}>{displayName}</div>
              {ingredients.map(([name, pct]) => {
                if (typeof pct !== 'number') return null;
                const ratio = pct / totalPct;
                const cat = getIngredientCategory(name);
                return (
                  <div key={name} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-main)' }}>{ingredientName(name)}</span>
                      <span style={{ color: INGREDIENT_CATEGORY_COLORS[cat], fontWeight: 600 }}>{Math.round(ratio * 100)}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${ratio * 100}%`, height: '100%', background: INGREDIENT_CATEGORY_COLORS[cat], borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ padding: '6px 14px 12px', background: 'var(--theme-surface)' }}>
            <p style={{ color: 'var(--gray)', fontSize: 11, lineHeight: 1.5, margin: 0 }}>
              {recipe.description ? tData(recipe.description, lang) : recipe.tags?.map(t => tTag(t, lang)).join(' · ') || tData(recipe.category, lang)}
            </p>
          </div>
        </div>
        <div style={{ width: 54, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
          <button onClick={() => setExpanded(e => !e)} style={{ flex: 7, background: expanded ? 'var(--theme-nutrition-soft)' : 'var(--theme-recipe-soft)', border: 'none', cursor: 'pointer', color: 'var(--theme-nutrition)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 18, borderBottom: '1px solid var(--border)' }}>
            <span>{expanded ? '▲' : '▼'}</span>
            <span style={{ fontSize: 9, color: 'var(--gray)' }}>{expanded ? t('collapse') : t('expand')}</span>
          </button>
          <button onClick={() => onSelect(recipe)} style={{ flex: 3, background: 'var(--theme-nutrition-soft)', border: 'none', cursor: 'pointer', color: 'var(--theme-nutrition)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 16 }}>
            <span>✓</span>
            <span style={{ fontSize: 9 }}>{t('select')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecipeList({ onBack, category, profile, onSelectRecipe, lang }) {
  const t = useTranslation(lang);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (category?.query?.ai) {
      api.aiRecipe({ breedId: profile?.breedId, breedName: profile?.breedName, age: profile?.age || 3, weight: profile?.weight || 15, goals: [] }).then(d => {
        if (d.success) setRecipes([d.recipe]);
        setLoading(false);
      });
    } else {
      api.getRecipes({ ...(category?.query || {}), locale: lang }).then(d => {
        if (d.success) setRecipes(d.recipes);
        setLoading(false);
      });
    }
  }, [category, lang]);

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <TopBar onBack={onBack} title={category?.label || t('selectRecipe')} tone="recipe" />
      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray)' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
            <div>{category?.query?.ai ? t('aiGenerating') : t('loading')}</div>
          </div>
        ) : recipes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray)' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🍽️</div>
            <div>{t('noRecipes')}</div>
          </div>
        ) : (
          <div>
            <div style={{ color: 'var(--gray)', fontSize: 12, marginBottom: 16 }}>
              {t('totalRecipes', { n: recipes.length })}
            </div>
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onSelect={onSelectRecipe} t={t} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
