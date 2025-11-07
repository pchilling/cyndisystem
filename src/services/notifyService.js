const axios = require('axios');
const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

class NotifyService {
  
  // 發送新訂單通知給管理員
  static async notifyNewOrder(order) {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) {
        console.log('LINE Notify token 未設定，跳過通知');
        return;
      }
      
      const message = this.formatNewOrderMessage(order);
      await this.sendNotification(message);
      
      console.log('新訂單通知已發送');
      
    } catch (error) {
      console.error('發送新訂單通知時發生錯誤:', error);
    }
  }
  
  // 發送訂單通知（通用方法）
  static async sendOrderNotification(message) {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) {
        console.log('LINE Notify token 未設定，跳過通知');
        return;
      }
      
      await this.sendNotification(message);
      console.log('訂單通知已發送');
      
    } catch (error) {
      console.error('發送訂單通知時發生錯誤:', error);
      throw error;
    }
  }
  
  // 發送付款確認通知
  static async notifyPaymentReceived(orderNumber, amount) {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) return;
      
      const message = `💰 付款確認通知\n\n訂單編號：${orderNumber}\n付款金額：NT$ ${amount}\n\n請確認訂單並安排出貨。`;
      await this.sendNotification(message);
      
      console.log('付款確認通知已發送');
      
    } catch (error) {
      console.error('發送付款確認通知時發生錯誤:', error);
    }
  }
  
  // 發送庫存不足通知
  static async notifyLowStock(productName, currentStock) {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) return;
      
      const message = `⚠️ 庫存不足警告\n\n商品：${productName}\n目前庫存：${currentStock}\n\n請及時補貨。`;
      await this.sendNotification(message);
      
      console.log('庫存不足通知已發送');
      
    } catch (error) {
      console.error('發送庫存不足通知時發生錯誤:', error);
    }
  }
  
  // 發送每日銷售報告
  static async sendDailySalesReport(stats) {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) return;
      
      const message = this.formatDailySalesReport(stats);
      await this.sendNotification(message);
      
      console.log('每日銷售報告已發送');
      
    } catch (error) {
      console.error('發送每日銷售報告時發生錯誤:', error);
    }
  }
  
  // 發送 LINE Notify 訊息
  static async sendNotification(message) {
    try {
      const response = await axios.post(
        'https://notify-api.line.me/api/notify',
        `message=${encodeURIComponent(message)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.LINE_NOTIFY_TOKEN}`
          }
        }
      );
      
      if (response.data.status === 200) {
        return true;
      } else {
        console.error('LINE Notify 發送失敗:', response.data);
        return false;
      }
      
    } catch (error) {
      console.error('LINE Notify API 錯誤:', error);
      return false;
    }
  }
  
  // 格式化新訂單訊息
  static formatNewOrderMessage(order) {
    const itemsText = order.items.map(item => 
      `• ${item.productName} (${item.size}) x${item.quantity} - NT$ ${item.price * item.quantity}`
    ).join('\n');
    
    return `🛍️ 新訂單通知

訂單編號：${order.orderNumber}
客戶資訊：${order.customerInfo.name || '未提供'}
聯絡電話：${order.customerInfo.phone || '未提供'}
收件地址：${order.customerInfo.address || '未提供'}

商品明細：
${itemsText}

訂單總額：NT$ ${order.totalAmount}
下單時間：${order.createdAt}

請盡快處理此訂單。`;
  }
  
  // 格式化每日銷售報告
  static formatDailySalesReport(stats) {
    return `📊 每日銷售報告

日期：${new Date().toLocaleDateString('zh-TW')}

📈 今日統計：
• 新訂單：${stats.todayOrders} 筆
• 今日營收：NT$ ${stats.todayRevenue}

📅 本月統計：
• 總訂單：${stats.monthlyOrderCount} 筆  
• 總營收：NT$ ${stats.monthlyRevenue}

🎯 目標達成率：${stats.targetAchievement}%

繼續加油！💪`;
  }
  
  // 發送系統錯誤通知
  static async notifySystemError(error, context = '') {
    try {
      if (!process.env.LINE_NOTIFY_TOKEN) return;
      
      const message = `🚨 系統錯誤通知

錯誤內容：${error.message}
發生時間：${new Date().toLocaleString('zh-TW')}
錯誤位置：${context}

請檢查系統狀態。`;
      
      await this.sendNotification(message);
      console.log('系統錯誤通知已發送');
      
    } catch (notifyError) {
      console.error('發送錯誤通知時發生錯誤:', notifyError);
    }
  }
  
  // 發送測試訊息
  static async sendTestMessage() {
    try {
      const message = `🤖 LINE Bot 測試訊息

系統狀態：正常運行
發送時間：${new Date().toLocaleString('zh-TW')}

這是一則測試訊息，確認 LINE Notify 功能正常。`;
      
      const result = await this.sendNotification(message);
      return result;
      
    } catch (error) {
      console.error('發送測試訊息時發生錯誤:', error);
      return false;
    }
  }

  // 發送付款通知給客戶
  static async sendPaymentRequest(userId, paymentData) {
    try {
      const { shipment, paymentInstructions, totalAmount } = paymentData;
      
      const message = {
        type: 'flex',
        altText: '付款通知',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '💰 付款通知',
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
                text: `您的商品已到齊！請進行付款`,
                weight: 'bold',
                size: 'md',
                margin: 'md'
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
                        text: '批次：',
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: shipment.batchName,
                        wrap: true,
                        color: '#333333',
                        size: 'sm',
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
                        text: '總金額：',
                        color: '#666666',
                        size: 'sm',
                        flex: 2
                      },
                      {
                        type: 'text',
                        text: `$${totalAmount}`,
                        wrap: true,
                        color: '#ff6b6b',
                        size: 'lg',
                        weight: 'bold',
                        flex: 5
                      }
                    ]
                  }
                ]
              },
              {
                type: 'separator',
                margin: 'lg'
              },
              {
                type: 'text',
                text: paymentInstructions || '請使用銀行轉帳付款，轉帳後請回傳轉帳截圖。',
                wrap: true,
                color: '#666666',
                size: 'sm',
                margin: 'lg'
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
                  label: '確認付款',
                  data: `action=confirm_payment&shipmentId=${shipment.id}`
                },
                color: '#FBF1CE'
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'postback',
                  label: '查看訂單詳情',
                  data: `action=view_shipment&shipmentId=${shipment.id}`
                }
              }
            ],
            flex: 0
          }
        }
      };

      await client.pushMessage(userId, message);
      console.log('付款通知已發送至客戶:', userId);
      
    } catch (error) {
      console.error('發送付款通知時發生錯誤:', error);
      throw error;
    }
  }
}

module.exports = NotifyService; 