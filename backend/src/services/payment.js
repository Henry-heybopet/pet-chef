const crypto = require('crypto');
const store = require('./heybo_store');

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
  return Object.keys(PROVIDERS).map(providerReadiness);
}

function assertOrderPayable(order, userId) {
  if (!order || order.user_id !== userId) throw new Error('Order not found');
  if (order.payment_status === 'paid') throw new Error('Order already paid');
  if (['cancelled', 'refunded'].includes(order.status)) throw new Error('Order is not payable');
}

function createPayment({ userId, orderId, provider, idempotencyKey }) {
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

  // Provider SDK calls are intentionally isolated here. Once merchant accounts
  // are approved, replace this placeholder with WeChat App Pay / Alipay APP SDK.
  return {
    payment,
    readiness,
    client_payload: null,
    message: `${readiness.label}配置已就绪，支付下单适配器待启用`,
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
