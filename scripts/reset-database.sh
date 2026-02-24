#!/bin/bash
# 資料庫重置腳本
# 在 devcontainer 內使用 psql 直接連接資料庫執行重置

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 開始重置資料庫...${NC}"

# 檢查環境變數
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-moa_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-moa_pass}"
DB_NAME="${POSTGRES_DB:-moa_db}"

# 設置 PGPASSWORD 以避免密碼提示
export PGPASSWORD="$DB_PASSWORD"

# 檢查資料庫連線
echo -e "${YELLOW}📡 檢查資料庫連線...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ 無法連接到資料庫！${NC}"
    echo -e "${YELLOW}請確認資料庫服務已啟動${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 資料庫連線正常${NC}"

# 執行初始化 SQL
echo -e "${YELLOW}🗄️  執行資料庫初始化...${NC}"
if [ -f "migrations/init_database.sql" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/init_database.sql
    echo -e "${GREEN}✅ 資料庫結構已重置${NC}"
else
    echo -e "${RED}❌ 找不到 migrations/init_database.sql${NC}"
    exit 1
fi

# 執行測試用戶初始化
echo -e "${YELLOW}👥 載入測試用戶...${NC}"
if [ -f "migrations/init_test_users.sql" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/init_test_users.sql
    echo -e "${GREEN}✅ 測試用戶已載入${NC}"
else
    echo -e "${YELLOW}⚠️  找不到 migrations/init_test_users.sql，跳過${NC}"
fi

# 執行 migrations
echo -e "${YELLOW}🔧 執行資料庫遷移...${NC}"
npm run db:migrate

echo -e "${GREEN}✅ 資料庫重置完成！${NC}"
