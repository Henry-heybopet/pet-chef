import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/index';
import { HeyboTuya } from '../native/heyboTuya';

const PAIRING_STEPS = ['正在连接设备', '正在发送 Wi-Fi 信息', '正在连接 Heybo 云端', '正在绑定到当前账号'];
const START_CHECKS = ['加入食材', '加入适量的水', '盖上鲜食杯盖', '周围没有幼童和宠物'];
const PET_CHEF_PID = 'ak2kofibhuvdtqip';
const BLE_SCAN_MS = 60000;

function isActiveCookingDps(dps) {
  return dps?.[107] === 'start' || dps?.[107] === 'pause' || dps?.[107] === 'reset' || dps?.[5] === 'cooking' || dps?.[5] === 'pause';
}

function uniqueDevices(devices) {
  return Array.from(new Map(devices.filter(device => {
    const devId = String(device.devId || device.tuya_device_id || '');
    const isMock = device.mock || device.isMock || device.demo || /^(demo_|web_|mock_)/.test(devId);
    return devId && !isMock;
  }).map(device => [device.devId, device])).values());
}
const PALATABILITY_OPTIONS = ['光盘行动', '吃了一半', '挑食行为', '完全不吃'];
const STOOL_OPTIONS = ['大便干燥', '大便正常', '软便', '拉肚子'];
const SPEED_RPM = { 0: 0, 1: 60, 2: 120, 3: 230, 4: 500, 5: 1200, 6: 2500, 7: 4000, 8: 5500, 9: 7500, 10: 9500 };
const FAULT_LABELS = {
  1: 'E01 盖子没有盖好',
  2: 'E02 鲜食杯没有安装好',
  3: 'E03 马达堵转',
  4: 'E04 鲜食杯温度超过145度',
  5: 'E05 马达温度超过80度',
  7: 'E07 换挡位失败',
  8: 'E04 马达NTC失败',
  11: 'E11 高速搅拌时温度超过90度',
  12: 'E12 电子秤超过5KG',
};

function parseDps(device) {
  if (!device?.dps) return {};
  if (typeof device.dps === 'string') {
    try { return JSON.parse(device.dps); } catch { return {}; }
  }
  return device.dps;
}

function formatSpeed(value) {
  if (value === undefined || value === null || value === '') return '--';
  const level = Number(value);
  return SPEED_RPM[level] === undefined ? `${value}档` : `${level}档（${SPEED_RPM[level]}转/分钟）`;
}

function formatPower(value) {
  if (value === undefined || value === null || value === '') return '--';
  const level = Number(value);
  return level >= 1 && level <= 10 ? `${level}档（${level * 100}W）` : `${value}档`;
}

function getFaultInfo(value) {
  if (value === undefined || value === null || value === '' || Number(value) === 0) return { code: '', label: '无' };
  const fault = Number(value);
  return { code: `DP12=${value}`, label: FAULT_LABELS[fault] || `未知故障 ${value}` };
}

function isLidOpenFault(dps) {
  return Number(dps?.[12] ?? dps?.fault_code ?? 0) === 1;
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

function formatClock(value) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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

function scanFailureMessage(summary) {
  if (!summary) return '没有发现可添加设备。';
  if (summary.cancelled) return '已取消扫描。';
  if (summary.rawCount === 0) return '未发现附近蓝牙设备，请靠近鲜食机，并确认手机蓝牙已开启。';
  if (summary.rawCount > 0 && !summary.hasTuya) return '附近有蓝牙设备，但未发现可配网的 Heybo Pet 鲜食机。请确认鲜食机已进入配网模式。';
  if (summary.rawCount > 0 && summary.hasPidMismatch) return '发现 Tuya 设备，但型号或 PID 不匹配，请检查设备型号或 PID 配置。';
  return '附近有蓝牙设备，但未发现可添加的 Heybo Pet 鲜食机。';
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

function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function getDeviceView(device) {
  const dps = parseDps(device);
  const dp5 = dps[5] ?? dps.status;
  const online = device?.isOnline ?? device?.onlineStatus ?? device?.online_status ?? device?.status;
  const isOffline = online === false || online === 'offline';
  const statusMap = { standby: '待机', cooking: '低温烹饪中', pause: '暂停', done: '烹饪完成' };
  const temperature = dps[10] ?? dps.temperature ?? dps.cook_temperature ?? dps[9] ?? '--';
  const speed = dps[108] ?? dps.cook_mode_speed;
  const power = dps[102] ?? dps.cook_mode_power;
  const faultValue = dps[12] ?? dps.fault;
  const fault = getFaultInfo(faultValue);
  return {
    devId: device?.devId || device?.tuya_device_id || '',
    id: device?.id || '',
    name: device?.device_name || device?.name || '厨房鲜食机',
    model: device?.model || 'Pet Chef S1',
    online: !isOffline,
    status: isOffline ? '离线' : (statusMap[dp5] || statusMap[device?.dp_status] || '待机'),
    temperature,
    speed: formatSpeed(speed),
    power: formatPower(power),
    remaining: formatRemainTime(dps[8] ?? dps.remain_time ?? dps.remainTime),
    wifi: device?.wifi_name || device?.wifiName || 'Wi-Fi 信号良好',
    lastRecipe: device?.last_recipe_name || device?.lastRecipeName || '',
    cupStatus: Number(faultValue) === 2 ? '未安装好' : '正常',
    lidStatus: Number(faultValue) === 1 ? '未盖好' : '正常',
    fault: fault.label,
    faultCode: fault.code,
  };
}

function getRecipeCookingParams(context) {
  const recipe = context?.recipe || context;
  const params = context?.cookParams || recipe?.cooking_profile || recipe?.cookingProfile || recipe?.cooking_base || recipe?.cookingBase || {};
  const temperature = params.temperature ?? params.cook_temperature ?? params.cooking_temperature ?? params.dp9;
  const cookTime = params.cook_time ?? params.cookTime ?? params.total_seconds ?? params.time_seconds ?? params.duration_seconds ?? params.dp7;
  const speed = params.speed ?? params.cook_mode_speed ?? params.dp108;
  const power = params.power ?? params.cook_mode_power ?? params.dp102;
  const steps = params.steps ?? params.stages ?? params.cooking_steps ?? params.dp11;
  return { recipe, params, temperature, cookTime, speed, power, steps };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('zh-CN');
}

function formatRecordTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = date.toDateString() === today.toDateString();
  const yesterdayDay = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `今天 ${time}`;
  if (yesterdayDay) return `昨天 ${time}`;
  return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${time}`;
}

function statusLabel(status) {
  if (status === 'completed' || status === 'success') return '已完成';
  if (status === 'interrupted') return '中断';
  if (status === 'failed') return '失败';
  if (status === 'created') return '进行中';
  return status || '已完成';
}

function makeRecord(operation, recipesById, petsById, fallbackPet) {
  const recipe = recipesById[operation.recipe_id] || recipesById[operation.recipeId];
  const pet = petsById[operation.pet_id] || petsById[operation.petId];
  const totalWeight = operation.total_weight_gram || operation.totalWeightGram || operation.total_grams || operation.display_grams || operation.target_total_grams || 0;
  return {
    id: operation.id,
    time: formatRecordTime(operation.started_at || operation.startedAt || operation.created_at),
    recipeId: recipe?.id || operation.recipe_id || operation.recipeId || '',
    recipeName: recipe?.name || operation.recipe_name || operation.recipeName || '未命名食谱',
    petId: pet?.id || operation.pet_id || operation.petId || '',
    petName: pet?.name || operation.pet_name || operation.petName || fallbackPet?.name || '未选择宠物',
    totalWeightGram: totalWeight,
    status: statusLabel(operation.status || operation.result),
    eta: operation.estimated_time || operation.eta || '约 12 分钟',
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

function AddDeviceBottomSheet({ open, onClose, onBound, homeId, onHomeId }) {
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
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
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
          setPermissionNotice('需要蓝牙和定位权限才能搜索鲜食机');
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
      await onBound({ ...result.device, homeId: result.device.homeId || activeHomeId });
      setTimeout(onClose, 900);
    } catch (error) {
      clearInterval(timer);
      addScanLog(`pairing error：${error?.message || String(error)}`);
      setFailed(true);
    }
  };

  return (
    <div className="cooking-sheet-mask" onClick={closeSheet}>
      <div className="cooking-sheet" onClick={event => event.stopPropagation()}>
        <button className="cooking-sheet-close" onClick={closeSheet}>×</button>

        {!device && (
          <div className="cooking-sheet-flow">
            <h2>添加鲜食机</h2>
            <p>请先让鲜食机进入配网模式：</p>
            <ol>
              <li>打开鲜食机电源</li>
              <li>长按 Wi-Fi 键 3 秒</li>
              <li>指示灯闪烁后点击下一步</li>
            </ol>
            {scanning && <div className="cooking-radar"><span /></div>}
            {scanning && (
              <div>
                <p>正在寻找附近可添加的 Heybo Pet 设备… 剩余 {remainingSeconds} 秒</p>
                <GhostButton onClick={() => stopScan(true)}>取消扫描</GhostButton>
              </div>
            )}
            {foundDevices.map(item => (
              <div key={item.uuid} className="cooking-scan-result">
                <div><strong>Pet Chef S1</strong><span>信号良好｜可绑定</span></div>
                <PrimaryButton onClick={() => setDevice(item)}>选择</PrimaryButton>
              </div>
            ))}
            {empty && (
              <div>
                <div className="cooking-warning">{permissionNotice || scanFailureMessage(scanSummary)}</div>
                {permissionNotice && (
                  <div className="cooking-sheet-actions">
                    <GhostButton onClick={openPermissionSettings}>去系统设置</GhostButton>
                    <GhostButton disabled={scanning} onClick={scan}>重新申请权限</GhostButton>
                  </div>
                )}
                {!permissionNotice && scanSummary?.rawCount === 0 && (
                  <ol>
                    <li>打开鲜食机电源</li>
                    <li>同时长按转速键和温度键 5 秒</li>
                    <li>确认指示灯闪烁</li>
                    <li>不要在手机系统蓝牙设置中直接连接设备</li>
                    <li>如果设备曾绑定过其它 App 或账号，请先解绑或恢复出厂配网状态</li>
                    <li>手机靠近鲜食机后重试</li>
                  </ol>
                )}
                {!permissionNotice && (
                  <div className="cooking-sheet-actions">
                    <GhostButton disabled={scanning} onClick={scan}>重新扫描</GhostButton>
                    <GhostButton disabled={scanning} onClick={scan}>我已确认设备在配网模式</GhostButton>
                  </div>
                )}
              </div>
            )}
            {!scanning && !foundDevices.length && !empty && <PrimaryButton onClick={scan}>开始扫描</PrimaryButton>}
            {scanSummary && (
              <div className="cooking-center-card is-compact" style={{ textAlign: 'left', fontSize: 12 }}>
                <strong>扫描统计</strong>
                <span>rawCount={scanSummary.rawCount}｜filteredCount={scanSummary.filteredCount}</span>
                <span>Tuya设备={scanSummary.hasTuya ? 'yes' : 'no'}｜PID不匹配={scanSummary.hasPidMismatch ? 'yes' : 'no'}</span>
              </div>
            )}
            {scanLogs.length > 0 && (
              <div className="cooking-center-card is-compact" style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.6 }}>
                <strong>添加设备调试日志</strong>
                {scanLogs.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
              </div>
            )}
          </div>
        )}

        {device && !wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>选择 2.4G Wi-Fi</h2>
            <p>当前手机连接的 Wi-Fi 会作为鲜食机配网 Wi-Fi。</p>
            <input
              className="cooking-wifi-input"
              value={wifiName}
              onChange={event => setWifiName(event.target.value)}
              placeholder={detectedWifiName || '未获取到当前 Wi-Fi 名称，请确认定位权限后重试'}
            />
            {detectedWifiName && (
              <div className="cooking-wifi-current">
                <strong>{detectedWifiName}</strong>
                <span>当前手机 Wi-Fi</span>
              </div>
            )}
            <PrimaryButton disabled={!wifiName.trim()} onClick={() => setWifi({ name: wifiName.trim(), type: 'manual', desc: '手动输入' })}>下一步</PrimaryButton>
          </div>
        )}

        {device && wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>输入 Wi-Fi 密码</h2>
            <p>{wifiName.trim() || wifi.name}</p>
            {wifi.type === 'dual' && <div className="cooking-warning">双频同名 Wi-Fi 可绑定，但建议优先使用明确的 2.4G 网络。</div>}
            <div className="cooking-password-row">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="请输入 Wi-Fi 密码" />
              <button onClick={() => setShowPassword(!showPassword)}>{showPassword ? '隐藏' : '显示'}</button>
            </div>
            <PrimaryButton disabled={!password} onClick={bind}>一键绑定</PrimaryButton>
          </div>
        )}

        {progress >= 0 && (
          <div className="cooking-sheet-flow">
            <h2>{failed ? '绑定失败' : success ? '绑定成功' : '正在绑定鲜食机'}</h2>
            {PAIRING_STEPS.map((label, index) => (
              <div key={label} className={`cooking-progress-step ${index <= progress ? 'is-active' : ''} ${success ? 'is-done' : ''}`}>
                <span>{success && index === PAIRING_STEPS.length - 1 ? '✓' : index + 1}</span>
                <strong>{label}</strong>
              </div>
            ))}
            {success && <p className="cooking-success">Pet Chef S1 已绑定到当前用户账号</p>}
            {failed && (
              <div className="cooking-failure">
                <strong>可能是以下原因：</strong>
                <p>1. Wi-Fi 密码错误<br />2. 当前网络不是 2.4G Wi-Fi<br />3. 手机没有连接到 Heybo_PetChef 热点<br />4. 设备距离路由器太远<br />5. 设备已退出配网模式</p>
              </div>
            )}
          </div>
        )}

        {failed && (
          <div className="cooking-sheet-actions">
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setPassword(''); }}>重新输入密码</GhostButton>
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setDevice(null); }}>返回自动扫描</GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordRow({ record, onFeedback }) {
  return (
    <div className="cooking-record-row">
      <div>
        <strong>{formatDate(record.operation?.started_at || record.operation?.created_at)}，“{record.operation?.device_name || '厨房鲜食机'}”为“{record.petName}”，制作“{record.recipeName}”</strong>
      </div>
      <GhostButton onClick={() => onFeedback(record)}>喂食反馈</GhostButton>
    </div>
  );
}

function FeedbackModal({ record, onCancel, onConfirm }) {
  const [palatability, setPalatability] = useState('');
  const [stool, setStool] = useState('');

  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card cooking-feedback-card">
        <h2>喂食反馈</h2>
        <p>{record.recipeName}｜{record.petName}</p>
        <strong>适口性</strong>
        <div className="cooking-option-grid">
          {PALATABILITY_OPTIONS.map(item => <button key={item} className={palatability === item ? 'is-active' : ''} onClick={() => setPalatability(item)}>{item}</button>)}
        </div>
        <strong>粪便状态</strong>
        <div className="cooking-option-grid">
          {STOOL_OPTIONS.map(item => <button key={item} className={stool === item ? 'is-active' : ''} onClick={() => setStool(item)}>{item}</button>)}
        </div>
        <div className="cooking-feedback-actions">
          <GhostButton onClick={onCancel}>取消</GhostButton>
          <PrimaryButton disabled={!palatability || !stool} onClick={() => onConfirm({ palatability, stool })}>确认</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SafetyStartModal({ lidOpen, onCancel, onConfirm }) {
  const [checked, setChecked] = useState({});
  const allChecked = START_CHECKS.every(item => checked[item]);

  return (
    <div className="cooking-sheet-mask">
      <div className="cooking-confirm-card">
        <h2>启动前确认</h2>
        <div className="cooking-check-list">
          {START_CHECKS.map(item => (
            <label key={item} className="cooking-check-item">
              <input
                type="checkbox"
                disabled={lidOpen && item === '盖上鲜食杯盖'}
                checked={Boolean(checked[item])}
                onChange={event => setChecked({ ...checked, [item]: event.target.checked })}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        {lidOpen && <div className="cooking-warning">鲜食杯盖未盖好，请盖好杯盖后再启动。</div>}
        <div className="cooking-start-actions">
          <GhostButton onClick={onCancel}>取消</GhostButton>
          <PrimaryButton disabled={!allChecked || lidOpen} onClick={onConfirm}>启动一键烹饪</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function DeviceDetail({ device, recipeContext, lastStatusAt, liveStatusError, runStartedAt, runElapsedMs, nowTick, onBack, onChooseRecipe, onStart, onPause, onResume, onStop }) {
  const view = getDeviceView(device);
  const cooking = getRecipeCookingParams(recipeContext);
  const hasRecipe = Boolean(cooking.recipe);
  const isPaused = view.status === '暂停';
  const isCooking = view.status === '低温烹饪中';
  const isActive = isCooking || isPaused;
  const elapsedMs = runElapsedMs + (isCooking && runStartedAt ? nowTick - runStartedAt : 0);
  const preheatMs = Number(cooking.params?.preheat_seconds || 0) * 1000;
  const totalMs = Number(cooking.cookTime || 0) * 1000;
  const activeStep = !isActive ? 0 : totalMs && elapsedMs >= totalMs ? 3 : preheatMs && elapsedMs >= preheatMs ? 2 : 1;
  const stepLabels = ['放入食材', '预加热', '低温烹饪', '烹饪完成'];
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
  const mainLabel = isPaused ? '恢复烹饪/长按停止烹饪' : isCooking ? '暂停烹饪' : '一键启动烹饪';
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
          <span>{liveStatusError ? `运行时间：${liveStatusError}` : `运行时间：${isActive || runElapsedMs ? formatDuration(elapsedMs) : '--'}`}</span>
        </div>
        <div className="cooking-lux-panel">
          <img src="/machine.jpg" alt="Pet Chef 鲜食机" onError={event => { event.currentTarget.src = '/machine.png'; }} />
          <div className="cooking-lux-metrics">
            <div><span>🌡️ 当前温度</span><strong>{view.temperature}℃</strong></div>
            <div><span>🔄 当前转速</span><strong>{view.speed}</strong></div>
            <div><span>⚡ 当前功率</span><strong>{view.power}</strong></div>
            <div><span>💧 当前状态</span><strong>{view.status}</strong></div>
          </div>
        </div>
        <div className={`cooking-lux-progress ${isActive ? 'is-running' : ''}`}>
          {stepLabels.map((label, index) => (
            <div key={label}>
              <span className={index <= activeStep ? 'is-active' : ''} />
              <strong>{index === 0 ? '🥣' : index === 1 ? '🔥' : index === 2 ? '♨️' : '✅'}</strong>
              <em>{label}</em>
            </div>
          ))}
        </div>
        <div className="cooking-lux-steps">
          <h3>📋 烹饪步骤</h3>
          <p>1. 烹饪温度：{hasRecipe ? `${cooking.temperature ?? '--'}℃` : '--'}</p>
          <p>2. 烹饪时间：{hasRecipe ? `${cooking.cookTime ?? '--'}秒` : '--'}</p>
          <p>3. 烹饪转速：{hasRecipe ? formatSpeed(cooking.speed) : '--'}</p>
          <p>4. 烹饪功率：{hasRecipe ? formatPower(cooking.power) : '--'}</p>
          {!hasRecipe && <small>请先选择食谱后再启动烹饪。</small>}
        </div>
        {view.faultCode && (!isLidOpenFault(parseDps(device)) || isActive) && (
          <div className="cooking-warning">{view.faultCode}｜{view.fault}</div>
        )}
        <div className="cooking-detail-actions">
          <GhostButton onClick={onBack}>返回</GhostButton>
          <GhostButton onClick={onChooseRecipe}>选择食谱</GhostButton>
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
  const stirTimerRef = useRef(null);

  const selectedDevice = useMemo(() => {
    const device = devices.find(item => item.devId === selectedDevId) || devices[0];
    return device || null;
  }, [devices, selectedDevId]);
  const recipesById = useMemo(() => Object.fromEntries(recipes.map(recipe => [recipe.id, recipe])), [recipes]);
  const petsById = useMemo(() => Object.fromEntries(pets.map(pet => [pet.id, pet])), [pets]);
  const records = useMemo(
    () => operations.map(operation => makeRecord(operation, recipesById, petsById, pets[0])).sort((a, b) => new Date(b.operation?.created_at || 0) - new Date(a.operation?.created_at || 0)),
    [operations, recipesById, petsById, pets],
  );
  const selectedDeviceRecords = useMemo(() => {
    const view = getDeviceView(selectedDevice);
    if (!view.devId && !view.id) return records;
    return records.filter(record => {
      const op = record.operation || {};
      return op.tuya_device_id === view.devId || op.device_id === view.id || op.device_name === view.name;
    });
  }, [records, selectedDevice]);
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
        return serverDevices.map(device => {
          const local = localByDevId[device.devId];
          const serverDps = parseDps(device);
          const localDps = parseDps(local);
          const keepLocalRuntime = isActiveCookingDps(localDps);
          return {
            ...device,
            dps: keepLocalRuntime ? { ...serverDps, ...localDps } : { ...localDps, ...serverDps },
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
      setLiveStatusError(error?.message || '设备缓存刷新失败');
    }
  };

  const registerBoundDevice = async (device) => {
    if (!authToken || !device?.devId) return refreshData();
    const homeId = device.homeId || tuyaHomeId;
    await api.registerDevice({
      tuya_device_id: device.devId,
      tuya_home_id: String(homeId || ''),
      tuya_pid: device.productId,
      product_type: device.productId === 'ak2kofibhuvdtqip' || device.isPetChef ? 'pet_chef' : 'other',
      device_name: device.name || '厨房鲜食机',
      status: device.isOnline === false ? 'offline' : 'online',
    }, authToken);
    await api.syncDeviceDp(device.devId, {
      tuya_device_id: device.devId,
      online: device.isOnline,
      dps: parseDps(device),
      reported_at: new Date().toISOString(),
    }, authToken);
    await refreshData();
  };

  useEffect(() => { refreshData(); }, [authToken]);

  useEffect(() => {
    if (!authToken) return undefined;
    let alive = true;
    HeyboTuya.ensureNativeSession()
      .then(session => {
        if (alive && session?.homeId) setTuyaHomeId(session.homeId);
      })
      .catch(error => setLiveStatusError(error?.message || 'Tuya 会话初始化失败'));
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
    if (stirTimerRef.current) clearTimeout(stirTimerRef.current);
    stirTimerRef.current = null;
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
      setDevices(prev => prev.map(device => {
        const itemDevId = device.devId || device.tuya_device_id;
        return itemDevId === devId ? { ...device, dps: { ...parseDps(device), ...nextDps } } : device;
      }));
      setLastStatusAt(new Date().toISOString());
    }).then(result => { listener = result; });
    HeyboTuya.subscribeDevice({ devId }).catch(() => {});
    return () => {
      alive = false;
      listener?.remove?.();
      HeyboTuya.unsubscribeDevice({ devId }).catch(() => {});
    };
  }, [selectedDevice?.devId]);

  const handleStartCooking = async () => {
    const cooking = getRecipeCookingParams(recipeContext);
    if (!selectedDevice || !cooking.recipe) {
      setMessage('请先选择食谱。');
      return;
    }
    const currentDps = parseDps(selectedDevice);
    if (isLidOpenFault(currentDps)) {
      setMessage('鲜食杯盖未盖好，请盖好杯盖后再启动。');
      return;
    }
    if (stirTimerRef.current) clearTimeout(stirTimerRef.current);
    const temperature = cooking.temperature ?? 85;
    const cookTime = cooking.cookTime ?? 12 * 60;
    const power = cooking.power ?? 8;
    const speed = String(cooking.speed ?? 1);
    const preheatSeconds = Number(cooking.params?.preheat_seconds || 0);
    await HeyboTuya.publishDps({
      devId: selectedDevice.devId,
      dps: {
        1: true,
        3: 'diy',
        7: cookTime,
        9: temperature,
        102: power,
        107: 'start',
      },
    });
    const scheduleStir = () => {
      stirTimerRef.current = null;
      HeyboTuya.publishDps({ devId: selectedDevice.devId, dps: { 108: speed } }).catch(error => {
        setMessage(`预热完成后下发转速失败：${error?.message || String(error)}`);
      });
      setDevices(prev => prev.map(device => {
        const devId = device.devId || device.tuya_device_id;
        return devId === selectedDevice.devId
          ? { ...device, dps: { ...parseDps(device), 108: speed } }
          : device;
      }));
    };
    stirTimerRef.current = setTimeout(scheduleStir, Math.max(0, preheatSeconds) * 1000);
    const startedAt = Date.now();
    setRunElapsedMs(0);
    setRunStartedAt(startedAt);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), 5: 'cooking', 9: temperature, 102: power, 107: 'start', 108: '0' } }
        : device;
    }));
    await api.recordCookingOperation({
      tuya_device_id: selectedDevice.devId,
      device_name: selectedDevice.name || '厨房鲜食机',
      recipe_id: cooking.recipe.id || '',
      recipe_name: cooking.recipe.name || cooking.recipe.recipeName || '当前食谱',
      pet_id: recipeContext?.profile?.id || '',
      pet_name: recipeContext?.profile?.name || '',
      total_weight_gram: recipeContext?.displayGrams || 0,
      operation_type: 'start_cooking',
      result: 'success',
      started_at: new Date().toISOString(),
      cooking_params_snapshot: cooking.params,
    }, authToken);
    setMessage(preheatSeconds > 0 ? `已启动预加热，${preheatSeconds}秒后开始搅拌。` : '已下发制作指令，鲜食机正在启动。');
    setStartConfirmOpen(false);
  };

  const handlePauseCooking = async () => {
    if (!selectedDevice?.devId) return;
    if (stirTimerRef.current) clearTimeout(stirTimerRef.current);
    stirTimerRef.current = null;
    await HeyboTuya.pauseCooking({ devId: selectedDevice.devId });
    const pausedAt = Date.now();
    setRunElapsedMs(prev => prev + (runStartedAt ? pausedAt - runStartedAt : 0));
    setRunStartedAt(0);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), 5: 'pause', 107: 'pause' } }
        : device;
    }));
    setMessage('已下发暂停指令。');
  };

  const handleResumeCooking = async () => {
    if (!selectedDevice?.devId) return;
    await HeyboTuya.publishDps({ devId: selectedDevice.devId, dps: { 107: 'start' } });
    setRunStartedAt(Date.now());
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), 5: 'cooking', 107: 'start' } }
        : device;
    }));
    setMessage('已恢复烹饪。');
  };

  const handleStopCooking = async () => {
    if (!selectedDevice?.devId) return;
    if (stirTimerRef.current) clearTimeout(stirTimerRef.current);
    stirTimerRef.current = null;
    await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
    setRunStartedAt(0);
    setRunElapsedMs(0);
    setDevices(prev => prev.map(device => {
      const devId = device.devId || device.tuya_device_id;
      return devId === selectedDevice.devId
        ? { ...device, dps: { ...parseDps(device), 5: 'standby', 107: 'reset', 102: undefined, 108: undefined } }
        : device;
    }));
    setMessage('已停止烹饪。');
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
    setMessage('喂食反馈已保存。');
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    const devId = unbindTarget.devId || unbindTarget.tuya_device_id;
    const isMock = unbindTarget.mock || unbindTarget.isMock || unbindTarget.demo || /^(demo_|web_|mock_)/.test(String(devId || ''));
    if (isMock) {
      setMessage('这是测试设备，正式消费者 App 不执行 Tuya 解绑。');
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
  const view = getDeviceView(selectedDevice);

  return (
    <div className="cooking-center-page">
      <button className="cooking-center-back" onClick={onBack}>‹</button>
      <section className="cooking-center-hero">
        <img src="/machine.jpg" alt="Pet Chef 鲜食机" />
        <button className="cooking-add-button" onClick={() => setSheetOpen(true)}>+</button>
        <div className="cooking-hero-copy">
          <h1>Heybo Pet 智能烹饪中心</h1>
          {hasDevice ? <p>{view.name}｜{view.online ? '在线' : '离线'}<br />{latestRecord ? `上次使用：${latestRecord.time}｜${latestRecord.recipeName}` : '暂无使用记录'}</p> : <p>连接你的 Pet Chef 鲜食机<br />绑定后即可一键烹饪、查看记录和设备状态</p>}
          {!hasDevice && <PrimaryButton onClick={() => setSheetOpen(true)}>添加鲜食机</PrimaryButton>}
        </div>
      </section>

      <section className="cooking-center-section">
        <h2>我的鲜食机</h2>
        <div className="cooking-device-list">
          {hasDevice ? devices.map(device => {
            const item = getDeviceView(device);
            return (
              <div key={item.devId} className={`cooking-device-card ${item.devId === view.devId ? 'is-active' : ''}`} onClick={() => { setSelectedDevId(item.devId); setDetailDevice(device); }}>
                <div className="cooking-device-card-title">
                  <strong>{item.name}</strong>
                  <GhostButton danger onClick={event => { event.stopPropagation(); setUnbindTarget(device); }}>解绑</GhostButton>
                </div>
                <span>{item.status}</span>
              </div>
            );
          }) : <div className="cooking-center-card">尚未绑定鲜食机，点击添加后开始扫描。</div>}
        </div>
      </section>

      <section className="cooking-center-section cooking-records-section">
        <h2>使用记录</h2>
        {records.length ? records.map(record => <RecordRow key={record.id} record={record} onFeedback={setFeedbackRecord} />) : <div className="cooking-center-card">暂无使用记录。完成一次制作后会显示在这里。</div>}
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
              setMessage('请先选择食谱。');
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
            <h2>确认解绑这台鲜食机？</h2>
            <p>解绑后，该设备将不再显示在你的账号下。</p>
            <div>
              <GhostButton onClick={() => setUnbindTarget(null)}>取消</GhostButton>
              <GhostButton danger onClick={handleUnbind}>确认解绑</GhostButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
