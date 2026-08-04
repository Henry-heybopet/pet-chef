const { normalizeLocale } = require('./localization');

const locales = ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko'];
const byLocale = values => Object.fromEntries(locales.map((locale, index) => [locale, values[index]]));
const fill = (text, facts) => String(text || '').replace(/\{([a-z_]+)\}/g, (_, key) => String(facts?.[key] ?? ''));

const DETAILS = {
  BEEF_ENERGY: byLocale([
    '更换配方以牛肉等红肉为主，能量和脂肪通常高于低脂禽肉或鱼类。',
    'The replacement uses red meat such as beef and is generally higher in energy and fat than lean poultry or fish.',
    'Die neue Rezeptur nutzt rotes Fleisch wie Rind und enthält meist mehr Energie und Fett als mageres Geflügel oder Fisch.',
    'La nouvelle recette utilise de la viande rouge comme le bœuf, généralement plus riche en énergie et en graisses que la volaille maigre ou le poisson.',
    'La nueva receta usa carne roja como la ternera y suele aportar más energía y grasa que las aves magras o el pescado.',
    'La nuova ricetta usa carne rossa come il manzo ed è in genere più ricca di energia e grassi rispetto a pollame magro o pesce.',
    '変更後は牛肉などの赤身肉が中心で、低脂肪の鶏肉や魚よりエネルギーと脂質が高い傾向があります。',
    '변경 식단은 소고기 같은 적색육 중심으로, 저지방 가금류나 생선보다 열량과 지방이 높은 편입니다.',
  ]),
  LOW_FAT_SUPPORT: byLocale([
    '两款均偏低脂；更换配方通过南瓜等纤维来源进一步支持体重与关节管理。',
    'Both recipes are relatively low in fat; the replacement adds fiber sources such as pumpkin to support weight and joint management.',
    'Beide Rezepte sind eher fettarm; die neue Variante ergänzt Ballaststoffe wie Kürbis zur Gewichts- und Gelenkunterstützung.',
    'Les deux recettes sont plutôt pauvres en graisses ; la nouvelle ajoute des fibres comme la courge pour soutenir le poids et les articulations.',
    'Ambas recetas son relativamente bajas en grasa; la nueva añade fibra como calabaza para apoyar el control del peso y las articulaciones.',
    'Entrambe le ricette sono relativamente povere di grassi; la nuova aggiunge fibre come la zucca per peso e articolazioni.',
    'どちらも低脂肪寄りで、変更後はかぼちゃなどの食物繊維が体重と関節の管理を支えます。',
    '두 식단 모두 저지방이며, 변경 식단은 단호박 같은 섬유질로 체중과 관절 관리를 돕습니다.',
  ]),
  GENTLE_DIGESTION: byLocale([
    '更换配方采用温和的单一蛋白，脂肪较低，更适合消化敏感的犬只。',
    'The replacement uses a gentle single protein with lower fat, which may better suit dogs with sensitive digestion.',
    'Die neue Rezeptur nutzt eine gut verträgliche Einzelproteinquelle mit weniger Fett und eignet sich eher für empfindliche Verdauung.',
    'La nouvelle recette utilise une protéine unique douce et moins grasse, mieux adaptée aux chiens à digestion sensible.',
    'La nueva receta usa una proteína única suave y baja en grasa, más adecuada para perros con digestión sensible.',
    'La nuova ricetta usa una proteina unica delicata e meno grassa, più adatta ai cani con digestione sensibile.',
    '変更後は低脂肪で穏やかな単一たんぱく源を使い、消化が敏感な犬に適しています。',
    '변경 식단은 지방이 낮은 순한 단일 단백질을 사용해 소화가 민감한 반려견에게 더 적합합니다.',
  ]),
  FISH_ANTIOXIDANT: byLocale([
    '更换配方以鱼肉和抗氧化食材为主，可提供 Omega-3，并支持心血管与皮毛健康。',
    'The replacement emphasizes fish and antioxidant ingredients, providing Omega-3 support for cardiovascular and coat health.',
    'Die neue Rezeptur setzt auf Fisch und Antioxidantien und liefert Omega-3 zur Unterstützung von Herz-Kreislauf-System und Fell.',
    'La nouvelle recette privilégie le poisson et les antioxydants, avec des oméga-3 pour le cœur et le pelage.',
    'La nueva receta prioriza pescado y antioxidantes, con Omega-3 para apoyar la salud cardiovascular y del pelaje.',
    'La nuova ricetta privilegia pesce e antiossidanti, con Omega-3 per cuore e mantello.',
    '変更後は魚と抗酸化食材が中心で、Omega-3により心血管と被毛の健康を支えます。',
    '변경 식단은 생선과 항산화 식재료 중심으로 Omega-3를 공급해 심혈관과 피모 건강을 돕습니다.',
  ]),
  BALANCED_VARIETY: byLocale([
    '两款配方的蛋白质来源和纤维组成不同，但都可作为均衡轮换方案。',
    'The recipes differ in protein source and fiber composition, but both can serve as balanced rotation options.',
    'Die Rezepte unterscheiden sich bei Proteinquelle und Ballaststoffen, eignen sich aber beide für eine ausgewogene Rotation.',
    'Les recettes diffèrent par leurs protéines et leurs fibres, mais peuvent toutes deux convenir à une rotation équilibrée.',
    'Las recetas difieren en proteína y fibra, pero ambas pueden formar parte de una rotación equilibrada.',
    'Le ricette differiscono per proteine e fibre, ma entrambe possono rientrare in una rotazione equilibrata.',
    'たんぱく源と食物繊維の構成は異なりますが、どちらもバランスのよいローテーション候補です。',
    '단백질원과 섬유질 구성은 다르지만 두 식단 모두 균형 잡힌 순환 급여에 사용할 수 있습니다.',
  ]),
};

const REASONS = {
  BETTER_CURRENT: byLocale(['当前推荐（{current_score}%）更符合现有健康目标，更换配方为 {proposed_score}%。','The current recommendation ({current_score}%) better matches the active health goals; the replacement scores {proposed_score}%.','Die aktuelle Empfehlung ({current_score} %) passt besser zu den Gesundheitszielen; die neue Rezeptur erreicht {proposed_score} %.','La recommandation actuelle ({current_score} %) correspond mieux aux objectifs de santé ; la nouvelle obtient {proposed_score} %.','La recomendación actual ({current_score} %) se ajusta mejor a los objetivos de salud; la nueva obtiene {proposed_score} %.','La raccomandazione attuale ({current_score}%) è più adatta agli obiettivi di salute; la nuova ottiene {proposed_score}%.','現在の推奨（{current_score}%）の方が健康目標に合い、変更後は{proposed_score}%です。','현재 추천({current_score}%)이 건강 목표에 더 적합하며 변경 식단은 {proposed_score}%입니다.']),
  BETTER_PROPOSED: byLocale(['更换配方（{proposed_score}%）更贴合当前需求，当前推荐为 {current_score}%。','The replacement ({proposed_score}%) better matches the current needs; the existing recommendation scores {current_score}%.','Die neue Rezeptur ({proposed_score} %) passt besser zum aktuellen Bedarf; die bisherige erreicht {current_score} %.','La nouvelle recette ({proposed_score} %) correspond mieux aux besoins actuels ; l’actuelle obtient {current_score} %.','La nueva receta ({proposed_score} %) se ajusta mejor a las necesidades actuales; la vigente obtiene {current_score} %.','La nuova ricetta ({proposed_score}%) è più adatta alle esigenze attuali; quella vigente ottiene {current_score}%.','変更後（{proposed_score}%）の方が現在のニーズに合い、現行推奨は{current_score}%です。','변경 식단({proposed_score}%)이 현재 요구에 더 적합하며 기존 추천은 {current_score}%입니다.']),
  SIMILAR: byLocale(['两款均可使用；当前推荐为 {current_score}%，更换配方为 {proposed_score}%。','Both are suitable options; the current recipe scores {current_score}% and the replacement {proposed_score}%.','Beide Optionen sind geeignet; aktuell {current_score} %, neu {proposed_score} %.','Les deux options conviennent ; l’actuelle obtient {current_score} % et la nouvelle {proposed_score} %.','Ambas opciones son adecuadas; la actual obtiene {current_score}% y la nueva {proposed_score}%.','Entrambe sono adatte; l’attuale ottiene {current_score}% e la nuova {proposed_score}%.','どちらも候補になり、現行は{current_score}%、変更後は{proposed_score}%です。','두 식단 모두 적합하며 기존은 {current_score}%, 변경 식단은 {proposed_score}%입니다.']),
};

const WARNINGS = {
  LOW_FAT_BEEF: byLocale(['低脂或减量目标下，新配方的牛肉可能提高脂肪和总热量。','For a low-fat or weight-loss goal, beef in the new recipe may increase fat and total calories.','Bei einem fettarmen oder gewichtsreduzierenden Ziel kann Rind den Fett- und Kaloriengehalt erhöhen.','Avec un objectif pauvre en graisses ou de perte de poids, le bœuf peut augmenter les graisses et les calories.','Con un objetivo bajo en grasa o de pérdida de peso, la ternera puede aumentar la grasa y las calorías.','Con un obiettivo ipolipidico o dimagrante, il manzo può aumentare grassi e calorie.','低脂肪・減量目標では、新しい牛肉配合により脂質と総カロリーが増える可能性があります。','저지방 또는 감량 목표에서는 새 식단의 소고기가 지방과 총열량을 높일 수 있습니다.']),
  ALLERGEN: byLocale(['新配方命中宠物档案记录的过敏原“{allergen}”，请勿选择。','The new recipe matches the recorded allergen “{allergen}”. Do not select it.','Die neue Rezeptur enthält das hinterlegte Allergen „{allergen}“. Bitte nicht auswählen.','La nouvelle recette contient l’allergène enregistré « {allergen} ». Ne la choisissez pas.','La nueva receta coincide con el alérgeno registrado «{allergen}». No la seleccione.','La nuova ricetta contiene l’allergene registrato “{allergen}”. Non selezionarla.','新しいレシピは登録済みアレルゲン「{allergen}」に該当します。選択しないでください。','새 식단이 등록된 알레르기 유발 항목 “{allergen}”과 일치합니다. 선택하지 마세요.']),
  LARGE_PUPPY_B: byLocale(['大型幼犬需要精确控制钙磷比例，不建议更换为普通全价营养包。','Large-breed puppies need precise calcium-phosphorus control; do not replace this with a general complete nutrition pack.','Welpen großer Rassen benötigen eine genaue Kalzium-Phosphor-Kontrolle; nicht durch ein allgemeines Komplettpaket ersetzen.','Les chiots de grande race nécessitent un contrôle précis du calcium et du phosphore ; ne remplacez pas ce pack par un pack général.','Los cachorros de raza grande necesitan control preciso de calcio y fósforo; no lo sustituya por un pack general.','I cuccioli di taglia grande richiedono un controllo preciso di calcio e fosforo; non sostituire con un pack generico.','大型犬の子犬はカルシウムとリンの精密管理が必要です。一般用の総合栄養パックに変更しないでください。','대형견 강아지는 칼슘과 인 비율의 정밀 관리가 필요하므로 일반 완전 영양 팩으로 바꾸지 마세요.']),
  B_PACK_CHANGE: byLocale(['全价营养包与生命阶段和功能需求匹配，更换后需重新确认微量营养平衡。','The complete nutrition pack is matched to life stage and functional needs; recheck micronutrient balance after changing it.','Das Komplettpaket ist auf Lebensphase und Bedarf abgestimmt; nach einem Wechsel die Mikronährstoffbalance erneut prüfen.','Le pack complet correspond au stade de vie et aux besoins ; revérifiez l’équilibre en micronutriments après tout changement.','El pack completo se ajusta a la etapa vital y las necesidades; revise el equilibrio de micronutrientes tras cambiarlo.','Il pack completo è abbinato a fase di vita e bisogni; ricontrollare i micronutrienti dopo il cambio.','総合栄養パックはライフステージと目的に合わせています。変更後は微量栄養素のバランスを再確認してください。','완전 영양 팩은 생애 단계와 기능 요구에 맞춰져 있으므로 변경 후 미량 영양 균형을 다시 확인하세요.']),
  UPDATED: byLocale(['配置已更新，未发现新的明确营养冲突。','The configuration was updated with no new clear nutritional conflict detected.','Die Konfiguration wurde aktualisiert; es wurde kein neuer eindeutiger Nährstoffkonflikt erkannt.','La configuration a été mise à jour sans nouveau conflit nutritionnel manifeste.','La configuración se actualizó sin detectar un nuevo conflicto nutricional claro.','La configurazione è stata aggiornata senza nuovi conflitti nutrizionali evidenti.','設定を更新しました。新たな明確な栄養上の問題は見つかりませんでした。','설정이 업데이트되었으며 새로운 명확한 영양 충돌은 발견되지 않았습니다.']),
};

function localizeComparison(semantic, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const facts = semantic.facts || {};
  const warnings = (semantic.warning_items || []).map(item => fill(WARNINGS[item.code]?.[locale], item.facts || facts)).filter(Boolean);
  const detailCode = semantic.detail_code || 'BALANCED_VARIETY';
  const reasonCode = facts.proposed_score > facts.current_score ? 'BETTER_PROPOSED' : facts.proposed_score < facts.current_score ? 'BETTER_CURRENT' : 'SIMILAR';
  return {
    has_warning: Boolean(semantic.has_warning),
    warning_level: semantic.warning_level || 'none',
    warning_text: warnings.join(' ' ) || WARNINGS.UPDATED[locale],
    a_comparison: semantic.show_dialog ? {
      show_dialog: true,
      current_score: facts.current_score,
      proposed_score: facts.proposed_score,
      comparison_details: fill(DETAILS[detailCode]?.[locale] || DETAILS.BALANCED_VARIETY[locale], facts),
      score_reason: fill(REASONS[reasonCode][locale], facts),
    } : null,
    semantic,
    locale,
    translation_status: locale === 'zh' ? 'source' : 'translated',
  };
}

module.exports = { localizeComparison };
