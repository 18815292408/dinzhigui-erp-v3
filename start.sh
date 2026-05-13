#!/bin/zsh

# ERP macOS 启动脚本

# 设置颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${BLUE}========================================${NC}"
echo "${BLUE}   ERP Starting (macOS)${NC}"
echo "${BLUE}========================================${NC}"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "${YELLOW}[1/3]${NC} Kill port 3000..."
# 查找并杀掉占用 3000 端口的进程
PID=$(lsof -ti:3000)
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "   Killed process $PID"
fi
echo "   ${GREEN}Done${NC}"

echo ""
echo "${YELLOW}[2/3]${NC} Start dev server..."
# 启动开发服务器（后台运行）
nohup npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

echo ""
echo "${YELLOW}[3/3]${NC} Wait for server ready..."
# 等待服务器启动（最多30秒）
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ${GREEN}Server is ready!${NC}"
        break
    fi
    sleep 1
    echo -n "."
done

echo ""
echo "${YELLOW}[4/4]${NC} Open browser..."
open http://localhost:3000

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}   Done! Visit http://localhost:3000${NC}"
echo "${GREEN}========================================${NC}"

# 保持终端打开，按任意键关闭服务器
echo ""
echo "Press any key to stop the server..."
read -k1

echo ""
echo "${YELLOW}Stopping server...${NC}"
kill $SERVER_PID 2>/dev/null
kill $(lsof -ti:3000) 2>/dev/null
echo "${GREEN}Server stopped.${NC}"
