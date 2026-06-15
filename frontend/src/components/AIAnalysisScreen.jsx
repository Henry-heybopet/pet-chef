// AIAnalysisScreen.jsx — AI analysis results + categories (i18n)
import React from 'react';
import TopBar from './TopBar';
import { useTranslation } from '../i18n/translations';
import { tData, tTag, tBreedDesc } from '../i18n/dataTranslations';

// Nutrition needs translation map for rule-engine fallback
const NEED_TR = {
  '高蛋白促进生长':['High protein for growth','Hochwertiges Protein für Wachstum','Protéines élevées pour la croissance','Alta proteína para crecimiento','Proteine elevate per la crescita','成長のための高タンパク','성장을 위한 고단백'],
  'DHA脑部发育':['DHA for brain development','DHA für Gehirnentwicklung','DHA pour le développement cérébral','DHA para desarrollo cerebral','DHA per lo sviluppo cerebrale','DHA脳の発達','DHA 두뇌 발달'],
  '适量钙质骨骼健康':['Calcium for bone health','Kalzium für Knochengesundheit','Calcium pour la santé osseuse','Calcio para salud ósea','Calcio per la salute delle ossa','骨の健康のためのカルシウム','뼈 건강을 위한 칼슘'],
  '易消化低脂':['Easy-digest low-fat','Leicht verdaulich fettarm','Facile à digérer faible en gras','Fácil digestión bajo en grasa','Facile da digerire basso contenuto di grassi','消化に良い低脂肪','소화하기 쉬운 저지방'],
  '关节保护':['Joint protection','Gelenkschutz','Protection articulaire','Protección articular','Protezione articolare','関節保護','관절 보호'],
  '抗氧化护心':['Antioxidant heart care','Antioxidativer Herzschutz','Antioxydant soins cardiaques','Antioxidante cuidado cardíaco','Antiossidante cura cardiaca','抗酸化心臓ケア','항산화 심장 케어'],
  '均衡蛋白质':['Balanced protein','Ausgewogenes Protein','Protéines équilibrées','Proteína equilibrada','Proteine bilanciate','バランスの取れたタンパク質','균형 잡힌 단백질'],
  '优质脂肪':['Quality fats','Hochwertige Fette','Graisses de qualité','Grasas de calidad','Grassi di qualità','良質な脂肪','양질의 지방'],
  '丰富蔬菜纤维':['Rich vegetable fiber','Reichhaltige Gemüsefaser','Fibres végétales riches','Fibra vegetal rica','Fibre vegetali ricche','豊富な野菜繊維','풍부한 채소 섬유'],
  '美毛':['Coat care','Fellpflege','Soin du poil','Cuidado del pelo','Cura del pelo','被毛ケア','피모 케어'],
  '高蛋白需求':['High protein needs','Hoher Proteinbedarf','Besoins élevés en protéines','Necesidades altas de proteína','Fabbisogno proteico elevato','高タンパク質の必要性','고단백 필요'],
  'Omega-3':['Omega-3','Omega-3','Omega-3','Omega-3','Omega-3','Omega-3','Omega-3'],
  '体重管理':['Weight management','Gewichtskontrolle','Gestion du poids','Control de peso','Gestione del peso','体重管理','체중 관리'],
  '皮肤健康':['Skin health','Hautgesundheit','Santé de la peau','Salud de la piel','Salute della pelle','皮膚の健康','피부 건강'],
  '高能量需求':['High energy needs','Hoher Energiebedarf','Besoins énergétiques élevés','Necesidades de alta energía','Fabbisogno energetico elevato','高エネルギーの必要性','고에너지 필요'],
  '眼睛保健':['Eye health','Augengesundheit','Santé oculaire','Salud ocular','Salute oculare','目の健康','눈 건강'],
  '耐寒脂肪储备':['Cold-resistant fat reserves','Kältebeständige Fettreserven','Réserves de graisse résistantes au froid','Reservas de grasa resistentes al frío','Riserve di grasso resistenti al freddo','耐寒脂肪蓄積','내한 지방 비축'],
  '白毛护理':['White coat care','Weiße Fellpflege','Soins du poil blanc','Cuidado del pelo blanco','Cura del pelo bianco','白い被毛ケア','흰 털 관리'],
  '高蛋白':['High protein','Hohes Protein','Haute protéine','Alta proteína','Proteine elevate','高タンパク','고단백'],
  '骨骼支撑':['Bone support','Knochenstütze','Soutien osseux','Soporte óseo','Supporto osseo','骨のサポート','골격 지지'],
  '高能量':['High energy','Hohe Energie','Haute énergie','Alta energía','Alta energia','高エネルギー','고에너지'],
  '脑部发育':['Brain development','Gehirnentwicklung','Développement cérébral','Desarrollo cerebral','Sviluppo cerebrale','脳の発達','두뇌 발달'],
  '眼部保健':['Eye care','Augenpflege','Soins oculaires','Cuidado ocular','Cura oculare','目のケア','눈 관리'],
  '免疫增强':['Immunity boost','Immunstärkung','Renforcement immunitaire','Refuerzo inmunológico','Potenziamento immunitario','免疫強化','면역 강화'],
  '耳道护理':['Ear care','Ohrenpflege','Soins auriculaires','Cuidado auditivo','Cura dell\'orecchio','耳のケア','귀 관리'],
  '脊背保护':['Spine protection','Wirbelsäulenschutz','Protection de la colonne','Protección de la columna','Protezione della colonna','脊椎保護','척추 보호'],
  '控脂':['Fat control','Fettkontrolle','Contrôle des graisses','Control de grasa','Controllo dei grassi','脂肪制御','지방 조절'],
  '牙齿护理':['Dental care','Zahnpflege','Soins dentaires','Cuidado dental','Cura dentale','歯のケア','치아 관리'],
  '低过敏':['Hypoallergenic','Hypoallergen','Hypoallergénique','Hipoalergénico','Ipoallergenico','低アレルゲン','저알레르기'],
  '牙齿健康':['Dental health','Zahngesundheit','Santé dentaire','Salud dental','Salute dentale','歯の健康','치아 건강'],
  '心脏保健':['Heart health','Herzgesundheit','Santé cardiaque','Salud cardíaca','Salute cardiaca','心臓の健康','심장 건강'],
  '骨骼密度':['Bone density','Knochendichte','Densité osseuse','Densidad ósea','Densità ossea','骨密度','골밀도'],
  '低血糖预防':['Low blood sugar prevention','Unterzucker-Prävention','Prévention hypoglycémie','Prevención hipoglucemia','Prevenzione ipoglicemia','低血糖予防','저혈당 예방'],
  '肝脏保护':['Liver protection','Leberschutz','Protection du foie','Protección del hígado','Protezione del fegato','肝臓保護','간 보호'],
  '胰腺保护':['Pancreas protection','Bauchspeicheldrüsenschutz','Protection du pancréas','Protección pancreática','Protezione del pancreas','膵臓保護','췌장 보호'],
  '低脂':['Low-fat','Fettarm','Faible en gras','Bajo en grasa','Basso contenuto di grassi','低脂肪','저지방'],
  '泌尿系统健康':['Urinary health','Harnwegsgesundheit','Santé urinaire','Salud urinaria','Salute urinaria','泌尿器の健康','비뇨기 건강'],
  '脊椎保护':['Spine protection','Wirbelsäulenschutz','Protection vertébrale','Protección vertebral','Protezione vertebrale','脊椎保護','척추 보호'],
  '关节健康':['Joint health','Gelenkgesundheit','Santé articulaire','Salud articular','Salute articolare','関節の健康','관절 건강'],
  '肌肉维持':['Muscle maintenance','Muskelerhaltung','Maintien musculaire','Mantenimiento muscular','Mantenimento muscolare','筋肉維持','근육 유지'],
  '骨骼健康':['Bone health','Knochengesundheit','Santé osseuse','Salud ósea','Salute ossea','骨の健康','뼈 건강'],
  '泪痕管理':['Tear stain management','Tränenfleck-Management','Gestion des traces de larmes','Gestión de manchas de lágrimas','Gestione macchie lacrimali','涙やけ管理','눈물자국 관리'],
  '低敏':['Hypoallergenic','Hypoallergen','Hypoallergénique','Hipoalergénico','Ipoallergenico','低アレルゲン','저알레르기'],
  '过敏体质':['Allergy-prone','Allergisch veranlagt','Terrain allergique','Propenso a alergias','Soggetto ad allergie','アレルギー体質','알레르기 체질'],
  '低敏饮食':['Hypoallergenic diet','Hypoallergene Diät','Régime hypoallergénique','Dieta hipoalergénica','Dieta ipoallergenica','低アレルゲン食','저알레르기 식이'],
  '免疫':['Immunity','Immunität','Immunité','Inmunidad','Immunità','免疫','면역'],
  '肠胃健康':['Gut health','Magen-Darm-Gesundheit','Santé intestinale','Salud intestinal','Salute intestinale','胃腸の健康','장 건강'],
  '嗅觉保护':['Scent protection','Geruchsschutz','Protection olfactive','Protección olfativa','Protezione olfattiva','嗅覚保護','후각 보호'],
  '呼吸系统':['Respiratory system','Atmungssystem','Système respiratoire','Sistema respiratorio','Sistema respiratorio','呼吸器系','호흡기계'],
  '皮肤褶皱护理':['Skin fold care','Hautfaltenpflege','Soins des plis cutanés','Cuidado pliegues cutáneos','Cura delle pieghe cutanee','皮膚のシワケア','피부 주름 관리'],
  '均衡营养':['Balanced nutrition','Ausgewogene Ernährung','Nutrition équilibrée','Nutrición equilibrada','Nutrizione bilanciata','バランスの取れた栄養','균형 잡힌 영양'],
};
const LANGS = ['en','de','fr','es','it','ja','ko'];
function tNeed(zhNeed, lang) {
  if (!lang || lang === 'zh') return zhNeed;
  const idx = LANGS.indexOf(lang);
  if (idx < 0) return zhNeed;
  return NEED_TR[zhNeed]?.[idx] || tTag(zhNeed, lang) || zhNeed;
}

// Generate fallback nutrition_analysis in target language
function tFallbackAnalysis(text, breedName, age, weight, analysis, lang) {
  if (!lang || lang === 'zh') return text;
  const bn = tData(breedName, lang);
  const dg = analysis?.daily_grams || '--';
  const mpd = analysis?.meals_per_day || 2;
  const pmg = analysis?.per_meal_grams || '--';
  const templates = {
    en: `Based on your ${bn}, ${age} years old, ${weight}kg, the recommended daily fresh food intake is about ${dg}g. We suggest feeding ${mpd} times per day, about ${pmg}g per meal.`,
    de: `Basierend auf Ihrem ${bn}, ${age} Jahre alt, ${weight}kg, beträgt die empfohlene tägliche Frischfuttermenge ca. ${dg}g. Wir empfehlen ${mpd} Mahlzeiten pro Tag, ca. ${pmg}g pro Mahlzeit.`,
    fr: `D'après votre ${bn}, ${age} ans, ${weight}kg, l'apport quotidien recommandé est d'environ ${dg}g. Nous suggérons ${mpd} repas par jour, environ ${pmg}g par repas.`,
    es: `Según su ${bn}, ${age} años, ${weight}kg, la ingesta diaria recomendada es de aprox. ${dg}g. Sugerimos ${mpd} comidas al día, aprox. ${pmg}g por comida.`,
    it: `In base al vostro ${bn}, ${age} anni, ${weight}kg, l'assunzione giornaliera raccomandata è di circa ${dg}g. Suggeriamo ${mpd} pasti al giorno, circa ${pmg}g per pasto.`,
    ja: `${bn}（${age}歳、${weight}kg）の情報に基づき、1日の推奨鮮食量は約${dg}gです。1日${mpd}回、1回約${pmg}gの給餌をお勧めします。`,
    ko: `${bn}(${age}세, ${weight}kg) 정보를 바탕으로 일일 권장 신선식 섭취량은 약 ${dg}g입니다. 하루 ${mpd}회, 1회 약 ${pmg}g 급여를 권장합니다.`,
  };
  // Check if text is a Chinese fallback template (contains 根据 or 信息)
  if (text && (text.includes('根据') || text.includes('信息'))) {
    return templates[lang] || text;
  }
  return text;
}

export default function AIAnalysisScreen({ onBack, profile, onSelectCategory, lang }) {
  const t = useTranslation(lang);
  const AI_CATEGORIES = [
    { key: 'life_stage', label: t('lifeStageRec'), icon: '📅', desc: t('lifeStageRecD'), getQuery: (p) => ({ life_stage: p.analysis?.life_stage || '成年犬' }) },
    { key: 'functional', label: t('catFunc'), icon: '⚡', desc: t('catFuncD'), getQuery: () => ({ functional: '' }) },
    { key: 'chicken', label: t('catChicken'), icon: '🍗', desc: t('catChickenD'), getQuery: () => ({ protein: '鸡' }) },
    { key: 'beef', label: t('catBeef'), icon: '🥩', desc: t('catBeefD'), getQuery: () => ({ protein: '牛肉' }) },
    { key: 'fish', label: t('catFish'), icon: '🐟', desc: t('catFishD'), getQuery: () => ({ protein: '鱼' }) },
    { key: 'other', label: t('catOther'), icon: '🍖', desc: t('catOtherD'), getQuery: () => ({ protein_other: true }) },
  ];

  const { analysis, breedName, age, weight } = profile;
  const lifeStageLabel = { '幼犬': '🐾 Puppy', '成年犬': '🐕 Adult', '老年犬': '🦴 Senior' }[analysis?.life_stage] || '🐕 Adult';
  const activityLabel = { low: lang === 'zh' ? '低活跃' : 'Low', medium: lang === 'zh' ? '中等活跃' : 'Medium', high: lang === 'zh' ? '高活跃' : 'High', very_high: lang === 'zh' ? '极高活跃' : 'Very High' }[analysis?.activity_level] || 'Medium';

  // Translate breed_intro: if it looks like Chinese fallback, use tBreedDesc
  const breedIntro = (() => {
    if (!analysis?.breed_intro) return '';
    if (lang && lang !== 'zh') {
      const translated = tBreedDesc(breedName, analysis.breed_intro, lang);
      if (translated !== analysis.breed_intro) return translated;
    }
    return analysis.breed_intro;
  })();

  // Translate nutrition_analysis if it's the Chinese fallback template
  const nutritionText = tFallbackAnalysis(analysis?.nutrition_analysis, breedName, age, weight, analysis, lang);

  return (
    <div className="animate-fade flex-col" style={{ flex: 1 }}>
      <TopBar onBack={onBack} title={t('aiAnalysis')} />
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="card glass" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>{tData(breedName, lang)}</div>
                <div style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>{weight}kg · {age}{t('yr')} · {lifeStageLabel}</div>
              </div>
              <div style={{ background: 'rgba(0,230,255,0.1)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 12px', fontSize: 12, color: 'var(--primary)', height: 'fit-content' }}>{activityLabel}</div>
            </div>
            <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{breedIntro}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: t('dailyTotal'), value: `${analysis?.daily_grams || '--'}g`, color: 'var(--primary)' },
              { label: t('mealsPerDay'), value: `${analysis?.meals_per_day || 2}`, color: 'var(--secondary)' },
              { label: t('perMeal'), value: `${analysis?.per_meal_grams || '--'}g`, color: '#00FFA3' },
            ].map(item => (
              <div key={item.label} className="card glass" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>
          {analysis?.key_nutrition_needs?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 8 }}>{t('keyNeeds')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analysis.key_nutrition_needs.map((n, i) => (
                  <span key={i} style={{ background: 'rgba(0,230,255,0.08)', border: '1px solid rgba(0,230,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--primary)' }}>{tNeed(n, lang)}</span>
                ))}
              </div>
            </div>
          )}
          <div className="card glass" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 8, fontWeight: 600 }}>{t('aiAdvice')}</div>
            <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{nutritionText}</p>
            {analysis?.cautions?.length > 0 && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,150,0,0.08)', borderRadius: 8, borderLeft: '3px solid #FF9600' }}>
                <div style={{ fontSize: 11, color: '#FF9600', marginBottom: 4 }}>{t('cautions')}</div>
                {analysis.cautions.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.5 }}>· {c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <h3 style={{ marginBottom: 16, fontSize: 15, color: 'var(--gray)' }}>{t('recCategories')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {AI_CATEGORIES.map(cat => (
            <div key={cat.key} className="card selectable-card" style={{ padding: 18, textAlign: 'center' }}
              onClick={() => onSelectCategory({ ...cat, query: cat.getQuery(profile) }, profile)}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{cat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
