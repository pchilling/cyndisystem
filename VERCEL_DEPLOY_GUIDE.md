# 🚀 Vercel 部署指南

## 📋 前置準備

### 1. 確認檔案已就緒
- ✅ `vercel.json` - Vercel 設定檔
- ✅ `api/index.js` - Serverless 入口點
- ✅ `.vercelignore` - 忽略不必要的檔案

### 2. 建立 GitHub Repository（必要）

Vercel 需要連接到 GitHub 才能自動部署。

**步驟：**

1. **在 GitHub 建立新 Repository**
   - 前往 https://github.com/new
   - Repository 名稱：`cyndisystem`
   - 選擇 Private（私人專案）
   - 不要勾選任何初始化選項
   - 點擊「Create repository」

2. **將專案上傳到 GitHub**

   開啟命令提示字元（CMD），執行：

   ```bash
   cd C:\Users\ASUS\Desktop\work\cyndisystem

   # 初始化 git
   git init

   # 新增所有檔案
   git add .

   # 建立第一個 commit
   git commit -m "Initial commit - Vercel ready"

   # 連接到 GitHub（替換成你的 GitHub 帳號）
   git remote add origin https://github.com/你的帳號/cyndisystem.git

   # 推送到 GitHub
   git branch -M main
   git push -u origin main
   ```

---

## 🚀 部署到 Vercel

### 步驟 1：登入 Vercel

1. 前往 https://vercel.com
2. 點擊「Sign Up」或「Log In」
3. 選擇「Continue with GitHub」
4. 授權 Vercel 訪問你的 GitHub

### 步驟 2：匯入專案

1. 在 Vercel Dashboard，點擊「Add New...」→「Project」
2. 找到你的 `cyndisystem` repository
3. 點擊「Import」

### 步驟 3：設定環境變數 ⚠️ 重要！

在「Configure Project」頁面：

1. 展開「Environment Variables」
2. 新增以下環境變數（從你的 `.env` 複製）：

```
LINE_CHANNEL_ACCESS_TOKEN=你的LINE_ACCESS_TOKEN
LINE_CHANNEL_SECRET=你的LINE_SECRET
TEST_GROUP_ID=你的群組ID
LINE_LOGIN_CHANNEL_ID=你的LOGIN_CHANNEL_ID

SUPABASE_URL=https://lfcqmuztnsaxgksmfbov.supabase.co
SUPABASE_ANON_KEY=你的SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=你的SUPABASE_SERVICE_ROLE_KEY
Supabase_Database_Password=你的密碼

ADMIN_API_KEY=cyndi2024admin

NODE_ENV=production
```

**重要提示：**
- 不要上傳 `.env` 檔案到 GitHub
- 所有敏感資訊都要設定在 Vercel 的環境變數

### 步驟 4：部署

1. 確認所有設定正確
2. 點擊「Deploy」
3. 等待部署完成（約 1-2 分鐘）

### 步驟 5：取得網址

部署完成後，你會看到：

```
🎉 Congratulations!
Your project is live at: https://cyndisystem.vercel.app
```

**你的管理後台網址：**
```
https://cyndisystem.vercel.app/admin
```

**LINE Bot Webhook 網址：**
```
https://cyndisystem.vercel.app/webhook
```

---

## 🔧 設定 LINE Bot Webhook

### 更新 LINE Developers Console

1. 前往 https://developers.line.biz/console/
2. 選擇你的 Channel
3. 進入「Messaging API」設定
4. 找到「Webhook URL」
5. 更新為：`https://cyndisystem.vercel.app/webhook`
6. 點擊「Verify」測試連線
7. 啟用「Use webhook」

---

## ✅ 驗證部署

### 測試 1：檢查伺服器運行

在瀏覽器開啟：
```
https://cyndisystem.vercel.app/
```

應該會看到：
```json
{
  "status": "ok",
  "message": "LINE 童裝代購自動化系統正在運行中 (Vercel)",
  "timestamp": "2025-11-08T..."
}
```

### 測試 2：檢查管理後台

開啟：
```
https://cyndisystem.vercel.app/admin
```

應該會看到管理後台介面。

### 測試 3：測試 LINE Bot

在 LINE 群組或私訊中發送訊息：
```
商品
```

Bot 應該會回應商品列表。

---

## 🔄 更新部署

每次修改程式碼後：

```bash
git add .
git commit -m "描述你的更改"
git push
```

Vercel 會自動偵測並重新部署（約 1 分鐘）。

---

## 🎨 自訂網域（選用）

### 如果你有自己的網域：

1. 在 Vercel Dashboard 進入你的專案
2. 點擊「Settings」→「Domains」
3. 輸入你的網域（例如：`admin.yourdomain.com`）
4. 按照指示設定 DNS 記錄
5. 等待 DNS 生效（最多 24 小時）

完成後管理後台網址就是：
```
https://admin.yourdomain.com/admin
```

---

## ⚠️ 常見問題

### 問題 1：部署後看不到管理後台

**原因：** 靜態檔案路徑問題

**解決方案：**
- 檢查 `vercel.json` 的 routes 設定
- 確認 `public/admin` 資料夾存在

### 問題 2：LINE Bot 沒有回應

**檢查清單：**
1. ✅ Webhook URL 設定正確
2. ✅ 環境變數都已設定
3. ✅ LINE Channel 已啟用 Webhook
4. ✅ Bot 沒有被封鎖

**除錯方式：**
- 在 Vercel Dashboard 查看 Logs
- 使用 LINE Developers Console 的 Webhook 測試功能

### 問題 3：環境變數沒有生效

**解決方案：**
1. 進入 Vercel Dashboard
2. Settings → Environment Variables
3. 確認所有變數都已設定
4. 修改後需要重新部署（Deployments → Redeploy）

### 問題 4：Notion 資料無法讀取

**檢查：**
- NOTION_API_KEY 是否已設定
- 各個 DATABASE_ID 是否正確
- 改用 Supabase（已經設定好）

---

## 📊 監控與日誌

### 查看運行狀態

1. 進入 Vercel Dashboard
2. 選擇你的專案
3. 點擊「Deployments」查看部署歷史
4. 點擊「Functions」查看 API 呼叫統計
5. 點擊「Logs」查看即時日誌

### 設定告警

1. Settings → Notifications
2. 設定 Email 通知
3. 當部署失敗或發生錯誤時會收到通知

---

## 💰 費用說明

### Vercel 免費方案限制：

- ✅ 100 GB 頻寬/月
- ✅ 100 次部署/天
- ✅ 無限專案
- ✅ 自動 HTTPS
- ✅ 全球 CDN

**對於小型代購系統完全足夠！**

### 超過限制怎麼辦？

免費方案對一般使用綽綽有餘。如果真的超過：
- 升級到 Pro 方案（$20/月）
- 或改用其他方案（Railway、Render）

---

## 🔐 安全建議

### 1. 保護管理後台

目前任何人都可以訪問管理後台。建議：

**選項 A：使用 Vercel 的密碼保護**
1. Settings → Protection
2. 啟用「Password Protection」
3. 設定密碼

**選項 B：實作登入功能**
- 我可以幫你加入登入頁面（30 分鐘）

### 2. 環境變數安全

- ✅ 不要把 `.env` 上傳到 GitHub
- ✅ 使用 `.gitignore` 排除敏感檔案
- ✅ 定期更換 API 金鑰

### 3. LINE Webhook 驗證

- ✅ 已實作簽章驗證
- ✅ 只接受來自 LINE 的請求

---

## 🎯 完成檢查清單

部署前確認：

- [ ] GitHub Repository 已建立
- [ ] 程式碼已推送到 GitHub
- [ ] Vercel 已連接到 GitHub
- [ ] 環境變數已在 Vercel 設定
- [ ] 專案已成功部署
- [ ] 管理後台可以訪問
- [ ] LINE Webhook URL 已更新
- [ ] LINE Bot 測試成功

---

## 📞 獲取幫助

如果遇到問題：

1. 查看 Vercel Dashboard 的 Logs
2. 檢查此文件的「常見問題」
3. 查看 Vercel 文檔：https://vercel.com/docs

---

## 🚀 下一步

部署成功後，你可以：

1. ✅ 把管理後台網址給客戶
2. ✅ 測試 LINE Bot 功能
3. ✅ 新增商品資料
4. ✅ 設定自訂網域（選用）
5. ✅ 實作登入功能（建議）

---

**準備好了嗎？開始部署吧！** 🚀

有任何問題隨時問我！
