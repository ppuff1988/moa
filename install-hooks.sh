#!/usr/bin/env bash

# Git Hooks Installation Script
# 安裝 Git hooks 到 .git/hooks 目錄

HOOKS_DIR=".githooks"
GIT_HOOKS_DIR=".git/hooks"

echo "🔧 設定 Git hooks..."

# 檢查 .git 目錄是否存在
if [ ! -d ".git" ]; then
  echo "❌ 錯誤：.git 目錄不存在，請確保在 Git 儲存庫中執行此腳本"
  exit 1
fi

# 建立 .git/hooks 目錄（如果不存在）
mkdir -p "$GIT_HOOKS_DIR"

# 複製所有 hooks 到 .git/hooks
if [ -d "$HOOKS_DIR" ]; then
  for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
      hook_name=$(basename "$hook")
      cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
      chmod +x "$GIT_HOOKS_DIR/$hook_name"
      echo "✅ 已安裝: $hook_name"
    fi
  done
  echo "✨ Git hooks 安裝完成！"
else
  echo "❌ 錯誤：$HOOKS_DIR 目錄不存在"
  exit 1
fi
