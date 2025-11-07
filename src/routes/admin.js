const express = require('express');
const router = express.Router();
const NotionService = require('../services/dataService');
const CustomerService = require('../services/customerService');
const NotifyService = require('../services/notifyService');
const ShipmentService = require('../services/shipmentService');

// 管理員認證中間件 (簡單版本)
function adminAuth(req, res, next) {
    // 暫時禁用認證以測試功能
    next();

    // TODO: 重新啟用認證
    // const apiKey = req.headers['x-admin-key'] || req.query.key;
    // if (apiKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV?.trim() === 'development') {
    //     next();
    // } else {
    //     res.status(401).json({ error: '需要管理員權限' });
    // }
}

// 獲取管理員儀表板數據
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // 獲取基本統計數據
        const stats = await getDashboardStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('獲取儀表板數據失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取數據失敗',
            error: error.message
        });
    }
});

// 訂單管理
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const { status, mergeStatus, page = 1, limit = 20, search } = req.query;
        
        const orders = await getOrdersWithFilters({
            status,
            mergeStatus,
            page: parseInt(page),
            limit: parseInt(limit),
            search
        });
        
        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('獲取訂單失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單失敗'
        });
    }
});

// 取得單個訂單詳細信息
router.get('/orders/:orderId', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // 從所有訂單中查找特定訂單
        const allOrders = await NotionService.getAllOrders();
        const order = allOrders.orders.find(o => o.id === orderId);
        
        if (order) {
            res.json({
                success: true,
                data: order
            });
        } else {
            res.status(404).json({
                success: false,
                error: '訂單不存在'
            });
        }
    } catch (error) {
        console.error('取得訂單詳情失敗:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 取得訂單項目
router.get('/orders/:orderId/items', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const orderItems = await NotionService.getOrderItemsForReport([orderId]);
        
        res.json({
            success: true,
            data: orderItems
        });
    } catch (error) {
        console.error('取得訂單項目失敗:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 更新訂單狀態
router.put('/orders/:orderId/status', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;
        
        const result = await updateOrderStatus(orderId, status, notes);
        
        if (result.success) {
            // 發送狀態更新通知給客戶
            await sendOrderStatusNotification(result.order, status);
        }
        
        res.json(result);
    } catch (error) {
        console.error('更新訂單狀態失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗'
        });
    }
});

// 客戶管理
router.get('/customers', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, level } = req.query;
        
        const result = await NotionService.getAllCustomers({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            level
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('獲取客戶列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取客戶列表失敗',
            error: error.message
        });
    }
});

// 獲取客戶詳情
router.get('/customers/:customerId', adminAuth, async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const customerDetails = await NotionService.getCustomerDetails(customerId);
        
        res.json({
            success: true,
            data: customerDetails
        });
    } catch (error) {
        console.error('獲取客戶詳情失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取客戶詳情失敗',
            error: error.message
        });
    }
});

// 更新客戶資料
router.put('/customers/:customerId', adminAuth, async (req, res) => {
    try {
        const { customerId } = req.params;
        const updateData = req.body;
        
        const updatedCustomer = await NotionService.updateCustomer(customerId, updateData);
        
        res.json({
            success: true,
            message: '客戶資料已更新',
            data: updatedCustomer
        });
    } catch (error) {
        console.error('更新客戶資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新客戶資料失敗',
            error: error.message
        });
    }
});

// 商品管理
router.get('/products', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, style, color, size, gender, status } = req.query;
        
        const result = await NotionService.getAllProductsForAdmin({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            style,
            color,
            size,
            gender,
            status
        });
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('獲取商品列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取商品列表失敗',
            error: error.message
        });
    }
});

// 獲取商品詳情
router.get('/products/:productId', adminAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        
        const productDetails = await NotionService.getProductDetailForAdmin(productId);
        
        res.json({
            success: true,
            data: productDetails
        });
    } catch (error) {
        console.error('獲取商品詳情失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取商品詳情失敗',
            error: error.message
        });
    }
});

// 更新商品資料
router.put('/products/:productId', adminAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const updateData = req.body;
        
        const updatedProduct = await NotionService.updateProduct(productId, updateData);
        
        res.json({
            success: true,
            message: '商品資料已更新',
            data: updatedProduct
        });
    } catch (error) {
        console.error('更新商品資料失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新商品資料失敗',
            error: error.message
        });
    }
});

// 獲取熱銷商品排行
router.get('/products/stats/top-selling', adminAuth, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const topProducts = await NotionService.getTopSellingProducts(parseInt(limit));
        
        res.json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error('獲取熱銷商品失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取熱銷商品失敗',
            error: error.message
        });
    }
});

// 銷售報表
router.get('/reports/sales', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate, period = 'daily' } = req.query;
        
        const reportData = await NotionService.getSalesReport({
            startDate,
            endDate,
            period
        });
        
        res.json({
            success: true,
            data: reportData
        });
    } catch (error) {
        console.error('獲取銷售報表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取銷售報表失敗',
            error: error.message
        });
    }
});

// 期間比較報表
router.get('/reports/comparison', adminAuth, async (req, res) => {
    try {
        const { 
            currentStartDate, 
            currentEndDate, 
            previousStartDate, 
            previousEndDate 
        } = req.query;
        
        const comparison = await NotionService.generatePeriodComparison(
            { startDate: currentStartDate, endDate: currentEndDate },
            { startDate: previousStartDate, endDate: previousEndDate }
        );
        
        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('獲取期間比較報表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取期間比較報表失敗',
            error: error.message
        });
    }
});

// 匯出銷售報表
router.get('/reports/export', adminAuth, async (req, res) => {
    try {
        const { format = 'json', startDate, endDate } = req.query;
        
        const reportData = await NotionService.getSalesReport({
            startDate,
            endDate
        });
        
        if (format === 'csv') {
            // 生成 CSV 格式（簡化版）
            const csv = generateCSVReport(reportData);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
            res.send(csv);
        } else {
            // 返回 JSON 格式
            res.json({
                success: true,
                data: reportData,
                exportedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('匯出銷售報表失敗:', error);
        res.status(500).json({
            success: false,
            message: '匯出銷售報表失敗',
            error: error.message
        });
    }
});

// 生成 CSV 報表的輔助函數
function generateCSVReport(reportData) {
    const { summary, topProducts } = reportData;
    
    let csv = '銷售報表摘要\n';
    csv += '項目,數值\n';
    csv += `總訂單數,${summary.totalOrders}\n`;
    csv += `總營收,${summary.totalRevenue}\n`;
    csv += `總商品數,${summary.totalItems}\n`;
    csv += `平均訂單金額,${Math.round(summary.averageOrderValue)}\n`;
    csv += `已完成訂單,${summary.completedOrders}\n`;
    csv += `處理中訂單,${summary.pendingOrders}\n\n`;
    
    csv += '熱銷商品排行\n';
    csv += '商品名稱,銷售量,營收,訂單數\n';
    topProducts.forEach(product => {
        csv += `${product.name},${product.totalSold},${product.totalRevenue},${product.orderCount}\n`;
    });
    
    return csv;
}

// 發送通知
router.post('/notifications/send', adminAuth, async (req, res) => {
    try {
        const { type, message, recipients } = req.body;
        
        const result = await sendBulkNotifications(type, message, recipients);
        
        res.json(result);
    } catch (error) {
        console.error('發送通知失敗:', error);
        res.status(500).json({
            success: false,
            message: '發送通知失敗'
        });
    }
});

// 獲取儀表板統計數據
async function getDashboardStats() {
    try {
        return await NotionService.getDashboardStats();
    } catch (error) {
        console.error('獲取儀表板數據失敗:', error);
        // 返回默認數據以防錯誤
        return {
            overview: {
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
                totalRevenue: 0,
                totalCustomers: 0,
                monthlyGrowth: 0
            },
            recentOrders: [],
            topProducts: [],
            chartData: {
                salesTrend: [],
                orderStatus: []
            }
        };
    }
}

// 獲取訂單（帶篩選）
async function getOrdersWithFilters(filters) {
    try {
        const result = await NotionService.getAllOrders(filters);
        
        // 轉換數據格式以符合前端期望
        const orders = result.orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber || `ORDER-${order.id.slice(-8)}`,
            customerId: order.customerId,
            customerName: order.recipientName || '未知客戶',
            customerPhone: order.recipientPhone || '',
            amount: order.finalAmount || 0,
            status: order.status || '待付款',
            mergeStatus: order.mergeStatus || '待併單',
            createdAt: order.createdAt || new Date().toISOString()
        }));

        return {
            orders,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: result.totalCount,
                pages: Math.ceil(result.totalCount / filters.limit),
                hasMore: result.hasMore
            }
        };
    } catch (error) {
        console.error('獲取訂單失敗:', error);
        return {
            orders: [],
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: 0,
                pages: 0,
                hasMore: false
            }
        };
    }
}

// 更新訂單狀態
async function updateOrderStatus(orderId, status, notes) {
    try {
        const updatedOrder = await NotionService.updateOrderStatus(orderId, status, notes);
        
        return {
            success: true,
            order: {
                id: updatedOrder.id,
                status: updatedOrder.status,
                notes: notes
            }
        };
    } catch (error) {
        console.error('更新訂單狀態失敗:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 發送訂單狀態通知
async function sendOrderStatusNotification(order, newStatus) {
    try {
        const statusMessages = {
            '已付款': '✅ 您的訂單付款已確認！我們正在準備您的商品。',
            '配貨中': '📦 您的訂單正在配貨中，預計今天出貨。',
            '已出貨': '🚚 您的訂單已出貨！請注意收件。',
            '已完成': '🎉 訂單已完成！感謝您的購買，歡迎再次光臨！',
            '已取消': '❌ 很抱歉，您的訂單已取消。如有疑問請聯絡客服。'
        };
        
        const message = statusMessages[newStatus] || `您的訂單狀態已更新為：${newStatus}`;
        
        // 這裡需要從訂單中獲取客戶的 LINE ID
        // 暫時記錄日誌，實際部署時需要實現推送功能
        console.log(`訂單狀態通知: ${message} (訂單ID: ${order.id})`);
        
        // 如果有 LINE Bot 客戶端，可以在這裡發送訊息
        // await LineBot.pushMessage(customerLineId, message);
        
    } catch (error) {
        console.error('發送狀態通知失敗:', error);
    }
}

// 獲取客戶列表（帶統計）
async function getCustomersWithStats(filters) {
    try {
        const result = await NotionService.getAllCustomers(filters);
        
        // 轉換數據格式
        const customers = result.customers.map(customer => ({
            id: customer.id,
            name: customer.name || '未知客戶',
            lineId: customer.lineId || '',
            phone: customer.phone || '',
            email: customer.email || '',
            registeredAt: customer.registeredAt || new Date().toISOString(),
            totalOrders: customer.totalOrders || 0,
            totalSpent: customer.totalSpent || 0,
            customerLevel: customer.customerLevel || '一般會員'
        }));

        return {
            customers,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: result.totalCount,
                pages: Math.ceil(result.totalCount / filters.limit),
                hasMore: result.hasMore
            }
        };
    } catch (error) {
        console.error('獲取客戶資料失敗:', error);
        return {
            customers: [],
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: 0,
                pages: 0,
                hasMore: false
            }
        };
    }
}

// 獲取客戶詳情
async function getCustomerDetails(customerId) {
    try {
        return await NotionService.getCustomerDetails(customerId);
    } catch (error) {
        console.error('獲取客戶詳情失敗:', error);
        return {
            customer: {},
            orders: [],
            stats: {
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                lastOrderDate: null
            }
        };
    }
}

// 生成銷售報表
async function generateSalesReport(options) {
    try {
        // 實現報表生成邏輯
        return {
            summary: {
                totalSales: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                topProduct: null
            },
            chartData: [],
            details: []
        };
    } catch (error) {
        throw error;
    }
}

// 發送批量通知
async function sendBulkNotifications(type, message, recipients) {
    try {
        let sentCount = 0;
        let errors = [];
        
        for (const recipient of recipients) {
            try {
                if (type === 'line') {
                    // 發送 LINE 訊息
                    // await LineBot.pushMessage(recipient.lineId, message);
                } else if (type === 'email') {
                    // 發送郵件
                    // await EmailService.send(recipient.email, message);
                }
                sentCount++;
            } catch (error) {
                errors.push({ recipient, error: error.message });
            }
        }
        
        return {
            success: true,
            sentCount,
            totalRecipients: recipients.length,
            errors
        };
    } catch (error) {
        throw error;
    }
}

// =============== 併單管理 API ===============

// 取得所有待併單商品
router.get('/merge-pool', adminAuth, async (req, res) => {
  try {
    const pendingOrders = await NotionService.getAllOrders({ mergeStatus: '待併單' });
    
    // 整理為以客戶分組的格式
    const groupedByCustomer = {};
    
    for (const order of pendingOrders) {
      const customerId = order.customerId;
      if (!groupedByCustomer[customerId]) {
        const customer = await NotionService.getCustomerById(customerId);
        groupedByCustomer[customerId] = {
          customer: customer,
          orders: [],
          totalItems: 0,
          totalAmount: 0
        };
      }
      
      // 取得訂單項目
      const orderItems = await NotionService.getOrderItemsForReport(order.id);
      
      groupedByCustomer[customerId].orders.push({
        ...order,
        items: orderItems
      });
      groupedByCustomer[customerId].totalItems += orderItems.length;
      groupedByCustomer[customerId].totalAmount += order.totalAmount;
    }
    
    res.json({
      success: true,
      data: Object.values(groupedByCustomer)
    });
  } catch (error) {
    console.error('取得併單池錯誤:', error);
    res.status(500).json({ error: '取得併單池失敗' });
  }
});

// 測試 Notion 連接
router.get('/test-notion', adminAuth, async (req, res) => {
  try {
    const result = await ShipmentService.testNotionConnection();
    res.json(result);
  } catch (error) {
    console.error('測試端點錯誤:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 建立出貨批次（拆單）
router.post('/create-shipment', adminAuth, async (req, res) => {
  try {
    console.log('🚀 開始建立出貨批次，收到的資料:', req.body);
    
    const { orderItemIds, batchName, shippingInfo, notes, status } = req.body;

    if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
      throw new Error('orderItemIds 不可為空');
    }

    // 由 orderItemIds → 推導 customerId（取第一張訂單的客戶）
    const orderIds = await getOrderIdsFromItems(orderItemIds);
    console.log('📦 由項目推導出的訂單 IDs:', orderIds);
    
    let derivedCustomerId = null;
    if (orderIds.length > 0) {
      // 讀取第一張訂單，取得 Customers relation（需 NotionService 提供 getOrdersById 或 getAllOrders 查找）
      const firstOrderId = orderIds[0];
      try {
        const orderPage = await NotionService.notion.pages.retrieve({ page_id: firstOrderId });
        derivedCustomerId = orderPage.properties['客戶']?.relation?.[0]?.id || null;
      } catch (e) {
        console.error('讀取訂單取得客戶失敗:', firstOrderId, e.message);
      }
    }

    console.log('📦 推導出的 customerId:', derivedCustomerId);

    // UUID 簡易檢查（Notion page id 的 UUIDv4 樣式）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeCustomerId = (derivedCustomerId && uuidRegex.test(derivedCustomerId)) ? derivedCustomerId : null;

    // 建立出貨批次
    console.log('📦 步驟1: 建立出貨批次');
    const shipment = await ShipmentService.createShipment({
      customerId: safeCustomerId,
      batchName,
      shippingInfo,
      notes,
      status
    });
    
    console.log('📦 步驟1 完成，建立的出貨批次:', shipment);
    
    if (!shipment || !shipment.id) {
      throw new Error('建立出貨批次失敗，沒有回傳有效的 shipment ID');
    }
    
    // 關聯選中的商品到此批次
    console.log('📦 步驟2: 關聯商品到出貨批次');
    await ShipmentService.linkOrderItemsToShipment(shipment.id, orderItemIds);
    console.log('📦 步驟2 完成');
    
    // 更新相關訂單的狀態
    console.log('📦 步驟3: 更新訂單狀態');
    for (const orderId of orderIds) {
      console.log('📦 更新訂單狀態:', orderId);
      await NotionService.updateOrderStatus(orderId, '配貨中', '已分配到出貨批次');
    }
    console.log('📦 步驟3 完成');
    
    console.log('🎉 出貨批次建立流程完成');
    
    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('建立出貨批次錯誤:', error);
    console.error('錯誤詳情:', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: '建立出貨批次失敗', message: error.message });
  }
});

// 取得所有出貨批次
router.get('/shipments', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const shipments = await ShipmentService.getAllShipments({ status });
    
    res.json({
      success: true,
      data: shipments
    });
  } catch (error) {
    console.error('取得出貨批次錯誤:', error);
    res.status(500).json({ error: '取得出貨批次失敗' });
  }
});

// 發送付款通知
router.post('/send-payment-request/:shipmentId', adminAuth, async (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { paymentInstructions } = req.body;
    
    // 取得出貨批次資訊
    const shipments = await ShipmentService.getAllShipments();
    const shipment = shipments.find(s => s.id === shipmentId);
    
    if (!shipment) {
      return res.status(404).json({ error: '找不到出貨批次' });
    }
    
    // 發送付款通知給客戶
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let customerLineId = null;

    if (shipment.customerId && uuidRegex.test(shipment.customerId)) {
      try {
        const customer = await NotionService.getCustomerById(shipment.customerId);
        customerLineId = customer?.lineId || null;
      } catch (e) {
        console.error('取得客戶資料失敗:', e.message);
      }
    }

    if (!customerLineId) {
      return res.status(400).json({ success: false, error: '找不到客戶的 LINE ID，無法發送通知' });
    }

    await NotifyService.sendPaymentRequest(customerLineId, {
      shipment,
      paymentInstructions,
      totalAmount: (shipment.totalAmount || 0) + (shipment.shippingFee || 0)
    });
    
    // 更新批次狀態為待付款
    await ShipmentService.updateShipmentStatus(shipmentId, '待付款');
    
    res.json({
      success: true,
      message: '付款通知已發送'
    });
  } catch (error) {
    console.error('發送付款通知錯誤:', error);
    res.status(500).json({ error: '發送付款通知失敗' });
  }
});

// 輔助函數：從訂單項目取得訂單 ID
async function getOrderIdsFromItems(orderItemIds) {
  console.log('🔗 開始從訂單項目取得訂單 ID:', orderItemIds);
  const orderIds = new Set();
  
  for (const itemId of orderItemIds) {
    try {
      console.log('📋 檢查訂單項目:', itemId);
      const response = await NotionService.notion.pages.retrieve({
        page_id: itemId
      });
      
      const orderId = response.properties['所屬訂單']?.relation?.[0]?.id;
      console.log('📋 找到關聯訂單:', orderId);
      if (orderId) {
        orderIds.add(orderId);
      }
    } catch (error) {
      console.error('取得訂單項目關聯錯誤:', error);
    }
  }
  
  const result = Array.from(orderIds);
  console.log('🔗 最終取得的訂單 IDs:', result);
  return result;
}

module.exports = router; 