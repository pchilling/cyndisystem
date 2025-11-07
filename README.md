# 📌 LINE 童裝代購自動化系統

一套完整的 LINE Bot + CRM 自動化系統，專為童裝代購業者設計，使用 Flex Message 實現完整購物體驗，整合 Notion 數據庫和 LINE Notify，並提供專業的管理員後台。

## 🎯 系統特色

- **完整 Flex Message 購物體驗**：
  - 商品分類瀏覽
  - 兩層式商品選擇（主商品 → 款式/顏色/尺寸）
  - 互動式購物車管理
  - Quick Reply 快速導航
- **Notion 資料庫整合**：
  - 主商品資料庫（Products）- 商品基本資訊
  - 商品變體資料庫（Variants）- 具體款式/顏色/尺寸
  - 客戶資料庫（Customers）- 完整客戶資訊
  - 訂單資料庫（Orders）- 訂單主檔
  - 訂單項目資料庫（Order Items）- 訂單明細
- **LINE Notify 自動通知**：
  - 新訂單通知
  - 付款確認通知
  - 訂單狀態更新通知
- **管理員後台系統**：
  - 訂單管理和處理
  - 客戶資料管理
  - 銷售數據分析

## 🛠 技術架構

- **後端**：Node.js + Express
- **資料庫**：Notion API（五個關聯資料庫）
- **前端**：
  - LINE Bot SDK（Flex Message、Quick Reply）
  - Bootstrap 5 + Chart.js（管理後台）
- **通知系統**：LINE Notify
- **部署**：支援 Heroku、Railway、AWS 等平台

## 📱 使用方式

### 客戶端操作流程

1. **開始購物**
   - 輸入「我要下單」
   - 顯示商品分類選單

2. **瀏覽商品**
   - 選擇商品分類
   - 瀏覽商品輪播
   - 選擇主商品
   - 選擇具體款式/顏色/尺寸

3. **購物車管理**
   - 加入購物車
   - 查看購物車內容
   - 調整商品數量
   - 移除商品
   - 清空購物車

4. **結帳流程**
   - 填寫/確認收件資訊
   - 選擇配送方式（宅配/店到店）
   - 確認訂單內容
   - 選擇付款方式
   - 完成訂單

### 🏪 支援的配送方式
- 宅配到府
- 7-11 店到店
- 全家店到店
- 萊爾富店到店
- OK 店到店

### 💳 支援的付款方式
- 銀行轉帳
- LINE Pay（計劃中）
- 貨到付款

## 📦 Notion 資料庫架構

### 1. 主商品資料表（Products）
- 商品基本資訊（名稱、編號、主分類、子分類）
- 商品主圖片
- 商品狀態（現貨/預購/停售）
- 關聯變體資料

### 2. 商品變體資料表（Variants）
- 關聯主商品
- 款式規格（包屁款/洋裝款等）
- 顏色選項
- 尺寸選項（S/M/L/XL 或 80cm/90cm/100cm）
- 性別區分
- 價格設定（售價、成本）
- 商品圖片
- 商品狀態

### 3. 客戶資料表（Customers）
- 基本資料（姓名、LINE ID、電話）
- 收件方式偏好
- 收件地址/門市資訊
- 客戶等級（一般/VIP/黑名單）
- 生日資料
- 消費統計（總金額、訂單次數）
- 備註資訊

### 4. 訂單資料表（Orders）
- 訂單基本資訊（編號、建立時間）
- 關聯客戶資料
- 收件人資料（姓名、電話、地址）
- 配送方式
- 付款資訊（方式、狀態）
- 金額資訊（商品總額、運費、折扣、實付）
- 訂單狀態
- 預計到貨日
- 備註說明

### 5. 訂單項目明細表（Order Items）
- 關聯訂單
- 關聯商品變體
- 商品資訊
- 數量和單價
- 小計金額
- 配貨狀態
- 備註說明

### 🆕 管理員後台功能

#### 訂單管理（已完成）✅
- **訂單列表**：查看所有訂單，支援狀態篩選和搜尋
- **狀態更新**：一鍵更新訂單狀態並自動通知客戶
- **基本訂單資訊**：顯示訂單摘要和客戶聯絡資訊

#### 管理儀表板（已完成）✅
- **營收統計**：總訂單數、待處理訂單、總營收
- **銷售趨勢圖**：最近7天的銷售額趨勢
- **最近訂單**：即時顯示最新的訂單資訊
- **訂單狀態分布**：各狀態訂單的數量統計

#### 其他功能（架構已建立，功能開發中）🏗️
- **客戶管理**：客戶列表、消費記錄、VIP 分級 - *架構完成，功能待實現*
- **商品管理**：商品列表、庫存管理、熱銷分析 - *架構完成，功能待實現*
- **銷售報表**：詳細的營收分析和商品銷售報表 - *架構完成，功能待實現*
- **通知管理**：批量發送通知給客戶 - *架構完成，功能待實現*
- **系統設定**：基本設定和權限管理 - *架構完成，功能待實現*
- **訂單詳情查看**：完整訂單資訊和客戶資料 - *開發中*
- **批量操作**：多筆訂單同時處理 - *計劃中*

#### 存取管理員後台

```bash
# 完整管理界面
http://localhost:3000/admin/index.html

# API 測試頁面
http://localhost:3000/admin/test.html
```

**認證方式**：
- 開發環境：自動通過認證
- 生產環境：需要在 URL 加入 `?key=您的API密鑰`

## 🎨 自訂功能

### 修改商品分類

編輯 `src/templates/quickReplies.js` 中的分類選項。

### 自訂 Flex Message 樣式

編輯 `src/templates/flexMessages.js` 中的顏色和佈局。

### 管理員 API Key 生成

```bash
# 使用 Node.js 生成安全的 API Key
node -e "console.log('Admin API Key:', require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 部署指南

### Heroku 部署

```bash
# 登入 Heroku
heroku login

# 建立應用
heroku create your-app-name

# 設定環境變數
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set NOTION_API_KEY=your_notion_key
# ... 其他環境變數

# 部署
git push heroku main
```

## 📊 API 文件

### 客戶端 API

- `GET /api/products` - 取得商品清單
- `GET /api/products/:id` - 取得商品詳情
- `GET /api/cart/:userId` - 取得購物車
- `POST /api/cart/:userId/add` - 加入購物車
- `POST /api/orders` - 建立訂單

### 🆕 管理員 API

- `GET /admin/dashboard` - 取得儀表板數據 ✅
- `GET /admin/orders` - 取得訂單列表（支援篩選和搜尋）✅
- `PUT /admin/orders/:id/status` - 更新訂單狀態 ✅
- `GET /admin/customers` - 取得客戶列表（架構完成，功能開發中）🚧
- `GET /admin/products` - 取得商品管理數據（架構完成，功能開發中）🚧
- `GET /admin/reports/sales` - 取得銷售報表（架構完成，功能開發中）🚧

所有管理員 API 需要在請求中包含 `?key=您的API密鑰` 參數。

## 🔧 故障排除

### 常見問題

1. **LINE Bot 無回應**
   - 檢查 Webhook URL 是否正確
   - 確認 Channel Access Token 有效

2. **Notion 連線失敗**
   - 檢查 API 金鑰是否正確
   - 確認資料庫已分享給 Integration

3. **LIFF 無法開啟**
   - 檢查 LIFF ID 設定
   - 確認 Channel 已發布或加入測試者

4. **管理員後台無法存取**
   - 確認 ADMIN_API_KEY 已設定
   - 檢查 URL 中的 key 參數

## 📈 開發進度

### ✅ 已完成功能
- LINE Bot 基本對話
- LIFF 購物頁面和購物車
- Notion 資料庫整合
- 完整的訂單流程
- 管理員後台架構和訂單管理
- 銷售數據統計和圖表

### 🚧 開發中功能
- 客戶管理界面（架構完成，功能實現中）
- 商品管理界面（架構完成，功能實現中）
- 高級報表系統（架構完成，功能實現中）
- 訂單詳情查看功能
- 管理員通知系統

### 📋 計劃功能
- LINE Pay 整合
- 自動化客服回覆
- 進階數據分析
- 多角色權限管理

## 🔐 安全性

- 環境變數管理敏感資訊
- LINE Signature 驗證
- 管理員 API Key 認證
- HTTPS 加密傳輸

## 📞 技術支援

如有問題請提出 Issue 或參考文件：

- **資料庫架構**: `docs/database_schema.md`
- **開發進度**: `docs/progress_report.md`

## 📄 授權條款

MIT License - 詳見 [LICENSE](LICENSE) 文件。

---

**版本**: 2.0.0  
**最後更新**: 2024-01-25  
**新功能**: 管理員後台系統  
**適用**: LINE Bot API v2、LIFF v2、Notion API v1 