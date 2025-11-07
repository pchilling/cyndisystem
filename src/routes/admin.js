const express = require('express');
const router = express.Router();
const SupabaseService = require('../services/supabaseService');
const { createSupabaseClient } = require('../services/supabaseClient');

const db = createSupabaseClient();

// 管理員認證中間件 (暫時禁用以便測試)
function adminAuth(req, res, next) {
    next(); // 暫時允許所有請求
}

// ============== Dashboard ==============
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // 獲取訂單統計
        const { data: orders, error: ordersError } = await db
            .from('orders')
            .select('id, status, final_cents');

        if (ordersError) throw ordersError;

        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === '待付款').length;
        const completedOrders = orders.filter(o => o.status === '已完成').length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.final_cents || 0), 0) / 100;

        // 獲取客戶數量
        const { count: customerCount, error: customerError } = await db
            .from('customers')
            .select('*', { count: 'exact', head: true });

        if (customerError) throw customerError;

        res.json({
            success: true,
            data: {
                overview: {
                    totalOrders,
                    pendingOrders,
                    completedOrders,
                    totalRevenue: Math.round(totalRevenue),
                    totalCustomers: customerCount || 0,
                    monthlyGrowth: 0
                },
                recentOrders: orders.slice(0, 5).map(o => ({
                    id: o.id,
                    orderNumber: o.id.slice(-8),
                    customerName: '客戶',
                    amount: Math.round((o.final_cents || 0) / 100),
                    status: o.status
                })),
                topProducts: [],
                chartData: {
                    salesTrend: [],
                    orderStatus: []
                }
            }
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

// ============== Orders ==============
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        let query = db
            .from('orders')
            .select('*, customers(name, phone)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const orders = (data || []).map(o => ({
            id: o.id,
            orderNumber: o.id.slice(-8),
            customerName: o.customers?.name || '未知客戶',
            customerPhone: o.customers?.phone || '',
            customerId: o.customer_id,
            amount: Math.round((o.final_cents || 0) / 100),
            status: o.status || '待付款',
            mergeStatus: '待併單',
            createdAt: o.created_at
        }));

        res.json({
            success: true,
            data: {
                orders,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('獲取訂單失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單失敗',
            error: error.message
        });
    }
});

router.get('/orders/:orderId', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;

        const { data, error } = await db
            .from('orders')
            .select('*, customers(name, phone)')
            .eq('id', orderId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                id: data.id,
                orderNumber: data.id.slice(-8),
                customerName: data.customers?.name || '未知客戶',
                customerPhone: data.customers?.phone || '',
                amount: Math.round((data.final_cents || 0) / 100),
                status: data.status,
                createdAt: data.created_at
            }
        });
    } catch (error) {
        console.error('取得訂單詳情失敗:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/orders/:orderId/items', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;

        const { data, error } = await db
            .from('order_items')
            .select('*, product_variants(name, color, size, style)')
            .eq('order_id', orderId);

        if (error) throw error;

        const items = (data || []).map(item => ({
            id: item.id,
            productName: item.product_variants?.name || '商品',
            notes: `${item.product_variants?.style || ''} ${item.product_variants?.color || ''} ${item.product_variants?.size || ''}`.trim(),
            quantity: item.quantity,
            unitPrice: Math.round((item.unit_price_cents || 0) / 100),
            subtotal: Math.round((item.subtotal_cents || 0) / 100)
        }));

        res.json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error('取得訂單項目失敗:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.put('/orders/:orderId/status', adminAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;

        const { data, error } = await db
            .from('orders')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: '訂單狀態已更新',
            data
        });
    } catch (error) {
        console.error('更新訂單狀態失敗:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗',
            error: error.message
        });
    }
});

// ============== Customers ==============
router.get('/customers', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, level } = req.query;

        let query = db
            .from('customers')
            .select('*, orders(id, final_cents, created_at)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (level) {
            query = query.eq('level', level);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const customers = (data || []).map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            lineId: c.line_user_id,
            level: c.level || '一般會員',
            deliveryMethod: c.delivery_method,
            address: c.address,
            registeredAt: c.created_at,
            notes: c.notes,
            stats: {
                totalOrders: c.orders?.length || 0,
                totalSpent: c.orders?.reduce((sum, o) => sum + (o.final_cents || 0), 0) / 100 || 0,
                averageOrderValue: c.orders?.length > 0
                    ? (c.orders.reduce((sum, o) => sum + (o.final_cents || 0), 0) / c.orders.length / 100)
                    : 0,
                lastOrderDate: c.orders?.length > 0 ? c.orders[0].created_at : null
            }
        }));

        res.json({
            success: true,
            data: {
                customers,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
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

router.get('/customers/:customerId', adminAuth, async (req, res) => {
    try {
        const { customerId } = req.params;

        const { data: customer, error: customerError } = await db
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

        if (customerError) throw customerError;

        const { data: orders, error: ordersError } = await db
            .from('orders')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, o) => sum + (o.final_cents || 0), 0) / 100;

        res.json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    lineId: customer.line_user_id,
                    level: customer.level,
                    deliveryMethod: customer.delivery_method,
                    address: customer.address,
                    registeredAt: customer.created_at,
                    notes: customer.notes
                },
                stats: {
                    totalOrders,
                    totalSpent: Math.round(totalSpent),
                    averageOrderValue: totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0,
                    lastOrderDate: orders.length > 0 ? orders[0].created_at : null
                },
                orders: orders.map(o => ({
                    id: o.id,
                    totalAmount: Math.round((o.final_cents || 0) / 100),
                    status: o.status,
                    createdAt: o.created_at
                }))
            }
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

router.put('/customers/:customerId', adminAuth, async (req, res) => {
    try {
        const { customerId } = req.params;
        const updateData = req.body;

        const { data, error } = await db
            .from('customers')
            .update({
                name: updateData.name,
                phone: updateData.phone,
                level: updateData.level,
                delivery_method: updateData.deliveryMethod,
                address: updateData.address,
                notes: updateData.notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: '客戶資料已更新',
            data
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

// ============== Products ==============
router.get('/products', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;

        let query = db
            .from('product_variants')
            .select('*, products(name, code, image_url, main_category)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,style.ilike.%${search}%,color.ilike.%${search}%`);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const products = (data || []).map(v => ({
            id: v.id,
            name: v.name || v.products?.name || '商品',
            productCode: v.variant_id || v.products?.code,
            description: `${v.style || ''} ${v.color || ''} ${v.size || ''} ${v.gender || ''}`.trim(),
            price: Math.round((v.price_cents || 0) / 100),
            status: v.status,
            style: v.style,
            color: v.color,
            size: v.size,
            gender: v.gender,
            stats: {
                totalSold: 0,
                totalRevenue: 0,
                lastSold: null
            }
        }));

        res.json({
            success: true,
            data: {
                products,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
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

router.get('/products/:productId', adminAuth, async (req, res) => {
    try {
        const { productId } = req.params;

        const { data: variant, error: variantError } = await db
            .from('product_variants')
            .select('*, products(name, code, image_url)')
            .eq('id', productId)
            .single();

        if (variantError) throw variantError;

        // 獲取相同產品的其他變體
        const { data: relatedVariants, error: relatedError } = await db
            .from('product_variants')
            .select('*')
            .eq('product_id', variant.product_id)
            .neq('id', productId);

        if (relatedError) throw relatedError;

        res.json({
            success: true,
            data: {
                variant: {
                    id: variant.id,
                    name: variant.name || variant.products?.name,
                    variant_id: variant.variant_id,
                    style: variant.style,
                    color: variant.color,
                    size: variant.size,
                    gender: variant.gender,
                    price: Math.round((variant.price_cents || 0) / 100),
                    status: variant.status
                },
                relatedVariants: relatedVariants.map(v => ({
                    style: v.style,
                    color: v.color,
                    size: v.size,
                    gender: v.gender,
                    price: Math.round((v.price_cents || 0) / 100),
                    status: v.status
                })),
                stats: {
                    totalSold: 0,
                    totalRevenue: 0,
                    averagePrice: Math.round((variant.price_cents || 0) / 100),
                    lastSold: null
                },
                recentOrders: []
            }
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

router.put('/products/:productId', adminAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const updateData = req.body;

        const { data, error } = await db
            .from('product_variants')
            .update({
                name: updateData.name,
                price_cents: parseInt(updateData.price) * 100,
                status: updateData.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: '商品資料已更新',
            data
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

// ============== Reports ==============
router.get('/reports/sales', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = db
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data: orders, error } = await query;
        if (error) throw error;

        const totalRevenue = orders.reduce((sum, o) => sum + (o.final_cents || 0), 0) / 100;

        res.json({
            success: true,
            data: {
                summary: {
                    totalOrders: orders.length,
                    totalRevenue: Math.round(totalRevenue),
                    totalItems: 0,
                    averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
                    completedOrders: orders.filter(o => o.status === '已完成').length,
                    pendingOrders: orders.filter(o => o.status === '待付款').length,
                    cancelledOrders: orders.filter(o => o.status === '已取消').length
                },
                trends: [],
                topProducts: [],
                customerAnalysis: {
                    newCustomers: 0,
                    returningCustomers: 0,
                    averageOrdersPerCustomer: 0,
                    topCustomers: []
                }
            }
        });
    } catch (error) {
        console.error('生成銷售報表失敗:', error);
        res.status(500).json({
            success: false,
            message: '生成報表失敗',
            error: error.message
        });
    }
});

module.exports = router;
