import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index';

const blankIngredient = () => ({ name: '', grams: '' });
const numeric = value => Number(value) || 0;

export function FreshMatchScreen({ profiles, authToken, onBack, onAddPet, onResult, initialDraft }) {
  const pets = useMemo(() => (profiles || []).filter(pet => !pet.species || pet.species === 'dog'), [profiles]);
  const [petId, setPetId] = useState(initialDraft?.petId || pets[0]?.id || '');
  const [text, setText] = useState(initialDraft?.text || '');
  const [ingredients, setIngredients] = useState(initialDraft?.ingredients?.length ? initialDraft.ingredients : [blankIngredient()]);
  const [busy, setBusy] = useState(false);
  const total = ingredients.reduce((sum, item) => sum + numeric(item.grams), 0);
  const update = (index, key, value) => setIngredients(items => items.map((item, i) => i === index ? { ...item, [key]: value } : item));

  const recognize = async () => {
    if (!text.trim()) return window.alert('请粘贴文本食谱');
    setBusy(true);
    try {
      const result = await api.freshCheckRecognize({ text }, authToken);
      if (!result?.success) throw new Error(result?.error || '智能识别失败');
      if (result.ingredients?.length) setIngredients(result.ingredients.map(item => ({ name: item.name, grams: item.grams })));
      else window.alert(result.warning || '未识别到明确的食材和克重，请手动填写。');
      if (result.warning) window.alert(result.warning);
    } catch (error) { window.alert(error.message || '智能识别失败'); } finally { setBusy(false); }
  };

  const validate = async () => {
    if (!petId) return window.alert('请先选择宠物');
    const valid = ingredients.filter(item => item.name.trim() && numeric(item.grams) > 0).map(item => ({ name: item.name.trim(), grams: numeric(item.grams) }));
    if (!valid.length) return window.alert('请至少填写一种食材和克重');
    setBusy(true);
    try {
      const result = await api.freshCheckAnalyze({ pet_id: petId, ingredients: valid, meal_intent: 'long_term' }, authToken);
      if (!result?.success) throw new Error(result?.error || '鲜食验证失败');
      onResult(result, { petId, text, ingredients });
    } catch (error) { window.alert(error.message || '鲜食验证失败'); } finally { setBusy(false); }
  };

  return <div className="fresh-match-page fresh-check-page animate-fade">
    <button className="fresh-back" type="button" onClick={onBack}>←</button>
    <header className="fresh-hero"><h1>Fresh Check 鲜食验证</h1><div className="fresh-kicker">AI Nutrition Powered by HeyboPet Agent</div></header>
    <section className="fresh-section">
      <h2>选择宠物</h2>
      {pets.length ? <select className="fresh-check-select" value={petId} onChange={event => setPetId(event.target.value)}>{pets.map(pet => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select> : <div className="fresh-empty"><p>请先创建宠物档案，再使用 Fresh Check 鲜食验证。</p><button type="button" onClick={onAddPet}>去创建宠物档案</button></div>}
    </section>
    <section className="fresh-section fresh-check-recognition">
      <h2>食谱输入</h2><label>智能识别编辑区<textarea value={text} onChange={event => setText(event.target.value)} placeholder="例如：鸡胸肉 200克；南瓜 80克；鱼油 2克" /></label>
      <div className="fresh-check-upload"><span>粘贴文本后可自动转成待验证食谱</span><button type="button" className="fresh-recognize" onClick={recognize} disabled={busy}>✨ 智能识别</button></div>
    </section>
    <section className="fresh-section fresh-check-table"><div className="fresh-check-table-title"><h2>待验证食谱</h2><button type="button" onClick={() => setIngredients(items => [...items, blankIngredient()])}>+ 新增食材</button></div><div className="fresh-check-row fresh-check-head"><span aria-hidden="true" /><span>食材列表</span><span>克重</span></div>{ingredients.map((item, index) => <div className="fresh-check-row" key={index}><button className="fresh-check-delete" type="button" aria-label={`删除食材 ${item.name || index + 1}`} onClick={() => setIngredients(items => items.filter((_, itemIndex) => itemIndex !== index))}>删除</button><input value={item.name} onChange={event => update(index, 'name', event.target.value)} placeholder="食材名称" /><label><input type="number" min="0" value={item.grams} onChange={event => update(index, 'grams', event.target.value)} placeholder="0" />克</label></div>)}<div className="fresh-check-total"><span>食材总重量</span><strong>{total} 克</strong></div></section>
    <section className="fresh-check-benefits"><span>🛡️ 食材风险识别</span><span>⚖️ 营养均衡分析</span><span>✦ 个性化调整建议</span></section>
    <button className="fresh-submit" type="button" disabled={busy || !pets.length} onClick={validate}>{busy ? '处理中...' : '验证食材'}</button>
  </div>;
}

function Radar({ scores = [] }) {
  const points = scores.map((item, index) => { const angle = -Math.PI / 2 + index * Math.PI / 3; const radius = 72 * (item.value / 100); return `${100 + radius * Math.cos(angle)},${92 + radius * Math.sin(angle)}`; }).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(scale => [0, 1, 2, 3, 4, 5].map(index => { const angle = -Math.PI / 2 + index * Math.PI / 3; return `${100 + 72 * scale * Math.cos(angle)},${92 + 72 * scale * Math.sin(angle)}`; }).join(' '));
  return <div className="fresh-radar"><svg viewBox="0 0 200 184" role="img" aria-label="六维鲜食验证评分">{rings.map((ring, index) => <polygon key={index} points={ring} className={`fresh-radar-grid ${index === rings.length - 1 ? 'is-outer' : 'is-inner'}`} />)}{[0, 1, 2, 3, 4, 5].map(index => { const angle = -Math.PI / 2 + index * Math.PI / 3; return <line key={index} x1="100" y1="92" x2={100 + 72 * Math.cos(angle)} y2={92 + 72 * Math.sin(angle)} className="fresh-radar-axis" />; })}<polygon points={points} className="fresh-radar-area" />{scores.map((item, index) => { const angle = -Math.PI / 2 + index * Math.PI / 3; return <text key={item.key} x={100 + 88 * Math.cos(angle)} y={96 + 88 * Math.sin(angle)} textAnchor="middle">{item.label}<tspan x={100 + 88 * Math.cos(angle)} dy="13">{item.value}</tspan></text>; })}</svg></div>;
}

export function FreshMatchResultScreen({ result, authToken, onResultUpdate, onAdjust, onBack }) {
  const bPack = result?.b_pack || {};
  const recommended = (bPack.options || []).find(option => option.recommended && option.enabled);
  const [showBPack, setShowBPack] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(bPack.selected?.category || recommended?.category || '');
  const [applying, setApplying] = useState(false);
  useEffect(() => {
    setSelectedCategory(bPack.selected?.category || recommended?.category || '');
  }, [bPack.selected?.category, recommended?.category]);
  if (!result) return null;
  const danger = (result.findings || []).filter(item => item.level === 'danger');
  const adjustments = (result.findings || []).filter(item => item.level === 'warning' || item.level === 'notice');
  const need = result.daily_need || {};
  const intake = need.intake_feasibility || {};
  const longTerm = result.long_term_detail || {};
  const enabledPacks = (bPack.options || []).filter(option => option.enabled);
  const disabledPacks = (bPack.options || []).filter(option => !option.enabled);
  const applyBPack = async () => {
    if (!selectedCategory) return;
    setApplying(true);
    try {
      const next = await api.freshCheckAnalyze({ pet_id: result.pet.id, ingredients: result.recipe.ingredients, meal_intent: result.recipe.meal_intent, b_pack_category: selectedCategory }, authToken);
      if (!next?.success) throw new Error(next?.error || '全价营养包应用失败');
      onResultUpdate(next);
      setShowBPack(false);
    } catch (error) { window.alert(error.message || '全价营养包应用失败'); } finally { setApplying(false); }
  };
  const FindingList = ({ items }) => items.map((item, index) => <article className={`fresh-check-finding risk-${item.level === 'notice' ? 'warning' : item.level}`} key={`${item.title}-${index}`}><strong>{item.title}</strong><p><b>为什么：</b>{item.reason}</p><p><b>怎么调整：</b>{item.adjustment}</p></article>);
  const PackOption = ({ option }) => <label className={option.enabled ? '' : 'is-disabled'}><input type="radio" name="fresh-b-pack" value={option.category} checked={selectedCategory === option.category} disabled={!option.enabled} onChange={() => setSelectedCategory(option.category)} /><span><strong>{option.name}{option.recommended && <em>推荐</em>}</strong><small>{option.category} · {option.reason}</small>{option.enabled && <small className="fresh-b-pack-dose">每100克食材配10克；烹饪完成后拌入</small>}</span></label>;

  return <div className="fresh-match-page fresh-result-page animate-fade">
    <header className="fresh-hero"><h1>鲜食验证结果</h1><div className="fresh-kicker">{result.pet?.name} · {result.recipe?.total_weight_g || 0} 克</div></header>
    <Radar scores={result.scores} />
    {adjustments.length > 0 && <section className="fresh-result-card"><h2>需要调整与确认</h2><FindingList items={adjustments} /></section>}
    {bPack.needed && <section className="fresh-b-pack">
      <button type="button" className={`fresh-b-pack-trigger ${bPack.selected ? 'is-selected' : ''}`} onClick={() => setShowBPack(value => !value)}>{bPack.selected ? `✓ 已选择（烹饪后拌入）：${bPack.selected.name}` : '＋ 添加王牌全价营养包'}</button>
      {bPack.selected && bPack.application && <p className="fresh-b-pack-note">本次建议在烹饪完成后拌入 {bPack.application.dose_grams} 克，只用于维生素和矿物质配平；不计入食材总重、宏量营养、能量或烹饪参数。</p>}
      {showBPack && <div className="fresh-b-pack-options">
        <h2>选择B全价营养包</h2>
        <p>已根据宠物档案禁用不适配选项。营养包只补充维生素和矿物质，须在烹饪完成后拌入，不参与食材比例、能量和烹饪计算。</p>
        {enabledPacks.map(option => <PackOption option={option} key={option.category} />)}
        {disabledPacks.length > 0 && <details className="fresh-b-pack-disabled"><summary>查看不适配营养包（{disabledPacks.length}）</summary>{disabledPacks.map(option => <PackOption option={option} key={option.category} />)}</details>}
        <button type="button" className="fresh-submit" disabled={!selectedCategory || applying} onClick={applyBPack}>{applying ? '应用中...' : '确认使用此营养包'}</button>
      </div>}
    </section>}
    <section className="fresh-result-card fresh-check-needs">
      <h2>每日营养需求估算</h2>
      <div><strong>{need.min_kcal || '-'}-{need.max_kcal || '-'} kcal</strong><span>每日建议能量</span></div>
      <div><strong>{need.meals_per_day || '-'} 餐</strong><span>建议分餐</span></div>
      <p>{result.pet?.breed || '未知犬种'} · {need.age_months || '-'}月龄 · 当前 {need.current_weight_kg || '-'}kg · 目标 {need.target_weight_kg || '-'}kg</p>
      {need.target_weight_note && <p className="fresh-inline-warning">⚠ {need.target_weight_note}</p>}
      <p>当前食谱估算：{need.recipe_kcal ?? '暂无法完整计算'} kcal。{need.note}</p>
      <p>活动水平：{need.activity_level || '-'}（计算采用×{need.activity_factor || 1}{need.recorded_activity_factor !== need.activity_factor ? `，档案活动系数×${need.recorded_activity_factor}未重复叠加` : ''}）；绝育调整：×{need.neuter_factor || 1}；喂养目标：{need.feeding_goal || '-'}（×{need.goal_factor || 1}）。</p>
      {need.activity_note && <p>{need.activity_note}</p>}
      {intake.daily_food_weight_pct_body_weight != null && <div className="fresh-intake-grid">
        <span><strong>{intake.daily_food_weight_pct_body_weight}%</strong><small>每日食材占体重</small></span>
        <span><strong>{intake.grams_per_meal}g</strong><small>每餐食材重量</small></span>
        <span><strong>{intake.kcal_per_gram ?? '-'} kcal/g</strong><small>食谱能量密度</small></span>
        {Number.isFinite(intake.estimated_water_pct) && <span><strong>{intake.estimated_water_pct}%</strong><small>估算含水率</small></span>}
      </div>}
      {intake.excessive_volume && <p className="fresh-intake-alert">⚠ 当前每日总量比建议食量约 {intake.reference_max_daily_grams}g 超出 {intake.exceeds_reference_by_pct}%；{intake.volume_advice}</p>}
      {intake.note && <small className="fresh-intake-note">{intake.note}</small>}
      {need.digestion_note && <p>{need.digestion_note}</p>}
    </section>
    {result.suitability_detail?.components?.length > 0 && <section className="fresh-result-card fresh-suitability-card"><h2>宠物适配性明细 <strong>{result.suitability_detail.value}分</strong></h2><p>{result.suitability_detail.explanation}</p><div className="fresh-suitability-grid">{result.suitability_detail.components.map(item => <article key={item.key}><header><b>{item.label}</b><strong>{item.earned}/{item.max}</strong></header><p>{item.reason}</p>{item.earned < item.max && <small>如何改善：{item.adjustment}</small>}</article>)}</div><small>该分数为HeyboPet产品级适配模型；体重、目标体重和活动量同时参与能量需求计算。存在疾病记录时，建议听从专业医师建议。</small></section>}
    {result.macro_nutrition && <section className="fresh-result-card fresh-macro-card"><h2>宏量营养与食材结构</h2><div className="fresh-macro-grid"><span>动物蛋白<strong>{result.macro_nutrition.ingredient_weight_ratios.animal_protein_pct}%</strong></span><span>内脏食材<strong>{result.macro_nutrition.ingredient_weight_ratios.organ_pct}%</strong></span><span>碳水食材<strong>{result.macro_nutrition.ingredient_weight_ratios.carb_pct}%</strong></span><span>果蔬<strong>{result.macro_nutrition.ingredient_weight_ratios.vegetable_pct}%</strong></span><span>含脂食材<strong>{result.macro_nutrition.ingredient_weight_ratios.fat_containing_ingredient_pct}%</strong></span><span>额外油脂<strong>{result.macro_nutrition.ingredient_weight_ratios.fat_source_pct}%</strong></span></div><p>估算营养素：蛋白质 {result.macro_nutrition.estimated_grams.protein_g}g · 脂肪 {result.macro_nutrition.estimated_grams.fat_g}g · 碳水 {result.macro_nutrition.estimated_grams.carb_g}g</p><p>每1000kcal：蛋白质 {result.macro_nutrition.per_1000_kcal.protein_g ?? '-'}g（阶段最低 {result.macro_nutrition.standards.protein_min_g_per_1000kcal}g）· 脂肪 {result.macro_nutrition.per_1000_kcal.fat_g ?? '-'}g（阶段最低 {result.macro_nutrition.standards.fat_min_g_per_1000kcal}g）</p><small>“含脂食材”包括羊肉等本身含脂肪的原料；“额外油脂”仅统计鱼油、亚麻籽油等。内脏食材是长期主食结构检查项，因此0%也会保留显示。</small><small>食材数据覆盖 {result.macro_nutrition.coverage.weight_pct}% · {result.macro_nutrition.standards.source}；以上为数据库估算，不替代专业营养配方。</small></section>}
    {longTerm.explanation && <section className="fresh-result-card fresh-long-term"><h2>长期适宜性说明</h2><p>{longTerm.explanation}</p>{(longTerm.adjustments || []).map(item => <p key={item}>如何改善：{item}</p>)}{longTerm.professional_confirmation_required && <small>存在幼龄、特殊生理阶段或健康记录时，本结果仅作结构与营养筛查；长期执行前建议听从专业医师建议，并由执业兽医或宠物营养专业人员确认。</small>}</section>}
    <section className={`fresh-result-card fresh-check-verdict ${danger.length ? 'has-danger' : ''}`}><h2>验证结论</h2><p>{result.verdict}</p>{result.ai_summary && <p><b>AI调整建议：</b>{result.ai_summary}</p>}</section>
    {danger.length > 0 && <section className="fresh-result-card fresh-danger-card"><h2>⚠ 必须立即处理</h2><FindingList items={danger} /></section>}
    {result.cooking_plan && <section className="fresh-result-card"><h2>鲜食机可执行烹饪方案</h2><p>{result.cooking_plan.total_weight_g}g · {result.cooking_plan.temperature_c}℃ · 约 {result.cooking_plan.cook_minutes} 分钟</p><p>{result.cooking_plan.note}</p></section>}
    <div className="fresh-check-result-actions"><button className="fresh-submit is-secondary" type="button" onClick={onAdjust}>调整食谱</button><button className="fresh-submit" type="button" onClick={onBack}>返回主页</button></div>
  </div>;
}
