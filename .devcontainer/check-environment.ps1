# Dev Container 環境檢查腳本 (PowerShell 版本)
# 用於驗證開發環境是否正確設定

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   MOA Dev Container 環境檢查" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 檢查命令函式
function Test-Command {
    param(
        [string]$Command,
        [string]$Name,
        [string]$ExpectedVersion = ""
    )
    
    try {
        $version = & $Command --version 2>&1 | Select-Object -First 1
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$Name`: $version"
        
        if ($ExpectedVersion -and $version -notlike "*$ExpectedVersion*") {
            Write-Host "  警告: 預期版本包含 $ExpectedVersion" -ForegroundColor Yellow
        }
        return $true
    }
    catch {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        Write-Host "$Name`: 未安裝"
        return $false
    }
}

# 檢查環境變數函式
function Test-EnvVariable {
    param(
        [string]$Variable,
        [string]$Name
    )
    
    $value = [System.Environment]::GetEnvironmentVariable($Variable)
    if ($value) {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$Name`: 已設定"
        return $true
    }
    else {
        Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
        Write-Host "$Name`: 未設定"
        return $false
    }
}

# 1. 檢查系統工具
Write-Host "1️⃣  檢查系統工具" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Test-Command -Command "node" -Name "Node.js" -ExpectedVersion "v22"
Test-Command -Command "npm" -Name "npm"
Test-Command -Command "git" -Name "Git"
Test-Command -Command "docker" -Name "Docker"
Write-Host ""

# 2. 檢查 Node.js 套件
Write-Host "2️⃣  檢查 Node.js 套件" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
if (Test-Path "node_modules") {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "node_modules: 已安裝"
    
    $packages = @("svelte", "vite", "@sveltejs/kit", "drizzle-orm", "postgres")
    foreach ($pkg in $packages) {
        $pkgPath = "node_modules/$pkg"
        if (Test-Path $pkgPath) {
            Write-Host "  ✓ $pkg" -ForegroundColor Green
        }
        else {
            Write-Host "  ✗ $pkg" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "node_modules: 未安裝"
    Write-Host "  提示: 執行 npm install" -ForegroundColor Yellow
}
Write-Host ""

# 3. 檢查環境變數
Write-Host "3️⃣  檢查環境變數" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
if (Test-Path ".env") {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host ".env 檔案: 存在"
    
    # 載入 .env
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [System.Environment]::SetEnvironmentVariable($name, $value)
        }
    }
    
    Test-EnvVariable -Variable "DATABASE_URL" -Name "DATABASE_URL"
    Test-EnvVariable -Variable "JWT_SECRET" -Name "JWT_SECRET"
    Test-EnvVariable -Variable "NODE_ENV" -Name "NODE_ENV"
    Test-EnvVariable -Variable "GOOGLE_CLIENT_ID" -Name "GOOGLE_CLIENT_ID（選用）"
    Test-EnvVariable -Variable "SMTP_HOST" -Name "SMTP_HOST（選用）"
}
else {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host ".env 檔案: 不存在"
    Write-Host "  提示: 複製 .env.devcontainer.example 為 .env" -ForegroundColor Yellow
}
Write-Host ""

# 4. 檢查資料庫連線
Write-Host "4️⃣  檢查資料庫連線" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
try {
    $null = docker exec moa_devcontainer_postgres psql -U moa_user -d moa_db -c "SELECT 1" 2>&1
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "PostgreSQL: 連線成功"
    
    # 取得資料庫版本
    $version = docker exec moa_devcontainer_postgres psql -U moa_user -d moa_db -t -c "SELECT version()" 2>&1 | Select-Object -First 1
    Write-Host "  版本: $version"
    
    # 檢查資料表
    $tableCount = docker exec moa_devcontainer_postgres psql -U moa_user -d moa_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>&1
    Write-Host "  資料表數量: $($tableCount.Trim())"
}
catch {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "PostgreSQL: 連線失敗"
}
Write-Host ""

# 5. 檢查連接埠
Write-Host "5️⃣  檢查連接埠" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$tcpClient = New-Object System.Net.Sockets.TcpClient
try {
    $tcpClient.Connect("localhost", 5173)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "連接埠 5173: 已開啟（應用程式可能正在執行）"
    $tcpClient.Close()
}
catch {
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host "連接埠 5173: 未使用"
}
Write-Host ""

# 6. 檢查 Git 設定
Write-Host "6️⃣  檢查 Git 設定" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
$gitName = git config user.name 2>$null
$gitEmail = git config user.email 2>$null

if ($gitName) {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "Git user.name: $gitName"
}
else {
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host "Git user.name: 未設定"
}

if ($gitEmail) {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "Git user.email: $gitEmail"
}
else {
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host "Git user.email: 未設定"
}
Write-Host ""

# 7. 總結
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   檢查完成" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 下一步建議：" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "  1. 執行 " -NoNewline -ForegroundColor Yellow
    Write-Host "npm install" -ForegroundColor Green -NoNewline
    Write-Host " 安裝相依套件"
}

if (-not (Test-Path ".env")) {
    Write-Host "  2. 複製 " -NoNewline -ForegroundColor Yellow
    Write-Host "cp .env.devcontainer.example .env" -ForegroundColor Green
}

Write-Host "  3. 啟動開發伺服器: " -NoNewline -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor Green

Write-Host "  4. 執行測試: " -NoNewline -ForegroundColor Yellow
Write-Host "npm run test:api" -ForegroundColor Green

Write-Host "  5. 訪問 " -NoNewline -ForegroundColor Yellow
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host ""
