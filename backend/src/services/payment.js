const crypto = require('crypto');
const store = require('./heybo_store');
const wechatPay = require('./wechat_pay');

const PROVIDERS = Object.freeze({
  wechat_pay: {
    label: '微信支付',
    requiredEnv: [
      'WECHAT_PAY_APP_ID',
      'WECHAT_PAY_MCH_ID',
      'WECHAT_PAY_API_V3_KEY',
      'WECHAT_PAY_PRIVATE_KEY_PATH',
      'WECHAT_PAY_CERT_SERIAL_NO',
      'WECHAT_PAY_PLATFORM_CERT_PATH',
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

async function createPayment({ userId, orderId, provider, idempotencyKey }) {
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
    order,
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
