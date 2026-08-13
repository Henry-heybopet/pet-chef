import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';

const MAX_DURATION_SECONDS = 43920;
const ICON_BASE = '/custom-snack-icons';
const TIME_WHEEL_ROW_HEIGHT = 20;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function Icon({ name, className = '' }) {
  return <img className={`custom-snack-icon ${className}`} src={`${ICON_BASE}/${name}.png`} alt="" aria-hidden="true" />;
}

function DialStepper({ label, value, min, max, unit, onChange }) {
  const progress = (clamp(value, min, max) - min) / Math.max(max - min, 1);
  return (
    <div className="custom-snack-stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} aria-label={`${label} -`}>
        <Icon name="minus" />
      </button>
      <strong className="custom-snack-dial" style={{ '--dial-progress': `${Math.round(progress * 280)}deg` }}>
        <b>{value}</b>
        <small>{unit}</small>
      </strong>
      <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} aria-label={`${label} +`}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

function TimeWheelColumn({ label, value, max, unit, onChange }) {
  const wheelRef = useRef(null);
  const settleTimerRef = useRef(null);
  const syncingRef = useRef(false);
  const values = Array.from({ length: max + 1 }, (_, index) => index);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const targetTop = value * TIME_WHEEL_ROW_HEIGHT;
    if (Math.abs(wheel.scrollTop - targetTop) < 1) return;
    syncingRef.current = true;
    wheel.scrollTop = targetTop;
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, [value]);

  useEffect(() => () => clearTimeout(settleTimerRef.current), []);

  const settle = () => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const nextValue = clamp(Math.round(wheel.scrollTop / TIME_WHEEL_ROW_HEIGHT), 0, max);
    syncingRef.current = true;
    wheel.scrollTo({ top: nextValue * TIME_WHEEL_ROW_HEIGHT, behavior: 'smooth' });
    if (nextValue !== value) onChange(nextValue);
    window.setTimeout(() => { syncingRef.current = false; }, 180);
  };

  const handleScroll = () => {
    if (syncingRef.current) return;
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(settle, 70);
  };

  const handleKeyDown = event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    onChange(clamp(value + (event.key === 'ArrowDown' ? 1 : -1), 0, max));
  };

  return (
    <div className="custom-snack-time-wheel-column">
      <div
        ref={wheelRef}
        className="custom-snack-time-wheel-scroll"
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`custom-snack-time-${label}-${value}`}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {values.map(option => (
          <button
            id={`custom-snack-time-${label}-${option}`}
            type="button"
            role="option"
            aria-selected={option === value}
            className={option === value ? 'is-selected' : ''}
            key={option}
            onClick={() => onChange(option)}
          >
            <b>{String(option).padStart(2, '0')}</b>
            {option === value && <small>{unit}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tip({ title, children }) {
  return (
    <aside className="custom-snack-tip">
      <strong><Icon name="bulb" />{title}</strong>
      <p>{children}</p>
    </aside>
  );
}

function ParameterCard({ icon, title, range, value, min, max, unit, onChange, ticks, tipTitle, tipText }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <section className="custom-snack-card custom-snack-parameter-card">
      <div className="custom-snack-parameter-main">
        <div className="custom-snack-section-heading">
          <Icon name={icon} />
          <h2>{title}</h2>
          <span>{range}</span>
        </div>
        <DialStepper label={title} value={value} min={min} max={max} unit={unit} onChange={onChange} />
        <label className="custom-snack-range">
          <input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} aria-label={title} />
          <i style={{ width: `${progress}%` }} />
          <span>{ticks.map(tick => <b key={tick}>{tick}</b>)}</span>
        </label>
      </div>
      <Tip title={tipTitle}>{tipText}</Tip>
    </section>
  );
}

export default function CustomSnackPage({ onBack, onStart, profiles = [], authToken, onAddPet }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [blade, setBlade] = useState(1);
  const [temperature, setTemperature] = useState(85);
  const [speed, setSpeed] = useState(2);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const pets = useMemo(() => profiles.filter(pet => !pet.species || pet.species === 'dog'), [profiles]);
  const [petId, setPetId] = useState(() => pets[0]?.id || '');
  const [ingredients, setIngredients] = useState([{ name: '', grams: '' }]);
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    if (!pets.some(pet => String(pet.id) === String(petId))) setPetId(pets[0]?.id || '');
  }, [pets, petId]);

  const setDuration = totalSeconds => {
    const value = clamp(totalSeconds, 1, MAX_DURATION_SECONDS);
    setHours(Math.floor(value / 3600));
    setMinutes(Math.floor((value % 3600) / 60));
    setSeconds(value % 60);
  };

  const updateIngredient = (index, field, value) => {
    setIngredients(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const handleStart = () => {
    const pet = pets.find(item => String(item.id) === String(petId));
    const snackIngredients = ingredients
      .map(item => ({ name: item.name.trim(), grams: Number(item.grams) }))
      .filter(item => item.name && Number.isFinite(item.grams) && item.grams > 0);
    if (!pet) return setFormMessage(t('freshCheckSelectPetRequired'));
    if (!snackIngredients.length) return setFormMessage(t('freshCheckIngredientRequired'));
    const totalSeconds = clamp(hours * 3600 + minutes * 60 + seconds, 1, MAX_DURATION_SECONDS);
    setFormMessage('');
    onStart({
      recipe: { id: 'custom-snack', name: t('customSnack') },
      cookParams: {
        temperature,
        cookTime: totalSeconds,
        cookMinutes: Math.ceil(totalSeconds / 60),
        power: 8,
        speed: String(speed),
        blade,
      },
      profile: { id: pet.id, name: pet.name },
      displayGrams: snackIngredients.reduce((sum, item) => sum + item.grams, 0),
      snackIngredients,
      snackAnalysisRequest: {
        pet_id: pet.id,
        ingredients: snackIngredients,
        meal_intent: 'snack',
        locale: lang,
      },
      isCustomSnack: true,
      autoStart: true,
    });
  };

  const rows = [
    { icon: 'cut', state: 'customSnackCutPieces', blade: 'customSnackBladeOneShort', speed: `1–2${t('customSnackLevel')}`, action: 'customSnackNoAction' },
    { icon: 'rice', state: 'customSnackSoftRice', blade: 'customSnackBladeOneShort', speed: `2–3${t('customSnackLevel')}`, action: 'customSnackNoAction' },
    { icon: 'balls', state: 'customSnackLooseBall', blade: 'customSnackBladeTwoShort', speed: `2–3${t('customSnackLevel')}`, action: 'customSnackAfter3Seconds' },
    { icon: 'mousse', state: 'customSnackMousse', blade: 'customSnackBladeTwoShort', speed: `2–3${t('customSnackLevel')}`, action: 'customSnackAfter30Seconds' },
  ];

  return (
    <main className="custom-snack-page">
      <div className="custom-snack-shell">
        <header className="custom-snack-header">
          <button type="button" onClick={onBack} aria-label={t('back')}>‹</button>
          <div>
            <h1>{t('customSnack')}</h1>
            <p>{t('customSnackSubtitle')}</p>
          </div>
        </header>

        <section className="custom-snack-card custom-snack-blade-card">
          <h2>{t('customSnackChooseBlade')}</h2>
          <div className="custom-snack-blades">
            {[1, 2].map(type => (
              <button key={type} type="button" className={blade === type ? 'is-selected' : ''} onClick={() => setBlade(type)}>
                <strong>{t(type === 1 ? 'customSnackBladeOne' : 'customSnackBladeTwo')}</strong>
                <img className="custom-snack-blade-image" src={`/custom-snack-blade-${type}.png`} alt={t(type === 1 ? 'customSnackBladeOne' : 'customSnackBladeTwo')} />
                <small>{t(type === 1 ? 'customSnackBladeOneUse' : 'customSnackBladeTwoUse')}</small>
                {blade === type && <Icon name="check" className="custom-snack-selected-icon" />}
              </button>
            ))}
          </div>
        </section>

        <ParameterCard
          icon="heat"
          title={t('customSnackTemperature')}
          range={t('customSnackTemperatureRange')}
          value={temperature}
          min={40}
          max={120}
          unit="°C"
          onChange={setTemperature}
          ticks={[40, 60, 80, 100, 120]}
          tipTitle={t('customSnackSuggestedTemperature')}
          tipText={t('customSnackTemperatureTip')}
        />

        <ParameterCard
          icon="fan"
          title={t('customSnackSpeed')}
          range={t('customSnackSpeedRange')}
          value={speed}
          min={1}
          max={10}
          unit={t('customSnackLevel')}
          onChange={setSpeed}
          ticks={[1, 3, 5, 7, 10]}
          tipTitle={t('customSnackSuggestedSpeed')}
          tipText={t('customSnackSpeedTip')}
        />

        <section className="custom-snack-card custom-snack-duration-card">
          <div className="custom-snack-duration-main">
            <div className="custom-snack-section-heading">
              <Icon name="clock" />
              <h2>{t('customSnackDuration')}</h2>
              <span>{t('customSnackTimeUnits')}</span>
            </div>
            <div className="custom-snack-duration custom-snack-time-wheel">
              <TimeWheelColumn label={t('customSnackHours')} value={hours} max={12} unit={t('customSnackHourUnit')} onChange={setHours} />
              <TimeWheelColumn label={t('customSnackMinutes')} value={minutes} max={59} unit={t('customSnackMinuteUnit')} onChange={setMinutes} />
              <TimeWheelColumn label={t('customSnackSeconds')} value={seconds} max={59} unit={t('customSnackSecondUnit')} onChange={setSeconds} />
            </div>
            <div className="custom-snack-samples">
              <span>{t('customSnackSamples')}</span>
              <button type="button" onClick={() => setDuration(600)}>{t('customSnackSample100').replace(' ', '\n')}</button>
              <button type="button" onClick={() => setDuration(1080)}>{t('customSnackSample200').replace(' ', '\n')}</button>
              <button type="button" onClick={() => setDuration(1440)}>{t('customSnackSample300').replace(' ', '\n')}</button>
            </div>
          </div>
          <Tip title={t('customSnackSuggestedDuration')}>{t('customSnackDurationTip')}</Tip>
        </section>

        <section className="custom-snack-card custom-snack-guide">
          <h2>{t('customSnackGuideTitle')}</h2>
          <div className="custom-snack-table" role="table">
            <div className="custom-snack-table-row is-header" role="row">
              <span>{t('customSnackState')}</span>
              <span>{t('customSnackBladeChoice')}</span>
              <span>{t('customSnackTemperatureSuggestion')}</span>
              <span>{t('customSnackSpeedSuggestion')}</span>
              <span>{t('customSnackCookDuration')}</span>
              <span>{t('customSnackAfterCooking')}</span>
            </div>
            {rows.map(row => (
              <div className="custom-snack-table-row" role="row" key={row.state}>
                <span><Icon name={row.icon} />{t(row.state)}</span>
                <span>{t(row.blade)}</span>
                <span>85°C</span>
                <span>{row.speed}</span>
                <span>{t('customSnackUseSamples')}</span>
                <span>{t(row.action)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="custom-snack-card custom-snack-intake-card">
          <h2>{t('selectPet')}</h2>
          {pets.length ? (
            <select value={petId} onChange={event => setPetId(event.target.value)} aria-label={t('selectPet')}>
              {pets.map(pet => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
            </select>
          ) : (
            <button className="custom-snack-add-pet" type="button" onClick={onAddPet}>{t('createPet')}</button>
          )}
          <div className="custom-snack-ingredient-heading">
            <h2>{t('customSnackIngredients')}</h2>
            <button type="button" onClick={() => setIngredients(current => [...current, { name: '', grams: '' }])}>{t('addIngredient')}</button>
          </div>
          {ingredients.map((ingredient, index) => (
            <div className="custom-snack-ingredient-row" key={index}>
              <input value={ingredient.name} onChange={event => updateIngredient(index, 'name', event.target.value)} placeholder={t('ingredientName')} aria-label={t('ingredientName')} />
              <input type="number" min="1" step="1" value={ingredient.grams} onChange={event => updateIngredient(index, 'grams', event.target.value)} placeholder={t('grams')} aria-label={t('grams')} />
              <button type="button" disabled={ingredients.length === 1} onClick={() => setIngredients(current => current.filter((_, itemIndex) => itemIndex !== index))}>{t('delete')}</button>
            </div>
          ))}
          {formMessage && <p className="custom-snack-form-message" role="alert">{formMessage}</p>}
        </section>

        <button className="custom-snack-start" type="button" onClick={handleStart}>
          <Icon name="play" />{t('startCooking')}
        </button>
      </div>
    </main>
  );
}
