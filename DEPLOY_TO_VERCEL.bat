@echo off
echo ========================================
echo  Vercel 部署助手
echo ========================================
echo.

cd /d %~dp0

echo [檢查] Git 是否已安裝...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：未安裝 Git
    echo.
    echo 請先安裝 Git: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo ✅ Git 已安裝
echo.

echo ========================================
echo  選擇部署方式
echo ========================================
echo.
echo [1] 初次部署（建立 GitHub Repository）
echo [2] 更新部署（已有 Repository）
echo [3] 只查看狀態
echo [4] 取消
echo.
set /p choice="請選擇 (1-4): "

if "%choice%"=="1" goto :first_deploy
if "%choice%"=="2" goto :update_deploy
if "%choice%"=="3" goto :status
if "%choice%"=="4" goto :end

echo 無效的選擇
goto :end

:first_deploy
echo.
echo ========================================
echo  初次部署設定
echo ========================================
echo.
echo 請先完成以下步驟：
echo.
echo 1. 前往 https://github.com/new
echo 2. 建立新 Repository 名為: cyndisystem
echo 3. 選擇 Private
echo 4. 不要勾選任何初始化選項
echo 5. 複製 Repository URL
echo.
pause
echo.

echo [步驟 1/4] 初始化 Git...
if exist .git (
    echo Git 已初始化，跳過
) else (
    git init
    echo ✅ Git 初始化完成
)
echo.

echo [步驟 2/4] 新增檔案...
git add .
echo ✅ 檔案已新增
echo.

echo [步驟 3/4] 建立 Commit...
git commit -m "Initial commit - Vercel ready"
if errorlevel 1 (
    echo ⚠️  沒有變更需要 commit
) else (
    echo ✅ Commit 完成
)
echo.

echo [步驟 4/4] 設定 GitHub Remote...
set /p github_url="請貼上你的 GitHub Repository URL: "
git remote add origin %github_url%
git branch -M main
echo ✅ Remote 設定完成
echo.

echo [推送到 GitHub]
git push -u origin main
if errorlevel 1 (
    echo.
    echo ⚠️  推送失敗，可能是因為：
    echo 1. GitHub 認證失敗
    echo 2. Repository URL 不正確
    echo 3. Repository 已有內容
    echo.
    echo 請檢查錯誤訊息並重試
    pause
    goto :end
)
echo.
echo ✅ 推送成功！
echo.
echo ========================================
echo  下一步：部署到 Vercel
echo ========================================
echo.
echo 1. 前往 https://vercel.com
echo 2. 用 GitHub 登入
echo 3. 點擊 "Add New..." → "Project"
echo 4. 找到 cyndisystem 並點擊 "Import"
echo 5. 設定環境變數（參考 VERCEL_DEPLOY_GUIDE.md）
echo 6. 點擊 "Deploy"
echo.
echo 詳細步驟請查看: VERCEL_DEPLOY_GUIDE.md
echo.
pause
goto :end

:update_deploy
echo.
echo ========================================
echo  更新部署
echo ========================================
echo.

echo [檢查] 是否有變更...
git status --short
if errorlevel 1 (
    echo ❌ Git 未初始化
    echo 請先執行「初次部署」
    pause
    goto :end
)
echo.

set /p commit_msg="請輸入更新說明: "
if "%commit_msg%"=="" set commit_msg=Update

echo.
echo [步驟 1/3] 新增變更...
git add .
echo ✅ 完成
echo.

echo [步驟 2/3] 建立 Commit...
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo ⚠️  沒有變更需要 commit
    pause
    goto :end
)
echo ✅ 完成
echo.

echo [步驟 3/3] 推送到 GitHub...
git push
if errorlevel 1 (
    echo ❌ 推送失敗
    echo 請檢查網路連線和 GitHub 認證
    pause
    goto :end
)
echo.
echo ✅ 推送成功！
echo.
echo Vercel 會自動偵測並重新部署
echo 請稍等 1-2 分鐘後檢查 https://vercel.com/dashboard
echo.
pause
goto :end

:status
echo.
echo ========================================
echo  Git 狀態
echo ========================================
echo.
git status
echo.
echo ========================================
echo  最近的 Commits
echo ========================================
echo.
git log --oneline -5
echo.
pause
goto :end

:end
echo.
echo 完成！
pause
