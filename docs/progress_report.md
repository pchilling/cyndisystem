# 🚀 LINE Bot 開發進度報告（v2｜Supabase 版）

## 📅 最後更新：2025-08-12

## 🆕 本期關鍵成果

- ✅ README_V2 完成：以 Supabase（Postgres + Auth + Storage + RLS）為核心，取代 Notion 作為資料層說明文件
- ✅ 架構定稿：出貨方案 A（batches 批次 + parcels 包裹）、金額以整數分 *_cents、RLS 與 enum 狀態機（含觸發器）
- ✅ Schema 補強：campaigns/campaign_products/campaign_variants、notifications、audit_log、tags、customer_tags、segments
- ✅ 一致性與自動化：
  - 狀態機合法轉移含 CANCELED、PAID→SHIPPED、FULFILLING→CANCELED
  - 訂單金額由明細自動重算（items/訂單寫入雙保險）
  - 訂單→客戶 `last_order_at` 自動回寫
  - 訂單出貨達成自動推進 SHIPPED（防呆：已有出貨不允許取消）
- ✅ 搜尋/報表索引：Trigram（name/code/style）、SLA/狀態、campaign、timeline 等索引完成
- ✅ Storage Policy：最小可用策略（公開讀版/需登入版），範例 SQL（drop+create）
- ✅ SQL Patch（安全追加版）：可直接貼入 Supabase SQL Editor 追加

---

## 🎛️ 管理後台與前端（對齊）
- CRM 與 CMS 規格落檔於 README_V2：
  - CRM：Customers 清單/詳情/Segments、Timeline、批次操作、QA 指標
  - CMS：Products/Variants/Assets，Variants Matrix（UNIQUE(product_id, style, size, color)）、批量編輯
  - 導航與 IA、共用元件/交互規範、權限對應（RLS）
- API 摘要更新：新增 `/notifications`，錯誤格式 `{ code, message, details }` 與範例碼 409/422

---

## ✅ 已完成（與 v1 差異重點）
- 資料層：Notion → Supabase 設計（README_V2 完整說明）
- 交易金額：改整數分 *_cents，避免四捨五入/效能問題
- 出貨模型：batches（內部揀貨批次，無 tracking/customer）+ parcels（客戶包裹）
- 狀態機：enum + 合法轉移表 + 觸發器，並統一美式拼字 CANCELED
- RLS：profiles(auth_user_id, role, customer_id) + 預設拒絕 + 各表策略（admin-only 或限讀）
- 搜尋與索引：pg_trgm + 報表/狀態/SLA/活動專用索引
- Storage：最小策略 + 私有/公開讀兩種建議
- 工具函式：`effective_price_cents(campaign_id, variant_id)`（variant > product > 原價）
- 自動化：
  - `sync_order_parcel_id`（整單/部分出貨一致性）
  - `recalc_order_amounts`/`trg_orders_recompute_final`（金額一致）
  - `trg_orders_touch_customer`（客戶最後下單）
  - `maybe_mark_order_shipped`（全明細出貨→推 SHIPPED）

---

## 🚧 進行中
- scripts/db/init.sql：整合 README SQL（DDL/enum/index/views/triggers/RLS/constraints）
- scripts/db/seed.sql：最小測試資料（2 客戶、3 商品×4 尺碼、5 訂單、1 batch、1 parcel、1 campaign）
- Supabase Service Layer：以 supabase-js/伺服器 Service-Key 實作 CRUD 與查價/搜尋
- 切換旗標：`USE_SUPABASE=true` 雙跑 / 回滾

---

## 📝 待辦
- 管理後台改接 Supabase：
  - Orders/Parcels/Batches：列表、詳情、合併、建立包裹、付款通知
  - Products/Variants：Variants Matrix、批量上傳圖片（Storage）
  - Customers/Segments：條件產生器/保存/匯出/通知
- Edge Functions（可選）：付款通知/敏感操作下沉
- Swagger `/docs`：產出 schemas 與錯誤格式範例
- 監控與告警：慢查詢/錯誤率/推送失敗重試

---

## ⚠️ 風險與應對
- 資料一致性：已加多層防護（CHECK/trigger/view/enum/RLS）；持續用 seed 與 E2E 驗證
- 權限策略：公開讀 vs 需登入讀，按部署需求切換；Service-Key 僅後端持有
- 效能：大表索引與 pg_trgm 已建；必要時引入物化視圖/快取

---

## 🎯 下一步（本週）
- 產出 `scripts/db/init.sql`/`seed.sql`，並跑一次 end-to-end 驗收
- 落實 Supabase Service Layer，開關 `USE_SUPABASE` 進行雙跑測試
- 後台頁面先對 Orders/Parcels/Batches 接 Supabase，完成建立包裹/付款通知整流

---

## 📒 今日進度與決議（2025-08-12）
- **DB C 段（RLS/Policies）完成**：
  - 修正 `customers_self` 同時含兩個 for 的語法錯誤，拆成 `customers_self_select`/`customers_self_update` 並加入 `with check`（避免越權更新）。
  - 交易失敗導致 `profiles` 未建立 → 先補 `app_role`/`profiles`/`is_admin()` 再重建 policy（處理「relation does not exist」）。
  - 其餘表一律 `enable row level security` + `drop policy if exists ...; create policy ...`，解決重跑報錯。
- **DB D 段（Views + Triggers/Functions）完成**：
  - 新增 `order_items.price_cents`（原表無此欄）並自動回填，重建 `recalc_order_total_cents` 與三個 item 觸發器，避免「price_cents 欄位不存在」錯誤。
  - 建立 `parcel_totals` view 以明細聚合；`sync_order_parcel_id()` 支援 INSERT/UPDATE/DELETE，並以 `coalesce(NEW, OLD)` 安全回傳。
  - 設定 `orders` 狀態變更觸發 `last_transition_at`、自動 SHIPPED、禁止有已出貨明細時取消。
- **DB E 段（Profiles 綁定/驗證）完成**：
  - 以 Supabase Auth User UID `436f087a-deb8-462d-8de0-1c9de42ba4a4` 建立/更新 `profiles` 為 `admin`。
  - 於 SQL Editor 設定 `request.jwt.claims` 模擬登入，驗證 `is_admin()`。
  - 注意：用角色 postgres 執行時 `auth.uid()` 為 null，需先 `set_config(...)` 再測。
- **程式端進度**：
  - 新增並擴充 `src/services/supabaseService.js`：
    - `getProducts`、`getProductById`、`getProductVariants`、`getVariantById`、`searchProducts`、
      `getCustomerByLineId`、`createCustomer`、`createOrder`、`createOrderItem`。
    - 金額統一以 *_cents 儲存，對外回傳（舊路由）自動轉元；欄位形狀對齊既有呼叫點。
  - 已安裝 `@supabase/supabase-js`，`.env` 可設 `USE_SUPABASE=true` 啟用切換。
  - `src/routes/api.js` 已透過 `dataService` 讀取產品與下單；`messageHandler`/`postbackHandler` 仍引用 Notion（下一步切換）。
- **執行與錯誤處理** [[memory:3801895]]：
  - 啟動時遇到 `EADDRINUSE: :3000`（port 已被佔用）。
    - 建議檢查：`netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`（Windows）或改用 `PORT=3001` 啟動。
  - Windows PowerShell 不支援 `| cat` 用法；改以背景執行或直接 `npm start` 視窗輸出。

## ✅ 明日優先事項
- 將 `messageHandler.js`、`postbackHandler.js` 由 `notionService` 切到 `dataService`（保持介面相容）。
- `src/routes/admin.js` 後台 API 切 Supabase，串接 `parcels/batches` 建立與付款通知。
- 修復本機埠衝突並完成一次下單→併單→建包裹→付款通知→客戶「已付款」確認的 E2E 測試。

## ✅ 明日優先事項（更新）
- 後台 CMS：先完成 Products（可上架商品）
  - 建 `public/admin/supabase.js`，前端直連 Supabase（anon key）。
  - 登入保護：頁面載入檢查 `supabase.auth.getSession()`；無 session 顯示登入；登入後驗 `profiles.role in ('admin','staff')`。
  - Products 清單：`id,name,main_category,status,created_at`，支援搜尋（`ilike(name)`）、排序與分頁。
  - 新增商品：Modal 表單（`name, main_category, status, default_price(元)`）；寫入時換算 `default_price_cents=price*100`。
  - 圖片上傳（可選）：上傳至 `products/<productId>/main.jpg`，取得 `createSignedUrl()`，回寫 `products.image_url`。
  - 權限：使用現有 RLS policy（admin/staff 可寫）；Storage 走既有 `products` bucket 策略。
- 修復本機埠占用：若 3000 仍被佔用，先關閉舊程序（Windows：`netstat -ano | findstr :3000` → `taskkill /PID <pid> /F`），或暫時 `set PORT=3001 && npm start`。
