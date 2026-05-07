#!/bin/bash
# Heybo Lux 快速启动脚本

echo "🚀 启动 Heybo Lux Feeding OS v2.0..."

# 1. 安装后端依赖
echo "📦 安装后端依赖..."
cd "/Users/yhl/Antigravity/pet chef/backend"
npm install @google/generative-ai axios dotenv

# 2. 安装前端依赖（如需）
echo "📦 检查前端依赖..."
cd "/Users/yhl/Antigravity/pet chef/frontend"
npm install

echo ""
echo "✅ 安装完成！"
echo ""
echo "⚡ 请分别在两个终端窗口运行："
echo ""
echo "  终端1 (后端):"
echo "  cd \"/Users/yhl/Antigravity/pet chef/backend\""
echo "  node src/index.js"
echo ""
echo "  终端2 (前端):"  
echo "  cd \"/Users/yhl/Antigravity/pet chef/frontend\""
echo "  npm run dev"
echo ""
echo "  然后访问 http://localhost:5173"
