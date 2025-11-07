@echo off
echo ========================================
echo  自動設定 Vercel 環境變數
echo ========================================
echo.

REM 從 .env 讀取並設定到 Vercel
echo [1/10] 設定 LINE_CHANNEL_ACCESS_TOKEN...
vercel env add LINE_CHANNEL_ACCESS_TOKEN production < nul
vercel env add LINE_CHANNEL_ACCESS_TOKEN preview < nul
vercel env add LINE_CHANNEL_ACCESS_TOKEN development < nul

echo [2/10] 設定 LINE_CHANNEL_SECRET...
vercel env add LINE_CHANNEL_SECRET production < nul
vercel env add LINE_CHANNEL_SECRET preview < nul
vercel env add LINE_CHANNEL_SECRET development < nul

echo [3/10] 設定 TEST_GROUP_ID...
vercel env add TEST_GROUP_ID production < nul
vercel env add TEST_GROUP_ID preview < nul
vercel env add TEST_GROUP_ID development < nul

echo [4/10] 設定 LINE_LOGIN_CHANNEL_ID...
vercel env add LINE_LOGIN_CHANNEL_ID production < nul
vercel env add LINE_LOGIN_CHANNEL_ID preview < nul
vercel env add LINE_LOGIN_CHANNEL_ID development < nul

echo [5/10] 設定 SUPABASE_URL...
vercel env add SUPABASE_URL production < nul
vercel env add SUPABASE_URL preview < nul
vercel env add SUPABASE_URL development < nul

echo [6/10] 設定 SUPABASE_ANON_KEY...
vercel env add SUPABASE_ANON_KEY production < nul
vercel env add SUPABASE_ANON_KEY preview < nul
vercel env add SUPABASE_ANON_KEY development < nul

echo [7/10] 設定 SUPABASE_SERVICE_ROLE_KEY...
vercel env add SUPABASE_SERVICE_ROLE_KEY production < nul
vercel env add SUPABASE_SERVICE_ROLE_KEY preview < nul
vercel env add SUPABASE_SERVICE_ROLE_KEY development < nul

echo [8/10] 設定 Supabase_Database_Password...
vercel env add Supabase_Database_Password production < nul
vercel env add Supabase_Database_Password preview < nul
vercel env add Supabase_Database_Password development < nul

echo [9/10] 設定 ADMIN_API_KEY...
vercel env add ADMIN_API_KEY production < nul
vercel env add ADMIN_API_KEY preview < nul
vercel env add ADMIN_API_KEY development < nul

echo [10/10] 設定 NODE_ENV...
vercel env add NODE_ENV production < nul
vercel env add NODE_ENV preview < nul
vercel env add NODE_ENV development < nul

echo.
echo ✅ 環境變數設定完成！
echo.
pause
