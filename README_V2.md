# 📌 LINE 童裝代購自動化系統 v2（Supabase 版）

這是以 Supabase（Postgres + Auth + Storage）為核心資料層的第二版 README。相較於 v1（Notion 版），v2 聚焦於：高效穩定的資料查詢、嚴格的存取控管（RLS）、可視化管理後台前端直連資料庫，以及更易維護的可程式化資料模型。

---

## ✨ v2 亮點
- 資料層改用 Supabase（Postgres），擁抱 SQL、索引與觸發器，效能與穩定度大幅提升
- 前端後台直接使用 `@supabase/supabase-js` CRUD，所有營運操作（併單、拆單、出貨、通知）一站完成
- 嚴格的 Row-Level Security（RLS）策略，客戶/管理員權限清楚，敏感操作以 Edge Function/後端執行
- 支援全文/Trigram 搜尋：產品、顏色、尺寸等關鍵字搜尋更快更準
- 儲存商品圖片與憑證於 Supabase Storage
- 平滑遷移策略：支援 Notion → Supabase 逐步切換，零停機風險低

---

## 🏗️ 系統架構
- LINE Bot：處理 webhook、Flex Message、Quick Reply（Node.js + Express）
- 後端：
  - 保留 Express：LINE 事件處理與對外 API（含必要的密鑰操作）
  - 可選 Supabase Edge Functions：例如「發送付款通知」「建立出貨包裹/批次」，以 Service Role 執行
- 前端後台：`public/admin` 使用 `@supabase/supabase-js` 直接查改資料，提供 Cyndi 完整營運頁面
- 資料層：Supabase（Postgres + Auth + Storage + RLS）

---

## 🛠 技術棧
- 後端：Node.js + Express + @line/bot-sdk
- 資料層：Supabase（Postgres、Auth、Storage、RLS、Edge Functions）
- 前端：原生 JS + Bootstrap（admin）、Flex Message（客戶端）
- 通知：LINE 推送（必要時可用 LINE Notify）

---

## 🛠 環境變數
1) Supabase
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`（前端使用）
- `SUPABASE_SERVICE_ROLE_KEY`（後端/Edge Function 使用，請勿暴露於前端）
- `SUPABASE_REDIRECT_URL`（Magic Link 登入回跳）
  - 本地開發範例：`http://localhost:3000/admin/auth/callback`
- `JWT_SECRET`（若自簽 JWT 或部分自管場景）

2) LINE Bot
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_WEBHOOK_SECRET`（若分離簽章驗證用）

3) 其他（選用）
- `ADMIN_API_KEY`（管理端 API 驗證用）

---

## 🧩 功能總覽
- Flex Message 購物體驗（主商品 → 變體/尺寸 → 加入購物車 → 送出訂單）
- 產品搜尋（僅在「我要下單」購物情境開放）
- 併單模式：多筆客戶訂單合併，人工拆/併出貨單位
- 出貨批次（batches）與包裹（parcels）管理、付款通知（LINE 推送）
- 我的訂單/查看詳情
- 管理後台：
  - 併單管理、出貨管理（建立批次與包裹、發送付款通知、更新狀態）
  - 訂單列表、篩選、進度條
  - 基礎儀表板與統計（可擴充）

---

## 🗃️ 資料表設計（對齊 docs/database_schema.md，金額以整數分 *_cents 儲存）
> 保留 Notion 欄位語意；Supabase 採英文蛇形命名。所有金額欄位改為「整數分」，前後端顯示時再除以 100。

- `products`（主商品資料表）
  - `id uuid PK`（product_id/頁面ID）
  - `name text`（商品名稱）
  - `code text`（商品編號）
  - `image_url text`（商品圖片）
  - `main_category text`（主分類）
  - `sub_categories text[]`（子分類，多選）
  - `origin_country text`（來源國：'KR'/'JP'）
  - `status text`（狀態：現貨/預購/停售）
  - `created_at timestamptz default now()`

- `variants`（商品變體資料表）
  - `id uuid PK`（variant_id）
  - `product_id uuid FK → products`（所屬商品）
  - `style text`（款式）
  - `color text`（顏色）
  - `size text`（尺寸）
  - `gender text`（性別區分）
  - `price_cents int`（售價，整數分）
  - `cost_cents int`（成本，整數分）
  - `weight_g int`（重量，公克，供店到店超重檢查與國際運費/關稅分攤）
  - `image_url text`（商品圖片）
  - `status text`（可訂購/停售/已斷貨）
  - `created_at timestamptz default now()`
  - UNIQUE(`product_id`, `style`, `size`, `color`)

- `customers`（客戶資料表）
  - `id uuid PK`（客戶編號）
  - `line_id text UNIQUE`（LINE ID）
  - `name text`（客戶姓名）
  - `phone text`（電話）
  - `delivery_pref text`（收件方式）
  - `address text`（收件地址）
  - `level text`（客戶等級）
  - `birthday date`（生日）
  - `preferred_sizes text[]`（常穿尺碼，例如 {'100','110'}）
  - `note text`（備註）
  - `total_cents bigint`（總消費金額，建議用 View/聚合計算）
  - `order_count int`（訂單次數，建議用 View/聚合計算）
  - `last_order_at timestamptz`（最後下單，trigger 維護）
  - `created_at timestamptz default now()`（註冊時間）

- `orders`（訂單資料表）
  - `id uuid PK`（訂單頁面ID）
  - `customer_id uuid FK → customers`（客戶）
  - `order_number bigserial UNIQUE`（訂單編號）
  - `recipient_name text`（收件人姓名）
  - `recipient_phone text`（收件人電話）
  - `delivery_method text`（收件方式）
  - `delivery_address text`（收件地址）
  - `currency_code text default 'TWD'`（幣別）
  - `status order_status`（訂單狀態 enum：WAITING_PAYMENT(待付款)/PAID(已付款)/FULFILLING(配貨中)/SHIPPED(已出貨)/COMPLETED(已完成)/CANCELED(已取消)）
  - `payment_method text`（付款方式）
  - `payment_status payment_status`（付款狀態 enum：UNPAID(未付款)/PAID(已付款)/PARTIAL(部分付款)）
  - `total_cents int`（商品總額）
  - `shipping_fee_cents int`（運費）
  - `discount_cents int`（折扣）
  - `final_cents int`（實付）
  - `estimated_arrival date`（預計到貨日）
  - `note text`（備註）
  - `merge_status merge_status`（併單狀態：PENDING(待併單)/MERGED(已併單)/PARTIAL_SHIPPED(部分出貨)/DONE(已完成)）
  - `campaign_id uuid NULL FK → campaigns`（來源 Campaign）
  - `parent_order_id uuid NULL FK → orders`（父訂單，用於拆單）
  - `parcel_id uuid NULL FK → parcels`（整單出貨時）
  - `created_at timestamptz default now()`（建立時間）
  - `last_transition_at timestamptz`（狀態遷移時間，trigger 維護）

- `order_items`（訂單項目明細表）
  - `id uuid PK`（項目編號）
  - `order_id uuid FK → orders`（所屬訂單）
  - `variant_id uuid FK → variants`（商品變體）
  - `product_name text`（商品名稱）
  - `quantity int`（數量）
  - `unit_price_cents int`（單價，整數分）
  - `subtotal_cents int`（小計，整數分，可由 quantity*unit_price_cents 計算）
  - `fulfillment_status item_fulfillment_status`（配貨狀態 enum：PENDING(待確認)/ALLOCATED(已配貨)/SHORTAGE(缺貨)/SHIPPED(已發貨)）
  - `note text`（備註）
  - `parcel_id uuid NULL FK → parcels`（包裹）
  - `arrived_at date NULL`（實際到貨）

- `batches`（出貨批次表｜方案 A）
  - 「倉內揀貨的批次集合」，不含客戶/託運資訊
  - `id uuid PK`
  - `name text`（批次名稱）
  - `status batch_status`（批次狀態 enum：PLANNING(規劃中)/ALLOCATING(配貨中)/READY_TO_SHIP(待出貨)/CLOSED(已結束)）
  - `notes text`
  - `created_at timestamptz default now()`

- `parcels`（包裹表｜方案 A）
  - 「單一客戶、單一託運單」的出貨單位
  - `id uuid PK`
  - `customer_id uuid FK → customers`
  - `currency_code text default 'TWD'`（幣別）
  - `status parcel_status`（包裹狀態 enum：WAITING_PAYMENT(待付款)/PAID(已付款)/SHIPPED(已出貨)/COMPLETED(已完成)）
  - `batch_id uuid NULL FK → batches`
  - `tracking_no text`
  - `shipping_info text`
  - `shipping_fee_cents int`
  - `paid_at timestamptz NULL`
  - `shipped_at timestamptz NULL`
  - `created_at timestamptz default now()`
  - （總金額以 View `parcel_totals` 提供，不存欄位）

### Parcel 總額 View（方案 A）
> 以 View 聚合計算包裹的總額，避免跨表 generated column 限制與資料不一致。
```sql
create or replace view parcel_totals as
select
  oi.parcel_id,
  sum(oi.subtotal_cents)::bigint as total_cents
from order_items oi
where oi.parcel_id is not null
group by oi.parcel_id;
-- 使用時以左連接：select p.*, t.total_cents from parcels p left join parcel_totals t on t.parcel_id=p.id;
```

### 索引與搜尋（需啟用擴充）
```sql
-- Trigram/GIN 索引
create index if not exists idx_products_name_trgm on products using gin (name gin_trgm_ops);
create index if not exists idx_variants_color_trgm on variants using gin (color gin_trgm_ops);
create index if not exists idx_variants_size_trgm  on variants using gin (size  gin_trgm_ops);
-- 常用查詢索引
create index if not exists idx_orders_customer_created on orders(customer_id, created_at desc);
create index if not exists idx_orders_parent on orders(parent_order_id);
create index if not exists idx_items_order on order_items(order_id);
create index if not exists idx_parcels_batch on parcels(batch_id);
create index if not exists idx_orders_status on orders(status, last_transition_at desc);
create index if not exists idx_orders_merge_status on orders(merge_status);
create index if not exists idx_parcels_status on parcels(status, created_at desc);
create index if not exists idx_orders_campaign on orders(campaign_id, created_at desc);
create index if not exists idx_customers_last_order on customers(last_order_at desc);
create index if not exists idx_notifications_customer on notifications(to_customer_id, created_at desc);
-- 注意：`variants(product_id, style, size, color)` 已有 UNIQUE 約束，無需重複建立 B-Tree 索引
```

---

## 🔠 Enum 與狀態機（DB + 服務層雙保險）
> 統一使用美式拼字 `CANCELED`（單 L）。以 enum + trigger 限制合法轉移。

```sql
-- enum（可改為 CHECK 或 domain）
create type order_status as enum ('WAITING_PAYMENT','PAID','FULFILLING','SHIPPED','COMPLETED','CANCELED');
create type payment_status as enum ('UNPAID','PAID','PARTIAL');
create type merge_status as enum ('PENDING','MERGED','PARTIAL_SHIPPED','DONE');
create type item_fulfillment_status as enum ('PENDING','ALLOCATED','SHORTAGE','SHIPPED');
create type parcel_status as enum ('WAITING_PAYMENT','PAID','SHIPPED','COMPLETED');
create type batch_status as enum ('PLANNING','ALLOCATING','READY_TO_SHIP','CLOSED');

-- 合法轉移表 + 觸發器（示意，orders 為例）
create table if not exists order_status_transitions (
  from_status order_status,
  to_status   order_status,
  primary key (from_status, to_status)
);

insert into order_status_transitions values
('WAITING_PAYMENT','PAID'),
('PAID','FULFILLING'),
('FULFILLING','SHIPPED'),
('SHIPPED','COMPLETED'),
('WAITING_PAYMENT','CANCELED'),
('PAID','CANCELED'),
('PAID','SHIPPED'),
('FULFILLING','CANCELED')
on conflict do nothing;

create or replace function enforce_order_status_transition()
returns trigger as $$
begin
  if NEW.status is distinct from OLD.status then
    if not exists (
      select 1 from order_status_transitions
      where from_status = OLD.status and to_status = NEW.status
    ) then
      raise exception '非法的狀態轉移: % -> %', OLD.status, NEW.status;
    end if;
    NEW.last_transition_at := now();
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_enforce_order_status
before update on orders
for each row execute function enforce_order_status_transition();
```

### Enum 對照（中英）
- order_status：
  - WAITING_PAYMENT（待付款）/ PAID（已付款）/ FULFILLING（配貨中）/ SHIPPED（已出貨）/ COMPLETED（已完成）/ CANCELED（已取消）
- payment_status：
  - UNPAID（未付款）/ PAID（已付款）/ PARTIAL（部分付款）
- merge_status：
  - PENDING（待併單）/ MERGED（已併單）/ PARTIAL_SHIPPED（部分出貨）/ DONE（已完成）
- item_fulfillment_status：
  - PENDING（待確認）/ ALLOCATED（已配貨）/ SHORTAGE（缺貨）/ SHIPPED（已發貨）
- parcel_status：
  - WAITING_PAYMENT（待付款）/ PAID（已付款）/ SHIPPED（已出貨）/ COMPLETED（已完成）
- batch_status：
  - PLANNING（規劃中）/ ALLOCATING（配貨中）/ READY_TO_SHIP（待出貨）/ CLOSED（已結束）

---

## 📏 資料一致性規則
- 整單/部分出貨與欄位一致性：
  - 若同筆 `orders` 的 `order_items.parcel_id` 出現多個不同值（部分出貨），則 `orders.parcel_id` 必須為 NULL。
  - 僅當該訂單所有 `order_items.parcel_id` 均相同且非 NULL，才可（由觸發器）同步 `orders.parcel_id` 為該值。
  - 禁止直接手動寫入不一致的 `orders.parcel_id`。

```sql
create or replace function sync_order_parcel_id()
returns trigger as $$
declare
  v_order_id uuid;
begin
  v_order_id := case when TG_OP='DELETE' then OLD.order_id else NEW.order_id end;

  update orders o
     set parcel_id = (
       select case
                when count(distinct oi.parcel_id)=1 and min(oi.parcel_id) is not null
                then min(oi.parcel_id) else null
              end
       from order_items oi where oi.order_id = o.id
     )
   where o.id = v_order_id;

  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

drop trigger if exists trg_items_sync_order_parcel on order_items;
create trigger trg_items_sync_order_parcel
after insert or update or delete on order_items
for each row execute function sync_order_parcel_id();
```

---

## 🔧 欄位約束（NOT NULL + 非負）
> 建議直接貼入 Supabase SQL Editor 執行，避免髒資料。

```sql
alter table variants
  alter column price_cents set not null,
  alter column cost_cents  set not null,
  alter column weight_g    set default 0,
  add constraint chk_variant_price_nonneg check (price_cents >= 0),
  add constraint chk_variant_cost_nonneg  check (cost_cents  >= 0),
  add constraint chk_variant_weight_nonneg check (weight_g   >= 0);

alter table order_items
  alter column quantity set not null,
  alter column unit_price_cents set not null,
  alter column subtotal_cents set not null,
  add constraint chk_item_qty_pos check (quantity > 0),
  add constraint chk_item_price_nonneg check (unit_price_cents >= 0),
  add constraint chk_item_subtotal_consistent
    check (subtotal_cents = quantity * unit_price_cents);

alter table orders
  alter column total_cents set not null,
  alter column final_cents set not null,
  alter column shipping_fee_cents set default 0,
  alter column discount_cents set default 0,
  alter column shipping_fee_cents set not null,
  alter column discount_cents set not null,
  add constraint chk_order_cents_nonneg
    check (total_cents >= 0 and shipping_fee_cents >= 0 and discount_cents >= 0 and final_cents >= 0);
```

---

## 🧮 訂單金額一致性（由明細推總額）
> 避免前端計算誤差，在 DB 端自動重算 `orders.total_cents/final_cents`。

```sql
create or replace function recalc_order_amounts(p_order_id uuid)
returns void language sql as $$
  update orders o
     set total_cents = coalesce((select sum(subtotal_cents) from order_items where order_id=p_order_id),0),
         final_cents  = coalesce((select sum(subtotal_cents) from order_items where order_id=p_order_id),0)
                        + o.shipping_fee_cents - o.discount_cents
   where o.id = p_order_id;
$$;

create or replace function trg_recalc_order_amounts()
returns trigger as $$
begin
  perform recalc_order_amounts(case when TG_OP='DELETE' then OLD.order_id else NEW.order_id end);
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

drop trigger if exists trg_items_amounts on order_items;
create trigger trg_items_amounts
after insert or update or delete on order_items
for each row execute function trg_recalc_order_amounts();

create or replace function trg_orders_recompute_final()
returns trigger as $$
begin
  new.final_cents := coalesce(new.total_cents,0) + coalesce(new.shipping_fee_cents,0) - coalesce(new.discount_cents,0);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_recompute on orders;
create trigger trg_orders_recompute
before insert or update on orders
for each row execute function trg_orders_recompute_final();
```

---

## 🔐 RLS 與權限（預設拒絕 + profiles + 全表策略）
> 預設拒絕：所有表 `enable row level security;` 後，若無 policy = 全拒。

```sql
-- 角色
create type app_role as enum ('admin','staff','customer');

-- profiles 與 auth.users 關聯
create table if not exists profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  customer_id uuid null references customers(id)
);

-- 是否管理者
create or replace function is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p where p.auth_user_id = auth.uid() and p.role in ('admin','staff')
  );
$$;

-- 內部表/新表一律啟用 RLS 並設 admin-only
alter table campaigns          enable row level security;
alter table campaign_products  enable row level security;
alter table audit_log          enable row level security;
alter table tags               enable row level security;
alter table customer_tags      enable row level security;
alter table segments           enable row level security;
alter table notifications      enable row level security;

create policy campaigns_admin on campaigns for all using (is_admin()) with check (is_admin());
create policy campaign_products_admin on campaign_products for all using (is_admin()) with check (is_admin());
create policy audit_log_admin on audit_log for all using (is_admin()) with check (is_admin());
create policy tags_admin on tags for all using (is_admin()) with check (is_admin());
create policy customer_tags_admin on customer_tags for all using (is_admin()) with check (is_admin());
create policy segments_admin on segments for all using (is_admin()) with check (is_admin());
create policy notifications_admin on notifications for all using (is_admin()) with check (is_admin());

-- 通用：啟用 RLS（預設拒絕）
alter table products    enable row level security;
alter table variants    enable row level security;
alter table customers   enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table parcels     enable row level security;
alter table batches     enable row level security;

-- products / variants：客戶可讀，管理者可讀寫
create policy products_admin_all on products for all using (is_admin()) with check (is_admin());
create policy products_read      on products for select using (true);

create policy variants_admin_all on variants for all using (is_admin()) with check (is_admin());
create policy variants_read      on variants for select using (true);

-- customers：客戶只可讀寫自己的 row，管理者全權
create policy customers_admin_all on customers for all using (is_admin()) with check (is_admin());
create policy customers_self on customers
  for select using (id = (select customer_id from profiles where auth_user_id = auth.uid()))
  for update using (id = (select customer_id from profiles where auth_user_id = auth.uid()));

-- orders：客戶可讀屬於自己的訂單，管理者全權
create policy orders_admin_all on orders for all using (is_admin()) with check (is_admin());
create policy orders_by_customer on orders
  for select using (customer_id = (select customer_id from profiles where auth_user_id = auth.uid()));

-- order_items：客戶可讀屬於自己訂單的明細，管理者全權
create policy items_admin_all on order_items for all using (is_admin()) with check (is_admin());
create policy items_by_customer on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.customer_id = (select customer_id from profiles where auth_user_id = auth.uid())
    )
  );

-- parcels / batches：客戶可讀與自己相關的資料，管理者全權
create policy parcels_admin_all on parcels for all using (is_admin()) with check (is_admin());
create policy parcels_by_customer on parcels
  for select using (
    customer_id = (select customer_id from profiles where auth_user_id = auth.uid())
  );

create policy batches_admin_all on batches for all using (is_admin()) with check (is_admin());
create policy batches_read on batches for select using (true);
```

> products/variants 如不需匿名讀，請改為 `using (auth.uid() is not null)` 並在前端一律用 `createSignedUrl()` 取圖。

---

## 🧩 CRM 與 CMS 後台 UI/UX 規格（可直接實作）

### 🧑‍🤝‍🧑 CRM（Customers）
路由：`/admin/customers`、`/admin/customers/:id`

A. 客戶清單（List）
- 欄位：姓名｜電話｜LINE ID｜等級（一般/VIP/黑名單）｜常穿尺碼｜最近下單｜訂單數｜總消費
- 搜尋/篩選：姓名/電話/LINE ID、等級、最近下單（7/30/90 天）、訂單數區間、常穿尺碼、來源 Campaign
- 批次操作：加/移除標籤、調整等級、導出 CSV、發送分眾通知（呼叫 /notifications）
- 快捷：Enter 開右側詳情；↑/↓ 移動游標；⌘K 全域搜尋

B. 客戶詳情（Detail｜右側滑出）
- 頂部摘要：姓名｜電話｜LINE ID｜等級｜常穿尺碼｜地址｜偏好配送
- 分頁：
  - 時間線（Timeline）：下單/出貨/訊息/標籤變更（來自 audit_log）
  - 訂單：表格倒序（可點入 `/admin/orders/:id`）
  - 標籤 & 分眾：顯示已套用標籤；可增刪；顯示其所屬 Segment
  - 孩子資料（可選）：姓名/性別/生日/身高/常穿尺碼
- 行為：編輯基本資料、設為 VIP、加入黑名單、建立售後工單
- KPI：AOV、回購次數、距上次購買天數

C. 分眾（Segments）
- 路由：`/admin/customers/segments`
- 條件生成器：最近下單（≤N 天）、常穿尺碼 in […]、等級、合計消費 ≥ X、點擊某 Campaign、來源渠道
- 支援保存為 Segment，提供重命名/刪除
- 匯出/通知：匯出 CSV；發送 LINE 分眾通知（`POST /notifications`，附 segment id & flex payload）
- 驗收：
  - 10k 客戶列表載入 < 500ms（有分頁/索引）
  - 條件如「最近30天下單 & 常穿110-120」能在 2 秒內回傳
  - 一鍵對 Segment 發送通知，能記錄在 Timeline（audit_log）

### 📦 CMS（Products / Variants / Assets）
路由：`/admin/products`、`/admin/products/:id`、`/admin/assets`

A. 商品清單（Catalog）
- 欄位：商品名｜主分類/子分類｜狀態（現貨/預購/停售）｜建立時間｜SKU 數｜上次修改
- 搜尋/篩選：名稱（Trigram）、分類、狀態、來源國（KR/JP 預留）、建立時間
- 批次操作：切換狀態、套用標籤、複製商品、匯出 CSV
- 快速新增：+ 新商品（最小表單：名稱/分類/狀態）

B. 商品詳情（Product Editor）
- 基本資訊：名稱、編號、主/子分類（多選）、狀態、來源國、主圖上傳（Supabase Storage）
- 變體矩陣（Variants Matrix）：
  - 列：尺寸；欄：顏色（或款式/顏色/尺寸三維展開）
  - 支援批量編輯：價格、狀態、圖片、重量（weight_g）
  - 自動檢查 UNIQUE(product_id, size, color) 衝突
- 價格與規則：先支援單價；之後可加 Campaign 價格覆寫
- 內容（CMS）：素材圖集、多圖排序、描述、材質/季節/洗滌
- 版本/草稿：草稿/已發布；草稿不被前台/Bot 檢索
- 動作：儲存草稿、發佈、複製做模板

C. 素材資產（Assets）
- 路由：`/admin/assets`
- 功能：批次上傳至 Storage（目錄：`products/<productId>/…`）、刪除、複製連結、壓縮/產縮圖（可選）
- 權限：僅 admin/staff 可寫；URL 預設簽名連結（或公開讀）
- 驗收：
  - 上傳 10 張圖（共 30MB）在 30 秒內完成並可預覽
  - 變體矩陣批量改價/改狀態，顯示變更筆數與錯誤列
  - 切換草稿→已發布後，產品可在 Bot 端搜得到（索引刷新）

### 🗺️ 導航與 IA
- 側欄：Dashboard｜Orders｜Batches/Parcels｜Products｜Customers｜Campaigns｜After-sales｜Reports｜Settings
- Orders：含「收件匣」＋右側詳情（列表欄位、篩選、批次動作、SLA 警示、快捷鍵）
- Products / Customers：對應本節 CRM/CMS 頁面
- Campaigns：商品挑選 → 售價覆寫 → 檔期（起迄）→ 產生 Flex → 報表
- After-sales：退換貨工單列表與詳情（可從 Orders/Customers 進來）

### 🎛️ 共用元件 & 交互規範
- 右側詳情抽屜：最大寬 540px，ESC 關閉，支援 Auto-Save
- 表格：固定表頭、虛擬捲動、cursor-based 分頁
- 批次操作：選取列後浮動工具列（合併、加入批次、改狀態、匯出）
- Undo：批次操作完成 5 秒內可復原
- 空/錯/載入：Skeleton、Empty state（含 CTA）、錯誤 Retry
- 快捷鍵：J/K 上下、Enter 開詳情、E 編輯、⌘F 表內搜尋、? 列出快捷

### 🔐 權限對應（RLS）
- admin/staff：可管理 CRM/CMS 全部頁面（讀寫）
- customer：僅可讀自己的訂單、包裹；不可進入 `/admin`
- Storage：`products/*` 僅 admin/staff 可寫，讀取以簽名 URL 或公開讀

### 🔌 主要 API / Supabase 操作（摘要）
- 後台前端優先用 supabase-js 直連；敏感操作走 Express/Edge。
- CRM：
  - `supabase.from('customers').select().range()`（清單）
  - `supabase.from('customers').update()`（編輯）
  - `POST /notifications`（對 Segment 發送通知｜Express/Edge）
- CMS：
  - `supabase.from('products').select() | insert/update`
  - `supabase.from('variants').upsert()`（矩陣批量）
  - Storage：`supabase.storage.from('products').upload()` / `createSignedUrl()`
  - 索引搜尋：啟用 pg_trgm，`ilike + similarity()` 查商品/顏色/尺寸

### 🧱 內部控制表（最小骨架）
> 供 Timeline、打標/分眾等功能使用，先建表骨架，後續可擴充。

```sql
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text,
  entity_type text not null,   -- 'order' | 'parcel' | 'customer' ...
  entity_id uuid not null,
  action text not null,        -- 'STATUS_CHANGED' | 'PAYMENT_REQUESTED' ...
  data jsonb
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists customer_tags (
  customer_id uuid references customers(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (customer_id, tag_id)
);

create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  definition jsonb not null,
  created_at timestamptz default now()
);
```

---

## 📝 版本差異（v1 → v2）
- 金額改為整數分（*_cents），顯示時除以 100
- 出貨改為方案 A：批次（batches）+ 包裹（parcels），`order_items.parcel_id` 指向包裹；`parcels.batch_id` 可掛批次
- Enum 統一為 `CANCELED` 拼字 + 觸發器限制狀態轉移
- RLS 以 profiles 關聯 auth.users 實作，且預設拒絕；逐表給 policy
- 搜尋：改走 SQL/索引，效能顯著提升
- 管理後台：前端直連資料庫（RLS 保護），敏感動作以 Edge/後端執行
- 遷移：支援雙讀與旗標切換，降低風險

---

## 📄 授權
MIT License 

---

## 📣 Campaigns（開團）與關聯

```sql
create table if not exists campaigns(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz, ends_at timestamptz,
  status text check (status in ('DRAFT','LIVE','ENDED')) default 'DRAFT',
  created_at timestamptz default now()
);

create table if not exists campaign_products(
  campaign_id uuid references campaigns(id) on delete cascade,
  product_id uuid  references products(id)  on delete cascade,
  override_price_cents int,
  limit_qty int,
  primary key (campaign_id, product_id)
);

-- 變體粒度覆寫（可選，建議）
create table if not exists campaign_variants(
  campaign_id uuid references campaigns(id) on delete cascade,
  variant_id  uuid references variants(id)  on delete cascade,
  override_price_cents int,
  limit_qty int,
  primary key(campaign_id, variant_id)
);

alter table orders add column if not exists campaign_id uuid references campaigns(id);
```

> 覆寫價查詢建議：variant 覆寫優先，其次 product 覆寫，最後用原價。

---

## 🔗 外鍵刪除語意（ON DELETE）
> 建議設定明確的刪除語意以避免髒資料或誤刪。

```sql
-- 依現況調整（範例）：先刪舊 FK 再加新約束
-- variants.product_id → restrict
do $$ begin
  alter table variants drop constraint if exists variants_product_id_fkey;
  alter table variants add constraint variants_product_id_fkey
    foreign key (product_id) references products(id) on delete restrict;
end $$;

-- orders.customer_id → restrict
do $$ begin
  alter table orders drop constraint if exists orders_customer_id_fkey;
  alter table orders add constraint orders_customer_id_fkey
    foreign key (customer_id) references customers(id) on delete restrict;
end $$;

-- order_items.order_id → cascade
do $$ begin
  alter table order_items drop constraint if exists order_items_order_id_fkey;
  alter table order_items add constraint order_items_order_id_fkey
    foreign key (order_id) references orders(id) on delete cascade;
end $$;

-- order_items.variant_id → restrict
do $$ begin
  alter table order_items drop constraint if exists order_items_variant_id_fkey;
  alter table order_items add constraint order_items_variant_id_fkey
    foreign key (variant_id) references variants(id) on delete restrict;
end $$;

-- orders.parent_order_id → set null
do $$ begin
  alter table orders drop constraint if exists orders_parent_order_id_fkey;
  alter table orders add constraint orders_parent_order_id_fkey
    foreign key (parent_order_id) references orders(id) on delete set null;
end $$;

-- parcels.customer_id → restrict
do $$ begin
  alter table parcels drop constraint if exists parcels_customer_id_fkey;
  alter table parcels add constraint parcels_customer_id_fkey
    foreign key (customer_id) references customers(id) on delete restrict;
end $$;

-- parcels.batch_id → set null
do $$ begin
  alter table parcels drop constraint if exists parcels_batch_id_fkey;
  alter table parcels add constraint parcels_batch_id_fkey
    foreign key (batch_id) references batches(id) on delete set null;
end $$;
```

---

## 🧭 狀態/時間索引（SLA/篩選）
```sql
create index if not exists idx_orders_status       on orders(status, last_transition_at desc);
create index if not exists idx_orders_merge_status on orders(merge_status);
create index if not exists idx_parcels_status      on parcels(status, created_at desc);
```

---

## 🧭 擴充套件（Extensions）
```sql
create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists pg_trgm;  -- Trigram/GIN
```

---

## 🧭 自動狀態推進（所有明細已出貨 → 訂單設為 SHIPPED）
```sql
create or replace function maybe_mark_order_shipped(p_order_id uuid)
returns void language plpgsql as $$
declare v_total int; v_shipped int;
begin
  select count(*), count(*) filter (where fulfillment_status='SHIPPED')
    into v_total, v_shipped
  from order_items where order_id=p_order_id;
  if v_total>0 and v_total=v_shipped then
    update orders set status='SHIPPED' where id=p_order_id and status in ('FULFILLING','PAID');
  end if;
end; $$;

create or replace function trg_items_status_drive_order()
returns trigger as $$
begin
  perform maybe_mark_order_shipped(case when TG_OP='DELETE' then OLD.order_id else NEW.order_id end);
  return coalesce(NEW, OLD);
end; $$ language plpgsql;

drop trigger if exists trg_items_status_drive_order on order_items;
create trigger trg_items_status_drive_order
after insert or update or delete on order_items
for each row execute function trg_items_status_drive_order();
```

---

## 🗄️ Storage Policy（最小策略範例）
> 在 `storage.objects` 上設定（Supabase SQL Editor）。

```sql
-- 先刪除避免重複
drop policy if exists "read products public"         on storage.objects;
drop policy if exists "write products admin"         on storage.objects;
drop policy if exists "update/delete products admin" on storage.objects;

-- 公開讀版本
create policy "read products public"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "write products admin"
  on storage.objects for insert
  with check (
    bucket_id = 'products' and exists (
      select 1 from profiles p where p.auth_user_id = auth.uid() and p.role in ('admin','staff')
    )
  );

create policy "update/delete products admin"
  on storage.objects for all
  using (
    bucket_id = 'products' and exists (
      select 1 from profiles p where p.auth_user_id = auth.uid() and p.role in ('admin','staff')
    )
  );

-- 若要改成需登入才可讀：
-- drop policy if exists "read products public" on storage.objects;
-- create policy "read products auth"
--   on storage.objects for select
--   using (auth.uid() is not null and bucket_id='products');
```

---

## 🔔 通知紀錄（可選，LINE 推送落檔）
```sql
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  to_customer_id uuid references customers(id) on delete set null,
  channel text not null,         -- 'LINE_PUSH' | 'LINE_NOTIFY' ...
  payload jsonb not null,
  sent_at timestamptz,
  status text,                   -- 'QUEUED' | 'SENT' | 'FAILED'
  created_at timestamptz default now()
);
-- 建議每次推送也寫入 audit_log，CRM Timeline 可完整呈現
```

---

## 🪙 Idempotency 防重（恢復）
- 建表：`idempotency_keys(key text unique, created_at timestamptz default now())`
- API：`POST /api/orders` 必帶 `Idempotency-Key`
- 清理排程：每日清 48 小時前紀錄

```sql
create table if not exists idempotency_keys (
  key text primary key,
  created_at timestamptz default now()
);

delete from idempotency_keys where created_at < now() - interval '48 hours';
```

---

## 🗂 初始化
- 跑 `scripts/db/init.sql`（enums、views、索引、RLS、triggers、extensions）
- 跑 `scripts/db/seed.sql`（2 客戶、3 商品×4 尺碼、5 訂單、1 batch、1 parcel）
- 啟用 `pg_trgm` 與 `pgcrypto` 擴充 

---

## 🧭 取消限制（防止已有出貨的訂單被取消）
```sql
create or replace function enforce_no_cancel_after_shipped()
returns trigger as $$
begin
  if NEW.status = 'CANCELED' and OLD.status <> 'CANCELED' then
    if exists (
      select 1 from order_items oi
      where oi.order_id = OLD.id and oi.fulfillment_status = 'SHIPPED'
    ) then
      raise exception '此訂單已有出貨明細，禁止取消';
    end if;
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_orders_no_cancel_after_shipped on orders;
create trigger trg_orders_no_cancel_after_shipped
before update on orders
for each row execute function enforce_no_cancel_after_shipped();
```

---

## 🧰 自動欄位與維護
- `orders.last_transition_at`：狀態改變時由 trigger 更新（見上方狀態機觸發器）
- `customers.last_order_at`：於新訂單建立或進度推進（PAID/ FULFILLING/ SHIPPED/ COMPLETED）時自動回寫（trigger）

```sql
create or replace function trg_orders_touch_customer()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update customers
       set last_order_at = greatest(coalesce(last_order_at, 'epoch'::timestamptz), NEW.created_at)
     where id = NEW.customer_id;
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status
        and NEW.status in ('PAID','FULFILLING','SHIPPED','COMPLETED') then
    update customers
       set last_order_at = greatest(coalesce(last_order_at, 'epoch'::timestamptz),
                                    coalesce(NEW.last_transition_at, now()))
     where id = NEW.customer_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_touch_customer on orders;
create trigger trg_orders_touch_customer
after insert or update on orders
for each row execute function trg_orders_touch_customer();
```

---

## 💸 活動價優先規則（variant > product > 原價）
> 下單或後台查價時，給定 `campaign_id + variant_id` 回傳最終單價（整數分）。

```sql
create or replace function effective_price_cents(p_campaign_id uuid, p_variant_id uuid)
returns int language sql stable as $$
  select coalesce(cv.override_price_cents, cp.override_price_cents, v.price_cents)
  from variants v
  left join campaign_variants  cv on cv.campaign_id = p_campaign_id and cv.variant_id = v.id
  left join campaign_products  cp on cp.campaign_id = p_campaign_id and cp.product_id = v.product_id
  where v.id = p_variant_id
$$;

-- 查價相關索引
create index if not exists idx_campaign_variants_campaign on campaign_variants(campaign_id, variant_id);
create index if not exists idx_campaign_products_campaign on campaign_products(campaign_id, product_id);
create index if not exists idx_campaigns_status_time on campaigns(status, starts_at desc);
```

---

## 🩹 SQL Patch（安全追加版）
> 直接貼入 Supabase SQL Editor 可追加；若已存在會自動跳過（或採 drop+create）。

```sql
-- 0) 先確保擴充
create extension if not exists pgcrypto;

-- 1) 核心表 id 一律預設 gen_random_uuid()（開發＆灑測更順）
alter table products     alter column id set default gen_random_uuid();
alter table variants     alter column id set default gen_random_uuid();
alter table customers    alter column id set default gen_random_uuid();
alter table orders       alter column id set default gen_random_uuid();
alter table order_items  alter column id set default gen_random_uuid();
alter table batches      alter column id set default gen_random_uuid();
alter table parcels      alter column id set default gen_random_uuid();
alter table campaigns    alter column id set default gen_random_uuid();
```

---

## 🔌 API（摘要）
- 客戶端：
  - `GET /api/products`、`GET /api/products/:id`
  - `GET /api/cart/:userId`、`POST /api/cart/:userId/add`
  - `POST /api/orders`（需 `Idempotency-Key`）
- 管理端（需 `?key=ADMIN_API_KEY` 或登入後的 JWT）：
  - `GET /admin/merge-pool`
  - `POST /admin/create-batch`、`GET /admin/batches`
  - `POST /admin/create-parcel`、`GET /admin/parcels`
  - `POST /admin/send-payment-request/:parcelId`
  - `GET /admin/orders`、`GET /admin/orders/:orderId`、`GET /admin/orders/:orderId/items`
  - `POST /notifications`（發送分眾/個人通知）
    - 典型 payload：`{ toCustomerId, channel: 'LINE_PUSH', payload: {...flex...} }`

- Swagger：`/docs`，統一錯誤格式 `{ code, message, details }`
- 錯誤範例：
  - 重送：`409 CONFLICT` + `{ code: "IDEMPOTENT_REPLAY", message: "..." }`
  - 非法狀態跳轉：`422 UNPROCESSABLE_ENTITY` + `{ code: "INVALID_STATUS_TRANSITION", message: "..." }` 