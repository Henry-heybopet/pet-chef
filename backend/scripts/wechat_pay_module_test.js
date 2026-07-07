const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const store = require('../src/services/heybo_store');
const paymentService = require('../src/services/payment');

function generateRsaPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function writeTempPem(name, content) {
  const file = path.join(os.tmpdir(), name);
  fs.writeFileSync(file, content);
  return file;
}

function setWechatMockEnv({ merchantPrivateKeyPath, platformPublicKeyPath }) {
  process.env.WECHAT_PAY_APP_ID = 'wx_module_test_app';
  process.env.WECHAT_PAY_MCH_ID = '1900000001';
  process.env.WECHAT_PAY_API_V3_KEY = '0123456789abcdef0123456789abcdef';
  process.env.WECHAT_PAY_PRIVATE_KEY_PATH = merchantPrivateKeyPath;
  process.env.WECHAT_PAY_CERT_SERIAL_NO = 'MODULETESTSERIAL';
  process.env.WECHAT_PAY_PLATFORM_CERT_PATH = platformPublicKeyPath;
  process.env.WECHAT_PAY_NOTIFY_URL = 'https://api.example.com/api/payments/wechat/notify';
  process.env.WECHAT_PAY_USE_MOCK = 'true';
}

function encryptWechatResource(apiV3Key, data) {
  const nonce = 'notifytest123';
  const associatedData = 'transaction';
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'));
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: 'AEAD_AES_256_GCM',
    associated_data: associatedData,
    nonce,
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
  };
}

function createSignedWechatNotifyRequest({ platformPrivateKey, transaction }) {
  const body = {
    id: 'evt_module_test',
    create_time: '2026-06-26T12:00:01+08:00',
    event_type: 'TRANSACTION.SUCCESS',
    resource_type: 'encrypt-resource',
    resource: encryptWechatResource(process.env.WECHAT_PAY_API_V3_KEY, transaction),
    summary: '支付成功',
  };
  const bodyText = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = 'module-test-notify-nonce';
  const signatureMessage = `${timestamp}\n${nonce}\n${bodyText}\n`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signatureMessage)
    .sign(platformPrivateKey, 'base64');

  return {
    rawBody: Buffer.from(bodyText),
    headers: {
      'wechatpay-timestamp': timestamp,
      'wechatpay-nonce': nonce,
      'wechatpay-signature': signature,
    },
    get(name) {
      return this.headers[String(name).toLowerCase()] || '';
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const merchantPair = generateRsaPair();
  const platformPair = generateRsaPair();
  const merchantPrivateKeyPath = writeTempPem('heybo_wechat_module_merchant_private.pem', merchantPair.privateKey);
  const platformPublicKeyPath = writeTempPem('heybo_wechat_module_platform_public.pem', platformPair.publicKey);
  setWechatMockEnv({ merchantPrivateKeyPath, platformPublicKeyPath });

  store.resetForTests();
  try {
    const login = store.loginOrCreateUser({
      login: 'wechat-module-test@example.com',
      provider: 'email',
      displayName: 'WeChat Module Test',
    });
    const orderResult = store.createOrder(login.user.id, {
      items: [{ product_id: 'test_meat_pack_1', quantity: 2 }],
    });
    const created = await paymentService.createPayment({
      userId: login.user.id,
      orderId: orderResult.order.id,
      provider: 'wechat_pay',
      idempotencyKey: 'wechat-module-test-1',
    });

    assert(created.payment.status === 'pending', 'payment should be pending after mock prepay');
    assert(created.payment.out_trade_no, 'out_trade_no should be saved');
    assert(created.payment.provider_prepay_id, 'provider_prepay_id should be saved');
    assert(created.client_payload?.prepayId, 'client_payload.prepayId should be returned');
    assert(created.client_payload?.packageValue === 'Sign=WXPay', 'client_payload.packageValue should be Sign=WXPay');

    const transaction = {
      appid: process.env.WECHAT_PAY_APP_ID,
      mchid: process.env.WECHAT_PAY_MCH_ID,
      out_trade_no: created.payment.out_trade_no,
      transaction_id: '4200000000202606260000000001',
      trade_state: 'SUCCESS',
      trade_state_desc: '支付成功',
      amount: {
        total: created.payment.amount_cents,
        currency: created.payment.currency,
      },
      success_time: '2026-06-26T12:00:00+08:00',
    };

    const notifyReq = createSignedWechatNotifyRequest({
      platformPrivateKey: platformPair.privateKey,
      transaction,
    });
    const notifyResult = paymentService.applyWechatNotification(notifyReq);
    const finalPayment = store.getPayment(created.payment.id);
    const finalOrder = store.getOrder(orderResult.order.id);

    assert(notifyResult.status === 'paid', 'notify result should map SUCCESS to paid');
    assert(finalPayment.status === 'paid', 'payment should be paid after notification');
    assert(finalOrder.payment_status === 'paid', 'order payment_status should be paid after notification');
    assert(finalOrder.status === 'paid', 'order status should be paid after notification');
    assert(finalPayment.provider_payment_id === transaction.transaction_id, 'transaction_id should be saved');

    paymentService.applyWechatNotification(notifyReq);
    const duplicatePayment = store.getPayment(created.payment.id);
    assert(duplicatePayment.status === 'paid', 'duplicate notification should keep payment paid');

    console.log(JSON.stringify({
      success: true,
      order_id: finalOrder.id,
      payment_id: finalPayment.id,
      out_trade_no: finalPayment.out_trade_no,
      prepay_id: finalPayment.provider_prepay_id,
      transaction_id: finalPayment.provider_payment_id,
      payment_status: finalPayment.status,
      order_payment_status: finalOrder.payment_status,
      client_payload_keys: Object.keys(created.client_payload || {}),
    }, null, 2));
  } finally {
    store.resetForTests();
  }
}

run().catch(error => {
  try {
    store.resetForTests();
  } catch {}
  console.error(error);
  process.exit(1);
});
