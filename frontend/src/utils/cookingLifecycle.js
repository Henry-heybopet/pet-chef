export function resolveCookingState(dps) {
  const status = dps?.[5] ?? dps?.status;
  if (status === 'done' || status === 'complete') return 'done';
  if (status === 'pause') return 'pause';
  if (status === 'cooking') return 'cooking';
  if (status === 'standby') return 'standby';
  return 'unknown';
}

export function isActiveCookingDps(dps) {
  const state = resolveCookingState(dps);
  return state === 'cooking' || state === 'pause';
}

export function isCompletedCookingDps(dps) {
  return resolveCookingState(dps) === 'done';
}

export function resolveCookingRemainingSeconds({
  reportedRemaining,
  isDone = false,
}) {
  const reported = Number(reportedRemaining);
  const validReported = Number.isFinite(reported) && reported >= 0;

  if (isDone) return 0;
  return validReported ? Math.max(0, Math.ceil(reported)) : Number.NaN;
}
