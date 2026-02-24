#!/bin/bash

# Dev Container 環境檢查腳本
# 用於驗證開發環境是否正確設定

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   MOA Dev Container 環境檢查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查函式
check_command() {
    local cmd=$1
    local name=$2
    local expected_version=$3
    
    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        echo -e "${GREEN}✓${NC} $name: $version"
        
        if [ ! -z "$expected_version" ]; then
            if [[ $version == *"$expected_version"* ]]; then
                echo -e "  ${GREEN}版本符合${NC}"
            else
                echo -e "  ${YELLOW}警告: 預期版本包含 $expected_version${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $name: 未安裝"
        return 1
    fi
}

# 檢查環境變數
check_env() {
    local var=$1
    local name=$2
    
    if [ ! -z "${!var}" ]; then
        echo -e "${GREEN}✓${NC} $name: 已設定"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $name: 未設定"
        return 1
    fi
}

# 檢查資料庫連線
check_database() {
    if psql -h db -U moa_user -d moa_db -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} PostgreSQL: 連線成功"
        
        # 取得資料庫版本
        local db_version=$(psql -h db -U moa_user -d moa_db -t -c "SELECT version()" 2>&1 | head -n 1)
        echo "  版本: $db_version"
        
        # 檢查資料表
        local table_count=$(psql -h db -U moa_user -d moa_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>&1)
        echo "  資料表數量: $(echo $table_count | xargs)"
        
        return 0
    else
        echo -e "${RED}✗${NC} PostgreSQL: 連線失敗"
        return 1
    fi
}

# 1. 檢查系統工具
echo "1️⃣  檢查系統工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command "node" "Node.js" "v22"
check_command "npm" "npm"
check_command "git" "Git"
check_command "psql" "PostgreSQL Client"
check_command "docker" "Docker"
check_command "zsh" "Zsh"
echo ""

# 2. 檢查 Node.js 套件
echo "2️⃣  檢查 Node.js 套件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules: 已安裝"
    
    # 檢查關鍵套件
    local packages=("svelte" "vite" "@sveltejs/kit" "drizzle-orm" "postgres")
    for pkg in "${packages[@]}"; do
        if [ -d "node_modules/$pkg" ]; then
            echo -e "  ${GREEN}✓${NC} $pkg"
        else
            echo -e "  ${RED}✗${NC} $pkg"
        fi
    done
else
    echo -e "${RED}✗${NC} node_modules: 未安裝"
    echo -e "  ${YELLOW}提示: 執行 npm install${NC}"
fi
echo ""

# 3. 檢查環境變數
echo "3️⃣  檢查環境變數"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env 檔案: 存在"
    
    # 載入 .env
    export $(grep -v '^#' .env | xargs)
    
    check_env "DATABASE_URL" "DATABASE_URL"
    check_env "JWT_SECRET" "JWT_SECRET"
    check_env "NODE_ENV" "NODE_ENV"
    check_env "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_ID（選用）"
    check_env "SMTP_HOST" "SMTP_HOST（選用）"
else
    echo -e "${RED}✗${NC} .env 檔案: 不存在"
    echo -e "  ${YELLOW}提示: 複製 .env.devcontainer.example 為 .env${NC}"
fi
echo ""

# 4. 檢查資料庫
echo "4️⃣  檢查資料庫連線"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_database
echo ""

# 5. 檢查連接埠
echo "5️⃣  檢查連接埠"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if nc -z localhost 5173 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 連接埠 5173: 已開啟（應用程式可能正在執行）"
else
    echo -e "${YELLOW}⚠${NC} 連接埠 5173: 未使用"
fi

if nc -z db 5432 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 連接埠 5432 (db): 已開啟（PostgreSQL）"
else
    echo -e "${RED}✗${NC} 連接埠 5432 (db): 無法連線"
fi
echo ""

# 6. 檢查 Git 設定
echo "6️⃣  檢查 Git 設定"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -z "$(git config user.name)" ]; then
    echo -e "${GREEN}✓${NC} Git user.name: $(git config user.name)"
else
    echo -e "${YELLOW}⚠${NC} Git user.name: 未設定"
fi

if [ ! -z "$(git config user.email)" ]; then
    echo -e "${GREEN}✓${NC} Git user.email: $(git config user.email)"
else
    echo -e "${YELLOW}⚠${NC} Git user.email: 未設定"
fi
echo ""

# 7. 總結
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   檢查完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 下一步建議："
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "  ${YELLOW}1.${NC} 執行 ${GREEN}npm install${NC} 安裝相依套件"
fi

if [ ! -f ".env" ]; then
    echo -e "  ${YELLOW}2.${NC} 複製 ${GREEN}cp .env.devcontainer.example .env${NC}"
fi

echo -e "  ${YELLOW}3.${NC} 啟動開發伺服器: ${GREEN}npm run dev${NC}"
echo -e "  ${YELLOW}4.${NC} 執行測試: ${GREEN}npm run test:api${NC}"
echo -e "  ${YELLOW}5.${NC} 訪問 ${GREEN}http://localhost:5173${NC}"
echo ""
