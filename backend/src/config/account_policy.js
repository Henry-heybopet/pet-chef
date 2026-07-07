const REGION_POLICIES = {
  CN: {
    region: 'CN',
    primaryIdentity: 'phone',
    bindRequirement: 'phone',
    primaryProviders: ['phone'],
    auxiliaryProviders: ['wechat'],
    countryCode: '86',
  },
  US: {
    region: 'US',
    primaryIdentity: 'email',
    bindRequirement: 'email',
    primaryProviders: ['email'],
    auxiliaryProviders: ['google', 'apple'],
    countryCode: '1',
  },
  EU: {
    region: 'EU',
    primaryIdentity: 'email',
    bindRequirement: 'email',
    primaryProviders: ['email'],
    auxiliaryProviders: ['google', 'apple'],
    countryCode: '49',
  },
};

function normalizeRegion(region) {
  const value = String(region || process.env.HEYBO_REGION || 'CN').trim().toUpperCase();
  return REGION_POLICIES[value] ? value : 'CN';
}

function getRegionFromRequest(req) {
  return normalizeRegion(req.get?.('x-heybo-region') || req.body?.region || req.query?.region);
}

function getAccountPolicy(region) {
  return REGION_POLICIES[normalizeRegion(region)];
}

function assertPrimaryProvider(region, provider) {
  const policy = getAccountPolicy(region);
  if (!policy.primaryProviders.includes(provider)) {
    throw new Error(`${provider} is not a primary login provider in ${policy.region}`);
  }
  return policy;
}

function assertAuxiliaryProvider(region, provider) {
  const policy = getAccountPolicy(region);
  if (!policy.auxiliaryProviders.includes(provider)) {
    throw new Error(`${provider} is not an auxiliary login provider in ${policy.region}`);
  }
  return policy;
}

module.exports = {
  REGION_POLICIES,
  normalizeRegion,
  getRegionFromRequest,
  getAccountPolicy,
  assertPrimaryProvider,
  assertAuxiliaryProvider,
};
