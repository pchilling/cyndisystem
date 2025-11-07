require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path'); // Added for path.join

const MessageHandler = require('./handlers/messageHandler');
const PostbackHandler = require('./handlers/postbackHandler');

// 載入環境變數
require('dotenv').config();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// 允許的群組 ID 列表
const ALLOWED_GROUPS = [
  process.env.TEST_GROUP_ID || ''  // 從環境變數讀取測試群組 ID
].filter(id => id); // 移除空值

// 檢查是否為允許的來源 (已停用 - 現在允許所有用戶)
/*
function isAllowedSource(event) {
  // 如果是顯示群組ID的命令，直接允許
  if (event.type === 'message' && 
      event.message.type === 'text' && 
      /^顯示群組\s*id$/i.test(event.message.text)) {
    return true;
  }
  
  // 如果沒有設定允許的群組，則不回應任何消息
  if (ALLOWED_GROUPS.length === 0) {
    return false;
  }
  
  // 檢查是否來自群組
  if (event.source.type === 'group') {
    return ALLOWED_GROUPS.includes(event.source.groupId);
  }
  
  // 如果不是來自群組，則不回應
  return false;
}
*/

// 建立 LINE SDK client
const client = new line.Client(config);
const app = express();

// 中間件設置
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// 請求日誌中間件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.url === '/webhook') {
    console.log('Webhook Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Webhook Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LINE 童裝代購自動化系統正在運行中',
    timestamp: new Date().toISOString()
  });
});

// Webhook 測試路由
app.get('/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
});

// 驗證 LINE 簽章
function validateSignature(signature, body) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// LINE Webhook 路由
app.post('/webhook', (req, res) => {
  // 檢查簽章
  const signature = req.headers['x-line-signature'];
  if (!signature) {
    console.error('缺少 X-Line-Signature');
    return res.status(400).json({
      message: 'Missing signature'
    });
  }

  // 驗證簽章
  if (!validateSignature(signature, req.rawBody)) {
    console.error('簽章驗證失敗');
    return res.status(400).json({
      message: 'Invalid signature'
    });
  }

  // 立即回應 200
  res.status(200).end();

  // 非同步處理事件
  (async () => {
    try {
      const events = req.body.events || [];
      
      await Promise.all(events.map(async (event) => {
        try {
          console.log('開始處理事件:', JSON.stringify(event, null, 2));
          
          // 移除來源限制，允許所有用戶和群組使用
          // if (!isAllowedSource(event)) {
          //   console.log('非允許的來源，忽略事件:', event.source);
          //   return;
          // }
          
          switch (event.type) {
            case 'message':
              if (event.message.type === 'text') {
                await MessageHandler.handleTextMessage(client, event);
              } else {
                console.log(`未處理的訊息類型: ${event.message.type}`);
              }
              break;
              
            case 'postback':
              await PostbackHandler.handlePostback(client, event);
              break;
              
            case 'follow':
              await MessageHandler.handleFollow(client, event);
              break;
              
            case 'unfollow':
              console.log('用戶取消關注:', event.source.userId);
              break;
              
            default:
              console.log('未處理的事件類型:', event.type);
          }
          
          console.log('事件處理完成:', event.type);
        } catch (eventError) {
          console.error('處理單一事件時發生錯誤:', eventError);
          // 不拋出錯誤，繼續處理其他事件
        }
      }));
      
    } catch (error) {
      console.error('Webhook 整體處理錯誤:', error);
    }
  })();
});

// 靜態文件服務
app.use('/liff', express.static(path.join(__dirname, '../public/liff')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// API 路由
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LINE Bot 服務器已啟動在 port ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🌐 LIFF URL: http://localhost:${PORT}/liff`);
  console.log('環境變數檢查：');
  console.log('LINE_CHANNEL_ACCESS_TOKEN:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? '已設置' : '未設置');
  console.log('LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET ? '已設置' : '未設置');
  console.log('TEST_GROUP_ID:', process.env.TEST_GROUP_ID ? '已設置' : '未設置');
  if (!process.env.TEST_GROUP_ID) {
    console.log('⚠️ 警告：未設置測試群組 ID，機器人將不會回應任何消息');
    console.log('請在群組中輸入「顯示群組ID」來獲取群組 ID');
  }
}); 