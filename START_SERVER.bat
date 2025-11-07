@echo off
echo ========================================
echo  Cyndi 韓國童裝代購 - 管理系統啟動
echo ========================================
echo.

cd /d %~dp0

echo [1/3] 檢查 Node.js 環境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：未安裝 Node.js
    echo.
    echo 請先安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安裝

echo.
echo [2/3] 檢查專案依賴...
if not exist node_modules (
    echo ⚠️  第一次啟動，正在安裝依賴套件...
    echo 這可能需要幾分鐘時間，請耐心等候...
    call npm install
)
echo ✅ 依賴套件已就緒

echo.
echo [3/3] 啟動伺服器...
echo.
echo ========================================
echo  🚀 伺服器正在啟動中...
echo ========================================
echo.
echo 管理後台網址:
echo   👉 http://localhost:3000/admin
echo.
echo LINE Bot Webhook:
echo   👉 http://localhost:3000/webhook
echo.
echo ⚠️  請保持此視窗開啟！
echo ⚠️  按 Ctrl+C 可停止伺服器
echo.
echo ========================================
echo.

node src/server.js

pause
