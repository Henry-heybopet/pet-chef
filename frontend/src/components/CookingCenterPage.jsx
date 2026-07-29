import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/index';
import { HeyboTuya } from '../native/heyboTuya';
import { useLanguage } from '../i18n/LanguageContext';
import { useTranslation } from '../i18n/translations';
import { tData } from '../i18n/dataTranslations';
import { isActiveCookingDps, shouldResetAfterCompletion } from '../utils/cookingLifecycle';

const PAIRING_STEPS = ['pairConnectDevice', 'pairSendWifi', 'pairConnectCloud', 'pairBindAccount'];
const START_CHECKS = [
  { code: 'ingredients', key: 'startCheckIngredients' },
  { code: 'water', key: 'startCheckWater' },
  { code: 'lid', key: 'startCheckLid' },
  { code: 'clear_area', key: 'startCheckClearArea' },
];
const PET_CHEF_PID = 'ak2kofibhuvdtqip';
const BLE_SCAN_MS = 60000;
const COOKING_RUNTIME_KEY = 'petchef_cooking_runtime';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readCookingRuntime() {
  try {
    const raw = globalThis.localStorage?.getItem(COOKING_RUNTIME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCookingRuntime(devId, dps, extra = {}) {
  if (!devId || !isActiveCookingDps(dps)) return;
  try {
    globalThis.localStorage?.setItem(COOKING_RUNTIME_KEY, JSON.stringify({
      devId,
      dps,
      updatedAt: new Date().toISOString(),
      ...extra,
    }));
  } catch {
    // localStorage is best-effort; backend DP cache remains the source for cross-session state.
  }
}

function clearCookingRuntime(devId) {
  const runtime = readCookingRuntime();
  if (!runtime || (devId && runtime.devId !== devId)) return;
  try { globalThis.localStorage?.removeItem(COOKING_RUNTIME_KEY); } catch {}
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

function cleanWifiSsid(value) {
  const ssid = String(value || '').replace(/^"|"$/g, '').trim();
  return ssid && !/^<?unknown ssid>?$/i.test(ssid) && ssid !== '0x' ? ssid : '';
}

function formatCookMinutes(cooking, t) {
  const minutes = cooking?.cookMinutes ?? Math.ceil(Number(cooking?.cookTime || 0) / 60);
  return minutes ? t('minutesValue', { value: minutes }) : '--';
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
  const dp5 = dps[5] ?? dps.status;
  const online = device?.isOnline ?? device?.onlineStatus ?? device?.online_status ?? device?.status;
  const isOffline = online === false || online === 'offline';
  const statusCode = isOffline ? 'offline' : (['standby', 'cooking', 'pause', 'done'].includes(dp5) ? dp5 : ['standby', 'cooking', 'pause', 'done'].includes(device?.dp_status) ? device.dp_status : 'standby');
  const statusMap = { standby: 'deviceStatusStandby', cooking: 'deviceStatusCooking', pause: 'deviceStatusPaused', done: 'deviceStatusDone', offline: 'deviceStatusOffline' };
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
  const legacyPreheatMinutes = params.preheat_minutes ?? params.preheatMinutes ?? (params.preheat_seconds ? Math.ceil(Number(params.preheat_seconds) / 60) : undefined);
  const cookTime = params.total_seconds ?? params.cook_time ?? params.cookTime ?? params.time_seconds ?? params.duration_seconds ?? params.dp7
    ?? (cookMinutes ? (Number(cookMinutes) + Number(legacyPreheatMinutes || 0)) * 60 : undefined);
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
  return (
    <div className="cooking-record-row">
      <div>
        <strong>{t('cookingRecordSentence', { date, device: record.operation?.device_name || t('defaultCookerName'), pet: record.petName, recipe: recipeName })}</strong>
      </div>
      <GhostButton onClick={() => onFeedback(record)}>{t('feedingFeedback')}</GhostButton>
    </div>
  );
}

function FeedbackModal({ record, onCancel, onConfirm }) {
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
          <GhostButton onClick={onCancel}>{t('cancelBtn')}</GhostButton>
          <PrimaryButton disabled={!palatability || !stool} onClick={() => onConfirm({ palatability: palatability.value, stool: stool.value })}>{t('confirm')}</PrimaryButton>
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
                disabled={lidOpen && item.code === 'lid'}
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

function DeviceDetail({ device, recipeContext, lastStatusAt, liveStatusError, runStartedAt, runElapsedMs, nowTick, onBack, onChooseRecipe, onStart, onPause, onResume, onStop }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const view = getDeviceView(device, t);
  const cooking = getRecipeCookingParams(recipeContext);
  const hasRecipe = Boolean(cooking.recipe);
  const isPaused = view.statusCode === 'pause';
  const isCooking = view.statusCode === 'cooking';
  const isActive = isCooking || isPaused;
  const elapsedMs = runElapsedMs + (isCooking && runStartedAt ? nowTick - runStartedAt : 0);
  const deviceDps = parseDps(device);
  const totalSeconds = Number(cooking.cookTime || 0);
  const reportedRemaining = Number(deviceDps[8] ?? deviceDps.remain_time ?? deviceDps.remainTime);
  const fallbackRemaining = Math.max(0, totalSeconds - Math.floor(elapsedMs / 1000));
  const remainingSeconds = isActive && Number.isFinite(reportedRemaining) && reportedRemaining > 0
    ? reportedRemaining
    : isActive ? fallbackRemaining : view.statusCode === 'done' ? 0 : totalSeconds;
  const progressPercent = view.statusCode === 'done'
    ? 100
    : isActive && totalSeconds > 0
      ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))
      : 0;
  const stopTimer = useRef(null);
  const longPressed = useRef(false);
  const clearStopTimer = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
  };
  const startStopTimer = (event) => {
    event?.preventDefault?.();
    if (!isPaused) return;
    longPressed.current = false;
    stopTimer.current = setTimeout(() => {
      longPressed.current = true;
      onStop();
    }, 800);
  };
  const mainLabel = isPaused ? t('resumeOrHoldStop') : isCooking ? t('pauseCooking') : t('startCooking');
  const runMainAction = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (isPaused) onResume();
    else if (isCooking) onPause();
    else onStart();
  };

  return (
    <div className="cooking-sheet-mask" onClick={onBack}>
      <div className="cooking-sheet cooking-detail-sheet" onClick={event => event.stopPropagation()}>
        <div className="cooking-detail-head">
          <h2>{view.name}</h2>
        </div>
        <div className="cooking-lux-panel">
          <img src="/machine.jpg" alt={t('cookerImageAlt')} onError={event => { event.currentTarget.src = '/machine.png'; }} />
          <div className="cooking-lux-metrics">
            <div><span>🌡️ {t('currentTemperature')}</span><strong>{view.temperature}℃</strong></div>
            <div><span>🔄 {t('currentSpeed')}</span><strong>{view.speed}</strong></div>
            <div><span>⚡ {t('currentPower')}</span><strong>{view.power}</strong></div>
            <div><span>💧 {t('currentStatus')}</span><strong>{view.status}</strong></div>
          </div>
        </div>
        <div className="cooking-lux-progress">
          <div className={`cooking-lux-stage ${isActive || view.statusCode === 'done' ? 'is-complete' : 'is-active'}`}>
            <strong>🥣</strong>
            <em>{t('stageLoad')}</em>
          </div>
          <div className={`cooking-lux-stage cooking-lux-stage-main ${isActive ? 'is-active' : ''} ${view.statusCode === 'done' ? 'is-complete' : ''}`}>
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
            <small>{formatCountdown(remainingSeconds)}</small>
          </div>
          <div className={`cooking-lux-stage ${view.statusCode === 'done' ? 'is-complete' : ''}`}>
            <strong>✅</strong>
            <em>{t('stageDone')}</em>
          </div>
        </div>
        <div className="cooking-lux-steps">
          <h3>📋 {t('cookingSteps')}</h3>
          <p>1. {t('cookingTemperature')}: {hasRecipe ? `${cooking.temperature ?? '--'}℃` : '--'}</p>
          <p>2. {t('cookingTime')}: {hasRecipe ? formatCookMinutes(cooking, t) : '--'}</p>
          <p>3. {t('cookingSpeed')}: {hasRecipe ? formatSpeed(cooking.speed, t) : '--'}</p>
          <p>4. {t('cookingPower')}: {hasRecipe ? formatPower(cooking.power, t) : '--'}</p>
          {!hasRecipe && <small>{t('selectRecipeBeforeStart')}</small>}
        </div>
        {view.faultCode && (!isLidOpenFault(parseDps(device)) || isActive) && (
          <div className="cooking-warning">{view.fault}</div>
        )}
        <div className="cooking-detail-actions">
          <GhostButton onClick={onBack}>{t('back')}</GhostButton>
          <GhostButton onClick={onChooseRecipe}>{t('selectRecipe')}</GhostButton>
          <PrimaryButton
            disabled={!hasRecipe && !isActive}
            onPointerDown={startStopTimer}
            onPointerUp={clearStopTimer}
            onPointerLeave={clearStopTimer}
            onPointerCancel={clearStopTimer}
            onContextMenu={event => event.preventDefault()}
            onClick={runMainAction}
          >
            {mainLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function CookingCenterPage({ onBack, authToken, recipeContext, onChooseRecipe }) {
  const { lang } = useLanguage();
  const t = useTranslation(lang);
  const [devices, setDevices] = useState([]);
  const [pets, setPets] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [operations, setOperations] = useState([]);
  const [lastStatusAt, setLastStatusAt] = useState('');
  const [liveStatusError, setLiveStatusError] = useState('');
  const [selectedDevId, setSelectedDevId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState(null);
  const [feedbackRecord, setFeedbackRecord] = useState(null);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [unbindTarget, setUnbindTarget] = useState(null);
  const [message, setMessage] = useState('');
  const [runStartedAt, setRunStartedAt] = useState(0);
  const [runElapsedMs, setRunElapsedMs] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const [tuyaHomeId, setTuyaHomeId] = useState('');
  const safetyRef = useRef({ lidAlerted: false });
  const completionResetRef = useRef(new Set());
  const cookingRef = useRef(null);
  const mountedRef = useRef(true);
  cookingRef.current = getRecipeCookingParams(recipeContext);

  const selectedDevice = useMemo(() => {
    const device = devices.find(item => item.devId === selectedDevId) || devices[0];
    return device || null;
  }, [devices, selectedDevId]);
  const recipesById = useMemo(() => Object.fromEntries(recipes.map(recipe => [recipe.id, recipe])), [recipes]);
  const petsById = useMemo(() => Object.fromEntries(pets.map(pet => [pet.id, pet])), [pets]);
  const records = useMemo(
    () => operations.map(operation => makeRecord(operation, recipesById, petsById, pets[0], lang, t)).sort((a, b) => new Date(b.operation?.created_at || 0) - new Date(a.operation?.created_at || 0)),
    [operations, recipesById, petsById, pets, lang],
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

  const refreshData = async () => {
    if (!authToken) return;
    try {
      const [deviceResult, petResult, recipeResult, operationResult] = await Promise.all([
        api.listDevices(authToken),
        api.listPets(authToken),
        api.getRecipes({ all: 1 }),
        api.listCookingOperations(authToken),
      ]);
      const serverDevices = uniqueDevices((deviceResult.devices || []).map(device => ({ ...device, devId: device.tuya_device_id || device.devId })));
      setDevices(prev => {
        const localByDevId = Object.fromEntries(prev.map(device => [device.devId || device.tuya_device_id, device]));
        const runtime = readCookingRuntime();
        return serverDevices.map(device => {
          const local = localByDevId[device.devId];
          const serverDps = parseDps(device);
          const localDps = parseDps(local);
          const keepLocalRuntime = isActiveCookingDps(localDps);
          const runtimeDps = runtime?.devId === device.devId && isActiveCookingDps(runtime.dps) ? runtime.dps : {};
          return {
            ...device,
            dps: keepLocalRuntime ? { ...serverDps, ...localDps, ...runtimeDps } : { ...localDps, ...serverDps, ...runtimeDps },
          };
        });
      });
      setPets(petResult.pets || []);
      setRecipes(recipeResult.recipes || []);
      setOperations(operationResult.operations || []);
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
    await api.syncDeviceDp(device.devId, {
      tuya_device_id: device.devId,
      online: device.isOnline,
      dps: parseDps(device),
      reported_at: new Date().toISOString(),
    }, authToken);
    if (refreshAfter) await refreshData();
  };

  useEffect(() => { refreshData(); }, [authToken]);

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
        await Promise.all((nativeResult.devices || []).map(device =>
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

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    safetyRef.current = { lidAlerted: false };
  }, []);

  useEffect(() => {
    const devId = selectedDevice?.devId;
    if (!devId) return undefined;
    let listener;
    let alive = true;
    HeyboTuya.addListener('dpUpdate', event => {
      if (!alive || event.devId !== devId) return;
      let nextDps = event.dps || {};
      if (typeof nextDps === 'string') {
        try { nextDps = JSON.parse(nextDps || '{}'); } catch { nextDps = {}; }
      }
      const mergedDps = { ...parseDps(selectedDevice), ...nextDps };
      if (authToken) {
        api.syncDeviceDp(devId, {
          tuya_device_id: devId,
          online: selectedDevice?.isOnline,
          dps: mergedDps,
          reported_at: new Date().toISOString(),
        }, authToken).catch(() => {});
      }
      setDevices(prev => prev.map(device => {
        const itemDevId = device.devId || device.tuya_device_id;
        return itemDevId === devId ? { ...device, dps: { ...parseDps(device), ...nextDps } } : device;
      }));
      setLastStatusAt(new Date().toISOString());
      const active = isActiveCookingDps(mergedDps);
      if (shouldResetAfterCompletion(completionResetRef.current, devId, mergedDps)) {
        clearCookingRuntime(devId);
        const resetAfterCompletion = async () => {
          try {
            await HeyboTuya.resetCooking({ devId });
          } catch {
            await delay(600);
            await HeyboTuya.resetCooking({ devId });
          }
          const resetDps = { ...mergedDps, 107: 'reset' };
          if (mountedRef.current) {
            setDevices(prev => prev.map(device => {
              const itemDevId = device.devId || device.tuya_device_id;
              return itemDevId === devId ? { ...device, dps: { ...parseDps(device), 107: 'reset' } } : device;
            }));
          }
          if (authToken) {
            api.syncDeviceDp(devId, {
              tuya_device_id: devId,
              online: selectedDevice?.isOnline,
              dps: resetDps,
              reported_at: new Date().toISOString(),
            }, authToken).catch(() => {});
          }
        };
        resetAfterCompletion().catch(error => {
          console.error('[CookingCenter] completion reset failed', { devId: maskId(devId), message: error?.message || String(error) });
          if (mountedRef.current) setMessage(t('completionResetFailed'));
        });
      }
      if (!active) {
        safetyRef.current = { lidAlerted: false };
        clearCookingRuntime(devId);
        return;
      }
      saveCookingRuntime(devId, mergedDps);
      if (isLidOpenFault(mergedDps) && !safetyRef.current.lidAlerted) {
        safetyRef.current.lidAlerted = true;
        setMessage(t('lidCheckWarning'));
        return;
      }
    }).then(result => { listener = result; });
    HeyboTuya.subscribeDevice({ devId }).catch(() => {});
    return () => {
      alive = false;
      listener?.remove?.();
      HeyboTuya.unsubscribeDevice({ devId }).catch(() => {});
    };
  }, [selectedDevice?.devId, authToken]);

  const handleStartCooking = async () => {
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
    completionResetRef.current.delete(selectedDevice.devId);
    safetyRef.current = { lidAlerted: false };
    const temperature = cooking.temperature ?? 85;
    const cookMinutes = Number(cooking.cookMinutes ?? Math.ceil(Number(cooking.cookTime || 12 * 60) / 60));
    const cookTime = Number(cooking.cookTime || (cookMinutes * 60));
    const power = cooking.power ?? 8;
    const speed = String(cooking.speed ?? 1);
    const runtimeDps = { 1: true, 3: 'diy', 5: 'cooking', 7: cookTime, 9: temperature, 102: power, 107: 'start', 108: speed };
    await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
    await delay(600);
    await HeyboTuya.publishDps({
      devId: selectedDevice.devId,
      dps: {
        1: true,
        3: 'diy',
        7: cookTime,
        9: temperature,
        102: power,
        108: speed,
        107: 'start',
      },
    });
    saveCookingRuntime(selectedDevice.devId, runtimeDps, { startedAt: new Date().toISOString() });
    if (authToken) {
      api.syncDeviceDp(selectedDevice.devId, {
        tuya_device_id: selectedDevice.devId,
        online: selectedDevice.isOnline,
        dps: runtimeDps,
        reported_at: new Date().toISOString(),
      }, authToken).catch(() => {});
    }
    const startedAt = Date.now();
    setRunElapsedMs(0);
    setRunStartedAt(startedAt);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), ...runtimeDps } }
        : device;
    }));
    await api.recordCookingOperation({
      tuya_device_id: selectedDevice.devId,
      device_name: selectedDevice.name || t('defaultCookerName'),
      recipe_id: cooking.recipe.id || '',
      recipe_name: cooking.recipe.name || cooking.recipe.recipeName || t('currentRecipe'),
      pet_id: recipeContext?.profile?.id || '',
      pet_name: recipeContext?.profile?.name || '',
      total_weight_gram: recipeContext?.displayGrams || 0,
      operation_type: 'start_cooking',
      result: 'success',
      started_at: new Date().toISOString(),
      cooking_params_snapshot: cooking.params,
    }, authToken);
    setMessage(t('cookingStarted'));
    setStartConfirmOpen(false);
  };

  const handlePauseCooking = async () => {
    if (!selectedDevice?.devId) return;
    safetyRef.current = { lidAlerted: false };
    await HeyboTuya.pauseCooking({ devId: selectedDevice.devId });
    const pausedDps = { ...parseDps(selectedDevice), 5: 'pause', 107: 'pause' };
    saveCookingRuntime(selectedDevice.devId, pausedDps);
    if (authToken) {
      api.syncDeviceDp(selectedDevice.devId, {
        tuya_device_id: selectedDevice.devId,
        online: selectedDevice.isOnline,
        dps: pausedDps,
        reported_at: new Date().toISOString(),
      }, authToken).catch(() => {});
    }
    const pausedAt = Date.now();
    setRunElapsedMs(prev => prev + (runStartedAt ? pausedAt - runStartedAt : 0));
    setRunStartedAt(0);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), ...pausedDps } }
        : device;
    }));
    setMessage(t('pauseSent'));
  };

  const handleResumeCooking = async () => {
    if (!selectedDevice?.devId) return;
    if (isLidOpenFault(parseDps(selectedDevice))) {
      setMessage(t('lidResumeWarning'));
      return;
    }
    safetyRef.current = { lidAlerted: false };
    await HeyboTuya.publishDps({ devId: selectedDevice.devId, dps: { 107: 'start' } });
    const resumedDps = { ...parseDps(selectedDevice), 5: 'cooking', 107: 'start' };
    saveCookingRuntime(selectedDevice.devId, resumedDps);
    if (authToken) {
      api.syncDeviceDp(selectedDevice.devId, {
        tuya_device_id: selectedDevice.devId,
        online: selectedDevice.isOnline,
        dps: resumedDps,
        reported_at: new Date().toISOString(),
      }, authToken).catch(() => {});
    }
    setRunStartedAt(Date.now());
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), ...resumedDps } }
        : device;
    }));
    setMessage(t('cookingResumed'));
  };

  const handleStopCooking = async () => {
    if (!selectedDevice?.devId) return;
    safetyRef.current = { lidAlerted: false };
    await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
    clearCookingRuntime(selectedDevice.devId);
    if (authToken) {
      api.syncDeviceDp(selectedDevice.devId, {
        tuya_device_id: selectedDevice.devId,
        online: selectedDevice.isOnline,
        dps: { ...parseDps(selectedDevice), 5: 'standby', 107: 'reset', 102: undefined, 108: undefined },
        reported_at: new Date().toISOString(),
      }, authToken).catch(() => {});
    }
    setRunStartedAt(0);
    setRunElapsedMs(0);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), 5: 'standby', 107: 'reset', 102: undefined, 108: undefined } }
        : device;
    }));
    setMessage(t('cookingStopped'));
  };

  const handleFeedbackSave = async (feedback) => {
    if (!feedbackRecord) return;
    await api.createFeedingRecord({
      pet_id: feedbackRecord.petId,
      pet_name: feedbackRecord.petName,
      recipe_id: feedbackRecord.recipeId,
      recipe_name: feedbackRecord.recipeName,
      feeding_at: new Date().toISOString(),
      palatability: feedback.palatability,
      stool_status: feedback.stool,
      cooking_operation_id: feedbackRecord.id,
      // TODO: 后端提供食谱优化画像字段后，把反馈聚合回 recipe 画像。
    }, authToken);
    setFeedbackRecord(null);
    setMessage(t('feedingFeedbackSaved'));
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

  useEffect(() => {
    if (recipeContext && selectedDevice && !detailDevice) setDetailDevice(selectedDevice);
  }, [recipeContext, selectedDevice?.devId]);

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
                  <strong>{item.name}</strong>
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
        {records.length ? records.map(record => <RecordRow key={record.id} record={record} onFeedback={setFeedbackRecord} />) : <div className="cooking-center-card">{t('noUsageRecordsHelp')}</div>}
      </section>

      {message && <div className="cooking-toast">{message}</div>}
      <AddDeviceBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onBound={registerBoundDevice} homeId={tuyaHomeId} onHomeId={setTuyaHomeId} />

      {detailDevice && (
        <DeviceDetail
          device={(detailDevice.devId === selectedDevice?.devId || detailDevice.tuya_device_id === selectedDevice?.devId) ? selectedDevice : detailDevice}
          recipeContext={recipeContext}
          lastStatusAt={lastStatusAt}
          liveStatusError={liveStatusError}
          runStartedAt={runStartedAt}
          runElapsedMs={runElapsedMs}
          nowTick={nowTick}
          onBack={() => setDetailDevice(null)}
          onChooseRecipe={onChooseRecipe}
          onStart={() => {
            if (!recipeContext) {
              setMessage(t('selectRecipeFirst'));
              return;
            }
            setStartConfirmOpen(true);
          }}
          onPause={handlePauseCooking}
          onResume={handleResumeCooking}
          onStop={handleStopCooking}
        />
      )}
      {feedbackRecord && <FeedbackModal record={feedbackRecord} onCancel={() => setFeedbackRecord(null)} onConfirm={handleFeedbackSave} />}
      {startConfirmOpen && <SafetyStartModal lidOpen={isLidOpenFault(parseDps(selectedDevice))} onCancel={() => setStartConfirmOpen(false)} onConfirm={handleStartCooking} />}

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
