const express = require('express');
const router = express.Router();
const NotionService = require('../services/dataService');
const CustomerService = require('../services/customerService');
const NotifyService = require('../services/notifyService'); // Added NotifyService

// 獲取所有商品
router.get('/products', async (req, res) => {
    try {
        console.log('收到商品列表請求');
        
        const { category, search } = req.query;
        const products = await NotionService.getProducts();
        
        let filteredProducts = products;
        
        // 依分類篩選
        if (category && category !== 'all') {
            filteredProducts = products.filter(product => 
                product.mainCategory === category || 
                (product.subCategories && product.subCategories.includes(category))
            );
        }
        
        // 依搜尋關鍵字篩選
        if (search) {
            const searchLower = search.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchLower) ||
                product.mainCategory.toLowerCase().includes(searchLower) ||
                (product.subCategories && product.subCategories.some(cat => 
                    cat.toLowerCase().includes(searchLower)
                ))
            );
        }
        
        console.log(`回傳 ${filteredProducts.length} 個商品`);
        
        res.json({
            success: true,
            data: filteredProducts,
            total: filteredProducts.length
        });
        
    } catch (error) {
        console.error('獲取商品列表時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取商品列表失敗'
        });
    }
});

// 獲取單一商品詳情
router.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`收到商品詳情請求: ${id}`);
        
        const product = await NotionService.getProductById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '商品不存在'
            });
        }
        
        // 獲取商品的變體
        const variants = await NotionService.getProductVariants(id);
        product.variants = variants;
        
        console.log(`回傳商品詳情: ${product.name}`);
        
        res.json({
            success: true,
            data: product
        });
        
    } catch (error) {
        console.error('獲取商品詳情時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取商品詳情失敗'
        });
    }
});

// 獲取 LIFF 配置
router.get('/config/liff', (req, res) => {
    try {
        res.json({
            success: true,
            liffId: process.env.LIFF_ID
        });
    } catch (error) {
        console.error('獲取 LIFF 配置時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取 LIFF 配置失敗'
        });
    }
});

// 獲取購物車
router.get('/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`收到購物車請求: ${userId}`);
        
        const cartSummary = await CustomerService.getCartSummary(userId);
        
        res.json({
            success: true,
            data: cartSummary.items,
            summary: {
                totalItems: cartSummary.totalItems,
                totalAmount: cartSummary.totalAmount,
                shippingFee: cartSummary.shippingFee,
                finalAmount: cartSummary.finalAmount,
                itemCount: cartSummary.itemCount
            }
        });
        
    } catch (error) {
        console.error('獲取購物車時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取購物車失敗'
        });
    }
});

// 加入購物車
router.post('/cart/:userId/add', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId, variantId, quantity = 1 } = req.body;
        
        console.log(`收到加入購物車請求: 用戶=${userId}, 商品=${productId}, 變體=${variantId}, 數量=${quantity}`);
        
        // 從 Notion 獲取商品和變體資訊
        let productInfo = null;
        let variantInfo = null;
        
        try {
            if (variantId) {
                // 如果有變體 ID，從變體資料庫獲取資訊
                const variants = await NotionService.getProductVariants(productId);
                variantInfo = variants.find(v => v.id === variantId);
                
                if (variantInfo) {
                    // 同時獲取商品資訊
                    productInfo = await NotionService.getProductById(productId);
                }
            } else {
                // 沒有變體 ID，只獲取商品資訊
                productInfo = await NotionService.getProductById(productId);
            }
        } catch (notionError) {
            console.error('從 Notion 獲取商品資訊失敗:', notionError);
            // 繼續執行，使用預設值
        }
        
        // 準備加入購物車的資料
        const cartItemData = {
            productId,
            variantId: variantId || null,
            quantity: parseInt(quantity),
            productName: productInfo?.name || '未知商品',
            variantName: variantInfo ? `${variantInfo.color} ${variantInfo.size}`.trim() : '',
            price: variantInfo?.price || productInfo?.price || 0,
            color: variantInfo?.color || '',
            size: variantInfo?.size || ''
        };
        
        const result = await CustomerService.addToCart(userId, cartItemData);
        
        res.json({
            success: true,
            message: '商品已加入購物車',
            data: result,
            cartSummary: {
                totalItems: result.totalItems,
                totalAmount: result.totalAmount
            }
        });
        
    } catch (error) {
        console.error('加入購物車時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '加入購物車失敗',
            error: error.message
        });
    }
});

// 更新購物車項目數量
router.put('/cart/:userId/update/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const { quantity } = req.body;
        
        console.log(`收到更新購物車請求: 用戶=${userId}, 項目=${itemId}, 數量=${quantity}`);
        
        const result = await CustomerService.updateCartItemQuantity(userId, itemId, parseInt(quantity));
        
        if (result.success) {
            res.json({
                success: true,
                message: quantity > 0 ? '數量已更新' : '商品已移除',
                data: result,
                cartSummary: {
                    totalItems: result.totalItems,
                    totalAmount: result.totalAmount
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('更新購物車項目時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新購物車項目失敗',
            error: error.message
        });
    }
});

// 從購物車移除項目
router.delete('/cart/:userId/remove/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        
        console.log(`收到移除購物車項目請求: 用戶=${userId}, 項目=${itemId}`);
        
        const result = await CustomerService.removeFromCart(userId, itemId);
        
        if (result.success) {
            res.json({
                success: true,
                message: '商品已從購物車移除',
                data: result,
                cartSummary: {
                    totalItems: result.totalItems,
                    totalAmount: result.totalAmount
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('移除購物車項目時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '移除購物車項目失敗',
            error: error.message
        });
    }
});

// 清空購物車
router.delete('/cart/:userId/clear', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`收到清空購物車請求: 用戶=${userId}`);
        
        const result = await CustomerService.clearCart(userId);
        
        res.json({
            success: true,
            message: result.message,
            data: result
        });
        
    } catch (error) {
        console.error('清空購物車時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '清空購物車失敗',
            error: error.message
        });
    }
});

// 創建訂單
router.post('/orders', async (req, res) => {
    try {
        const { userId, orderData } = req.body;
        console.log('收到創建訂單請求:', { userId, orderData });
        
        if (!userId || !orderData) {
            return res.status(400).json({
                success: false,
                message: '缺少必要的訂單資料'
            });
        }
        
        const { customerInfo, items, summary } = orderData;
        
        // 1. 檢查或創建客戶記錄
        let customer = await NotionService.getCustomerByLineId(userId);
        
        if (!customer) {
            console.log('客戶不存在，創建新客戶記錄');
            const customerData = {
                name: customerInfo.recipientName,
                lineId: userId,
                phone: customerInfo.recipientPhone,
                deliveryMethod: customerInfo.deliveryMethod,
                address: customerInfo.deliveryAddress
            };
            customer = await NotionService.createCustomer(customerData);
        } else {
            console.log('找到現有客戶:', customer.name);
        }
        
        // 2. 創建訂單記錄
        const orderRecord = {
            customerId: customer.id,
            recipientName: customerInfo.recipientName,
            recipientPhone: customerInfo.recipientPhone,
            deliveryMethod: customerInfo.deliveryMethod,
            deliveryAddress: customerInfo.deliveryAddress,
            paymentMethod: customerInfo.paymentMethod,
            totalAmount: summary.totalAmount,
            shippingFee: summary.shippingFee,
            discount: 0,
            notes: customerInfo.orderNotes || ''
        };
        
        const order = await NotionService.createOrder(orderRecord);
        console.log('訂單已創建:', order.id);
        
        // 3. 創建訂單項目記錄
        const orderItems = [];
        for (const item of items) {
            const orderItemData = {
                orderId: order.id,
                variantId: item.variantId || '',
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.price,
                notes: `規格: ${item.variantName || '標準'}`
            };
            
            const orderItem = await NotionService.createOrderItem(orderItemData);
            orderItems.push(orderItem);
        }
        
        console.log(`已創建 ${orderItems.length} 個訂單項目`);
        
        // 4. 清空購物車
        await CustomerService.clearCart(userId);
        
        // 5. 發送 LINE Notify 通知管理員
        try {
            const notifyMessage = `🎉 新訂單通知！
            
📦 訂單編號：${order.orderNumber || order.id}
👤 客戶：${customer.name} (${customerInfo.recipientPhone})
🚚 收件方式：${customerInfo.deliveryMethod}
📍 收件地址：${customerInfo.deliveryAddress}
💳 付款方式：${customerInfo.paymentMethod}
💰 訂單金額：$${summary.finalAmount}

📋 訂購商品：
${items.map(item => `• ${item.productName} ${item.variantName ? `(${item.variantName})` : ''} x${item.quantity} = $${item.subtotal}`).join('\n')}

⏰ 下單時間：${new Date().toLocaleString('zh-TW')}

請儘速處理此訂單 🚀`;

            await NotifyService.sendOrderNotification(notifyMessage);
            console.log('管理員通知已發送');
        } catch (notifyError) {
            console.error('發送管理員通知失敗:', notifyError);
            // 不影響訂單創建流程
        }
        
        // 發送客戶確認訊息
        try {
            const { Client } = require('@line/bot-sdk');
            const config = {
                channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
                channelSecret: process.env.LINE_CHANNEL_SECRET
            };
            const client = new Client(config);
            
            const customerMessage = `✅ 訂單確認通知

感謝您的購買！您的訂單已成功送出。

📦 訂單編號：${order.orderNumber || order.id}
💰 訂單金額：$${summary.finalAmount}
🚚 收件方式：${customerInfo.deliveryMethod}
💳 付款方式：${customerInfo.paymentMethod}

${customerInfo.paymentMethod === '銀行轉帳' ? '💰 請記得在3天內完成轉帳，轉帳資訊請聯絡客服。' : customerInfo.paymentMethod === 'LINE Pay' ? '💳 我們將盡快發送付款連結給您。' : '💵 商品到貨時請準備現金付款。'}

我們將透過 LINE 通知您訂單處理進度。
如有任何問題，歡迎隨時聯絡我們！

Cyndi韓國童裝代購 💕`;

            await client.pushMessage(userId, {
                type: 'text',
                text: customerMessage
            });
            
            console.log('客戶確認訊息已發送');
        } catch (pushError) {
            console.error('發送客戶確認訊息失敗:', pushError);
            // 不影響訂單創建流程
        }
        
        // 6. 準備回應資料
        const orderResponse = {
            orderId: order.id,
            orderNumber: order.orderNumber || `ORDER-${Date.now()}`,
            customer: {
                name: customer.name,
                phone: customerInfo.recipientPhone
            },
            delivery: {
                method: customerInfo.deliveryMethod,
                address: customerInfo.deliveryAddress
            },
            payment: {
                method: customerInfo.paymentMethod,
                status: '未付款'
            },
            items: orderItems.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal
            })),
            summary: {
                totalAmount: summary.totalAmount,
                shippingFee: summary.shippingFee,
                finalAmount: summary.finalAmount
            },
            createdAt: order.createdAt
        };
        
        res.json({
            success: true,
            message: '訂單已成功創建',
            data: orderResponse
        });
        
    } catch (error) {
        console.error('創建訂單時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '創建訂單失敗',
            error: error.message
        });
    }
});

// 獲取訂單列表
router.get('/orders/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`收到訂單列表請求: ${userId}`);
        
        // 這裡暫時回傳空訂單列表
        
        res.json({
            success: true,
            data: [],
            total: 0
        });
        
    } catch (error) {
        console.error('獲取訂單列表時發生錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單列表失敗'
        });
    }
});

module.exports = router; 