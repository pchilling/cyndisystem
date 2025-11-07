# 📦 如何新增商品到系統

## 方式 1：使用測試腳本（最簡單）⭐

### 步驟：

1. **建立一個新增商品腳本**

在專案資料夾建立檔案: `addProduct.js`

```javascript
require('dotenv').config();
const { createSupabaseClient } = require('./src/services/supabaseClient');

async function addProduct() {
  const supabase = createSupabaseClient();

  // 1. 建立主商品
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: '商品名稱',           // 修改這裡
      code: 'PROD-001',          // 修改這裡
      main_category: '衣物',     // 衣物 / 生活雜貨 / 飾品
      sub_categories: ['上衣', '童裝'],
      origin_country: 'KR',
      status: '現貨',            // 現貨 / 預購 / 缺貨
      image_url: 'https://your-image-url.jpg'  // 修改這裡
    })
    .select()
    .single();

  if (productError) {
    console.error('❌ 建立商品失敗:', productError);
    return;
  }

  console.log('✅ 商品已建立:', product.name);

  // 2. 建立變體
  const variants = [
    {
      product_id: product.id,
      style: '基本款',
      color: '白色',
      size: 'S',
      gender: '男女通用',
      price_cents: 25000,  // 250 元
      cost_cents: 15000,   // 成本 150 元
      weight_g: 200,
      status: '可訂購'
    },
    {
      product_id: product.id,
      style: '基本款',
      color: '白色',
      size: 'M',
      gender: '男女通用',
      price_cents: 28000,  // 280 元
      cost_cents: 17000,
      weight_g: 220,
      status: '可訂購'
    }
  ];

  const { data: newVariants, error: variantsError } = await supabase
    .from('variants')
    .insert(variants)
    .select();

  if (variantsError) {
    console.error('❌ 建立變體失敗:', variantsError);
    return;
  }

  console.log(`✅ 成功建立 ${newVariants.length} 個變體`);
  newVariants.forEach(v => {
    console.log(`   - ${v.color} / ${v.size} - NT$ ${v.price_cents / 100}`);
  });
}

addProduct();
```

2. **修改腳本中的資料**
   - 商品名稱
   - 商品編號
   - 分類
   - 圖片網址
   - 變體資訊（顏色、尺寸、價格）

3. **執行腳本**
```bash
node addProduct.js
```

---

## 方式 2：使用 Supabase Dashboard（推薦給客戶）

### 步驟：

1. **前往 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/lfcqmuztnsaxgksmfbov/editor
   ```

2. **選擇 `products` 資料表**
   - 點擊「Insert row」（插入列）
   - 填寫商品資訊：
     - name: 商品名稱
     - code: 商品編號
     - main_category: 主分類
     - sub_categories: 子分類（陣列格式，如 `["上衣", "童裝"]`）
     - origin_country: `KR` 或 `JP`
     - status: 現貨 / 預購 / 缺貨
     - image_url: 圖片網址
   - 點擊「Save」

3. **記下商品 ID**
   - 建立後會產生一個 UUID，例如：`abc123-def456-...`

4. **建立變體**
   - 選擇 `variants` 資料表
   - 點擊「Insert row」
   - 填寫變體資訊：
     - product_id: 剛才的商品 ID
     - style: 款式（選填）
     - color: 顏色
     - size: 尺寸
     - gender: 性別
     - price_cents: 價格 × 100 (例如 250 元 = 25000)
     - cost_cents: 成本 × 100
     - weight_g: 重量（公克）
     - status: 可訂購 / 停售 / 已斷貨
     - image_url: 圖片網址（選填）
   - 點擊「Save」

5. **重複步驟 4** 建立其他變體（不同顏色、尺寸）

---

## 方式 3：批次匯入（大量商品）

### 準備 CSV 檔案

建立 `products.csv`：

```csv
name,code,main_category,sub_categories,status,image_url
商品A,PROD-001,衣物,"[""上衣"",""童裝""]",現貨,https://example.com/a.jpg
商品B,PROD-002,生活雜貨,"[""杯子""]",預購,https://example.com/b.jpg
```

建立 `variants.csv`：

```csv
product_code,style,color,size,gender,price,cost,status
PROD-001,基本款,白色,S,男女通用,250,150,可訂購
PROD-001,基本款,白色,M,男女通用,280,170,可訂購
PROD-002,,紅色,one,中性,380,200,可訂購
```

### 使用匯入腳本

```javascript
// importProducts.js
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// ... 實作批次匯入邏輯
```

---

## 方式 4：透過管理後台（需要開發）

### 目前狀態：❌ 尚未實作

### 如需此功能，需要：

1. 在 `public/admin/index.html` 加入「新增商品」按鈕
2. 建立新增商品的彈出視窗（Modal）
3. 在 `src/routes/admin.js` 加入新增商品的 API
4. 串接 Supabase Service

### 預估開發時間：1-2 小時

---

## 📸 圖片管理

### 選項 1：使用外部圖床
- **Imgur**: https://imgur.com/
- **Cloudinary**: https://cloudinary.com/
- **ImgBB**: https://imgbb.com/

上傳圖片後複製網址，填入 `image_url` 欄位

### 選項 2：Supabase Storage
1. 前往 Supabase Dashboard > Storage
2. 建立 bucket (例如：`product-images`)
3. 上傳圖片
4. 設定為 Public
5. 複製圖片網址

---

## ✅ 快速新增商品範本

複製以下腳本並修改，即可快速新增商品：

```javascript
// quickAddProduct.js
require('dotenv').config();
const { createSupabaseClient } = require('./src/services/supabaseClient');

const supabase = createSupabaseClient();

async function quickAdd() {
  // 🔥 在此修改商品資訊
  const productInfo = {
    name: '荷葉邊上衣',
    code: 'TOPS-001',
    mainCategory: '衣物',
    subCategories: ['上衣', '童裝'],
    imageUrl: 'https://example.com/image.jpg',
    variants: [
      { color: '白色', size: 'S', price: 250, cost: 150 },
      { color: '白色', size: 'M', price: 280, cost: 170 },
      { color: '粉紅', size: 'S', price: 250, cost: 150 },
    ]
  };

  // 建立商品
  const { data: product } = await supabase
    .from('products')
    .insert({
      name: productInfo.name,
      code: productInfo.code,
      main_category: productInfo.mainCategory,
      sub_categories: productInfo.subCategories,
      origin_country: 'KR',
      status: '現貨',
      image_url: productInfo.imageUrl
    })
    .select()
    .single();

  console.log('✅ 商品已建立:', product.name);

  // 建立變體
  const variantsData = productInfo.variants.map(v => ({
    product_id: product.id,
    style: '基本款',
    color: v.color,
    size: v.size,
    gender: '男女通用',
    price_cents: v.price * 100,
    cost_cents: v.cost * 100,
    weight_g: 200,
    status: '可訂購'
  }));

  const { data: variants } = await supabase
    .from('variants')
    .insert(variantsData)
    .select();

  console.log(`✅ 成功建立 ${variants.length} 個變體`);
  variants.forEach(v => {
    console.log(`   - ${v.color} / ${v.size} - NT$ ${v.price_cents / 100}`);
  });
}

quickAdd();
```

**使用方式：**
1. 儲存為 `quickAddProduct.js`
2. 修改 `productInfo` 物件內的資料
3. 執行：`node quickAddProduct.js`

---

## 🎯 推薦方式

### 給客戶：
- **少量商品**：使用 Supabase Dashboard（方式 2）
- **大量商品**：準備 CSV 後使用批次匯入（方式 3）

### 給開發者：
- **測試用**：使用測試腳本（方式 1）
- **正式環境**：開發管理後台的新增功能（方式 4）

---

**需要我幫你實作「管理後台新增商品」功能嗎？** 😊
