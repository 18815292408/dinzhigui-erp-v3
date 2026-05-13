#!/bin/zsh
# ============================================================
# 鼎智柜 ERP - macOS 一键启动脚本
# ============================================================
# 功能：清理端口 -> 检查环境 -> 安装依赖 -> 启动开发服务器 -> 打开浏览器
# 兼容：macOS (zsh/bash)
# ============================================================

set -euo pipefail

# ---------- 颜色定义 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ---------- 配置 ----------
PORT=3000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
NODE_VERSION_REQUIRED="18.0.0"

# ---------- 辅助函数 ----------
print_header() {
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${BOLD}     鼎智柜 ERP - 开发服务器启动${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}  [OK]${NC} $1"
}

print_error() {
    echo -e "${RED}  [ERROR]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}  [WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}  [INFO]${NC} $1"
}

print_step() {
    echo ""
    echo -e "${BOLD}[Step $1]${NC} $2"
    echo ""
}

# 版本比较
version_ge() {
    local v1="$1"
    local v2="$2"
    if [[ "$(printf '%s\n' "$v2" "$v1" | sort -V | head -n1)" == "$v2" ]]; then
        return 0
    else
        return 1
    fi
}

# 检查命令是否存在
check_command() {
    command -v "$1" &>/dev/null
}

# ---------- Step 0: 进入项目目录 ----------
cd "$SCRIPT_DIR"

print_header

# ---------- Step 1: 检查 Node.js 环境 ----------
print_step "1/5" "检查 Node.js 环境..."

if ! check_command node; then
    print_error "未检测到 Node.js！"
    echo ""
    echo -e "${BOLD}请先安装 Node.js，推荐方式：${NC}"
    echo ""
    echo -e "  ${CYAN}方式 1 - Homebrew（推荐）：${NC}"
    echo "    brew install node"
    echo ""
    echo -e "  ${CYAN}方式 2 - 官方安装包：${NC}"
    echo "    https://nodejs.org/zh-cn/download/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
print_info "Node.js 版本: $NODE_VERSION"

if ! version_ge "$NODE_VERSION" "$NODE_VERSION_REQUIRED"; then
    print_error "Node.js 版本过低，需要 >= $NODE_VERSION_REQUIRED"
    exit 1
fi

print_success "Node.js 环境正常"

# ---------- Step 2: 检查 npm ----------
print_step "2/5" "检查 npm..."

if ! check_command npm; then
    print_error "未检测到 npm！"
    exit 1
fi

print_info "npm 版本: $(npm --version)"
print_success "npm 环境正常"

# ---------- Step 3: 安装依赖 ----------
print_step "3/5" "检查并安装依赖..."

if [ ! -d "node_modules" ] || [ ! -d "node_modules/next" ]; then
    print_warn "检测到 node_modules 缺失，正在安装依赖..."
    echo ""
    npm install
    print_success "依赖安装完成"
else
    print_info "node_modules 已存在"
fi

if [ -f "node_modules/.bin/next" ] && [ ! -x "node_modules/.bin/next" ]; then
    print_warn "检测到二进制文件缺少执行权限，正在修复..."
    chmod +x node_modules/.bin/*
    print_success "权限修复完成"
fi

print_success "依赖检查通过"

# ---------- Step 4: 清理端口并启动服务器 ----------
print_step "4/5" "清理端口并启动开发服务器..."

# 清理端口
print_info "正在清理端口 $PORT..."
PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    kill -9 $PIDS 2>/dev/null || true
    print_info "已终止占用端口 $PORT 的进程"
    sleep 1
else
    print_info "端口 $PORT 空闲"
fi

# 清理日志
rm -f ".erp-dev.log"

# 启动 Next.js 开发服务器
print_info "正在启动 Next.js 开发服务器..."
print_info "日志输出: $SCRIPT_DIR/.erp-dev.log"
echo ""

npm run dev > ".erp-dev.log" 2>&1 &
SERVER_PID=$!

# 等待服务器启动
ACTUAL_PORT=""
for i in $(seq 1 60); do
    PORT_LINE=$(grep -oE 'http://localhost:[0-9]+' ".erp-dev.log" 2>/dev/null | head -1 || true)
    if [ -n "$PORT_LINE" ]; then
        ACTUAL_PORT=$(echo "$PORT_LINE" | grep -oE '[0-9]+$')
        break
    fi
    # 检查进程是否还在运行
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "服务器进程意外退出！"
        echo ""
        echo -e "${RED}最后几行日志：${NC}"
        tail -20 ".erp-dev.log" 2>/dev/null || echo "(无日志)"
        echo ""
        exit 1
    fi
    sleep 1
done

if [ -z "$ACTUAL_PORT" ]; then
    print_error "服务器启动超时（60秒）"
    echo ""
    echo -e "${RED}最后几行日志：${NC}"
    tail -20 ".erp-dev.log" 2>/dev/null || echo "(无日志)"
    echo ""
    kill -9 $SERVER_PID 2>/dev/null || true
    exit 1
fi

print_success "开发服务器已启动！"
print_info "访问地址: http://localhost:$ACTUAL_PORT"

# ---------- Step 5: 打开浏览器 ----------
print_step "5/5" "正在打开浏览器..."

sleep 1
open "http://localhost:$ACTUAL_PORT"
print_success "浏览器已打开"

# ---------- 完成 ----------
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}  鼎智柜 ERP 启动成功！${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "  访问地址: ${BOLD}http://localhost:$ACTUAL_PORT${NC}"
echo -e "  日志文件: ${BOLD}$SCRIPT_DIR/.erp-dev.log${NC}"
echo ""
echo -e "  ${YELLOW}提示：${NC}"
echo -e "  - 按 ${BOLD}Ctrl+C${NC} 可停止服务器"
echo -e "  - 日志实时写入 .erp-dev.log"
echo ""
echo -e "${CYAN}================================================${NC}"
echo ""

# 保持脚本运行，等待用户按 Ctrl+C
wait $SERVER_PID
