@echo off
REM MOA 專案快速指令

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="dev" goto dev
if "%1"=="build" goto build
if "%1"=="test" goto test
if "%1"=="lint" goto lint
if "%1"=="docker-up" goto docker-up
if "%1"=="docker-down" goto docker-down
if "%1"=="ci-local" goto ci-local
goto help

:help
echo 可用的指令：
echo   help         - 顯示此幫助訊息
echo   install      - 安裝依賴
echo   dev          - 啟動開發伺服器
echo   build        - 建置應用程式
echo   test         - 執行所有測試
echo   lint         - 執行程式碼檢查
echo   docker-up    - 啟動 Docker 容器
echo   docker-down  - 停止 Docker 容器
echo   ci-local     - 在本地模擬 CI 流程
echo.
echo 使用方式: moa.bat [指令]
goto end

:install
echo 正在安裝依賴...
call npm ci
goto end

:dev
echo 正在啟動開發伺服器...
call npm run dev
goto end

:build
echo 正在建置應用程式...
call npm run build
goto end

:test
echo 正在執行所有測試...
call npm test
goto end

:lint
echo 正在執行程式碼檢查...
call npm run lint
goto end

:docker-up
echo 正在啟動 Docker 容器...
docker-compose up -d
goto end

:docker-down
echo 正在停止 Docker 容器...
docker-compose down
goto end

:ci-local
echo 正在執行 Lint...
call npm run lint
if errorlevel 1 goto ci-error

echo 正在執行類型檢查...
call npm run check
if errorlevel 1 goto ci-error

echo 正在執行測試...
call npm test
if errorlevel 1 goto ci-error

echo 正在執行建置...
call npm run build
if errorlevel 1 goto ci-error

echo.
echo ✓ 所有檢查通過！
goto end

:ci-error
echo.
echo ✗ CI 檢查失敗！
goto end

:end

