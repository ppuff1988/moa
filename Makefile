.PHONY: help install dev build test lint clean deploy

help: ## 顯示此幫助訊息
	@echo "可用的指令："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安裝依賴
	npm ci

dev: ## 啟動開發伺服器
	npm run dev

build: ## 建置應用程式
	npm run build

test: ## 執行所有測試
	npm test

test-unit: ## 執行單元測試
	npm run test:unit

test-api: ## 執行 API 測試
	npm run test:api

test-e2e: ## 執行 E2E 測試
	npm run test:e2e

lint: ## 執行程式碼檢查
	npm run lint

check: ## 執行類型檢查
	npm run check

format: ## 格式化程式碼
	npm run format

clean: ## 清理建置檔案
	rm -rf build .svelte-kit node_modules/.vite

docker-build: ## 建置 Docker 映像
	docker build -t moa:latest .

docker-up: ## 啟動 Docker 容器
	docker-compose up -d

docker-down: ## 停止 Docker 容器
	docker-compose down

docker-logs: ## 查看 Docker 日誌
	docker-compose logs -f

docker-restart: ## 重啟 Docker 容器
	docker-compose restart

db-start: ## 啟動資料庫
	npm run db:start

db-reset: ## 重置資料庫
	npm run db:reset

db-studio: ## 開啟資料庫管理介面
	npm run db:studio

deploy-prod: ## 部署到生產環境
	@echo "請確認已在 GitHub 設定所有必要的 Secrets"
	@echo "推送到 main 分支將自動觸發部署..."
	git push origin main

ci-local: ## 在本地模擬 CI 流程
	@echo "執行 Lint..."
	npm run lint
	@echo "執行類型檢查..."
	npm run check
	@echo "執行測試..."
	npm test
	@echo "執行建置..."
	npm run build
	@echo "✓ 所有檢查通過！"

