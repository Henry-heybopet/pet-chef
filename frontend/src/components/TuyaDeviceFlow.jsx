import React, { useEffect, useMemo, useState } from 'react';
import TopBar from './TopBar';
import { HeyboTuya, prepareTuyaForHeyboUser } from '../native/heyboTuya';

const DEFAULT_COOK_TIME_SECONDS = 20 * 60;

function createDemoHeyboUid(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'demo_user';
}

function parseDps(result) {
  if (!result?.dps) return null;
  if (typeof result.dps === 'string') {
    try {
      return JSON.parse(result.dps);
    } catch {
      return result.dps;
    }
  }
  return result.dps;
}

export default function TuyaDeviceFlow({ onBack }) {
  const [loginInput, setLoginInput] = useState('18500000000');
  const [heyboUser, setHeyboUser] = useState(null);
  const [tuyaStatus, setTuyaStatus] = useState(null);
  const [home, setHome] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState('');
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [pairingMode, setPairingMode] = useState('EZ');
  const [cookMinutes, setCookMinutes] = useState(20);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('请先用 Heybo Pet 测试账号登录。');
  const [lastDps, setLastDps] = useState(null);

  const selectedDevice = useMemo(
    () => devices.find(device => device.devId === selectedDevId) || null,
    [devices, selectedDevId],
  );

  const petChefDevices = useMemo(
    () => devices.filter(device => device.isPetChef || device.productId === 'ak2kofibhuvdtqip'),
    [devices],
  );

  useEffect(() => {
    HeyboTuya.status()
      .then(setTuyaStatus)
      .catch(error => setMessage(error?.message || 'Tuya SDK 状态读取失败'));
  }, []);

  const setBusy = async (label, action) => {
    setLoading(label);
    try {
      return await action();
    } finally {
      setLoading('');
    }
  };

  const refreshDevices = async (homeId = home?.homeId) => {
    if (!homeId) return;
    const deviceResult = await HeyboTuya.getDeviceList({ homeId });
    const nextDevices = deviceResult.devices || [];
    setDevices(nextDevices);
    const firstPetChef = nextDevices.find(device => device.isPetChef || device.productId === 'ak2kofibhuvdtqip');
    setSelectedDevId(current => current || firstPetChef?.devId || nextDevices[0]?.devId || '');
    return nextDevices;
  };

  const handleHeyboLogin = async () => {
    const heyboUid = createDemoHeyboUid(loginInput);
    if (!heyboUid) {
      setMessage('请输入手机号或 Email。');
      return;
    }

    await setBusy('login', async () => {
      setMessage('正在创建 Heybo 测试账号，并静默登录 Tuya...');
      const nextUser = {
        id: `heybo_${heyboUid}`,
        displayName: loginInput.includes('@') ? loginInput : `用户 ${loginInput.slice(-4)}`,
      };
      setHeyboUser(nextUser);

      const nextHome = await prepareTuyaForHeyboUser(nextUser.id);
      setHome(nextHome);
      const nextStatus = await HeyboTuya.status();
      setTuyaStatus(nextStatus);
      const nextDevices = await refreshDevices(nextHome.homeId);

      setMessage(nextDevices?.length
        ? 'Heybo 登录完成，已同步 Tuya 家庭和设备列表。'
        : 'Heybo 登录完成，当前家庭还没有设备，请先配网。');
    });
  };

  const handleRefresh = async () => {
    if (!home?.homeId) {
      setMessage('请先完成 Heybo 登录和 Tuya 静默登录。');
      return;
    }
    await setBusy('refresh', async () => {
      const nextDevices = await refreshDevices(home.homeId);
      setMessage(nextDevices?.length ? '设备列表已刷新。' : '当前家庭还没有设备。');
    });
  };

  const handlePairing = async () => {
    if (!home?.homeId) {
      setMessage('请先登录 Heybo Pet。');
      return;
    }
    if (!ssid.trim()) {
      setMessage('请输入 2.4GHz Wi-Fi 名称。');
      return;
    }

    await setBusy('pairing', async () => {
      setMessage(pairingMode === 'AP'
        ? '正在 AP 配网，请先让设备进入热点配网模式。'
        : '正在 EZ 配网，请先让设备进入快闪配网模式。');
      const pairResult = await HeyboTuya.startWifiPairing({
        homeId: home.homeId,
        ssid: ssid.trim(),
        password: wifiPassword,
        mode: pairingMode,
        timeout: 120,
      });
      const pairedDevice = pairResult.device;
      const nextDevices = await refreshDevices(home.homeId);
      if (pairedDevice?.devId) setSelectedDevId(pairedDevice.devId);
      setMessage(nextDevices?.length ? '设备绑定成功，已刷新设备列表。' : '配网返回成功，请刷新设备列表确认。');
    });
  };

  const handleStopPairing = async () => {
    await setBusy('stopPairing', async () => {
      await HeyboTuya.stopPairing();
      setMessage('已停止配网。');
    });
  };

  const handleStartCooking = async () => {
    if (!selectedDevice) {
      setMessage('请选择一台 Pet Chef 设备。');
      return;
    }

    await setBusy('cook', async () => {
      const result = await HeyboTuya.startDiyCooking({
        devId: selectedDevice.devId,
        temperature: 85,
        cookTime: Math.max(1, Number(cookMinutes || 20)) * 60 || DEFAULT_COOK_TIME_SECONDS,
        power: 8,
        speed: '1',
      });
      setLastDps(parseDps(result));
      setMessage('已下发 85°C DIY 鲜食烹饪指令。');
    });
  };

  const handlePause = async () => {
    if (!selectedDevice) return;
    await setBusy('pause', async () => {
      const result = await HeyboTuya.pauseCooking({ devId: selectedDevice.devId });
      setLastDps(parseDps(result));
      setMessage('已下发暂停指令。');
    });
  };

  const handleReset = async () => {
    if (!selectedDevice) return;
    await setBusy('reset', async () => {
      const result = await HeyboTuya.resetCooking({ devId: selectedDevice.devId });
      setLastDps(parseDps(result));
      setMessage('已下发重置指令。');
    });
  };

  const isNative = tuyaStatus?.nativeAvailable;
  const canCook = Boolean(selectedDevice && !loading);

  return (
    <div className="tuya-flow animate-fade">
      <TopBar onBack={onBack} title="设备闭环" />

      <main className="tuya-flow-content">
        <section className="tuya-flow-hero">
          <div className="tuya-flow-eyebrow">Heybo Pet × Tuya</div>
          <h1>登录、绑定设备，然后一键启动 85°C 鲜食烹饪</h1>
          <p>{isNative ? '当前运行在手机 App 壳内，将调用真实 Tuya SDK。' : '当前为 Web 预览模式，使用模拟设备验证页面流程。'}</p>
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>1</span>
            <div>
              <h2>Heybo Pet 登录</h2>
              <p>第一版先用测试账号模拟手机号/Email 登录，后续替换为后端验证码登录。</p>
            </div>
          </div>
          <div className="tuya-flow-row">
            <input
              value={loginInput}
              onChange={event => setLoginInput(event.target.value)}
              placeholder="手机号或 Email"
              className="tuya-flow-input"
            />
            <button className="tuya-flow-button" onClick={handleHeyboLogin} disabled={Boolean(loading)}>
              {loading === 'login' ? '登录中' : '登录'}
            </button>
          </div>
          {heyboUser && (
            <div className="tuya-flow-meta">
              <span>Heybo ID</span>
              <strong>{heyboUser.id}</strong>
            </div>
          )}
        </section>

        <section className="tuya-flow-grid">
          <div className="tuya-flow-mini">
            <span>Tuya SDK</span>
            <strong>{tuyaStatus?.initialized ? '已初始化' : '等待初始化'}</strong>
          </div>
          <div className="tuya-flow-mini">
            <span>家庭</span>
            <strong>{home?.name || home?.homeId || '未创建'}</strong>
          </div>
          <div className="tuya-flow-mini">
            <span>设备</span>
            <strong>{devices.length}</strong>
          </div>
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>2</span>
            <div>
              <h2>设备绑定/配网</h2>
              <p>将设备进入配网模式后，输入 2.4GHz Wi-Fi。若工厂确认 K15 固件只支持 AP 模式，就切换 AP。</p>
            </div>
          </div>
          <div className="tuya-flow-row">
            <input
              value={ssid}
              onChange={event => setSsid(event.target.value)}
              placeholder="Wi-Fi 名称"
              className="tuya-flow-input"
            />
            <input
              value={wifiPassword}
              onChange={event => setWifiPassword(event.target.value)}
              placeholder="Wi-Fi 密码"
              type="password"
              className="tuya-flow-input"
            />
          </div>
          <div className="tuya-flow-row tuya-flow-row-actions">
            <select value={pairingMode} onChange={event => setPairingMode(event.target.value)} className="tuya-flow-input">
              <option value="EZ">EZ 快闪配网</option>
              <option value="AP">AP 热点配网</option>
            </select>
            <button className="tuya-flow-button" onClick={handlePairing} disabled={Boolean(loading)}>
              {loading === 'pairing' ? '配网中' : '开始配网'}
            </button>
            <button className="tuya-flow-ghost" onClick={handleStopPairing} disabled={!loading}>
              停止
            </button>
          </div>
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>3</span>
            <div>
              <h2>设备列表</h2>
              <p>优先选择 PID 为 ak2kofibhuvdtqip 的 Pet Chef 设备。</p>
            </div>
          </div>
          <button className="tuya-flow-ghost tuya-flow-refresh" onClick={handleRefresh} disabled={Boolean(loading)}>
            {loading === 'refresh' ? '刷新中' : '刷新设备列表'}
          </button>
          <div className="tuya-device-list">
            {devices.length === 0 && <div className="tuya-empty">暂无设备。完成配网后刷新。</div>}
            {devices.map(device => (
              <button
                key={device.devId}
                className={`tuya-device-item ${device.devId === selectedDevId ? 'active' : ''}`}
                onClick={() => setSelectedDevId(device.devId)}
              >
                <div>
                  <strong>{device.name || '未命名设备'}</strong>
                  <span>{device.productId || 'unknown pid'}</span>
                </div>
                <em>{device.isOnline ? '在线' : '离线'}</em>
              </button>
            ))}
          </div>
          {petChefDevices.length === 0 && devices.length > 0 && (
            <div className="tuya-flow-warning">当前设备列表中还没有识别到 Pet Chef PID，请确认工厂烧录 PID 是否为 ak2kofibhuvdtqip。</div>
          )}
        </section>

        <section className="tuya-cook-panel">
          <div>
            <div className="tuya-flow-eyebrow">DIY Cooking</div>
            <h2>85°C 低温鲜食</h2>
            <p>下发 DP：开机、DIY、85°C、时间、火力 8、速度 1、开始。</p>
          </div>
          <label className="tuya-time-field">
            <span>时间</span>
            <input
              value={cookMinutes}
              onChange={event => setCookMinutes(event.target.value)}
              inputMode="numeric"
            />
            <span>分钟</span>
          </label>
          <button className="tuya-cook-button" onClick={handleStartCooking} disabled={!canCook}>
            {loading === 'cook' ? '下发中' : '启动 85°C DIY'}
          </button>
          <div className="tuya-cook-actions">
            <button onClick={handlePause} disabled={!selectedDevice || Boolean(loading)}>暂停</button>
            <button onClick={handleReset} disabled={!selectedDevice || Boolean(loading)}>重置</button>
          </div>
        </section>

        <section className="tuya-flow-log">
          <strong>{message}</strong>
          {selectedDevice && <span>当前设备：{selectedDevice.name} / {selectedDevice.devId}</span>}
          {lastDps && <pre>{typeof lastDps === 'string' ? lastDps : JSON.stringify(lastDps, null, 2)}</pre>}
        </section>
      </main>
    </div>
  );
}
