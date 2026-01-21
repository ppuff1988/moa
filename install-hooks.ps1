# Git Hooks Installation Script (PowerShell)
# 安裝 Git hooks 到 .git/hooks 目錄

$HOOKS_DIR = ".githooks"
$GIT_HOOKS_DIR = ".git/hooks"

Write-Host "🔧 設定 Git hooks..." -ForegroundColor Cyan

# 檢查 .git 目錄是否存在
if (-not (Test-Path -Path ".git" -PathType Container)) {
    Write-Host "❌ 錯誤：.git 目錄不存在，請確保在 Git 儲存庫中執行此腳本" -ForegroundColor Red
    exit 1
}

# 建立 .git/hooks 目錄（如果不存在）
if (-not (Test-Path -Path $GIT_HOOKS_DIR -PathType Container)) {
    New-Item -Path $GIT_HOOKS_DIR -ItemType Directory -Force | Out-Null
}

# 複製所有 hooks 到 .git/hooks
if (Test-Path -Path $HOOKS_DIR -PathType Container) {
    Get-ChildItem -Path $HOOKS_DIR -File | ForEach-Object {
        $hookName = $_.Name
        $destination = Join-Path -Path $GIT_HOOKS_DIR -ChildPath $hookName
        Copy-Item -Path $_.FullName -Destination $destination -Force
        Write-Host "✅ 已安裝: $hookName" -ForegroundColor Green
    }
    Write-Host "✨ Git hooks 安裝完成！" -ForegroundColor Green
} else {
    Write-Host "❌ 錯誤：$HOOKS_DIR 目錄不存在" -ForegroundColor Red
    exit 1
}
