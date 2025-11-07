# 📄 Database Schema v2（Supabase）

本文件對齊 `README_V2.md`，彙整資料表結構、enums、索引、RLS、觸發器/檢視與初始化步驟，供工程落地與驗收參考。

---

## 🧱 主要資料表

- products
  - id uuid PK default gen_random_uuid()
  - name text
  - code text
  - image_url text
  - main_category text
  - sub_categories text[]
  - origin_country text check (origin_country in ('KR','JP'))
  - status text
  - created_at timestamptz default now()

- variants
  - id uuid PK default gen_random_uuid()
  - product_id uuid FK→products(id) on delete restrict
  - style text
  - color text
  - size text
  - gender text
  - price_cents int not null check (price_cents >= 0)
  - cost_cents int not null check (cost_cents >= 0)
  - weight_g int default 0 check (weight_g >= 0)
  - image_url text
  - status text
  - created_at timestamptz default now()
  - UNIQUE(product_id, style, size, color)

- customers
  - id uuid PK default gen_random_uuid()
  - line_id text unique
  - name text
  - phone text
  - delivery_pref text
  - address text
  - level text
  - birthday date
  - preferred_sizes text[]
  - note text
  - total_cents bigint (建議 View 聚合)
  - order_count int (建議 View 聚合)
  - last_order_at timestamptz
  - created_at timestamptz default now()

- orders
  - id uuid PK default gen_random_uuid()
  - customer_id uuid FK→customers(id) on delete restrict
  - order_number bigserial unique
  - recipient_name text
  - recipient_phone text
  - delivery_method text
  - delivery_address text
  - currency_code text default 'TWD' check (currency_code ~ '^[A-Z]{3}$')
  - status order_status
  - payment_method text
  - payment_status payment_status
  - total_cents int not null check (total_cents >= 0)
  - shipping_fee_cents int not null default 0 check (shipping_fee_cents >= 0)
  - discount_cents int not null default 0 check (discount_cents >= 0)
  - final_cents int not null check (final_cents >= 0)
  - estimated_arrival date
  - note text
  - merge_status merge_status
  - campaign_id uuid FK→campaigns(id)
  - parent_order_id uuid FK→orders(id) on delete set null
  - parcel_id uuid FK→parcels(id)
  - created_at timestamptz default now()
  - last_transition_at timestamptz

- order_items
  - id uuid PK default gen_random_uuid()
  - order_id uuid FK→orders(id) on delete cascade
  - variant_id uuid FK→variants(id) on delete restrict
  - product_name text
  - quantity int not null check (quantity > 0)
  - unit_price_cents int not null check (unit_price_cents >= 0)
  - subtotal_cents int not null check (subtotal_cents = quantity * unit_price_cents)
  - fulfillment_status item_fulfillment_status
  - note text
  - parcel_id uuid FK→parcels(id)
  - arrived_at date

- batches（出貨批次）
  - id uuid PK default gen_random_uuid()
  - name text
  - status batch_status
  - notes text
  - created_at timestamptz default now()

- parcels（包裹）
  - id uuid PK default gen_random_uuid()
  - customer_id uuid FK→customers(id) on delete restrict
  - currency_code text default 'TWD' check (currency_code ~ '^[A-Z]{3}$')
  - status parcel_status
  - batch_id uuid FK→batches(id) on delete set null
  - tracking_no text
  - shipping_info text
  - shipping_fee_cents int
  - paid_at timestamptz
  - shipped_at timestamptz
  - created_at timestamptz default now()

- campaigns / campaign_products / campaign_variants
  - campaigns: id uuid PK default gen_random_uuid(), name, starts_at, ends_at, status in ('DRAFT','LIVE','ENDED'), created_at
  - campaign_products: (campaign_id, product_id) PK、override_price_cents、limit_qty
  - campaign_variants: (campaign_id, variant_id) PK、override_price_cents、limit_qty

- notifications
  - id uuid PK default gen_random_uuid()
  - to_customer_id uuid FK→customers(id) on delete set null
  - channel text not null -- 'LINE_PUSH' | 'LINE_NOTIFY' ...
  - payload jsonb not null
  - sent_at timestamptz
  - status text check (status in ('QUEUED','SENT','FAILED'))
  - created_at timestamptz default now()

- audit_log / tags / customer_tags / segments（骨架）
  - audit_log: id, at, actor_user_id, actor_role, entity_type, entity_id, action, data
  - tags: id, name unique
  - customer_tags: (customer_id, tag_id) PK
  - segments: id, name, definition jsonb, created_at

---

## 🔠 Enums

```sql
create type order_status as enum ('WAITING_PAYMENT','PAID','FULFILLING','SHIPPED','COMPLETED','CANCELED');
create type payment_status as enum ('UNPAID','PAID','PARTIAL');
create type merge_status as enum ('PENDING','MERGED','PARTIAL_SHIPPED','DONE');
create type item_fulfillment_status as enum ('PENDING','ALLOCATED','SHORTAGE','SHIPPED');
create type parcel_status as enum ('WAITING_PAYMENT','PAID','SHIPPED','COMPLETED');
create type batch_status as enum ('PLANNING','ALLOCATING','READY_TO_SHIP','CLOSED');
```

合法轉移（orders）：
- WAITING_PAYMENT→PAID、PAID→FULFILLING、FULFILLING→SHIPPED、SHIPPED→COMPLETED
- WAITING_PAYMENT→CANCELED、PAID→CANCELED、PAID→SHIPPED、FULFILLING→CANCELED

---

## 🔐 RLS（摘要）

- profiles(auth_user_id, role['admin','staff','customer'], customer_id)
- 通用：enable RLS（無 policy=全拒）
- products/variants：公開讀或需登入讀（二擇一）；管理者可讀寫
- customers/orders/order_items：客戶僅可讀屬於自己的資料；管理者可讀寫
- parcels/batches：客戶可讀與自己相關資料；管理者可讀寫
- 內部表（campaigns、campaign_products、campaign_variants、audit_log、tags、customer_tags、segments、notifications）：admin-only

---

## 🔎 索引

- Trigram/GIN：products(name, code)、variants(style, color, size)
- 報表/篩選：
  - orders(customer_id, created_at desc)、orders(parent_order_id)
  - orders(status, last_transition_at desc)、orders(merge_status)、orders(campaign_id, created_at desc)
  - order_items(order_id)
  - parcels(batch_id)、parcels(status, created_at desc)
  - customers(last_order_at desc)
  - audit_log(entity_type, entity_id, at desc)
  - notifications(to_customer_id, created_at desc)

---

## 🧮 檢視（Views）

- parcel_totals(parcel_id, total_cents)

```sql
create or replace view parcel_totals as
select parcel_id, sum(subtotal_cents)::bigint as total_cents
from order_items where parcel_id is not null group by parcel_id;
```

---

## ⚙️ 觸發器與函式（重點）

- 狀態機轉移限制：`enforce_order_status_transition()`（更新 `orders.last_transition_at`）
- 整單/部分出貨一致：`sync_order_parcel_id()`（支援 INSERT/UPDATE/DELETE）
- 金額一致性：`recalc_order_amounts()` + `trg_recalc_order_amounts()` + `trg_orders_recompute_final()`
- 客戶最後下單：`trg_orders_touch_customer()`
- 全明細出貨→推 SHIPPED：`maybe_mark_order_shipped()` + `trg_items_status_drive_order()`
- 防止既出貨訂單取消：`enforce_no_cancel_after_shipped()`
- 活動價查價：`effective_price_cents(campaign_id, variant_id)`

---

## 🧩 Extensions

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
```

---

## 🗂 初始化與種子

- `scripts/db/init.sql`：建表、enums、索引、RLS、views、triggers、constraints、extensions
- `scripts/db/seed.sql`：2 客戶、3 商品×4 尺碼、5 訂單、1 batch、1 parcel、1 campaign

---

## ✅ 驗收重點

- 金額以整數分存取；查價遵循（variant > product > 原價）
- 狀態轉移不會被觸發器擋住（含 PAID→SHIPPED、自動推進路徑）
- RLS 生效：匿名/登入/管理權限符合預期
- 搜尋與列表 SLA：啟用 pg_trgm 與索引後體感順暢 