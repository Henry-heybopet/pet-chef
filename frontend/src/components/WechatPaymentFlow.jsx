import React, { useEffect, useRef, useState } from 'react';
import TopBar from './TopBar';
import { api } from '../api';
import NativeCapabilities from '../native/capabilities';

const PAYMENT_PROVIDER = 'wechat_pay';
const TERMINAL_STATUSES = new Set(['paid', 'failed', 'cancelled', 'refunded']);

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pay_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function money(cents = 0, currency = 'CNY') {
  const amount = Number(cents || 0) / 100;
  return `${currency === 'CNY' ? '¥' : currency + ' '}${amount.toFixed(2)}`;
}

function statusLabel(status) {
  const labels = {
    configuration_pending: '微信支付尚未配置',
    pending: '支付结果确认中',
    authorized: '支付授权中',
    paid: '支付成功',
    failed: '支付失败',
    cancelled: '已取消支付',
    refunded: '已退款',
  };
  return labels[status] || status || '未知状态';
}

export default function WechatPaymentFlow({ onBack }) {
  const [loginInput, setLoginInput] = useState('wechat-pay-test@example.com');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [nativeResult, setNativeResult] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('先登录测试账号，然后创建测试订单并发起微信支付。');
  const pollTimerRef = useRef(null);
  const pollAttemptsRef = useRef(0);

  const selectedProduct = products.find(product => product.id === selectedProductId) || products[0] || null;

  useEffect(() => {
    refreshProviderStatus();
    loadProducts();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const setBusy = async (label, action) => {
    setLoading(label);
    try {
      return await action();
    } catch (error) {
      setMessage(error?.message || '操作失败，请稍后重试。');
      throw error;
    } finally {
      setLoading('');
    }
  };

  const refreshProviderStatus = async () => {
    try {
      const result = await api.getPaymentProviders();
      const wechat = result?.providers?.find(item => item.provider === PAYMENT_PROVIDER);
      setProviderStatus(wechat || null);
    } catch (error) {
      console.warn('Load payment providers failed:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const result = await api.getProducts();
      const nextProducts = Array.isArray(result?.products) ? result.products : [];
      setProducts(nextProducts);
      setSelectedProductId(current => current || nextProducts[0]?.id || '');
    } catch (error) {
      console.warn('Load products failed:', error);
    }
  };

  const handleLogin = async () => {
    const login = loginInput.trim();
    if (!login) {
      setMessage('请输入测试账号手机号或 Email。');
      return;
    }

    await setBusy('login', async () => {
      setMessage('正在登录 Heybo 测试账号...');
      const result = await api.heyboMockLogin({
        login,
        provider: login.includes('@') ? 'email' : 'phone',
      });
      if (!result?.success) throw new Error(result?.error || '登录失败');
      setToken(result.token);
      setUser(result.user);
      setOrder(null);
      setPayment(null);
      setNativeResult(null);
      setMessage('登录完成，可以创建测试订单。');
    });
  };

  const handleCreateOrder = async () => {
    if (!token) {
      setMessage('请先登录测试账号。');
      return;
    }
    if (!selectedProduct) {
      setMessage('没有可用测试商品，请先确认后端 products 接口。');
      return;
    }

    await setBusy('order', async () => {
      stopPolling();
      setMessage('正在创建测试订单...');
      const result = await api.createOrder({
        items: [{ product_id: selectedProduct.id, quantity: 1 }],
      }, token);
      if (!result?.success) throw new Error(result?.error || '创建订单失败');
      setOrder(result.order);
      setPayment(null);
      setNativeResult(null);
      setMessage(`订单已创建：${result.order.id}，可以点击微信支付。`);
    });
  };

  const handleWechatPay = async () => {
    if (!token || !order?.id) {
      setMessage('请先登录并创建订单。');
      return;
    }

    await setBusy('pay', async () => {
      stopPolling();
      setNativeResult(null);
      setMessage('正在向后端创建微信支付...');
      const result = await api.createPayment({
        order_id: order.id,
        provider: PAYMENT_PROVIDER,
      }, token, createIdempotencyKey());

      if (result?.payment) setPayment(result.payment);

      if (result?.payment?.status === 'configuration_pending' || result?.readiness?.configured === false) {
        setMessage('微信支付尚未配置：请检查商户号、AppID、私钥、平台证书和通知地址。');
        return;
      }

      if (!result?.success || !result?.client_payload) {
        throw new Error(result?.error || result?.message || '后端未返回微信支付参数');
      }

      setMessage('正在调起微信客户端...');
      const nativePayResult = await NativeCapabilities.payments.wechatPay(result.client_payload);
      setNativeResult(nativePayResult);

      if (nativePayResult?.success === false) {
        setMessage(nativePayResult.message || '微信客户端未完成支付调起。');
        return;
      }

      setMessage('微信已返回 App，支付结果确认中...');
      startPolling(result.payment.id);
    });
  };

  const startPolling = (paymentId) => {
    stopPolling();
    pollAttemptsRef.current = 0;

    const tick = async () => {
      pollAttemptsRef.current += 1;
      try {
        const result = await api.getPayment(paymentId, token);
        if (result?.payment) {
          setPayment(result.payment);
          if (result.order) setOrder(result.order);
          if (result.payment.status === 'paid') {
            setMessage('支付成功，后端已确认订单为 paid。');
            stopPolling();
            return;
          }
          if (TERMINAL_STATUSES.has(result.payment.status)) {
            setMessage(statusLabel(result.payment.status));
            stopPolling();
            return;
          }
        }
      } catch (error) {
        console.warn('Payment polling failed:', error);
      }

      if (pollAttemptsRef.current >= 30) {
        setMessage('仍在等待后端确认。请稍后刷新支付状态，或检查微信异步通知是否到达后端。');
        stopPolling();
        return;
      }

      pollTimerRef.current = setTimeout(tick, 2000);
    };

    tick();
  };

  const handleRefreshPayment = async () => {
    if (!token || !payment?.id) return;
    await setBusy('refresh-payment', async () => {
      const result = await api.getPayment(payment.id, token);
      if (!result?.success) throw new Error(result?.error || '刷新支付状态失败');
      setPayment(result.payment);
      if (result.order) setOrder(result.order);
      setMessage(statusLabel(result.payment?.status));
    });
  };

  const disabled = Boolean(loading);

  return (
    <div className="tuya-flow animate-fade">
      <TopBar onBack={onBack} title="微信支付测试" />

      <main className="tuya-flow-content">
        <section className="tuya-flow-hero">
          <div className="tuya-flow-eyebrow">Heybo Pet × WeChat Pay</div>
          <h1>创建订单、调起微信支付，然后以后端状态确认结果</h1>
          <p>App 端返回只做提示；真正成功必须以后端微信通知或查单更新为 paid 为准。</p>
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>1</span>
            <div>
              <h2>测试账号</h2>
              <p>使用后端 mock 登录拿到测试 token。</p>
            </div>
          </div>
          <div className="tuya-flow-row">
            <input
              value={loginInput}
              onChange={event => setLoginInput(event.target.value)}
              placeholder="手机号或 Email"
            />
            <button onClick={handleLogin} disabled={disabled}>
              {loading === 'login' ? '登录中' : user ? '重新登录' : '登录'}
            </button>
          </div>
          {user && <p className="tuya-flow-note">当前用户：{user.display_name || user.id}</p>}
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>2</span>
            <div>
              <h2>测试订单</h2>
              <p>选择一个测试商品，创建后端订单。</p>
            </div>
          </div>
          <div className="tuya-flow-row">
            <select value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)}>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} · {money(product.price_cents, product.currency)}
                </option>
              ))}
            </select>
            <button onClick={handleCreateOrder} disabled={disabled || !token}>
              {loading === 'order' ? '创建中' : '创建订单'}
            </button>
          </div>
          {order && (
            <p className="tuya-flow-note">
              订单：{order.id} · 金额：{money(order.total_cents, order.currency)} · 状态：{order.payment_status}
            </p>
          )}
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>3</span>
            <div>
              <h2>微信支付</h2>
              <p>创建微信支付流水，拿到后端签名参数后调起原生微信客户端。</p>
            </div>
          </div>
          <div className="tuya-flow-actions">
            <button className="primary" onClick={handleWechatPay} disabled={disabled || !order?.id}>
              {loading === 'pay' ? '支付处理中' : '微信支付'}
            </button>
            <button onClick={handleRefreshPayment} disabled={disabled || !payment?.id}>
              刷新支付状态
            </button>
          </div>
          {providerStatus && (
            <p className="tuya-flow-note">
              后端微信配置：{providerStatus.configured ? '已配置' : `缺少 ${providerStatus.missing?.join(', ') || '配置'}`}
            </p>
          )}
          {payment && (
            <p className="tuya-flow-note">
              支付流水：{payment.id} · 状态：{statusLabel(payment.status)}
            </p>
          )}
          {nativeResult && (
            <p className="tuya-flow-note">
              微信客户端返回：{nativeResult.reason || nativeResult.status} · {nativeResult.message}
            </p>
          )}
        </section>

        <section className="tuya-flow-card">
          <div className="tuya-flow-step">
            <span>4</span>
            <div>
              <h2>当前状态</h2>
              <p>{message}</p>
            </div>
          </div>
          {payment?.status === 'paid' && (
            <div style={{
              padding: 16,
              borderRadius: 16,
              border: '1px solid rgba(124,255,178,0.35)',
              background: 'rgba(124,255,178,0.08)',
              color: '#7CFFB2',
              fontWeight: 800,
            }}>
              支付成功：后端已确认 paid，可以进入支付成功页 / 履约流程。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
