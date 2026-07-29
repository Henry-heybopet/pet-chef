export function isActiveCookingDps(dps) {
  return dps?.[107] === 'start' || dps?.[107] === 'pause' || dps?.[5] === 'cooking' || dps?.[5] === 'pause';
}

export function isCompletedCookingDps(dps) {
  const explicitDone = dps?.[5] === 'done'
    || dps?.[5] === 'complete'
    || dps?.status === 'done'
    || dps?.status === 'complete';
  if (explicitDone) return true;

  const configuredSeconds = Number(dps?.[7] ?? dps?.cook_time);
  const remainingSeconds = Number(dps?.[8] ?? dps?.remain_time);
  return isActiveCookingDps(dps)
    && Number.isFinite(configuredSeconds)
    && configuredSeconds > 0
    && remainingSeconds === 0;
}

export function resolveCookingRemainingSeconds({
  totalSeconds,
  reportedRemaining,
  elapsedSeconds = 0,
  isActive = false,
  isDone = false,
}) {
  const total = Math.max(0, Number(totalSeconds) || 0);
  const reported = Number(reportedRemaining);
  const validReported = isActive
    && Number.isFinite(reported)
    && reported >= 0
    && reported <= total;

  if (validReported) return Math.ceil(reported);
  if (isActive) return Math.max(0, total - Math.floor(Number(elapsedSeconds) || 0));
  return isDone ? 0 : total;
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
