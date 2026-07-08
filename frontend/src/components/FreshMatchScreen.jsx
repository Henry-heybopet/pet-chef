import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index';

const splitIngredients = value => String(value || '').split(/[,，、;；\s\n]+/).map(item => item.trim()).filter(Boolean);

function petBreed(pet) {
  return pet.breedName || pet.breed?.name || pet.breed || pet.customBreed || '未知犬种';
}

function petAvatar(pet) {
  return pet.avatar || pet.avatar_url || pet.breed?.img || '/dog.png';
}

export function FreshMatchScreen({ profiles, authToken, onBack, onAddPet, onResult }) {
  const dogPets = useMemo(() => (profiles || []).filter(pet => !pet.species || pet.species === 'dog'), [profiles]);
  const [selected, setSelected] = useState(0);
  const [proteins, setProteins] = useState('');
  const [vegetables, setVegetables] = useState('');
  const [carbs, setCarbs] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selected >= dogPets.length) setSelected(0);
  }, [dogPets.length, selected]);

  const currentPet = dogPets[selected];
  const move = step => {
    if (dogPets.length < 2) return;
    setSelected(index => (index + step + dogPets.length) % dogPets.length);
  };

  const submit = async () => {
    if (!currentPet) {
      window.alert('请先选择宠物');
      return;
    }
    const ingredients = {
      proteins: splitIngredients(proteins),
      vegetables_fruits: splitIngredients(vegetables),
      carbs: splitIngredients(carbs),
    };
    if (![...ingredients.proteins, ...ingredients.vegetables_fruits, ...ingredients.carbs].length) {
      window.alert('请输入至少一种家中现有食材');
      return;
    }
    setBusy(true);
    try {
      const result = await api.freshMatchAnalyze({ pet_id: currentPet.id, ingredients }, authToken);
      if (!result?.success) throw new Error(result?.error || '营养成分分析失败');
      onResult(result);
    } catch (error) {
      window.alert(error?.message || '营养成分分析失败');
    } finally {
      setBusy(false);
    }
  };

  const visiblePets = dogPets.length === 1
    ? [dogPets[selected]]
    : dogPets.length === 2
      ? [dogPets[(selected + 1) % 2], dogPets[selected], null]
    : [-1, 0, 1].map(offset => dogPets[(selected + offset + dogPets.length) % dogPets.length]);

  return (
    <div className="fresh-match-page animate-fade">
      <button className="fresh-back" type="button" onClick={onBack}>←</button>
      <header className="fresh-hero">
        <div className="fresh-kicker">Powered by Heybo AI</div>
        <h1>Fresh Match鲜食智配</h1>
      </header>

      <section className="fresh-section">
        <h2>选择你的爱犬</h2>
        {dogPets.length ? (
          <div className={`fresh-carousel count-${dogPets.length}`}>
            <button className="fresh-nav" type="button" onClick={() => move(-1)} disabled={dogPets.length < 2}>‹</button>
            <div className="fresh-pet-track">
              {visiblePets.map((pet, slot) => {
                if (!pet) return <span key="fresh-pet-spacer" className="fresh-pet-spacer" />;
                const isActive = pet.id === currentPet?.id;
                return (
                  <button key={`${pet.id}-${slot}`} type="button" className={`fresh-pet-card ${isActive ? 'is-active' : ''}`} onClick={() => setSelected(dogPets.findIndex(item => item.id === pet.id))}>
                    <img src={petAvatar(pet)} alt="" />
                    <strong>{pet.name}</strong>
                    <span>{petBreed(pet)}</span>
                  </button>
                );
              })}
            </div>
            <button className="fresh-nav" type="button" onClick={() => move(1)} disabled={dogPets.length < 2}>›</button>
          </div>
        ) : (
          <div className="fresh-empty">
            <p>请先创建爱犬档案，再使用 Fresh Match 鲜食智配</p>
            <button type="button" onClick={onAddPet}>去创建宠物档案</button>
          </div>
        )}
      </section>

      <section className="fresh-section fresh-inputs">
        <h2>请输入家中现有食材</h2>
        <label>
          <span>肉类 / 蛋白质</span>
          <textarea value={proteins} onChange={event => setProteins(event.target.value)} placeholder="鸡肉、牛肉、鱼肉、鸭肉、虾、鸡蛋等" />
        </label>
        <label>
          <span>蔬菜 / 水果类</span>
          <textarea value={vegetables} onChange={event => setVegetables(event.target.value)} placeholder="胡萝卜、西兰花、菠菜、苹果、蓝莓、西瓜、香蕉等" />
        </label>
        <label>
          <span>主食 / 碳水类</span>
          <textarea value={carbs} onChange={event => setCarbs(event.target.value)} placeholder="米饭、红薯、土豆、燕麦、南瓜等" />
        </label>
        <button className="fresh-submit" type="button" onClick={submit} disabled={busy || !dogPets.length}>
          {busy ? '分析中...' : '开始营养成分分析'}
        </button>
        <div className="fresh-powered">Powered by Heybo AI</div>
      </section>
    </div>
  );
}

export function FreshMatchResultScreen({ result, onBack }) {
  const [openRecipe, setOpenRecipe] = useState(result?.recipes?.[0]?.id || '');
  if (!result) return null;
  const pet = result.pet || {};
  return (
    <div className="fresh-match-page fresh-result-page animate-fade">
      <button className="fresh-back" type="button" onClick={onBack}>←</button>
      <header className="fresh-hero">
        <div className="fresh-kicker">Powered by Heybo AI</div>
        <h1>Fresh Match鲜食智配</h1>
        <div className="fresh-result-pet">
          <img src={pet.avatar || '/dog.png'} alt="" />
          <div>
            <strong>{pet.name}</strong>
            <span>{pet.breed} · {pet.age || '-'}岁 · {pet.weight_kg || '-'}kg</span>
          </div>
        </div>
      </header>

      <ResultCard title="食材安全检查">
        <RiskList title="禁食风险" items={result.safety_check?.forbidden_items} empty="未发现犬类禁食食材" />
        <RiskList title="过敏风险" items={result.safety_check?.allergy_items} empty="未命中档案过敏食材" />
        <p className="fresh-safe-summary">{result.safety_check?.summary}</p>
      </ResultCard>

      <ResultCard title="营养缺口检查">
        {result.feeding_plan && (
          <div className="fresh-gap-grid">
            <Gap label="每日总量" value={`${result.feeding_plan.daily_grams}g`} />
            <Gap label="每日餐次" value={String(result.feeding_plan.meals_per_day)} />
            <Gap label="每餐份量" value={`${result.feeding_plan.per_meal_grams}g`} />
          </div>
        )}
        <div className="fresh-gap-grid">
          <Gap label="蛋白质" value={result.nutrition_gap?.protein} />
          <Gap label="果蔬" value={result.nutrition_gap?.vegetables_fruits} />
          <Gap label="碳水" value={result.nutrition_gap?.carbs} />
        </div>
        <p>{result.nutrition_gap?.message}</p>
      </ResultCard>

      {result.machine_limit_notice && <div className="fresh-limit">{result.machine_limit_notice}</div>}

      <section className="fresh-recipes">
        <h2>生成配方</h2>
        {!(result.recipes || []).length && (
          <div className="fresh-no-recipes">当前安全蛋白质来源不足，暂不建议生成完整鲜食主餐。请补充未过敏的主要蛋白质后再分析。</div>
        )}
        {(result.recipes || []).map(recipe => {
          const open = openRecipe === recipe.id;
          return (
            <article key={recipe.id} className={`fresh-recipe-card ${open ? 'is-open' : ''}`}>
              <button type="button" onClick={() => setOpenRecipe(open ? '' : recipe.id)}>
                <div>
                  <strong>{recipe.name}</strong>
                  <span>{recipe.total_weight_g}g · {recipe.reason}</span>
                </div>
                <em>{open ? '收起' : '展开'}</em>
              </button>
              <div className="fresh-ingredient-preview">
                {(recipe.ingredients || []).map(item => <span key={`${recipe.id}-${item.name}`}>{item.name} {item.weight_g}g</span>)}
              </div>
              {open && (
                <div className="fresh-recipe-detail">
                  {(recipe.ingredients || []).map(item => (
                    <div key={item.name} className="fresh-ingredient-row">
                      <span>{item.name}</span><span>{item.weight_g}g</span><span>{item.ratio}</span><small>{item.category}</small>
                    </div>
                  ))}
                  <p>{recipe.nutrition_note}</p>
                  <p>为了钙磷平衡，计算出添加的全价营养包B的钙含量为：碳酸钙 {recipe.calcium?.calcium_carbonate_g ?? '-'}g；柠檬酸钙 {recipe.calcium?.calcium_citrate_g ?? '-'}g。</p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="fresh-prep">{result.prep_tips}</p>
    </div>
  );
}

function ResultCard({ title, children }) {
  return <section className="fresh-result-card"><h2>{title}</h2>{children}</section>;
}

function RiskList({ title, items = [], empty }) {
  return (
    <div className="fresh-risk-list">
      <strong>{title}</strong>
      {items.length ? items.map(item => <p key={item.name} className={`risk-${item.level}`}>{item.message}</p>) : <p className="risk-safe">{empty}</p>}
    </div>
  );
}

function Gap({ label, value }) {
  if (value !== 'sufficient' && value !== 'missing') {
    return <div className="gap-ok"><strong>{label}</strong><span>{value}</span></div>;
  }
  const ok = value === 'sufficient';
  return <div className={ok ? 'gap-ok' : 'gap-missing'}><strong>{label}</strong><span>{ok ? '充足' : '缺少'}</span></div>;
}
