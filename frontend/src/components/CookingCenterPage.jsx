import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index';
import { HeyboTuya, prepareTuyaForHeyboUser } from '../native/heyboTuya';

const WIFI_LIST = [
  { name: 'Heybo-Home-2.4G', type: '2.4G', desc: '信号良好' },
  { name: 'Heybo-Home-5G', type: '5G', desc: '纯 5G 网络不可选，鲜食机仅支持 2.4G' },
  { name: 'HomeSmart', type: 'dual', desc: '双频同名 Wi-Fi 可选，但如果路由器强制 5G 可能失败' },
];

const PAIRING_STEPS = ['正在连接设备', '正在发送 Wi-Fi 信息', '正在连接 Heybo 云端', '正在绑定到当前账号'];
const SAFETY_CHECKS = ['杯体已正确安装', '盖子已盖好', '食材已加入', '已加入建议水量', '设备周围安全', '宠物不在设备附近'];
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

function getDeviceView(device) {
  const dps = parseDps(device);
  const running = dps[107] === 'start' || dps[5] === 'cooking';
  const paused = dps[107] === 'pause' || dps[5] === 'pause';
  const online = device?.isOnline ?? device?.onlineStatus ?? device?.online_status ?? device?.status;
  const isOffline = online === false || online === 'offline';
  const temperature = dps[10] ?? dps[9] ?? '--';
  const speed = dps[108];
  const power = dps[102];
  const faultValue = dps[12] ?? dps.fault;
  const fault = getFaultInfo(faultValue);
  return {
    devId: device?.devId || device?.tuya_device_id || '',
    id: device?.id || '',
    name: device?.device_name || device?.name || '厨房鲜食机',
    model: device?.model || 'Pet Chef S1',
    online: !isOffline,
    status: isOffline ? '离线' : running ? '低温烹饪中' : paused ? '暂停' : '空闲',
    temperature,
    speed: formatSpeed(speed),
    power: formatPower(power),
    remaining: formatRemainTime(dps[8] ?? dps.remainTime),
    wifi: device?.wifi_name || device?.wifiName || 'Wi-Fi 信号良好',
    lastRecipe: device?.last_recipe_name || device?.lastRecipeName || '',
    cupStatus: Number(faultValue) === 2 ? '未安装好' : '正常',
    lidStatus: Number(faultValue) === 1 ? '未盖好' : '正常',
    fault: fault.label,
    faultCode: fault.code,
  };
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

function DeviceStatusBar({ device, onReconnect }) {
  const view = getDeviceView(device);
  return (
    <div className={`cooking-status-bar ${view.online ? '' : 'is-offline'}`}>
      <div>
        <strong>当前设备：{view.name}｜{view.status}</strong>
        <span>{view.online ? `温度：${view.temperature} ℃｜速度：${view.speed}｜功率：${view.power}` : '请检查电源和 Wi-Fi'}</span>
        {view.remaining && <span>剩余时间：{view.remaining}</span>}
      </div>
      {!view.online && <GhostButton onClick={onReconnect}>重新连接</GhostButton>}
    </div>
  );
}

function SafetyConfirm({ record, onBack, onConfirm }) {
  const [checked, setChecked] = useState({});
  const allChecked = SAFETY_CHECKS.every(item => checked[item]);

  return (
    <div className="cooking-center-page is-subpage">
      <button className="cooking-center-back" onClick={onBack}>‹</button>
      <h1>开始制作前，请确认</h1>
      <div className="cooking-center-card">
        <strong>{record.recipeName}</strong>
        <p>请按食材总重量的 15% 加水。例如食材 200g，请加入约 30g 水。</p>
      </div>
      <div className="cooking-check-list">
        {SAFETY_CHECKS.map(item => (
          <label key={item} className="cooking-check-item">
            <input type="checkbox" checked={Boolean(checked[item])} onChange={event => setChecked({ ...checked, [item]: event.target.checked })} />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <PrimaryButton disabled={!allChecked} onClick={onConfirm}>我已确认，开始制作</PrimaryButton>
    </div>
  );
}

function AddDeviceBottomSheet({ open, onClose, onBound }) {
  const [mode, setMode] = useState('auto');
  const [device, setDevice] = useState(null);
  const [wifi, setWifi] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState([]);
  const [empty, setEmpty] = useState(false);
  const [hotspotReady, setHotspotReady] = useState(false);

  async function scan() {
    const found = [];
    setFoundDevices([]);
    setEmpty(false);
    setScanning(true);
    const listener = await HeyboTuya.addListener('bleDeviceFound', item => {
      if (!found.some(device => device.uuid === item.uuid)) found.push(item);
      setFoundDevices(prev => prev.some(device => device.uuid === item.uuid) ? prev : [...prev, item]);
    });
    await HeyboTuya.startBleScan();
    setTimeout(async () => {
      await HeyboTuya.stopBleScan();
      await listener.remove();
      setScanning(false);
      setEmpty(found.length === 0);
    }, 2200);
  }

  useEffect(() => {
    if (open && mode === 'auto' && !device && progress < 0) scan();
  }, [open]);

  if (!open) return null;

  const bind = async () => {
    setProgress(0);
    setFailed(false);
    const timer = setInterval(() => setProgress(prev => Math.min(prev + 1, 3)), 650);
    try {
      const result = device.uuid === 'manual_ap'
        ? await HeyboTuya.startWifiPairing({ ssid: wifi.name, password, mode: 'AP' })
        : await HeyboTuya.connectBleDevice({ uuid: device.uuid, address: device.address, productId: device.productId, ssid: wifi.name, password });
      clearInterval(timer);
      setProgress(3);
      if (!result?.device) throw new Error('Pairing returned empty device');
      setSuccess(true);
      await onBound(result.device);
      setTimeout(onClose, 900);
    } catch {
      clearInterval(timer);
      setFailed(true);
    }
  };

  return (
    <div className="cooking-sheet-mask" onClick={onClose}>
      <div className="cooking-sheet" onClick={event => event.stopPropagation()}>
        <button className="cooking-sheet-close" onClick={onClose}>×</button>
        {!device && progress < 0 && (
          <div className="cooking-sheet-tabs">
            <button className={mode === 'auto' ? 'is-active' : ''} onClick={() => { setMode('auto'); scan(); }}>自动扫描</button>
            <button className={mode === 'manual' ? 'is-active' : ''} onClick={() => setMode('manual')}>手动配网</button>
          </div>
        )}

        {!device && mode === 'auto' && (
          <div className="cooking-sheet-flow">
            <h2>添加鲜食机</h2>
            <p>请先让鲜食机进入配网模式：</p>
            <ol>
              <li>打开鲜食机电源</li>
              <li>长按 Wi-Fi 键 3 秒</li>
              <li>指示灯闪烁后点击下一步</li>
            </ol>
            {scanning && <div className="cooking-radar"><span /></div>}
            {scanning && <p>正在寻找附近可添加的 Heybo Pet 设备…</p>}
            {foundDevices.map(item => (
              <div key={item.uuid} className="cooking-scan-result">
                <div><strong>Pet Chef S1</strong><span>信号良好｜可绑定</span></div>
                <PrimaryButton onClick={() => setDevice(item)}>选择</PrimaryButton>
              </div>
            ))}
            {empty && (
              <div className="cooking-sheet-actions">
                <GhostButton onClick={scan}>重新扫描</GhostButton>
                <GhostButton onClick={scan}>我已确认设备在配网模式</GhostButton>
                <GhostButton onClick={() => setMode('manual')}>手动配网</GhostButton>
              </div>
            )}
            {!scanning && !foundDevices.length && !empty && <PrimaryButton onClick={scan}>开始扫描</PrimaryButton>}
          </div>
        )}

        {!device && mode === 'manual' && (
          <div className="cooking-sheet-flow">
            <h2>手动 AP 配网</h2>
            <p>请让鲜食机 Wi-Fi 指示灯慢闪，并在系统 Wi-Fi 中连接 Heybo_PetChef 热点。</p>
            <div className="cooking-center-card is-compact">
              <strong>{hotspotReady ? '已检测到 Heybo_PetChef 热点' : '等待连接 Heybo_PetChef 热点'}</strong>
              <span>连接后继续选择家庭 2.4G Wi-Fi。</span>
            </div>
            <PrimaryButton onClick={() => setHotspotReady(true)}>我已连接热点</PrimaryButton>
            {hotspotReady && <PrimaryButton onClick={() => setDevice({ uuid: 'manual_ap', productId: 'ak2kofibhuvdtqip', name: 'Pet Chef S1' })}>下一步</PrimaryButton>}
          </div>
        )}

        {device && !wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>选择 2.4G Wi-Fi</h2>
            <p>请选择鲜食机要连接的家庭 Wi-Fi。</p>
            {WIFI_LIST.map(item => (
              <button key={item.name} className={`cooking-wifi-item ${wifi?.name === item.name ? 'is-active' : ''}`} disabled={item.type === '5G'} onClick={() => setWifi(item)}>
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        )}

        {device && wifi && progress < 0 && (
          <div className="cooking-sheet-flow">
            <h2>输入 Wi-Fi 密码</h2>
            <p>{wifi.name}</p>
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
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setDevice(null); setMode('manual'); }}>重新连接设备热点</GhostButton>
            <GhostButton onClick={() => { setProgress(-1); setFailed(false); setDevice(null); setMode('auto'); }}>返回自动扫描</GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordRow({ record, onRedo }) {
  return (
    <div className="cooking-record-row">
      <div>
        <strong>{record.time}｜{record.recipeName}</strong>
        <span>为「{record.petName}」制作｜总量 {record.totalWeightGram}g｜{record.status}</span>
      </div>
      <GhostButton onClick={() => onRedo(record)}>{record.status === '中断' ? '查看原因' : '再做一份'}</GhostButton>
    </div>
  );
}

function DeviceDetail({ device, records, lastStatusAt, liveStatusError, onBack, onRedo, onUnbind }) {
  const [tab, setTab] = useState('records');
  const view = getDeviceView(device);

  return (
    <div className="cooking-center-page is-subpage">
      <button className="cooking-center-back" onClick={onBack}>‹</button>
      <h1>{view.model}｜{view.online ? '在线' : '离线'}</h1>
      <div className="cooking-detail-tabs">
        {[
          ['records', '记录'],
          ['status', '状态'],
          ['settings', '设置'],
        ].map(([key, label]) => <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      {tab === 'records' && (
        <div className="cooking-card-list">
          {records.length ? records.map(record => <RecordRow key={record.id} record={record} onRedo={onRedo} />) : <div className="cooking-center-card">暂无使用记录。</div>}
        </div>
      )}
      {tab === 'status' && (
        <div className="cooking-card-list">
          {['设备在线', view.wifi, `实时刷新：${liveStatusError || formatClock(lastStatusAt)}`, `当前温度：${view.temperature}℃`, `速度：${view.speed}`, `功率：${view.power}`, `当前阶段：${view.status}`, `剩余时间：${view.remaining || '--'}`, `杯体状态：${view.cupStatus}`, `盖子状态：${view.lidStatus}`, `故障码 / 异常提醒：${view.faultCode ? `${view.faultCode}｜${view.fault}` : view.fault}`].map(item => <div key={item} className="cooking-center-card is-compact">{item}</div>)}
        </div>
      )}
      {tab === 'settings' && (
        <div className="cooking-card-list">
          {['设备名称：厨房鲜食机', '重新连接 Wi-Fi', '固件版本：1.0.0', '检查更新'].map(item => <div key={item} className="cooking-center-card is-compact">{item}</div>)}
          <GhostButton danger onClick={onUnbind}>解绑设备</GhostButton>
          <GhostButton danger>恢复出厂设置</GhostButton>
        </div>
      )}
    </div>
  );
}

export default function CookingCenterPage({ onBack, authToken, authUser }) {
  const [devices, setDevices] = useState([]);
  const [pets, setPets] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [operations, setOperations] = useState([]);
  const [lastStatusAt, setLastStatusAt] = useState('');
  const [liveStatusError, setLiveStatusError] = useState('');
  const [selectedDevId, setSelectedDevId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState(null);
  const [confirmRecord, setConfirmRecord] = useState(null);
  const [unbindTarget, setUnbindTarget] = useState(null);
  const [message, setMessage] = useState('');

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
      const nextDevices = (deviceResult.devices || []).map(device => ({ ...device, devId: device.tuya_device_id || device.devId }));
      setDevices(nextDevices);
      setPets(petResult.pets || []);
      setRecipes(recipeResult.recipes || []);
      setOperations(operationResult.operations || []);
      if (nextDevices[0]) setSelectedDevId(prev => prev || nextDevices[0].devId);
      setLastStatusAt(new Date().toISOString());
      setLiveStatusError('');
    } catch (error) {
      setLiveStatusError(error?.message || '设备缓存刷新失败');
    }
  };

  const registerBoundDevice = async (device) => {
    if (!authToken || !device?.devId) return refreshData();
    await api.registerDevice({
      tuya_device_id: device.devId,
      tuya_home_id: String(device.homeId || ''),
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
    const timer = setInterval(refreshData, 3000);
    return () => clearInterval(timer);
  }, [authToken]);

  const handleStartCooking = async () => {
    if (!selectedDevice || !confirmRecord) return;
    await HeyboTuya.startDiyCooking({ devId: selectedDevice.devId, temperature: 85, cookTime: 12 * 60, power: 8, speed: '1' });
    await api.recordCookingOperation({
      tuya_device_id: selectedDevice.devId,
      device_name: selectedDevice.name || '厨房鲜食机',
      recipe_id: confirmRecord.recipeId,
      recipe_name: confirmRecord.recipeName,
      pet_id: confirmRecord.petId,
      pet_name: confirmRecord.petName,
      total_weight_gram: confirmRecord.totalWeightGram,
      operation_type: 'start_cooking',
      result: 'success',
      started_at: new Date().toISOString(),
    }, authToken);
    setMessage('已下发制作指令，鲜食机正在启动。');
    setConfirmRecord(null);
    await refreshData();
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    await HeyboTuya.unbindDevice({ devId: unbindTarget.devId });
    setUnbindTarget(null);
    setDetailDevice(null);
    await refreshData();
  };

  if (confirmRecord) return <SafetyConfirm record={confirmRecord} onBack={() => setConfirmRecord(null)} onConfirm={handleStartCooking} />;
  if (detailDevice) {
    const detailViewDevice = detailDevice.devId === selectedDevice?.devId || detailDevice.tuya_device_id === selectedDevice?.devId ? selectedDevice : detailDevice;
    return <DeviceDetail device={detailViewDevice} records={selectedDeviceRecords} lastStatusAt={lastStatusAt} liveStatusError={liveStatusError} onBack={() => setDetailDevice(null)} onRedo={setConfirmRecord} onUnbind={() => setUnbindTarget(detailViewDevice)} />;
  }

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
                <strong>{item.model}</strong>
                <span>{item.online ? '在线' : '离线'}｜{item.wifi}</span>
                <span>最近制作：{selectedDeviceRecords[0]?.recipeName || item.lastRecipe || '暂无记录'}</span>
                <div>
                  <GhostButton onClick={event => { event.stopPropagation(); setDetailDevice(device); }}>查看记录</GhostButton>
                  <GhostButton onClick={event => { event.stopPropagation(); setDetailDevice(device); }}>设备设置</GhostButton>
                </div>
              </div>
            );
          }) : <div className="cooking-center-card">尚未绑定鲜食机，点击添加后开始扫描。</div>}
        </div>
      </section>

      <section className="cooking-center-section cooking-records-section">
        <h2>使用记录</h2>
        {records.length ? records.map(record => <RecordRow key={record.id} record={record} onRedo={setConfirmRecord} />) : <div className="cooking-center-card">暂无使用记录。完成一次制作后会显示在这里。</div>}
      </section>

      {message && <div className="cooking-toast">{message}</div>}
      <DeviceStatusBar device={selectedDevice} onReconnect={refreshData} />
      <AddDeviceBottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onBound={registerBoundDevice} />

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
