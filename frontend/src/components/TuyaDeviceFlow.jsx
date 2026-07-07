import React, { useEffect, useMemo, useState, useRef } from 'react';
import TopBar from './TopBar';
import { HeyboTuya, prepareTuyaForHeyboUser } from '../native/heyboTuya';
import { factoryDebugApi as api } from '../api/factoryDebug';

const DP_LABELS = {
  1: { name: '开关', type: 'bool', icon: '⚡' },
  3: { name: '烹饪模式', type: 'enum', icon: '🍳' },
  4: { name: '云菜谱清单', type: 'value', icon: '📜' },
  5: { name: '工作状态', type: 'enum', icon: '⚙️' },
  7: { name: '烹饪时间', type: 'value', unit: '秒', icon: '⏱️' },
  8: { name: '剩余时间', type: 'value', unit: '秒', icon: '⏳' },
  9: { name: '烹饪温度', type: 'value', unit: '℃', icon: '🌡️' },
  10: { name: '实时温度', type: 'value', unit: '℃', icon: '🔥' },
  11: { name: '多步骤执行', type: 'raw', icon: '⛓️' },
  12: { name: '故障告警', type: 'fault', icon: '⚠️' },
  102: { name: '功率', type: 'value', icon: '💪' },
  103: { name: '做过的菜', type: 'raw', icon: '🍲' },
  105: { name: '同步', type: 'enum', icon: '🔄' },
  106: { name: '弹窗同步', type: 'enum', icon: '📱' },
  107: { name: '启动/暂停/复位', type: 'enum', icon: '🔘' },
  108: { name: '速度', type: 'enum', icon: '🌪️' },
};

const MODE_MAP = {
  clean: '清洗',
  smoothie: '冰沙',
  fresh_recovery: '复鲜清洗',
  thick_soup: '浓汤',
  chop: '切削',
  saute: '炒',
  stir: '搅拌',
  knead: '和面',
  steam: '蒸',
  stew: '炖汤',
  warm: '保温',
  reheat: '加热',
  boil: '煮沸',
  yogurt: '酸奶',
  rice: '米饭',
  porridge: '煮粥麦片',
  congee: '粥',
  diy: 'DIY 悬浮',
  quick_soup: '快速汤',
};

const STATUS_MAP = {
  standby: '待机中',
  appointment: '预约中',
  cooking: '烹饪中',
  done: '烹饪完成',
  pause: '烹饪暂停',
  Add_Ingredients: '加料中',
};

function formatSeconds(seconds) {
  if (seconds === undefined || seconds === null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseDps(dpsData) {
  if (!dpsData) return {};
  if (typeof dpsData === 'string') {
    try {
      return JSON.parse(dpsData);
    } catch {
      return {};
    }
  }
  return dpsData;
}

export default function TuyaDeviceFlow({ onBack }) {
  // Authentication & Session
  const [loginInput, setLoginInput] = useState('13501578655');
  const [passwordInput, setPasswordInput] = useState('13501578665');
  const [heyboUser, setHeyboUser] = useState(null);
  const [heyboToken, setHeyboToken] = useState('');
  const [tuyaUid, setTuyaUid] = useState('');
  const [tuyaStatus, setTuyaStatus] = useState(null);
  const [home, setHome] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState('');

  // Pairing State
  const [showBackupPairing, setShowBackupPairing] = useState(false);
  const [ssid, setSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [pairingMode, setPairingMode] = useState('EZ'); // 'EZ' | 'AP'
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [discoveredBleDevices, setDiscoveredBleDevices] = useState([]);

  // Real-time Selected Device State
  const [deviceDps, setDeviceDps] = useState({});
  const [flashingDps, setFlashingDps] = useState({}); // Track which DPs just updated
  const [isOnline, setIsOnline] = useState(false);

  // Custom DP Control inputs
  const [ctrlTemp, setCtrlTemp] = useState(85);
  const [ctrlTimeMins, setCtrlTimeMins] = useState(20);
  const [ctrlPower, setCtrlPower] = useState(8);
  const [ctrlSpeed, setCtrlSpeed] = useState('1');
  const [ctrlMode, setCtrlMode] = useState('diy');

  // Raw DP Sender State
  const [rawDpId, setRawDpId] = useState('');
  const [rawDpValue, setRawDpValue] = useState('');
  const [rawDpType, setRawDpType] = useState('value'); // 'bool' | 'value' | 'enum' | 'raw'

  // Log and History State
  const [logs, setLogs] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('请先登录 Heybo Pet 测试账号，完成后将静默激活虚拟涂鸦账号。');
  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'logs' | 'history'

  const logsEndRef = useRef(null);

  const selectedDevice = useMemo(
    () => devices.find(device => device.devId === selectedDevId) || null,
    [devices, selectedDevId],
  );

  const isNative = tuyaStatus?.nativeAvailable;

  // Add Log helper
  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  // Check Tuya SDK Status on Mount
  useEffect(() => {
    HeyboTuya.status()
      .then(status => {
        setTuyaStatus(status);
        addLog(`Tuya SDK 状态: platform=${status.platform}, nativeAvailable=${status.nativeAvailable}, initialized=${status.initialized}`);
      })
      .catch(error => {
        setMessage(error?.message || 'Tuya SDK 状态读取失败');
        addLog(`读取 Tuya SDK 状态失败: ${error?.message}`);
      });
  }, []);

  // Scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Set Busy action helper
  const setBusy = async (label, action) => {
    setLoading(label);
    try {
      return await action();
    } catch (err) {
      addLog(`❌ 操作失败: ${err.message}`);
      setMessage(`错误: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // Refresh Device List from Tuya
  const refreshDevices = async (homeId = home?.homeId) => {
    if (!homeId) return [];
    addLog('正在从涂鸦获取绑定设备列表...');
    const deviceResult = await HeyboTuya.getDeviceList({ homeId });
    let nextDevices = deviceResult.devices || [];
    if (typeof nextDevices === 'string') {
      try {
        nextDevices = JSON.parse(nextDevices);
      } catch (e) {
        nextDevices = [];
      }
    }
    setDevices(nextDevices);
    addLog(`成功获取设备列表，共 ${nextDevices.length} 台设备`);

    // Auto-select first device if none selected
    if (nextDevices.length > 0 && !selectedDevId) {
      const firstPetChef = nextDevices.find(d => d.productId === 'ak2kofibhuvdtqip' || d.isPetChef);
      setSelectedDevId(firstPetChef ? firstPetChef.devId : nextDevices[0].devId);
    }
    return nextDevices;
  };

  // Sync Device metadata to Heybo Backend
  const registerDeviceToBackend = async (device, homeId = home?.homeId, token = heyboToken) => {
    if (!device?.devId || !token) return;
    try {
      await api.registerDevice({
        tuya_device_id: device.devId,
        tuya_home_id: String(homeId || ''),
        tuya_pid: device.productId,
        product_type: (device.productId === 'ak2kofibhuvdtqip' || device.isPetChef) ? 'pet_chef' : 'other',
        device_name: device.name,
        status: device.isOnline ? 'online' : 'offline',
      }, token);
      addLog(`设备 ${device.name || device.devId} 元数据已同步到 Heybo 后端`);
    } catch (error) {
      addLog(`同步设备到后端失败: ${error.message}`);
    }
  };

  // Fetch Operation History from Backend
  const loadHistory = async (token = heyboToken) => {
    if (!token) return;
    try {
      const res = await api.listCookingOperations(token);
      if (res?.success) {
        setHistoryRecords(res.operations || []);
        addLog(`已同步后端操作记录，共 ${res.operations?.length || 0} 条`);
      }
    } catch (e) {
      addLog(`拉取操作记录失败: ${e.message}`);
    }
  };

  // Heybo Pet Login Flow (which triggers silent Tuya Login)
  const handleHeyboLogin = async () => {
    if (!loginInput.trim() || !passwordInput.trim()) {
      setMessage('请输入手机号和密码。');
      return;
    }

    await setBusy('login', async () => {
      addLog(`正在登录 Heybo Pet 账号: ${loginInput}...`);
      const loginResult = await api.heyboMockLogin({
        login: loginInput.trim(),
        password: passwordInput.trim(),
      });

      if (!loginResult?.success) {
        throw new Error(loginResult?.error || '登录失败');
      }

      const nextUser = loginResult.user;
      setHeyboUser(nextUser);
      setHeyboToken(loginResult.token);
      const nextTuyaUid = loginResult.tuyaMapping?.tuya_uid || `heybo_${nextUser.id}`;
      const nextTuyaPassword = loginResult.tuyaMapping?.tuya_test_password || nextTuyaUid;
      setTuyaUid(nextTuyaUid);
      addLog(`Heybo Pet 登录成功! 用户ID: ${nextUser.id}, 昵称: ${nextUser.display_name || '未命名'}`);

      // Silent Tuya Login
      addLog('正在静默激活关联的虚拟涂鸦账号...');
      const nextHome = await prepareTuyaForHeyboUser(
        nextUser.id,
        nextTuyaUid,
        nextTuyaPassword
      );
      setHome(nextHome);
      addLog(`虚拟涂鸦账号就绪! 分配家庭: ${nextHome.name} (ID: ${nextHome.homeId})`);

      const nextStatus = await HeyboTuya.status();
      setTuyaStatus(nextStatus);

      // Fetch devices & sync
      const nextDevices = await refreshDevices(nextHome.homeId);
      if (nextDevices.length > 0) {
        await Promise.all(nextDevices.map(d => registerDeviceToBackend(d, nextHome.homeId, loginResult.token)));
      }

      // Load history
      await loadHistory(loginResult.token);

      setMessage(`Heybo 登录完成，虚拟涂鸦账号 ${nextStatus.initialized ? '已静默登录' : '激活中'}。`);
    });
  };

  // One-click Fill Test Account 1
  const prefillTestAccount1 = () => {
    setLoginInput('13501578655');
    setPasswordInput('13501578665');
    addLog('已填入硬件工厂预设测试账号1与密码');
  };

  // One-click Fill Test Account 2
  const prefillTestAccount2 = () => {
    setLoginInput('18757129405');
    setPasswordInput('18757129405');
    addLog('已填入硬件工厂预设测试账号2与密码');
  };

  // Device unbinding
  const handleUnbind = async (devId) => {
    if (!devId) return;
    const devName = devices.find(d => d.devId === devId)?.name || devId;
    if (!confirm(`确定要在涂鸦云和当前家庭中解绑并移除设备 "${devName}" 吗？`)) return;

    await setBusy('unbind', async () => {
      addLog(`正在向涂鸦云发送解绑请求: ${devId}...`);
      const res = await HeyboTuya.unbindDevice({ devId });
      if (res?.success) {
        addLog(`✅ 成功解绑设备: ${devId}`);
        if (selectedDevId === devId) {
          setSelectedDevId('');
          setDeviceDps({});
        }
        await refreshDevices(home?.homeId);
        setMessage(`设备 ${devName} 已成功解绑。`);
      } else {
        throw new Error('解绑失败');
      }
    });
  };

  // Bluetooth scanning
  const startBleScan = async () => {
    if (!home?.homeId) {
      setMessage('请先登录 Heybo 账号。');
      return;
    }
    setDiscoveredBleDevices([]);
    setIsScanningBle(true);
    addLog('🎯 开启蓝牙扫描，正在搜寻附近的涂鸦设备...');

    try {
      // Register event listener for discovered devices
      const listener = await HeyboTuya.addListener('bleDeviceFound', (device) => {
        addLog(`📡 蓝牙发现设备: ${device.name} (${device.address}) [PID: ${device.productId}]`);
        setDiscoveredBleDevices(prev => {
          if (prev.some(d => d.address === device.address)) return prev;
          return [...prev, device];
        });
      });

      // Keep reference to remove it later
      window.activeBleListener = listener;

      await HeyboTuya.startBleScan();
    } catch (e) {
      addLog(`开启蓝牙扫描失败: ${e.message}`);
      setIsScanningBle(false);
    }
  };

  const stopBleScan = async () => {
    setIsScanningBle(false);
    addLog('停止蓝牙扫描');
    try {
      await HeyboTuya.stopBleScan();
      if (window.activeBleListener) {
        await window.activeBleListener.remove();
        window.activeBleListener = null;
      }
    } catch (e) {
      addLog(`停止蓝牙扫描失败: ${e.message}`);
    }
  };

  const handleOpenBluetoothSettings = async () => {
    addLog('正在调起系统蓝牙设置页面...');
    try {
      await HeyboTuya.openBluetoothSettings();
      addLog('成功唤起系统蓝牙设置页面。');
    } catch (e) {
      addLog(`调起系统蓝牙设置失败: ${e.message}`);
    }
  };

  // Bluetooth Binding (BLE-assisted WiFi provisioning)
  const handleBleBind = async (bleDevice) => {
    if (!ssid.trim()) {
      setMessage('请输入 2.4GHz Wi-Fi 名称以配合蓝牙写入。');
      setShowBackupPairing(true);
      return;
    }
    await stopBleScan();

    await setBusy('ble_bind', async () => {
      addLog(`🔗 开启蓝牙辅助双模配网...\n设备: ${bleDevice.name}\nWi-Fi: ${ssid}`);
      const res = await HeyboTuya.connectBleDevice({
        uuid: bleDevice.uuid,
        address: bleDevice.address,
        productId: bleDevice.productId,
        ssid: ssid.trim(),
        password: wifiPassword,
        homeId: home?.homeId,
      });

      if (res?.success) {
        addLog(`✅ 双模配网成功! 绑定设备: ${res.device.name} (ID: ${res.device.devId})`);
        const nextDevices = await refreshDevices(home?.homeId);
        await registerDeviceToBackend(res.device, home?.homeId);
        setSelectedDevId(res.device.devId);
        setMessage(`蓝牙辅助配网成功，已绑定设备 ${res.device.name}`);
      } else {
        throw new Error('双模配网失败');
      }
    });
  };

  // WiFi provisioning (EZ / AP)
  const handleWifiPairing = async () => {
    if (!home?.homeId) {
      setMessage('请先登录 Heybo 账号。');
      return;
    }
    if (!ssid.trim()) {
      setMessage('请输入 2.4GHz Wi-Fi 名称。');
      return;
    }

    await setBusy('wifi_pair', async () => {
      addLog(`⏳ 开启 Wi-Fi ${pairingMode} 模式配网... 请确保设备进入配网状态。 SSID: ${ssid}`);
      const res = await HeyboTuya.startWifiPairing({
        homeId: home.homeId,
        ssid: ssid.trim(),
        password: wifiPassword,
        mode: pairingMode,
        timeout: 120,
      });

      if (res?.device) {
        addLog(`✅ Wi-Fi 配网成功! 绑定设备: ${res.device.name} (ID: ${res.device.devId})`);
        await refreshDevices(home.homeId);
        await registerDeviceToBackend(res.device, home.homeId);
        setSelectedDevId(res.device.devId);
        setMessage(`Wi-Fi 配网成功，已绑定设备 ${res.device.name}`);
      } else {
        throw new Error('Wi-Fi 配网返回空设备');
      }
    });
  };

  // Subscribe to selected device's real-time DPs
  useEffect(() => {
    if (!selectedDevId || !tuyaStatus?.initialized) {
      setDeviceDps({});
      setIsOnline(false);
      return;
    }

    let dpListener = null;
    let removeListenerFn = null;

    const setupSubscription = async () => {
      addLog(`🔌 正在订阅设备实时数据变化: ${selectedDevId}...`);

      // Initialize current state
      if (selectedDevice) {
        setDeviceDps(parseDps(selectedDevice.dps) || {});
        setIsOnline(selectedDevice.isOnline);
      }

      // Register real-time listener for DP updates
      dpListener = await HeyboTuya.addListener('dpUpdate', (data) => {
        if (data.devId !== selectedDevId) return;

        const updatedDps = parseDps(data.dps);

        // Update local DPs state
        setDeviceDps(prev => ({ ...prev, ...updatedDps }));

        // Trigger card flash animation for each updated DP
        const newFlash = {};
        Object.keys(updatedDps).forEach(dpId => {
          newFlash[dpId] = true;
          addLog(`📥 [DP 上报] DP ${dpId} (${DP_LABELS[dpId]?.name || '未知'}) -> ${JSON.stringify(updatedDps[dpId])}`);
        });

        setFlashingDps(prev => ({ ...prev, ...newFlash }));
        setTimeout(() => {
          setFlashingDps(prev => {
            const copy = { ...prev };
            Object.keys(newFlash).forEach(k => delete copy[k]);
            return copy;
          });
        }, 800);
      });

      // Register device status/online listener
      const statusListener = await HeyboTuya.addListener('deviceStatusChanged', (data) => {
        if (data.devId !== selectedDevId) return;
        setIsOnline(data.online);
        addLog(`📡 [设备状态] 设备 ${data.online ? '上线' : '下线'}`);
      });

      const removedListener = await HeyboTuya.addListener('deviceRemoved', (data) => {
        if (data.devId !== selectedDevId) return;
        addLog(`🚨 [设备移除] 当前设备已被从家庭中移除`);
        setSelectedDevId('');
        setDeviceDps({});
        refreshDevices(home?.homeId);
      });

      removeListenerFn = async () => {
        if (dpListener) await dpListener.remove();
        if (statusListener) await statusListener.remove();
        if (removedListener) await removedListener.remove();
      };

      await HeyboTuya.subscribeDevice({ devId: selectedDevId });
      addLog(`✅ 订阅成功，已监听 DP 实时通信通道`);
    };

    setupSubscription();

    return () => {
      addLog(`🔌 正在取消订阅设备数据: ${selectedDevId}`);
      HeyboTuya.unsubscribeDevice({ devId: selectedDevId }).catch(e => console.warn(e));
      if (removeListenerFn) removeListenerFn();
    };
  }, [selectedDevId, tuyaStatus?.initialized]);

  // Publish DP Command helper
  const sendDpCommand = async (dpsObject) => {
    if (!selectedDevId) return;
    try {
      const keys = Object.keys(dpsObject);
      keys.forEach(k => {
        addLog(`📤 [DP 下发] DP ${k} (${DP_LABELS[k]?.name || '未知'}) -> ${JSON.stringify(dpsObject[k])}`);
      });
      await HeyboTuya.publishDps({ devId: selectedDevId, dps: dpsObject });
    } catch (e) {
      addLog(`❌ DP 下发失败: ${e.message}`);
    }
  };

  // DIY Cook Starter
  const startDiyCooking = async () => {
    if (!selectedDevId) return;
    const timeSecs = Math.max(1, Number(ctrlTimeMins)) * 60;

    await setBusy('cook', async () => {
      addLog(`🍳 发送低迷温度 DIY 鲜食烹饪配方：温度=${ctrlTemp}℃, 时间=${ctrlTimeMins}分, 功率=${ctrlPower}, 速度=${ctrlSpeed}`);

      const dps = {
        1: true,
        3: ctrlMode,
        7: timeSecs,
        9: Number(ctrlTemp),
        102: Number(ctrlPower),
        108: String(ctrlSpeed),
        107: 'start',
      };

      await sendDpCommand(dps);

      // Save operation record to backend
      if (heyboToken) {
        await api.recordCookingOperation({
          tuya_device_id: selectedDevId,
          device_name: selectedDevice?.name || '鲜食机',
          operation_type: 'start_cooking',
          tuya_dp_payload: dps,
          target_temperature_c: Number(ctrlTemp),
          target_time_seconds: timeSecs,
          target_power: Number(ctrlPower),
          target_speed: String(ctrlSpeed),
          result: 'success',
          started_at: new Date().toISOString(),
        }, heyboToken);
        loadHistory(heyboToken);
      }
      setMessage('已下发 DIY 鲜食烹饪配方参数，设备正在启动。');
    });
  };

  // Pause / Stop / Reset
  const handleControlCommand = (cmd) => {
    if (!selectedDevId) return;
    sendDpCommand({ 107: cmd });
    setMessage(`已下发烹饪控制指令: ${cmd === 'start' ? '启动' : cmd === 'pause' ? '暂停' : '复位'}`);
  };

  // Toggle Power
  const handleTogglePower = () => {
    const nextPower = !deviceDps[1];
    sendDpCommand({ 1: nextPower });
  };

  // Raw DP Sender
  const handleSendRawDp = () => {
    if (!selectedDevId) {
      setMessage('请先选择设备。');
      return;
    }
    const dpIdNum = Number(rawDpId);
    if (isNaN(dpIdNum) || dpIdNum <= 0) {
      setMessage('请输入有效的数字 DP ID。');
      return;
    }
    if (rawDpValue.trim() === '') {
      setMessage('请输入 DP 值。');
      return;
    }

    let parsedVal;
    if (rawDpType === 'bool') {
      parsedVal = rawDpValue.toLowerCase() === 'true' || rawDpValue === '1';
    } else if (rawDpType === 'value') {
      parsedVal = Number(rawDpValue);
      if (isNaN(parsedVal)) {
        setMessage('数值类型请输入数字。');
        return;
      }
    } else {
      parsedVal = rawDpValue; // string for enum or raw
    }

    sendDpCommand({ [dpIdNum]: parsedVal });
    setRawDpValue('');
    setMessage(`已下发自定义 DP ${dpIdNum} 命令`);
  };

  return (
    <div className="tuya-flow animate-fade" style={{ background: '#0a0d14', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar onBack={onBack} title="涂鸦硬件集成调试中心" />

      <main className="tuya-flow-content" style={{ flex: 1, padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Banner */}
        <section className="tuya-flow-hero" style={{ textAlign: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(16,24,48,0.8), rgba(8,12,24,0.9))', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0, 230, 255, 0.15)' }}>
          <div className="tuya-flow-eyebrow" style={{ color: '#00e6ff', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '12px', fontWeight: '800' }}>Heybo Pet × Tuya Joint-Debugging</div>
          <h1 style={{ fontSize: '22px', margin: '8px 0 4px 0', fontWeight: '800', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>硬件工厂联调控制台</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            {isNative ? `⚡ 当前处于 ${tuyaStatus?.platform === 'ios' ? 'iOS' : 'Android'} 原生环境，连接涂鸦真实 SDK。` : '🖥️ 当前处于 Web 预览开发模式，使用虚拟沙盒模拟 DP 通信。'}
          </p>
        </section>

        {/* Step 1: Heybo Pet Account Login */}
        <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div className="tuya-flow-step" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#00e6ff', color: '#090d14', fontWeight: '800', fontSize: '14px' }}>1</span>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>第一步：登录 Heybo Pet 账号</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>验证成功后，系统将在后台自动静默登录虚拟涂鸦账号。</p>
            </div>
          </div>

          <div className="tuya-flow-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                placeholder="手机号或 Email"
                className="tuya-flow-input"
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '14px' }}
                disabled={Boolean(loading)}
              />
              <input
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="密码"
                type="password"
                className="tuya-flow-input"
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '14px' }}
                disabled={Boolean(loading)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                className="tuya-flow-button"
                onClick={handleHeyboLogin}
                style={{ flex: 2, background: 'linear-gradient(90deg, #00e6ff, #00a8ff)', border: 'none', borderRadius: '10px', padding: '12px', color: '#090d14', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                disabled={Boolean(loading)}
              >
                {loading === 'login' ? '正在静默激活 Tuya...' : '登录账号并激活涂鸦'}
              </button>
              <button
                className="tuya-flow-ghost"
                onClick={prefillTestAccount1}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                disabled={Boolean(loading)}
              >
                测试号 1
              </button>
              <button
                className="tuya-flow-ghost"
                onClick={prefillTestAccount2}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                disabled={Boolean(loading)}
              >
                测试号 2
              </button>
            </div>
          </div>

          {heyboUser && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '12px' }}>
              <div>Heybo 昵称: <span style={{ color: '#00e6ff', fontWeight: '700' }}>{heyboUser.display_name || '工厂测试账号'}</span></div>
              <div>关联涂鸦UID: <span style={{ color: '#20f29b', fontWeight: '700' }}>{tuyaStatus?.initialized ? (tuyaUid.length > 18 ? `${tuyaUid.substring(0, 15)}...` : tuyaUid) : '未连接'}</span></div>
            </div>
          )}
        </section>

        {/* Step 2: Device Pairing & Setup */}
        <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div className="tuya-flow-step" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#00e6ff', color: '#090d14', fontWeight: '800', fontSize: '14px' }}>2</span>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>第二步：蓝牙辅助配网 (首选推荐)</h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>优先使用蓝牙扫描写入路由器凭证，连接稳定快捷。请先输入目标 Wi-Fi 信息。</p>
            </div>
          </div>

          {/* WiFi Input fields */}
          <div className="tuya-flow-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <input
              value={ssid}
              onChange={e => setSSID(e.target.value)}
              placeholder="2.4G Wi-Fi 名称"
              className="tuya-flow-input"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '13px' }}
            />
            <input
              value={wifiPassword}
              onChange={e => setWifiPassword(e.target.value)}
              placeholder="Wi-Fi 密码"
              type="password"
              className="tuya-flow-input"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '13px' }}
            />
          </div>

          {/* Action Buttons: Bluetooth scanning & Open Settings */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button
              onClick={isScanningBle ? stopBleScan : startBleScan}
              style={{ flex: 2, background: isScanningBle ? '#ef4444' : '#20f29b', border: 'none', borderRadius: '10px', padding: '12px', color: '#090d14', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={!home}
            >
              {isScanningBle ? '🛑 停止扫描' : '🔍 扫描附近蓝牙设备'}
            </button>
            <button
              onClick={handleOpenBluetoothSettings}
              style={{ flex: 1, background: 'rgba(0, 230, 255, 0.1)', border: '1px solid rgba(0, 230, 255, 0.3)', borderRadius: '10px', padding: '12px', color: '#00e6ff', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              ⚙️ 蓝牙设置
            </button>
          </div>

          {isScanningBle && (
            <div style={{ textAlign: 'center', padding: '10px 0', color: '#20f29b', fontSize: '12px', animation: 'pulse 1.5s infinite' }}>
              <span>📡 正在监听蓝牙广播信号...</span>
            </div>
          )}

          {/* Discovered BLE devices list */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '5px', maxHeight: '150px', overflowY: 'auto', marginBottom: '16px' }}>
            {discoveredBleDevices.length === 0 ? (
              <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                {isScanningBle ? '暂无发现。请将机器长按Wi-Fi按钮复位至闪烁状态' : '点击扫描以查找附近的蓝牙设备'}
              </div>
            ) : (
              discoveredBleDevices.map((dev, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'white' }}>{dev.name}</strong>
                    <span style={{ color: '#64748b', marginLeft: '6px' }}>({dev.address})</span>
                    <div style={{ fontSize: '10px', color: '#00e6ff' }}>PID: {dev.productId}</div>
                  </div>
                  <button
                    onClick={() => handleBleBind(dev)}
                    style={{ background: '#20f29b', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#090d14', fontWeight: '800', cursor: 'pointer' }}
                    disabled={Boolean(loading)}
                  >
                    一键绑定
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Collapsible Backup Pairing Section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <button
              onClick={() => setShowBackupPairing(!showBackupPairing)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '4px 0', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
            >
              <span>⚠️ 备用配网方案 (AP热点配网)</span>
              <span>{showBackupPairing ? '▲ 收起' : '▼ 展开'}</span>
            </button>

            {showBackupPairing && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  如果蓝牙扫描不到设备，可在此使用热点直连方式（AP模式）或快闪（EZ模式）配网。首选AP热点配网。
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={pairingMode}
                    onChange={e => setPairingMode(e.target.value)}
                    style={{ background: 'rgba(20,27,45,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '12px' }}
                  >
                    <option value="AP">AP 热点配网 (首选备用)</option>
                    <option value="EZ">EZ 快闪配网</option>
                  </select>
                  <button
                    onClick={handleWifiPairing}
                    style={{ flex: 1, background: '#00e6ff', border: 'none', borderRadius: '8px', padding: '9px', color: '#090d14', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
                    disabled={Boolean(loading) || !home}
                  >
                    {loading === 'wifi_pair' ? '备用配网中...' : '启动备用配网'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Devices List */}
        <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#00e6ff', color: '#090d14', fontWeight: '800', fontSize: '14px' }}>3</span>
              <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>第三步：已绑定设备列表</h2>
            </div>
            <button
              onClick={() => refreshDevices(home?.homeId)}
              style={{ background: 'none', border: 'none', color: '#00e6ff', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
              disabled={!home || Boolean(loading)}
            >
              {loading === 'refresh' ? '同步中...' : '🔄 同步刷新'}
            </button>
          </div>

          <div className="tuya-device-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devices.length === 0 ? (
              <div className="tuya-empty" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                当前家庭暂无已绑定设备。请先使用上方配网将鲜食机接入。
              </div>
            ) : (
              devices.map(device => (
                <div
                  key={device.devId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '12px',
                    background: device.devId === selectedDevId ? 'rgba(0,230,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: device.devId === selectedDevId ? '1px solid rgba(0,230,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedDevId(device.devId)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: 'white', fontSize: '14px' }}>{device.name || '未命名设备'}</strong>
                      {(device.productId === 'ak2kofibhuvdtqip' || device.isPetChef) && (
                        <span style={{ fontSize: '9px', background: 'rgba(32,242,155,0.15)', color: '#20f29b', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>鲜食机PID</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' }}>ID: {device.devId}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>PID: {device.productId}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: device.isOnline ? '#20f29b' : '#64748b'
                    }} />
                    <span style={{ fontSize: '12px', color: device.isOnline ? '#20f29b' : '#64748b', fontWeight: '700' }}>
                      {device.isOnline ? '在线' : '离线'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnbind(device.devId);
                      }}
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '4px 10px', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      解绑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Tab Switching for Details Area */}
        {selectedDevice && (
          <div style={{ display: 'flex', background: 'rgba(15,22,38,0.9)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('control')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'control' ? 'rgba(255,255,255,0.08)' : 'transparent', color: activeTab === 'control' ? 'white' : '#94a3b8', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              🎛️ 联调主面板 (DP控制)
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'logs' ? 'rgba(255,255,255,0.08)' : 'transparent', color: activeTab === 'logs' ? 'white' : '#94a3b8', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              💻 实时通信日志 ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'history' ? 'rgba(255,255,255,0.08)' : 'transparent', color: activeTab === 'history' ? 'white' : '#94a3b8', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            >
              🕒 历史操作记录 ({historyRecords.length})
            </button>
          </div>
        )}

        {/* Tab Panel: Control */}
        {selectedDevice && activeTab === 'control' && (
          <div className="animate-fade">
            {/* Real-time DP Status Grid */}
            <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#00e6ff' }}>📊 设备实时数据监视屏 (DP Read)</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>注: 物理操作机器，数据会闪烁上报同步</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {Object.keys(DP_LABELS).map(dpId => {
                  const val = deviceDps[dpId];
                  const hasVal = val !== undefined;
                  const label = DP_LABELS[dpId];
                  const isFlashing = flashingDps[dpId];

                  // Format value
                  let formattedVal = '--';
                  if (hasVal) {
                    if (dpId === '1') formattedVal = val ? '开启' : '关闭';
                    else if (dpId === '3') formattedVal = MODE_MAP[val] || val;
                    else if (dpId === '5') formattedVal = STATUS_MAP[val] || val;
                    else if (dpId === '7' || dpId === '8') formattedVal = formatSeconds(val);
                    else if (typeof val === 'object') formattedVal = JSON.stringify(val);
                    else formattedVal = String(val);
                  }

                  return (
                    <div
                      key={dpId}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: isFlashing ? 'rgba(32,242,155,0.22)' : 'rgba(255,255,255,0.02)',
                        border: isFlashing ? '1px solid #20f29b' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.3s, border 0.3s'
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{label.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label.name}</span>
                        <span style={{ color: '#475569', fontSize: '9px', marginLeft: 'auto' }}>#{dpId}</span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: hasVal ? 'white' : '#475569', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formattedVal}
                        {hasVal && label.unit && <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b', marginLeft: '2px' }}>{label.unit}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Premium DP Control Panel (DP Write) */}
            <section className="tuya-cook-panel" style={{ borderRadius: '16px', padding: '20px', border: '1px solid rgba(32,242,155,0.2)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div className="tuya-flow-eyebrow" style={{ color: '#20f29b' }}>Interactive Controller</div>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '2px 0 0 0' }}>下发烹饪控制配方 (DP Write)</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>电源开关:</span>
                  <button
                    onClick={handleTogglePower}
                    style={{
                      background: deviceDps[1] ? '#ef4444' : '#20f29b',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      color: '#090d14',
                      fontWeight: '800',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {deviceDps[1] ? '物理关机' : '物理开机'}
                  </button>
                </div>
              </div>

              {/* Mode Select */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>烹饪模式 (DP 3)</label>
                  <select
                    value={ctrlMode}
                    onChange={e => setCtrlMode(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  >
                    {Object.keys(MODE_MAP).map(k => (
                      <option key={k} value={k}>{MODE_MAP[k]} ({k})</option>
                    ))}
                  </select>
                </div>

                {/* Speed Select */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>搅拌速度 (DP 108)</label>
                  <select
                    value={ctrlSpeed}
                    onChange={e => setCtrlSpeed(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                  >
                    <option value="0">0 (静止)</option>
                    <option value="L">L (慢速)</option>
                    <option value="1">档位 1</option>
                    <option value="2">档位 2</option>
                    <option value="3">档位 3</option>
                    <option value="4">档位 4</option>
                    <option value="5">档位 5</option>
                    <option value="6">档位 6</option>
                    <option value="7">档位 7</option>
                    <option value="8">档位 8</option>
                    <option value="9">档位 9</option>
                    <option value="10">档位 10 (高速)</option>
                  </select>
                </div>
              </div>

              {/* Temp and Time Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>烹饪温度 (DP 9)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range" min="0" max="120" value={ctrlTemp} onChange={e => setCtrlTemp(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number" value={ctrlTemp} onChange={e => setCtrlTemp(e.target.value)}
                      style={{ width: '55px', padding: '6px', background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textAlign: 'center', fontSize: '12px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>℃</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>烹饪时间 (DP 7)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range" min="1" max="120" value={ctrlTimeMins} onChange={e => setCtrlTimeMins(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number" value={ctrlTimeMins} onChange={e => setCtrlTimeMins(e.target.value)}
                      style={{ width: '55px', padding: '6px', background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textAlign: 'center', fontSize: '12px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>分钟</span>
                  </div>
                </div>
              </div>

              {/* Power Slider */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>加热功率 (DP 102): {ctrlPower} / 10</label>
                <input
                  type="range" min="0" max="10" value={ctrlPower} onChange={e => setCtrlPower(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Action Buttons */}
              <button
                className="tuya-cook-button"
                onClick={startDiyCooking}
                style={{ cursor: 'pointer', border: 'none', borderRadius: '10px', fontWeight: '800' }}
                disabled={Boolean(loading) || !isOnline}
              >
                {loading === 'cook' ? '下发配方参数中...' : !isOnline ? '❌ 设备离线 (无法下发)' : '🚀 下发参数并一键启动烹饪'}
              </button>

              <div className="tuya-cook-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => handleControlCommand('start')} disabled={!isOnline} style={{ background: 'rgba(32,242,155,0.1)', border: '1px solid rgba(32,242,155,0.3)', color: '#20f29b', cursor: 'pointer', borderRadius: '10px', fontWeight: '800', padding: '10px' }}>启动 (start)</button>
                <button onClick={() => handleControlCommand('pause')} disabled={!isOnline} style={{ background: 'rgba(255,211,124,0.1)', border: '1px solid rgba(255,211,124,0.3)', color: '#FFD37C', cursor: 'pointer', borderRadius: '10px', fontWeight: '800', padding: '10px' }}>暂停 (pause)</button>
                <button onClick={() => handleControlCommand('reset')} disabled={!isOnline} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', borderRadius: '10px', fontWeight: '800', padding: '10px' }}>复位 (reset)</button>
              </div>
            </section>

            {/* Raw DP Commander */}
            <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 4px 0', color: '#00e6ff' }}>🛠️ 自定义/未定义 DP 下发 (物理测试必备)</h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>如果工厂添加了新定义的DP，或想下发特定类型的值，可在此单独发送。</p>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="DP ID"
                  value={rawDpId}
                  onChange={e => setRawDpId(e.target.value)}
                  style={{ width: '70px', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                />

                <select
                  value={rawDpType}
                  onChange={e => setRawDpType(e.target.value)}
                  style={{ width: '90px', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                >
                  <option value="bool">布尔 (bool)</option>
                  <option value="value">数值 (value)</option>
                  <option value="enum">枚举 (enum)</option>
                  <option value="raw">原始 (raw)</option>
                </select>

                <input
                  placeholder="DP 写入值"
                  value={rawDpValue}
                  onChange={e => setRawDpValue(e.target.value)}
                  style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '13px' }}
                />

                <button
                  onClick={handleSendRawDp}
                  style={{ background: '#00e6ff', border: 'none', borderRadius: '8px', padding: '10px 16px', color: '#090d14', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                  disabled={!isOnline}
                >
                  发送
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Tab Panel: Logs */}
        {selectedDevice && activeTab === 'logs' && (
          <section className="tuya-flow-log" style={{ background: 'rgba(10,14,23,0.95)', border: '1px solid rgba(0, 230, 255, 0.3)', borderRadius: '16px', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flex: '0 0 auto' }}>
              <strong style={{ color: '#00e6ff', fontSize: '14px' }}>💻 Real-Time Console 日志记录输出</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(logs.join('\n'));
                    alert('日志已成功复制到剪贴板！');
                  }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 10px', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  📋 复制日志
                </button>
                <button
                  onClick={() => setLogs([])}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '4px 10px', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  🧹 清空
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#070a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: '#38bdf8', whiteSpace: 'pre-wrap', boxSizing: 'border-box' }}>
              {logs.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', paddingTop: '100px' }}>暂无通信数据。下发或物理触发设备操作后，通信细节会在这里显示。</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>
        )}

        {/* Tab Panel: History */}
        {selectedDevice && activeTab === 'history' && (
          <section className="tuya-flow-card" style={{ background: 'rgba(20,27,45,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#00e6ff' }}>🕒 Heybo 后端烹饪操作历史记录</h3>
              <button
                onClick={() => loadHistory()}
                style={{ background: 'none', border: 'none', color: '#00e6ff', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
              >
                刷新记录
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {historyRecords.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  暂无云端操作历史，当通过App下发DIY烹饪命令时会自动记录。
                </div>
              ) : (
                historyRecords.map((rec, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #20f29b', borderRadius: '4px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '4px' }}>
                      <span>类型: <strong style={{ color: 'white' }}>{rec.operation_type === 'start_cooking' ? '启动烹饪' : rec.operation_type}</strong></span>
                      <span>{new Date(rec.created_at || rec.started_at).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px', color: '#64748b' }}>
                      <div>温度: <span style={{ color: 'white', fontWeight: '700' }}>{rec.target_temperature_c}℃</span></div>
                      <div>时长: <span style={{ color: 'white', fontWeight: '700' }}>{Math.round(rec.target_time_seconds / 60)}分钟</span></div>
                      <div>功率: <span style={{ color: 'white', fontWeight: '700' }}>{rec.target_power}档</span></div>
                      <div>转速: <span style={{ color: 'white', fontWeight: '700' }}>{rec.target_speed}档</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Global Warning / Message bar */}
        <section className="tuya-flow-log" style={{ background: 'rgba(15,22,38,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '12px 16px', fontSize: '12px' }}>
          <strong style={{ color: '#00e6ff' }}>📢 状态提示：</strong>
          <span style={{ color: '#cbd5e1', lineHeight: '1.4' }}>{message}</span>
        </section>
      </main>
    </div>
  );
}
