// Pet Chef v3.0 — Prisma Client Configuration
// prisma_client.js — 中心化的 Prisma 客户端配置，支持多区域动态连接

const { PrismaClient } = require('@prisma/client');
const { getRegionConfig } = require('../config/region_config');

let prismaInstance = null;

/**
 * 获取当前区域的 Prisma Client 实例
 * 运行时自动从 region_config.js 读取对应区域的 PostgreSQL url。
 */
function getPrisma() {
  if (prismaInstance) return prismaInstance;

  const config = getRegionConfig();
  const databaseUrl = config.database.url || process.env.DATABASE_URL;

  const isDev = process.env.NODE_ENV !== 'production';

  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: isDev ? ['info', 'warn', 'error'] : ['error'],
  });

  return prismaInstance;
}

module.exports = {
  prisma: getPrisma(),
  getPrisma,
};
