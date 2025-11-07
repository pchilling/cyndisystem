const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY
    });
    this.productsDatabaseId = process.env.NOTION_PRODUCTS_DATABASE_ID;
    this.variantsDatabaseId = process.env.NOTION_VARIANTS_DATABASE_ID;
    this.customersDatabaseId = process.env.NOTION_CUSTOMERS_DATABASE_ID;
    this.ordersDatabaseId = process.env.NOTION_ORDERS_DATABASE_ID;
    this.orderItemsDatabaseId = process.env.NOTION_ORDER_ITEMS_DATABASE_ID;
  }

  // ==================== 商品相關方法 ====================
  
  // 取得所有商品
  async getAllProducts() {
    try {
      const response = await this.notion.databases.query({
        database_id: this.productsDatabaseId,
        filter: {
          property: '狀態',
          select: {
            does_not_equal: '停售'
          }
        }
      });

      return response.results.map(this.transformProductData);
    } catch (error) {
      console.error('Notion getAllProducts 錯誤:', error);
      throw error;
    }
  }

  // 取得商品（別名方法，用於 API 路由）
  async getProducts() {
    return this.getAllProducts();
  }

  // 搜尋商品
  async searchProducts(keyword, category) {
    try {
      const filter = {
        and: [
          {
            property: '狀態',
            select: {
              does_not_equal: '停售'
            }
          }
        ]
      };

      // 如果有關鍵字，加入搜尋條件
      if (keyword) {
        filter.and.push({
          or: [
            {
              property: '商品名稱',
              title: {
                contains: keyword
              }
            }
          ]
        });
      }

      // 如果有分類，加入分類條件
      if (category) {
        filter.and.push({
          property: '主分類',
          select: {
            equals: category
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.productsDatabaseId,
        filter: filter
      });

      return response.results.map(this.transformProductData);
    } catch (error) {
      console.error('Notion searchProducts 錯誤:', error);
      throw error;
    }
  }

  // 取得單一商品
  async getProductById(productId) {
    try {
      const response = await this.notion.pages.retrieve({
        page_id: productId
      });

      return this.transformProductData(response);
    } catch (error) {
      console.error('Notion getProductById 錯誤:', error);
      throw error;
    }
  }

  // 取得商品的所有變體
  async getProductVariants(productId) {
    try {
      const response = await this.notion.databases.query({
        database_id: this.variantsDatabaseId,
        filter: {
          and: [
            {
              property: 'Cyndi Product Database',
              relation: {
                contains: productId
              }
            },
            {
              property: '狀態',
              select: {
                equals: '可訂購'
              }
            }
          ]
        }
      });

      // 確保有結果才進行轉換
      if (!response.results || response.results.length === 0) {
        return [];
      }

      return response.results
        .filter(page => page && page.properties) // 過濾掉無效的頁面
        .map(page => this.transformVariantData(page))
        .filter(variant => variant !== null); // 過濾掉轉換失敗的變體
    } catch (error) {
      console.error('Notion getProductVariants 錯誤:', error);
      // 如果變體查詢失敗，返回空陣列而不是拋出錯誤
      return [];
    }
  }

  // ==================== 客戶相關方法 ====================

  // 根據 LINE ID 取得客戶
  async getCustomerByLineId(lineId) {
    try {
      const response = await this.notion.databases.query({
        database_id: this.customersDatabaseId,
        filter: {
          property: 'LINE ID',
          rich_text: {
            equals: lineId
          }
        }
      });

      if (response.results.length > 0) {
        return this.transformCustomerData(response.results[0]);
      }
      return null;
    } catch (error) {
      console.error('Notion getCustomerByLineId 錯誤:', error);
      
      // 如果是欄位名稱錯誤，嘗試列出資料庫結構
      if (error.code === 'validation_error' && error.message.includes('Could not find property')) {
        console.log('嘗試查詢客戶資料庫結構...');
        try {
          const dbInfo = await this.notion.databases.retrieve({
            database_id: this.customersDatabaseId
          });
          console.log('客戶資料庫欄位:');
          Object.keys(dbInfo.properties).forEach(key => {
            console.log(`- ${key} (${dbInfo.properties[key].type})`);
          });
        } catch (dbError) {
          console.error('無法取得資料庫結構:', dbError.message);
        }
      }
      
      throw error;
    }
  }

  // 建立新客戶
  async createCustomer(customerData) {
    try {
      // 構建屬性物件，確保所有值都符合 Notion API 要求
      const properties = {
        '客戶姓名': {
          title: [
            {
              text: {
                content: customerData.name || '新客戶'
              }
            }
          ]
        },
        'LINE ID': {
          rich_text: [
            {
              text: {
                content: customerData.lineId || ''
              }
            }
          ]
        },
        '收件方式': {
          select: {
            name: customerData.deliveryMethod || '宅配到府'
          }
        },
        '收件地址': {
          rich_text: [
            {
              text: {
                content: customerData.address || ''
              }
            }
          ]
        },
        '客戶等級': {
          select: {
            name: '一般會員'
          }
        },
        '備註': {
          rich_text: [
            {
              text: {
                content: customerData.notes || ''
              }
            }
          ]
        },
        '總消費金額': {
          number: 0
        },
        '訂單次數': {
          number: 0
        }
      };

      // 只有當電話號碼存在且有效時才添加電話欄位
      if (customerData.phone && customerData.phone.trim() !== '') {
        properties['電話'] = {
          phone_number: customerData.phone.trim()
        };
      }

      // 只有當生日存在時才添加生日欄位
      if (customerData.birthday) {
        properties['生日'] = {
          date: {
            start: customerData.birthday
          }
        };
      }

      const response = await this.notion.pages.create({
        parent: {
          database_id: this.customersDatabaseId
        },
        properties: properties
      });

      return this.transformCustomerData(response);
    } catch (error) {
      console.error('Notion createCustomer 錯誤:', error);
      
      // 如果是欄位錯誤，查看資料庫結構
      if (error.code === 'validation_error') {
        console.log('🔍 查詢客戶資料庫結構...');
        try {
          const dbInfo = await this.notion.databases.retrieve({
            database_id: this.customersDatabaseId
          });
          console.log('📋 客戶資料庫實際欄位:');
          Object.keys(dbInfo.properties).forEach(key => {
            console.log(`   - "${key}" (${dbInfo.properties[key].type})`);
          });
        } catch (dbError) {
          console.error('無法取得資料庫結構:', dbError.message);
        }
      }
      
      throw error;
    }
  }

  // 獲取客戶詳情
  async getCustomerDetails(customerId) {
    try {
      // 獲取客戶基本資料
      const customer = await this.getCustomerById(customerId);
      
      // 獲取客戶訂單歷史
      const orders = await this.getOrdersByCustomerId(customerId);
      
      // 計算統計數據
      const stats = this.calculateCustomerStats(orders);
      
      return {
        customer,
        orders,
        stats
      };
    } catch (error) {
      console.error('獲取客戶詳情失敗:', error);
      throw error;
    }
  }

  // 獲取單一客戶資料
  async getCustomerById(customerId) {
    try {
      const response = await this.notion.pages.retrieve({
        page_id: customerId
      });
      return this.transformCustomerData(response);
    } catch (error) {
      console.error('獲取客戶資料失敗:', error);
      throw error;
    }
  }

  // 獲取客戶的所有訂單
  async getOrdersByCustomerId(customerId) {
    try {
      const response = await this.notion.databases.query({
        database_id: this.ordersDatabaseId,
        filter: {
          property: '客戶',
          relation: {
            contains: customerId
          }
        },
        sorts: [
          {
            property: '建立時間',
            direction: 'descending'
          }
        ]
      });

      return response.results.map(order => this.transformOrderData(order));
    } catch (error) {
      console.error('獲取客戶訂單失敗:', error);
      return [];
    }
  }

  // 計算客戶統計數據
  calculateCustomerStats(orders) {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null,
        completedOrders: 0,
        cancelledOrders: 0
      };
    }

    const completedOrders = orders.filter(order => order.status === '已完成');
    const cancelledOrders = orders.filter(order => order.status === '已取消');
    const totalSpent = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;
    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

    return {
      totalOrders: orders.length,
      totalSpent,
      averageOrderValue: Math.round(averageOrderValue),
      lastOrderDate,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length
    };
  }

  // 獲取所有客戶（帶分頁和篩選）
  async getAllCustomers(filters = {}) {
    try {
      const { page = 1, limit = 20, search, level } = filters;
      
      // 構建查詢條件
      const queryFilter = {
        and: []
      };

      // 如果有客戶等級篩選
      if (level) {
        queryFilter.and.push({
          property: '客戶等級',
          select: {
            equals: level
          }
        });
      }

      // 如果有搜尋關鍵字（姓名或電話）
      if (search) {
        queryFilter.and.push({
          or: [
            {
              property: '客戶姓名',
              title: {
                contains: search
              }
            },
            {
              property: '電話',
              phone_number: {
                contains: search
              }
            },
            {
              property: 'LINE ID',
              rich_text: {
                contains: search
              }
            }
          ]
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.customersDatabaseId,
        filter: queryFilter.and.length > 0 ? queryFilter : undefined,
        sorts: [
          {
            property: '註冊時間',
            direction: 'descending'
          }
        ],
        page_size: limit
      });

      // 轉換客戶數據
      const customers = response.results.map(customer => this.transformCustomerData(customer));
      
      // 為每個客戶獲取基本統計信息
      const customersWithStats = await Promise.all(
        customers.map(async (customer) => {
          try {
            const orders = await this.getOrdersByCustomerId(customer.id);
            const stats = this.calculateCustomerStats(orders);
            return {
              ...customer,
              stats
            };
          } catch (error) {
            console.error(`獲取客戶 ${customer.id} 統計失敗:`, error);
            return {
              ...customer,
              stats: {
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                lastOrderDate: null,
                completedOrders: 0,
                cancelledOrders: 0
              }
            };
          }
        })
      );

      return {
        customers: customersWithStats,
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
        total: response.results.length
      };
    } catch (error) {
      console.error('獲取客戶列表失敗:', error);
      throw error;
    }
  }

  // 更新客戶資料
  async updateCustomer(customerId, updateData) {
    try {
      const properties = {};

      // 構建要更新的屬性
      if (updateData.name) {
        properties['客戶姓名'] = {
          title: [{ text: { content: updateData.name } }]
        };
      }

      if (updateData.phone) {
        properties['電話'] = {
          phone_number: updateData.phone
        };
      }

      if (updateData.level) {
        properties['客戶等級'] = {
          select: { name: updateData.level }
        };
      }

      if (updateData.deliveryMethod) {
        properties['收件方式'] = {
          select: { name: updateData.deliveryMethod }
        };
      }

      if (updateData.address) {
        properties['收件地址'] = {
          rich_text: [{ text: { content: updateData.address } }]
        };
      }

      if (updateData.notes) {
        properties['備註'] = {
          rich_text: [{ text: { content: updateData.notes } }]
        };
      }

      if (updateData.birthday) {
        properties['生日'] = {
          date: { start: updateData.birthday }
        };
      }

      const response = await this.notion.pages.update({
        page_id: customerId,
        properties
      });

      return this.transformCustomerData(response);
    } catch (error) {
      console.error('更新客戶資料失敗:', error);
      throw error;
    }
  }

  // ==================== 訂單相關方法 ====================

  // 建立新訂單
  async createOrder(orderData) {
    try {
      // 構建屬性物件，確保所有值都符合 Notion API 要求
      const properties = {
        '客戶': {
          relation: [
            {
              id: orderData.customerId
            }
          ]
        },
        '收件人姓名': {
          title: [
            {
              text: {
                content: orderData.recipientName || ''
              }
            }
          ]
        },
        '收件方式': {
          select: {
            name: orderData.deliveryMethod || '宅配到府'
          }
        },
        '收件地址': {
          multi_select: orderData.deliveryAddress ? [
            {
              name: orderData.deliveryAddress
            }
          ] : []
        },
        '訂單狀態': {
          select: {
            name: orderData.status || '待付款'
          }
        },
        '併單狀態': {
          select: {
            name: orderData.mergeStatus || '待併單'
          }
        },
        '付款方式': {
          select: {
            name: orderData.paymentMethod || '銀行轉帳'
          }
        },
        '付款狀態': {
          select: {
            name: '未付款'
          }
        },
        '總金額': {
          number: orderData.totalAmount || 0
        },
        '運費': {
          number: orderData.shippingFee || 0
        },
        '折扣金額': {
          number: orderData.discount || 0
        },
        '備註': {
          rich_text: [
            {
              text: {
                content: orderData.notes || ''
              }
            }
          ]
        }
      };

      // 只有當收件人電話存在且有效時才添加電話欄位
      if (orderData.recipientPhone && orderData.recipientPhone.trim() !== '') {
        properties['收件人電話'] = {
          phone_number: orderData.recipientPhone.trim()
        };
      }

      const response = await this.notion.pages.create({
        parent: {
          database_id: this.ordersDatabaseId
        },
        properties: properties
      });

      return this.transformOrderData(response);
    } catch (error) {
      console.error('Notion createOrder 錯誤:', error);
      throw error;
    }
  }

  // 建立訂單項目
  async createOrderItem(orderItemData) {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.orderItemsDatabaseId
        },
        properties: {
          '所屬訂單': {
            relation: [
              {
                id: orderItemData.orderId
              }
            ]
          },
          '商品變體': orderItemData.variantId ? {
            relation: [
              {
                id: orderItemData.variantId
              }
            ]
          } : { relation: [] },
          '商品名稱': {
            title: [
              {
                text: {
                  content: orderItemData.productName || ''
                }
              }
            ]
          },
          '數量': {
            number: orderItemData.quantity || 1
          },
          '單價': {
            number: orderItemData.unitPrice || 0
          },
          '配貨狀態': {
            select: {
              name: '待確認'
            }
          },
          '到貨狀態': {
            select: {
              name: '未到貨'
            }
          },
          '備註': {
            rich_text: [
              {
                text: {
                  content: orderItemData.notes || ''
                }
              }
            ]
          }
        }
      });

      return this.transformOrderItemData(response);
    } catch (error) {
      console.error('Notion createOrderItem 錯誤:', error);
      throw error;
    }
  }

  // 獲取所有訂單（帶分頁和篩選）
  async getAllOrders(filters = {}) {
    try {
      const { status, mergeStatus, page = 1, limit = 20, search } = filters;
      
      // 構建查詢條件
      const queryFilter = {
        and: []
      };

      // 如果有狀態篩選
      if (status) {
        queryFilter.and.push({
          property: '訂單狀態',
          select: {
            equals: status
          }
        });
      }

      // 如果有併單狀態篩選
      if (mergeStatus) {
        queryFilter.and.push({
          property: '併單狀態',
          select: {
            equals: mergeStatus
          }
        });
      }

      // 如果有搜尋關鍵字
      if (search) {
        queryFilter.and.push({
          or: [
            {
              property: '收件人姓名',
              title: {
                contains: search
              }
            },
            {
              property: '收件人電話',
              phone_number: {
                contains: search
              }
            }
          ]
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.ordersDatabaseId,
        filter: queryFilter.and.length > 0 ? queryFilter : undefined,
        sorts: [
          {
            property: '建立時間',
            direction: 'descending'
          }
        ],
        page_size: limit,
        start_cursor: page > 1 ? undefined : undefined // 簡化分頁，後續可優化
      });

      const orders = response.results
        .filter(page => page && page.properties)
        .map(page => this.transformOrderData(page));

      return {
        orders,
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
        totalCount: orders.length // Notion 不提供總數，這裡簡化
      };

    } catch (error) {
      console.error('Notion getAllOrders 錯誤:', error);
      throw error;
    }
  }

  // 更新訂單狀態
  async updateOrderStatus(orderId, status, notes) {
    try {
      const updateData = {
        '訂單狀態': {
          select: {
            name: status
          }
        }
      };

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

      const response = await this.notion.pages.update({
        page_id: orderId,
        properties: updateData
      });

      return this.transformOrderData(response);

    } catch (error) {
      console.error('Notion updateOrderStatus 錯誤:', error);
      throw error;
    }
  }

  // 獲取儀表板統計數據
  async getDashboardStats() {
    try {
      // 獲取所有訂單進行統計
      const ordersResponse = await this.notion.databases.query({
        database_id: this.ordersDatabaseId,
        page_size: 100 // 限制查詢數量，避免超時
      });

      const orders = ordersResponse.results
        .filter(page => page && page.properties)
        .map(page => this.transformOrderData(page));

      // 獲取所有客戶進行統計
      const customersResponse = await this.notion.databases.query({
        database_id: this.customersDatabaseId,
        page_size: 100
      });

      const customers = customersResponse.results
        .filter(page => page && page.properties);

      // 計算統計數據
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === '待付款' || order.status === '已付款').length;
      const completedOrders = orders.filter(order => order.status === '已完成').length;
      const totalRevenue = orders
        .filter(order => order.status !== '已取消')
        .reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      const totalCustomers = customers.length;

      // 獲取最近訂單（前5筆）
      const recentOrders = orders.slice(0, 5).map(order => ({
        orderNumber: order.orderNumber || `ORDER-${order.id.slice(-8)}`,
        customerName: order.recipientName,
        amount: order.finalAmount || 0,
        status: order.status,
        createdAt: order.createdAt
      }));

      // 生成銷售趨勢數據（簡化版，按天統計最近7天）
      const salesTrend = this.generateSalesTrend(orders);

      return {
        overview: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue,
          totalCustomers,
          monthlyGrowth: 0 // 簡化，暫不計算
        },
        recentOrders,
        topProducts: [], // 暫時為空，需要訂單項目數據
        chartData: {
          salesTrend,
          orderStatus: [
            { label: '待付款', value: orders.filter(o => o.status === '待付款').length },
            { label: '已付款', value: orders.filter(o => o.status === '已付款').length },
            { label: '配貨中', value: orders.filter(o => o.status === '配貨中').length },
            { label: '已出貨', value: orders.filter(o => o.status === '已出貨').length },
            { label: '已完成', value: orders.filter(o => o.status === '已完成').length },
            { label: '已取消', value: orders.filter(o => o.status === '已取消').length }
          ]
        }
      };

    } catch (error) {
      console.error('Notion getDashboardStats 錯誤:', error);
      throw error;
    }
  }

  // 生成銷售趨勢數據
  generateSalesTrend(orders) {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr && order.status !== '已取消';
      });
      
      const dayAmount = dayOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      
      last7Days.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        amount: dayAmount
      });
    }
    
    return last7Days;
  }

  // ==================== 資料轉換方法 ====================

  // 轉換商品資料格式
  transformProductData(page) {
    const properties = page.properties;
    return {
      id: page.id,
      name: properties['商品名稱']?.title[0]?.plain_text || '',
      variant_id: properties['variant_id']?.rich_text[0]?.plain_text || '',
      image: properties['商品圖片']?.files[0]?.file?.url || 
             properties['商品圖片']?.files[0]?.external?.url || '',
      mainCategory: properties['主分類']?.select?.name || '',
      subCategories: properties['子分類']?.multi_select?.map(cat => cat.name) || [],
      status: properties['狀態']?.select?.name || ''
    };
  }

  // 轉換變體資料格式
  transformVariantData(page) {
    if (!page || !page.properties) {
      console.warn('無效的變體頁面資料:', page);
      return null;
    }
    
    const properties = page.properties;
    

    
    // 嘗試多種可能的商品名稱取值方式
    let productName = '';
    if (properties['商品名稱']?.title?.[0]?.plain_text) {
      productName = properties['商品名稱'].title[0].plain_text;
    } else if (properties['商品名稱']?.rich_text?.[0]?.plain_text) {
      productName = properties['商品名稱'].rich_text[0].plain_text;
    } else if (properties['商品名稱']?.select?.name) {
      productName = properties['商品名稱'].select.name;
    }
    
    return {
      id: page.id,
      name: productName || `商品-${page.id.slice(-8)}`,  // 如果沒有名稱，用 ID 代替
      variant_id: properties['variant_id']?.rich_text?.[0]?.plain_text || '',
      productRef: properties['Cyndi Product Database']?.relation?.[0]?.id || '',
      style: properties['款式']?.select?.name || '',
      color: properties['顏色']?.select?.name || '',
      size: properties['尺寸']?.select?.name || '',
      gender: properties['性別']?.select?.name || '',
      price: properties['價格']?.number || 0,
      status: properties['狀態']?.select?.name || ''
    };
  }

  // 轉換客戶資料格式
  transformCustomerData(page) {
    const properties = page.properties;
    return {
      id: page.id,
      name: properties['客戶姓名']?.title?.[0]?.plain_text || '',
      lineId: properties['LINE ID']?.rich_text?.[0]?.plain_text || '',
      phone: properties['電話']?.phone_number || '',
      deliveryMethod: properties['收件方式']?.select?.name || '',
      address: properties['收件地址']?.rich_text?.[0]?.plain_text || '',
      customerLevel: properties['客戶等級']?.select?.name || '',
      totalSpent: properties['總消費金額']?.number || 0,
      orderCount: properties['訂單次數']?.number || 0,
      birthday: properties['生日']?.date?.start || null,
      notes: properties['備註']?.rich_text?.[0]?.plain_text || '',
      createdAt: page.created_time
    };
  }

  // 轉換訂單資料格式
  transformOrderData(page) {
    const properties = page.properties;
    return {
      id: page.id,
      orderNumber: properties['訂單編號']?.unique_id?.number ? `ORDER-${String(properties['訂單編號'].unique_id.number).padStart(3, '0')}` : `ORDER-${page.id.slice(-6)}`,
      customerId: properties['客戶']?.relation?.[0]?.id || '',
      recipientName: properties['收件人姓名']?.title?.[0]?.plain_text || '',
      recipientPhone: properties['收件人電話']?.phone_number || '',
      deliveryMethod: properties['收件方式']?.select?.name || '',
      deliveryAddress: properties['收件地址']?.multi_select?.[0]?.name || '',
      status: properties['訂單狀態']?.select?.name || '',
      mergeStatus: properties['併單狀態']?.select?.name || '',
      paymentMethod: properties['付款方式']?.select?.name || '',
      paymentStatus: properties['付款狀態']?.select?.name || '',
      totalAmount: properties['總金額']?.number || 0,
      shippingFee: properties['運費']?.number || 0,
      discount: properties['折扣金額']?.number || 0,
      finalAmount: properties['實付金額']?.formula?.number || 0,
      estimatedDelivery: properties['預計到貨日']?.date?.start || null,
      notes: properties['備註']?.rich_text?.[0]?.plain_text || '',
      createdAt: page.created_time
    };
  }

  // 轉換訂單項目資料格式
  transformOrderItemData(page) {
    const properties = page.properties;
    
    // 嘗試獲取創建時間，先從自定義日期欄位，再從系統創建時間
    let createdAt = null;
    
    // 檢查可能的日期欄位名稱
    const dateFields = ['建立時間', '創建時間', '日期', 'datetime', 'created_at', 'createdAt'];
    for (const field of dateFields) {
      if (properties[field]?.date?.start) {
        createdAt = properties[field].date.start;
        break;
      }
    }
    
    // 如果沒有找到自定義日期欄位，使用系統創建時間
    if (!createdAt && page.created_time) {
      createdAt = page.created_time;
    }
    
    return {
      id: page.id,
      orderId: properties['所屬訂單']?.relation?.[0]?.id || '',
      variantId: properties['商品變體']?.relation?.[0]?.id || '',
      productName: properties['商品名稱']?.title?.[0]?.plain_text || '',
      quantity: properties['數量']?.number || 0,
      unitPrice: properties['單價']?.number || 0,
      subtotal: properties['小計']?.formula?.number || 0,
      fulfillmentStatus: properties['配貨狀態']?.select?.name || '',
      notes: properties['備註']?.rich_text?.[0]?.plain_text || '',
      createdAt: createdAt
    };
  }

  // ==================== 商品管理相關方法 ====================

  // 獲取所有商品（管理用，包含詳細統計）
  async getAllProductsForAdmin(filters = {}) {
  try {
    const { page = 1, limit = 20, search, style, color, size, gender, status } = filters;
    
    // 構建查詢條件
    const queryFilter = {
      and: []
    };

    // 如果有狀態篩選（變體狀態）
    if (status) {
      queryFilter.and.push({
        property: '狀態',
        select: {
          equals: status
        }
      });
    }

    // 如果有搜尋關鍵字（在變體中搜尋商品名稱）
    if (search) {
      queryFilter.and.push({
        property: '商品名稱',
        title: {
          contains: search
        }
      });
    }

    // 如果有款式篩選
    if (style) {
      queryFilter.and.push({
        property: '款式',
        select: {
          equals: style
        }
      });
    }

    // 如果有顏色篩選
    if (color) {
      queryFilter.and.push({
        property: '顏色',
        select: {
          equals: color
        }
      });
    }

    // 如果有尺寸篩選
    if (size) {
      queryFilter.and.push({
        property: '尺寸',
        select: {
          equals: size
        }
      });
    }

    // 如果有性別篩選
    if (gender) {
      queryFilter.and.push({
        property: '性別',
        select: {
          equals: gender
        }
      });
    }

    const response = await this.notion.databases.query({
      database_id: this.variantsDatabaseId,  // 改為查詢變體資料庫
      filter: queryFilter.and.length > 0 ? queryFilter : undefined,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ],
      page_size: limit
    });

    // 轉換變體數據並添加統計信息（因為我們查詢的是 Variants Database）
    const variantsWithStats = await Promise.all(
      response.results.map(async (variant) => {
        try {
          const variantData = this.transformVariantData(variant);
          
          // 獲取銷售統計（從訂單項目計算）
          const salesStats = await this.getProductSalesStats(variantData.id);
          
          return {
            id: variantData.id,
            name: variantData.name || '未知商品',  // 改為使用 name 而不是 productName
            productCode: variantData.variant_id || variantData.id.slice(-8), // 使用 variant_id 作為編號
            price: variantData.price || 0,  // 改為使用 price 而不是 unitPrice
            mainCategory: '童裝', // 預設分類
            status: variantData.status || '未知',
            variants: [variantData], // 單一變體包裝成陣列
            stats: salesStats,
            description: `${variantData.style || ''} ${variantData.color || ''} ${variantData.size || ''} ${variantData.gender || ''}`.trim()
          };
        } catch (error) {
          console.error(`獲取變體 ${variant.id} 統計失敗:`, error);
          const variantData = this.transformVariantData(variant);
          return {
            id: variantData.id,
            name: variantData.name || '未知商品',  // 改為使用 name
            productCode: variantData.variant_id || variantData.id.slice(-8),  // 使用 variant_id
            price: variantData.price || 0,  // 改為使用 price
            mainCategory: '童裝',
            status: variantData.status || '未知',
            variants: [variantData],
            stats: {
              totalSold: 0,
              totalRevenue: 0,
              averagePrice: 0,
              stockLevel: 0,
              lastSold: null
            },
            description: `${variantData.style || ''} ${variantData.color || ''} ${variantData.size || ''} ${variantData.gender || ''}`.trim()
          };
        }
      })
    );

    return {
      products: variantsWithStats,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
      total: response.results.length
    };
  } catch (error) {
    console.error('獲取商品列表失敗:', error);
    throw error;
  }
}

// 獲取商品銷售統計
async getProductSalesStats(variantId) {
  try {
    // 查詢包含此變體的訂單項目
    const orderItemsResponse = await this.notion.databases.query({
      database_id: this.orderItemsDatabaseId,
      filter: {
        property: '商品變體',
        relation: {
          contains: variantId
        }
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const orderItems = orderItemsResponse.results
      .filter(item => item && item.properties)
      .map(item => this.transformOrderItemData(item));

    if (orderItems.length === 0) {
      return {
        totalSold: 0,
        totalRevenue: 0,
        averagePrice: 0,
        stockLevel: 0,
        lastSold: null
      };
    }

    // 計算統計數據
    const totalSold = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalRevenue = orderItems.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);
    const averagePrice = totalSold > 0 ? totalRevenue / totalSold : 0;
    
    // 取得最後銷售時間（已經按創建時間降序排列）
    const lastSoldDate = orderItems.length > 0 && orderItems[0].createdAt ? 
      orderItems[0].createdAt : null;

    return {
      totalSold,
      totalRevenue,
      averagePrice: Math.round(averagePrice),
      stockLevel: 0, // 暫時不計算庫存，需要額外的庫存管理
      lastSold: lastSoldDate
    };
  } catch (error) {
    console.error(`獲取變體 ${variantId} 銷售統計失敗:`, error);
    return {
      totalSold: 0,
      totalRevenue: 0,
      averagePrice: 0,
      stockLevel: 0,
      lastSold: null
    };
  }
}

// 更新商品資料
async updateProduct(productId, updateData) {
  try {
    const properties = {};

    // 構建要更新的屬性
    if (updateData.name) {
      properties['商品名稱'] = {
        title: [{ text: { content: updateData.name } }]
      };
    }

    if (updateData.productCode) {
      properties['商品編號'] = {
        rich_text: [{ text: { content: updateData.productCode } }]
      };
    }

    if (updateData.price !== undefined) {
      properties['價格'] = {
        number: updateData.price
      };
    }

    if (updateData.mainCategory) {
      properties['主分類'] = {
        select: { name: updateData.mainCategory }
      };
    }

    if (updateData.status) {
      properties['商品狀態'] = {
        select: { name: updateData.status }
      };
    }

    if (updateData.description) {
      properties['商品描述'] = {
        rich_text: [{ text: { content: updateData.description } }]
      };
    }

    if (updateData.tags) {
      properties['標籤'] = {
        multi_select: updateData.tags.map(tag => ({ name: tag }))
      };
    }

    const response = await this.notion.pages.update({
      page_id: productId,
      properties
    });

    return this.transformProductData(response);
  } catch (error) {
    console.error('更新商品資料失敗:', error);
    throw error;
  }
}

// 獲取變體詳情（適用於變體資料庫架構）
async getProductDetailForAdmin(variantId) {
  try {
    // 直接從變體資料庫獲取資料
    const response = await this.notion.pages.retrieve({
      page_id: variantId
    });
    
    if (!response || !response.properties) {
      throw new Error('找不到指定的變體');
    }
    
    // 轉換變體資料
    const variantData = this.transformVariantData(response);
    
    // 獲取銷售統計
    const salesStats = await this.getProductSalesStats(variantId);
    
    // 獲取相關訂單項目
    const recentOrders = await this.getProductRecentOrders(variantId);
    
    // 查找相同商品名稱的其他變體
    const relatedVariants = await this.getRelatedVariants(variantData.name, variantId);
    
    return {
      variant: variantData,
      stats: salesStats,
      recentOrders,
      relatedVariants
    };
      } catch (error) {
      console.error('獲取變體詳情失敗:', error);
      throw error;
    }
  }

  // 獲取相關變體（相同商品名稱的其他變體）
  async getRelatedVariants(productName, excludeVariantId) {
    try {
      const response = await this.notion.databases.query({
        database_id: this.variantsDatabaseId,
        filter: {
          property: '商品名稱',
          title: {
            equals: productName
          }
        },
        sorts: [
          {
            property: '價格',
            direction: 'ascending'
          }
        ]
      });

      return response.results
        .filter(page => page && page.properties && page.id !== excludeVariantId)
        .map(page => this.transformVariantData(page));
    } catch (error) {
      console.error('獲取相關變體失敗:', error);
      return [];
    }
  }

// 獲取商品最近訂單
async getProductRecentOrders(productId, limit = 10) {
  try {
    const orderItemsResponse = await this.notion.databases.query({
      database_id: this.orderItemsDatabaseId,
      filter: {
        or: [
          {
            property: '商品變體',
            relation: {
              contains: productId
            }
          },
          {
            property: '商品名稱',
            title: {
              contains: productId.slice(-8)
            }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ],
      page_size: limit
    });

    return orderItemsResponse.results
      .filter(item => item && item.properties)
      .map(item => this.transformOrderItemData(item));
  } catch (error) {
    console.error('獲取商品最近訂單失敗:', error);
    return [];
  }
}

// 獲取商品銷售排行
async getTopSellingProducts(limit = 10) {
  try {
    // 獲取所有商品
    const products = await this.getAllProductsForAdmin({ limit: 100 });
    
    // 按銷售量排序
    const sortedProducts = products.products
      .sort((a, b) => (b.stats?.totalSold || 0) - (a.stats?.totalSold || 0))
      .slice(0, limit);
    
    return sortedProducts.map(product => ({
      id: product.id,
      name: product.name,
      totalSold: product.stats?.totalSold || 0,
      totalRevenue: product.stats?.totalRevenue || 0,
      averagePrice: product.stats?.averagePrice || 0
    }));
      } catch (error) {
      console.error('獲取熱銷商品失敗:', error);
      return [];
    }
  }

  // ==================== 銷售報表相關方法 ====================

  // 獲取銷售報表數據
  async getSalesReport(filters = {}) {
    try {
      const { startDate, endDate, period = 'daily' } = filters;
      
      // 獲取指定時間範圍內的訂單
      const ordersFilter = {
        and: [
          {
            property: '訂單狀態',
            select: {
              does_not_equal: '已取消'
            }
          }
        ]
      };

      // 如果有時間範圍篩選
      if (startDate) {
        ordersFilter.and.push({
          timestamp: 'created_time',
          created_time: {
            on_or_after: startDate
          }
        });
      }

      if (endDate) {
        ordersFilter.and.push({
          timestamp: 'created_time',
          created_time: {
            on_or_before: endDate
          }
        });
      }

      const ordersResponse = await this.notion.databases.query({
        database_id: this.ordersDatabaseId,
        filter: ordersFilter,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'ascending'
          }
        ],
        page_size: 100
      });

      const orders = ordersResponse.results
        .filter(page => page && page.properties)
        .map(page => this.transformOrderData(page));

      // 獲取訂單項目數據
      const orderItems = await this.getOrderItemsForReport(orders.map(o => o.id));

      // 生成報表數據
      const reportData = {
        summary: this.calculateSalesSummary(orders, orderItems),
        trends: this.generateSalesTrends(orders, period),
        topProducts: this.getTopSellingProductsFromOrders(orderItems),
        categoryAnalysis: this.analyzeSalesByCategory(orderItems),
        customerAnalysis: this.analyzeCustomerBehavior(orders)
      };

      return reportData;
    } catch (error) {
      console.error('獲取銷售報表失敗:', error);
      throw error;
    }
  }

  // 獲取訂單項目數據（用於報表）
  async getOrderItemsForReport(orderIds) {
    try {
      if (!orderIds || orderIds.length === 0) return [];

      const orderItemsResponse = await this.notion.databases.query({
        database_id: this.orderItemsDatabaseId,
        filter: {
          or: orderIds.map(orderId => ({
            property: '所屬訂單',
            relation: {
              contains: orderId
            }
          }))
        },
        page_size: 100
      });

      return orderItemsResponse.results
        .filter(item => item && item.properties)
        .map(item => this.transformOrderItemData(item));
    } catch (error) {
      console.error('獲取訂單項目數據失敗:', error);
      return [];
    }
  }

  // 計算銷售摘要
  calculateSalesSummary(orders, orderItems) {
    const summary = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalItems: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      refundedAmount: 0
    };

    orders.forEach(order => {
      summary.totalRevenue += order.finalAmount || 0;
      
      switch (order.status) {
        case '已完成':
          summary.completedOrders++;
          break;
        case '待付款':
        case '已付款':
        case '配貨中':
        case '已出貨':
          summary.pendingOrders++;
          break;
        case '已取消':
          summary.cancelledOrders++;
          break;
      }
    });

    summary.totalItems = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    summary.averageOrderValue = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;

    return summary;
  }

  // 生成銷售趨勢數據
  generateSalesTrends(orders, period = 'daily') {
    const trends = [];
    const groupedData = {};

    orders.forEach(order => {
      if (!order.createdAt) return;

      const date = new Date(order.createdAt);
      let key;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          orders: 0,
          revenue: 0,
          items: 0
        };
      }

      groupedData[key].orders++;
      groupedData[key].revenue += order.finalAmount || 0;
    });

    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 從訂單項目分析熱銷商品
  getTopSellingProductsFromOrders(orderItems, limit = 10) {
    const productStats = {};

    orderItems.forEach(item => {
      const key = item.productName || 'Unknown';
      if (!productStats[key]) {
        productStats[key] = {
          name: key,
          totalSold: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }

      productStats[key].totalSold += item.quantity || 0;
      productStats[key].totalRevenue += (item.unitPrice || 0) * (item.quantity || 0);
      productStats[key].orderCount++;
    });

    return Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  // 分析分類銷售
  analyzeSalesByCategory(orderItems) {
    const categoryStats = {};

    orderItems.forEach(item => {
      // 這裡需要從商品資料獲取分類，暫時簡化
      const category = '童裝'; // 可以後續改進
      
      if (!categoryStats[category]) {
        categoryStats[category] = {
          name: category,
          totalSold: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }

      categoryStats[category].totalSold += item.quantity || 0;
      categoryStats[category].totalRevenue += (item.unitPrice || 0) * (item.quantity || 0);
      categoryStats[category].orderCount++;
    });

    return Object.values(categoryStats);
  }

  // 分析客戶行為
  analyzeCustomerBehavior(orders) {
    const customerStats = {
      newCustomers: 0,
      returningCustomers: 0,
      averageOrdersPerCustomer: 0,
      topCustomers: []
    };

    const customerData = {};

    orders.forEach(order => {
      const customerId = order.customerId;
      if (!customerId) return;

      if (!customerData[customerId]) {
        customerData[customerId] = {
          id: customerId,
          name: order.recipientName || 'Unknown',
          orderCount: 0,
          totalSpent: 0,
          firstOrder: order.createdAt,
          lastOrder: order.createdAt
        };
      }

      customerData[customerId].orderCount++;
      customerData[customerId].totalSpent += order.finalAmount || 0;
      
      if (order.createdAt > customerData[customerId].lastOrder) {
        customerData[customerId].lastOrder = order.createdAt;
      }
    });

    const customers = Object.values(customerData);
    
    customerStats.newCustomers = customers.filter(c => c.orderCount === 1).length;
    customerStats.returningCustomers = customers.filter(c => c.orderCount > 1).length;
    customerStats.averageOrdersPerCustomer = customers.length > 0 ? 
      customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length : 0;
    
    customerStats.topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return customerStats;
  }

  // 生成期間比較報表
  async generatePeriodComparison(currentPeriod, previousPeriod) {
    try {
      const currentReport = await this.getSalesReport(currentPeriod);
      const previousReport = await this.getSalesReport(previousPeriod);

      const comparison = {
        current: currentReport.summary,
        previous: previousReport.summary,
        growth: {}
      };

      // 計算成長率
      Object.keys(currentReport.summary).forEach(key => {
        const current = currentReport.summary[key] || 0;
        const previous = previousReport.summary[key] || 0;
        
        if (previous === 0) {
          comparison.growth[key] = current > 0 ? 100 : 0;
        } else {
          comparison.growth[key] = ((current - previous) / previous) * 100;
        }
      });

      return comparison;
    } catch (error) {
      console.error('生成期間比較報表失敗:', error);
      throw error;
    }
  }

  // 根據 ID 獲取單一變體資訊
  async getVariantById(variantId) {
    try {
      const response = await this.notion.pages.retrieve({
        page_id: variantId
      });
      return this.transformVariantData(response);
    } catch (error) {
      console.error('獲取變體資訊失敗:', error);
      return null;
    }
  }

  // 轉換主商品資料格式
  transformProductData(page) {
    const properties = page.properties;
    return {
      id: page.id,
      name: properties['商品名稱']?.title?.[0]?.plain_text || '',
      productCode: properties['商品編號']?.rich_text?.[0]?.plain_text || '',
      mainCategory: properties['主分類']?.select?.name || '',
      subCategory: properties['子分類']?.multi_select?.map(item => item.name) || [],
      status: properties['狀態']?.select?.name || '',
      imageUrl: properties['商品圖片']?.files?.[0]?.file?.url || null,
      createdAt: page.created_time
    };
  }
}

module.exports = new NotionService(); 