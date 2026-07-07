const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_API_BASE = 'https://api.mch.weixin.qq.com';
const APP_ORDER_PATH = '/v3/pay/transactions/app';
const APP_PAY_PACKAGE = 'Sign=WXPay';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function loadConfig() {
  const privateKeyPath = requiredEnv('WECHAT_PAY_PRIVATE_KEY_PATH');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const platformCertPath = process.env.WECHAT_PAY_PLATFORM_CERT_PATH || '';

  return {
    appId: requiredEnv('WECHAT_PAY_APP_ID'),
    mchId: requiredEnv('WECHAT_PAY_MCH_ID'),
    apiV3Key: requiredEnv('WECHAT_PAY_API_V3_KEY'),
    privateKeyPath,
    privateKey,
    certSerialNo: requiredEnv('WECHAT_PAY_CERT_SERIAL_NO'),
    platformCertPath,
    platformCert: platformCertPath ? fs.readFileSync(platformCertPath, 'utf8') : '',
    notifyUrl: requiredEnv('WECHAT_PAY_NOTIFY_URL'),
    apiBase: process.env.WECHAT_PAY_API_BASE || DEFAULT_API_BASE,
    useMock: process.env.WECHAT_PAY_USE_MOCK !== 'false',
  };
}

function loadNotificationConfig() {
  const config = loadConfig();
  if (!config.platformCert) {
    throw new Error('WECHAT_PAY_PLATFORM_CERT_PATH is required for WeChat Pay notification verification');
  }
  return config;
}

function nonce(size = 32) {
  return crypto.randomBytes(size).toString('hex').slice(0, size);
}

function unixTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

function signWithMerchantPrivateKey(privateKey, message) {
  return crypto
    .createSign('RSA-SHA256')
    .update(message, 'utf8')
    .sign(privateKey, 'base64');
}

function createWechatAuthorization({ config, method, path, body, timestamp = unixTimestamp(), nonceStr = nonce() }) {
  const bodyText = body ? JSON.stringify(body) : '';
  const message = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;
  const signature = signWithMerchantPrivateKey(config.privateKey, message);

  return {
    bodyText,
    timestamp,
    nonceStr,
    signature,
    authorization: [
      'WECHATPAY2-SHA256-RSA2048',
      `mchid="${config.mchId}"`,
      `nonce_str="${nonceStr}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${config.certSerialNo}"`,
    ].join(' '),
  };
}

function createOutTradeNo(payment) {
  const suffix = crypto
    .createHash('sha256')
    .update(`${payment.id}:${payment.order_id}:${payment.created_at}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `HB${Date.now()}${suffix}`.slice(0, 32);
}

function buildAppOrderBody({ config, order, payment, outTradeNo }) {
  return {
    appid: config.appId,
    mchid: config.mchId,
    description: `Heybo Pet订单-${order.id}`,
    out_trade_no: outTradeNo,
    notify_url: config.notifyUrl,
    amount: {
      total: payment.amount_cents,
      currency: payment.currency || 'CNY',
    },
  };
}

function buildClientPayload({ config, prepayId }) {
  const timeStamp = unixTimestamp();
  const nonceStr = nonce();
  const signMessage = `${config.appId}\n${timeStamp}\n${nonceStr}\n${prepayId}\n`;
  const sign = signWithMerchantPrivateKey(config.privateKey, signMessage);

  return {
    provider: 'wechat_pay',
    appId: config.appId,
    partnerId: config.mchId,
    prepayId,
    packageValue: APP_PAY_PACKAGE,
    nonceStr,
    timeStamp,
    sign,
  };
}

function getHeader(req, name) {
  return req.get?.(name) || req.headers?.[name.toLowerCase()] || '';
}

function rawBodyText(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (req.body && Object.keys(req.body).length) return JSON.stringify(req.body);
  return '';
}

function verifyWechatNotificationSignature({ config, timestamp, nonceStr, signature, bodyText }) {
  if (!timestamp || !nonceStr || !signature) return false;
  const message = `${timestamp}\n${nonceStr}\n${bodyText}\n`;
  return crypto
    .createVerify('RSA-SHA256')
    .update(message, 'utf8')
    .verify(config.platformCert, signature, 'base64');
}

function decryptResource({ apiV3Key, resource }) {
  if (!resource?.ciphertext || !resource?.nonce) {
    throw new Error('Invalid WeChat Pay notification resource');
  }

  const ciphertext = Buffer.from(resource.ciphertext, 'base64');
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(resource.nonce, 'utf8')
  );

  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
  }
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted);
}

function parseWechatNotification(req, config = loadNotificationConfig()) {
  const bodyText = rawBodyText(req);
  const signatureValid = verifyWechatNotificationSignature({
    config,
    timestamp: getHeader(req, 'wechatpay-timestamp'),
    nonceStr: getHeader(req, 'wechatpay-nonce'),
    signature: getHeader(req, 'wechatpay-signature'),
    bodyText,
  });

  if (!signatureValid) {
    throw new Error('Invalid WeChat Pay notification signature');
  }

  const body = bodyText ? JSON.parse(bodyText) : req.body;
  const transaction = decryptResource({ apiV3Key: config.apiV3Key, resource: body.resource });
  return { body, transaction };
}

async function requestWechatAppPrepay({ config, body }) {
  if (config.useMock) {
    return {
      prepay_id: `mock_prepay_${body.out_trade_no}`,
      mock: true,
    };
  }

  const axios = require('axios');
  const { bodyText, authorization } = createWechatAuthorization({
    config,
    method: 'POST',
    path: APP_ORDER_PATH,
    body,
  });

  const response = await axios.post(`${config.apiBase}${APP_ORDER_PATH}`, bodyText, {
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'HeyboPet/1.0',
    },
    timeout: Number(process.env.WECHAT_PAY_HTTP_TIMEOUT_MS || 10000),
  });

  return response.data;
}

async function createAppPayment({ order, payment }) {
  const config = loadConfig();
  const outTradeNo = payment.out_trade_no || createOutTradeNo(payment);
  const appOrderBody = buildAppOrderBody({ config, order, payment, outTradeNo });
  const prepay = await requestWechatAppPrepay({ config, body: appOrderBody });

  if (!prepay?.prepay_id) {
    throw new Error('WeChat App Pay prepay_id was not returned');
  }

  return {
    outTradeNo,
    prepayId: prepay.prepay_id,
    clientPayload: buildClientPayload({ config, prepayId: prepay.prepay_id }),
    rawPayload: {
      request: {
        appid: appOrderBody.appid,
        mchid: appOrderBody.mchid,
        description: appOrderBody.description,
        out_trade_no: appOrderBody.out_trade_no,
        notify_url: appOrderBody.notify_url,
        amount: appOrderBody.amount,
      },
      response: {
        prepay_id: prepay.prepay_id,
        mock: Boolean(prepay.mock),
      },
    },
  };
}

module.exports = {
  APP_ORDER_PATH,
  APP_PAY_PACKAGE,
  loadConfig,
  loadNotificationConfig,
  createWechatAuthorization,
  createOutTradeNo,
  buildAppOrderBody,
  buildClientPayload,
  verifyWechatNotificationSignature,
  decryptResource,
  parseWechatNotification,
  createAppPayment,
};
