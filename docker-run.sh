#!/bin/bash
# =============================================
# Pet Chef Ver B1.00 — Docker 一键启动脚本
# =============================================
set -e

echo "🐕 Pet Chef Ver B1.00 — Docker 部署"
echo "=================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装。请先安装 Docker Desktop:"
    echo "   brew install --cask docker"
    echo "   然后启动 Docker Desktop 应用"
    exit 1
fi

# Ensure Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker 守护进程未运行。请先启动 Docker Desktop 应用。"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📦 构建 Docker 镜像..."
echo "=================================="

# Build and start
docker compose up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 3

# Health check
echo ""
echo "🔍 健康检查..."
echo "=================================="

# Check backend
if curl -s http://localhost:3001/api/breeds > /dev/null 2>&1; then
    echo "✅ Backend API 运行正常 (localhost:3001)"
else
    echo "⚠️  Backend API 检查中..."
fi

# Check nginx
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Frontend 运行正常 (localhost:8080)"
else
    echo "⚠️  Frontend 检查中..."
fi

# Test safety filter
echo ""
echo "🛡️  安全过滤器测试..."
echo "=================================="
SAFETY_RESULT=$(curl -s http://localhost:3001/api/ingredients/safety-check \
    -H "Content-Type: application/json" \
    -d '{"ingredients":["鸡胸肉","葡萄","胡萝卜"]}')
echo "$SAFETY_RESULT" | python3 -m json.tool 2>/dev/null || echo "$SAFETY_RESULT"

echo ""
echo "=================================="
echo "🎉 Pet Chef Ver B1.00 启动成功！"
echo ""
echo "  🌐 前端页面:  http://localhost:8080"
echo "  🔧 后端 API:   http://localhost:3001"
echo "  🛡️ 安全检查:   http://localhost:3001/api/ingredients/safety-check"
echo ""
echo "  管理命令:"
echo "    docker compose ps      - 查看运行状态"
echo "    docker compose logs -f - 查看日志"
echo "    docker compose down    - 停止服务"
echo "=================================="

# Open browser
echo ""
echo "🌐 正在打开浏览器..."
sleep 1
open http://localhost:8080 2>/dev/null || echo "   请手动打开: http://localhost:8080"
