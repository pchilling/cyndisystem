const NotionService = require('./notionService');

class CustomerService {
  constructor() {
    // 使用 Map 來存儲用戶數據
    this.customers = new Map();
    this.shoppingCarts = new Map(); // 購物車資料
    this.interactions = new Map();
    this.userStates = new Map(); // 用戶狀態
    this.shippingInfo = new Map(); // 收件資訊
    this.paymentInfo = new Map(); // 付款資訊
    this.tempCustomerData = new Map(); // 暫存客戶資料
    this.searchModes = new Map(); // 搜尋模式開關
  }

  // 搜尋模式控制
  enableSearchMode(userId) {
    this.searchModes.set(userId, true);
  }

  disableSearchMode(userId) {
    this.searchModes.set(userId, false);
  }

  isSearchMode(userId) {
    return this.searchModes.get(userId) === true;
  }

  // 購物車相關方法

  // 獲取用戶購物車
  async getShoppingCart(userId) {
    try {
      if (!this.shoppingCarts.has(userId)) {
        this.shoppingCarts.set(userId, []);
      }
      
      const cart = this.shoppingCarts.get(userId);
      console.log(`獲取用戶 ${userId} 的購物車:`, cart);
      
      return cart;
    } catch (error) {
      console.error('獲取購物車失敗:', error);
      return [];
    }
  }

  // 加入商品到購物車
  async addToCart(userId, { productId, variantId, quantity = 1, productName, variantName, price, color, size }) {
    try {
      if (!this.shoppingCarts.has(userId)) {
        this.shoppingCarts.set(userId, []);
      }

      const cart = this.shoppingCarts.get(userId);
      
      // 檢查是否已存在相同變體
      const existingItemIndex = cart.findIndex(item => 
        item.productId === productId && item.variantId === variantId
      );

      if (existingItemIndex >= 0) {
        // 如果已存在，增加數量並重新計算小計
        cart[existingItemIndex].quantity += quantity;
        cart[existingItemIndex].subtotal = cart[existingItemIndex].price * cart[existingItemIndex].quantity;
        console.log(`更新購物車項目數量: ${cart[existingItemIndex].quantity}, 小計: ${cart[existingItemIndex].subtotal}`);
      } else {
        // 新增項目
        const cartItem = {
          id: Date.now().toString(), // 簡單的 ID 生成
          productId,
          variantId,
          productName,
          variantName,
          price,
          color,
          size,
          quantity,
          addedAt: new Date().toISOString(),
          subtotal: price * quantity
        };
        
        cart.push(cartItem);
        console.log(`新增購物車項目:`, cartItem);
      }

      this.shoppingCarts.set(userId, cart);
      
      return {
        success: true,
        cart: cart,
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: cart.reduce((sum, item) => sum + item.subtotal, 0)
      };

    } catch (error) {
      console.error('加入購物車失敗:', error);
      throw error;
    }
  }

  // 更新購物車項目數量
  async updateCartItemQuantity(userId, itemId, quantity) {
    try {
      if (!this.shoppingCarts.has(userId)) {
        return { success: false, message: '購物車不存在' };
      }

      const cart = this.shoppingCarts.get(userId);
      const itemIndex = cart.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        return { success: false, message: '商品不存在於購物車中' };
      }

      if (quantity <= 0) {
        // 數量為 0 或負數時移除項目
        cart.splice(itemIndex, 1);
        console.log(`移除購物車項目: ${itemId}`);
      } else {
        // 更新數量和小計
        cart[itemIndex].quantity = quantity;
        cart[itemIndex].subtotal = cart[itemIndex].price * quantity;
        console.log(`更新購物車項目數量: ${itemId} -> ${quantity}`);
      }

      this.shoppingCarts.set(userId, cart);

      return {
        success: true,
        cart: cart,
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: cart.reduce((sum, item) => sum + item.subtotal, 0)
      };

    } catch (error) {
      console.error('更新購物車項目失敗:', error);
      throw error;
    }
  }

  // 從購物車移除項目
  async removeFromCart(userId, itemId) {
    try {
      if (!this.shoppingCarts.has(userId)) {
        return { success: false, message: '購物車不存在' };
      }

      const cart = this.shoppingCarts.get(userId);
      const itemIndex = cart.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        return { success: false, message: '商品不存在於購物車中' };
      }

      const removedItem = cart.splice(itemIndex, 1)[0];
      this.shoppingCarts.set(userId, cart);

      console.log(`從購物車移除項目:`, removedItem);

      return {
        success: true,
        removedItem: removedItem,
        cart: cart,
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: cart.reduce((sum, item) => sum + item.subtotal, 0)
      };

    } catch (error) {
      console.error('移除購物車項目失敗:', error);
      throw error;
    }
  }

  // 清空購物車
  async clearCart(userId) {
    try {
      this.shoppingCarts.set(userId, []);
      console.log(`清空用戶 ${userId} 的購物車`);

      return {
        success: true,
        message: '購物車已清空',
        cart: [],
        totalItems: 0,
        totalAmount: 0
      };

    } catch (error) {
      console.error('清空購物車失敗:', error);
      throw error;
    }
  }

  // 計算購物車統計資訊
  async getCartSummary(userId) {
    try {
      const cart = await this.getShoppingCart(userId);
      
      const summary = {
        items: cart,
        totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: cart.reduce((sum, item) => sum + item.subtotal, 0),
        itemCount: cart.length
      };

      // 計算運費（簡單邏輯）
      summary.shippingFee = summary.totalAmount >= 1000 ? 0 : 60; // 滿千免運
      summary.finalAmount = summary.totalAmount + summary.shippingFee;

      console.log(`購物車統計 (用戶 ${userId}):`, summary);

      return summary;

    } catch (error) {
      console.error('計算購物車統計失敗:', error);
      throw error;
    }
  }

  // 驗證購物車
  async validateCart(userId) {
    try {
      const cart = await this.getShoppingCart(userId);
      
      if (!cart || cart.length === 0) {
        return { valid: false, message: '購物車是空的' };
      }

      // 這裡可以加入更多驗證邏輯
      // 例如：檢查商品是否還有庫存、價格是否有變動等

      return { valid: true, cart: cart };

    } catch (error) {
      console.error('驗證購物車失敗:', error);
      return { valid: false, message: '購物車驗證失敗' };
    }
  }

  // 處理文字輸入
  async handleTextInput(userId, text) {
    const state = await this.getUserState(userId);
    
    if (!state) {
      return null;
    }

    switch (state) {
      case 'waiting_for_name': {
        // 儲存客戶姓名
        const name = text.trim();
        if (!name || name.length < 2) {
          return {
            success: false,
            message: '請輸入有效的姓名（至少2個字元）'
          };
        }

        // 暫存姓名
        await this.setTempCustomerData(userId, { name });
        await this.setUserState(userId, 'waiting_for_phone');

        return {
          success: true,
          action: 'ask_for_phone',
          data: { name }
        };
      }

      case 'waiting_for_phone': {
        // 儲存客戶電話
        const phone = text.trim();
        // 簡單的電話號碼驗證
        if (!phone || !/^[\d\-\+\(\)\s]{8,15}$/.test(phone)) {
          return {
            success: false,
            message: '請輸入有效的電話號碼（8-15位數字）'
          };
        }

        // 取得暫存的客戶資料
        const tempData = await this.getTempCustomerData(userId);
        if (!tempData || !tempData.name) {
          return {
            success: false,
            message: '資料遺失，請重新開始'
          };
        }

        // 建立或更新客戶資料
        const customerData = {
          lineId: userId,
          name: tempData.name,
          phone: phone,
          level: '一般會員'
        };

        await this.saveCustomerData(userId, customerData);
        await this.clearTempCustomerData(userId);
        await this.clearUserState(userId);

        return {
          success: true,
          action: 'customer_data_completed',
          data: { name: tempData.name, phone }
        };
      }

      case 'waiting_shipping_info': {
        // 解析姓名和電話
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length !== 2) {
          return {
            success: false,
            message: '請依照格式輸入收件人姓名和聯絡電話。'
          };
        }

        const [name, phone] = lines;
        await this.setShippingInfo(userId, { name, phone });
        await this.clearUserState(userId);

        return {
          success: true,
          action: 'show_delivery_selection'
        };
      }

      case 'waiting_address': {
        await this.setShippingAddress(userId, text);
        await this.clearUserState(userId);

        return {
          success: true,
          action: 'show_order_preview'
        };
      }

      case 'waiting_store_info': {
        await this.setShippingAddress(userId, text);
        await this.clearUserState(userId);

        return {
          success: true,
          action: 'show_order_preview'
        };
      }

      case 'waiting_payment': {
        // 驗證轉帳後5碼
        const bankCode = text.trim();
        if (!/^\d{5}$/.test(bankCode)) {
          return {
            success: false,
            message: '請輸入正確的帳號後5碼。'
          };
        }

        await this.clearUserState(userId);
        return {
          success: true,
          action: 'confirm_payment',
          bankCode
        };
      }

      default:
        return null;
    }
  }

  // 原有的其他方法保持不變
  
  // 記錄客戶互動
  async recordInteraction(userId, message) {
    if (!this.interactions.has(userId)) {
      this.interactions.set(userId, []);
    }
    
    const userInteractions = this.interactions.get(userId);
    userInteractions.push({
      timestamp: new Date(),
      message: message,
      type: 'text'
    });
    
    console.log(`記錄客戶 ${userId} 互動: ${message}`);
  }

  // 新增客戶
  async addNewCustomer(userId, profile = null) {
    const customer = {
      userId: userId,
      profile: profile,
      joinDate: new Date(),
      interactions: [],
      orders: []
    };
    
    this.customers.set(userId, customer);
    console.log(`新增客戶: ${userId}`);
    
    return customer;
  }

  // 建立訂單（未來會整合到 Notion）
  async createOrder(userId, orderData) {
    try {
      const cart = await this.getShoppingCart(userId);
      
      if (cart.length === 0) {
        throw new Error('購物車是空的，無法建立訂單');
      }

      const order = {
        id: `ORDER-${Date.now()}`,
        userId: userId,
        items: cart,
        customerInfo: orderData.customerInfo,
        totalAmount: orderData.totalAmount,
        createdAt: new Date(),
        status: 'pending'
      };

      // 訂單建立後清空購物車
      await this.clearCart(userId);

      console.log(`建立訂單:`, order);
      
      return order;

    } catch (error) {
      console.error('建立訂單失敗:', error);
      throw error;
    }
  }

  // 獲取客戶訂單
  async getCustomerOrders(userId) {
    // 這裡暫時回傳空陣列，未來會從 Notion 查詢
    return [];
  }

  // 獲取最新訂單ID（暫時實作）
  async getLatestOrderId(userId) {
    // 暫時使用時間戳作為訂單ID
    return `ORDER-${Date.now()}`;
  }

  // 獲取最新訂單金額（暫時實作）  
  async getLatestOrderAmount(userId) {
    const cartSummary = await this.getCartSummary(userId);
    return cartSummary.finalAmount;
  }

  // 用戶狀態管理
  // 設置用戶狀態
  async setUserState(userId, state) {
    this.userStates.set(userId, state);
  }

  // 獲取用戶狀態
  async getUserState(userId) {
    return this.userStates.get(userId) || null;
  }

  // 清除用戶狀態
  async clearUserState(userId) {
    this.userStates.delete(userId);
  }

  // 設置收件資訊
  async setShippingInfo(userId, info) {
    this.shippingInfo.set(userId, info);
  }

  // 獲取收件資訊
  async getShippingInfo(userId) {
    return this.shippingInfo.get(userId) || null;
  }

  // 設置配送方式
  async setDeliveryMethod(userId, method) {
    const info = this.shippingInfo.get(userId) || {};
    info.deliveryMethod = method;
    this.shippingInfo.set(userId, info);
  }

  // 設置收件地址
  async setShippingAddress(userId, address) {
    const info = this.shippingInfo.get(userId) || {};
    info.address = address;
    this.shippingInfo.set(userId, info);
  }

  // 設置付款方式
  async setPaymentMethod(userId, method) {
    this.paymentInfo.set(userId, { method });
  }

  // 獲取付款方式
  async getPaymentMethod(userId) {
    const info = this.paymentInfo.get(userId);
    return info ? info.method : null;
  }

  // 清除結帳相關資訊
  async clearCheckoutInfo(userId) {
    this.userStates.delete(userId);
    this.shippingInfo.delete(userId);
    this.paymentInfo.delete(userId);
  }

  // 暫存客戶資料管理
  async setTempCustomerData(userId, data) {
    this.tempCustomerData.set(userId, data);
  }

  async getTempCustomerData(userId) {
    return this.tempCustomerData.get(userId);
  }

  async clearTempCustomerData(userId) {
    this.tempCustomerData.delete(userId);
  }

  // 保存客戶資料到 Notion
  async saveCustomerData(userId, customerData) {
    try {
      // 檢查是否已存在客戶
      const existingCustomer = await NotionService.getCustomerByLineId(userId);
      
      if (existingCustomer) {
        // 更新現有客戶
        await NotionService.updateCustomer(existingCustomer.id, customerData);
      } else {
        // 建立新客戶
        await NotionService.createCustomer(customerData);
      }
    } catch (error) {
      console.error('保存客戶資料失敗:', error);
      throw error;
    }
  }
}

module.exports = new CustomerService(); 