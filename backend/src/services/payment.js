const crypto = require('crypto');
const store = require('./heybo_store');
const { getRegionConfig } = require('../config/region_config');

const PROVIDERS = Object.freeze({
  wechat_pay: {
    label: '微信支付',
    requiredEnv: [
      'WECHAT_PAY_APP_ID',
      'WECHAT_PAY_MCH_ID',
      'WECHAT_PAY_API_V3_KEY',
      'WECHAT_PAY_PRIVATE_KEY_PATH',
      'WECHAT_PAY_CERT_SERIAL_NO',
      'WECHAT_PAY_NOTIFY_URL',
    ],
  },
  alipay: {
    label: '支付宝',
    requiredEnv: [
      'ALIPAY_APP_ID',
      'ALIPAY_PRIVATE_KEY_PATH',
      'ALIPAY_PUBLIC_KEY_PATH',
      'ALIPAY_NOTIFY_URL',
    ],
  },
  stripe: {
    label: 'Stripe 支付',
    requiredEnv: [
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ],
  },
  paypal: {
    label: 'PayPal 支付',
    requiredEnv: [
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_MODE',
    ],
  },
});

function providerReadiness(provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('Unsupported payment provider');
  const missing = config.requiredEnv.filter(name => !process.env[name]);
  return {
    provider,
    label: config.label,
    configured: missing.length === 0,
    missing,
  };
}

function listProviderReadiness() {
  const regionConfig = getRegionConfig();
  // 只返回当前区域支持的支付方式的就绪状态
  return regionConfig.payment.providers.map(providerReadiness);
}

function assertOrderPayable(order, userId) {
  if (!order || order.user_id !== userId) throw new Error('Order not found');
  if (order.payment_status === 'paid') throw new Error('Order already paid');
  if (['cancelled', 'refunded'].includes(order.status)) throw new Error('Order is not payable');
}

function createPayment({ userId, orderId, provider, idempotencyKey }) {
  const regionConfig = getRegionConfig();

  // 1. 验证当前区域是否支持该支付渠道
  if (!regionConfig.payment.providers.includes(provider)) {
    throw new Error(`支付渠道 "${provider}" 在当前区域 (${regionConfig.name}) 不受支持`);
  }

  const readiness = providerReadiness(provider);
  const order = store.getOrder(orderId);
  assertOrderPayable(order, userId);

  const payment = store.createPayment({
    userId,
    order,
    provider,
    idempotencyKey,
    status: readiness.configured ? 'pending' : 'configuration_pending',
  });

  if (!readiness.configured) {
    return {
      payment,
      readiness,
      client_payload: null,
      message: `${readiness.label}商户参数尚未配置`,
    };
  }

  // Stripe & PayPal 占位：当配置就绪时，在此处调用 Stripe / PayPal SDK 并组装 Client Payload
  let clientPayload = null;
  if (provider === 'stripe') {
    clientPayload = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      clientSecret: `mock_stripe_intent_sec_${crypto.randomBytes(16).toString('hex')}`,
      ephemeralKey: `mock_stripe_epk_${crypto.randomBytes(16).toString('hex')}`,
      customerId: `mock_stripe_cus_${crypto.randomBytes(8).toString('hex')}`,
    };
  } else if (provider === 'paypal') {
    clientPayload = {
      orderId: `mock_paypal_order_${crypto.randomBytes(12).toString('hex')}`,
      mode: process.env.PAYPAL_MODE || 'sandbox',
    };
  }

  return {
    payment,
    readiness,
    client_payload: clientPayload,
    message: `${readiness.label}配置已就绪，已生成支付凭证`,
  };
}

function verifyDevelopmentCallback(req) {
  if (process.env.PAYMENT_MOCK_ENABLED !== 'true') return false;
  const expected = process.env.PAYMENT_MOCK_SECRET || '';
  const received = req.get('x-heybo-payment-mock-secret') || '';
  if (!expected || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function applyDevelopmentCallback(req) {
  if (!verifyDevelopmentCallback(req)) throw new Error('Invalid payment callback');
  const { payment_id: paymentId, status, provider_payment_id: providerPaymentId } = req.body || {};
  if (!paymentId || !['paid', 'failed', 'cancelled'].includes(status)) {
    throw new Error('Invalid payment callback payload');
  }
  return store.updatePaymentStatus(paymentId, status, { providerPaymentId });
}

module.exports = {
  PROVIDERS,
  providerReadiness,
  listProviderReadiness,
  createPayment,
  applyDevelopmentCallback,
};
