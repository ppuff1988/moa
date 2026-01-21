# .devcontainer 設定檔案說明

## 檔案結構

```
.devcontainer/
├── devcontainer.json              # VS Code Dev Container 主要配置
├── docker-compose.devcontainer.yml # 開發容器的 Docker Compose 配置
├── Dockerfile.devcontainer         # 開發環境專用 Dockerfile
└── README.md                       # 使用文件
```

## devcontainer.json

主要配置檔案，定義：

- 使用的 Docker Compose 檔案
- 工作區路徑
- VS Code 設定和擴充套件
- 連接埠轉發
- 生命週期指令

### 重要設定說明

#### postCreateCommand

容器建立後執行一次的指令：

```json
"postCreateCommand": "npm install && npm run db:migrate"
```

- 安裝 npm 相依套件
- 執行資料庫遷移

#### postStartCommand

每次容器啟動時執行的指令：

```json
"postStartCommand": "git config --global --add safe.directory /workspace"
```

- 設定 Git 安全目錄，避免權限警告

#### forwardPorts

自動轉發的連接埠：

- `5173`: 應用程式開發伺服器
- `5432`: PostgreSQL 資料庫

#### mounts

Volume 掛載設定：

- `node_modules`: 使用 named volume 提升效能
- `.gitconfig`: 繼承主機的 Git 設定

## docker-compose.devcontainer.yml

定義開發容器的服務配置：

### 服務說明

#### app (主要開發容器)

- **基礎映像**: 自訂 `Dockerfile.devcontainer`
- **指令**: `sleep infinity` (保持容器執行，等待開發者指令)
- **Volume**:
  - 專案資料夾掛載為 `/workspace`
  - `node_modules` 使用獨立 volume
- **特性**: 使用 `init: true` 適當處理訊號

#### db (PostgreSQL 資料庫)

- **映像**: `postgres:16-alpine`
- **持久化**: 使用 named volume `moa_devcontainer_pgdata`
- **初始化**: 自動執行 SQL migration scripts
- **健康檢查**: 確保資料庫就緒才啟動應用程式

#### email-worker (選擇性)

- **Profile**: `worker` (預設不啟動)
- **用途**: 背景郵件佇列處理
- **啟動方式**:
  ```bash
  docker compose -f .devcontainer/docker-compose.devcontainer.yml --profile worker up email-worker
  ```

### Volume 說明

#### moa_devcontainer_node_modules

- **用途**: 快取 `node_modules`
- **優點**: 大幅提升檔案存取效能（特別是 Windows/Mac）
- **清除方式**: `docker volume rm moa_devcontainer_node_modules`

#### moa_devcontainer_pgdata

- **用途**: 持久化 PostgreSQL 資料
- **優點**: 容器重啟後資料不遺失
- **重設方式**: `docker volume rm moa_devcontainer_pgdata`

## Dockerfile.devcontainer

開發環境專用的 Dockerfile，包含：

### 已安裝工具

- **基礎**: Node.js 22 Alpine
- **Shell**: Bash, Zsh, oh-my-zsh
- **版本控制**: Git, SSH client
- **編輯器**: Vim, Nano
- **資料庫**: PostgreSQL client
- **瀏覽器**: Chromium, Firefox, WebKit (供 Playwright 使用)
- **權限**: Sudo 支援

### 使用者設定

- **預設使用者**: `node` (非 root)
- **Sudo 權限**: 無需密碼
- **預設 Shell**: Zsh with oh-my-zsh

## 自訂設定

### 修改 VS Code 設定

編輯 [devcontainer.json](devcontainer.json) 的 `customizations.vscode.settings`：

```json
"customizations": {
  "vscode": {
    "settings": {
      "editor.tabSize": 2,
      // 你的自訂設定...
    }
  }
}
```

### 新增 VS Code 擴充套件

在 `extensions` 陣列中新增擴充套件 ID：

```json
"extensions": [
  "svelte.svelte-vscode",
  "your-publisher.your-extension"
]
```

### 修改環境變數

編輯 [docker-compose.devcontainer.yml](docker-compose.devcontainer.yml) 的 `environment` 區段：

```yaml
environment:
  NODE_ENV: development
  YOUR_CUSTOM_VAR: value
```

### 新增系統套件

編輯 [Dockerfile.devcontainer](Dockerfile.devcontainer)：

```dockerfile
RUN apk add --no-cache \
    your-package \
    another-package
```

### 新增 Docker 服務

在 [docker-compose.devcontainer.yml](docker-compose.devcontainer.yml) 新增服務：

```yaml
services:
  your-service:
    image: your-image:tag
    # ... 其他設定
```

## 效能最佳化

### Windows/Mac 使用者

1. **使用 Volume 而非 Bind Mount**
   - ✅ 專案已配置 `node_modules` volume
   - ✅ 使用 `:cached` 模式掛載專案資料夾

2. **分配足夠資源**
   - 至少 4GB RAM
   - 至少 2 CPU 核心

3. **排除大型資料夾**
   - `.gitignore` 已排除 `node_modules`、`build` 等
   - VS Code 設定已排除不必要的資料夾

### Linux 使用者

Linux 原生 Docker 效能已經很好，但仍可：

- 使用 `overlay2` storage driver
- 考慮使用 `tmpfs` 掛載 `/tmp`

## 疑難排解

### 容器無法啟動

1. 檢查 Docker 是否執行
2. 檢查連接埠是否被佔用
3. 查看 Docker logs:
   ```bash
   docker compose -f .devcontainer/docker-compose.devcontainer.yml logs
   ```

### 資料庫連線失敗

1. 確認資料庫容器健康狀態:

   ```bash
   docker compose -f .devcontainer/docker-compose.devcontainer.yml ps
   ```

2. 檢查資料庫日誌:

   ```bash
   docker compose -f .devcontainer/docker-compose.devcontainer.yml logs db
   ```

3. 手動測試連線:
   ```bash
   psql -h localhost -p 5432 -U moa_user -d moa_db
   ```

### npm install 失敗

1. 刪除 node_modules volume:

   ```bash
   docker volume rm moa_devcontainer_node_modules
   ```

2. 重新建構容器:
   ```bash
   # 在 VS Code 指令面板執行
   Dev Containers: Rebuild Container
   ```

### Git 權限警告

如果看到 "dubious ownership" 警告：

```bash
git config --global --add safe.directory /workspace
```

(此指令已在 `postStartCommand` 中自動執行)

### 擴充套件無法安裝

1. 確認擴充套件 ID 正確
2. 檢查網路連線
3. 手動安裝:
   ```bash
   code --install-extension publisher.extension-name
   ```

## 相關文件

- [VS Code Dev Containers 文件](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container 規格](https://containers.dev/)
- [Docker Compose 文件](https://docs.docker.com/compose/)
- [Dockerfile 參考](https://docs.docker.com/engine/reference/builder/)

## 專案特定文件

- [主要 README](../README.md)
- [生產環境部署](../docs/PRODUCTION-DEPLOYMENT.md)
- [CI/CD 工作流程](../docs/CI-CD.md)
- [Docker 最佳實作](../.github/instructions/docker.instructions.md)
