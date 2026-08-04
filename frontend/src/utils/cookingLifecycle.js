export function isActiveCookingDps(dps) {
  return dps?.[107] === 'start' || dps?.[107] === 'pause' || dps?.[5] === 'cooking' || dps?.[5] === 'pause';
}

export function isRunningCookingDps(dps) {
  return dps?.[107] === 'start' || dps?.[5] === 'cooking';
}

export function isCompletedCookingDps(dps) {
  return dps?.[5] === 'done'
    || dps?.[5] === 'complete'
    || dps?.status === 'done'
    || dps?.status === 'complete';
}

export function resolveCookingRemainingSeconds({
  totalSeconds,
  reportedRemaining,
  elapsedSeconds = 0,
  isActive = false,
  isDone = false,
  hasLocalClock = false,
}) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const reported = Number(reportedRemaining);
  const localRemaining = Math.max(0, total - Math.floor(Number(elapsedSeconds) || 0));
  const validReported = isActive
    && Number.isFinite(reported)
    && reported > 0
    && reported <= total;

  if (isActive && hasLocalClock) return localRemaining;
  if (validReported) return Math.ceil(reported);
  if (isActive) return localRemaining;
  return isDone ? 0 : total;
}

export function shouldAutoCompleteCooking({
  totalSeconds,
  elapsedMs,
  isRunning = false,
}) {
  const totalMs = Number(totalSeconds) * 1000;
  return Boolean(isRunning)
    && Number.isFinite(totalMs)
    && totalMs > 0
    && Number(elapsedMs) >= totalMs;
}

export function shouldResetAfterCompletion(resetDevices, devId, dps) {
  if (isCompletedCookingDps(dps)) {
    if (resetDevices.has(devId)) return false;
    resetDevices.add(devId);
    return true;
  }
  if (isActiveCookingDps(dps)) resetDevices.delete(devId);
  return false;
}
