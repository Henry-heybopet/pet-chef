import React from 'react';

const SCORE_LABEL_KEYS = {
  safety: 'freshScoreSafety',
  suitability: 'freshScoreSuitability',
  structure: 'freshScoreStructure',
  nutrition: 'freshScoreNutrition',
  long_term: 'freshScoreLongTerm',
  energy: 'freshScoreEnergy',
};

export default function FreshCheckRadar({ scores = [], t }) {
  const points = scores.map((item, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const radius = 72 * (item.value / 100);
    return `${100 + radius * Math.cos(angle)},${92 + radius * Math.sin(angle)}`;
  }).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(scale => [0, 1, 2, 3, 4, 5].map(index => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    return `${100 + 72 * scale * Math.cos(angle)},${92 + 72 * scale * Math.sin(angle)}`;
  }).join(' '));
  return <div className="fresh-radar"><svg viewBox="0 0 200 184" role="img" aria-label={t('freshCheckRadarLabel')}>{rings.map((ring, index) => <polygon key={index} points={ring} className={`fresh-radar-grid ${index === rings.length - 1 ? 'is-outer' : 'is-inner'}`} />)}{[0, 1, 2, 3, 4, 5].map(index => { const angle = -Math.PI / 2 + index * Math.PI / 3; return <line key={index} x1="100" y1="92" x2={100 + 72 * Math.cos(angle)} y2={92 + 72 * Math.sin(angle)} className="fresh-radar-axis" />; })}<polygon points={points} className="fresh-radar-area" />{scores.map((item, index) => { const angle = -Math.PI / 2 + index * Math.PI / 3; const labelKey = SCORE_LABEL_KEYS[item.key]; return <text key={item.key} x={100 + 88 * Math.cos(angle)} y={96 + 88 * Math.sin(angle)} textAnchor="middle">{labelKey ? t(labelKey) : item.label}<tspan x={100 + 88 * Math.cos(angle)} dy="13">{item.value}</tspan></text>; })}</svg></div>;
}
