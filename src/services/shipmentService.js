const NotionService = require('./notionService');

class ShipmentService {
  
  // 測試 Notion API 連接和資料庫結構
  static async testNotionConnection() {
    try {
      const shipmentsDbId = process.env.NOTION_SHIPMENTS_DATABASE_ID || '2466cd0c196e80ca9cbfd46006c00879';
      
      console.log('🧪 測試 Notion 連接...');
      console.log('📋 資料庫 ID:', shipmentsDbId);
      
      // 1. 測試資料庫是否存在
      const database = await NotionService.notion.databases.retrieve({
        database_id: shipmentsDbId
      });
      
      console.log('✅ 資料庫存在:', database.title[0]?.plain_text);
      console.log('📊 資料庫屬性:');
      
      Object.keys(database.properties).forEach(key => {
        const prop = database.properties[key];
        console.log(`  - ${key}: ${prop.type}`);
      });
      
      // 2. 測試建立一個簡單記錄
      console.log('🧪 測試建立記錄...');
      
      const testRecord = await NotionService.notion.pages.create({
        parent: {
          database_id: shipmentsDbId
        },
        properties: {
          '批次名稱': {
            title: [
              {
                text: {
                  content: `測試批次-${Date.now()}`
                }
              }
            ]
          },
          '批次狀態': {
            select: {
              name: '待付款'
            }
          }
        }
      });
      
      console.log('✅ 測試記錄建立成功:', testRecord.id);
      
      // 3. 立即刪除測試記錄
      await NotionService.notion.pages.update({
        page_id: testRecord.id,
        archived: true
      });
      
      console.log('🗑️ 測試記錄已刪除');
      
      return {
        success: true,
        database: database,
        testRecordId: testRecord.id
      };
      
    } catch (error) {
      console.error('❌ Notion 連接測試失敗:', error);
      console.error('錯誤詳情:', {
        code: error.code,
        status: error.status,
        message: error.message
      });
      
      return {
        success: false,
        error: error
      };
    }
  }

  // 建立出貨批次
  static async createShipment(shipmentData) {
    try {
      let shipmentsDbId = process.env.NOTION_SHIPMENTS_DATABASE_ID;
      console.log('🔍 環境變數檢查:');
      console.log('NOTION_SHIPMENTS_DATABASE_ID:', shipmentsDbId);
      console.log('其他環境變數:');
      console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? '已設定' : '未設定');
      console.log('NOTION_ORDERS_DATABASE_ID:', process.env.NOTION_ORDERS_DATABASE_ID ? '已設定' : '未設定');
      
      if (!shipmentsDbId) {
        // 暫時解決方案：請將您的 Shipments 資料庫 ID 填入下面
        const fallbackDbId = '2466cd0c196e80ca9cbfd46006c00879'; // 您的實際 Shipments 資料庫 ID
        console.log('⚠️ 使用預設資料庫 ID:', fallbackDbId);
        
        if (fallbackDbId === 'PLEASE_REPLACE_WITH_YOUR_SHIPMENTS_DATABASE_ID') {
          throw new Error(`
 🔥 請設定 Shipments 資料庫 ID！
 
 方法1: 在 .env 文件中設定：
 NOTION_SHIPMENTS_DATABASE_ID=您的資料庫ID
 
 方法2: 或在此行程式碼中暫時替換：
 const fallbackDbId = '您的資料庫ID';
 
 📋 如何獲取資料庫 ID：
 1. 在 Notion 中打開您的 Shipments 資料庫
 2. 複製瀏覽器位址列的 URL
 3. 提取 32 位字符的資料庫 ID
          `);
        }
        
        shipmentsDbId = fallbackDbId;
      }
      
      console.log('📦 建立出貨批次請求資料:', {
        database_id: shipmentsDbId,
        shipmentData: shipmentData
      });

      // 準備屬性
      const properties = {
        '批次名稱': {
          title: [
            {
              text: {
                content: shipmentData.batchName || `批次-${Date.now()}`
              }
            }
          ]
        },
        '批次狀態': {
          select: {
            name: shipmentData.status || '待付款'
          }
        }
      };

      // 可選：客戶 relation（僅當為有效 UUID 時寫入）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (shipmentData.customerId && uuidRegex.test(shipmentData.customerId)) {
        properties['客戶'] = { relation: [ { id: shipmentData.customerId } ] };
      }

      // 可選：運費
      if (typeof shipmentData.shippingFee === 'number') {
        properties['運費'] = { number: shipmentData.shippingFee };
      }

      // 可選：收件資訊
      if (shipmentData.shippingInfo) {
        properties['收件資訊'] = {
          rich_text: [ { text: { content: shipmentData.shippingInfo } } ]
        };
      }

      // 可選：備註
      if (shipmentData.notes) {
        properties['備註'] = {
          rich_text: [ { text: { content: shipmentData.notes } } ]
        };
      }

      const response = await NotionService.notion.pages.create({
        parent: { database_id: shipmentsDbId },
        properties
      });

      console.log('📦 Notion API 回應:', {
        id: response.id,
        created_time: response.created_time,
        properties: response.properties
      });

      const transformedData = this.transformShipmentData(response);
      console.log('📦 轉換後的資料:', transformedData);
      
      return transformedData;
    } catch (error) {
      console.error('建立出貨批次錯誤:', error);
      throw error;
    }
  }

  // 取得所有出貨批次
  static async getAllShipments(filters = {}) {
    try {
      const queryOptions = {
        database_id: process.env.NOTION_SHIPMENTS_DATABASE_ID,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending'
          }
        ]
      };

      if (filters.status) {
        queryOptions.filter = {
          property: '批次狀態',
          select: {
            equals: filters.status
          }
        };
      }

      const response = await NotionService.notion.databases.query(queryOptions);
      
      return response.results.map(shipment => this.transformShipmentData(shipment));
    } catch (error) {
      console.error('取得出貨批次錯誤:', error);
      throw error;
    }
  }

  // 更新出貨批次狀態
  static async updateShipmentStatus(shipmentId, status, notes = '') {
    try {
      const updateData = {
        '批次狀態': {
          select: {
            name: status
          }
        }
      };

      if (status === '已付款') {
        updateData['付款時間'] = {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        };
      }

      if (status === '已出貨') {
        updateData['出貨時間'] = {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        };
      }

      if (notes) {
        updateData['備註'] = {
          rich_text: [
            {
              text: {
                content: notes
              }
            }
          ]
        };
      }

      const response = await NotionService.notion.pages.update({
        page_id: shipmentId,
        properties: updateData
      });

      return this.transformShipmentData(response);
    } catch (error) {
      console.error('更新出貨批次狀態錯誤:', error);
      throw error;
    }
  }

  // 關聯 Order Items 到出貨批次
  static async linkOrderItemsToShipment(shipmentId, orderItemIds) {
    try {
      console.log('🔗 關聯商品到出貨批次:', { shipmentId, orderItemIds });
      
      // 1) 在每個訂單項目上設定 relation -> 出貨批次
      const updateItemPromises = orderItemIds.map(itemId => 
        NotionService.notion.pages.update({
          page_id: itemId,
          properties: {
            '出貨批次': { relation: [ { id: shipmentId } ] }
          }
        })
      );
      await Promise.all(updateItemPromises);
      console.log('✅ 已在訂單項目上關聯出貨批次');

      // 2) 回寫到 Shipments：設定 相關商品項目 relation
      await NotionService.notion.pages.update({
        page_id: shipmentId,
        properties: {
          '相關商品項目': {
            relation: orderItemIds.map(id => ({ id }))
          }
        }
      });
      console.log('✅ 已回寫 Shipments 的 相關商品項目 relation');

      // 3) 計算對應的訂單 IDs，回寫 Shipments 的 相關訂單 relation
      const orderIdsSet = new Set();
      for (const itemId of orderItemIds) {
        try {
          const itemPage = await NotionService.notion.pages.retrieve({ page_id: itemId });
          const orderId = itemPage.properties['所屬訂單']?.relation?.[0]?.id;
          if (orderId) orderIdsSet.add(orderId);
        } catch (e) {
          console.error('讀取訂單項目以取得所屬訂單失敗:', itemId, e.message);
        }
      }
      const orderIds = Array.from(orderIdsSet);
      if (orderIds.length > 0) {
        await NotionService.notion.pages.update({
          page_id: shipmentId,
          properties: {
            '相關訂單': {
              relation: orderIds.map(id => ({ id }))
            }
          }
        });
        console.log('✅ 已回寫 Shipments 的 相關訂單 relation:', orderIds);
      } else {
        console.warn('⚠️ 未從訂單項目中取得任何訂單 ID，略過回寫 相關訂單');
      }

      console.log('✅ 成功關聯所有商品到出貨批次');
      return true;
    } catch (error) {
      console.error('關聯商品到出貨批次錯誤:', error);
      throw error;
    }
  }

  // 轉換出貨批次資料格式
  static transformShipmentData(page) {
    try {
      const properties = page.properties;
      
      return {
        id: page.id,
        batchName: properties['批次名稱']?.title?.[0]?.text?.content || '',
        customerId: properties['客戶']?.relation?.[0]?.id || '',
        status: properties['批次狀態']?.select?.name || '',
        totalAmount: properties['總金額']?.rollup?.number || 0,
        shippingFee: properties['運費']?.number || 0,
        createdTime: page.created_time,
        paymentTime: properties['付款時間']?.date?.start || null,
        shipmentTime: properties['出貨時間']?.date?.start || null,
        trackingNumber: properties['追蹤號碼']?.rich_text?.[0]?.text?.content || '',
        shippingInfo: properties['收件資訊']?.rich_text?.[0]?.text?.content || '',
        notes: properties['備註']?.rich_text?.[0]?.text?.content || ''
      };
    } catch (error) {
      console.error('轉換出貨批次資料錯誤:', error);
      return null;
    }
  }
}

module.exports = ShipmentService; 