const { createSupabaseClient } = require('./supabaseClient');

class SupabaseService {
  constructor() {
    this.db = createSupabaseClient();
  }

  // ============== Helpers ==============
  _toDollars(cents) {
    if (cents == null) return 0;
    return Math.round(Number(cents) / 100);
  }

  // ============== Products & Variants ==============
  async getProducts() {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .neq('status', '停售')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // 正規化輸出，對齊現有呼叫點（Notion 版）
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      mainCategory: row.main_category || row.category || '未分類',
      subCategories: row.sub_categories || row.tags || [],
      // 價格以 variants 為準；這裡不回傳 product 預設價
      price: null,
      imageUrl: row.image_url || null,
      status: row.status || null,
    }));
  }

  async getProductById(productId) {
    const { data, error } = await this.db
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    if (error) throw error;
    // 正規化輸出
    return {
      id: data.id,
      name: data.name,
      mainCategory: data.main_category || data.category || '未分類',
      subCategories: data.sub_categories || data.tags || [],
      price: null,
      imageUrl: data.image_url || null,
      status: data.status || null,
    };
  }

  async getProductVariants(productId) {
    const { data, error } = await this.db
      .from('variants')
      .select('*')
      .eq('product_id', productId)
      .order('style', { ascending: true })
      .order('size', { ascending: true })
      .order('color', { ascending: true });
    if (error) throw error;
    return (data || []).map((v) => ({
      id: v.id,
      productId: v.product_id,
      style: v.style || null,
      color: v.color || null,
      size: v.size || null,
      price: this._toDollars(v.price_cents),
      price_cents: v.price_cents || null,
      imageUrl: v.image_url || null,
      status: v.status || null,
    }));
  }

  async getVariantById(variantId) {
    const { data, error } = await this.db
      .from('variants')
      .select('*, products!inner(name, code, image_url)')
      .eq('id', variantId)
      .single();
    if (error) throw error;
    // 正規化回傳結構，對齊現有呼叫點
    return {
      id: data.id,
      productId: data.product_id,
      name: data.products?.name || data.style || data.color || '變體',
      color: data.color,
      size: data.size,
      price: this._toDollars(data.price_cents),
      price_cents: data.price_cents,
      imageUrl: data.image_url,
    };
  }

  async searchProducts(keyword, category) {
    // 先做簡單條件，必要時改用 RPC 或全文索引
    let query = this.db
      .from('products')
      .select('*')
      .neq('status', '停售');

    if (category) query = query.eq('main_category', category);
    if (keyword) query = query.ilike('name', `%${keyword}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      mainCategory: row.main_category || row.category || '未分類',
      subCategories: row.sub_categories || row.tags || [],
      price: null,
      imageUrl: row.image_url || null,
      status: row.status || null,
    }));
  }

  // ============== Customers ==============
  async getCustomerByLineId(lineId) {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('line_id', lineId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createOrUpdateCustomer(payload) {
    // 以 line_id 為準 upsert
    const { data, error } = await this.db
      .from('customers')
      .upsert(
        {
          line_id: payload.lineId,
          name: payload.name || null,
          phone: payload.phone || null,
          address: payload.address || null,
          delivery_pref: payload.deliveryPref || null,
        },
        { onConflict: 'line_id' }
      )
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createCustomer(payload) {
    const { data, error } = await this.db
      .from('customers')
      .insert({
        line_id: payload.lineId || null,
        name: payload.name || null,
        phone: payload.phone || null,
        address: payload.address || null,
        delivery_pref: payload.deliveryMethod || payload.deliveryPref || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  // ============== Orders ==============
  async createOrder(orderRecord) {
    const totalCents = Math.round((orderRecord.totalAmount || 0) * 100);
    const shippingFeeCents = Math.round((orderRecord.shippingFee || 0) * 100);
    const discountCents = Math.round((orderRecord.discount || 0) * 100);
    const finalCents = totalCents + shippingFeeCents - discountCents;

    const { data, error } = await this.db
      .from('orders')
      .insert({
        customer_id: orderRecord.customerId,
        recipient_name: orderRecord.recipientName || null,
        recipient_phone: orderRecord.recipientPhone || null,
        delivery_method: orderRecord.deliveryMethod || null,
        delivery_address: orderRecord.deliveryAddress || null,
        payment_method: orderRecord.paymentMethod || null,
        total_cents: totalCents,
        shipping_fee_cents: shippingFeeCents,
        discount_cents: discountCents,
        final_cents: finalCents,
        notes: orderRecord.notes || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async createOrderItem(item) {
    const unitPriceCents = Math.round((item.unitPrice || 0) * 100);
    const quantity = item.quantity || 1;
    const subtotalCents = unitPriceCents * quantity;

    const { data, error } = await this.db
      .from('order_items')
      .insert({
        order_id: item.orderId,
        variant_id: item.variantId || null,
        product_name: item.productName || null,
        quantity,
        unit_price_cents: unitPriceCents,
        subtotal_cents: subtotalCents,
        note: item.notes || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    // 正規化以符合現有回傳使用
    return {
      ...data,
      subtotal: this._toDollars(subtotalCents),
      unitPrice: this._toDollars(unitPriceCents),
    };
  }

  // ============== Orders - Advanced Queries ==============

  // 獲取所有訂單（帶分頁和篩選）
  async getAllOrders(filters = {}) {
    const { status, mergeStatus, page = 1, limit = 20, search } = filters;

    let query = this.db
      .from('orders')
      .select(`
        *,
        customers!inner(id, name, line_id, phone)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 狀態篩選
    if (status) {
      query = query.eq('status', status);
    }

    // 併單狀態篩選
    if (mergeStatus) {
      query = query.eq('merge_status', mergeStatus);
    }

    // 搜尋功能（收件人姓名或電話）
    if (search) {
      query = query.or(`recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      orders: (data || []).map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        customerName: order.customers?.name || order.recipient_name,
        recipientName: order.recipient_name,
        recipientPhone: order.recipient_phone,
        deliveryMethod: order.delivery_method,
        deliveryAddress: order.delivery_address,
        status: order.status,
        mergeStatus: order.merge_status,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        totalAmount: this._toDollars(order.total_cents),
        shippingFee: this._toDollars(order.shipping_fee_cents),
        discount: this._toDollars(order.discount_cents),
        finalAmount: this._toDollars(order.final_cents),
        estimatedDelivery: order.estimated_arrival,
        notes: order.note,
        createdAt: order.created_at,
      })),
      hasMore: data && data.length === limit,
      totalCount: count || data.length,
    };
  }

  // 根據客戶 ID 獲取訂單
  async getOrdersByCustomerId(customerId) {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      recipientName: order.recipient_name,
      status: order.status,
      totalAmount: this._toDollars(order.total_cents),
      finalAmount: this._toDollars(order.final_cents),
      createdAt: order.created_at,
    }));
  }

  // 更新訂單狀態
  async updateOrderStatus(orderId, status, notes) {
    const updateData = {
      status,
      last_transition_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.note = notes;
    }

    const { data, error } = await this.db
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      orderNumber: data.order_number,
      status: data.status,
      notes: data.note,
    };
  }

  // ============== Customers - Advanced Queries ==============

  // 獲取所有客戶（帶分頁和篩選）
  async getAllCustomers(filters = {}) {
    const { page = 1, limit = 20, search, level } = filters;

    let query = this.db
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 客戶等級篩選
    if (level) {
      query = query.eq('level', level);
    }

    // 搜尋功能（姓名、電話或 LINE ID）
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,line_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // 為每個客戶獲取統計信息
    const customersWithStats = await Promise.all(
      (data || []).map(async (customer) => {
        const orders = await this.getOrdersByCustomerId(customer.id);
        const stats = this.calculateCustomerStats(orders);

        return {
          id: customer.id,
          name: customer.name,
          lineId: customer.line_id,
          phone: customer.phone,
          deliveryMethod: customer.delivery_pref,
          address: customer.address,
          customerLevel: customer.level,
          totalSpent: customer.total_cents ? this._toDollars(customer.total_cents) : stats.totalSpent,
          orderCount: customer.order_count || stats.totalOrders,
          createdAt: customer.created_at,
          stats,
        };
      })
    );

    return {
      customers: customersWithStats,
      hasMore: data && data.length === limit,
      nextCursor: null,
      total: count || data.length,
    };
  }

  // 獲取客戶詳情
  async getCustomerDetails(customerId) {
    // 獲取客戶基本資料
    const { data: customer, error: customerError } = await this.db
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // 獲取客戶訂單歷史
    const orders = await this.getOrdersByCustomerId(customerId);

    // 計算統計數據
    const stats = this.calculateCustomerStats(orders);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        lineId: customer.line_id,
        phone: customer.phone,
        deliveryMethod: customer.delivery_pref,
        address: customer.address,
        customerLevel: customer.level,
        birthday: customer.birthday,
        notes: customer.note,
        createdAt: customer.created_at,
      },
      orders,
      stats,
    };
  }

  // 計算客戶統計數據
  calculateCustomerStats(orders) {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null,
        completedOrders: 0,
        cancelledOrders: 0,
      };
    }

    const completedOrders = orders.filter(order => order.status === 'COMPLETED');
    const cancelledOrders = orders.filter(order => order.status === 'CANCELED');
    const totalSpent = completedOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;
    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

    return {
      totalOrders: orders.length,
      totalSpent,
      averageOrderValue: Math.round(averageOrderValue),
      lastOrderDate,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
    };
  }

  // 更新客戶資料
  async updateCustomer(customerId, updateData) {
    const updates = {};

    if (updateData.name) updates.name = updateData.name;
    if (updateData.phone) updates.phone = updateData.phone;
    if (updateData.level) updates.level = updateData.level;
    if (updateData.deliveryMethod) updates.delivery_pref = updateData.deliveryMethod;
    if (updateData.address) updates.address = updateData.address;
    if (updateData.notes) updates.note = updateData.notes;
    if (updateData.birthday) updates.birthday = updateData.birthday;

    const { data, error } = await this.db
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      lineId: data.line_id,
      phone: data.phone,
      deliveryMethod: data.delivery_pref,
      address: data.address,
      customerLevel: data.level,
      birthday: data.birthday,
      notes: data.note,
    };
  }

  // ============== Dashboard & Statistics ==============

  // 獲取儀表板統計數據
  async getDashboardStats() {
    // 獲取訂單統計
    const { data: orders, error: ordersError } = await this.db
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (ordersError) throw ordersError;

    // 獲取客戶統計
    const { count: totalCustomers, error: customersError } = await this.db
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (customersError) throw customersError;

    // 計算統計數據
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o =>
      o.status === 'WAITING_PAYMENT' || o.status === 'PAID'
    ).length;
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELED')
      .reduce((sum, o) => sum + (o.final_cents || 0), 0);

    // 獲取最近訂單
    const recentOrders = orders.slice(0, 5).map(order => ({
      orderNumber: order.order_number || `ORDER-${order.id.slice(-8)}`,
      customerName: order.recipient_name,
      amount: this._toDollars(order.final_cents),
      status: order.status,
      createdAt: order.created_at,
    }));

    // 生成銷售趨勢數據
    const salesTrend = this.generateSalesTrend(orders);

    return {
      overview: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: this._toDollars(totalRevenue),
        totalCustomers: totalCustomers || 0,
        monthlyGrowth: 0,
      },
      recentOrders,
      topProducts: [],
      chartData: {
        salesTrend,
        orderStatus: [
          { label: 'WAITING_PAYMENT', value: orders.filter(o => o.status === 'WAITING_PAYMENT').length },
          { label: 'PAID', value: orders.filter(o => o.status === 'PAID').length },
          { label: 'FULFILLING', value: orders.filter(o => o.status === 'FULFILLING').length },
          { label: 'SHIPPED', value: orders.filter(o => o.status === 'SHIPPED').length },
          { label: 'COMPLETED', value: orders.filter(o => o.status === 'COMPLETED').length },
          { label: 'CANCELED', value: orders.filter(o => o.status === 'CANCELED').length },
        ],
      },
    };
  }

  // 生成銷售趨勢數據
  generateSalesTrend(orders) {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === dateStr && order.status !== 'CANCELED';
      });

      const dayAmount = dayOrders.reduce((sum, order) =>
        sum + this._toDollars(order.final_cents || 0), 0
      );

      last7Days.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        amount: dayAmount,
      });
    }

    return last7Days;
  }

  // ============== Products - Advanced Management ==============

  // 獲取所有商品（管理用）
  async getAllProductsForAdmin(filters = {}) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getAllProductsForAdmin(filters);
  }

  // 獲取商品銷售統計
  async getProductSalesStats(variantId) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getProductSalesStats(variantId);
  }

  // 更新商品資料
  async updateProduct(variantId, updateData) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.updateProduct(variantId, updateData);
  }

  // 獲取商品詳情（管理用）
  async getProductDetailForAdmin(variantId) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getProductDetailForAdmin(variantId);
  }

  // 獲取商品最近訂單
  async getProductRecentOrders(variantId, limit = 10) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getProductRecentOrders(variantId, limit);
  }

  // 獲取相關變體
  async getRelatedVariants(productId, excludeVariantId) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getRelatedVariants(productId, excludeVariantId);
  }

  // 獲取熱銷商品
  async getTopSellingProducts(limit = 10) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getTopSellingProducts(limit);
  }

  // ============== Batches & Parcels ==============

  // 建立出貨批次
  async createBatch(batchData) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.createBatch(batchData);
  }

  // 獲取所有批次
  async getAllBatches(filters = {}) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getAllBatches(filters);
  }

  // 更新批次狀態
  async updateBatchStatus(batchId, status, notes) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.updateBatchStatus(batchId, status, notes);
  }

  // 建立包裹
  async createParcel(parcelData) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.createParcel(parcelData);
  }

  // 獲取批次的所有包裹
  async getParcelsByBatchId(batchId) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getParcelsByBatchId(batchId);
  }

  // 更新包裹狀態
  async updateParcelStatus(parcelId, status, trackingNo) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.updateParcelStatus(parcelId, status, trackingNo);
  }

  // ============== Sales Reports ==============

  // 獲取銷售報表
  async getSalesReport(filters = {}) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getSalesReport(filters);
  }

  // 獲取訂單項目（用於報表）
  async getOrderItemsForReport(orderIds) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getOrderItemsForReport(orderIds);
  }

  // 計算銷售摘要
  calculateSalesSummary(orders, orderItems) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.calculateSalesSummary(orders, orderItems);
  }

  // 生成銷售趨勢
  generateSalesTrends(orders, period = 'daily') {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.generateSalesTrends(orders, period);
  }

  // 從訂單項目分析熱銷商品
  getTopSellingProductsFromOrders(orderItems, limit = 10) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.getTopSellingProductsFromOrders(orderItems, limit);
  }

  // 分析分類銷售
  analyzeSalesByCategory(orderItems) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.analyzeSalesByCategory(orderItems);
  }

  // 分析客戶行為
  analyzeCustomerBehavior(orders) {
    const advancedService = require('./supabaseServiceAdvanced');
    return advancedService.analyzeCustomerBehavior(orders);
  }

  // 生成期間比較報表
  async generatePeriodComparison(currentPeriod, previousPeriod) {
    const currentReport = await this.getSalesReport(currentPeriod);
    const previousReport = await this.getSalesReport(previousPeriod);

    const comparison = {
      current: currentReport.summary,
      previous: previousReport.summary,
      growth: {},
    };

    // 計算成長率
    Object.keys(currentReport.summary).forEach(key => {
      const current = currentReport.summary[key] || 0;
      const previous = previousReport.summary[key] || 0;

      if (previous === 0) {
        comparison.growth[key] = current > 0 ? 100 : 0;
      } else {
        comparison.growth[key] = ((current - previous) / previous) * 100;
      }
    });

    return comparison;
  }

  // ============== Compatibility Methods (與 Notion 版本對齊) ==============

  // 根據 ID 獲取單一變體資訊
  async getVariantById(variantId) {
    const { data, error } = await this.db
      .from('variants')
      .select(`
        *,
        products!inner(name, code, image_url)
      `)
      .eq('id', variantId)
      .single();

    if (error) {
      console.error('獲取變體資訊失敗:', error);
      return null;
    }

    return {
      id: data.id,
      productId: data.product_id,
      name: data.products?.name || '未知商品',
      color: data.color,
      size: data.size,
      price: this._toDollars(data.price_cents),
      price_cents: data.price_cents,
      imageUrl: data.image_url,
    };
  }

  // 根據 ID 獲取單一客戶資料
  async getCustomerById(customerId) {
    const { data, error } = await this.db
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('獲取客戶資料失敗:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      lineId: data.line_id,
      phone: data.phone,
      deliveryMethod: data.delivery_pref,
      address: data.address,
      customerLevel: data.level,
      birthday: data.birthday,
      notes: data.note,
      createdAt: data.created_at,
    };
  }
}

module.exports = new SupabaseService(); 