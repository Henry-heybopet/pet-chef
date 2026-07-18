#!/bin/bash
# =============================================
# Pet Chef — 测试环境销毁
# =============================================
# 彻底清理：
#   - 停止并删除测试容器
#   - 删除测试网络
#   - 删除匿名卷（日志等）
#   - 保留测试镜像（下次直接复用）
#
# 彻底清理（含镜像）：
#   ./test-cleanup.sh --all
# =============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "🧹 Pet Chef — 销毁测试环境"
echo "============================================"

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker 未安装，无需清理"
    exit 0
fi

CLEAN_ALL=false
if [ "$1" = "--all" ]; then
    CLEAN_ALL=true
fi

# ── 停止并删除容器 ──
echo ""
echo "  🛑 停止测试容器..."
docker compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true

# ── 清理悬空卷 ──
echo "  🗑️  清理测试卷..."
docker volume rm pet-chef_backend-logs 2>/dev/null || true

# ── 可选：删除测试镜像 ──
if [ "$CLEAN_ALL" = true ]; then
    echo ""
    echo "  🗑️  删除测试镜像 petchef-test-env:b1.00..."
    docker rmi petchef-test-env:b1.00 2>/dev/null || true
    echo "  ✅ 测试镜像已删除（下次运行 ./test-run.sh 会重新构建）"
else
    echo "  💾 保留测试镜像 petchef-test-env:b1.00（下次启动秒级就绪）"
    echo "     （如需删除镜像: ./test-cleanup.sh --all）"
fi

echo ""
echo "============================================"
echo "✅ 测试环境已销毁"
echo "   主代码和环境完全未受影响"
echo "============================================"
echo ""
