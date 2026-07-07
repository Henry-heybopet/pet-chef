const crypto = require('crypto');
const store = require('./heybo_store');
const wechatPay = require('./wechat_pay');
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
  bank_card: {
    label: '银行卡',
    requiredEnv: [],
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
    label: '信用卡支付 (Stripe Card Payment)',
    requiredEnv: [
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ],
  },
  apple_pay: {
    label: 'Apple Pay',
    requiredEnv: [],
  },
  google_pay: {
    label: 'Google Pay',
    requiredEnv: [],
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

async function createPayment({ userId, orderId, provider, idempotencyKey }) {
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

  if (provider === 'wechat_pay') {
    const appPayment = await wechatPay.createAppPayment({ order, payment });
    const updatedPayment = store.updatePaymentProviderData(payment.id, {
      outTradeNo: appPayment.outTradeNo,
      providerPrepayId: appPayment.prepayId,
      status: 'pending',
      rawPayload: appPayment.rawPayload,
      failureReason: '',
    });

    return {
      payment: updatedPayment,
      readiness,
      client_payload: appPayment.clientPayload,
      message: `${readiness.label}App下单参数已生成`,
    };
  }

  // Stripe 占位：第一阶段海外只接信用卡，配置就绪时在此处接 Stripe PaymentIntent。
  let clientPayload = null;
  if (provider === 'stripe') {
    clientPayload = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      clientSecret: `mock_stripe_intent_sec_${crypto.randomBytes(16).toString('hex')}`,
      ephemeralKey: `mock_stripe_epk_${crypto.randomBytes(16).toString('hex')}`,
      customerId: `mock_stripe_cus_${crypto.randomBytes(8).toString('hex')}`,
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

function mapWechatTradeState(tradeState) {
  if (tradeState === 'SUCCESS') return 'paid';
  if (['CLOSED', 'REVOKED'].includes(tradeState)) return 'cancelled';
  if (tradeState === 'PAYERROR') return 'failed';
  return 'pending';
}

function applyWechatNotification(req) {
  const config = wechatPay.loadNotificationConfig();
  const { transaction } = wechatPay.parseWechatNotification(req, config);
  const payment = store.getPaymentByOutTradeNo(transaction.out_trade_no);
  if (!payment) throw new Error('Payment not found for WeChat out_trade_no');
  if (payment.provider !== 'wechat_pay') throw new Error('Payment provider mismatch');

  const order = store.getOrder(payment.order_id);
  if (!order) throw new Error('Order not found for payment');
  if (transaction.appid !== config.appId) throw new Error('Invalid WeChat appid');
  if (transaction.mchid !== config.mchId) throw new Error('Invalid WeChat mchid');
  if (Number(transaction.amount?.total) !== Number(payment.amount_cents)) {
    throw new Error('Invalid WeChat payment amount');
  }
  if ((transaction.amount?.currency || payment.currency) !== payment.currency) {
    throw new Error('Invalid WeChat payment currency');
  }

  const status = mapWechatTradeState(transaction.trade_state);
  const result = store.updatePaymentStatus(payment.id, status, {
    providerPaymentId: transaction.transaction_id || '',
    failureReason: status === 'failed' ? (transaction.trade_state_desc || 'WeChat payment failed') : '',
  });

  store.updatePaymentProviderData(payment.id, {
    providerPaymentId: transaction.transaction_id || result.payment.provider_payment_id,
    rawPayload: {
      ...(result.payment.raw_payload || {}),
      notify: {
        appid: transaction.appid,
        mchid: transaction.mchid,
        out_trade_no: transaction.out_trade_no,
        transaction_id: transaction.transaction_id || '',
        trade_state: transaction.trade_state,
        trade_state_desc: transaction.trade_state_desc || '',
        amount: transaction.amount || null,
        success_time: transaction.success_time || '',
      },
    },
  });

  return {
    payment: store.getPayment(payment.id),
    order: store.getOrder(payment.order_id),
    transaction,
    status,
  };
}

module.exports = {
  PROVIDERS,
  providerReadiness,
  listProviderReadiness,
  createPayment,
  applyDevelopmentCallback,
  applyWechatNotification,
};
