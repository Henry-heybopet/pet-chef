export function isActiveCookingDps(dps) {
  return dps?.[107] === 'start' || dps?.[107] === 'pause' || dps?.[5] === 'cooking' || dps?.[5] === 'pause';
}

export function isCompletedCookingDps(dps) {
  return dps?.[5] === 'done' || dps?.[5] === 'complete' || dps?.status === 'done' || dps?.status === 'complete';
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
