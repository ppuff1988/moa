.PHONY: help clean ci-local setup-dev check-env docker-prod-up docker-prod-down

help: ## 顯示此幫助訊息
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  MOA 專案 Makefile 指令"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "開發常用指令（在 Dev Container 內使用）："
	@echo "  make setup-dev    - 快速設定開發環境"
	@echo "  make ci-local     - 本地 CI 檢查（lint、test、build）"
	@echo "  make clean        - 清理建置檔案"
	@echo "  make check-env    - 檢查開發環境"
	@echo ""
	@echo "生產環境指令（在主機上使用）："
	@echo "  make docker-prod-up    - 啟動生產環境"
	@echo "  make docker-prod-down  - 停止生產環境"
	@echo ""
	@echo "其他開發指令請使用 npm run [script]"
	@echo "查看所有可用的 npm scripts: npm run"
	@echo ""

setup-dev: ## 快速設定開發環境
	@echo "🚀 設定開發環境..."
	@npm install
	@bash install-hooks.sh
	@npm run db:migrate
	@echo "✅ 開發環境設定完成！"

clean: ## 清理建置檔案與快取
	@echo "🧹 清理建置檔案..."
	@rm -rf build .svelte-kit node_modules/.vite
	@echo "✅ 清理完成"

ci-local: ## 在本地模擬 CI 流程
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  🔍 本地 CI 檢查"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "1️⃣  執行 Lint..."
	@npm run lint
	@echo ""
	@echo "2️⃣  執行類型檢查..."
	@npm run check
	@echo ""
	@echo "3️⃣  執行測試..."
	@npm test
	@echo ""
	@echo "4️⃣  執行建置..."
	@npm run build
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "✅ 所有檢查通過！"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check-env: ## 檢查開發環境
	@bash .devcontainer/check-environment.sh

docker-prod-up: ## 啟動生產環境 Docker 容器
	@bash deploy-prod.sh

docker-prod-down: ## 停止生產環境 Docker 容器
	@bash down-prod.sh

