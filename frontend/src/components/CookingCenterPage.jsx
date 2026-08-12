import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/index';
import { HeyboTuya } from '../native/heyboTuya';
import { useLanguage } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';
import {
  isActiveCookingDps,
  isCompletedCookingDps,
  resolveCookingState,
  resolveCookingRemainingSeconds,
} from '../utils/cookingLifecycle';

const PAIRING_STEPS = ['pairConnectDevice', 'pairSendWifi', 'pairConnectCloud', 'pairBindAccount'];
const START_CHECKS = [
  { code: 'clear_area', key: 'startCheckClearArea' },
];
const PET_CHEF_PID = 'ak2kofibhuvdtqip';
const BLE_SCAN_MS = 60000;
const COOKING_RUNTIME_KEY = 'petchef_cooking_runtime';
const COOKING_OPERATION_OUTBOX_KEY = 'petchef_cooking_operation_outbox';

function readCookingRuntimeStore() {
  try {
    const raw = globalThis.localStorage?.getItem(COOKING_RUNTIME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readCookingRuntime(devId = '') {
  const stored = readCookingRuntimeStore();
  if (!stored) return null;
  if (stored.runtimes && typeof stored.runtimes === 'object') {
    return devId ? stored.runtimes[devId] || null : Object.values(stored.runtimes)[0] || null;
  }
  return !devId || stored.devId === devId ? stored : null;
}

function uniqueEventId(prefix = 'event') {
  const randomId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function readCookingOperationOutbox() {
  try {
    const raw = globalThis.localStorage?.getItem(COOKING_OPERATION_OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCookingOperationOutbox(events) {
  try {
    globalThis.localStorage?.setItem(COOKING_OPERATION_OUTBOX_KEY, JSON.stringify(events));
  } catch {
    // The device command remains authoritative; a later live DP sync still exposes current state.
  }
}

function enqueueCookingOperation(event) {
  const events = readCookingOperationOutbox();
  if (!events.some(item => item.client_event_id === event.client_event_id)) {
    writeCookingOperationOutbox([...events, event]);
  }
}

function removeCookingOperationFromOutbox(clientEventId) {
  writeCookingOperationOutbox(
    readCookingOperationOutbox().filter(item => item.client_event_id !== clientEventId)
  );
}

function saveCookingRuntime(devId, dps, extra = {}) {
  if (!devId || (!isActiveCookingDps(dps) && !isCompletedCookingDps(dps) && !extra.pendingStart && !extra.commandAccepted)) return;
  try {
    const stored = readCookingRuntimeStore();
    const runtimes = stored?.runtimes && typeof stored.runtimes === 'object'
      ? stored.runtimes
      : stored?.devId ? { [stored.devId]: stored } : {};
    const current = runtimes[devId] || {};
    const { reportedRemainingAt, ...otherExtra } = extra;
    globalThis.localStorage?.setItem(COOKING_RUNTIME_KEY, JSON.stringify({
      runtimes: {
        ...runtimes,
        [devId]: {
          ...current,
          devId,
          updatedAt: new Date().toISOString(),
          ...otherExtra,
          ...(reportedRemainingAt === undefined ? {} : { reportedRemainingAt }),
        },
      },
    }));
  } catch {
    // localStorage is best-effort; backend DP cache remains the source for cross-session state.
  }
}

function clearCookingRuntime(devId) {
  const stored = readCookingRuntimeStore();
  if (!stored) return;
  try {
    if (!stored.runtimes) {
      if (!devId || stored.devId === devId) globalThis.localStorage?.removeItem(COOKING_RUNTIME_KEY);
      return;
    }
    const runtimes = { ...stored.runtimes };
    if (devId) delete runtimes[devId];
    if (Object.keys(runtimes).length) globalThis.localStorage?.setItem(COOKING_RUNTIME_KEY, JSON.stringify({ runtimes }));
    else globalThis.localStorage?.removeItem(COOKING_RUNTIME_KEY);
  } catch {}
}

function uniqueDevices(devices) {
  return Array.from(new Map(devices.filter(device => {
    const devId = String(device.devId || device.tuya_device_id || '');
    const isMock = device.mock || device.isMock || device.demo || /^(demo_|web_|mock_)/.test(devId);
    return devId && !isMock;
  }).map(device => [device.devId, device])).values());
}
const PALATABILITY_OPTIONS = [
  { code: 'finished_all', value: '光盘行动', key: 'palatabilityFinished' },
  { code: 'ate_half', value: '吃了一半', key: 'palatabilityHalf' },
  { code: 'picky', value: '挑食行为', key: 'palatabilityPicky' },
  { code: 'refused', value: '完全不吃', key: 'palatabilityRefused' },
];
const STOOL_OPTIONS = [
  { code: 'dry', value: '大便干燥', key: 'stoolDry' },
  { code: 'normal', value: '大便正常', key: 'stoolNormal' },
  { code: 'soft', value: '软便', key: 'stoolSoft' },
  { code: 'diarrhea', value: '拉肚子', key: 'stoolDiarrhea' },
];

function feedbackOptionLabel(value, options, t) {
  const option = options.find(item => item.value === value || item.code === value);
  return option ? t(option.key) : value;
}

const SPEED_RPM = { 0: 0, 1: 60, 2: 120, 3: 230, 4: 500, 5: 1200, 6: 2500, 7: 4000, 8: 5500, 9: 7500, 10: 9500 };
const FAULT_KEYS = {
  1: 'deviceFaultLid',
  2: 'deviceFaultCup',
  3: 'deviceFaultMotorBlocked',
  4: 'deviceFaultCupHot',
  5: 'deviceFaultMotorHot',
  7: 'deviceFaultGear',
  8: 'deviceFaultNtc',
  11: 'deviceFaultHighSpeedHot',
  12: 'deviceFaultScale',
};

function parseDps(device) {
  if (!device?.dps) return {};
  if (typeof device.dps === 'string') {
    try { return JSON.parse(device.dps); } catch { return {}; }
  }
  return device.dps;
}

function formatSpeed(value, t) {
  if (value === undefined || value === null || value === '') return '--';
  const level = Number(value);
  return SPEED_RPM[level] === undefined ? t('deviceLevel', { level: value }) : t('deviceSpeedLevel', { level, rpm: SPEED_RPM[level] });
}

function formatPower(value, t) {
  if (value === undefined || value === null || value === '') return '--';
  const level = Number(value);
  return level >= 1 && level <= 10 ? t('devicePowerLevel', { level, watts: level * 100 }) : t('deviceLevel', { level: value });
}

function getFaultInfo(value, t) {
  if (value === undefined || value === null || value === '' || Number(value) === 0) return { code: '', label: t('noneValue') };
  const fault = Number(value);
  return { code: `DP12=${value}`, label: FAULT_KEYS[fault] ? t(FAULT_KEYS[fault]) : t('deviceFaultUnknown', { value }) };
}

function isLidOpenFault(dps) {
  return Number(dps?.[12] ?? dps?.fault_code ?? 0) === 1;
}

function isCupMissingFault(dps) {
  return Number(dps?.[12] ?? dps?.fault_code ?? 0) === 2;
}

function cleanWifiSsid(value) {
  const ssid = String(value || '').replace(/^"|"$/g, '').trim();
  return ssid && !/^<?unknown ssid>?$/i.test(ssid) && ssid !== '0x' ? ssid : '';
}

function formatRemainTime(value) {
  const seconds = Number(value || 0);
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatCountdown(value) {
  const seconds = Math.max(0, Math.ceil(Number(value || 0)));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatClock(value, lang) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function maskId(value) {
  const text = String(value || '');
  if (text.length <= 8) return text || '--';
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function bleField(device, ...keys) {
  for (const key of keys) {
    if (device?.[key] !== undefined && device?.[key] !== null && device?.[key] !== '') return device[key];
  }
  return '';
}

function classifyBleDevice(device) {
  const name = String(bleField(device, 'name', 'deviceName'));
  const productId = String(bleField(device, 'productId', 'pid'));
  const isTuya = Boolean(productId || bleField(device, 'uuid') || bleField(device, 'address', 'mac'));
  const matchesPid = productId === PET_CHEF_PID;
  const matchesName = /heybo|pet\s*chef|petchef|鲜食机/i.test(name);
  const match = matchesPid || (!productId && matchesName);
  const reason = match ? 'match' : productId && !matchesPid ? 'PID 不匹配' : matchesName ? '缺少 PID' : '名称不匹配';
  return { isTuya, match, reason, name, productId };
}

function scanFailureMessage(summary, t) {
  if (!summary) return t('scanNoDevice');
  if (summary.cancelled) return t('scanCancelled');
  if (summary.rawCount === 0) return t('scanNoBluetooth');
  if (summary.rawCount > 0 && !summary.hasTuya) return t('scanNoCooker');
  if (summary.rawCount > 0 && summary.hasPidMismatch) return t('scanPidMismatch');
  return t('scanNoCompatible');
}

function listPermissions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return Array.from(value);
  } catch {
    return [];
  }
}

function formatPairingPermissionLog(result) {
  const permissions = result?.permissions || {};
  return [
    `Android=${result?.androidVersion ?? '--'}`,
    `BLUETOOTH_SCAN=${permissions.BLUETOOTH_SCAN || 'unknown'}`,
    `BLUETOOTH_CONNECT=${permissions.BLUETOOTH_CONNECT || 'unknown'}`,
    `ACCESS_FINE_LOCATION=${permissions.ACCESS_FINE_LOCATION || 'unknown'}`,
    `GPS=${result?.gpsEnabled ? 'enabled' : 'disabled'}`,
    `canStartBleScan=${result?.canStartBleScan ? 'yes' : 'no'}`,
  ].join(' ');
}

function getDeviceView(device, t) {
  const dps = parseDps(device);
  const online = device?.isOnline ?? device?.onlineStatus ?? device?.online_status ?? device?.status;
  const isOffline = online === false || online === 'offline';
  const statusCode = isOffline
    ? 'offline'
    : resolveCookingState(dps);
  const statusMap = { standby: 'deviceStatusStandby', cooking: 'deviceStatusCooking', pause: 'deviceStatusPaused', done: 'deviceStatusDone', offline: 'deviceStatusOffline', unknown: 'deviceStatusSyncing' };
  const temperature = dps[10] ?? dps.temperature ?? dps.cook_temperature ?? dps[9] ?? '--';
  const speed = dps[108] ?? dps.cook_mode_speed;
  const power = dps[102] ?? dps.cook_mode_power;
  const faultValue = dps[12] ?? dps.fault;
  const fault = getFaultInfo(faultValue, t);
  return {
    devId: device?.devId || device?.tuya_device_id || '',
    id: device?.id || '',
    name: device?.device_name || device?.name || t('defaultCookerName'),
    model: device?.model || 'Pet Chef S1',
    online: !isOffline,
    statusCode,
    status: t(statusMap[statusCode]),
    temperature,
    speed: formatSpeed(speed, t),
    power: formatPower(power, t),
    remaining: formatRemainTime(dps[8] ?? dps.remain_time ?? dps.remainTime),
    wifi: device?.wifi_name || device?.wifiName || t('deviceWifiGood'),
    lastRecipe: device?.last_recipe_name || device?.lastRecipeName || '',
    cupStatus: Number(faultValue) === 2 ? t('deviceNotInstalled') : t('deviceNormal'),
    lidStatus: Number(faultValue) === 1 ? t('deviceNotClosed') : t('deviceNormal'),
    fault: fault.label,
    faultCode: fault.code,
  };
}

function getRecipeCookingParams(context) {
  const recipe = context?.recipe || context;
  const params = context?.cookParams || recipe?.cooking_profile || recipe?.cookingProfile || recipe?.cooking_base || recipe?.cookingBase || {};
  const temperature = params.temperature ?? params.cook_temperature ?? params.cooking_temperature ?? params.dp9;
  const cookMinutes = params.cook_minutes ?? params.cookMinutes;
  const cookTime = params.total_seconds ?? params.cook_time ?? params.cookTime ?? params.time_seconds ?? params.duration_seconds ?? params.dp7
    ?? (cookMinutes ? Number(cookMinutes) * 60 : undefined);
  const speed = params.speed ?? params.cook_mode_speed ?? params.dp108;
  const power = params.power ?? params.cook_mode_power ?? params.dp102;
  const steps = params.steps ?? params.stages ?? params.cooking_steps ?? params.dp11;
  return { recipe, params, temperature, cookTime, cookMinutes, speed, power, steps };
}

function formatDate(value, lang) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(lang);
}

function formatRecordTime(value, lang, t) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = date.toDateString() === today.toDateString();
  const yesterdayDay = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return t('dateToday', { time });
  if (yesterdayDay) return t('dateYesterday', { time });
  return `${date.toLocaleDateString(lang, { month: '2-digit', day: '2-digit' })} ${time}`;
}

function statusLabel(status, t) {
  if (status === 'completed' || status === 'success') return t('operationCompleted');
  if (status === 'interrupted') return t('operationInterrupted');
  if (status === 'failed') return t('operationFailed');
  if (status === 'created') return t('operationInProgress');
  return status || t('operationCompleted');
}

function makeRecord(operation, recipesById, petsById, fallbackPet, lang, t) {
  const recipe = recipesById[operation.recipe_id] || recipesById[operation.recipeId];
  const pet = petsById[operation.pet_id] || petsById[operation.petId];
  const totalWeight = operation.total_weight_gram || operation.totalWeightGram || operation.total_grams || operation.display_grams || operation.target_total_grams || 0;
  return {
    id: operation.id,
    time: formatRecordTime(operation.started_at || operation.startedAt || operation.created_at, lang, t),
    recipeId: recipe?.id || operation.recipe_id || operation.recipeId || '',
    recipeName: recipe?.name || operation.recipe_name || operation.recipeName || t('unnamedRecipe'),
    petId: pet?.id || operation.pet_id || operation.petId || '',
    petName: pet?.name || operation.pet_name || operation.petName || fallbackPet?.name || t('petNotSelected'),
    totalWeightGram: totalWeight,
    status: statusLabel(operation.status || operation.result, t),
    eta: operation.estimated_time || operation.eta || t('estimatedMinutes', { value: 12 }),
    operation,
    recipe,
    pet,
  };
}

function PrimaryButton({ children, ...props }) {
  return <button className="cooking-center-btn cooking-center-btn-primary" {...props}>{children}</button>;
}

function GhostButton({ children, danger, ...props }) {
  return <button className={`cooking-center-btn cooking-center-btn-ghost ${danger ? 'is-danger' : ''}`} {...props}>{children}</button>;
}

function PairingKeysGuide() {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  return (
    <div className="cooking-pairing-guide">
      <img
        src="/pairing-mode-keys.png"
        alt={t('pairingKeysGuideAlt')}
      />
      <div>
        {t('pairingKeysGuideText')}
      </div>
    </div>
  );
}

function AddDeviceBottomSheet({ open, onClose, onBound, homeId, onHomeId }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [device, setDevice] = useState(null);
  const [wifi, setWifi] = useState(null);
  const [wifiName, setWifiName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState([]);
  const [empty, setEmpty] = useState(false);
  const [scanLogs, setScanLogs] = useState([]);
  const [scanSummary, setScanSummary] = useState(null);
  const [permissionNotice, setPermissionNotice] = useState('');
  const [detectedWifiName, setDetectedWifiName] = useState('');
  const [scanEndsAt, setScanEndsAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const scanTimerRef = useRef(null);
  const scanListenerRef = useRef(null);
  const scanStartedAtRef = useRef(0);
  const rawDevicesRef = useRef([]);
  const filteredDevicesRef = useRef([]);

  const addScanLog = (message) => {
    const time = new Date().toLocaleTimeString(lang, { hour12: false });
    setScanLogs(prev => [...prev.slice(-79), `${time} ${message}`]);
  };

  const stopScan = async (cancelled = false) => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    await HeyboTuya.stopBleScan().catch(error => addScanLog(`BLE scan stop 失败：${error?.message || String(error)}`));
    await scanListenerRef.current?.remove?.();
    scanListenerRef.current = null;
    const rawCount = rawDevicesRef.current.length;
    const filteredCount = filteredDevicesRef.current.length;
    const hasTuya = rawDevicesRef.current.some(device => classifyBleDevice(device).isTuya);
    const hasPidMismatch = rawDevicesRef.current.some(device => {
      const info = classifyBleDevice(device);
      return info.isTuya && !info.match && info.productId;
    });
    const endedAt = Date.now();
    const durationSeconds = Math.round((endedAt - scanStartedAtRef.current) / 1000);
    setScanSummary({ rawCount, filteredCount, hasTuya, hasPidMismatch, cancelled });
    addScanLog(`scan end=${new Date(endedAt).toISOString()} duration=${durationSeconds}s rawCount=${rawCount} filteredCount=${filteredCount}`);
    setScanning(false);
    setScanEndsAt(0);
    setRemainingSeconds(0);
    setEmpty(filteredCount === 0);
  };

  async function scan() {
    if (scanning) return;
    const found = [];
    rawDevicesRef.current = [];
    filteredDevicesRef.current = [];
    setFoundDevices([]);
    setEmpty(false);
    setScanSummary(null);
    setPermissionNotice('');
    const startedAt = Date.now();
    scanStartedAtRef.current = startedAt;
    addScanLog(`点击添加鲜食机 scan request=${new Date(startedAt).toISOString()}`);
    addScanLog(`过滤规则：productId=${PET_CHEF_PID}；名称兜底=Heybo/Pet Chef/鲜食机`);
    let listener;
    try {
      const status = await HeyboTuya.status().catch(error => ({ error: error?.message || String(error) }));
      addScanLog(`Native=${status?.nativeAvailable !== false ? 'yes' : 'no'} SDK=${status?.initialized ? 'initialized' : 'not-ready'}`);
      const currentSsid = cleanWifiSsid(status?.wifiSsid);
      if (currentSsid) {
        setDetectedWifiName(currentSsid);
        setWifiName(prev => prev || currentSsid);
      }

      let permission = await HeyboTuya.checkPairingPermissions?.().catch(error => ({ error: error?.message || String(error) }));
      if (!permission || permission.error) {
        permission = {
          canStartBleScan: true,
          missingPermissions: [],
          permissions: {
            BLUETOOTH_SCAN: status?.permBluetoothScan === undefined ? 'unknown' : status.permBluetoothScan ? 'granted' : 'denied',
            BLUETOOTH_CONNECT: status?.permBluetoothConnect === undefined ? 'unknown' : status.permBluetoothConnect ? 'granted' : 'denied',
            ACCESS_FINE_LOCATION: status?.permLocation === undefined ? 'unknown' : status.permLocation ? 'granted' : 'denied',
          },
          gpsEnabled: status?.gpsEnabled,
          androidVersion: status?.platform || '--',
        };
      }
      addScanLog(`permission check result: ${formatPairingPermissionLog(permission)}`);
      const missingPermissions = listPermissions(permission.missingPermissions);
      addScanLog(`missing permission list: ${missingPermissions.length ? missingPermissions.join(',') : 'none'}`);

      if (!permission.canStartBleScan) {
        addScanLog('permission missing: skip BLE scan and request permission');
        const nativeRequest = await HeyboTuya.requestPermissions?.({ permissions: ['location', 'bluetooth'] }).catch(error => ({ error: error?.message || String(error) }));
        addScanLog(`native permission request result: ${nativeRequest?.error ? nativeRequest.error : `location=${nativeRequest?.location || '--'} bluetooth=${nativeRequest?.bluetooth || '--'}`}`);
        const requested = await HeyboTuya.checkPairingPermissions?.().catch(error => ({ error: error?.message || String(error) }));
        addScanLog(`permission recheck result: ${requested?.error ? requested.error : formatPairingPermissionLog(requested)}`);
        const missingAfterRequest = listPermissions(requested?.missingPermissions);
        if (!requested?.canStartBleScan) {
          addScanLog(`permission denied: stop BLE scan, missing=${missingAfterRequest.length ? missingAfterRequest.join(',') : 'unknown'}`);
          setPermissionNotice(t('pairingPermissionsRequired'));
          setEmpty(true);
          setScanning(false);
          setScanEndsAt(0);
          setRemainingSeconds(0);
          return;
        }
        addScanLog('permission granted: continue BLE scan');
      }

      setScanning(true);
      setScanEndsAt(startedAt + BLE_SCAN_MS);
      setRemainingSeconds(Math.ceil(BLE_SCAN_MS / 1000));
      addScanLog(`BLE scan preparing start=${new Date(startedAt).toISOString()} duration=${BLE_SCAN_MS / 1000}s`);
      const session = await HeyboTuya.ensureNativeSession();
      const activeHomeId = session?.homeId || homeId;
      if (activeHomeId) onHomeId?.(activeHomeId);
      addScanLog(`Tuya session ready, homeId=${activeHomeId || '--'}, devices=${session?.deviceCount ?? '--'}`);
      const token = await HeyboTuya.getActivatorToken({ homeId: activeHomeId }).catch(error => {
        addScanLog(`activatorToken 失败：${error?.message || String(error)}`);
        return null;
      });
      if (token?.success) addScanLog(`activatorToken ok, homeId=${token.homeId || '--'}`);
      listener = await HeyboTuya.addListener('bleDeviceFound', item => {
        rawDevicesRef.current = [...rawDevicesRef.current, item];
        const info = classifyBleDevice(item);
        const uuid = bleField(item, 'uuid');
        const mac = bleField(item, 'address', 'mac', 'deviceId', 'devId');
        addScanLog(`raw BLE name=${info.name || '--'} uuid=${maskId(uuid)} pid=${maskId(info.productId)} mac=${maskId(mac)} rssi=${bleField(item, 'rssi') || '--'} tuya=${info.isTuya ? 'yes' : 'no'} match=${info.match ? 'yes' : 'no'} reason=${info.reason}`);
        if (!info.match) return;
        if (!found.some(device => device.uuid === item.uuid)) found.push(item);
        filteredDevicesRef.current = found;
        addScanLog(`匹配 Heybo Pet 鲜食机：${item.name || '--'} pid=${maskId(info.productId)} uuid=${maskId(uuid)}`);
        setFoundDevices(prev => prev.some(device => device.uuid === item.uuid) ? prev : [...prev, item]);
      });
      scanListenerRef.current = listener;
      await HeyboTuya.stopBleScan().catch(error => addScanLog(`pre-scan stop ignored：${error?.message || String(error)}`));
      await HeyboTuya.startBleScan();
      addScanLog('BLE scan start');
    } catch (error) {
      addScanLog(`扫描准备失败：${error?.message || String(error)}`);
      setScanning(false);
      setEmpty(true);
      listener?.remove?.();
      return;
    }
    scanTimerRef.current = setTimeout(() => {
      stopScan(false);
    }, BLE_SCAN_MS);
  }

  useEffect(() => {
    if (open && !device && progress < 0) scan();
  }, [open]);

  useEffect(() => {
    if (!scanning || !scanEndsAt) return undefined;
    const timer = setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((scanEndsAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(timer);
  }, [scanning, scanEndsAt]);

  useEffect(() => () => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    HeyboTuya.stopBleScan().catch(() => {});
    scanListenerRef.current?.remove?.();
  }, []);

  const closeSheet = () => {
    if (scanning) stopScan(true);
    onClose();
  };

  const openPermissionSettings = async () => {
    addScanLog('open system settings for pairing permissions');
    await (HeyboTuya.openAppSettings?.() || HeyboTuya.openBluetoothSettings()).catch(error => {
      addScanLog(`打开系统设置失败：${error?.message || String(error)}`);
    });
  };

  if (!open) return null;

  const bind = async () => {
    const ssid = wifiName.trim() || wifi?.name || '';
    if (!ssid) {
      addScanLog('pairing blocked：missing Wi-Fi SSID');
      setFailed(true);
      return;
    }
    setProgress(0);
    setFailed(false);
    const timer = setInterval(() => setProgress(prev => Math.min(prev + 1, 3)), 650);
    try {
      const session = await HeyboTuya.ensureNativeSession();
      const activeHomeId = session?.homeId || homeId;
      if (activeHomeId) onHomeId?.(activeHomeId);
      addScanLog(`pairing start：BLE ${maskId(device.uuid)} homeId=${activeHomeId || '--'} ssid=${ssid}`);
      const result = await HeyboTuya.connectBleDevice({
        uuid: device.uuid,
        address: device.address,
        productId: device.productId || device.pid,
        ssid,
        password,
        deviceType: device.deviceType,
        flag: device.flag,
        homeId: activeHomeId,
      });
      clearInterval(timer);
      setProgress(3);
      if (!result?.device) throw new Error('Pairing returned empty device');
      setSuccess(true);
      addScanLog(`pairing success：${maskId(result.device.devId)}`);
      await onBound({
        ...result.device,
        macAddress: result.device.macAddress || result.device.mac || device.address,
        homeId: result.device.homeId || activeHomeId,
      });
      setTimeout(onClose, 900);
    } catch (error) {
      clearInterval(timer);
      addScanLog(`pairing error：${error?.message || String(error)}`);
      setFailed(true);
    }
  };

  return (
    <div className="cooking-sheet-mask" onClick={closeSheet}>
      <div className="cooking-sheet cooking-pairing-sheet" onClick={event => event.stopPropagation()}>
        <button className="cooking-sheet-close" onClick={closeSheet}>×</button>

        {!device && (
          <div className="cooking-sheet-flow">
            <h2>{t('addCooker')}</h2>
            <p>{t('pairingModeIntro')}</p>
            <ol>
              <li>{t('pairingPowerOn')}</li>
              <li>{t('pairingHoldKeys')}</li>
              <li>{t('pairingIndicatorNext')}</li>
            </ol>
            <PairingKeysGuide />
            {scanning && <div className="cooking-radar"><span /></div>}
            {scanning && (
              <div>
                <p>{t('pairingScanning', { seconds: remainingSeconds })}</p>
                <GhostButton onClick={() => stopScan(true)}>{t('cancelScan')}</GhostButton>
              </div>
            )}
            {foundDevices.map(item => (
              <div key={item.uuid} className="cooking-scan-result">
                <div><strong>Pet Chef S1</strong><span>{t('pairingSignalGood')}</span></div>
                <PrimaryButton onClick={() => setDevice(item)}>{t('select')}</PrimaryButton>
              </div>
            ))}
            {empty && (
              <div>
                <div className="cooking-warning">{permissionNotice || scanFailureMessage(scanSummary, t)}</div>
                {permissionNotice && (
                  <div className="cooking-sheet-actions">
                    <GhostButton onClick={openPermissionSettings}>{t('openSystemSettings')}</GhostButton>
                    <GhostButton disabled={scanning} onClick={scan}>{t('requestPermissionsAgain')}</GhostButton>
                  </div>
                )}
                {!permissionNotice && scanSummary?.rawCount === 0 && (
                  <>
                    <ol>
                      <li>{t('pairingPowerOn')}</li>
                      <li>{t('pairingHoldKeys')}</li>
                      <li>{t('pairingConfirmBlink')}</li>
                      <li>{t('pairingAvoidSystemBluetooth')}</li>
                      <li>{t('pairingUnbindPrevious')}</li>
                      <li>{t('pairingMoveCloser')}</li>
                    </ol>
                    <PairingKeysGuide />
                  </>
                )}
                {!permissionNotice && (
                  <div className="cooking-sheet-actions">
                    <GhostButton disabled={scanning} onClick={scan}>{t('scanAgain')}</GhostButton>
                    <GhostButton disabled={scanning} onClick={scan}>{t('pairingModeConfirmed')}</GhostButton>
                  </div>
                )}
              </div>
            )}
            {!scanning && !foundDevices.length && !empty && <PrimaryButton onClick={scan}>{t('startScan')}</PrimaryButton>}
          </div>
        )}

        {device && !wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>{t('select24GWifi')}</h2>
            <p>{t('pairingCurrentWifiHelp')}</p>
            <input
              className="cooking-wifi-input"
              value={wifiName}
              onChange={event => setWifiName(event.target.value)}
              placeholder={detectedWifiName || t('wifiNameUnavailable')}
            />
            {detectedWifiName && (
              <div className="cooking-wifi-current">
                <strong>{detectedWifiName}</strong>
                <span>{t('currentPhoneWifi')}</span>
              </div>
            )}
            <PrimaryButton disabled={!wifiName.trim()} onClick={() => setWifi({ name: wifiName.trim(), type: 'manual', desc: 'manual' })}>{t('next')}</PrimaryButton>
          </div>
        )}

        {device && wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>{t('enterWifiPassword')}</h2>
            <p>{wifiName.trim() || wifi.name}</p>
            {wifi.type === 'dual' && <div className="cooking-warning">{t('dualBandWifiWarning')}</div>}
            <div className="cooking-password-row">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={t('wifiPasswordPlaceholder')} />
              <button onClick={() => setShowPassword(!showPassword)}>{showPassword ? t('hidePassword') : t('showPassword')}</button>
            </div>
            <PrimaryButton disabled={!password} onClick={bind}>{t('bindNow')}</PrimaryButton>
          </div>
        )}

        {progress >= 0 && (
          <div className="cooking-sheet-flow">
            <h2>{failed ? t('bindFailed') : success ? t('bindSucceeded') : t('bindingCooker')}</h2>
            {PAIRING_STEPS.map((labelKey, index) => (
              <div key={labelKey} className={`cooking-progress-step ${index <= progress ? 'is-active' : ''} ${success ? 'is-done' : ''}`}>
                <span>{success && index === PAIRING_STEPS.length - 1 ? '✓' : index + 1}</span>
                <strong>{t(labelKey)}</strong>
              </div>
            ))}
            {success && <p className="cooking-success">{t('bindSuccessAccount')}</p>}
            {failed && (
              <div className="cooking-failure">
                <strong>{t('bindFailurePossibleReasons')}</strong>
                <p style={{ whiteSpace: 'pre-line' }}>{t('bindFailureChecklist')}</p>
              </div>
            )}
          </div>
        )}

        {failed && (
          <div className="cooking-sheet-actions">
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setPassword(''); }}>{t('reenterPassword')}</GhostButton>
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setDevice(null); }}>{t('backToScan')}</GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordRow({ record, onFeedback }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const date = formatDate(record.operation?.started_at || record.operation?.created_at, lang);
  const recipeName = tData(record.recipeName, lang);
  const feedback = record.feedback;
  return (
    <div className="cooking-record-row">
      <div className="cooking-record-copy">
        <strong>{t('cookingRecordSentence', { date, device: record.operation?.device_name || t('defaultCookerName'), pet: record.petName, recipe: recipeName })}</strong>
        {feedback && (
          <span className="cooking-record-feedback">
            {t('palatability')}：{feedbackOptionLabel(feedback.palatability, PALATABILITY_OPTIONS, t)}
            {'｜'}
            {t('stoolStatus')}：{feedbackOptionLabel(feedback.stool_status, STOOL_OPTIONS, t)}
          </span>
        )}
      </div>
      <GhostButton disabled={Boolean(feedback)} onClick={() => onFeedback(record)}>
        {feedback ? t('feedbackSubmitted') : t('feedingFeedback')}
      </GhostButton>
    </div>
  );
}

function FeedbackModal({ record, saving, onCancel, onConfirm }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [palatability, setPalatability] = useState(null);
  const [stool, setStool] = useState(null);

  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card cooking-feedback-card">
        <h2>{t('feedingFeedback')}</h2>
        <p>{tData(record.recipeName, lang)}｜{record.petName}</p>
        <strong>{t('palatability')}</strong>
        <div className="cooking-option-grid">
          {PALATABILITY_OPTIONS.map(item => <button key={item.code} className={palatability?.code === item.code ? 'is-active' : ''} onClick={() => setPalatability(item)}>{t(item.key)}</button>)}
        </div>
        <strong>{t('stoolStatus')}</strong>
        <div className="cooking-option-grid">
          {STOOL_OPTIONS.map(item => <button key={item.code} className={stool?.code === item.code ? 'is-active' : ''} onClick={() => setStool(item)}>{t(item.key)}</button>)}
        </div>
        <div className="cooking-feedback-actions">
          <GhostButton disabled={saving} onClick={onCancel}>{t('cancelBtn')}</GhostButton>
          <PrimaryButton disabled={saving || !palatability || !stool} onClick={() => onConfirm({ palatability: palatability.value, stool: stool.value })}>{t('confirm')}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SafetyStartModal({ lidOpen, onCancel, onConfirm }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [checked, setChecked] = useState({});
  const allChecked = START_CHECKS.every(item => checked[item.code]);

  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card">
        <h2>{t('startSafetyConfirmation')}</h2>
        <div className="cooking-check-list">
          {START_CHECKS.map(item => (
            <label key={item.code} className="cooking-check-item">
              <input
                type="checkbox"
                checked={Boolean(checked[item.code])}
                onChange={event => setChecked({ ...checked, [item.code]: event.target.checked })}
              />
              <span>{t(item.key)}</span>
            </label>
          ))}
        </div>
        {lidOpen && <div className="cooking-warning">{t('lidStartWarning')}</div>}
        <div className="cooking-start-actions">
          <GhostButton onClick={onCancel}>{t('cancelBtn')}</GhostButton>
          <PrimaryButton disabled={!allChecked || lidOpen} onClick={onConfirm}>{t('startCooking')}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function DeviceSelectionModal({ devices, onCancel, onSelect }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card cooking-device-picker">
        <h2>{t('selectCookerForCooking')}</h2>
        <p>{t('selectCookerForCookingHelp')}</p>
        <div className="cooking-device-picker-list">
          {devices.map(device => {
            const view = getDeviceView(device, t);
            return (
              <button key={view.devId} type="button" disabled={!view.online} onClick={() => onSelect(device)}>
                <strong>{view.name}</strong>
                <span>{view.status}</span>
              </button>
            );
          })}
        </div>
        <div><GhostButton onClick={onCancel}>{t('cancelBtn')}</GhostButton></div>
      </div>
    </div>
  );
}

function RenameDeviceModal({ device, saving, onCancel, onConfirm }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [name, setName] = useState(() => getDeviceView(device, t).name);
  const trimmedName = name.trim();
  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card cooking-rename-card">
        <h2>{t('renameCooker')}</h2>
        <label>
          <span>{t('cookerName')}</span>
          <input
            type="text"
            value={name}
            maxLength={30}
            autoFocus
            onChange={event => setName(event.target.value)}
            placeholder={t('cookerNamePlaceholder')}
          />
        </label>
        <small>{t('cookerNameLimit')}</small>
        <div>
          <GhostButton disabled={saving} onClick={onCancel}>{t('cancelBtn')}</GhostButton>
          <PrimaryButton disabled={saving || !trimmedName} onClick={() => onConfirm(trimmedName)}>{t('saveBtn')}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function DeviceDetail({ device, recipeContext, activeRuntime, startSending, completeSending, onBack, onOpenCustomSnack, onStart, onComplete }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const view = getDeviceView(device, t);
  const deviceDps = parseDps(device);
  const hasCupMissingFault = isCupMissingFault(deviceDps);
  const displayStatusCode = view.statusCode;
  const isPaused = displayStatusCode === 'pause';
  const isCooking = displayStatusCode === 'cooking';
  const isActive = isCooking || isPaused;
  const isDone = displayStatusCode === 'done';
  const runtimeOwnsDisplay = Boolean(
    activeRuntime?.devId === view.devId
    && (isActive || isDone)
    && (activeRuntime.recipeName || activeRuntime.recipeId),
  );
  const displayContext = runtimeOwnsDisplay
    ? {
      recipe: { id: activeRuntime.recipeId, name: activeRuntime.recipeName },
      cookParams: activeRuntime.cookingParamsSnapshot,
      displayGrams: activeRuntime.totalWeightG,
      profile: { id: activeRuntime.petId, name: activeRuntime.petName },
      isCustomSnack: activeRuntime.isCustomSnack,
    }
    : recipeContext;
  const cooking = getRecipeCookingParams(displayContext);
  const hasRecipe = Boolean(cooking.recipe);
  const recipeName = hasRecipe
    ? tData(cooking.recipe.name || cooking.recipe.recipeName || t('currentRecipe'), lang)
    : t('unnamedRecipe');
  const petName = displayContext?.profile?.name || t('petNotSelected');
  const servingGrams = displayContext?.displayGrams
    ?? displayContext?.totalWeightGram
    ?? displayContext?.total_weight_g
    ?? 0;
  const cookingGuidanceKey = displayContext?.isCustomSnack
    ? isDone
      ? 'customSnackGuidanceDone'
      : isActive
        ? 'customSnackGuidanceActive'
        : 'customSnackGuidanceBeforeStart'
    : isDone
      ? 'cookingGuidanceDone'
      : isActive
        ? 'cookingGuidanceActive'
        : 'cookingGuidanceBeforeStart';
  const totalSeconds = Number(activeRuntime?.plannedSeconds || cooking.cookTime || 0);
  const rawRemaining = deviceDps[8] ?? deviceDps.remain_time ?? deviceDps.remainTime;
  const reportedRemaining = rawRemaining === undefined || rawRemaining === null || rawRemaining === ''
    ? Number.NaN
    : Number(rawRemaining);
  const remainingSeconds = resolveCookingRemainingSeconds({
    reportedRemaining,
    isDone,
  });
  const progressPercent = isDone
    ? 100
    : isActive && totalSeconds > 0 && Number.isFinite(remainingSeconds)
      ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 0;
  const hasReportedRemaining = Number.isFinite(reportedRemaining) && reportedRemaining >= 0;
  const countdownText = hasReportedRemaining ? formatCountdown(remainingSeconds) : '--:--';
  const statusLabel = displayStatusCode === 'offline'
    ? t('deviceStatusOffline')
    : displayStatusCode === 'cooking'
      ? t('deviceStatusCooking')
      : displayStatusCode === 'pause'
        ? t('deviceStatusPaused')
        : displayStatusCode === 'done'
          ? t('deviceStatusDone')
          : t('deviceStatusStandby');

  return (
    <div className="cooking-sheet-mask" onClick={onBack}>
      <div className="cooking-sheet cooking-detail-sheet" onClick={event => event.stopPropagation()}>
        <div className="cooking-detail-head">
          <h2>{view.name}</h2>
        </div>
        <div className="cooking-lux-panel">
          <img src="/machine.jpg" alt={t('cookerImageAlt')} onError={event => { event.currentTarget.src = '/machine.png'; }} />
        </div>
        <div className="cooking-lux-progress">
          <div className={`cooking-lux-stage ${isActive || isDone ? 'is-complete' : 'is-active'}`}>
            <strong>🥣</strong>
            <em>{t('stageLoad')}</em>
          </div>
          <div className={`cooking-lux-stage cooking-lux-stage-main ${isActive ? 'is-active' : ''} ${isDone ? 'is-complete' : ''}`}>
            <div
              className="cooking-lux-progress-track"
              role="progressbar"
              aria-label={t('stageCook')}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(progressPercent)}
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <strong>♨️</strong>
            <em>{t('stageCook')}</em>
            <small>{countdownText}</small>
          </div>
          <div className={`cooking-lux-stage ${isDone ? 'is-complete' : ''}`}>
            <strong>✅</strong>
            <em>{t('stageDone')}</em>
          </div>
        </div>
        <div className="cooking-lux-steps">
          {hasRecipe
            ? <p className="cooking-lux-guidance">{t(cookingGuidanceKey, { pet: petName, grams: servingGrams, recipe: recipeName })}</p>
            : <p className="cooking-lux-guidance">{t('selectRecipeBeforeStart')}</p>}
        </div>
        {view.faultCode && (!isLidOpenFault(parseDps(device)) || isActive) && (
          <div className="cooking-warning">{view.fault}</div>
        )}
        <div className="cooking-detail-actions">
          <GhostButton onClick={onBack}>{t('back')}</GhostButton>
          <GhostButton onClick={onOpenCustomSnack}>{t('customSnack')}</GhostButton>
          {displayStatusCode === 'standby' ? (
            <PrimaryButton
              disabled={startSending || hasCupMissingFault || !hasRecipe}
              onClick={onStart}
            >
              {t('startCooking')}
            </PrimaryButton>
          ) : displayStatusCode === 'done' ? (
            <PrimaryButton disabled={completeSending} onClick={onComplete}>
              {t('deviceStatusDone')}
            </PrimaryButton>
          ) : (
            <div className={`cooking-device-status cooking-device-status-${displayStatusCode}`} role="status">
              {statusLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CookingCenterPage({ onBack, authToken, recipeContext, onOpenCustomSnack }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [devices, setDevices] = useState([]);
  const [pets, setPets] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [operations, setOperations] = useState([]);
  const [feedingRecords, setFeedingRecords] = useState([]);
  const [lastStatusAt, setLastStatusAt] = useState('');
  const [liveStatusError, setLiveStatusError] = useState('');
  const [selectedDevId, setSelectedDevId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState(null);
  const [feedbackRecord, setFeedbackRecord] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [unbindTarget, setUnbindTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [startSending, setStartSending] = useState(false);
  const [completeSending, setCompleteSending] = useState(false);
  const [tuyaHomeId, setTuyaHomeId] = useState('');
  const safetyRef = useRef({ lidAlerted: false });
  const nativeDpSeenRef = useRef(new Set());
  const operationFlushRef = useRef(Promise.resolve());
  const deviceCommunicationFlushRef = useRef(new Map());
  const selectedDeviceDpsRef = useRef({});
  const recipeEntryHandledRef = useRef(false);
  const autoStartHandledRef = useRef(false);

  const selectedDevice = useMemo(() => {
    const device = devices.find(item => item.devId === selectedDevId) || devices[0];
    return device || null;
  }, [devices, selectedDevId]);
  const activeRuntime = readCookingRuntime(selectedDevice?.devId);
  useEffect(() => {
    selectedDeviceDpsRef.current = parseDps(selectedDevice);
  }, [selectedDevice]);
  const recipesById = useMemo(() => Object.fromEntries(recipes.map(recipe => [recipe.id, recipe])), [recipes]);
  const petsById = useMemo(() => Object.fromEntries(pets.map(pet => [pet.id, pet])), [pets]);
  const records = useMemo(() => {
    const latestBySession = {};
    const latestFeedback = [...feedingRecords]
      .sort((a, b) => new Date(b.fed_at || b.created_at || 0) - new Date(a.fed_at || a.created_at || 0));
    [...operations]
      .sort((a, b) => new Date(b.event_at || b.created_at || 0) - new Date(a.event_at || a.created_at || 0))
      .forEach(operation => {
        const sessionId = operation.session_id || operation.id;
        if (!latestBySession[sessionId]) latestBySession[sessionId] = operation;
      });
    return operations
      .filter(operation => operation.operation_type === 'start_cooking' || !operation.operation_type)
      .map(operation => {
        const feedback = latestFeedback.find(item =>
          (operation.session_id && item.session_id === operation.session_id)
          || item.cooking_operation_id === operation.id
        );
        return {
          ...makeRecord({
            ...operation,
            status: latestBySession[operation.session_id || operation.id]?.status || operation.status,
          }, recipesById, petsById, pets[0], lang, t),
          feedback,
        };
      })
      .sort((a, b) => new Date(b.operation?.created_at || 0) - new Date(a.operation?.created_at || 0));
  },
    [operations, feedingRecords, recipesById, petsById, pets, lang],
  );
  const selectedDeviceRecords = useMemo(() => {
    const view = getDeviceView(selectedDevice, t);
    if (!view.devId && !view.id) return records;
    return records.filter(record => {
      const op = record.operation || {};
      return op.tuya_device_id === view.devId || op.device_id === view.id || op.device_name === view.name;
    });
  }, [records, selectedDevice, lang]);
  const latestRecord = selectedDeviceRecords[0] || records[0];

  const flushCookingOperationOutbox = () => {
    if (!authToken) return Promise.resolve();
    const flush = async () => {
      const events = readCookingOperationOutbox();
      for (const event of events) {
        try {
          await api.recordCookingOperation(event, authToken);
          removeCookingOperationFromOutbox(event.client_event_id);
        } catch {
          break;
        }
      }
    };
    operationFlushRef.current = operationFlushRef.current.then(flush, flush);
    return operationFlushRef.current;
  };

  const reportCookingOperation = async payload => {
    const event = {
      client_event_id: payload.client_event_id || uniqueEventId('cook'),
      event_at: payload.event_at || new Date().toISOString(),
      ...payload,
    };
    enqueueCookingOperation(event);
    await flushCookingOperationOutbox();
    return event;
  };

  const refreshData = async () => {
    if (!authToken) return;
    try {
      const [deviceResult, petResult, recipeResult, operationResult, feedingResult] = await Promise.all([
        api.listDevices(authToken),
        api.listPets(authToken),
        api.getRecipes({ all: 1 }),
        api.listCookingOperations(authToken),
        api.listFeedingRecords(authToken),
      ]);
      const serverDevices = uniqueDevices((deviceResult.devices || []).map(device => ({ ...device, devId: device.tuya_device_id || device.devId })));
      setDevices(prev => {
          const localByDevId = Object.fromEntries(prev.map(device => [device.devId || device.tuya_device_id, device]));
        return serverDevices.map(device => {
          const local = localByDevId[device.devId];
          const serverDps = parseDps(device);
          const localDps = parseDps(local);
          return {
            ...device,
            // 在线状态只接受本机 Tuya SDK 的 DP；ECS DP 缓存仅供离线展示。
            dps: nativeDpSeenRef.current.has(device.devId)
              ? localDps
              : device.online_status === false || device.status === 'offline'
                ? { ...localDps, ...serverDps }
                : localDps,
          };
        });
      });
      setPets(petResult.pets || []);
      setRecipes(recipeResult.recipes || []);
      setOperations(operationResult.operations || []);
      setFeedingRecords(feedingResult.records || []);
      if (serverDevices[0]) setSelectedDevId(prev => prev || serverDevices[0].devId);
      setLastStatusAt(new Date().toISOString());
      setLiveStatusError('');
    } catch (error) {
      setLiveStatusError(lang === 'zh' && error?.message ? error.message : t('deviceCacheRefreshFailed'));
    }
  };

  const registerBoundDevice = async (device, refreshAfter = true) => {
    if (!authToken || !device?.devId) return refreshData();
    const homeId = device.homeId || tuyaHomeId;
    await api.registerDevice({
      tuya_device_id: device.devId,
      tuya_home_id: String(homeId || ''),
      tuya_pid: device.productId,
      mac_address: device.macAddress || device.mac || device.address || '',
      product_type: device.productId === 'ak2kofibhuvdtqip' || device.isPetChef ? 'pet_chef' : 'other',
      device_name: device.name || t('defaultCookerName'),
      status: device.isOnline === false ? 'offline' : 'online',
    }, authToken);
    // Device-list DP data is only a discovery snapshot. The selected device's
    // subscription owns both the initial DP snapshot and all later updates.
    // Writing this list snapshot here can race a newer dpUpdate.
    if (refreshAfter) await refreshData();
  };

  const enqueueDeviceCommunication = (devId, send) => {
    if (!devId) return Promise.resolve();
    const previous = deviceCommunicationFlushRef.current.get(devId) || Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(send)
      .catch(error => {
        // Telemetry is best-effort. It must not block or fail a device command.
        console.warn('Device communication log failed:', error?.message || error);
      });
    deviceCommunicationFlushRef.current.set(devId, next);
    return next;
  };

  const reportDeviceCommunication = (devId, dps) => {
    if (!authToken || !devId) return Promise.resolve();
    return enqueueDeviceCommunication(devId, () => api.recordDeviceCommunication(devId, {
        direction: 'app_to_device',
        dps,
        reported_at: new Date().toISOString(),
      }, authToken));
  };

  const syncNativeDpsToBackend = (devId, dps, online) => {
    if (!authToken || !devId) return Promise.resolve();
    return enqueueDeviceCommunication(devId, () => api.syncDeviceDp(devId, {
      tuya_device_id: devId,
      online,
      // The native callback is an incremental device report. Persist the raw
      // patch, never the UI's merged cache, so an old DP5 cannot be replayed.
      dps,
      reported_at: new Date().toISOString(),
    }, authToken));
  };

  useEffect(() => { refreshData(); }, [authToken]);

  useEffect(() => {
    if (authToken) flushCookingOperationOutbox();
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return undefined;
    let alive = true;
    HeyboTuya.ensureNativeSession()
      .then(async session => {
        if (!alive) return;
        const homeId = session?.homeId;
        if (homeId) setTuyaHomeId(homeId);
        if (!homeId || session?.platform === 'web') return;
        const nativeResult = await HeyboTuya.getDeviceList({ homeId });
        const nativeDevices = nativeResult.devices || [];
        nativeDevices.forEach(device => {
          if (Object.keys(parseDps(device)).length) nativeDpSeenRef.current.add(device.devId);
        });
        setDevices(prev => uniqueDevices([
          ...prev,
          ...nativeDevices.map(device => ({ ...device, homeId, dps: parseDps(device) })),
        ]));
        await Promise.all(nativeDevices.map(device =>
          registerBoundDevice({ ...device, homeId }, false)
        ));
        if (alive) await refreshData();
      })
      .catch(error => setLiveStatusError(lang === 'zh' && error?.message ? error.message : t('tuyaSessionInitFailed')));
    return () => { alive = false; };
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return undefined;
    const timer = setInterval(refreshData, 15000);
    return () => clearInterval(timer);
  }, [authToken]);

  useEffect(() => () => {
    safetyRef.current = { lidAlerted: false };
  }, []);

  useEffect(() => {
    const devId = selectedDevice?.devId;
    if (!devId) return undefined;
    let listener;
    let alive = true;
    let receivedRealtimeUpdate = false;
    const applyNativeDps = (rawDps, source = 'realtime') => {
      let nextDps = rawDps || {};
      if (typeof nextDps === 'string') {
        try { nextDps = JSON.parse(nextDps || '{}'); } catch { nextDps = {}; }
      }
      if (!nextDps || typeof nextDps !== 'object' || Array.isArray(nextDps) || Object.keys(nextDps).length === 0) return false;
      // getDeviceDpState is only an initial snapshot. A callback received
      // before it is newer and must never be overwritten by that snapshot.
      if (source === 'snapshot' && receivedRealtimeUpdate) return false;
      if (source === 'realtime') receivedRealtimeUpdate = true;
      nativeDpSeenRef.current.add(devId);
      const mergedDps = { ...selectedDeviceDpsRef.current, ...nextDps };
      selectedDeviceDpsRef.current = mergedDps;
      void syncNativeDpsToBackend(devId, nextDps, selectedDevice?.isOnline);
      setDevices(prev => prev.map(device => {
        const itemDevId = device.devId || device.tuya_device_id;
        return itemDevId === devId ? { ...device, dps: mergedDps } : device;
      }));
      setLastStatusAt(new Date().toISOString());
      const state = resolveCookingState(mergedDps);
      if (state === 'standby') {
        safetyRef.current = { lidAlerted: false };
        clearCookingRuntime(devId);
        return true;
      }
      if (state === 'unknown') return true;
      if (isCupMissingFault(mergedDps)) setMessage(t('deviceFaultCup'));
      saveCookingRuntime(devId, mergedDps, { pendingStart: false });
      if (isLidOpenFault(mergedDps) && !safetyRef.current.lidAlerted) {
        safetyRef.current.lidAlerted = true;
        setMessage(t('lidCheckWarning'));
      }
      return true;
    };
    HeyboTuya.addListener('dpUpdate', event => {
      if (!alive || event.devId !== devId) return;
      applyNativeDps(event.dps, 'realtime');
    })
      .then(result => {
        listener = result;
        return HeyboTuya.subscribeDevice({ devId });
      })
      .then(() => HeyboTuya.getDeviceDpState({ devId }))
      .then(result => { if (alive) applyNativeDps(result?.dps, 'snapshot'); })
      .catch(() => {});
    return () => {
      alive = false;
      nativeDpSeenRef.current.delete(devId);
      listener?.remove?.();
      HeyboTuya.unsubscribeDevice({ devId }).catch(() => {});
    };
  }, [selectedDevice?.devId, authToken]);

  const handlePrepareCooking = async () => {
    if (startSending) return;
    const cooking = getRecipeCookingParams(recipeContext);
    if (!selectedDevice || !cooking.recipe) {
      setMessage(t('selectRecipeFirst'));
      return;
    }
    const currentDps = parseDps(selectedDevice);
    if (isLidOpenFault(currentDps)) {
      setMessage(t('lidStartWarning'));
      return;
    }
    setStartSending(true);
    try {
      void reportDeviceCommunication(selectedDevice.devId, { 107: 'reset_requested' });
      await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
      void reportDeviceCommunication(selectedDevice.devId, { 107: 'reset_sent' });
      setStartConfirmOpen(true);
    } catch (error) {
      setMessage(error?.message || t('deviceCommandFailed'));
    } finally {
      setStartSending(false);
    }
  };

  const handleStartCooking = async () => {
    if (startSending) return;
    const cooking = getRecipeCookingParams(recipeContext);
    if (!selectedDevice || !cooking.recipe) {
      setMessage(t('selectRecipeFirst'));
      return;
    }
    const currentDps = parseDps(selectedDevice);
    safetyRef.current = { lidAlerted: false };
    const temperature = cooking.temperature ?? 85;
    const cookMinutes = Number(cooking.cookMinutes ?? Math.ceil(Number(cooking.cookTime || 12 * 60) / 60));
    const cookTime = Number(cooking.cookTime || (cookMinutes * 60));
    const power = cooking.power ?? 8;
    const speed = String(cooking.speed ?? 1);
    const sessionId = uniqueEventId('session');
    const requestedAtMs = Date.now();
    const requestedAtIso = new Date(requestedAtMs).toISOString();
    const operationContext = {
      session_id: sessionId,
      tuya_device_id: selectedDevice.devId,
      device_name: selectedDevice.name || t('defaultCookerName'),
      recipe_id: cooking.recipe.id || '',
      recipe_name: cooking.recipe.name || cooking.recipe.recipeName || t('currentRecipe'),
      pet_id: recipeContext?.profile?.id || '',
      pet_name: recipeContext?.profile?.name || '',
      total_weight_g: recipeContext?.displayGrams || 0,
      started_at: requestedAtIso,
      cooking_params_snapshot: cooking.params,
    };
    setStartSending(true);
    try {
      void reportDeviceCommunication(selectedDevice.devId, {
        1: true,
        3: 'diy',
        7: cookTime,
        9: temperature,
        102: power,
        107: 'start_requested',
        108: speed,
      });
      await HeyboTuya.startDiyCooking({
        devId: selectedDevice.devId,
        temperature,
        cookTime,
        power,
        speed,
      });
      void reportDeviceCommunication(selectedDevice.devId, { 107: 'start_sent' });
    } catch (error) {
      clearCookingRuntime(selectedDevice.devId);
      await reportCookingOperation({
        ...operationContext,
        operation_type: 'start_cooking',
        status: 'failed',
        result: 'failed',
        error_code: error?.code || error?.message || 'device_command_failed',
      });
      setMessage(error?.message || t('deviceCommandFailed'));
      setStartSending(false);
      return;
    }
    saveCookingRuntime(selectedDevice.devId, selectedDeviceDpsRef.current || currentDps, {
      pendingStart: true,
      sessionId,
      startedAt: requestedAtIso,
      deviceName: operationContext.device_name,
      recipeId: operationContext.recipe_id,
      recipeName: operationContext.recipe_name,
      petId: operationContext.pet_id,
      petName: operationContext.pet_name,
      totalWeightG: operationContext.total_weight_g,
      cookingParamsSnapshot: cooking.params,
      plannedSeconds: cookTime,
      isCustomSnack: Boolean(recipeContext?.isCustomSnack),
    });
    await reportCookingOperation({
      ...operationContext,
      started_at: requestedAtIso,
      operation_type: 'start_cooking',
      status: 'sent',
      result: 'success',
    });
    setMessage(t('cookingStarted'));
    setStartConfirmOpen(false);
    setStartSending(false);
  };

  const handleCompleteCooking = async () => {
    if (!selectedDevice || completeSending || getDeviceView(selectedDevice, t).statusCode !== 'done') return;
    setCompleteSending(true);
    try {
      void reportDeviceCommunication(selectedDevice.devId, { 107: 'reset_requested' });
      await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
      void reportDeviceCommunication(selectedDevice.devId, { 107: 'reset_sent' });
    } catch (error) {
      setMessage(error?.message || t('deviceCommandFailed'));
    } finally {
      setCompleteSending(false);
    }
  };

  const handleFeedbackSave = async (feedback) => {
    if (!feedbackRecord || feedbackSaving) return;
    setFeedbackSaving(true);
    try {
      const result = await api.createFeedingRecord({
        pet_id: feedbackRecord.petId,
        pet_name: feedbackRecord.petName,
        recipe_id: feedbackRecord.recipeId,
        recipe_name: feedbackRecord.recipeName,
        fed_at: new Date().toISOString(),
        palatability: feedback.palatability,
        stool_status: feedback.stool,
        cooking_operation_id: feedbackRecord.id,
        session_id: feedbackRecord.operation?.session_id || '',
        client_event_id: feedbackRecord.feedbackClientEventId,
        // TODO: 后端提供食谱优化画像字段后，把反馈聚合回 recipe 画像。
      }, authToken);
      if (result.record) {
        setFeedingRecords(prev => prev.some(item => item.id === result.record.id)
          ? prev
          : [result.record, ...prev]);
      }
      setFeedbackRecord(null);
      setMessage(t('feedingFeedbackSaved'));
    } catch (error) {
      setMessage(error?.message || t('feedingFeedbackSaveFailed'));
    } finally {
      setFeedbackSaving(false);
    }
  };

  const openFeedback = record => {
    if (record.feedback) return;
    setFeedbackRecord({
      ...record,
      feedbackClientEventId: uniqueEventId('feedback'),
    });
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    const devId = unbindTarget.devId || unbindTarget.tuya_device_id;
    const isMock = unbindTarget.mock || unbindTarget.isMock || unbindTarget.demo || /^(demo_|web_|mock_)/.test(String(devId || ''));
    if (isMock) {
      setMessage(t('mockDeviceUnbindBlocked'));
      setUnbindTarget(null);
      return;
    }
    await HeyboTuya.unbindDevice({ devId });
    await api.unbindDevice(devId, authToken);
    setDevices(prev => prev.filter(device => (device.devId || device.tuya_device_id) !== devId));
    setUnbindTarget(null);
    setDetailDevice(null);
  };

  const handleRename = async name => {
    if (!renameTarget || renameSaving) return;
    const devId = renameTarget.devId || renameTarget.tuya_device_id;
    setRenameSaving(true);
    try {
      await HeyboTuya.renameDevice({ devId, name });
      await api.registerDevice({ tuya_device_id: devId, device_name: name }, authToken);
      setDevices(prev => prev.map(device => (device.devId || device.tuya_device_id) === devId
        ? { ...device, name, device_name: name }
        : device));
      setDetailDevice(current => current && (current.devId || current.tuya_device_id) === devId
        ? { ...current, name, device_name: name }
        : current);
      setRenameTarget(null);
      setMessage(t('renameCookerSuccess'));
    } catch (error) {
      setMessage(lang === 'zh' && error?.message ? error.message : t('renameCookerFailed'));
    } finally {
      setRenameSaving(false);
    }
  };

  useEffect(() => {
    if (!recipeContext || !devices.length || recipeEntryHandledRef.current) return;
    recipeEntryHandledRef.current = true;
    if (devices.length === 1) {
      setSelectedDevId(devices[0].devId || devices[0].tuya_device_id);
      setDetailDevice(devices[0]);
      return;
    }
    setDetailDevice(null);
    setDevicePickerOpen(true);
  }, [recipeContext, devices]);

  useEffect(() => {
    if (!recipeContext?.autoStart || autoStartHandledRef.current || !detailDevice || !selectedDevice) return;
    autoStartHandledRef.current = true;
    if (getDeviceView(selectedDevice, t).statusCode === 'standby') setStartConfirmOpen(true);
  }, [recipeContext, detailDevice, selectedDevice]);

  const hasDevice = devices.length > 0;
  const view = getDeviceView(selectedDevice, t);

  return (
    <div className="cooking-center-page">
      <button className="cooking-center-back" onClick={onBack}>‹</button>
      <section className="cooking-center-hero">
        <img src="/machine.jpg" alt={t('cookerImageAlt')} />
        <button className="cooking-add-button" onClick={() => setSheetOpen(true)}>+</button>
        <div className="cooking-hero-copy">
          <h1>{t('cookingCenterTitle')}</h1>
          {hasDevice ? <p>{view.name}｜{view.online ? t('online') : t('offline')}<br />{latestRecord ? t('lastUsed', { time: latestRecord.time, recipe: tData(latestRecord.recipeName, lang) }) : t('noUsageRecords')}</p> : <p>{t('connectCookerIntro')}<br />{t('connectCookerBenefits')}</p>}
          {!hasDevice && <PrimaryButton onClick={() => setSheetOpen(true)}>{t('addCooker')}</PrimaryButton>}
        </div>
      </section>

      <section className="cooking-center-section">
        <h2>{t('myCookers')}</h2>
        <div className="cooking-device-list">
          {hasDevice ? devices.map(device => {
            const item = getDeviceView(device, t);
            return (
              <div key={item.devId} className={`cooking-device-card ${item.devId === view.devId ? 'is-active' : ''}`} onClick={() => { setSelectedDevId(item.devId); setDetailDevice(device); }}>
                <div className="cooking-device-card-title">
                  <button className="cooking-device-name-button" type="button" onClick={event => { event.stopPropagation(); setRenameTarget(device); }}>
                    <strong>{item.name}</strong>
                    <small>{t('edit')}</small>
                  </button>
                  <GhostButton danger onClick={event => { event.stopPropagation(); setUnbindTarget(device); }}>{t('unbind')}</GhostButton>
                </div>
                <span>{item.status}</span>
              </div>
            );
          }) : <div className="cooking-center-card">{t('noCookerBound')}</div>}
        </div>
      </section>

      <section className="cooking-center-section cooking-records-section">
        <h2>{t('usageRecords')}</h2>
        {records.length ? records.map(record => <RecordRow key={record.id} record={record} onFeedback={openFeedback} />) : <div className="cooking-center-card">{t('noUsageRecordsHelp')}</div>}
      </section>

      {message && <div className="cooking-toast">{message}</div>}
      <AddDeviceBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onBound={registerBoundDevice} homeId={tuyaHomeId} onHomeId={setTuyaHomeId} />

      {detailDevice && (
        <DeviceDetail
          device={(detailDevice.devId === selectedDevice?.devId || detailDevice.tuya_device_id === selectedDevice?.devId) ? selectedDevice : detailDevice}
          recipeContext={recipeContext}
          activeRuntime={activeRuntime}
          startSending={startSending}
          completeSending={completeSending}
          onBack={() => setDetailDevice(null)}
          onOpenCustomSnack={onOpenCustomSnack}
          onStart={handlePrepareCooking}
          onComplete={handleCompleteCooking}
        />
      )}
      {feedbackRecord && <FeedbackModal record={feedbackRecord} saving={feedbackSaving} onCancel={() => setFeedbackRecord(null)} onConfirm={handleFeedbackSave} />}
      {startConfirmOpen && <SafetyStartModal lidOpen={isLidOpenFault(parseDps(selectedDevice))} onCancel={() => setStartConfirmOpen(false)} onConfirm={handleStartCooking} />}
      {devicePickerOpen && <DeviceSelectionModal devices={devices} onCancel={() => setDevicePickerOpen(false)} onSelect={device => {
        setSelectedDevId(device.devId || device.tuya_device_id);
        setDetailDevice(device);
        setDevicePickerOpen(false);
      }} />}
      {renameTarget && <RenameDeviceModal device={renameTarget} saving={renameSaving} onCancel={() => setRenameTarget(null)} onConfirm={handleRename} />}

      {unbindTarget && (
        <div className="cooking-sheet-mask">
          <div className="cooking-confirm-card">
            <h2>{t('confirmUnbindCooker')}</h2>
            <p>{t('unbindCookerExplanation')}</p>
            <div>
              <GhostButton onClick={() => setUnbindTarget(null)}>{t('cancelBtn')}</GhostButton>
              <GhostButton danger onClick={handleUnbind}>{t('confirmUnbind')}</GhostButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
