const CustomerService = require('../services/customerService');
const FlexMessages = require('../templates/flexMessages');
const NotifyService = require('../services/notifyService');
const FlexShoppingService = require('../services/flexShoppingService');
const NotionService = require('../services/notionService');
const FastProductService = require('../services/fastProductService');
const ProductFlowService = require('../services/productFlowService');
const QuickReplies = require('../templates/quickReplies');
const ShipmentService = require('../services/shipmentService'); // Added ShipmentService

class PostbackHandler {
  // 處理所有 Postback 事件
  static async handlePostback(client, event) {
    const { userId } = event.source;
    
    // 解析 postback data，支援 URL 查詢參數格式
    let postbackData;
    try {
      // 嘗試 JSON 格式
      postbackData = JSON.parse(event.postback.data);
    } catch (error) {
      // 嘗試 URL 查詢參數格式
      const params = new URLSearchParams(event.postback.data);
      postbackData = Object.fromEntries(params);
    }
    
    const { action, category } = postbackData;
    
    console.log(`用戶 ${userId} 執行動作: ${action}`, postbackData);
    
    try {
      switch (action) {
        case 'add_to_cart':
          await this.addToCart(client, event, postbackData);
          break;
          
        case 'remove_from_cart':
          await this.removeFromCart(client, event, postbackData);
          break;
          
        case 'view_cart':
          await this.viewCart(client, event);
          break;

        case 'view_my_orders':
          await this.viewMyOrders(client, event);
          break;

        case 'confirm_payment':
          await this.confirmPayment(client, event);
          break;

        case 'view_shipment':
          await this.viewShipmentDetails(client, event);
          break;

        case 'view_order_detail':
          await this.viewOrderDetail(client, event);
          break;
          
        case 'clear_cart':
          await this.clearCart(client, event);
          break;
          
        case 'confirm_order':
          await this.confirmOrder(client, event, postbackData);
          break;
          
        case 'select_size':
          await this.selectSize(client, event, postbackData);
          break;
          
        case 'select_quantity':
          await this.selectQuantity(client, event, postbackData);
          break;
          
        case 'submit_order':
          await this.submitOrder(client, event, postbackData);
          break;
          
        case 'cancel_order':
          await this.cancelOrder(client, event, postbackData);
          break;
          
        case 'view_product_detail':
          await this.viewProductDetail(client, event, postbackData);
          break;
          
        case 'open_liff':
          await this.openLiff(client, event);
          break;

        // 新的 Flex Shopping 功能
        case 'show_categories':
          await this.showCategories(client, event);
          break;

        case 'view_product':
          await this.viewProduct(client, event, postbackData);
          break;

        case 'increase_quantity':
          await this.increaseQuantity(client, event, postbackData);
          break;

        case 'decrease_quantity':
          await this.decreaseQuantity(client, event, postbackData);
          break;

        case 'remove_item':
          await this.removeItem(client, event, postbackData);
          break;

        case 'edit_customer_info':
          await this.editCustomerInfo(client, event);
          break;

        // 新的兩層式選擇流程
        case 'select_product':
          await this.selectProduct(client, event, postbackData);
          break;

        case 'select_variant_details':
          await this.selectVariantDetails(client, event, postbackData);
          break;

        case 'search_products':
          await this.searchProducts(client, event);
          break;

        case 'merge_order':
          await this.mergeOrder(client, event);
          break;

        case 'checkout':
          await this.startCheckout(client, event);
          break;

        case 'input_shipping_info':
        case 'confirm_shipping_info':
          await this.handleShippingInfo(client, event, postbackData);
          break;

        case 'select_delivery':
          await this.handleDeliveryMethod(client, event, postbackData);
          break;

        case 'select_payment':
          if (postbackData.method) {
            await this.handlePaymentMethod(client, event, postbackData);
          } else {
            const paymentSelection = FlexMessages.createPaymentMethodSelection();
            await client.replyMessage(event.replyToken, paymentSelection);
          }
          break;

        case 'back_to_shipping':
          await this.startCheckout(client, event);
          break;

        case 'back_to_preview':
          await this.showOrderPreview(client, event);
          break;

        case 'edit_order_info':
          await this.startCheckout(client, event);
          break;
          
        default:
          // 處理分類選擇
          if (postbackData.category) {
            await this.showCategoryProducts(client, event, postbackData);
          } else {
            console.log('未知的 Postback 動作:', action);
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '操作無法識別，請重新嘗試。'
            });
          }
      }
      
    } catch (error) {
      console.error('處理 Postback 事件時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '操作時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 加入購物車
  static async addToCart(client, event, data) {
    const { userId } = event.source;
    const { productId, variantId } = data;
    
    try {
      // 從 Notion 獲取商品詳細資訊
      const variantData = await NotionService.getVariantById(variantId || productId);
      
      if (!variantData) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '找不到商品資訊，請重新選擇。'
        });
        return;
      }

      await CustomerService.addToCart(userId, {
        productId: productId,
        variantId: variantId || productId,
        quantity: 1,
        productName: variantData.name,
        variantName: variantData.name,
        price: variantData.price,
        color: variantData.color,
        size: variantData.size
      });

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ 已將 ${variantData.name} (${variantData.color} ${variantData.size}) 加入購物車！`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '🛒 查看購物車',
                data: 'action=view_cart'
              }
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '🛍️ 繼續購物',
                data: 'action=show_categories'
              }
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '🛒 送出訂單',
                data: 'action=merge_order'
              }
            }
          ]
        }
      });
      
    } catch (error) {
      console.error('加入購物車時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '加入購物車時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 查看購物車
  static async viewCart(client, event) {
    const { userId } = event.source;
    
    try {
      const cart = await CustomerService.getShoppingCart(userId);
      const cartSummary = await CustomerService.getCartSummary(userId);
      
      // 使用新的購物車 Flex Message
      const cartView = FlexShoppingService.createCartView(cart, cartSummary.totalAmount);
      
      await client.replyMessage(event.replyToken, cartView);
      
    } catch (error) {
      console.error('查看購物車時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '查看購物清單時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 從購物車移除商品
  static async removeFromCart(client, event, data) {
    const { userId } = event.source;
    const { productId, productName } = data;
    
    try {
      await CustomerService.removeFromCart(userId, productId);
      
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `✅ 已從購物清單移除 ${productName}`
      });
      
    } catch (error) {
      console.error('從購物車移除商品時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '移除商品時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 清空購物車
  static async clearCart(client, event) {
    const { userId } = event.source;
    
    try {
      await CustomerService.clearCart(userId);
      
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '✅ 購物清單已清空！'
      });
      
    } catch (error) {
      console.error('清空購物車時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '清空購物清單時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 送出訂單
  static async submitOrder(client, event, data) {
    const { userId } = event.source;
    const { customerInfo } = data;
    
    try {
      const cart = await CustomerService.getShoppingCart(userId);
      
      if (!cart || cart.length === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '購物清單是空的，無法送出訂單。'
        });
        return;
      }
      
      // 建立訂單
      const order = await CustomerService.createOrder(userId, {
        items: cart,
        customerInfo,
        totalAmount: cart.reduce((sum, item) => sum + item.price, 0)
      });
      
      // 清空購物車
      await CustomerService.clearCart(userId);
      
      // 發送確認訊息
      const orderConfirmation = FlexMessages.createOrderConfirmation(order);
      
      await client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '✅ 訂單已成功送出！'
        },
        {
          type: 'flex',
          altText: '訂單確認',
          contents: orderConfirmation
        }
      ]);
      
      // 通知管理員
      await NotifyService.notifyNewOrder(order);
      
    } catch (error) {
      console.error('送出訂單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '送出訂單時發生錯誤，請重新嘗試。'
      });
    }
  }
  
  // 開啟 LIFF
  static async openLiff(client, event) {
    const liffUrl = `https://liff.line.me/${process.env.LIFF_ID}`;
    
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🛍️ 點擊下方連結開啟選購頁面：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: '開啟選購頁面',
              uri: liffUrl
            }
          }
        ]
      }
    });
  }
  // ==================== 新的 Flex Shopping 方法 ====================

  // 顯示商品分類選單
  static async showCategories(client, event) {
    try {
      const categoryMenu = FlexShoppingService.createCategoryMenu();
      await client.replyMessage(event.replyToken, categoryMenu);
    } catch (error) {
      console.error('顯示分類選單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '顯示分類選單時發生錯誤，請稍後再試。'
      });
    }
  }

  // 顯示分類商品（使用新的兩層式流程）
  static async showCategoryProducts(client, event, data) {
    try {
      const { category, page = 1 } = data;
      
      // 立即發送"正在查詢"訊息，提升用戶體驗
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `🔍 正在查詢${FlexShoppingService.getCategoryName(category)}...`
      });
      
      console.log(`⚡ 查詢主商品分類: ${category}`);
      
      // 使用新的兩層式查詢：先查詢主商品
      const productsResult = await ProductFlowService.getCachedMainProducts(category);
      const products = productsResult.products;

      if (products.length === 0) {
        await client.pushMessage(event.source.userId, {
          type: 'text',
          text: `很抱歉，${FlexShoppingService.getCategoryName(category)} 目前沒有商品，請選擇其他分類。`
        });
        return;
      }

      // 使用新的主商品輪播
      const productCarousel = ProductFlowService.createMainProductCarousel(products, category);
      
      // 創建導航快速回覆
      const navigationQuickReply = QuickReplies.createNavigationQuickReply();
      
      // 檢查是否在群組中
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      
      // 先發送商品輪播，再發送帶有快速回覆的訊息
      await client.pushMessage(targetId, productCarousel);
      await client.pushMessage(targetId, navigationQuickReply);
      
    } catch (error) {
      console.error('顯示分類商品時發生錯誤:', error);
      
      // 檢查是否在群組中
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, {
        type: 'text',
        text: '顯示商品時發生錯誤，請稍後再試。'
      });
    }
  }

  // 查看商品詳情
  static async viewProduct(client, event, data) {
    try {
      const { productId } = data;
      // 這裡可以實現商品詳情顯示
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `商品詳情功能開發中，商品ID: ${productId}`
      });
    } catch (error) {
      console.error('查看商品詳情時發生錯誤:', error);
    }
  }

  // 增加購物車商品數量
  static async increaseQuantity(client, event, data) {
    try {
      const { userId } = event.source;
      const { itemId } = data;
      
      // 獲取當前購物車
      const cart = await CustomerService.getShoppingCart(userId);
      const item = cart.find(item => item.id === itemId);
      
      if (item) {
        await CustomerService.updateCartItemQuantity(userId, itemId, item.quantity + 1);
        
        // 重新顯示購物車
        await this.viewCart(client, event);
      }
    } catch (error) {
      console.error('增加商品數量時發生錯誤:', error);
    }
  }

  // 減少購物車商品數量
  static async decreaseQuantity(client, event, data) {
    try {
      const { userId } = event.source;
      const { itemId } = data;
      
      // 獲取當前購物車
      const cart = await CustomerService.getShoppingCart(userId);
      const item = cart.find(item => item.id === itemId);
      
      if (item) {
        if (item.quantity > 1) {
          await CustomerService.updateCartItemQuantity(userId, itemId, item.quantity - 1);
        } else {
          await CustomerService.removeFromCart(userId, itemId);
        }
        
        // 重新顯示購物車
        await this.viewCart(client, event);
      }
    } catch (error) {
      console.error('減少商品數量時發生錯誤:', error);
    }
  }

  // 移除購物車商品
  static async removeItem(client, event, data) {
    try {
      const { userId } = event.source;
      const { itemId } = data;
      
      await CustomerService.removeFromCart(userId, itemId);
      
      // 重新顯示購物車
      await this.viewCart(client, event);
    } catch (error) {
      console.error('移除商品時發生錯誤:', error);
    }
  }

  // 編輯客戶資訊
  static async editCustomerInfo(client, event) {
    try {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請提供您的收件資訊：\n格式：姓名|電話|地址\n例如：王小明|0912345678|台北市信義區忠孝東路1號'
      });
    } catch (error) {
      console.error('編輯客戶資訊時發生錯誤:', error);
    }
  }

  // 重寫 viewCart 方法使用新的 Flex Message
  static async viewCart(client, event) {
    try {
      const { userId } = event.source;
      const cartSummary = await CustomerService.getCartSummary(userId);
      
      const cartView = FlexShoppingService.createCartView(
        cartSummary.items, 
        cartSummary.totalAmount
      );
      
      await client.replyMessage(event.replyToken, cartView);
    } catch (error) {
      console.error('查看購物車時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '查看購物車時發生錯誤，請稍後再試。'
      });
    }
  }

  // ==================== 新的兩層式選擇方法 ====================

  // 第二步：選擇主商品後，顯示其變體款式
  static async selectProduct(client, event, data) {
    try {
      const { productId } = data;
      
      // 立即回應
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🎨 正在載入款式選項...'
      });

      // 獲取商品資訊
      const productData = await NotionService.notion.pages.retrieve({ page_id: productId });
      const product = NotionService.transformProductData(productData);

      // 獲取該商品的所有變體
      const variants = await ProductFlowService.getCachedVariants(productId);

      if (variants.length === 0) {
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
          type: 'text',
          text: '很抱歉，此商品目前沒有可選的款式規格。'
        });
        return;
      }

      // 創建變體選擇輪播
      const variantCarousel = ProductFlowService.createVariantSelectionCarousel(product.name, variants);
      
      // 創建導航快速回覆
      const navigationQuickReply = QuickReplies.createNavigationQuickReply();
      
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, variantCarousel);
      await client.pushMessage(targetId, navigationQuickReply);

    } catch (error) {
      console.error('選擇商品時發生錯誤:', error);
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, {
        type: 'text',
        text: '選擇商品時發生錯誤，請稍後再試。'
      });
    }
  }

  // 第三步：選擇具體的顏色和尺寸
  static async selectVariantDetails(client, event, data) {
    try {
      const { productId, style } = data;
      
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🎯 正在載入顏色和尺寸選項...'
      });

      // 獲取該款式的所有變體
      const allVariants = await ProductFlowService.getCachedVariants(productId);
      const styleVariants = allVariants.filter(v => v.style === decodeURIComponent(style));

      if (styleVariants.length === 0) {
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
          type: 'text',
          text: '很抱歉，此款式目前沒有可選的規格。'
        });
        return;
      }

      // 創建具體變體選擇的 Flex Message
      const detailSelectionMessage = this.createVariantDetailSelection(styleVariants);
      
      // 創建導航快速回覆  
      const navigationQuickReply = QuickReplies.createNavigationQuickReply();
      
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, detailSelectionMessage);
      await client.pushMessage(targetId, navigationQuickReply);

    } catch (error) {
      console.error('選擇變體詳情時發生錯誤:', error);
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, {
        type: 'text',
        text: '選擇規格時發生錯誤，請稍後再試。'
      });
    }
  }



  // 創建具體變體選擇的 Flex Message
  static createVariantDetailSelection(variants) {
    const bubbles = variants.map(variant => ({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: variant.name,
            wrap: true,
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '顏色:',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: variant.color || '預設',
                size: 'sm',
                flex: 2,
                color: '#FBF1CE'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '尺寸:',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: variant.size || 'One Size',
                size: 'sm',
                flex: 2,
                color: '#FBF1CE'
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '價格:',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: `$${variant.price}`,
                size: 'lg',
                flex: 2,
                color: '#FBF1CE',
                weight: 'bold'
              }
            ]
          },
          {
            type: 'text',
            text: variant.status === '可訂購' ? '✅ 現貨可訂' : '❌ 暫時缺貨',
            size: 'xs',
            color: variant.status === '可訂購' ? '#00AA00' : '#FF5551'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: variant.status === '可訂購' ? '🛒 加入購物車' : '❌ 暫時缺貨',
              data: `action=add_to_cart&productId=${variant.productId}&variantId=${variant.id}`
            },
            color: variant.status === '可訂購' ? '#FBF1CE' : '#AAAAAA'
          }
        ]
      }
    }));

    return {
      type: 'flex',
      altText: '選擇顏色和尺寸',
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  }

  // ==================== 搜尋功能 ====================

  // 搜尋商品
  static async searchProducts(client, event) {
    try {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🔍 請輸入您要搜尋的商品關鍵字：\n\n例如：\n• 商品名稱：「荷葉邊」\n• 顏色：「粉紅」\n• 尺寸：「M」\n• 款式：「洋裝」\n\n輸入後我會為您搜尋相關商品！',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: '🔙 返回分類選單',
                text: '我要下單'
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('搜尋商品時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '搜尋功能暫時無法使用，請稍後再試。'
      });
    }
  }

  // 開始結帳流程
  static async startCheckout(client, event) {
    try {
      const { userId } = event.source;
      
      // 驗證購物車
      const cartValidation = await CustomerService.validateCart(userId);
      if (!cartValidation.valid) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: cartValidation.message
        });
        return;
      }

      // 檢查是否為既有客戶
      const customer = await NotionService.getCustomerByLineId(userId);
      
      // 顯示收件資訊表單
      const shippingForm = FlexMessages.createShippingForm(customer ? {
        name: customer.name,
        phone: customer.phone
      } : null);

      await client.replyMessage(event.replyToken, shippingForm);

    } catch (error) {
      console.error('開始結帳時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '開始結帳時發生錯誤，請稍後再試。'
      });
    }
  }

  // 處理收件資訊輸入
  static async handleShippingInfo(client, event, data) {
    try {
      const { userId } = event.source;
      
      if (data.action === 'input_shipping_info') {
        // 顯示輸入提示
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '請依序輸入以下資訊：\n1. 收件人姓名\n2. 聯絡電話\n\n範例：\n王小明\n0912345678'
        });
        
        // 設定用戶狀態為等待輸入收件資訊
        await CustomerService.setUserState(userId, 'waiting_shipping_info');
        
      } else if (data.action === 'confirm_shipping_info') {
        // 儲存收件資訊
        await CustomerService.setShippingInfo(userId, {
          name: data.name,
          phone: data.phone
        });
        
        // 顯示配送方式選擇
        const deliverySelection = FlexMessages.createDeliveryMethodSelection();
        await client.replyMessage(event.replyToken, deliverySelection);
      }
      
    } catch (error) {
      console.error('處理收件資訊時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '處理收件資訊時發生錯誤，請稍後再試。'
      });
    }
  }

  // 處理配送方式選擇
  static async handleDeliveryMethod(client, event, data) {
    try {
      const { userId } = event.source;
      const { method } = data;
      
      // 儲存配送方式
      await CustomerService.setDeliveryMethod(userId, method);
      
      if (method === 'home') {
        // 宅配到府 - 請求輸入地址
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '請輸入完整收件地址：\n\n範例：\n台北市信義區信義路五段7號'
        });
        
        await CustomerService.setUserState(userId, 'waiting_address');
        
      } else {
        // 超商取貨 - 顯示選擇門市提示
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '請將欲寄送的門市資訊複製後傳送給我：\n\n範例：\n全家 北市府店 FamilyMart\n台北市信義區市府路1號'
        });
        
        await CustomerService.setUserState(userId, 'waiting_store_info');
      }
      
    } catch (error) {
      console.error('處理配送方式時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '處理配送方式時發生錯誤，請稍後再試。'
      });
    }
  }

  // 顯示訂單預覽
  static async showOrderPreview(client, event) {
    try {
      const { userId } = event.source;
      
      // 獲取購物車資訊
      const cart = await CustomerService.getShoppingCart(userId);
      const cartSummary = await CustomerService.getCartSummary(userId);
      
      // 獲取收件資訊
      const shippingInfo = await CustomerService.getShippingInfo(userId);
      
      // 建立訂單預覽資料
      const orderData = {
        items: cart,
        shippingInfo: shippingInfo,
        amount: {
          subtotal: cartSummary.totalAmount,
          shipping: cartSummary.shippingFee,
          total: cartSummary.finalAmount
        }
      };
      
      // 顯示訂單預覽
      const orderPreview = FlexMessages.createOrderPreview(orderData);
      await client.replyMessage(event.replyToken, orderPreview);
      
    } catch (error) {
      console.error('顯示訂單預覽時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '顯示訂單預覽時發生錯誤，請稍後再試。'
      });
    }
  }

  // 處理付款方式選擇
  static async handlePaymentMethod(client, event, data) {
    try {
      const { userId } = event.source;
      const { method } = data;
      
      // 儲存付款方式
      await CustomerService.setPaymentMethod(userId, method);
      
      if (method === 'bank') {
        // 顯示銀行帳號資訊
        await client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '請使用以下帳號進行轉帳：\n\n銀行：國泰世華\n帳號：1234-5678-9012-3456\n戶名：XXX\n\n完成轉帳後，請將帳號後5碼告訴我們。'
          },
          {
            type: 'text',
            text: '您的訂單將在確認付款後開始處理。'
          }
        ]);
        
        await CustomerService.setUserState(userId, 'waiting_payment');
        
      } else if (method === 'cod') {
        // 直接建立訂單
        await this.createOrder(client, event);
      }
      
    } catch (error) {
      console.error('處理付款方式時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '處理付款方式時發生錯誤，請稍後再試。'
      });
    }
  }

  // 建立訂單
  static async createOrder(client, event) {
    try {
      const { userId } = event.source;
      
      // 獲取所有訂單相關資訊
      const cart = await CustomerService.getShoppingCart(userId);
      const cartSummary = await CustomerService.getCartSummary(userId);
      const shippingInfo = await CustomerService.getShippingInfo(userId);
      const paymentMethod = await CustomerService.getPaymentMethod(userId);
      
      // 建立訂單
      const orderData = {
        userId,
        items: cart,
        customerInfo: shippingInfo,
        totalAmount: cartSummary.finalAmount,
        shippingFee: cartSummary.shippingFee,
        paymentMethod,
        status: paymentMethod === 'bank' ? 'pending_payment' : 'pending'
      };
      
      const order = await NotionService.createOrder(orderData);
      
      // 清空購物車
      await CustomerService.clearCart(userId);
      
      // 發送訂單確認
      const orderConfirmation = FlexMessages.createOrderConfirmation(order);
      await client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '🎉 訂單已成功建立！'
        },
        orderConfirmation
      ]);
      
      // 通知管理員
      await NotifyService.notifyNewOrder(order);
      
    } catch (error) {
      console.error('建立訂單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '建立訂單時發生錯誤，請稍後再試。'
      });
    }
  }

  // 加入併單
  static async mergeOrder(client, event) {
    try {
      const { userId } = event.source;
      
      // 驗證購物車
      const cartValidation = await CustomerService.validateCart(userId);
      if (!cartValidation.valid) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: cartValidation.message
        });
        return;
      }

      // 檢查是否為既有客戶
      console.log(`[DEBUG] 送出訂單 - userId: ${userId}`);
      let customer = await NotionService.getCustomerByLineId(userId);
      console.log(`[DEBUG] 既有客戶:`, customer);
      
      // 檢查客戶資料是否完整
      if (!customer || !customer.name || customer.name.includes('客戶-') || !customer.phone) {
        // 需要收集客戶資料
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '📝 在送出訂單前，請先填寫您的基本資料\n\n請輸入您的姓名：',
        });
        
        // 設定用戶狀態為等待姓名輸入
        CustomerService.setUserState(userId, 'waiting_for_name');
        return;
      }

      // 發送"正在處理"訊息
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🚀 正在送出訂單，請稍等...'
      });

      // 獲取購物車內容
      const cart = await CustomerService.getShoppingCart(userId);
      const cartSummary = await CustomerService.getCartSummary(userId);

      // 建立併單訂單
      const orderData = {
        customerId: customer.id,
        items: cart,
        totalAmount: cartSummary.totalAmount,
        shippingFee: cartSummary.shippingFee,
        finalAmount: cartSummary.finalAmount,
        status: '待併單',
        mergeStatus: '待併單',
        recipientName: customer.name || `客戶-${userId.slice(-4)}`,
        recipientPhone: customer.phone || '',
        deliveryMethod: '待確認',
        deliveryAddress: '待確認'
      };

      console.log(`[DEBUG] 建立訂單資料:`, orderData);
      const order = await NotionService.createOrder(orderData);
      console.log(`[DEBUG] 訂單已建立:`, order);

      // 建立訂單項目
      console.log(`[DEBUG] 建立訂單項目 - 購物車:`, cart);
      for (const item of cart) {
        const orderItemData = {
          orderId: order.id,
          variantId: item.variantId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          notes: `${item.style || ''} ${item.color || ''} ${item.size || ''}`.trim()
        };
        console.log(`[DEBUG] 建立訂單項目:`, orderItemData);
        await NotionService.createOrderItem(orderItemData);
      }

      // 清空購物車
      await CustomerService.clearCart(userId);

      // 發送確認訊息 (使用 pushMessage 因為 replyToken 已經被消費)
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, {
        type: 'text',
        text: `✅ 訂單已送出！\n\n訂單編號：${order.orderNumber}\n商品數量：${cart.length} 項\n金額：$${cartSummary.totalAmount}\n\n我們會在商品到齊後通知您付款。`,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '🛍️ 繼續購物',
                data: 'action=show_categories'
              }
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '📋 查看我的訂單',
                data: 'action=view_my_orders'
              }
            }
          ]
        }
      });

      // 通知管理員有新的併單
      await NotifyService.notifyNewOrder(order);

    } catch (error) {
      console.error('送出訂單時發生錯誤:', error);
      // 如果是在 replyToken 消費之後發生錯誤，使用 pushMessage
      try {
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
          type: 'text',
          text: '❌ 送出訂單時發生錯誤，請稍後再試。'
        });
      } catch (pushError) {
        // 如果 pushMessage 也失敗，嘗試使用 replyMessage (可能 replyToken 還沒被消費)
        try {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '❌ 送出訂單時發生錯誤，請稍後再試。'
          });
        } catch (replyError) {
          console.error('發送錯誤訊息失敗:', replyError);
        }
      }
    }
  }

  // 查看我的訂單
  static async viewMyOrders(client, event) {
    try {
      const { userId } = event.source;
      
      // 取得客戶資訊
      console.log(`[DEBUG] 查詢客戶訂單 - userId: ${userId}`);
      const customer = await NotionService.getCustomerByLineId(userId);
      console.log(`[DEBUG] 找到客戶:`, customer);
      
      if (!customer) {
        console.log(`[DEBUG] 找不到客戶資料 - userId: ${userId}`);
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '找不到您的客戶資料，請先下單後再查詢。'
        });
        return;
      }

      // 取得客戶的所有訂單
      console.log(`[DEBUG] 查詢訂單 - customerId: ${customer.id}`);
      const orders = await NotionService.getOrdersByCustomerId(customer.id);
      console.log(`[DEBUG] 找到訂單數量: ${orders.length}`);
      console.log(`[DEBUG] 訂單列表:`, orders);
      
      if (orders.length === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '您目前沒有任何訂單。',
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: '🛍️ 開始購物',
                  data: 'action=show_categories'
                }
              }
            ]
          }
        });
        return;
      }

      // 建立訂單列表 Flex Message
      const orderBubbles = orders.slice(0, 10).map(order => ({
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: order.orderNumber || `訂單 ${order.id.slice(-6)}`,
              weight: 'bold',
              size: 'md'
            },
            {
              type: 'text',
              text: this.getOrderStatusText(order.status, order.mergeStatus),
              size: 'sm',
              color: this.getOrderStatusColor(order.status, order.mergeStatus),
              margin: 'sm'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: '下單時間：',
                      color: '#666666',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: new Date(order.createdTime).toLocaleDateString('zh-TW'),
                      wrap: true,
                      color: '#333333',
                      size: 'sm',
                      flex: 4
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: '金額：',
                      color: '#666666',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: `$${order.totalAmount}`,
                      wrap: true,
                      color: '#ff6b6b',
                      size: 'sm',
                      weight: 'bold',
                      flex: 4
                    }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '查看詳情',
                data: `action=view_order_detail&orderId=${order.id}`
              }
            }
          ]
        }
      }));

      const message = {
        type: 'flex',
        altText: '我的訂單',
        contents: {
          type: 'carousel',
          contents: orderBubbles
        }
      };

      await client.replyMessage(event.replyToken, message);

    } catch (error) {
      console.error('查看訂單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '查看訂單時發生錯誤，請稍後再試。'
      });
    }
  }

  // 確認付款
  static async confirmPayment(client, event) {
    try {
      const postbackData = new URLSearchParams(event.postback.data);
      const shipmentId = postbackData.get('shipmentId');

      // 這裡可以引導客戶上傳轉帳截圖或填寫付款資訊
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請上傳您的轉帳截圖，或回傳「已付款」讓我們知道您已完成付款。\n\n我們會盡快為您確認並安排出貨。',
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'message',
                label: '✅ 已付款',
                text: `已付款 - 批次: ${shipmentId}`
              }
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: '📞 聯絡客服',
                data: 'action=contact_service'
              }
            }
          ]
        }
      });

    } catch (error) {
      console.error('確認付款時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '操作時發生錯誤，請稍後再試。'
      });
    }
  }

  // 查看出貨批次詳情
  static async viewShipmentDetails(client, event) {
    try {
      const postbackData = new URLSearchParams(event.postback.data);
      const shipmentId = postbackData.get('shipmentId');

      // 取得出貨批次資訊（這裡需要在 ShipmentService 中實作）
      const shipments = await ShipmentService.getAllShipments();
      const shipment = shipments.find(s => s.id === shipmentId);

      if (!shipment) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '找不到此出貨批次資訊。'
        });
        return;
      }

      const message = {
        type: 'flex',
        altText: '出貨批次詳情',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📦 出貨詳情',
                weight: 'bold',
                size: 'xl',
                color: '#ffffff'
              }
            ],
            backgroundColor: '#FBF1CE',
            paddingAll: 'lg'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: shipment.batchName,
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'text',
                text: `狀態：${shipment.status}`,
                size: 'sm',
                color: this.getShipmentStatusColor(shipment.status),
                margin: 'sm'
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '總金額：',
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `$${shipment.totalAmount + shipment.shippingFee}`,
                        wrap: true,
                        color: '#ff6b6b',
                        size: 'lg',
                        weight: 'bold',
                        flex: 5
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'text',
                        text: '運費：',
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `$${shipment.shippingFee}`,
                        wrap: true,
                        color: '#333333',
                        size: 'sm',
                        flex: 5
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      };

      await client.replyMessage(event.replyToken, message);

    } catch (error) {
      console.error('查看出貨詳情時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '查看詳情時發生錯誤，請稍後再試。'
      });
    }
  }

  // 查看訂單詳情
  static async viewOrderDetail(client, event) {
    try {
      const postbackData = new URLSearchParams(event.postback.data);
      const orderId = postbackData.get('orderId');

      console.log(`[DEBUG] 查看訂單詳情 - orderId: ${orderId}`);

      // 取得訂單資訊
      const orderResponse = await NotionService.notion.pages.retrieve({
        page_id: orderId
      });
      const order = NotionService.transformOrderData(orderResponse);
      console.log(`[DEBUG] 訂單資訊:`, order);

      // 取得訂單項目
      const orderItems = await NotionService.getOrderItemsForReport([orderId]);
      console.log(`[DEBUG] 訂單項目:`, orderItems);

      if (!order) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '找不到此訂單資訊。'
        });
        return;
      }

      // 建立簡化的訂單詳情訊息
      let detailText = `📋 訂單詳情\n\n`;
      detailText += `訂單編號：${order.orderNumber || `ORDER-${order.id.slice(-6)}`}\n`;
      detailText += `狀態：${this.getOrderStatusText(order.status, order.mergeStatus)}\n\n`;
      
      detailText += `📦 商品清單：\n`;
      if (orderItems && orderItems.length > 0) {
        orderItems.forEach((item, index) => {
          detailText += `${index + 1}. ${item.productName || '商品'}\n`;
          if (item.notes) {
            detailText += `   ${item.notes}\n`;
          }
          detailText += `   數量：${item.quantity} | 單價：$${item.unitPrice} | 小計：$${item.quantity * item.unitPrice}\n\n`;
        });
      } else {
        detailText += `此訂單沒有商品項目\n\n`;
      }
      
      detailText += `📋 訂單資訊：\n`;
      detailText += `下單時間：${new Date(order.createdAt).toLocaleString('zh-TW')}\n`;
      detailText += `收件人：${order.recipientName || '待確認'}\n`;
      detailText += `收件方式：${order.deliveryMethod || '待確認'}\n`;
      detailText += `總金額：$${order.totalAmount}`;

      const orderDetailMessage = {
        type: 'text',
        text: detailText
      };



      await client.replyMessage(event.replyToken, orderDetailMessage);

    } catch (error) {
      console.error('查看訂單詳情時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '查看訂單詳情時發生錯誤，請稍後再試。'
      });
    }
  }

  // 輔助方法：取得訂單狀態文字
  static getOrderStatusText(status, mergeStatus) {
    if (mergeStatus === '待併單') return '⏳ 等待商品到齊';
    if (mergeStatus === '已併單') return '📦 已分配批次';
    if (status === '待付款') return '💰 等待付款';
    if (status === '已付款') return '✅ 已付款';
    if (status === '配貨中') return '📋 配貨中';
    if (status === '已出貨') return '🚚 已出貨';
    if (status === '已完成') return '✨ 已完成';
    return status;
  }

  // 輔助方法：取得訂單狀態顏色
  static getOrderStatusColor(status, mergeStatus) {
    if (mergeStatus === '待併單') return '#FFA500';
    if (mergeStatus === '已併單') return '#4169E1';
    if (status === '待付款') return '#FF6B6B';
    if (status === '已付款') return '#4ECDC4';
    if (status === '配貨中') return '#45B7D1';
    if (status === '已出貨') return '#96CEB4';
    if (status === '已完成') return '#58C9B9';
    return '#666666';
  }

  // 輔助方法：取得出貨批次狀態顏色
  static getShipmentStatusColor(status) {
    if (status === '待付款') return '#FF6B6B';
    if (status === '已付款') return '#4ECDC4';
    if (status === '配貨中') return '#45B7D1';
    if (status === '已出貨') return '#96CEB4';
    if (status === '已完成') return '#58C9B9';
    return '#666666';
  }
}

module.exports = PostbackHandler; 