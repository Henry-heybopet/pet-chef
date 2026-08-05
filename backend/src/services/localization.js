const { FRESH_CHECK_FINDING_TEMPLATES } = require('./fresh_check_finding_templates');

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

const L = (...values) => Object.fromEntries(SUPPORTED_LOCALES.map((locale, index) => [locale, values[index]]));
const EXTRA_FINDING_TEMPLATES = Object.freeze({
  MICRONUTRIENT_SOURCE_MISSING: Object.fromEntries(SUPPORTED_LOCALES.map((locale, index) => [locale, [
    ['长期主食缺少维生素和矿物质', 'Vitamins and minerals are missing for long-term feeding', 'Vitamine und Mineralstoffe fehlen für die Langzeitfütterung', 'Vitamines et minéraux manquants pour l’alimentation à long terme', 'Faltan vitaminas y minerales para la alimentación prolongada', 'Vitamine e minerali mancanti per l’alimentazione a lungo termine', '長期給与に必要なビタミン・ミネラルが不足しています', '장기 급여에 필요한 비타민과 미네랄이 부족합니다'][index],
    ['未识别到钙源或完整营养平衡包，长期可能造成营养失衡。', 'No calcium source or complete nutrition pack was identified, which may cause imbalance over time.', 'Es wurde keine Kalziumquelle oder kein vollständiges Nährstoffpaket erkannt; langfristig kann ein Ungleichgewicht entstehen.', 'Aucune source de calcium ni pack nutritionnel complet n’a été identifié, ce qui peut entraîner un déséquilibre à long terme.', 'No se identificó una fuente de calcio ni un pack nutricional completo, lo que puede causar desequilibrios con el tiempo.', 'Non è stata identificata una fonte di calcio o un pack nutrizionale completo; nel tempo può causare squilibri.', 'カルシウム源または総合栄養パックが確認できず、長期的に栄養バランスを崩す可能性があります。', '칼슘 공급원이나 완전 영양 팩이 확인되지 않아 장기적으로 영양 불균형이 생길 수 있습니다.'][index],
    ['按专业方案补充明确剂量的维生素和矿物质，或添加王牌全价营养包。', 'Add professionally dosed vitamins and minerals, or use a VIP Pet complete nutrition pack.', 'Ergänzen Sie fachlich dosierte Vitamine und Mineralstoffe oder verwenden Sie ein VIP Pet Vollnährstoffpaket.', 'Ajoutez des vitamines et minéraux dosés par un professionnel, ou utilisez un pack nutritionnel complet VIP Pet.', 'Añada vitaminas y minerales con dosis profesional o use un pack nutricional completo VIP Pet.', 'Aggiungere vitamine e minerali dosati professionalmente oppure usare un pack nutrizionale completo VIP Pet.', '専門的に用量設定されたビタミン・ミネラル、またはVIP Pet総合栄養パックを追加してください。', '전문가가 용량을 정한 비타민과 미네랄을 보충하거나 VIP Pet 완전 영양 팩을 추가하세요.'][index],
  ]])),
  SEASONING_RISK: Object.fromEntries(SUPPORTED_LOCALES.map((locale, index) => [locale, [
    ['高盐或复合调味风险', 'High-salt or mixed-seasoning risk', 'Risiko durch Salz oder Gewürzmischungen', 'Risque lié au sel ou aux assaisonnements', 'Riesgo por sal o condimentos', 'Rischio da sale o condimenti', '高塩分・複合調味料のリスク', '고염분 또는 복합 조미료 위험'][index],
    ['该食材可能含盐或成分不明的调味物。', 'This ingredient may contain salt or seasonings with unknown ingredients.', 'Diese Zutat kann Salz oder Gewürze mit unbekannten Bestandteilen enthalten.', 'Cet ingrédient peut contenir du sel ou des assaisonnements de composition inconnue.', 'Este ingrediente puede contener sal o condimentos de composición desconocida.', 'Questo ingrediente può contenere sale o condimenti dalla composizione sconosciuta.', '塩分や成分不明の調味料が含まれる可能性があります。', '소금이나 성분이 불분명한 조미료가 포함될 수 있습니다.'][index],
    ['改用无盐、未调味的原料，并确认完整配料表。', 'Use an unsalted, unseasoned ingredient and check the full ingredient list.', 'Verwenden Sie eine ungesalzene, ungewürzte Zutat und prüfen Sie die vollständige Zutatenliste.', 'Utilisez un ingrédient sans sel ni assaisonnement et vérifiez la liste complète.', 'Use un ingrediente sin sal ni condimentos y revise la lista completa.', 'Usare un ingrediente senza sale né condimenti e controllare l’elenco completo.', '無塩・無調味の原料に替え、全原材料を確認してください。', '무염·무조미 원료로 바꾸고 전체 원재료를 확인하세요.'][index],
  ]])),
  MACHINE_BATCH_LIMIT_EXCEEDED: Object.fromEntries(SUPPORTED_LOCALES.map((locale, index) => [locale, [
    ['单次总量超过鲜食机建议上限', 'Batch exceeds the appliance limit', 'Charge überschreitet die Gerätegrenze', 'La quantité dépasse la limite de l’appareil', 'El lote supera el límite del aparato', 'Il lotto supera il limite dell’apparecchio', '1回量が調理機の上限を超えています', '1회 조리량이 기기 한도를 초과합니다'][index],
    ['当前批次超过鲜食机建议处理上限。', 'This batch exceeds the recommended appliance capacity.', 'Diese Charge überschreitet die empfohlene Gerätekapa­zität.', 'Cette quantité dépasse la capacité recommandée de l’appareil.', 'Este lote supera la capacidad recomendada del aparato.', 'Questo lotto supera la capacità consigliata dell’apparecchio.', '現在の量は調理機の推奨処理上限を超えています。', '현재 분량이 기기의 권장 처리 한도를 초과합니다.'][index],
    ['拆分为不超过上限的批次后再转换烹饪方案。', 'Split it into batches within the limit before creating a cooking plan.', 'Teilen Sie die Menge vor Erstellung des Garplans in zulässige Chargen.', 'Divisez-la en lots conformes avant de créer le programme de cuisson.', 'Divídalo en lotes dentro del límite antes de crear el plan de cocción.', 'Dividerlo in lotti entro il limite prima di creare il piano di cottura.', '上限以内の量に分けてから調理プランを作成してください。', '한도 이내의 분량으로 나눈 뒤 조리 계획을 만드세요.'][index],
  ]])),
});

const GENERIC_FINDING = Object.freeze({
  nutrition: [
    L('营养检查结果', 'Nutrition check', 'Nährstoffprüfung', 'Contrôle nutritionnel', 'Revisión nutricional', 'Controllo nutrizionale', '栄養チェック', '영양 검사'),
    L('请结合本项的结构化数据查看营养结论。', 'Review this nutrition result together with its structured data.', 'Prüfen Sie dieses Ergebnis zusammen mit den strukturierten Daten.', 'Consultez ce résultat avec ses données structurées.', 'Revise este resultado junto con sus datos estructurados.', 'Valutare il risultato insieme ai dati strutturati.', '構造化データと併せて栄養結果を確認してください。', '구조화된 데이터와 함께 영양 결과를 확인하세요.'),
    L('按建议调整后重新验证。', 'Adjust the recipe and check again.', 'Passen Sie das Rezept an und prüfen Sie erneut.', 'Ajustez la recette puis vérifiez de nouveau.', 'Ajuste la receta y vuelva a comprobarla.', 'Modificare la ricetta e verificare di nuovo.', '調整後に再確認してください。', '조정한 뒤 다시 검사하세요.'),
  ],
  energy: [
    L('能量检查结果', 'Energy check', 'Energieprüfung', 'Contrôle énergétique', 'Revisión energética', 'Controllo energetico', 'エネルギーチェック', '에너지 검사'),
    L('请以本项的结构化数值为准。', 'Use the structured numeric values shown for this result.', 'Maßgeblich sind die strukturierten Zahlenwerte.', 'Utilisez les valeurs numériques structurées indiquées.', 'Use los valores numéricos estructurados indicados.', 'Fare riferimento ai valori numerici strutturati.', '表示された構造化数値を基準にしてください。', '표시된 구조화 수치를 기준으로 확인하세요.'),
    L('调整总量或能量密度后重新验证。', 'Adjust the amount or energy density and check again.', 'Passen Sie Menge oder Energiedichte an und prüfen Sie erneut.', 'Ajustez la quantité ou la densité énergétique puis revérifiez.', 'Ajuste la cantidad o densidad energética y vuelva a comprobar.', 'Modificare quantità o densità energetica e verificare di nuovo.', '量またはエネルギー密度を調整して再確認してください。', '총량 또는 에너지 밀도를 조정한 뒤 다시 검사하세요.'),
  ],
  profile: [
    L('宠物档案检查', 'Pet profile check', 'Tierprofilprüfung', 'Contrôle du profil', 'Revisión del perfil', 'Controllo del profilo', 'ペット情報チェック', '반려동물 프로필 검사'),
    L('该结论来自宠物档案与当前配方的结构化比对。', 'This result comes from a structured comparison of the pet profile and recipe.', 'Dieses Ergebnis basiert auf dem strukturierten Abgleich von Profil und Rezept.', 'Ce résultat provient de la comparaison structurée du profil et de la recette.', 'Este resultado procede de la comparación estructurada del perfil y la receta.', 'Il risultato deriva dal confronto strutturato tra profilo e ricetta.', 'ペット情報と配合の構造化比較による結果です。', '반려동물 프로필과 배합을 구조적으로 비교한 결과입니다.'),
    L('按档案约束调整；必要时咨询兽医。', 'Adjust for the profile constraints and consult a veterinarian when needed.', 'Passen Sie die Rezeptur an das Profil an und holen Sie bei Bedarf tierärztlichen Rat ein.', 'Adaptez la recette au profil et consultez un vétérinaire si nécessaire.', 'Ajuste la receta al perfil y consulte a un veterinario cuando sea necesario.', 'Adeguare la ricetta al profilo e consultare il veterinario se necessario.', 'プロフィール条件に合わせ、必要に応じて獣医師に相談してください。', '프로필 조건에 맞게 조정하고 필요하면 수의사와 상담하세요.'),
  ],
  cooking: [
    L('烹饪限制', 'Cooking limit', 'Gargrenze', 'Limite de cuisson', 'Límite de cocción', 'Limite di cottura', '調理上の制限', '조리 제한'),
    L('当前方案触发了鲜食机处理限制。', 'The current plan triggers an appliance processing limit.', 'Der aktuelle Plan überschreitet eine Verarbeitungsgrenze des Geräts.', 'Le plan actuel atteint une limite de traitement de l’appareil.', 'El plan actual alcanza un límite de procesamiento del aparato.', 'Il piano attuale raggiunge un limite operativo dell’apparecchio.', '現在のプランは調理機の処理制限に該当します。', '현재 계획이 기기 처리 제한에 해당합니다.'),
    L('调整后重新生成烹饪方案。', 'Adjust it before creating the cooking plan again.', 'Passen Sie den Plan an und erstellen Sie ihn erneut.', 'Ajustez-le avant de recréer le programme de cuisson.', 'Ajústelo antes de volver a crear el plan.', 'Modificarlo prima di ricreare il piano.', '調整後に調理プランを再作成してください。', '조정한 뒤 조리 계획을 다시 만드세요.'),
  ],
});
const KNOWN_FINDING_CODES = new Set([
  ...Object.keys(TEMPLATES),
  ...Object.keys(EXTRA_FINDING_TEMPLATES),
  ...Object.keys(FRESH_CHECK_FINDING_TEMPLATES),
]);
const KNOWN_VALIDATION_DETAIL_CODES = new Set([
  'NUTRITION_PROTEIN_BELOW_STAGE', 'NUTRITION_FAT_BELOW_STAGE',
  'NUTRITION_MICRONUTRIENT_INCOMPLETE', 'NUTRITION_DATA_COVERAGE_INCOMPLETE',
  'STRUCTURE_ANIMAL_PROTEIN_MISSING', 'STRUCTURE_ANIMAL_PROTEIN_VERY_LOW',
  'STRUCTURE_ANIMAL_PROTEIN_LOW', 'STRUCTURE_ANIMAL_PROTEIN_BELOW_IDEAL',
  'STRUCTURE_ANIMAL_PROTEIN_HIGH', 'STRUCTURE_CARB_HIGH', 'STRUCTURE_CARB_VERY_HIGH',
  'STRUCTURE_CARB_ABOVE_IDEAL', 'STRUCTURE_VEGETABLE_HIGH',
  'STRUCTURE_VEGETABLE_VERY_HIGH', 'STRUCTURE_FRUIT_HIGH', 'STRUCTURE_ORGAN_HIGH',
  'STRUCTURE_ORGAN_MISSING', 'STRUCTURE_FAT_SOURCE_MISSING',
  'LIFE_STAGE_MACRO_CHECK', 'BODY_SIZE_UNKNOWN', 'LARGE_PUPPY_PACK_UNCONFIRMED',
  'WEIGHT_ENERGY_PROFILE', 'WEIGHT_ENERGY_PUPPY_TARGET_CONFLICT',
  'ACTIVITY_NEUTER_GOAL_PROFILE', 'PHYSIOLOGY_PREGNANCY_LACTATION',
  'PHYSIOLOGY_RECOVERY_ALIGNED', 'PHYSIOLOGY_RECOVERY_NOT_ALIGNED',
  'HEALTH_CONSTRAINTS_REVIEWED', 'ALLERGY_CONFLICT', 'ALLERGY_NONE',
  'MISSING_WEIGHT', 'MISSING_ENERGY_SOURCE', 'EXCESSIVE_DAILY_FOOD_VOLUME',
  'DAILY_ENERGY_HIGH', 'DAILY_ENERGY_LOW', 'ENERGY_DENSITY_INCOMPLETE',
  'INEDIBLE', 'FORBIDDEN', 'AI_UNSAFE_INGREDIENT', 'INGREDIENT_SAFETY_UNCERTAIN',
  'SEASONING_RISK',
]);

const TEXT = Object.freeze({
  STAGE_PUPPY: L('幼犬', 'Puppy', 'Welpe', 'Chiot', 'Cachorro', 'Cucciolo', '子犬', '강아지'),
  STAGE_ADULT: L('成犬', 'Adult dog', 'Ausgewachsener Hund', 'Chien adulte', 'Perro adulto', 'Cane adulto', '成犬', '성견'),
  STAGE_SENIOR: L('老年犬', 'Senior dog', 'Seniorhund', 'Chien âgé', 'Perro sénior', 'Cane anziano', 'シニア犬', '노령견'),
  DAILY_ENERGY_ESTIMATE_PUPPY: L('幼犬能量公式仅为初始估算，应结合体重、BCS和生长曲线持续调整。', 'The puppy energy formula is an initial estimate; adjust it using weight, BCS, and the growth curve.', 'Die Energieformel für Welpen ist ein Ausgangswert und muss anhand von Gewicht, BCS und Wachstum angepasst werden.', 'La formule énergétique du chiot est une estimation initiale à ajuster avec le poids, le BCS et la croissance.', 'La fórmula energética del cachorro es una estimación inicial que debe ajustarse con peso, BCS y crecimiento.', 'La formula energetica del cucciolo è una stima iniziale da adattare con peso, BCS e crescita.', '子犬の必要エネルギーは初期推定値です。体重、BCS、成長曲線で継続調整してください。', '강아지 에너지 공식은 초기 추정치이며 체중, BCS, 성장 곡선에 따라 조정해야 합니다.'),
  DAILY_ENERGY_ESTIMATE_GENERAL: L('能量公式仅为初始估算，应结合体重和BCS持续调整。', 'The energy formula is an initial estimate; adjust it using weight and BCS.', 'Die Energieformel ist ein Ausgangswert und muss anhand von Gewicht und BCS angepasst werden.', 'La formule énergétique est une estimation initiale à ajuster avec le poids et le BCS.', 'La fórmula energética es una estimación inicial que debe ajustarse con peso y BCS.', 'La formula energetica è una stima iniziale da adattare con peso e BCS.', '必要エネルギーは初期推定値です。体重とBCSで継続調整してください。', '에너지 공식은 초기 추정치이며 체중과 BCS에 따라 조정해야 합니다.'),
  DAILY_NEED_NOT_VETERINARY_PRESCRIPTION: L(
    'AI营养建议基于犬类能量需求模型（RER/MER）、体重、年龄及活动水平综合计算，为日常喂养提供科学参考。建议根据体况评分（BCS）和实际变化持续调整。如存在疾病、特殊生理阶段或特殊营养需求，请咨询兽医。',
    'AI nutrition recommendations are calculated using canine energy requirement models (RER/MER), together with body weight, age, and activity level, to provide a science-based reference for daily feeding. Continue adjusting them according to body condition score (BCS) and observed changes. Consult a veterinarian if your dog has a medical condition, is in a special physiological stage, or has specific nutritional requirements.',
    'Die KI-gestützten Ernährungsempfehlungen werden anhand von Modellen zum Energiebedarf des Hundes (RER/MER) sowie Körpergewicht, Alter und Aktivitätsniveau berechnet und dienen als wissenschaftlich fundierte Orientierung für die tägliche Fütterung. Passen Sie die Empfehlungen fortlaufend an den Body Condition Score (BCS) und die tatsächliche Entwicklung an. Bei Erkrankungen, besonderen physiologischen Phasen oder speziellen Ernährungsbedürfnissen wenden Sie sich bitte an eine Tierärztin oder einen Tierarzt.',
    'Les recommandations nutritionnelles de l’IA sont calculées à partir des modèles de besoins énergétiques du chien (RER/MER), du poids, de l’âge et du niveau d’activité, afin de fournir une référence scientifiquement fondée pour l’alimentation quotidienne. Ajustez-les régulièrement selon le score d’état corporel (BCS) et l’évolution observée. Consultez un vétérinaire en cas de maladie, de stade physiologique particulier ou de besoins nutritionnels spécifiques.',
    'Las recomendaciones nutricionales de la IA se calculan mediante modelos de necesidades energéticas caninas (RER/MER), junto con el peso, la edad y el nivel de actividad, para ofrecer una referencia con base científica para la alimentación diaria. Ajústelas de forma continua según la puntuación de condición corporal (BCS) y los cambios observados. Consulte a un veterinario si el perro presenta una enfermedad, se encuentra en una etapa fisiológica especial o tiene necesidades nutricionales específicas.',
    'Le raccomandazioni nutrizionali dell’IA sono calcolate mediante modelli del fabbisogno energetico del cane (RER/MER), insieme a peso, età e livello di attività, per offrire un riferimento scientificamente fondato per l’alimentazione quotidiana. Adeguarle nel tempo in base al punteggio di condizione corporea (BCS) e ai cambiamenti osservati. Consultare un veterinario in presenza di patologie, fasi fisiologiche particolari o esigenze nutrizionali specifiche.',
    'AIによる栄養提案は、犬のエネルギー必要量モデル（RER/MER）に体重、年齢、活動量を組み合わせて算出し、日常の給与量を検討するための科学的根拠に基づく参考情報を提供します。ボディコンディションスコア（BCS）と実際の変化に応じて継続的に調整してください。疾患、特別な生理段階、または特別な栄養管理が必要な場合は、獣医師に相談してください。',
    'AI 영양 권장 사항은 반려견의 에너지 요구량 모델(RER/MER)에 체중, 나이, 활동 수준을 종합하여 계산하며, 일상 급여를 위한 과학적 참고 기준을 제공합니다. 신체 충실도 점수(BCS)와 실제 변화에 따라 지속적으로 조정하세요. 질환이 있거나 특수 생리 단계에 있거나 특별한 영양 관리가 필요한 경우 수의사와 상담하세요.',
  ),
  COOKING_PLAN_AWAITING_CONFIRMATION_NOT_SENT: L('这是待人工确认的鲜食机烹饪参数，尚未下发设备。', 'These appliance settings require human confirmation and have not been sent to the device.', 'Diese Geräteeinstellungen müssen bestätigt werden und wurden noch nicht an das Gerät gesendet.', 'Ces paramètres doivent être confirmés et n’ont pas été envoyés à l’appareil.', 'Estos parámetros requieren confirmación y aún no se han enviado al aparato.', 'Questi parametri richiedono conferma e non sono stati inviati all’apparecchio.', 'この調理設定は確認待ちで、機器にはまだ送信されていません。', '이 조리 설정은 확인 전이며 아직 기기로 전송되지 않았습니다.'),
  SCORE_SAFETY_LABEL: L('食材安全性', 'Ingredient safety', 'Zutatensicherheit', 'Sécurité des ingrédients', 'Seguridad de ingredientes', 'Sicurezza degli ingredienti', '食材の安全性', '식재료 안전성'),
  SCORE_SUITABILITY_LABEL: L('宠物适配性', 'Pet suitability', 'Eignung für das Tier', 'Adaptation à l’animal', 'Adecuación a la mascota', 'Idoneità per l’animale', 'ペット適合性', '반려동물 적합성'),
  SCORE_STRUCTURE_LABEL: L('食谱结构平衡性', 'Recipe structure', 'Rezeptstruktur', 'Structure de la recette', 'Estructura de la receta', 'Struttura della ricetta', 'レシピ構成', '레시피 구성'),
  SCORE_NUTRITION_LABEL: L('营养完整性', 'Nutritional completeness', 'Nährstoffvollständigkeit', 'Complétude nutritionnelle', 'Integridad nutricional', 'Completezza nutrizionale', '栄養の完全性', '영양 완전성'),
  SCORE_LONG_TERM_LABEL: L('长期适宜性', 'Long-term suitability', 'Langzeiteignung', 'Adaptation à long terme', 'Adecuación a largo plazo', 'Idoneità a lungo termine', '長期適合性', '장기 적합성'),
  SCORE_ENERGY_LABEL: L('能量需求满足度', 'Energy coverage', 'Energiebedarfsdeckung', 'Couverture énergétique', 'Cobertura energética', 'Copertura energetica', 'エネルギー充足度', '에너지 충족도'),
  SUITABILITY_LIFE_STAGE_LABEL: L('年龄与生命阶段', 'Age and life stage', 'Alter und Lebensphase', 'Âge et stade de vie', 'Edad y etapa vital', 'Età e fase di vita', '年齢とライフステージ', '나이와 생애 단계'),
  SUITABILITY_BODY_SIZE_LABEL: L('体型与成长约束', 'Body size and growth', 'Körpergröße und Wachstum', 'Gabarit et croissance', 'Tamaño y crecimiento', 'Taglia e crescita', '体格と成長条件', '체형과 성장 조건'),
  SUITABILITY_WEIGHT_ENERGY_LABEL: L('体重、目标与能量', 'Weight, goal, and energy', 'Gewicht, Ziel und Energie', 'Poids, objectif et énergie', 'Peso, objetivo y energía', 'Peso, obiettivo ed energia', '体重・目標・エネルギー', '체중·목표·에너지'),
  SUITABILITY_ACTIVITY_NEUTER_LABEL: L('活动、绝育与喂养目标', 'Activity, neutering, and goal', 'Aktivität, Kastration und Ziel', 'Activité, stérilisation et objectif', 'Actividad, esterilización y objetivo', 'Attività, sterilizzazione e obiettivo', '活動量・避妊去勢・給餌目標', '활동량·중성화·급여 목표'),
  SUITABILITY_PHYSIOLOGY_LABEL: L('孕哺与恢复状态', 'Reproductive and recovery state', 'Fortpflanzungs- und Erholungsstatus', 'État reproductif et récupération', 'Estado reproductivo y recuperación', 'Stato riproduttivo e recupero', '妊娠授乳・回復状態', '임신·수유 및 회복 상태'),
  SUITABILITY_HEALTH_LABEL: L('基础疾病约束', 'Health constraints', 'Gesundheitliche Einschränkungen', 'Contraintes de santé', 'Restricciones de salud', 'Vincoli di salute', '基礎疾患の条件', '건강 제약'),
  SUITABILITY_ALLERGY_LABEL: L('过敏与不耐受', 'Allergy and intolerance', 'Allergie und Unverträglichkeit', 'Allergie et intolérance', 'Alergia e intolerancia', 'Allergia e intolleranza', 'アレルギー・不耐性', '알레르기 및 불내증'),
  EARLY_PUPPY_RER_ACTIVITY_NOT_MULTIPLIED: L('4个月以下幼犬按3×RER估算，不重复叠加活动系数。', 'For puppies under four months, use 3×RER without applying the activity factor again.', 'Bei Welpen unter vier Monaten wird 3×RER ohne erneuten Aktivitätsfaktor verwendet.', 'Pour les chiots de moins de quatre mois, utilisez 3×RER sans ajouter le facteur d’activité.', 'Para cachorros menores de cuatro meses, use 3×RER sin volver a aplicar el factor de actividad.', 'Per cuccioli sotto i quattro mesi usare 3×RER senza riapplicare il fattore attività.', '4か月未満の子犬は3×RERで推定し、活動係数を重ねません。', '4개월 미만 강아지는 3×RER로 계산하며 활동 계수를 중복 적용하지 않습니다.'),
  PUPPY_TARGET_WEIGHT_CONFLICT: L('幼犬目标体重低于当前体重，本次不用于减重推导。', 'The puppy target weight is below the current weight and is not used to infer weight loss.', 'Das Zielgewicht des Welpen liegt unter dem aktuellen Gewicht und wird nicht zur Gewichtsabnahme verwendet.', 'Le poids cible du chiot est inférieur au poids actuel et n’est pas utilisé pour déduire une perte de poids.', 'El peso objetivo del cachorro es inferior al actual y no se usa para inferir una pérdida de peso.', 'Il peso obiettivo del cucciolo è inferiore a quello attuale e non viene usato per dedurre un dimagrimento.', '子犬の目標体重が現在体重を下回るため、減量推定には使用しません。', '강아지 목표 체중이 현재 체중보다 낮아 감량 추정에는 사용하지 않습니다.'),
  GI_GOAL_CONSERVATIVE_ADJUSTMENT: L('已按肠胃护理目标保守调整，并建议少量多餐。', 'A conservative gastrointestinal adjustment was applied; offer smaller, more frequent meals.', 'Für das Magen-Darm-Ziel wurde konservativ angepasst; füttern Sie kleinere, häufigere Mahlzeiten.', 'Un ajustement digestif prudent a été appliqué ; proposez de petits repas plus fréquents.', 'Se aplicó un ajuste digestivo prudente; ofrezca comidas pequeñas y frecuentes.', 'È stato applicato un adeguamento gastrointestinale prudente; offrire pasti piccoli e frequenti.', '胃腸ケア目標に合わせて控えめに調整し、少量を複数回与えることを推奨します。', '위장 관리 목표에 맞춰 보수적으로 조정했으며 소량씩 자주 급여하세요.'),
  INCREASE_ENERGY_DENSITY_AND_LIMIT_VOLUME: L('在保持营养平衡的前提下提高能量密度，并将每日总量控制在参考上限内。', 'Increase energy density while preserving nutritional balance and keep the daily amount within the reference limit.', 'Erhöhen Sie die Energiedichte bei ausgewogener Ernährung und halten Sie die Tagesmenge innerhalb der Referenzgrenze.', 'Augmentez la densité énergétique en préservant l’équilibre et limitez la quantité quotidienne.', 'Aumente la densidad energética manteniendo el equilibrio y limite la cantidad diaria.', 'Aumentare la densità energetica mantenendo l’equilibrio e limitare la quantità giornaliera.', '栄養バランスを保ちながらエネルギー密度を高め、1日の総量を目安内に抑えてください。', '영양 균형을 유지하며 에너지 밀도를 높이고 일일 총량을 기준 이내로 제한하세요.'),
  KEEP_DENSITY_AND_LIMIT_VOLUME: L('当前能量密度无需提高，请在保持营养比例的前提下控制每日总量。', 'The current energy density does not need to increase; control the daily amount while preserving nutrient ratios.', 'Die Energiedichte muss nicht erhöht werden; begrenzen Sie die Tagesmenge bei gleichbleibenden Nährstoffverhältnissen.', 'La densité énergétique n’a pas besoin d’augmenter ; contrôlez la quantité quotidienne en conservant les proportions.', 'No es necesario aumentar la densidad energética; controle la cantidad diaria manteniendo las proporciones.', 'Non è necessario aumentare la densità energetica; controllare la quantità giornaliera mantenendo le proporzioni.', '現在のエネルギー密度を上げる必要はありません。栄養比率を保って1日の量を調整してください。', '현재 에너지 밀도를 높일 필요는 없습니다. 영양 비율을 유지하며 일일 총량을 조절하세요.'),
  LONG_TERM_LIMITING_FACTORS: L('长期适宜性由最低评分因素限制。', 'Long-term suitability is limited by the lowest-scoring factors.', 'Die Langzeiteignung wird durch die niedrigsten Teilwerte begrenzt.', 'L’adaptation à long terme est limitée par les facteurs les moins bien notés.', 'La adecuación a largo plazo está limitada por los factores con menor puntuación.', 'L’idoneità a lungo termine è limitata dai fattori con punteggio più basso.', '長期適合性は最も低い評価項目によって制限されます。', '장기 적합성은 점수가 가장 낮은 요인에 의해 제한됩니다.'),
  B_PACK_DOSE_10_PERCENT_POST_COOK: L('每100克食材配10克全价营养包，烹饪后拌入。', 'Mix 10 g of complete nutrition pack per 100 g of ingredients after cooking.', 'Nach dem Garen 10 g Komplettnahrungspackung je 100 g Zutaten untermischen.', 'Après cuisson, mélangez 10 g de complément complet pour 100 g d’ingrédients.', 'Tras la cocción, mezcle 10 g de complemento completo por cada 100 g de ingredientes.', 'Dopo la cottura, mescolare 10 g di complemento completo ogni 100 g di ingredienti.', '食材100gあたり総合栄養パック10gを、加熱後に混ぜてください。', '식재료 100g당 종합 영양팩 10g을 조리 후 섞으세요.'),
  B_PACK_PUPPY_GENERAL: L('幼犬通用', 'Puppy general', 'Welpen allgemein', 'Chiot général', 'Cachorro general', 'Cucciolo generale', '子犬用', '강아지 일반'),
  B_PACK_LARGE_PUPPY_CONTROLLED_CALCIUM: L('大型幼犬控钙', 'Large-puppy controlled calcium', 'Kontrolliertes Calcium für große Welpen', 'Calcium contrôlé pour grand chiot', 'Calcio controlado para cachorro grande', 'Calcio controllato per cucciolo grande', '大型子犬用カルシウム調整', '대형견 강아지 칼슘 조절'),
  B_PACK_ADULT_GENERAL: L('成犬通用', 'Adult general', 'Erwachsene allgemein', 'Adulte général', 'Adulto general', 'Adulto generale', '成犬用', '성견 일반'),
  B_PACK_SENIOR_GENERAL: L('老年犬通用', 'Senior general', 'Senior allgemein', 'Senior général', 'Sénior general', 'Senior generale', 'シニア犬用', '노령견 일반'),
  B_PACK_COAT_CARE: L('美毛护肤', 'Coat and skin care', 'Fell- und Hautpflege', 'Soin peau et pelage', 'Cuidado de piel y pelo', 'Cura di cute e pelo', '皮膚・被毛ケア', '피부·피모 관리'),
  B_PACK_HYPOALLERGENIC_SINGLE_PROTEIN: L('低敏单一蛋白', 'Hypoallergenic single protein', 'Hypoallergenes Einzelprotein', 'Monoprotéine hypoallergénique', 'Monoproteína hipoalergénica', 'Monoproteina ipoallergenica', '低アレルゲン単一たんぱく', '저알레르기 단일 단백질'),
  B_PACK_LIVER_SUPPORT: L('护肝', 'Liver support', 'Leberunterstützung', 'Soutien hépatique', 'Apoyo hepático', 'Supporto epatico', '肝臓サポート', '간 건강 지원'),
  B_PACK_ELIGIBLE_REASON: L('符合当前宠物档案。', 'Suitable for the current pet profile.', 'Für das aktuelle Tierprofil geeignet.', 'Adapté au profil actuel de l’animal.', 'Adecuado para el perfil actual.', 'Adatto al profilo attuale.', '現在のペット情報に適合します。', '현재 반려동물 프로필에 적합합니다.'),
  B_PACK_NOT_ELIGIBLE_REASON: L('不符合当前宠物档案或生命阶段。', 'Not suitable for the current pet profile or life stage.', 'Nicht für das aktuelle Tierprofil oder die Lebensphase geeignet.', 'Non adapté au profil ou au stade de vie actuel.', 'No es adecuado para el perfil o etapa vital actual.', 'Non adatto al profilo o alla fase di vita attuale.', '現在のペット情報またはライフステージには適合しません。', '현재 반려동물 프로필 또는 생애 단계에 적합하지 않습니다.'),
  B_PACK_DATA_CONFLICT: L('营养包数据存在冲突，请管理员确认。', 'Nutrition-pack data conflict; administrator review is required.', 'Datenkonflikt beim Nährstoffpaket; administrative Prüfung erforderlich.', 'Conflit de données du complément ; vérification administrative requise.', 'Conflicto de datos del complemento; se requiere revisión administrativa.', 'Conflitto nei dati del complemento; serve una verifica amministrativa.', '栄養パックのデータに競合があり、管理者確認が必要です。', '영양팩 데이터가 충돌하여 관리자 확인이 필요합니다.'),
  B_PACK_DESCRIPTION: L('按对应生命阶段或健康需求设计的全价营养包。', 'Complete nutrition pack for the corresponding life stage or health need.', 'Komplettes Nährstoffpaket für die jeweilige Lebensphase oder den Gesundheitsbedarf.', 'Complément nutritionnel complet adapté au stade de vie ou au besoin de santé.', 'Complemento nutricional completo para la etapa vital o necesidad de salud.', 'Complemento nutrizionale completo per la fase di vita o esigenza di salute.', '対応するライフステージや健康目的向けの総合栄養パックです。', '해당 생애 단계 또는 건강 목적에 맞춘 종합 영양팩입니다.'),
  SUITABILITY_DEDUCTIONS_PRESENT: L('七项适配检查中存在扣分项目。', 'Some of the seven suitability checks have deductions.', 'Bei einigen der sieben Eignungsprüfungen gibt es Abzüge.', 'Certaines des sept vérifications d’adaptation comportent des déductions.', 'Algunas de las siete comprobaciones de adecuación tienen deducciones.', 'Alcuni dei sette controlli di idoneità presentano detrazioni.', '7項目の適合性チェックに減点があります。', '7개 적합성 검사 중 감점 항목이 있습니다.'),
  SUITABILITY_DEDUCTIONS_NONE: L('七项宠物档案适配检查均未发现扣分。', 'No deductions were found in the seven pet-profile suitability checks.', 'Bei den sieben Eignungsprüfungen wurden keine Abzüge festgestellt.', 'Aucune déduction n’a été relevée dans les sept vérifications du profil.', 'No se encontraron deducciones en las siete comprobaciones del perfil.', 'Non sono state rilevate detrazioni nei sette controlli del profilo.', '7項目のペット情報適合性チェックで減点はありません。', '7개 반려동물 프로필 적합성 검사에서 감점이 없습니다.'),
  SUITABILITY_LIFE_STAGE_REASON: L('当前生命阶段的蛋白质与脂肪最低值已按结构化标准核对。', 'Protein and fat minimums were checked against the structured standard for this life stage.', 'Protein- und Fettmindestwerte wurden nach dem strukturierten Standard dieser Lebensphase geprüft.', 'Les minimums de protéines et de lipides ont été vérifiés selon la norme structurée de ce stade de vie.', 'Los mínimos de proteína y grasa se comprobaron según el estándar estructurado de esta etapa.', 'I minimi di proteine e grassi sono stati verificati secondo lo standard strutturato della fase di vita.', '現在のライフステージの構造化基準で、たんぱく質と脂質の最低値を確認しました。', '현재 생애 단계의 구조화 기준으로 단백질과 지방 최저치를 확인했습니다.'),
  SUITABILITY_BODY_SIZE_REASON: L('已根据体型与成长阶段检查大型幼犬控钙要求。', 'Body size and growth stage were checked for large-puppy calcium-control requirements.', 'Körpergröße und Wachstum wurden auf die Calciumkontrolle großer Welpen geprüft.', 'Le gabarit et la croissance ont été vérifiés pour les besoins de contrôle du calcium des grands chiots.', 'Se comprobaron el tamaño y crecimiento para los requisitos de control de calcio de cachorros grandes.', 'Taglia e crescita sono state verificate per i requisiti di controllo del calcio dei cuccioli grandi.', '体格と成長段階から、大型子犬のカルシウム管理要件を確認しました。', '체형과 성장 단계에 따라 대형견 강아지의 칼슘 관리 요건을 확인했습니다.'),
  SUITABILITY_WEIGHT_ENERGY_REASON: L('能量与食量可执行性得分为 {energy_score}；当前体重 {current_weight_kg} kg，目标体重 {target_weight_kg} kg。', 'Energy and intake feasibility score: {energy_score}; current weight {current_weight_kg} kg, target weight {target_weight_kg} kg.', 'Bewertung für Energie und Futtermenge: {energy_score}; aktuelles Gewicht {current_weight_kg} kg, Zielgewicht {target_weight_kg} kg.', 'Score de faisabilité énergie et quantité : {energy_score} ; poids actuel {current_weight_kg} kg, poids cible {target_weight_kg} kg.', 'Puntuación de viabilidad de energía y cantidad: {energy_score}; peso actual {current_weight_kg} kg, objetivo {target_weight_kg} kg.', 'Punteggio di fattibilità energia e quantità: {energy_score}; peso attuale {current_weight_kg} kg, obiettivo {target_weight_kg} kg.', 'エネルギーと食事量の実行可能性スコアは {energy_score}、現在体重 {current_weight_kg} kg、目標体重 {target_weight_kg} kgです。', '에너지와 급여량 실행 가능성 점수는 {energy_score}, 현재 체중 {current_weight_kg} kg, 목표 체중 {target_weight_kg} kg입니다.'),
  SUITABILITY_ACTIVITY_NEUTER_REASON: L('已按活动水平、绝育状态和喂养目标核对档案。', 'The profile was checked for activity level, neuter status, and feeding goal.', 'Das Profil wurde anhand von Aktivität, Kastrationsstatus und Fütterungsziel geprüft.', 'Le profil a été vérifié selon l’activité, la stérilisation et l’objectif alimentaire.', 'El perfil se comprobó según actividad, esterilización y objetivo de alimentación.', 'Il profilo è stato verificato per attività, sterilizzazione e obiettivo alimentare.', '活動量、避妊去勢状態、給餌目標でプロフィールを確認しました。', '활동량, 중성화 상태, 급여 목표에 따라 프로필을 확인했습니다.'),
  SUITABILITY_PHYSIOLOGY_REASON: L('已核对孕哺、恢复期与当前喂养目标是否一致。', 'Pregnancy, lactation, recovery state, and feeding goal were checked for alignment.', 'Trächtigkeit, Laktation, Erholung und Fütterungsziel wurden auf Übereinstimmung geprüft.', 'La gestation, la lactation, la récupération et l’objectif alimentaire ont été vérifiés.', 'Se comprobaron la gestación, lactancia, recuperación y el objetivo de alimentación.', 'Sono stati verificati gravidanza, allattamento, recupero e obiettivo alimentare.', '妊娠授乳、回復状態、給餌目標の整合性を確認しました。', '임신·수유, 회복 상태와 급여 목표의 일치 여부를 확인했습니다.'),
  SUITABILITY_HEALTH_REASON: L('已按宠物档案中的健康记录执行约束检查。', 'Health constraints were checked against the pet profile records.', 'Gesundheitliche Einschränkungen wurden anhand des Tierprofils geprüft.', 'Les contraintes de santé ont été vérifiées selon le profil de l’animal.', 'Las restricciones de salud se comprobaron según el perfil de la mascota.', 'I vincoli di salute sono stati verificati in base al profilo dell’animale.', 'ペット情報の健康記録に基づいて制約を確認しました。', '반려동물 프로필의 건강 기록에 따라 제약 조건을 확인했습니다.'),
  SUITABILITY_ALLERGY_SAFE_REASON: L('未发现当前食材与已登记过敏或不耐受记录冲突。', 'No conflict was found between the ingredients and recorded allergies or intolerances.', 'Es wurde kein Konflikt mit erfassten Allergien oder Unverträglichkeiten gefunden.', 'Aucun conflit n’a été trouvé avec les allergies ou intolérances enregistrées.', 'No se encontraron conflictos con alergias o intolerancias registradas.', 'Non sono stati trovati conflitti con allergie o intolleranze registrate.', '食材と登録済みのアレルギー・不耐性記録に競合はありません。', '식재료와 등록된 알레르기 또는 불내증 기록 간 충돌이 없습니다.'),
  SUITABILITY_ALLERGY_CONFLICT_REASON: L('当前食谱命中过敏或食物限制记录。', 'The current recipe matches an allergy or food-restriction record.', 'Das aktuelle Rezept trifft auf einen Allergie- oder Ausschlusseintrag.', 'La recette actuelle correspond à une allergie ou restriction alimentaire enregistrée.', 'La receta actual coincide con una alergia o restricción alimentaria registrada.', 'La ricetta attuale coincide con un’allergia o una restrizione alimentare registrata.', '現在のレシピがアレルギーまたは食事制限記録に該当します。', '현재 레시피가 알레르기 또는 식이 제한 기록과 일치합니다.'),
  SUITABILITY_LIFE_STAGE_ADJUSTMENT: L('当前阶段未达标时，提高蛋白质和脂肪密度后重新验证。', 'If below the life-stage minimums, increase protein and fat density and check again.', 'Bei Unterschreitung Protein- und Fettdichte erhöhen und erneut prüfen.', 'Si les minimums ne sont pas atteints, augmentez la densité en protéines et lipides puis revérifiez.', 'Si no se alcanzan los mínimos, aumente la densidad de proteína y grasa y vuelva a comprobar.', 'Se i minimi non sono raggiunti, aumentare proteine e grassi e verificare di nuovo.', '段階別最低値を下回る場合は、たんぱく質と脂質密度を上げて再確認してください。', '단계별 최저치 미달 시 단백질과 지방 밀도를 높인 뒤 다시 검사하세요.'),
  SUITABILITY_BODY_SIZE_ADJUSTMENT: L('大型或巨型幼犬需确认控钙成长方案。', 'Confirm a calcium-controlled growth plan for large or giant puppies.', 'Für große oder riesige Welpen ist ein calciumkontrollierter Wachstumsplan zu bestätigen.', 'Confirmez un plan de croissance à calcium contrôlé pour les grands chiots.', 'Confirme un plan de crecimiento con calcio controlado para cachorros grandes o gigantes.', 'Confermare un piano di crescita a calcio controllato per cuccioli grandi o giganti.', '大型・超大型の子犬はカルシウム管理された成長プランを確認してください。', '대형 또는 초대형견 강아지는 칼슘 조절 성장 계획을 확인하세요.'),
  SUITABILITY_WEIGHT_ENERGY_ADJUSTMENT: L('调整食谱总量或能量密度，并复核当前体重与目标体重。', 'Adjust the recipe amount or energy density and review current and target weight.', 'Rezeptmenge oder Energiedichte anpassen und aktuelles sowie Zielgewicht prüfen.', 'Ajustez la quantité ou la densité énergétique et revérifiez les poids actuel et cible.', 'Ajuste la cantidad o densidad energética y revise los pesos actual y objetivo.', 'Modificare quantità o densità energetica e verificare peso attuale e obiettivo.', 'レシピ量またはエネルギー密度を調整し、現在体重と目標体重を再確認してください。', '레시피 총량 또는 에너지 밀도를 조정하고 현재·목표 체중을 재확인하세요.'),
  SUITABILITY_ACTIVITY_NEUTER_ADJUSTMENT: L('补全活动水平、绝育状态和喂养目标。', 'Complete the activity, neuter-status, and feeding-goal fields.', 'Aktivität, Kastrationsstatus und Fütterungsziel vervollständigen.', 'Complétez l’activité, la stérilisation et l’objectif alimentaire.', 'Complete actividad, esterilización y objetivo de alimentación.', 'Completare attività, sterilizzazione e obiettivo alimentare.', '活動量、避妊去勢状態、給餌目標を入力してください。', '활동량, 중성화 상태, 급여 목표를 완성하세요.'),
  SUITABILITY_PHYSIOLOGY_ADJUSTMENT: L('孕哺或恢复期应使用对应的专用长期方案。', 'Use a dedicated long-term plan during pregnancy, lactation, or recovery.', 'Während Trächtigkeit, Laktation oder Erholung einen speziellen Langzeitplan verwenden.', 'Utilisez un plan à long terme dédié pendant la gestation, la lactation ou la récupération.', 'Use un plan específico a largo plazo durante gestación, lactancia o recuperación.', 'Usare un piano a lungo termine dedicato durante gravidanza, allattamento o recupero.', '妊娠授乳期または回復期は専用の長期プランを使用してください。', '임신·수유 또는 회복기에는 전용 장기 계획을 사용하세요.'),
  SUITABILITY_HEALTH_ADJUSTMENT: L('存在健康记录时按疾病约束调整，并听从专业医师建议。', 'When health records exist, adjust for the condition and follow veterinary advice.', 'Bei Gesundheitseinträgen nach den Erkrankungsgrenzen anpassen und tierärztlichen Rat befolgen.', 'En présence de problèmes de santé, adaptez la recette et suivez l’avis vétérinaire.', 'Si hay registros de salud, ajuste según la afección y siga el consejo veterinario.', 'In presenza di condizioni di salute, adeguare la ricetta e seguire il parere veterinario.', '健康記録がある場合は疾患条件に合わせ、獣医師の助言に従ってください。', '건강 기록이 있으면 질환 제약에 맞게 조정하고 수의사 조언을 따르세요.'),
  SUITABILITY_ALLERGY_ADJUSTMENT: L('删除冲突食材并选择安全替代来源。', 'Remove conflicting ingredients and choose a safe alternative.', 'Unverträgliche Zutaten entfernen und eine sichere Alternative wählen.', 'Retirez les ingrédients en conflit et choisissez une alternative sûre.', 'Elimine los ingredientes en conflicto y elija una alternativa segura.', 'Rimuovere gli ingredienti in conflitto e scegliere un’alternativa sicura.', '競合する食材を除き、安全な代替食材を選んでください。', '충돌 식재료를 제거하고 안전한 대체 식재료를 선택하세요.'),
  LONG_TERM_NUTRITION_ADJUSTMENT: L('当前阶段所需的宏量和微量营养需补齐。', 'Complete the macro- and micronutrients required for this life stage.', 'Die für diese Lebensphase nötigen Makro- und Mikronährstoffe ergänzen.', 'Complétez les macro- et micronutriments requis à ce stade de vie.', 'Complete los macro y micronutrientes requeridos para esta etapa.', 'Completare macro e micronutrienti richiesti per questa fase.', '現在の段階に必要な主要・微量栄養素を補ってください。', '현재 단계에 필요한 다량·미량 영양소를 보완하세요.'),
  LONG_TERM_STRUCTURE_ADJUSTMENT: L('按建议调整动物蛋白、内脏、碳水、果蔬和脂肪来源比例。', 'Adjust animal protein, organ, carbohydrate, produce, and fat-source ratios as advised.', 'Tierprotein, Innereien, Kohlenhydrate, Obst und Gemüse sowie Fettquellen anpassen.', 'Ajustez les proportions de protéines animales, abats, glucides, végétaux et lipides.', 'Ajuste las proporciones de proteína animal, vísceras, carbohidratos, vegetales y grasas.', 'Adeguare le proporzioni di proteine animali, organi, carboidrati, vegetali e grassi.', '動物性たんぱく、内臓、炭水化物、野菜果物、脂質源の比率を調整してください。', '동물성 단백질, 내장, 탄수화물, 채소·과일, 지방원 비율을 조정하세요.'),
  LONG_TERM_ENERGY_ADJUSTMENT: L('调整总量或能量密度，使每日热量进入建议范围。', 'Adjust the amount or energy density so daily calories enter the recommended range.', 'Menge oder Energiedichte anpassen, damit die Tagesenergie im Zielbereich liegt.', 'Ajustez la quantité ou la densité énergétique pour atteindre la plage quotidienne.', 'Ajuste la cantidad o densidad energética para entrar en el rango diario recomendado.', 'Modificare quantità o densità energetica per rientrare nell’intervallo giornaliero.', '総量またはエネルギー密度を調整し、1日のカロリーを推奨範囲にしてください。', '총량 또는 에너지 밀도를 조정해 일일 열량을 권장 범위에 맞추세요.'),
  LONG_TERM_SUITABILITY_ADJUSTMENT: L('特殊阶段需随体重和月龄复核，并由专业人员确认长期方案。', 'For special stages, review weight and age regularly and have the long-term plan professionally confirmed.', 'In besonderen Phasen Gewicht und Alter prüfen und den Langzeitplan fachlich bestätigen lassen.', 'Aux stades particuliers, revérifiez poids et âge et faites confirmer le plan à long terme.', 'En etapas especiales, revise peso y edad y confirme el plan a largo plazo con un profesional.', 'Nelle fasi speciali, verificare peso ed età e far confermare il piano a lungo termine.', '特別な段階では体重と月齢を見直し、長期プランを専門家に確認してください。', '특수 단계에는 체중과 월령을 재확인하고 장기 계획을 전문가에게 확인받으세요.'),
  AI_NEED_PUPPY_PROTEIN: L('高蛋白促进生长', 'High-quality protein for growth', 'Hochwertiges Protein für das Wachstum', 'Protéines de qualité pour la croissance', 'Proteína de calidad para el crecimiento', 'Proteine di qualità per la crescita', '成長を支える良質なたんぱく質', '성장을 위한 양질의 단백질'),
  AI_NEED_PUPPY_DHA: L('DHA脑部发育', 'DHA for brain development', 'DHA für die Gehirnentwicklung', 'DHA pour le développement cérébral', 'DHA para el desarrollo cerebral', 'DHA per lo sviluppo cerebrale', '脳の発達を支えるDHA', '두뇌 발달을 위한 DHA'),
  AI_NEED_PUPPY_CALCIUM: L('适量钙质骨骼健康', 'Controlled calcium for bone health', 'Kontrolliertes Calcium für gesunde Knochen', 'Calcium contrôlé pour la santé osseuse', 'Calcio controlado para la salud ósea', 'Calcio controllato per la salute ossea', '骨の健康に適量のカルシウム', '뼈 건강을 위한 적정 칼슘'),
  AI_NEED_ADULT_PROTEIN: L('均衡蛋白质', 'Balanced high-quality protein', 'Ausgewogenes hochwertiges Protein', 'Protéines de qualité équilibrées', 'Proteína de calidad equilibrada', 'Proteine di qualità bilanciate', 'バランスのよい良質なたんぱく質', '균형 잡힌 양질의 단백질'),
  AI_NEED_ADULT_FAT: L('优质脂肪', 'Moderate healthy fat', 'Maßvolle gesunde Fette', 'Lipides sains en quantité modérée', 'Grasas saludables en cantidad moderada', 'Grassi sani in quantità moderata', '適量の良質な脂質', '적정량의 건강한 지방'),
  AI_NEED_ADULT_FIBER: L('丰富蔬菜纤维', 'Vegetable fiber', 'Pflanzliche Ballaststoffe', 'Fibres végétales', 'Fibra vegetal', 'Fibre vegetali', '野菜由来の食物繊維', '채소 식이섬유'),
  AI_NEED_SENIOR_DIGESTION: L('易消化低脂', 'Easy-to-digest, lower-fat food', 'Leicht verdauliches, fettärmeres Futter', 'Alimentation digeste et moins grasse', 'Alimento digestible y bajo en grasa', 'Alimento digeribile e meno grasso', '消化しやすい低脂肪食', '소화가 쉬운 저지방 식단'),
  AI_NEED_SENIOR_JOINT: L('关节保护营养', 'Joint-support nutrition', 'Nährstoffe zur Gelenkunterstützung', 'Nutriments pour les articulations', 'Nutrición para las articulaciones', 'Nutrienti per le articolazioni', '関節を支える栄養', '관절 지원 영양'),
  AI_NEED_SENIOR_HEART: L('抗氧化护心', 'Antioxidant heart support', 'Antioxidativer Herzschutz', 'Soutien cardiaque antioxydant', 'Apoyo cardíaco antioxidante', 'Supporto cardiaco antiossidante', '抗酸化による心臓サポート', '항산화 심장 지원'),
  AI_NUTRITION_SUMMARY: L('当前每日鲜食建议约 {daily_grams}g，分 {meals_per_day} 餐，每餐约 {per_meal_grams}g。应结合体重、BCS和活动量持续调整。', 'The current fresh-food estimate is about {daily_grams} g per day, split into {meals_per_day} meals of about {per_meal_grams} g. Adjust it over time using weight, BCS, and activity.', 'Die aktuelle Frischfuttermenge beträgt etwa {daily_grams} g pro Tag, verteilt auf {meals_per_day} Mahlzeiten mit je etwa {per_meal_grams} g. An Gewicht, BCS und Aktivität anpassen.', 'La ration fraîche estimée est d’environ {daily_grams} g par jour, répartie en {meals_per_day} repas d’environ {per_meal_grams} g. Ajustez-la selon le poids, le BCS et l’activité.', 'La estimación es de unos {daily_grams} g diarios, divididos en {meals_per_day} comidas de unos {per_meal_grams} g. Ajústela según peso, BCS y actividad.', 'La stima è di circa {daily_grams} g al giorno, suddivisi in {meals_per_day} pasti da circa {per_meal_grams} g. Adeguarla in base a peso, BCS e attività.', '1日の鮮食目安は約{daily_grams}gで、{meals_per_day}回、1回約{per_meal_grams}gです。体重、BCS、活動量に応じて調整してください。', '일일 신선식 권장량은 약 {daily_grams}g이며 {meals_per_day}회, 1회 약 {per_meal_grams}g입니다. 체중, BCS, 활동량에 따라 조정하세요.'),
  AI_UNDERWEIGHT_CAUTION: L('当前体重 {weight_kg}kg 明显低于参考均值 {average_weight_kg}kg，应逐步调整能量摄入并持续监测体重和BCS。', 'Current weight ({weight_kg} kg) is well below the reference average ({average_weight_kg} kg). Increase energy gradually and monitor weight and BCS.', 'Das aktuelle Gewicht ({weight_kg} kg) liegt deutlich unter dem Referenzwert ({average_weight_kg} kg). Energie langsam erhöhen und Gewicht sowie BCS beobachten.', 'Le poids actuel ({weight_kg} kg) est nettement inférieur à la moyenne de référence ({average_weight_kg} kg). Augmentez progressivement l’énergie et surveillez poids et BCS.', 'El peso actual ({weight_kg} kg) está muy por debajo del promedio de referencia ({average_weight_kg} kg). Aumente la energía gradualmente y controle peso y BCS.', 'Il peso attuale ({weight_kg} kg) è molto sotto la media di riferimento ({average_weight_kg} kg). Aumentare gradualmente l’energia e monitorare peso e BCS.', '現在体重（{weight_kg}kg）は参考平均（{average_weight_kg}kg）を大きく下回ります。エネルギーを徐々に増やし、体重とBCSを確認してください。', '현재 체중({weight_kg}kg)이 참고 평균({average_weight_kg}kg)보다 크게 낮습니다. 에너지를 점진적으로 늘리고 체중과 BCS를 확인하세요.'),
  AI_GENERIC_BREED_INTRO: L('宠物档案已用于本次营养估算。', 'The pet profile was used for this nutrition estimate.', 'Das Tierprofil wurde für diese Nährstoffschätzung verwendet.', 'Le profil de l’animal a été utilisé pour cette estimation nutritionnelle.', 'El perfil de la mascota se utilizó para esta estimación nutricional.', 'Il profilo dell’animale è stato usato per questa stima nutrizionale.', 'ペット情報を今回の栄養推定に使用しました。', '반려동물 프로필을 이번 영양 추정에 사용했습니다.'),
});

const SUITABILITY_REASON_KEYS = Object.freeze({
  life_stage: 'SUITABILITY_LIFE_STAGE_REASON',
  body_size: 'SUITABILITY_BODY_SIZE_REASON',
  weight_energy: 'SUITABILITY_WEIGHT_ENERGY_REASON',
  activity_neuter: 'SUITABILITY_ACTIVITY_NEUTER_REASON',
  physiology: 'SUITABILITY_PHYSIOLOGY_REASON',
  health: 'SUITABILITY_HEALTH_REASON',
  allergy: 'SUITABILITY_ALLERGY_SAFE_REASON',
});

const SUITABILITY_ADJUSTMENT_KEYS = Object.freeze({
  life_stage: 'SUITABILITY_LIFE_STAGE_ADJUSTMENT',
  body_size: 'SUITABILITY_BODY_SIZE_ADJUSTMENT',
  weight_energy: 'SUITABILITY_WEIGHT_ENERGY_ADJUSTMENT',
  activity_neuter: 'SUITABILITY_ACTIVITY_NEUTER_ADJUSTMENT',
  physiology: 'SUITABILITY_PHYSIOLOGY_ADJUSTMENT',
  health: 'SUITABILITY_HEALTH_ADJUSTMENT',
  allergy: 'SUITABILITY_ALLERGY_ADJUSTMENT',
});

function normalizeLocale(value) {
  const locale = String(value || 'zh').trim().toLowerCase().replace('_', '-').split('-')[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'zh';
}

function interpolate(text, facts) {
  return String(text || '').replace(/\{([a-z0-9_]+)\}/gi, (_, key) => String(facts[key] ?? ''));
}

function textFor(code, locale, canonical = '') {
  const value = TEXT[code]?.[locale];
  return { text: value || canonical, translation_status: value ? (locale === 'zh' ? 'source' : 'translated') : 'fallback', fallback_locale: value ? null : 'zh' };
}

function stageText(code, locale, canonical) {
  return textFor(`STAGE_${String(code || '').toUpperCase()}`, locale, canonical);
}

function genericFindingTemplate(finding, locale) {
  const group = GENERIC_FINDING[finding.domain] || GENERIC_FINDING.nutrition;
  return group.map(values => values[locale]);
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
  const template = riskCode && (
    TEMPLATES[riskCode]?.[locale]
    || EXTRA_FINDING_TEMPLATES[riskCode]?.[locale]
    || FRESH_CHECK_FINDING_TEMPLATES[riskCode]?.[locale]
  );
  const templateText = (template || []).join(' ');
  const hasUnlocalizedIngredient = locale !== 'zh' && templateText.includes('{ingredient_name}') && containsHan(facts.ingredient_name) && !ingredientNames;
  const hasUnlocalizedFact = locale !== 'zh' && Object.entries(facts)
    .some(([key, value]) => templateText.includes(`{${key}}`) && key !== 'ingredient_name' && typeof value === 'string' && containsHan(value));

  if (locale === 'zh' && !template) {
    return {
      risk_code: riskCode,
      title: finding.title || '',
      reason: finding.reason || finding.message || '',
      adjustment: finding.adjustment || '',
      translation_status: 'source',
      fallback_locale: null,
    };
  }

  if ((!template && !KNOWN_FINDING_CODES.has(riskCode)) || hasUnlocalizedIngredient || hasUnlocalizedFact) {
    return {
      risk_code: riskCode,
      title: finding.title || '',
      reason: finding.reason || finding.message || '',
      adjustment: finding.adjustment || '',
      translation_status: 'fallback',
      fallback_locale: 'zh',
      localization_error_code: !template ? 'MISSING_FINDING_TEMPLATE' : 'UNLOCALIZED_TEMPLATE_FACT',
    };
  }

  const resolvedTemplate = template || genericFindingTemplate(finding, locale);
  return {
    risk_code: riskCode,
    title: interpolate(resolvedTemplate[0], facts),
    reason: interpolate(resolvedTemplate[1], facts).replace(/\s+/g, ' ').trim(),
    adjustment: interpolate(resolvedTemplate[2], facts),
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
      ...(presentation.localization_error_code ? { localization_error_code: presentation.localization_error_code } : {}),
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

function statusFromPresentation(value, locale) {
  const statuses = [];
  (function visit(item) {
    if (Array.isArray(item)) return item.forEach(visit);
    if (!item || typeof item !== 'object') return;
    if (item.translation_status) statuses.push(item.translation_status);
    Object.values(item).forEach(visit);
  }(value));
  if (!statuses.length) return locale === 'zh' ? 'source' : 'translated';
  if (statuses.every(status => status === 'source')) return 'source';
  if (statuses.every(status => ['translated', 'ai_translated'].includes(status))) return 'translated';
  if (statuses.every(status => status === 'fallback')) return 'fallback';
  return 'partial';
}

function localizeBPack(bPack, locale) {
  if (!bPack) return { compatible: bPack, presentation: null };
  const localizeOption = option => {
    if (!option) return option;
    const category = textFor(`B_PACK_${option.category_code}`, locale, option.category);
    const reason = textFor(option.reason_code === 'B_PACK_DATA_CONFLICT' ? 'B_PACK_DATA_CONFLICT' : option.enabled ? 'B_PACK_ELIGIBLE_REASON' : 'B_PACK_NOT_ELIGIBLE_REASON', locale, option.reason);
    const description = textFor('B_PACK_DESCRIPTION', locale, option.description);
    return { ...option, category: category.text, name: category.text, description: description.text, reason: reason.text, translation_status: statusFromPresentation({ category, reason, description }, locale), fallback_locale: [category, reason, description].some(item => item.fallback_locale) ? 'zh' : null };
  };
  const application = bPack.application && (() => {
    const basis = textFor(bPack.application.basis_code, locale, bPack.application.basis);
    return { ...bPack.application, basis: basis.text, translation_status: basis.translation_status, fallback_locale: basis.fallback_locale };
  })();
  const compatible = { ...bPack, selected: localizeOption(bPack.selected), options: (bPack.options || []).map(localizeOption), application };
  return { compatible, presentation: { selected: compatible.selected, options: compatible.options, application } };
}

function localizeDailyNeed(dailyNeed, locale) {
  if (!dailyNeed) return { compatible: dailyNeed, presentation: null };
  const stage = stageText(dailyNeed.stage_code, locale, dailyNeed.stage_label);
  const note = textFor(dailyNeed.note_code, locale, dailyNeed.note);
  const activity = dailyNeed.activity_note_code ? textFor(dailyNeed.activity_note_code, locale, dailyNeed.activity_note) : null;
  const target = dailyNeed.target_weight_note_code ? textFor(dailyNeed.target_weight_note_code, locale, dailyNeed.target_weight_note) : null;
  const digestion = dailyNeed.digestion_note_code ? textFor(dailyNeed.digestion_note_code, locale, dailyNeed.digestion_note) : null;
  let intake = dailyNeed.intake_feasibility;
  let intakePresentation = null;
  if (intake) {
    const intakeStage = stageText(intake.stage_code, locale, intake.stage_label);
    const advice = textFor(intake.volume_advice_code, locale, intake.volume_advice);
    const intakeNote = textFor(intake.note_code, locale, intake.note);
    intake = { ...intake, stage_label: intakeStage.text, volume_advice: advice.text, note: intakeNote.text };
    intakePresentation = { stage_label: intakeStage, volume_advice: advice, note: intakeNote };
  }
  const compatible = { ...dailyNeed, stage_label: stage.text, note: note.text, activity_note: activity?.text || null, target_weight_note: target?.text || null, digestion_note: digestion?.text || null, intake_feasibility: intake };
  return { compatible, presentation: { stage_label: stage, note, activity_note: activity, target_weight_note: target, digestion_note: digestion, intake_feasibility: intakePresentation } };
}

function localizeSuitability(detail, locale) {
  if (!detail) return { compatible: detail, presentation: null };
  const components = (detail.components || []).map(component => {
    const label = textFor(component.label_code, locale, component.label);
    const reasonKey = component.reason_code === 'ALLERGY_CONFLICT' ? 'SUITABILITY_ALLERGY_CONFLICT_REASON' : SUITABILITY_REASON_KEYS[component.key];
    const reason = textFor(reasonKey, locale, component.reason);
    const adjustment = textFor(SUITABILITY_ADJUSTMENT_KEYS[component.key], locale, component.adjustment);
    const renderedReason = interpolate(reason.text, component.facts || {});
    const translationStatus = statusFromPresentation({ label, reason, adjustment }, locale);
    return { ...component, label: label.text, reason: renderedReason, adjustment: adjustment.text, translation_status: translationStatus, fallback_locale: translationStatus === 'fallback' || translationStatus === 'partial' ? 'zh' : null };
  });
  const byKey = new Map(components.map(component => [component.key, component]));
  const deductions = (detail.deductions || []).map(item => ({ ...item, reason: byKey.get(item.component_key)?.reason || item.reason }));
  const explanation = textFor(detail.explanation_code, locale, detail.explanation);
  const compatible = { ...detail, components, deductions, explanation: explanation.text };
  return { compatible, presentation: { components, deductions, explanation } };
}

function localizeLongTerm(detail, locale) {
  if (!detail) return { compatible: detail, presentation: null };
  const factors = (detail.limiting_factors || []).map(item => {
    const label = textFor(item.label_code, locale, item.label);
    return { ...item, label: label.text, translation_status: label.translation_status, fallback_locale: label.fallback_locale };
  });
  const explanation = textFor(detail.explanation_code, locale, detail.explanation);
  const adjustmentPresentations = (detail.adjustment_codes || []).map((code, index) => textFor(code, locale, detail.adjustments?.[index]));
  const adjustments = adjustmentPresentations.map(item => item.text).filter(Boolean);
  const compatible = { ...detail, limiting_factors: factors, explanation: explanation.text, adjustments };
  return { compatible, presentation: { limiting_factors: factors, explanation, adjustments: adjustmentPresentations } };
}

function localizeScores(scores, locale) {
  return (scores || []).map(item => {
    const label = textFor(item.label_code, locale, item.label);
    return { ...item, label: label.text, translation_status: label.translation_status, fallback_locale: label.fallback_locale };
  });
}

function localizeValidationDetails(details, locale) {
  if (!details) return { compatible: details, presentation: null };
  const compatible = Object.fromEntries(Object.entries(details).map(([key, detail]) => {
    const deductions = (detail?.deductions || []).map(deduction => {
      const known = KNOWN_VALIDATION_DETAIL_CODES.has(deduction.code);
      return {
        ...deduction,
        translation_status: locale === 'zh' ? 'source' : known ? 'translated' : 'fallback',
        fallback_locale: locale === 'zh' || known ? null : 'zh',
        ...(!known ? { localization_error_code: 'MISSING_VALIDATION_DETAIL_TEMPLATE' } : {}),
      };
    });
    return [key, { ...detail, deductions }];
  }));
  const presentation = Object.fromEntries(Object.entries(compatible).map(([key, detail]) => [
    key,
    { deductions: detail.deductions },
  ]));
  return { compatible, presentation };
}

function validationDetailsTranslationStatus(details, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  return statusFromPresentation(localizeValidationDetails(details, locale).presentation, locale);
}

function localizeSemanticResult(result, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const sourceFindings = (result.findings || []).map(item => ({ ...item, facts: item.facts ? { ...item.facts } : {} }));
  const semantic = stripPresentation({ ...result, findings: sourceFindings });
  const localized = sourceFindings.map(item => localizeFinding(item, locale));
  const verdict = VERDICTS[result.verdict_code]?.[locale] || result.verdict || '';
  const dailyNeed = localizeDailyNeed(result.daily_need, locale);
  const suitability = localizeSuitability(result.suitability_detail, locale);
  const longTerm = localizeLongTerm(result.long_term_detail, locale);
  const scores = localizeScores(result.scores, locale);
  const scoreDetails = localizeValidationDetails(result.score_details, locale);
  const bPack = localizeBPack(result.b_pack, locale);
  const cookingNote = result.cooking_plan ? textFor(result.cooking_plan.note_code, locale, result.cooking_plan.note) : null;
  const cookingPlan = result.cooking_plan ? { ...result.cooking_plan, note: cookingNote.text } : null;
  const aiSummary = result.ai_summary ? { text: result.ai_summary, translation_status: locale === 'zh' ? 'source' : 'fallback', fallback_locale: locale === 'zh' ? null : 'zh' } : null;
  const aiMacro = result.ai_macro_assessment ? { ...result.ai_macro_assessment, translation_status: locale === 'zh' ? 'source' : 'fallback', fallback_locale: locale === 'zh' ? null : 'zh' } : null;
  const presentation = { findings: localized.map(item => item.presentation), verdict, daily_need: dailyNeed.presentation, suitability_detail: suitability.presentation, long_term_detail: longTerm.presentation, scores, score_details: scoreDetails.presentation, b_pack: bPack.presentation, cooking_plan: cookingPlan && { note: cookingNote }, ai_summary: aiSummary, ai_macro_assessment: aiMacro };
  const translationStatus = statusFromPresentation(presentation, locale);
  return {
    ...result,
    locale,
    translation_status: translationStatus,
    fallback_locale: translationStatus === 'fallback' || translationStatus === 'partial' ? 'zh' : null,
    semantic,
    presentation,
    findings: localized.map(item => item.localized),
    verdict,
    daily_need: dailyNeed.compatible,
    suitability_detail: suitability.compatible,
    long_term_detail: longTerm.compatible,
    scores,
    score_details: scoreDetails.compatible,
    b_pack: bPack.compatible,
    cooking_plan: cookingPlan,
    ai_summary: aiSummary?.text,
    ai_macro_assessment: aiMacro,
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
  const sources = [
    result.ai_summary && { item_id: 'ai_summary', value: result.ai_summary },
    result.ai_macro_assessment?.reasoning && { item_id: 'ai_macro_reasoning', value: result.ai_macro_assessment.reasoning },
    ...(result.ai_macro_assessment?.adjustments || []).map((value, index) => ({ item_id: `ai_macro_adjustment:${index}`, value })),
  ].filter(Boolean);
  const protections = new Map(sources.map(item => [item.item_id, protectNumericText(item.value, 'reason')]));
  const candidates = sources.map(item => ({ item_id: item.item_id, risk_code: 'AI_PRESENTATION_TEXT', title: item.item_id, reason: protections.get(item.item_id).text, adjustment: 'Translate this field only.' }));
  if (!candidates.length) return localized;

  try {
    const response = await translate({ locale: localized.locale, items: candidates });
    const byId = new Map((response?.items || []).filter(item => candidates.some(candidate => candidate.item_id === item.item_id && candidate.risk_code === item.risk_code)).map(item => [item.item_id, item]));
    let rejectedCount = 0;
    const translatedValues = new Map();
    sources.forEach(source => {
      const translated = byId.get(source.item_id);
      const restored = translated && restoreProtectedText(translated.reason, protections.get(source.item_id));
      if (!translated || !validTranslatedText(translated.reason) || restored === null) {
        rejectedCount += 1;
        return;
      }
      translatedValues.set(source.item_id, restored.trim());
    });
    if (result.ai_summary) {
      const text = translatedValues.get('ai_summary');
      localized.presentation.ai_summary = { text: text || result.ai_summary, translation_status: text ? 'ai_translated' : 'fallback', fallback_locale: text ? null : 'zh' };
      localized.ai_summary = localized.presentation.ai_summary.text;
    }
    if (result.ai_macro_assessment) {
      const reasoning = translatedValues.get('ai_macro_reasoning');
      const adjustments = (result.ai_macro_assessment.adjustments || []).map((value, index) => translatedValues.get(`ai_macro_adjustment:${index}`) || value);
      const complete = (!result.ai_macro_assessment.reasoning || reasoning) && adjustments.every((value, index) => value !== result.ai_macro_assessment.adjustments[index] || translatedValues.has(`ai_macro_adjustment:${index}`));
      localized.ai_macro_assessment = { ...result.ai_macro_assessment, reasoning: reasoning || result.ai_macro_assessment.reasoning, adjustments };
      localized.presentation.ai_macro_assessment = { ...localized.ai_macro_assessment, translation_status: complete ? 'ai_translated' : 'fallback', fallback_locale: complete ? null : 'zh' };
    }
    localized.translation_status = statusFromPresentation(localized.presentation, localized.locale);
    localized.fallback_locale = ['fallback', 'partial'].includes(localized.translation_status) ? 'zh' : null;
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

function aiNutritionPresentationIsValid(analysis, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  const fields = [
    analysis?.breed_intro,
    analysis?.activity_desc,
    analysis?.summary,
    analysis?.nutrition_analysis,
    ...(analysis?.key_nutrition_needs || []),
    ...(analysis?.cautions || []),
    ...(analysis?.recommended_categories || []),
    ...(analysis?.factors_used || []),
    ...(analysis?.ranked_recipes || []).flatMap(item => [item.reason, ...(item.positive_factors || []), ...(item.tradeoffs || [])]),
  ].filter(Boolean).map(String);
  if (locale === 'zh') return true;
  if (locale === 'ja') return fields.length > 0
    && /[\u3040-\u30ff]/.test(fields.join(' '))
    && fields.every(value => !containsHan(value) || /[\u3040-\u30ff]/.test(value));
  return fields.every(value => !containsHan(value));
}

function buildAiNutritionFallback({ requestedLocale, age, weight, intake = {}, averageWeight = null }) {
  const locale = normalizeLocale(requestedLocale);
  const lifeStage = Number(age) < 1 ? '幼犬' : Number(age) >= 8 ? '老年犬' : '成年犬';
  const lifeStageCode = Number(age) < 1 ? 'puppy' : Number(age) >= 8 ? 'senior' : 'adult';
  const needCodes = lifeStage === '幼犬'
    ? ['AI_NEED_PUPPY_PROTEIN', 'AI_NEED_PUPPY_DHA', 'AI_NEED_PUPPY_CALCIUM']
    : lifeStage === '老年犬'
      ? ['AI_NEED_SENIOR_DIGESTION', 'AI_NEED_SENIOR_JOINT', 'AI_NEED_SENIOR_HEART']
      : ['AI_NEED_ADULT_PROTEIN', 'AI_NEED_ADULT_FAT', 'AI_NEED_ADULT_FIBER'];
  const summaryFacts = {
    daily_grams: intake.daily_grams ?? '-',
    meals_per_day: intake.meals_per_day ?? 2,
    per_meal_grams: intake.per_meal_grams ?? '-',
  };
  const cautionItems = Number(averageWeight) > 0 && Number(weight) < Number(averageWeight) * 0.7
    ? [{ code: 'AI_UNDERWEIGHT_CAUTION', facts: { weight_kg: weight, average_weight_kg: averageWeight } }]
    : [];
  return {
    locale,
    translation_status: locale === 'zh' ? 'source' : 'translated',
    breed_intro: textFor('AI_GENERIC_BREED_INTRO', locale).text,
    life_stage: lifeStage,
    life_stage_code: lifeStageCode,
    activity_level: 'medium',
    key_nutrition_need_codes: needCodes,
    key_nutrition_needs: needCodes.map(code => textFor(code, locale).text),
    nutrition_summary_code: 'AI_NUTRITION_SUMMARY',
    nutrition_summary_facts: summaryFacts,
    nutrition_analysis: interpolate(textFor('AI_NUTRITION_SUMMARY', locale).text, summaryFacts),
    caution_items: cautionItems,
    cautions: cautionItems.map(item => interpolate(textFor(item.code, locale).text, item.facts)),
  };
}

function cachedAiNutritionAnalysis(cacheData, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  return cacheData?.analyses_by_locale?.[locale]
    || (cacheData?.analysis_locale === locale ? cacheData.analysis : null)
    || null;
}

module.exports = {
  SUPPORTED_LOCALES,
  normalizeLocale,
  localizeFinding,
  localizeSemanticResult,
  localizeSemanticResultWithAi,
  aiNutritionPresentationIsValid,
  buildAiNutritionFallback,
  cachedAiNutritionAnalysis,
  validationDetailsTranslationStatus,
  FINDING_TEMPLATE_CODES: Object.freeze([...KNOWN_FINDING_CODES]),
  VALIDATION_DETAIL_CODES: Object.freeze([...KNOWN_VALIDATION_DETAIL_CODES]),
  stripPresentation,
};
