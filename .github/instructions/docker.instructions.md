---
applyTo: '**/Dockerfile,**/Dockerfile.*,**/*.dockerfile,**/docker-compose*.yml,**/docker-compose*.yaml,**/compose*.yml,**/compose*.yaml'
description: 'Docker 容器化最佳實作指南，涵蓋多階段建置、映像優化、安全性掃描與生產環境部署策略。'
---

# Docker 容器化最佳實作指南

## 你的任務

作為 GitHub Copilot，你是 Docker 容器化的專家。你的任務是協助開發者建立安全、高效、可維護的容器映像與編排設定。

## 核心原則

### 🎯 容器化目標

1. **安全性** - 最小權限、無 root、掃描漏洞
2. **效率** - 最小映像大小、快速建置、有效快取
3. **可維護性** - 清晰結構、版本控制、文檔化
4. **可移植性** - 環境一致性、跨平台相容

---

## 1. Dockerfile 最佳實作

### 1.1 多階段建置（Multi-stage Build）

```dockerfile
# ============================================
# Stage 1: Build Stage
# ============================================
FROM golang:1.23-alpine AS builder

# 安裝建置相依套件
RUN apk add --no-cache git ca-certificates tzdata

# 設定工作目錄
WORKDIR /app

# 複製 go.mod 和 go.sum（利用快取）
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# 複製原始碼
COPY . .

# 建置二進位檔（靜態編譯）
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s -X main.version=$(git describe --tags --always)" \
    -o /app/server ./cmd/server

# ============================================
# Stage 2: Production Stage
# ============================================
FROM scratch

# 從 builder 複製必要檔案
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/server /server

# 設定非 root 用戶
USER 65534:65534

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/server", "health"]

# 暴露埠
EXPOSE 8080

# 啟動應用
ENTRYPOINT ["/server"]
```

### 1.2 Node.js/SvelteKit 多階段建置

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# 複製套件管理檔案
COPY package.json pnpm-lock.yaml ./

# 安裝 pnpm 並下載相依套件
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 複製相依套件
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 建置應用
RUN corepack enable pnpm && pnpm build

# 移除開發相依套件
RUN pnpm prune --prod

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 建立非 root 用戶
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

# 複製建置產物
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./

# 切換到非 root 用戶
USER sveltekit

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "build"]
```

---

## 2. 映像層優化

### 2.1 有效利用快取

```dockerfile
# ✅ 正確：將變動頻率低的指令放前面
FROM node:20-alpine

WORKDIR /app

# 1. 系統套件（很少變動）
RUN apk add --no-cache dumb-init

# 2. 套件相依（偶爾變動）
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 3. 原始碼（經常變動）
COPY . .

RUN pnpm build
```

```dockerfile
# ❌ 錯誤：COPY . . 太早，導致每次都重新安裝套件
FROM node:20-alpine

WORKDIR /app
COPY . .

RUN corepack enable pnpm && pnpm install
RUN pnpm build
```

### 2.2 減少映像層數

```dockerfile
# ✅ 正確：合併 RUN 指令
RUN apk add --no-cache \
        git \
        curl \
        ca-certificates \
    && rm -rf /var/cache/apk/*

# ❌ 錯誤：每個套件一個 RUN
RUN apk add git
RUN apk add curl
RUN apk add ca-certificates
```

### 2.3 清理暫存檔案

```dockerfile
# ✅ 正確：在同一層清理
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ❌ 錯誤：清理在不同層（無法減少映像大小）
RUN apt-get update
RUN apt-get install -y build-essential
RUN rm -rf /var/lib/apt/lists/*
```

---

## 3. 安全性最佳實作

### 3.1 使用非 Root 用戶

```dockerfile
# Alpine
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Debian/Ubuntu
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/false appuser

# 切換用戶
USER appuser:appgroup

# 或使用 nobody（UID 65534）
USER 65534:65534
```

### 3.2 最小化基礎映像

```dockerfile
# 🥇 最佳：scratch（僅適用靜態二進位）
FROM scratch

# 🥈 推薦：distroless
FROM gcr.io/distroless/static-debian12

# 🥉 良好：Alpine
FROM alpine:3.19

# ⚠️ 避免：完整 OS 映像
FROM ubuntu:22.04  # 較大，攻擊面廣
```

### 3.3 固定版本標籤

```dockerfile
# ✅ 正確：使用具體版本
FROM golang:1.23.0-alpine3.19
FROM node:20.11.0-alpine3.19

# ⚠️ 避免：使用 latest 或模糊版本
FROM golang:latest
FROM node:20
```

### 3.4 掃描漏洞

```bash
# 使用 Trivy 掃描
trivy image myapp:latest

# 使用 Docker Scout
docker scout cves myapp:latest

# 使用 Snyk
snyk container test myapp:latest
```

### 3.5 設定唯讀檔案系統

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    security_opt:
      - no-new-privileges:true
```

---

## 4. Docker Compose 最佳實作

### 4.1 完整範例

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ===========================================
  # Backend Service
  # ===========================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
      args:
        - VERSION=${VERSION:-dev}
    image: ${REGISTRY:-local}/backend:${VERSION:-latest}
    container_name: backend
    restart: unless-stopped

    # 資源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M

    # 環境變數
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    env_file:
      - .env

    # 埠映射
    ports:
      - '${BACKEND_PORT:-8080}:8080'

    # 健康檢查
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:8080/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # 相依服務
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

    # 網路
    networks:
      - app-network

    # 安全性
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp

  # ===========================================
  # Frontend Service
  # ===========================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    image: ${REGISTRY:-local}/frontend:${VERSION:-latest}
    container_name: frontend
    restart: unless-stopped

    ports:
      - '${FRONTEND_PORT:-3000}:3000'

    environment:
      - PUBLIC_API_URL=${PUBLIC_API_URL:-http://localhost:8080}

    depends_on:
      - backend

    networks:
      - app-network

  # ===========================================
  # Database Service
  # ===========================================
  db:
    image: postgres:16-alpine
    container_name: db
    restart: unless-stopped

    environment:
      - POSTGRES_USER=${POSTGRES_USER:-app}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      - POSTGRES_DB=${POSTGRES_DB:-app}

    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro

    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-app}']
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - app-network

    # 資料庫不對外暴露埠
    # ports:
    #   - "5432:5432"

  # ===========================================
  # Redis Service
  # ===========================================
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped

    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

    volumes:
      - redis_data:/data

    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

    networks:
      - app-network

# ===========================================
# Networks
# ===========================================
networks:
  app-network:
    driver: bridge

# ===========================================
# Volumes
# ===========================================
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### 4.2 環境分離

```yaml
# docker-compose.override.yml（開發環境，自動載入）
version: '3.9'

services:
  backend:
    build:
      target: development
    volumes:
      - ./backend:/app
      - /app/tmp
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    ports:
      - '8080:8080'
      - '2345:2345' # Delve 除錯埠

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

```yaml
# docker-compose.prod.yml（生產環境）
version: '3.9'

services:
  backend:
    image: ${REGISTRY}/backend:${VERSION}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  frontend:
    image: ${REGISTRY}/frontend:${VERSION}
    deploy:
      replicas: 2
```

---

## 5. 健康檢查

### 5.1 Dockerfile HEALTHCHECK

```dockerfile
# HTTP 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 使用 wget（Alpine）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 執行檔健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/app/healthcheck"]
```

### 5.2 健康檢查端點設計

```go
// Go 健康檢查端點
func healthHandler(w http.ResponseWriter, r *http.Request) {
    health := struct {
        Status    string `json:"status"`
        Timestamp string `json:"timestamp"`
        Checks    map[string]string `json:"checks"`
    }{
        Status:    "healthy",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Checks:    make(map[string]string),
    }

    // 檢查資料庫連線
    if err := db.Ping(); err != nil {
        health.Status = "unhealthy"
        health.Checks["database"] = "failed"
    } else {
        health.Checks["database"] = "ok"
    }

    // 檢查 Redis 連線
    if err := redis.Ping(r.Context()).Err(); err != nil {
        health.Status = "unhealthy"
        health.Checks["redis"] = "failed"
    } else {
        health.Checks["redis"] = "ok"
    }

    statusCode := http.StatusOK
    if health.Status == "unhealthy" {
        statusCode = http.StatusServiceUnavailable
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(health)
}
```

---

## 6. 日誌與監控

### 6.1 日誌最佳實作

```dockerfile
# 將日誌輸出到 stdout/stderr
CMD ["./app"]

# 不要將日誌寫入檔案
# ❌ CMD ["./app", "--log-file=/var/log/app.log"]
```

```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
        labels: 'service,environment'
        env: 'VERSION,BUILD_DATE'
```

### 6.2 Prometheus 指標

```yaml
services:
  app:
    labels:
      - 'prometheus.scrape=true'
      - 'prometheus.port=9090'
      - 'prometheus.path=/metrics'
```

---

## 7. .dockerignore 設定

```dockerignore
# Git
.git
.gitignore

# IDE
.idea/
.vscode/
*.swp
*.swo

# 相依套件
node_modules/
vendor/

# 建置產物
dist/
build/
*.exe
*.dll
*.so
*.dylib

# 測試與覆蓋率
coverage/
*.test
*_test.go
__tests__/
*.spec.ts

# 環境檔案
.env
.env.*
!.env.example

# 日誌
logs/
*.log

# 暫存
tmp/
temp/
*.tmp

# 文檔
docs/
*.md
!README.md

# Docker
Dockerfile*
docker-compose*.yml
.docker/

# CI/CD
.github/
.gitlab-ci.yml
Makefile
```

---

## 8. 常用指令參考

### 8.1 建置與推送

```bash
# 建置映像
docker build -t myapp:latest .

# 多平台建置
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .

# 使用特定 target
docker build --target production -t myapp:prod .

# 傳遞建置參數
docker build --build-arg VERSION=1.0.0 -t myapp:1.0.0 .
```

### 8.2 除錯

```bash
# 進入容器
docker exec -it container_name /bin/sh

# 查看日誌
docker logs -f --tail 100 container_name

# 檢查映像層
docker history myapp:latest

# 分析映像大小
docker run --rm -it wagoodman/dive myapp:latest
```

---

## 9. Checklist

建置 Docker 映像前，確保：

- [ ] 使用多階段建置減少映像大小
- [ ] 基礎映像使用具體版本標籤
- [ ] 應用程式以非 root 用戶運行
- [ ] 設定適當的健康檢查
- [ ] .dockerignore 排除不必要檔案
- [ ] 敏感資訊透過環境變數傳入
- [ ] 使用 Trivy 或類似工具掃描漏洞
- [ ] 資源限制已設定（CPU、記憶體）

---

## Copilot 協助項目

作為 GitHub Copilot，我可以協助你：

1. **優化 Dockerfile** - 分析並改進現有 Dockerfile
2. **多階段建置設計** - 根據技術棧設計最佳建置流程
3. **安全性審查** - 檢查容器安全性問題
4. **Compose 編排** - 設計服務編排與網路架構
5. **除錯協助** - 分析建置或運行時問題

只需描述你的需求，我會提供符合最佳實作的容器化方案。
