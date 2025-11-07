/**
 * Vercel Serverless Function - Main Entry Point
 */

const express = require('express');
const line = require('@line/bot-sdk');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// 載入環境變數
require('dotenv').config();

// 匯入 handlers
const MessageHandler = require('../src/handlers/messageHandler');
const PostbackHandler = require('../src/handlers/postbackHandler');

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

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

// 靜態檔案服務
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.use('/liff', express.static(path.join(__dirname, '../public/liff')));

// 根路由
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LINE 童裝代購自動化系統正在運行中 (Vercel)',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    hasSecret: !!process.env.LINE_CHANNEL_SECRET,
    secretLength: process.env.LINE_CHANNEL_SECRET ? process.env.LINE_CHANNEL_SECRET.length : 0
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

// Webhook 路由
app.post('/webhook', async (req, res) => {
  try {
    // 除錯：檢查環境變數
    console.log('LINE_CHANNEL_SECRET exists:', !!process.env.LINE_CHANNEL_SECRET);
    console.log('Signature from LINE:', req.headers['x-line-signature']);

    // 驗證簽章
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      console.error('No signature header');
      return res.status(400).json({ error: 'No signature header' });
    }

    if (!validateSignature(signature, req.rawBody)) {
      console.error('Invalid signature');
      console.error('Channel Secret:', process.env.LINE_CHANNEL_SECRET ? 'exists' : 'missing');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // 處理事件
    const events = req.body.events;
    console.log(`Received ${events.length} events`);

    await Promise.all(events.map(async (event) => {
      try {
        console.log('Processing event:', event.type);

        // 處理訊息事件
        if (event.type === 'message') {
          if (event.message.type === 'text') {
            await MessageHandler.handleTextMessage(event, client);
          }
        }
        // 處理 Postback 事件
        else if (event.type === 'postback') {
          await PostbackHandler.handlePostback(event, client);
        }
        // 處理追蹤事件
        else if (event.type === 'follow') {
          await MessageHandler.handleFollow(event, client);
        }
      } catch (err) {
        console.error('Error processing event:', err);
      }
    }));

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API 路由
const apiRoutes = require('../src/routes/api');
const adminRoutes = require('../src/routes/admin');

app.use('/api', apiRoutes);
app.use('/admin/api', adminRoutes);

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'Vercel'
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 匯出給 Vercel
module.exports = app;
