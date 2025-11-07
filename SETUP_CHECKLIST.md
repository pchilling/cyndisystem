# 🚀 LINE 童裝代購系統 - 快速設定檢查清單

按照此清單逐步完成系統設定，預估時間約 2-3 小時。

## ✅ 第一階段：環境準備 (30分鐘)

### 1. 工具安裝
- [ ] Node.js 16+ 已安裝
- [ ] Git 已安裝
- [ ] 程式碼編輯器 (VS Code 推薦)

### 2. 帳號準備
- [ ] LINE 個人帳號
- [ ] Google 帳號
- [ ] 部署平台帳號 (Heroku/Railway)

### 3. 專案設置
- [ ] 下載專案代碼
- [ ] 執行 `npm install`
- [ ] 複製 `env.example` 為 `.env`

## ✅ 第二階段：Google Sheets 設定 (30分鐘)

### 1. 建立試算表
- [ ] 建立新的 Google Sheets
- [ ] 重新命名為「Cyndi 童裝代購系統」
- [ ] 建立三個工作表：
  - [ ] `商品資料庫`
  - [ ] `訂單資料庫`
  - [ ] `客戶資料庫`

### 2. 設定欄位標題

**商品資料庫 (第一列)**
- [ ] A1: 商品編號
- [ ] B1: 商品名稱  
- [ ] C1: 價格
- [ ] D1: 成本
- [ ] E1: 狀態
- [ ] F1: 分類
- [ ] G1: 圖片網址
- [ ] H1: 商品描述
- [ ] I1: 可選尺寸
- [ ] J1: 庫存數量

**訂單資料庫 (第一列)**
- [ ] A1: 訂單編號
- [ ] B1: LINE用戶ID
- [ ] C1: 客戶姓名
- [ ] D1: 聯絡電話
- [ ] E1: 收件地址
- [ ] F1: 商品明細
- [ ] G1: 訂單金額
- [ ] H1: 下單時間
- [ ] I1: 付款狀態
- [ ] J1: 配貨狀態
- [ ] K1: 出貨狀態
- [ ] L1: 備註

**客戶資料庫 (第一列)**
- [ ] A1: LINE用戶ID
- [ ] B1: 客戶姓名
- [ ] C1: 聯絡電話
- [ ] D1: 收件地址
- [ ] E1: 註冊時間
- [ ] F1: 最後互動時間
- [ ] G1: 總消費金額
- [ ] H1: VIP標籤

### 3. 加入測試資料
- [ ] 在商品資料庫中加入 2-3 筆範例商品
- [ ] 複製 Google Sheets 的分享連結 ID

### 4. Google Cloud 設定
- [ ] 前往 [Google Cloud Console](https://console.cloud.google.com/)
- [ ] 建立新專案或選擇現有專案
- [ ] 啟用 Google Sheets API
- [ ] 建立服務帳號
- [ ] 下載服務帳號 JSON 金鑰
- [ ] 將服務帳號 email 加入 Google Sheets 的編輯權限
- [ ] 將 `client_email` 和 `private_key` 填入 `.env`

## ✅ 第三階段：LINE Bot 設定 (45分鐘)

### 1. LINE Developer Console
- [ ] 登入 [LINE Developers](https://developers.line.biz/)
- [ ] 建立 Provider：`Cyndi韓國童裝代購`
- [ ] 建立 Messaging API Channel

### 2. Channel 設定
- [ ] 取得 Channel Access Token
- [ ] 取得 Channel Secret
- [ ] 填入 `.env` 檔案

### 3. Webhook 設定
- [ ] 設定 Webhook URL (先用 ngrok)
- [ ] 開啟 Use webhook
- [ ] 關閉 Auto-reply messages
- [ ] 關閉 Greeting messages

### 4. LIFF 應用設定
- [ ] 在 Channel 中建立 LIFF 應用
- [ ] Size 設為 `Full`
- [ ] Endpoint URL 設為你的網域/liff
- [ ] 取得 LIFF ID 並填入 `.env`

### 5. LINE Notify 設定
- [ ] 前往 [LINE Notify](https://notify-bot.line.me/)
- [ ] 發行權杖
- [ ] 選擇接收通知的聊天室
- [ ] 將權杖填入 `.env`

## ✅ 第四階段：測試運行 (30分鐘)

### 1. 本地測試
- [ ] 執行 `npm run dev`
- [ ] 使用 ngrok 建立公開網址
- [ ] 更新 LINE Bot Webhook URL
- [ ] 測試 Webhook 連線

### 2. 功能測試
- [ ] 掃描 QR Code 加入 Bot
- [ ] 測試歡迎訊息
- [ ] 測試「我要下單」指令
- [ ] 測試商品展示
- [ ] 測試加入購物車
- [ ] 測試 LIFF 頁面
- [ ] 測試訂單流程

### 3. 通知測試
- [ ] 測試 LINE Notify 發送
- [ ] 確認能收到新訂單通知

## ✅ 第五階段：部署上線 (45分鐘)

### 1. 準備部署
- [ ] 選擇部署平台 (Heroku/Railway)
- [ ] 建立應用
- [ ] 設定環境變數

### 2. Heroku 部署 (如選擇 Heroku)
```bash
# 安裝 Heroku CLI
heroku login
heroku create your-app-name

# 設定環境變數
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set LIFF_ID=your_liff_id
heroku config:set GOOGLE_SHEETS_ID=your_sheets_id
heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email
heroku config:set GOOGLE_PRIVATE_KEY="your_private_key"
heroku config:set LINE_NOTIFY_TOKEN=your_notify_token

# 部署
git add .
git commit -m "Initial deployment"
git push heroku main
```

### 3. 更新設定
- [ ] 更新 LINE Bot Webhook URL 為正式網址
- [ ] 更新 LIFF Endpoint URL 為正式網址
- [ ] 測試正式環境功能

## ✅ 第六階段：營運設定 (15分鐘)

### 1. 商品上架
- [ ] 在 Google Sheets 中新增實際商品
- [ ] 設定商品圖片 (建議使用 Imgur)
- [ ] 測試商品展示

### 2. 訊息客製化
- [ ] 修改歡迎訊息內容
- [ ] 調整商品分類
- [ ] 設定店家資訊

### 3. 分享推廣
- [ ] 建立 Bot QR Code
- [ ] 分享給測試用戶
- [ ] 收集使用反饋

## 🔍 檢查清單完成確認

**系統基本功能**
- [ ] Bot 能正常回應訊息
- [ ] 商品能正確顯示
- [ ] 購物車功能正常
- [ ] 訂單能成功建立
- [ ] Google Sheets 正確寫入資料
- [ ] LINE Notify 通知正常

**LIFF 功能**
- [ ] LIFF 頁面能正常開啟
- [ ] 商品篩選和搜尋正常
- [ ] 購物車操作正常
- [ ] 訂單表單能正常提交

**資料流程**
- [ ] 客戶資料正確記錄
- [ ] 訂單資料完整
- [ ] VIP 分級功能正常
- [ ] 銷售統計正確

## 🚨 常見問題快速解決

### Bot 無回應
1. 檢查 Webhook URL 是否正確
2. 確認伺服器正在運行
3. 檢查 Channel Access Token

### LIFF 無法開啟  
1. 檢查 LIFF Endpoint URL
2. 確認 HTTPS 設定
3. 檢查 LIFF ID

### Google Sheets 連線失敗
1. 檢查服務帳號權限
2. 確認 Sheets ID 正確
3. 檢查 private_key 格式

## 🎉 完成後的下一步

- [ ] 邀請真實用戶測試
- [ ] 收集使用反饋
- [ ] 優化用戶體驗
- [ ] 擴充功能需求
- [ ] 建立客服 SOP

---

**🎊 恭喜！您的 LINE 童裝代購自動化系統已經準備就緒！**

現在您可以：
- 自動處理客戶訂單
- 減少人工作業時間
- 提升客戶購物體驗
- 有效管理客戶資料
- 即時掌握銷售狀況 