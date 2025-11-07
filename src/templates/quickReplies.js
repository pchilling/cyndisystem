class QuickReplies {
  
  // 主選單快速回覆
  static createMainMenuQuickReply() {
    return {
      type: 'text',
      text: '請選擇您需要的服務：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🛍️ 我要下單',
              text: '我要下單'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📋 查詢訂單',
              text: '查詢訂單'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🛒 查看購物清單',
              data: JSON.stringify({ action: 'view_cart' })
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💬 聯絡客服',
              text: '客服'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '❓ 使用說明',
              text: '說明'
            }
          }
        ]
      }
    };
  }
  
  // 購物相關快速回覆
  static createShoppingQuickReply() {
    return {
      type: 'text',
      text: '您還需要什麼服務？',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🛍️ 繼續購物',
              text: '我要下單'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🛒 查看購物清單',
              data: JSON.stringify({ action: 'view_cart' })
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '✅ 我要送出',
              text: '我要送出'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🌐 LIFF 選購',
              data: JSON.stringify({ action: 'open_liff' })
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 回主選單',
              text: '選單'
            }
          }
        ]
      }
    };
  }
  
  // 商品分類快速回覆
  static createCategoryQuickReply() {
    return {
      type: 'text',
      text: '請選擇商品分類：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👕 上衣',
              text: '上衣'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👖 褲子',
              text: '褲子'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👗 裙子',
              text: '裙子'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🧥 外套',
              text: '外套'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👶 男童',
              text: '男童'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👧 女童',
              text: '女童'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📱 查看全部',
              text: '我要下單'
            }
          }
        ]
      }
    };
  }
  
  // 訂單狀態查詢快速回覆
  static createOrderStatusQuickReply() {
    return {
      type: 'text',
      text: '請選擇查詢類型：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📋 我的訂單',
              text: '查詢訂單'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💰 付款狀態',
              text: '付款狀態'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🚚 出貨進度',
              text: '出貨進度'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💬 聯絡客服',
              text: '客服'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏠 回主選單',
              text: '選單'
            }
          }
        ]
      }
    };
  }
  
  // 尺寸選擇快速回覆
  static createSizeQuickReply(sizes = ['S', 'M', 'L', 'XL']) {
    const sizeItems = sizes.slice(0, 8).map(size => ({
      type: 'action',
      action: {
        type: 'message',
        label: size,
        text: `尺寸 ${size}`
      }
    }));
    
    return {
      type: 'text',
      text: '請選擇尺寸：',
      quickReply: {
        items: sizeItems.concat([
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📏 尺寸表',
              text: '尺寸表'
            }
          }
        ])
      }
    };
  }
  
  // 客服相關快速回覆
  static createCustomerServiceQuickReply() {
    return {
      type: 'text',
      text: '需要什麼協助？',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📋 訂單問題',
              text: '訂單問題'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💰 付款問題',
              text: '付款問題'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🚚 出貨問題',
              text: '出貨問題'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👕 商品諮詢',
              text: '商品諮詢'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📏 尺寸諮詢',
              text: '尺寸諮詢'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🔄 退換貨',
              text: '退換貨'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💬 其他問題',
              text: '其他問題'
            }
          }
        ]
      }
    };
  }
  
  // 付款方式快速回覆
  static createPaymentMethodQuickReply() {
    return {
      type: 'text',
      text: '請選擇付款方式：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏦 銀行轉帳',
              text: '銀行轉帳'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💳 信用卡',
              text: '信用卡'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📱 LINE Pay',
              text: 'LINE Pay'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '💰 貨到付款',
              text: '貨到付款'
            }
          }
        ]
      }
    };
  }
  
  // 配送方式快速回覆
  static createShippingMethodQuickReply() {
    return {
      type: 'text',
      text: '請選擇配送方式：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏪 7-11 取貨',
              text: '7-11 取貨'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🏪 全家取貨',
              text: '全家取貨'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🚚 宅配到府',
              text: '宅配到府'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📦 郵局寄送',
              text: '郵局寄送'
            }
          }
        ]
      }
    };
  }

  // 商品瀏覽導航快速回覆
  static createNavigationQuickReply() {
    return {
      type: 'text', 
      text: '您可以：',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🔙 返回分類',
              data: 'action=show_categories'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🔍 搜尋商品',
              data: 'action=search_products'
            }
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '🛒 查看購物車',
              data: 'action=view_cart'
            }
          }
        ]
      }
    };
  }
}

module.exports = QuickReplies; 