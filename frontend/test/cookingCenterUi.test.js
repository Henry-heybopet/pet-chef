import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useTranslation } from '../src/i18n/translations.js';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cookingSource = fs.readFileSync(
  path.join(frontendRoot, 'src/components/CookingCenterPage.jsx'),
  'utf8',
);
const customSnackSource = fs.readFileSync(
  path.join(frontendRoot, 'src/components/CustomSnackPage.jsx'),
  'utf8',
);
const recipeMakeSource = fs.readFileSync(
  path.join(frontendRoot, 'src/components/RecipeMake.jsx'),
  'utf8',
);
const translationsSource = fs.readFileSync(
  path.join(frontendRoot, 'src/i18n/translations.js'),
  'utf8',
);
const apiSource = fs.readFileSync(
  path.join(frontendRoot, 'src/api/index.js'),
  'utf8',
);
const stylesSource = fs.readFileSync(
  path.join(frontendRoot, 'src/index.css'),
  'utf8',
);
const nativeBridgeSource = fs.readFileSync(
  path.join(frontendRoot, 'src/native/heyboTuya.js'),
  'utf8',
);
const androidAdapterSource = fs.readFileSync(
  path.join(frontendRoot, 'android/app/src/main/java/com/heybopet/petchef/device/TuyaDeviceAdapterImpl.java'),
  'utf8',
);
const androidCommandSource = fs.readFileSync(
  path.join(frontendRoot, 'android/app/src/main/java/com/heybopet/petchef/device/DeviceCommand.java'),
  'utf8',
);
const androidPluginSource = fs.readFileSync(
  path.join(frontendRoot, 'android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java'),
  'utf8',
);
const iosPluginSource = fs.readFileSync(
  path.join(frontendRoot, 'ios/App/App/HeyboTuyaPlugin.swift'),
  'utf8',
);

test('启动前确认只保留幼童和宠物安全项', () => {
  const checksBlock = cookingSource.match(/const START_CHECKS = \[([\s\S]*?)\];/)?.[1] || '';
  assert.match(checksBlock, /startCheckClearArea/);
  assert.doesNotMatch(checksBlock, /startCheckIngredients|startCheckWater|startCheckLid/);
});

test('烹饪控制指令在 SDK 调用前后都记录通讯事件，日志队列不阻断设备命令', () => {
  const prepareBlock = cookingSource.match(/const handlePrepareCooking = async \(\) => \{([\s\S]*?)\n  \};/)?.[1] || '';
  const startBlock = cookingSource.match(/const handleStartCooking = async \(\) => \{([\s\S]*?)\n  \};/)?.[1] || '';
  assert.match(prepareBlock, /107: 'reset_requested'/);
  assert.match(prepareBlock, /HeyboTuya\.resetCooking/);
  assert.match(prepareBlock, /107: 'reset_sent'/);
  assert.match(startBlock, /107: 'start_requested'/);
  assert.match(startBlock, /HeyboTuya\.startDiyCooking/);
  assert.match(startBlock, /107: 'start_sent'/);
  assert.doesNotMatch(prepareBlock, /await reportDeviceCommunication/);
  assert.doesNotMatch(startBlock, /await reportDeviceCommunication/);
  assert.match(cookingSource, /console\.warn\('Device communication log failed:'/);
  assert.match(cookingSource, /const deviceCommunicationFlushRef = useRef\(new Map\(\)\)/);
  assert.match(cookingSource, /const enqueueDeviceCommunication = \(devId, send\) =>/);
});

test('一键烹饪使用整幅设备图且不显示工程数据面板', () => {
  assert.match(cookingSource, /<div className="cooking-lux-panel">[\s\S]*?src="\/machine\.jpg"/);
  assert.doesNotMatch(cookingSource, /className="cooking-lux-metrics"/);
});

test('一键烹饪提示按启动前、烹饪中和完成三种状态显示动态文案', () => {
  const guidanceBlock = cookingSource.match(/const cookingGuidanceKey[\s\S]*?<div className="cooking-lux-steps">[\s\S]*?<\/div>/)?.[0] || '';
  assert.match(guidanceBlock, /isDone/);
  assert.match(guidanceBlock, /isActive/);
  assert.match(guidanceBlock, /cookingGuidanceBeforeStart/);
  assert.match(guidanceBlock, /\{ pet: petName, grams: servingGrams, recipe: recipeName \}/);
  assert.doesNotMatch(guidanceBlock, /cookingTemperature|cookingTime|cookingSpeed|cookingPower/);
  assert.match(translationsSource, /'cookingGuidanceBeforeStart'/);
  assert.match(translationsSource, /即将制作\{grams\}克\{recipe\}健康鲜食，放入食材和对应的水后（请勿放入全价营养包），请点击下方一键烹饪按钮。/);
  assert.match(translationsSource, /正在制作\{grams\}克\{recipe\}健康鲜食，请注意鲜食杯体和杯盖蒸汽孔位置高温，小心烫伤。/);
  assert.match(translationsSource, /完成\{recipe\}健康鲜食制作，请先打开蒸汽孔排气，再打开杯盖，小心烫伤。全价营养包需最后拌入宠物食碗中。/);
});

test('八种语言的烹饪文案使用同一组新语义和占位符', () => {
  for (const lang of ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko']) {
    const t = useTranslation(lang);
    const params = { pet: 'PET_SENTINEL', grams: 321, recipe: 'RECIPE_SENTINEL' };
    const before = t('cookingGuidanceBeforeStart', params);
    const active = t('cookingGuidanceActive', params);
    const done = t('cookingGuidanceDone', params);

    assert.match(before, /321/);
    assert.match(active, /321/);
    assert.doesNotMatch(done, /321/);
    assert.match(before, /RECIPE_SENTINEL/);
    assert.match(active, /RECIPE_SENTINEL/);
    assert.match(done, /RECIPE_SENTINEL/);
    assert.doesNotMatch(before, /PET_SENTINEL/);
    assert.doesNotMatch(active, /PET_SENTINEL/);
    assert.doesNotMatch(done, /PET_SENTINEL/);
    assert.doesNotMatch(`${before}${active}${done}`, /\{(?:grams|recipe|pet)\}/);
  }
});

test('鲜食机暂停状态使用只读的烹饪暂停中状态文案', () => {
  const t = useTranslation('zh');
  assert.equal(t('deviceStatusPaused'), '烹饪暂停中');
});

test('杯盖故障文案不显示 E01 代码', () => {
  const lidFaultLine = translationsSource.match(/'deviceFaultLid': \[([^\n]+)\]/)?.[1] || '';
  assert.match(lidFaultLine, /鲜食杯盖子没有盖好/);
  assert.doesNotMatch(lidFaultLine, /E01/);
});

test('喂食反馈保存后可读回并显示已反馈状态与反馈内容', () => {
  assert.match(apiSource, /listFeedingRecords:.*\/api\/feeding-records/);
  assert.match(cookingSource, /setFeedingRecords\(feedingResult\.records \|\| \[\]\)/);
  assert.match(cookingSource, /feedback \? t\('feedbackSubmitted'\) : t\('feedingFeedback'\)/);
  assert.match(cookingSource, /feedback\.palatability/);
  assert.match(cookingSource, /feedback\.stool_status/);
});

test('烹饪中心主图文字使用高对比浅色', () => {
  assert.match(stylesSource, /\.cooking-hero-copy h1\s*\{[^}]*color:\s*#fff/s);
  assert.match(stylesSource, /\.cooking-hero-copy p\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/s);
});

test('浅色主题下 Wi-Fi 密码圆点、明文和光标使用可见颜色', () => {
  assert.match(
    stylesSource,
    /\.cooking-wifi-input,\s*\.cooking-password-row input,[\s\S]*?color:\s*var\(--theme-text-primary\)\s*!important;/,
  );
  assert.match(
    stylesSource,
    /\.cooking-password-row input\s*\{[^}]*caret-color:\s*var\(--theme-fresh\)/s,
  );
});

test('王牌优品宠物鲜食按每份100克提供1至8份', () => {
  const titleLine = translationsSource.match(/'customAmount': \[([^\n]+)\]/)?.[1] || '';
  const descriptionLine = translationsSource.match(/'freshPackDesc': \[([^\n]+)\]/)?.[1] || '';
  assert.match(titleLine, /王牌优品宠物鲜食/);
  assert.doesNotMatch(titleLine, /王牌优品鲜食包/);
  assert.match(descriptionLine, /每份100克，可选1-8份/);
  assert.match(recipeMakeSource, /packCount \* 100/);
  assert.match(recipeMakeSource, /Array\.from\(\{ length: 8 \}/);
  assert.match(recipeMakeSource, /count \* 100/);
  assert.match(recipeMakeSource, /packGrams: 100/);
});

test('一键烹饪总时长不再叠加历史预热时间', () => {
  assert.doesNotMatch(cookingSource, /legacyPreheatMinutes/);
  assert.match(cookingSource, /Number\(cookMinutes\) \* 60/);
});

test('APP只保留一键启动，不再提供暂停恢复或长按停止命令', () => {
  assert.match(cookingSource, /const handleStartCooking = async \(\) =>/);
  assert.match(cookingSource, /HeyboTuya\.startDiyCooking\(/);
  assert.doesNotMatch(cookingSource, /handlePauseCooking|handleResumeCooking|handleStopCooking/);
  assert.doesNotMatch(cookingSource, /HeyboTuya\.pauseCooking|resumeOrHoldStop|onPointerDown/);
  assert.match(cookingSource, /className=\{`cooking-device-status cooking-device-status-\$\{displayStatusCode\}`\}/);
  assert.match(nativeBridgeSource, /await this\.publishDps\(\{ devId, dps \}\);\s*await this\.publishDps\(\{ devId, dps: \{ 107: 'start' \} \}\);/);
  assert.match(androidCommandSource, /dps\.put\(DP_COOK_TIME, cookTime\)/);
  assert.doesNotMatch(androidCommandSource, /dps\.put\(DP_COOK_START_PAUSE_RESET, "start"\)/);
  assert.match(androidAdapterSource, /publishDps\(DeviceCommand\.diyCooking[\s\S]*?publishDps\(DeviceCommand\.cookingAction\(devId, "start"\), callback\)/);
});

test('鲜食杯故障只展示和阻止启动，不由APP发送暂停命令', () => {
  assert.match(cookingSource, /function isCupMissingFault\(dps\)/);
  assert.match(cookingSource, /const hasCupMissingFault = isCupMissingFault\(deviceDps\)/);
  assert.match(cookingSource, /startSending \|\| hasCupMissingFault \|\| !hasRecipe/);
  assert.doesNotMatch(cookingSource, /cupFaultPauseRef|faultRemainingSeconds|pauseCooking/);
});

test('状态只读取DP5，倒计时只显示DP8，不使用手机定时器插值', () => {
  assert.match(cookingSource, /const displayStatusCode = view\.statusCode/);
  assert.match(cookingSource, /const rawRemaining = deviceDps\[8\]/);
  assert.match(cookingSource, /hasReportedRemaining \? formatCountdown\(remainingSeconds\) : '--:--'/);
  assert.match(cookingSource, /displayStatusCode === 'cooking'/);
  assert.match(cookingSource, /displayStatusCode === 'pause'/);
  assert.match(cookingSource, /displayStatusCode === 'done'/);
  assert.doesNotMatch(cookingSource, /setInterval\(\(\) => setNowTick|runStartedAt|runElapsedMs|shouldAutoCompleteCooking/);
  assert.doesNotMatch(cookingSource, /const doneDps|5: 'done'|5: 'standby'/);
});

test('运行中锁定启动时的食谱展示，但不让缓存决定设备状态', () => {
  assert.match(cookingSource, /const activeRuntime = readCookingRuntime\(selectedDevice\?\.devId\)/);
  assert.match(cookingSource, /const runtimeOwnsDisplay = Boolean\(/);
  assert.match(cookingSource, /name: activeRuntime\.recipeName/);
  assert.match(cookingSource, /isCustomSnack: activeRuntime\.isCustomSnack/);
  assert.match(cookingSource, /saveCookingRuntime\(selectedDevice\.devId/);
  assert.match(cookingSource, /nativeDpSeenRef = useRef\(new Set\(\)\)/);
  assert.match(cookingSource, /nativeDpSeenRef\.current\.has\(device\.devId\)/);
  assert.doesNotMatch(cookingSource, /resolveCookingDisplayState|START_STATUS_FENCE_MS|preservePendingStart/);
});

test('订阅后仅用首个原生DP快照校正缓存，实时回调不可被快照覆盖', () => {
  assert.match(cookingSource, /HeyboTuya\.addListener\('dpUpdate'[,\s\S]*?return HeyboTuya\.subscribeDevice\(\{ devId \}\);[\s\S]*?\.then\(\(\) => HeyboTuya\.getDeviceDpState\(\{ devId \}\)\)/);
  assert.doesNotMatch(cookingSource, /hasCookingStatusDps/);
  assert.match(cookingSource, /Object\.keys\(nextDps\)\.length === 0\) return false;/);
  assert.match(cookingSource, /source === 'snapshot' && receivedRealtimeUpdate/);
  assert.match(cookingSource, /applyNativeDps\(event\.dps, 'realtime'\)/);
  assert.match(cookingSource, /applyNativeDps\(result\?\.dps, 'snapshot'\)/);
  assert.match(cookingSource, /void syncNativeDpsToBackend\(devId, nextDps, selectedDevice\?\.isOnline\)/);
  assert.doesNotMatch(cookingSource, /dps:\s*mergedDps,\s*reported_at/);
  assert.match(cookingSource, /nativeDpSeenRef\.current\.add\(devId\)/);
  assert.match(cookingSource, /if \(state === 'standby'\) \{[\s\S]*?clearCookingRuntime\(devId\);/);
  assert.match(nativeBridgeSource, /async getDeviceDpState\(\{ devId \}\)/);
  assert.match(androidPluginSource, /public void getDeviceDpState\(PluginCall call\)/);
  assert.match(androidAdapterSource, /getDeviceStatus\(devId, result -> \{/);
  assert.doesNotMatch(androidAdapterSource, /Map<String, Object> cached = dpsCache\.get\(devId\);[\s\S]*?getDeviceStatus\(devId/);
  assert.match(iosPluginSource, /@objc func getDeviceDpState\(_ call: CAPPluginCall\)/);
  assert.match(androidAdapterSource, /listener\.onDpUpdate\(updatedDevId, new HashMap<>\(dps\)\)/);
  assert.doesNotMatch(androidAdapterSource, /listener\.onDpUpdate\(updatedDevId, new HashMap<>\(merged\)\)/);
});

test('设备列表只登记元数据，不用发现快照覆盖订阅后的实时DP', () => {
  const registrationBlock = cookingSource.match(/const registerBoundDevice = async \(device, refreshAfter = true\) => \{([\s\S]*?)\n  \};/)?.[1] || '';
  assert.match(registrationBlock, /Device-list DP data is only a discovery snapshot/);
  assert.doesNotMatch(registrationBlock, /api\.syncDeviceDp/);
});

test('完成确认仅向设备请求复位，并等待DP5待机回报切换页面', () => {
  assert.match(cookingSource, /displayStatusCode === 'done' \? \([\s\S]*?deviceStatusDone/);
  assert.match(cookingSource, /const handleCompleteCooking = async \(\) => \{[\s\S]*?HeyboTuya\.resetCooking\(\{ devId: selectedDevice\.devId \}\)/);
  assert.doesNotMatch(cookingSource, /handleCompleteCooking[\s\S]{0,700}5:\s*'standby'/);
});

test('启动先复位、确认后才下发参数与 start，并记录通讯命令', () => {
  assert.match(cookingSource, /const handlePrepareCooking = async \(\) => \{[\s\S]*?HeyboTuya\.resetCooking\([\s\S]*?setStartConfirmOpen\(true\)/);
  assert.match(cookingSource, /const handleStartCooking = async \(\) => \{[\s\S]*?107: 'start_requested'[\s\S]*?HeyboTuya\.startDiyCooking\([\s\S]*?107: 'start_sent'/);
  assert.doesNotMatch(cookingSource, /handleStartCooking[\s\S]{0,1400}HeyboTuya\.resetCooking/);
  assert.match(cookingSource, /api\.recordDeviceCommunication/);
});

test('零食自制提供完整参数并复用启动前确认流程', () => {
  assert.match(customSnackSource, /const \[blade, setBlade\] = useState\(1\)/);
  assert.match(customSnackSource, /min=\{40\}[\s\S]*max=\{120\}/);
  assert.match(customSnackSource, /min=\{1\}[\s\S]*max=\{10\}/);
  assert.match(customSnackSource, /setDuration\(600\)/);
  assert.match(customSnackSource, /setDuration\(1080\)/);
  assert.match(customSnackSource, /setDuration\(1440\)/);
  assert.match(customSnackSource, /function TimeWheelColumn/);
  assert.match(customSnackSource, /className="custom-snack-duration custom-snack-time-wheel"/);
  assert.match(customSnackSource, /scrollTo\(\{ top: nextValue \* TIME_WHEEL_ROW_HEIGHT, behavior: 'smooth' \}\)/);
  assert.doesNotMatch(customSnackSource, /<DialStepper compact/);
  assert.match(stylesSource, /\.custom-snack-time-wheel-scroll\s*\{[^}]*scroll-snap-type:\s*y mandatory/s);
  assert.match(customSnackSource, /custom-snack-table-row is-header/);
  assert.match(customSnackSource, /custom-snack-tip/);
  assert.match(customSnackSource, /customSnackSuggestedDuration/);
  assert.doesNotMatch(customSnackSource, /custom-snack-guide-row/);
  assert.match(customSnackSource, /power: 8/);
  assert.match(customSnackSource, /isCustomSnack: true/);
  assert.match(customSnackSource, /autoStart: true/);
  assert.match(cookingSource, /recipeContext\?\.autoStart/);
  assert.match(cookingSource, /setStartConfirmOpen\(true\)/);
  assert.match(translationsSource, /'customSnack'/);
});

test('零食自制必须保存宠物、食材和克重，并在启动前使用现有鲜食验证估算能量', () => {
  assert.match(customSnackSource, /profiles = \[\], authToken, onAddPet/);
  assert.match(customSnackSource, /pet_id: pet\.id/);
  assert.match(customSnackSource, /ingredients: snackIngredients/);
  assert.match(customSnackSource, /meal_intent: 'snack'/);
  assert.match(customSnackSource, /api\.freshCheckAnalyze/);
  assert.match(customSnackSource, /snackIngredients: result\.recipe\?\.ingredients \|\| snackIngredients/);
  assert.match(customSnackSource, /estimatedEnergy:/);
  assert.match(customSnackSource, /custom-snack-ingredient-row/);
  assert.match(cookingSource, /is_custom_snack: Boolean\(recipeContext\?\.isCustomSnack\)/);
  assert.match(cookingSource, /ingredients_snapshot: recipeContext\?\.snackIngredients/);
  assert.match(cookingSource, /cooking-record-snack-ingredients/);
});

test('零食反馈要求实际喂食克数，后端可读取每日估算能量', () => {
  assert.match(cookingSource, /const isCustomSnack = Boolean\(record\.operation\?\.is_custom_snack\)/);
  assert.match(cookingSource, /amount_g: feedback\.amountG/);
  assert.match(apiSource, /getDailyFeedingEnergy/);
  assert.match(translationsSource, /'actualFeedingAmount'/);
  assert.match(translationsSource, /'estimatedEnergy'/);
});

test('多台鲜食机从一键烹饪进入时必须先选择设备', () => {
  assert.match(cookingSource, /function DeviceSelectionModal/);
  assert.match(cookingSource, /if \(devices\.length === 1\)/);
  assert.match(cookingSource, /setDevicePickerOpen\(true\)/);
  assert.match(cookingSource, /setSelectedDevId\(device\.devId \|\| device\.tuya_device_id\)/);
  assert.doesNotMatch(cookingSource, /if \(recipeContext && selectedDevice && !detailDevice\) setDetailDevice\(selectedDevice\)/);
});

test('设备名称可编辑并同步Web、Android和iOS Tuya SDK', () => {
  assert.match(cookingSource, /function RenameDeviceModal/);
  assert.match(cookingSource, /HeyboTuya\.renameDevice\(\{ devId, name \}\)/);
  assert.match(cookingSource, /api\.registerDevice\(\{ tuya_device_id: devId, device_name: name \}/);
  assert.match(nativeBridgeSource, /async renameDevice\(\{ devId, name \}\)/);
  assert.match(androidPluginSource, /device\.renameDevice\(trimmedName/);
  assert.match(iosPluginSource, /device\.updateName\(name/);
});

test('鲜食机弹窗高于底部导航且配网结果可滚动到选定按钮', () => {
  assert.match(stylesSource, /\.cooking-sheet-mask\s*\{[^}]*z-index:\s*1100/s);
  assert.match(stylesSource, /\.bottom-tab-bar\s*\{[^}]*z-index:\s*900/s);
  assert.match(stylesSource, /\.cooking-pairing-sheet\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(stylesSource, /\.cooking-pairing-sheet\s*\{[^}]*scroll-padding-bottom:/s);
});

test('修改鲜食机名称的取消和保存按钮使用相同尺寸', () => {
  assert.match(stylesSource, /\.cooking-rename-card\s*>\s*div\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesSource, /\.cooking-rename-card\s*>\s*div\s+\.cooking-center-btn\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px[^}]*margin-top:\s*0/s);
});
