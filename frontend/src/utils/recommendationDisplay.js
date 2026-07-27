export function splitTopItems(items = [], count = 3) {
  return {
    primary: items.slice(0, count),
    folded: items.slice(count),
  };
}

export function getDefaultCPackName(lifeStage) {
  if (lifeStage === '幼犬') return '脑发育支持功能包C';
  if (lifeStage === '老年犬') return '关节支持功能包C';
  return '美毛护肤支持功能包C';
}
