# LINE Bot 設定指南

本指南將協助您完成 LINE Bot 的完整設定流程。

## 📋 設定清單

- [ ] 建立 LINE Developer 帳號
- [ ] 建立 Provider 和 Channel
- [ ] 設定 Webhook URL
- [ ] 建立 LIFF 應用
- [ ] 設定 LINE Notify
- [ ] 測試 Bot 功能

## 🚀 Step 1: 建立 LINE Developer 帳號

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 使用您的 LINE 帳號登入
3. 同意服務條款

## 🏢 Step 2: 建立 Provider

Provider 是您的開發者身份，一個 Provider 可以有多個 Channel。

1. 點擊「Create Provider」
2. 輸入 Provider 名稱：`Cyndi韓國童裝代購`
3. 點擊「Create」

## 🤖 Step 3: 建立 Messaging API Channel

1. 在 Provider 頁面點擊「Create a Messaging API channel」
2. 填寫 Channel 資訊：
   - **Channel name**: `Cyndi童裝代購Bot`
   - **Channel description**: `韓國童裝代購自動化訂購系統`
   - **Category**: `Shopping`
   - **Subcategory**: `Clothing/Fashion`
   - **Email address**: 您的聯絡信箱
3. 勾選同意條款
4. 點擊「Create」

## 🔑 Step 4: 取得 Channel 資訊

建立完成後，您需要取得以下資訊：

### Channel Access Token
1. 進入 Channel 設定頁面
2. 點擊「Messaging API」標籤
3. 在「Channel access token」區域點擊「Issue」
4. 複製產生的 Token

### Channel Secret
1. 在「Basic settings」標籤
2. 找到「Channel secret」
3. 點擊「Show」並複製

### Webhook 設定
1. 在「Messaging API」標籤
2. 找到「Webhook settings」
3. 設定 Webhook URL：`https://your-domain.com/webhook`
4. 開啟「Use webhook」
5. 關閉「Auto-reply messages」
6. 關閉「Greeting messages」

## 📱 Step 5: 建立 LIFF 應用

LIFF (LINE Front-end Framework) 讓您的網頁在 LINE 中運行。

1. 在 Channel 頁面點擊「LIFF」標籤
2. 點擊「Add」建立新的 LIFF 應用
3. 填寫設定：
   - **LIFF app name**: `童裝選購頁面`
   - **Size**: `Full`
   - **Endpoint URL**: `https://your-domain.com/liff`
   - **Scope**: 勾選 `profile` 和 `openid`
   - **Bot link feature**: `On (Aggressive)`
4. 點擊「Add」
5. 複製產生的 LIFF ID

## 🔔 Step 6: 設定 LINE Notify

LINE Notify 用於發送通知給管理員。

1. 前往 [LINE Notify](https://notify-bot.line.me/)
2. 登入您的 LINE 帳號
3. 點擊「個人頁面」
4. 點擊「發行權杖」
5. 填寫權杖名稱：`童裝代購系統通知`
6. 選擇要接收通知的聊天室
7. 點擊「發行」
8. 複製產生的權杖

## ⚙️ Step 7: 環境變數設定

將取得的資訊填入 `.env` 檔案：

```env
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的Channel_Access_Token
LINE_CHANNEL_SECRET=你的Channel_Secret
LIFF_ID=你的LIFF_ID

# LINE Notify 設定
LINE_NOTIFY_TOKEN=你的LINE_Notify_Token
```

## 🧪 Step 8: 測試設定

### 測試 Webhook
1. 啟動您的伺服器：`npm start`
2. 使用 ngrok 建立公開網址（開發環境）：
   ```bash
   ngrok http 3000
   ```
3. 更新 LINE Bot 的 Webhook URL
4. 在 LINE Developers Console 測試 Webhook 連線

### 測試 Bot 功能
1. 掃描 QR Code 加入 Bot 好友
2. 發送「說明」測試自動回覆
3. 發送「我要下單」測試商品展示
4. 點擊 LIFF 按鈕測試網頁功能

### 測試 LINE Notify
```bash
curl -X POST \
  https://notify-api.line.me/api/notify \
  -H 'Authorization: Bearer 你的LINE_Notify_Token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'message=測試訊息'
```

## 🎨 Bot 客製化

### 設定 Bot 頭像和名稱
1. 在「Basic settings」標籤
2. 上傳 Bot 頭像（512x512 像素）
3. 設定 Bot 顯示名稱

### 設定歡迎訊息
如果需要自訂歡迎訊息：
1. 在「Messaging API」標籤
2. 設定「Greeting message」
3. 或在程式碼中處理 `follow` 事件

### 設定選單
建立 Rich Menu 讓用戶更容易操作：
1. 設計選單圖片（2500x1686 像素）
2. 使用 LINE Bot Designer 或程式碼建立
3. 設定點擊區域和對應動作

## 🚀 部署到正式環境

### 使用 Heroku
```bash
# 建立 Heroku 應用
heroku create your-app-name

# 設定環境變數
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set LIFF_ID=your_liff_id
heroku config:set LINE_NOTIFY_TOKEN=your_notify_token

# 部署
git push heroku main
```

### 更新 Webhook URL
部署完成後，更新 LINE Bot 的 Webhook URL：
`https://your-app-name.herokuapp.com/webhook`

## 🔧 常見問題

### Bot 無回應
- 檢查 Webhook URL 是否正確
- 檢查伺服器是否正常運行
- 檢查 Channel Access Token 是否正確
- 確認已關閉自動回覆功能

### LIFF 無法開啟
- 檢查 Endpoint URL 是否可存取
- 確認 LIFF ID 設定正確
- 檢查網頁是否支援 HTTPS

### LINE Notify 無法發送
- 檢查權杖是否有效
- 確認 API 請求格式正確
- 檢查網路連線

### Webhook 驗證失敗
- 檢查 Channel Secret 設定
- 確認請求簽章驗證邏輯
- 檢查伺服器時間是否正確

## 📚 參考資源

- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [LIFF 文件](https://developers.line.biz/en/docs/liff/)
- [LINE Notify 文件](https://notify-bot.line.me/doc/)
- [Flex Message Simulator](https://developers.line.biz/flex-simulator/)

## 🆘 技術支援

如果遇到問題，請提供以下資訊：

1. 錯誤訊息截圖
2. 伺服器日誌
3. LINE Bot 設定截圖
4. 環境變數確認（隱藏敏感資訊）

---

**完成設定後，您的 LINE Bot 就能開始為客戶提供自動化購物服務了！** 