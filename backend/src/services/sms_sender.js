const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
const OpenApi = require('@alicloud/openapi-client');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const error = new Error(`短信服务配置缺失：${name}`);
    error.status = 503;
    error.code = 'SMS_CONFIG_MISSING';
    throw error;
  }
  return value;
}

function createClient() {
  const config = new OpenApi.Config({
    accessKeyId: required('ALIBABA_CLOUD_ACCESS_KEY_ID'),
    accessKeySecret: required('ALIBABA_CLOUD_ACCESS_KEY_SECRET'),
    endpoint: process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
  });
  return new Dysmsapi20170525.default(config);
}

async function sendLoginCode(phone, code) {
  const request = new Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: phone,
    signName: required('ALIYUN_SMS_SIGN_NAME'),
    templateCode: required('ALIYUN_SMS_TEMPLATE_CODE'),
    templateParam: JSON.stringify({ code }),
  });

  try {
    const response = await createClient().sendSms(request);
    const body = response?.body || {};
    if (body.code !== 'OK') {
      const error = new Error('短信发送失败，请稍后重试');
      error.status = 502;
      error.code = body.code || 'SMS_PROVIDER_REJECTED';
      throw error;
    }
    return {
      requestId: String(body.requestId || ''),
      bizId: String(body.bizId || ''),
    };
  } catch (cause) {
    if (cause?.status) throw cause;
    const error = new Error('短信发送失败，请稍后重试');
    error.status = 502;
    error.code = cause?.code || cause?.data?.Code || 'SMS_PROVIDER_ERROR';
    throw error;
  }
}

module.exports = { sendLoginCode };
