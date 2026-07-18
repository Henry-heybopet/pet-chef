#!/bin/bash
# =============================================
# Pet Chef — 测试环境一键启动
# =============================================
# 每次测试的标准流程：
#   1. ./test-run.sh         启动测试环境
#   2. 手动验收 / 运行自动化测试
#   3. ./test-cleanup.sh     销毁所有容器和卷
# =============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "🐕  Pet Chef — 测试环境启动"
echo "============================================"
echo ""

# ── 检查 Docker ──
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，正在尝试启动 Docker Desktop..."
    open -a Docker 2>/dev/null || true
    echo "   请等待 Docker Desktop 启动完成后重新运行此脚本"
    exit 1
fi

if ! docker info &> /dev/null 2>&1; then
    echo "⏳ Docker 守护进程未就绪，正在启动 Docker Desktop..."
    open -a Docker 2>/dev/null || true
    echo "   等待 Docker 就绪（最多 60 秒）..."
    for i in $(seq 1 30); do
        if docker info &> /dev/null 2>&1; then
            echo "✅ Docker 已就绪"
            break
        fi
        sleep 2
    done
    if ! docker info &> /dev/null 2>&1; then
        echo "❌ Docker 启动超时，请手动启动 Docker Desktop 后重试"
        exit 1
    fi
fi

# ── 构建/检查测试镜像 ──
if ! docker image inspect petchef-test-env:b1.00 &> /dev/null; then
    echo "🔨 首次运行，构建测试环境镜像（预装所有依赖）..."
    echo "   这一步只需要执行一次，后续测试秒级启动"
    echo ""
    docker build -f Dockerfile.testenv -t petchef-test-env:b1.00 .
    echo ""
    echo "✅ 测试镜像构建完成: petchef-test-env:b1.00"
else
    echo "✅ 测试镜像已存在: petchef-test-env:b1.00"
    echo "   （跳过构建，如需更新依赖请先执行: docker build -f Dockerfile.testenv -t petchef-test-env:b1.00 .）"
fi

# ── 清理旧测试容器 ──
echo ""
echo "🧹 清理旧的测试容器..."
docker compose -f docker-compose.test.yml down -v 2>/dev/null || true

# ── 启动测试环境 ──
echo ""
echo "🚀 启动测试环境..."
docker compose -f docker-compose.test.yml up -d

echo ""
echo "⏳ 等待服务就绪..."

# 等待 Backend 健康检查通过
echo "  ─ 等待 Backend..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3001/api/breeds > /dev/null 2>&1; then
        echo "  ✅ Backend API 就绪 (localhost:3001)"
        break
    fi
    sleep 2
done

# 等待 Frontend 就绪
echo "  ─ 等待 Frontend..."
for i in $(seq 1 30); do
    if curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo "  ✅ Frontend 就绪 (localhost:5174)"
        break
    fi
    sleep 2
done

# ── 安全检查 ──
echo ""
echo "🛡️  安全过滤器测试..."
SAFETY_RESULT=$(curl -s http://localhost:3001/api/ingredients/safety-check \
    -H "Content-Type: application/json" \
    -d '{"ingredients":["鸡胸肉","葡萄","胡萝卜"]}')
echo "  $SAFETY_RESULT"

# ── 运行状态 ──
echo ""
echo "============================================"
echo "🎉 测试环境启动成功！"
echo ""
echo "  📋 当前状态:"
docker compose -f docker-compose.test.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  🌐 前端验收: http://localhost:5174"
echo "  🔧 后端 API:  http://localhost:3001"
echo ""
echo "  📝 测试完成后请执行:"
echo "     ./test-cleanup.sh    # 销毁测试环境"
echo "============================================"

# 打开浏览器
echo ""
echo "🌐 正在打开浏览器验收..."
sleep 1
open http://localhost:5174 2>/dev/null || echo "   请手动打开: http://localhost:5174"
