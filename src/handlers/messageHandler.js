const FlexMessages = require('../templates/flexMessages');
const QuickReplies = require('../templates/quickReplies');
const NotionService = require('../services/notionService');
const CustomerService = require('../services/customerService');
const FlexShoppingService = require('../services/flexShoppingService');
const ProductFlowService = require('../services/productFlowService');
const PostbackHandler = require('./postbackHandler'); // Added for PostbackHandler
const NotifyService = require('../services/notifyService'); // Added for NotifyService
const ShipmentService = require('../services/shipmentService'); // Added to handle shipment status

class MessageHandler {
  
  // 處理文字訊息
  static async handleTextMessage(client, event) {
    const { text } = event.message;
    const { userId } = event.source;
    
    console.log(`用戶 ${userId} 發送訊息: ${text}`);
    
    try {
      // 記錄客戶互動
      await CustomerService.recordInteraction(userId, text);

      // 付款關鍵字攔截（先於任何其他邏輯）
      const normalized = text.trim();
      const paidBatchMatch = normalized.match(/^已付款\s*(?:[-—]\s*批次[:：]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i);
      if (paidBatchMatch) {
        const shipmentId = paidBatchMatch[1];
        if (shipmentId) {
          try {
            await ShipmentService.updateShipmentStatus(shipmentId, '已付款');
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `✅ 已收到您的付款確認！\n批次：${shipmentId}\n我們將盡快安排出貨，感謝您。`
            });
          } catch (err) {
            console.error('更新出貨批次為已付款失敗:', err);
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '抱歉，處理您的付款確認時發生錯誤，請稍後再試或聯絡客服。'
            });
          }
        } else {
          // 沒帶批次 id，就導向原本的確認流程讓使用者點按鈕
          await PostbackHandler.handlePostback(client, {
            ...event,
            postback: { data: 'action=confirm_payment' }
          });
        }
        return;
      }

      // 檢查是否在特定狀態中
      const textInputResult = await CustomerService.handleTextInput(userId, text);
      if (textInputResult) {
        if (!textInputResult.success) {
          // 輸入格式錯誤，顯示錯誤訊息
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: textInputResult.message
          });
          return;
        }

        // 根據處理結果執行相應動作
        switch (textInputResult.action) {
          case 'ask_for_phone':
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `您好 ${textInputResult.data.name}！\n\n請輸入您的聯絡電話：`
            });
            break;

          case 'customer_data_completed':
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `✅ 客戶資料建立完成！\n\n姓名：${textInputResult.data.name}\n電話：${textInputResult.data.phone}\n\n現在可以送出訂單了，請再次點擊「送出訂單」按鈕。`,
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'postback',
                      label: '🛒 送出訂單',
                      data: 'action=merge_order'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'postback',
                      label: '🛍️ 繼續購物',
                      data: 'action=show_categories'
                    }
                  }
                ]
              }
            });
            break;

          case 'show_delivery_selection':
            const deliverySelection = FlexMessages.createDeliveryMethodSelection();
            await client.replyMessage(event.replyToken, deliverySelection);
            break;

          case 'show_order_preview':
            await PostbackHandler.showOrderPreview(client, event);
            break;

          case 'confirm_payment':
            // 更新訂單狀態為已付款（舊流程保留）
            await NotionService.updateOrderStatus(
              await CustomerService.getLatestOrderId(userId),
              'paid',
              `銀行轉帳（末5碼：${textInputResult.bankCode}）`
            );
            
            // 發送付款確認訊息
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '✅ 付款已確認！我們會盡快處理您的訂單。'
            });
            
            // 通知管理員
            await NotifyService.notifyPaymentReceived(
              await CustomerService.getLatestOrderId(userId),
              await CustomerService.getLatestOrderAmount(userId)
            );
            break;
        }
        return;
      }

      // 一般指令
      if (text === '我要下單') {
        // 進入購物，開啟搜尋模式（僅此時允許文字搜尋商品）
        CustomerService.enableSearchMode(userId);
        await this.showFlexShoppingMenu(client, event);
        return;
      }
      
      switch (text) {
        case '我要送出':
        case '送出訂單':
          await this.processOrder(client, event);
          break;
          
        case '查詢訂單':
        case '我的訂單':
          console.log(`[DEBUG] 處理查詢訂單指令 - userId: ${userId}`);
          await this.showOrderStatus(client, event);
          break;

        default:
          // 只有在「正在逛商品」的情境才開放文字搜尋
          if (!CustomerService.isSearchMode(userId)) {
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '要搜尋商品，請先輸入「我要下單」開啟購物選單喔！'
            });
            break;
          }
          // 沒命中任何關鍵字，才進商品搜尋
          const searchResults = await this.handleProductSearch(client, event, text);
          if (!searchResults) {
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '目前找不到相關結果，您可以輸入關鍵字搜尋商品，或輸入「我的訂單」。'
            });
          }
          break;
      }
    } catch (error) {
      console.error('處理文字訊息時發生錯誤:', error);
    }
  }

  // 顯示 LIFF 購物頁面
  static async showLiffShoppingPage(client, event) {
    try {
      const flexMessage = {
        type: 'flex',
        altText: '商品選購頁面',
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🛍️ Cyndi 韓國童裝',
                weight: 'bold',
                size: 'xl',
                color: '#FBF1CE',
                align: 'center'
              },
              {
                type: 'text',
                text: '精選韓國童裝商品',
                size: 'sm',
                color: '#999999',
                align: 'center',
                margin: 'md'
              }
            ],
            paddingAll: '20px',
            backgroundColor: '#F8F8FF'
          },
          hero: {
            type: 'image',
            url: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=200&fit=crop',
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '歡迎來到我們的商品選購頁面！',
                weight: 'bold',
                size: 'lg',
                margin: 'md'
              },
              {
                type: 'text',
                text: '點擊下方按鈕瀏覽所有商品，輕鬆加入購物車，享受便利的購物體驗。',
                size: 'sm',
                color: '#666666',
                margin: 'sm',
                wrap: true
              },
              {
                type: 'separator',
                margin: 'xl'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'xl',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '🎀',
                        size: 'sm'
                      },
                      {
                        type: 'text',
                        text: '精選韓國品牌童裝',
                        size: 'sm',
                        color: '#555555',
                        margin: 'sm'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '🚚',
                        size: 'sm'
                      },
                      {
                        type: 'text',
                        text: '安全快速配送',
                        size: 'sm',
                        color: '#555555',
                        margin: 'sm'
                      }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: '💝',
                        size: 'sm'
                      },
                      {
                        type: 'text',
                        text: '貼心客服服務',
                        size: 'sm',
                        color: '#555555',
                        margin: 'sm'
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
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '🛒 開始選購',
                  uri: `https://liff.line.me/${process.env.LIFF_ID}`
                },
                color: '#FBF1CE'
              }
            ],
            flex: 0
          }
        }
      };

      await client.replyMessage(event.replyToken, flexMessage);
    } catch (error) {
      console.error('顯示 LIFF 購物頁面時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '抱歉，無法開啟購物頁面，請稍後再試。'
      });
    }
  }

  // 處理追蹤事件（加好友）
  static async handleFollow(client, event) {
    const { userId } = event.source;
    
    try {
      // 記錄新客戶
      await CustomerService.addNewCustomer(userId);
      
      const welcomeMessage = {
        type: 'text',
        text: `🎀 歡迎來到 Cyndi 韓國童裝代購！

我是您的專屬購物小幫手，提供：
• 精選韓國童裝商品
• 便利的線上選購體驗  
• 貼心的客服服務

輸入「我要下單」開始購物
或輸入「說明」了解更多功能`,
        quickReply: QuickReplies.createMainMenuQuickReply().quickReply
      };
      
      await client.replyMessage(event.replyToken, welcomeMessage);
    } catch (error) {
      console.error('處理 follow 事件時發生錯誤:', error);
    }
  }

  // 顯示商品目錄
  static async showProductCatalog(client, event) {
    try {
      const products = await NotionService.getAllProducts();
      
      if (products.length === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '目前沒有可購買的商品，請稍後再試。'
        });
        return;
      }
      
      const productCarousel = FlexMessages.createProductCarousel(products);
      
      await client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '🛍️ 歡迎選購！請點選您喜歡的商品加入購物清單'
        },
        {
          type: 'flex',
          altText: '商品清單',
          contents: productCarousel
        },
        QuickReplies.createShoppingQuickReply()
      ]);
      
    } catch (error) {
      console.error('顯示商品目錄時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '抱歉，無法載入商品清單，請稍後再試。'
      });
    }
  }

  // 處理訂單
  static async processOrder(client, event) {
    try {
      const cart = await CustomerService.getShoppingCart(event.source.userId);
      
      if (!cart || cart.length === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '您的購物清單是空的！\n請先選擇商品後再送出訂單。'
        });
        return;
      }
      
      // 顯示訂單確認和收集資料表單
      const orderForm = FlexMessages.createOrderForm(cart);
      
      await client.replyMessage(event.replyToken, {
        type: 'flex',
        altText: '請確認訂單並填寫資料',
        contents: orderForm
      });
      
    } catch (error) {
      console.error('處理訂單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '處理訂單時發生錯誤，請重新嘗試。'
      });
    }
  }

  // 查詢訂單狀態
  static async showOrderStatus(client, event) {
    console.log(`[DEBUG] showOrderStatus 開始執行 - userId: ${event.source.userId}`);
    
    // 先發送查詢中的訊息
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🔍 正在查詢您的訂單，請稍候...'
    });

    try {
      const { userId } = event.source;
      const NotionService = require('../services/notionService');
      
      // 取得客戶資訊
      console.log(`[DEBUG] 查詢客戶訂單 - userId: ${userId}`);
      const customer = await NotionService.getCustomerByLineId(userId);
      console.log(`[DEBUG] 找到客戶:`, customer);
      
      if (!customer) {
        console.log(`[DEBUG] 找不到客戶資料 - userId: ${userId}`);
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
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
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
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

      // 建立訂單列表 Flex Message (完全複製原本格式)
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
                      text: new Date(order.createdAt).toLocaleDateString('zh-TW'),
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

      console.log(`[DEBUG] 準備發送訂單 Flex Message，訂單數量: ${orderBubbles.length}`);
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, message);
      console.log(`[DEBUG] 訂單 Flex Message 發送完成`);
      
    } catch (error) {
      console.error('查詢訂單狀態時發生錯誤:', error);
      console.error('錯誤詳情:', error.stack);
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      await client.pushMessage(targetId, {
        type: 'text',
        text: '查詢訂單時發生錯誤，請稍後再試。'
      });
    }
  }

  // 聯絡客服
  static async contactCustomerService(client, event) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '需要客服協助嗎？\n\n請加LINE：@cyndi12kid\n或來電：0912-345-678\n\n營業時間：週一至週五 9:00-18:00'
    });
  }

  // 顯示主選單
  static async showMainMenu(client, event) {
    await client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '請選擇您要的服務：'
      },
      QuickReplies.createMainMenuQuickReply()
    ]);
  }

  // 顯示幫助訊息
  static async showHelp(client, event) {
    const helpMessage = FlexMessages.createHelpCard();
    await client.replyMessage(event.replyToken, helpMessage);
  }

  // 搜尋商品
  static async searchProducts(client, event) {
    try {
      const searchText = event.message.text;
      const products = await NotionService.searchProducts(searchText);
      
      if (products.length === 0) {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `沒有找到與「${searchText}」相關的商品。\n請輸入「我要下單」查看所有商品。`
        });
        return;
      }
      
      const searchResults = FlexMessages.createProductCarousel(products);
      
      await client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `🔍 搜尋結果：找到 ${products.length} 件相關商品`
        },
        {
          type: 'flex',
          altText: '搜尋結果',
          contents: searchResults
        }
      ]);
      
    } catch (error) {
      console.error('搜尋商品時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '搜尋時發生錯誤，請重新嘗試。'
      });
    }
  }

  // 檢查是否包含商品關鍵字
  static containsProductKeyword(text) {
    const keywords = ['上衣', '褲子', '裙子', '外套', '童裝', '男童', '女童', '童鞋', '帽子', '配件'];
    return keywords.some(keyword => text.includes(keyword));
  }

  // 檢查是否包含打招呼關鍵字
  static containsGreeting(text) {
    const greetings = ['早安', '午安', '晚安', '你好', '妳好', '在嗎', '在不在'];
    return greetings.some(greeting => text.includes(greeting));
  }

  // 檢查是否包含運送相關關鍵字
  static containsShippingKeyword(text) {
    const keywords = ['運費', '運送', '配送', '寄送', '運費', '宅配', '超商', '7-11', '全家'];
    return keywords.some(keyword => text.includes(keyword));
  }

        // 顯示 Flex Message 購物選單
      static async showFlexShoppingMenu(client, event) {
        // 一旦離開購物主選單太久，可視情況在其他流程調用 disableSearchMode(userId)

    try {
      const categoryMenu = FlexShoppingService.createCategoryMenu();
      await client.replyMessage(event.replyToken, categoryMenu);
    } catch (error) {
      console.error('顯示 Flex 購物選單時發生錯誤:', error);
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '抱歉，無法顯示購物選單，請稍後再試。'
      });
    }
  }

  // 處理商品搜尋
  static async handleProductSearch(client, event, keyword) {
    try {
      // 過濾掉太短的關鍵字
      if (keyword.length < 2) {
        return false;
      }

      // 避免處理常見的問候語
      const greetings = ['hi', 'hello', '嗨', '哈囉', '安安', '您好', '你好', '早安', '午安', '晚安'];
      if (greetings.includes(keyword.toLowerCase())) {
        return false;
      }

      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `🔍 正在搜尋「${keyword}」相關商品...`
      });

      const searchResults = await ProductFlowService.searchProducts(keyword);

      if (searchResults.total === 0) {
        const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
        await client.pushMessage(targetId, {
          type: 'text',
          text: `😅 很抱歉，沒有找到與「${keyword}」相關的商品。\n\n請嘗試：\n• 使用更簡單的關鍵字\n• 搜尋商品類型（如：洋裝、上衣）\n• 搜尋顏色（如：粉紅、藍色）\n• 搜尋尺寸（如：M、L）`,
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
        return true;
      }

      // 顯示搜尋結果
      const targetId = event.source.type === 'group' ? event.source.groupId : event.source.userId;
      
      // 合併主商品和變體結果
      const allResults = [...searchResults.products, ...searchResults.variants];
      
      if (allResults.length > 0) {
        const resultCarousel = this.createSearchResultCarousel(allResults, keyword);
        await client.pushMessage(targetId, resultCarousel);
        
        // 發送導航快速回覆
        const navigationQuickReply = QuickReplies.createNavigationQuickReply();
        await client.pushMessage(targetId, navigationQuickReply);
      }

      return true;

    } catch (error) {
      console.error('搜尋商品時發生錯誤:', error);
      return false;
    }
  }

  // 創建搜尋結果輪播（新的時尚設計）
  static createSearchResultCarousel(results, keyword) {
    const bubbles = results.slice(0, 10).map(item => ({ // 限制最多10個結果
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: item.imageUrl || 'https://via.placeholder.com/400x600/FF69B4/FFFFFF?text=童裝商品',
            size: 'full',
            aspectMode: 'cover',
            aspectRatio: '2:3',
            gravity: 'top'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: item.name,
                    size: 'xl',
                    color: '#ffffff',
                    weight: 'bold',
                    wrap: true
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  ...(item.type === 'product' ? [
                    {
                      type: 'text',
                      text: `分類：${item.mainCategory}`,
                      color: '#ebebeb',
                      size: 'sm',
                      flex: 0
                    }
                  ] : [
                    {
                      type: 'text',
                      text: `$${item.price}`,
                      color: '#ebebeb',
                      size: 'lg',
                      weight: 'bold',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: `${item.color} ${item.size}`,
                      color: '#ffffffcc',
                      size: 'sm',
                      flex: 0,
                      margin: 'md'
                    }
                  ])
                ],
                spacing: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'filler'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'filler'
                      },
                      {
                        type: 'text',
                        text: item.type === 'product' ? '🎨 查看款式' : '🛒 加入購物車',
                        color: '#ffffff',
                        flex: 0,
                        offsetTop: '-2px'
                      },
                      {
                        type: 'filler'
                      }
                    ],
                    spacing: 'sm'
                  },
                  {
                    type: 'filler'
                  }
                ],
                borderWidth: '1px',
                cornerRadius: '4px',
                spacing: 'sm',
                borderColor: '#ffffff',
                margin: 'xxl',
                height: '40px',
                action: {
                  type: 'postback',
                  data: item.type === 'product' 
                    ? `action=select_product&productId=${item.id}`
                    : `action=add_to_cart&productId=${item.productId}&variantId=${item.id}`
                }
              }
            ],
            position: 'absolute',
            offsetBottom: '0px',
            offsetStart: '0px',
            offsetEnd: '0px',
            backgroundColor: item.type === 'product' ? '#8B7355cc' : '#6B5B47cc',
            paddingAll: '20px',
            paddingTop: '18px'
          },
          // 類型標籤
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: item.type === 'product' ? '系列' : '現貨',
                color: '#ffffff',
                align: 'center',
                size: 'xs',
                offsetTop: '3px'
              }
            ],
            position: 'absolute',
            cornerRadius: '20px',
            offsetTop: '18px',
            backgroundColor: item.type === 'product' ? '#8B7355' : '#00AA00',
            offsetStart: '18px',
            height: '25px',
            width: item.type === 'product' ? '40px' : '45px'
          }
        ],
        paddingAll: '0px'
      }
    }));

    return {
      type: 'flex',
      altText: `搜尋結果：${keyword}`,
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
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

}

module.exports = MessageHandler; 