const SUPPORTED_LOCALES = Object.freeze(['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko']);
const INGREDIENT_NAMES = Object.freeze({
  grape: ['葡萄', 'grapes', 'Trauben', 'le raisin', 'las uvas', 'l’uva', 'ぶどう', '포도'],
  raisin: ['葡萄干', 'raisins', 'Rosinen', 'les raisins secs', 'las pasas', 'l’uvetta', 'レーズン', '건포도'],
  onion: ['洋葱', 'onion', 'Zwiebel', 'l’oignon', 'la cebolla', 'la cipolla', '玉ねぎ', '양파'],
  garlic: ['大蒜', 'garlic', 'Knoblauch', 'l’ail', 'el ajo', 'l’aglio', 'にんにく', '마늘'],
  chocolate: ['巧克力', 'chocolate', 'Schokolade', 'le chocolat', 'el chocolate', 'il cioccolato', 'チョコレート', '초콜릿'],
  xylitol: ['木糖醇', 'xylitol', 'Xylit', 'le xylitol', 'el xilitol', 'lo xilitolo', 'キシリトール', '자일리톨'],
  alcohol: ['酒精', 'alcohol', 'Alkohol', 'l’alcool', 'el alcohol', 'l’alcol', 'アルコール', '알코올'],
  avocado: ['牛油果', 'avocado', 'Avocado', 'l’avocat', 'el aguacate', 'l’avocado', 'アボカド', '아보카도'],
  macadamia: ['夏威夷果', 'macadamia nuts', 'Macadamianüsse', 'les noix de macadamia', 'las nueces de macadamia', 'le noci di macadamia', 'マカダミアナッツ', '마카다미아'],
  caffeine: ['咖啡因', 'caffeine', 'Koffein', 'la caféine', 'la cafeína', 'la caffeina', 'カフェイン', '카페인'],
});
const PRESENTATION_KEYS = new Set([
  'title', 'reason', 'adjustment', 'adjustments', 'message', 'verdict', 'note',
  'label', 'explanation', 'description', 'summary', 'ai_summary', 'prep_tips',
  'machine_limit_notice',
]);
const SEMANTIC_STRING_KEYS = /(^id$|_id$|^code$|_code$|^key$|^level$|_level$|^domain$|^status$|_status$|^type$|_type$|^category$|_category$|^source$|^meal_intent$|^life_stage$|^activity_level$|^feeding_goal$|^special_period$|^species$|^sex$|^unit$)/;
const VERDICTS = Object.freeze({
  SAFETY_RISK_BLOCKED: {
    zh: '需先处理红色安全风险后再继续。', en: 'Resolve the red safety risks before continuing.', de: 'Beheben Sie zuerst die roten Sicherheitsrisiken.', fr: 'Traitez d’abord les risques de sécurité rouges.', es: 'Resuelva primero los riesgos de seguridad rojos.', it: 'Risolvere prima i rischi di sicurezza rossi.', ja: '赤色の安全リスクに対応してから続行してください。', ko: '빨간색 안전 위험을 먼저 해결한 뒤 계속하세요.',
  },
  ADJUSTMENT_REQUIRED: {
    zh: '存在需要调整的项目，请按建议修改后重新验证。', en: 'Some items need adjustment. Apply the recommendations and check again.', de: 'Einige Punkte müssen angepasst werden. Ändern Sie sie wie empfohlen und prüfen Sie erneut.', fr: 'Certains éléments doivent être ajustés. Appliquez les recommandations puis vérifiez de nouveau.', es: 'Algunos elementos requieren ajustes. Aplique las recomendaciones y vuelva a validar.', it: 'Alcuni elementi richiedono modifiche. Applicare i suggerimenti e verificare di nuovo.', ja: '調整が必要な項目があります。提案に従って修正し、再確認してください。', ko: '조정이 필요한 항목이 있습니다. 권장 사항에 따라 수정한 뒤 다시 검증하세요.',
  },
  NO_OBVIOUS_SAFETY_CONFLICT: {
    zh: '未发现明显安全冲突；长期喂养前仍需专业人员确认营养完整性。', en: 'No obvious safety conflict was found. A professional should still confirm nutritional completeness before long-term feeding.', de: 'Es wurde kein offensichtlicher Sicherheitskonflikt gefunden. Vor dauerhafter Fütterung sollte die Nährstoffvollständigkeit fachlich bestätigt werden.', fr: 'Aucun conflit de sécurité évident détecté. Un professionnel doit toutefois confirmer l’équilibre nutritionnel avant une alimentation à long terme.', es: 'No se detectó ningún conflicto de seguridad evidente. Un profesional debe confirmar la integridad nutricional antes de una alimentación prolongada.', it: 'Non sono stati rilevati conflitti di sicurezza evidenti. Prima dell’uso a lungo termine, un professionista deve confermare la completezza nutrizionale.', ja: '明らかな安全上の問題は見つかりませんでした。長期給与前に専門家が栄養の完全性を確認してください。', ko: '명확한 안전 충돌은 발견되지 않았습니다. 장기 급여 전 전문가가 영양 완전성을 확인해야 합니다.',
  },
});

const TEMPLATES = Object.freeze({
  INEDIBLE: {
    zh: ['安全红线：非食物不可使用', '{ingredient_name}不是犬类可食用原料，吞食可能造成中毒、异物阻塞或机械损伤。', '立即移除该项；如宠物已经吞食，请尽快联系执业兽医。'],
    en: ['Safety alert: non-food item', '{ingredient_name} is not edible for dogs and may cause poisoning, obstruction, or physical injury if swallowed.', 'Remove it immediately. If your dog has swallowed it, contact a licensed veterinarian promptly.'],
    de: ['Sicherheitswarnung: kein Lebensmittel', '{ingredient_name} ist für Hunde kein Lebensmittel und kann beim Verschlucken Vergiftungen, Verstopfungen oder Verletzungen verursachen.', 'Sofort entfernen. Wenn Ihr Hund es verschluckt hat, wenden Sie sich umgehend an eine Tierarztpraxis.'],
    fr: ['Alerte de sécurité : produit non alimentaire', '{ingredient_name} n’est pas comestible pour les chiens et peut provoquer une intoxication, une obstruction ou une blessure en cas d’ingestion.', 'Retirez-le immédiatement. Si votre chien l’a avalé, contactez rapidement un vétérinaire.'],
    es: ['Alerta de seguridad: no es un alimento', '{ingredient_name} no es comestible para perros y puede causar intoxicación, obstrucción o lesiones si se ingiere.', 'Retírelo de inmediato. Si su perro lo ha ingerido, contacte cuanto antes con un veterinario.'],
    it: ['Avviso di sicurezza: elemento non alimentare', '{ingredient_name} non è commestibile per i cani e, se ingerito, può causare avvelenamento, ostruzione o lesioni.', 'Rimuoverlo immediatamente. Se il cane lo ha ingerito, contattare subito un veterinario.'],
    ja: ['安全上の警告：食品ではありません', '{ingredient_name}は犬が食べられる原料ではなく、誤飲すると中毒、閉塞、外傷を起こすおそれがあります。', '直ちに取り除いてください。すでに飲み込んだ場合は、速やかに獣医師へ連絡してください。'],
    ko: ['안전 경고: 식품이 아닙니다', '{ingredient_name}은(는) 반려견이 먹을 수 있는 원료가 아니며, 삼킬 경우 중독, 폐색 또는 신체 손상을 일으킬 수 있습니다.', '즉시 제거하세요. 이미 삼켰다면 신속히 수의사에게 연락하세요.'],
  },
  FORBIDDEN: {
    zh: ['安全红线：不可使用', '{ingredient_name}对犬类存在明确禁食或伤害风险。', '立即移除该食材后重新验证。'],
    en: ['Safety alert: prohibited ingredient', 'This ingredient ({ingredient_name}) is known to be unsafe or harmful to dogs.', 'Remove this ingredient immediately and run the check again.'],
    de: ['Sicherheitswarnung: verbotene Zutat', '{ingredient_name} gelten für Hunde als nachweislich ungeeignet oder schädlich.', 'Entfernen Sie diese Zutat sofort und prüfen Sie das Rezept erneut.'],
    fr: ['Alerte de sécurité : ingrédient interdit', '{ingredient_name} présente un risque connu pour les chiens.', 'Retirez immédiatement cet ingrédient, puis vérifiez de nouveau la recette.'],
    es: ['Alerta de seguridad: ingrediente prohibido', '{ingredient_name} presenta un riesgo conocido para los perros.', 'Retire este ingrediente de inmediato y vuelva a comprobar la receta.'],
    it: ['Avviso di sicurezza: ingrediente vietato', '{ingredient_name} presenta un rischio noto per i cani.', 'Rimuovere immediatamente questo ingrediente e verificare di nuovo la ricetta.'],
    ja: ['安全上の警告：使用禁止の食材', '{ingredient_name}は犬にとって明確な禁忌または有害リスクがあります。', 'この食材を直ちに取り除き、もう一度確認してください。'],
    ko: ['안전 경고: 사용 금지 식재료', '{ingredient_name}은(는) 반려견에게 명확한 금기 또는 유해 위험이 있습니다.', '해당 식재료를 즉시 제거한 뒤 다시 검사하세요.'],
  },
  AI_UNSAFE_INGREDIENT: {
    zh: ['安全红线：AI识别为不可用', '{ingredient_name}经核验不适合犬类食用。{basis}', '立即移除该项；不确定时请由执业兽医确认。'],
    en: ['Safety alert: ingredient flagged as unsafe', '{ingredient_name} was assessed as unsuitable for dogs. {basis}', 'Remove it immediately. If uncertain, ask a licensed veterinarian to confirm.'],
    de: ['Sicherheitswarnung: Zutat als ungeeignet erkannt', '{ingredient_name} wurde als ungeeignet für Hunde bewertet. {basis}', 'Sofort entfernen. Lassen Sie dies im Zweifel tierärztlich bestätigen.'],
    fr: ['Alerte de sécurité : ingrédient jugé dangereux', '{ingredient_name} a été évalué comme inadapté aux chiens. {basis}', 'Retirez-le immédiatement. En cas de doute, demandez confirmation à un vétérinaire.'],
    es: ['Alerta de seguridad: ingrediente marcado como no apto', '{ingredient_name} se ha evaluado como no apto para perros. {basis}', 'Retírelo de inmediato. En caso de duda, consulte a un veterinario.'],
    it: ['Avviso di sicurezza: ingrediente ritenuto non idoneo', '{ingredient_name} è stato valutato come non idoneo per i cani. {basis}', 'Rimuoverlo immediatamente. In caso di dubbio, chiedere conferma a un veterinario.'],
    ja: ['安全上の警告：使用不可と判定された食材', '{ingredient_name}は犬に適さないと判定されました。{basis}', '直ちに取り除いてください。不明な場合は獣医師に確認してください。'],
    ko: ['안전 경고: 사용 불가로 판정된 식재료', '{ingredient_name}은(는) 반려견에게 적합하지 않은 것으로 판정되었습니다. {basis}', '즉시 제거하세요. 확실하지 않다면 수의사에게 확인하세요.'],
  },
  INGREDIENT_SAFETY_UNCERTAIN: {
    zh: ['食材安全性待确认', '暂不能确认{ingredient_name}是否适合犬类食用。', '提供更准确的部位、生熟状态或产品配料表后重新验证。'],
    en: ['Ingredient safety needs confirmation', 'It is not yet possible to confirm whether {ingredient_name} is safe for dogs.', 'Provide the exact cut, cooked or raw state, or full product ingredient list, then check again.'],
    de: ['Sicherheit der Zutat muss bestätigt werden', 'Es kann noch nicht bestätigt werden, ob {ingredient_name} für Hunde geeignet ist.', 'Geben Sie Teilstück, Roh- oder Garzustand bzw. die vollständige Zutatenliste an und prüfen Sie erneut.'],
    fr: ['Sécurité de l’ingrédient à confirmer', 'Il n’est pas encore possible de confirmer si {ingredient_name} convient aux chiens.', 'Précisez le morceau, l’état cru ou cuit, ou la liste complète des ingrédients, puis vérifiez de nouveau.'],
    es: ['Debe confirmarse la seguridad del ingrediente', 'Aún no se puede confirmar si {ingredient_name} es apto para perros.', 'Indique el corte exacto, si está crudo o cocido, o la lista completa de ingredientes y vuelva a comprobarlo.'],
    it: ['Sicurezza dell’ingrediente da confermare', 'Non è ancora possibile confermare se {ingredient_name} sia adatto ai cani.', 'Indicare il taglio esatto, lo stato crudo o cotto o l’elenco completo degli ingredienti, quindi verificare di nuovo.'],
    ja: ['食材の安全性を確認してください', '{ingredient_name}が犬に適しているか、現時点では確認できません。', '部位、生または加熱済みの状態、製品の全原材料を詳しく入力して再確認してください。'],
    ko: ['식재료 안전성 확인 필요', '{ingredient_name}이(가) 반려견에게 적합한지 아직 확인할 수 없습니다.', '정확한 부위, 생식 또는 조리 상태, 제품의 전체 원재료를 입력한 뒤 다시 검사하세요.'],
  },
  PET_FOOD_CONFLICT: {
    zh: ['过敏或不耐受食材冲突', '{ingredient_name}命中该宠物档案中的过敏或食物限制记录。', '删除该食材，并由兽医确认替代蛋白或补充方案。'],
    en: ['Allergy or intolerance conflict', '{ingredient_name} matches an allergy or food restriction in this pet’s profile.', 'Remove the ingredient and ask a veterinarian to confirm a suitable alternative protein or supplement plan.'],
    de: ['Konflikt mit Allergie oder Unverträglichkeit', '{ingredient_name} entspricht einer Allergie oder Futtereinschränkung im Profil dieses Tieres.', 'Entfernen Sie die Zutat und lassen Sie eine geeignete Protein- oder Ergänzungsalternative tierärztlich bestätigen.'],
    fr: ['Conflit d’allergie ou d’intolérance', '{ingredient_name} correspond à une allergie ou restriction alimentaire enregistrée dans le profil de l’animal.', 'Retirez cet ingrédient et faites confirmer une autre protéine ou supplémentation adaptée par un vétérinaire.'],
    es: ['Conflicto de alergia o intolerancia', '{ingredient_name} coincide con una alergia o restricción alimentaria del perfil de la mascota.', 'Retire el ingrediente y pida a un veterinario que confirme una proteína alternativa o un plan de suplementación adecuado.'],
    it: ['Conflitto con allergia o intolleranza', '{ingredient_name} corrisponde a un’allergia o restrizione alimentare registrata nel profilo dell’animale.', 'Rimuovere l’ingrediente e far confermare al veterinario una proteina alternativa o un piano di integrazione adeguato.'],
    ja: ['アレルギーまたは不耐性との競合', '{ingredient_name}は、このペットのプロフィールに登録されたアレルギーまたは食事制限に該当します。', 'この食材を取り除き、代替たんぱく源や補助方法を獣医師に確認してください。'],
    ko: ['알레르기 또는 불내증 충돌', '{ingredient_name}은(는) 반려동물 프로필에 기록된 알레르기 또는 식이 제한과 일치합니다.', '해당 식재료를 제거하고 대체 단백질이나 보충 방안을 수의사에게 확인하세요.'],
  },
  PET_ALLERGEN: {
    zh: ['检测到档案过敏食材', '{ingredient_name}命中宠物档案记录的过敏原{allergen}。', '从配方中移除该食材，并选择安全的替代食材。'],
    en: ['Profile allergen detected', '{ingredient_name} matches the allergen {allergen} recorded in the pet profile.', 'Remove it from the recipe and choose a safe alternative.'],
    de: ['Allergen aus dem Profil erkannt', '{ingredient_name} entspricht dem im Tierprofil vermerkten Allergen {allergen}.', 'Entfernen Sie die Zutat aus dem Rezept und wählen Sie eine sichere Alternative.'],
    fr: ['Allergène du profil détecté', '{ingredient_name} correspond à l’allergène {allergen} enregistré dans le profil de l’animal.', 'Retirez cet ingrédient de la recette et choisissez une alternative sûre.'],
    es: ['Alérgeno del perfil detectado', '{ingredient_name} coincide con el alérgeno {allergen} registrado en el perfil de la mascota.', 'Retire el ingrediente de la receta y elija una alternativa segura.'],
    it: ['Rilevato allergene del profilo', '{ingredient_name} corrisponde all’allergene {allergen} registrato nel profilo dell’animale.', 'Rimuovere l’ingrediente dalla ricetta e scegliere un’alternativa sicura.'],
    ja: ['プロフィールのアレルゲンを検出', '{ingredient_name}は、ペットプロフィールに登録されたアレルゲン「{allergen}」に該当します。', 'この食材を配合から取り除き、安全な代替食材を選んでください。'],
    ko: ['프로필 알레르기 유발 식재료 감지', '{ingredient_name}은(는) 반려동물 프로필에 기록된 알레르기 유발 항목 {allergen}과(와) 일치합니다.', '배합에서 해당 식재료를 제거하고 안전한 대체 식재료를 선택하세요.'],
  },
});

function normalizeLocale(value) {
  const locale = String(value || 'zh').trim().toLowerCase().replace('_', '-').split('-')[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'zh';
}

function interpolate(text, facts) {
  return String(text || '').replace(/\{([a-z0-9_]+)\}/gi, (_, key) => String(facts[key] ?? ''));
}

function stripPresentation(value, insideFacts = false) {
  if (Array.isArray(value)) return value.map(item => stripPresentation(item, insideFacts)).filter(item => item !== undefined);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return insideFacts ? value : undefined;
  if (!value || typeof value !== 'object') return undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (PRESENTATION_KEYS.has(key)) return [];
    if (key === 'facts') return [[key, stripPresentation(item, true)]];
    if (typeof item === 'string') return insideFacts || SEMANTIC_STRING_KEYS.test(key) ? [[key, item]] : [];
    const semanticItem = stripPresentation(item, insideFacts);
    return semanticItem === undefined ? [] : [[key, semanticItem]];
  }));
}

function containsHan(value) {
  return /[\u3400-\u9fff]/u.test(String(value || ''));
}

function presentationFor(finding, locale) {
  const riskCode = finding.risk_code || finding.code || null;
  const facts = { ...finding.facts };
  if (facts.ingredient_name === undefined) facts.ingredient_name = finding.ingredient_name || finding.name || '';
  if (facts.ingredient_id === undefined) facts.ingredient_id = finding.ingredient_id ?? null;
  const ingredientNames = facts.ingredient_id && INGREDIENT_NAMES[facts.ingredient_id];
  if (ingredientNames) facts.ingredient_name = ingredientNames[SUPPORTED_LOCALES.indexOf(locale)];
  if (facts.allergen === undefined) facts.allergen = finding.allergen || '';
  if (facts.basis === undefined) facts.basis = finding.basis || '';
  const template = riskCode && TEMPLATES[riskCode]?.[locale];
  const hasUnlocalizedIngredient = locale !== 'zh' && containsHan(facts.ingredient_name) && !ingredientNames;
  const hasUnlocalizedFact = locale !== 'zh' && Object.entries(facts)
    .some(([key, value]) => key !== 'ingredient_name' && typeof value === 'string' && containsHan(value));

  if (!template || hasUnlocalizedIngredient || hasUnlocalizedFact) {
    return {
      risk_code: riskCode,
      title: finding.title || '',
      reason: finding.reason || finding.message || '',
      adjustment: finding.adjustment || '',
      translation_status: 'fallback',
      fallback_locale: 'zh',
    };
  }

  return {
    risk_code: riskCode,
    title: interpolate(template[0], facts),
    reason: interpolate(template[1], facts).replace(/\s+/g, ' ').trim(),
    adjustment: interpolate(template[2], facts),
    translation_status: locale === 'zh' ? 'source' : 'translated',
    fallback_locale: null,
  };
}

function localizeFinding(finding, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const source = { ...finding, facts: finding.facts ? { ...finding.facts } : {} };
  const semantic = stripPresentation(source);
  const presentation = presentationFor(source, locale);
  return {
    semantic,
    presentation,
    localized: {
      ...semantic,
      risk_code: presentation.risk_code,
      title: presentation.title,
      reason: presentation.reason,
      adjustment: presentation.adjustment,
      translation_status: presentation.translation_status,
      fallback_locale: presentation.fallback_locale,
      ...(Object.hasOwn(source, 'message') ? { message: `${presentation.reason}${presentation.adjustment ? ` ${presentation.adjustment}` : ''}`.trim() } : {}),
    },
  };
}

function aggregateStatus(items, locale) {
  if (!items.length) return locale === 'zh' ? 'source' : 'translated';
  const statuses = new Set(items.map(item => item.presentation.translation_status));
  if (statuses.size === 1) return statuses.values().next().value;
  return statuses.has('fallback') ? 'partial' : locale === 'zh' ? 'source' : 'translated';
}

function localizeSemanticResult(result, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const sourceFindings = (result.findings || []).map(item => ({ ...item, facts: item.facts ? { ...item.facts } : {} }));
  const semantic = stripPresentation({ ...result, findings: sourceFindings });
  const localized = sourceFindings.map(item => localizeFinding(item, locale));
  const verdict = VERDICTS[result.verdict_code]?.[locale] || result.verdict || '';
  const presentation = { findings: localized.map(item => item.presentation), verdict };
  return {
    ...result,
    locale,
    translation_status: aggregateStatus(localized, locale),
    fallback_locale: localized.some(item => item.presentation.translation_status === 'fallback') ? 'zh' : null,
    semantic,
    presentation,
    findings: localized.map(item => item.localized),
    verdict,
  };
}

function validTranslatedText(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
}

function protectNumericText(value, field) {
  const tokens = [];
  const text = String(value || '').replace(/\d+(?:[.,]\d+)?(?:\s*(?:kcal|kg|mg|g|%|°c))?/gi, token => {
    const placeholder = `__${field.toUpperCase()}_VALUE_${tokens.length}__`;
    tokens.push({ placeholder, token });
    return placeholder;
  });
  return { text, tokens };
}

function restoreProtectedText(translated, protection) {
  const placeholders = String(translated || '').match(/__(?:TITLE|REASON|ADJUSTMENT)_VALUE_\d+__/g) || [];
  const expected = protection.tokens.map(item => item.placeholder);
  if (placeholders.length !== expected.length || placeholders.some((item, index) => item !== expected[index])) return null;
  return protection.tokens.reduce((text, item) => text.replace(item.placeholder, item.token), String(translated));
}

async function localizeSemanticResultWithAi(result, requestedLocale, translate) {
  const localized = localizeSemanticResult(result, requestedLocale);
  if (localized.locale === 'zh' || typeof translate !== 'function') return localized;
  const sourceFindings = result.findings || [];
  const protections = new Map();
  const candidates = sourceFindings.flatMap((finding, index) => {
    const presentation = localized.presentation.findings[index];
    if (presentation.translation_status !== 'fallback' || finding.risk_level === 'danger' || finding.domain === 'safety') return [];
    const itemId = `${finding.risk_code || finding.code}:${index}`;
    const protectedFields = Object.fromEntries(['title', 'reason', 'adjustment'].map(key => [key, protectNumericText(finding[key], key)]));
    protections.set(itemId, protectedFields);
    return [{
      item_id: itemId,
      risk_code: finding.risk_code || finding.code,
      title: protectedFields.title.text,
      reason: protectedFields.reason.text,
      adjustment: protectedFields.adjustment.text,
    }];
  });
  if (!candidates.length) return localized;

  try {
    const response = await translate({ locale: localized.locale, items: candidates });
    const byId = new Map((response?.items || []).filter(item => candidates.some(candidate => candidate.item_id === item.item_id && candidate.risk_code === item.risk_code)).map(item => [item.item_id, item]));
    let rejectedCount = 0;
    sourceFindings.forEach((finding, index) => {
      const itemId = `${finding.risk_code || finding.code}:${index}`;
      const translated = byId.get(itemId);
      const restored = translated && Object.fromEntries(['title', 'reason', 'adjustment'].map(key => [key, restoreProtectedText(translated[key], protections.get(itemId)[key])]));
      if (!translated || !['title', 'reason', 'adjustment'].every(key => validTranslatedText(translated[key]) && restored[key] !== null)) {
        if (candidates.some(candidate => candidate.item_id === itemId)) rejectedCount += 1;
        return;
      }
      const presentation = { risk_code: finding.risk_code || finding.code, title: restored.title.trim(), reason: restored.reason.trim(), adjustment: restored.adjustment.trim(), translation_status: 'ai_translated', fallback_locale: null };
      localized.presentation.findings[index] = presentation;
      localized.findings[index] = { ...localized.findings[index], ...presentation };
    });
    localized.translation_status = aggregateStatus(localized.presentation.findings.map(presentation => ({ presentation })), localized.locale);
    localized.fallback_locale = localized.presentation.findings.some(item => item.translation_status === 'fallback') ? 'zh' : null;
    if (rejectedCount) console.warn('[Localization] rejected invalid AI presentation', { locale: localized.locale, rejected_count: rejectedCount });
  } catch (error) {
    console.warn('[Localization] AI presentation fallback failed', {
      locale: localized.locale,
      candidate_count: candidates.length,
      failure: error?.name || 'invalid_response',
    });
    // Canonical Chinese remains visible; semantic safety and nutrition data are unchanged.
  }
  return localized;
}

module.exports = {
  SUPPORTED_LOCALES,
  normalizeLocale,
  localizeFinding,
  localizeSemanticResult,
  localizeSemanticResultWithAi,
  stripPresentation,
};
