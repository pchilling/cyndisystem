/**
 * Supabase Service - Advanced Features
 * 包含商品管理、批次出貨、銷售報表等進階功能
 */

const { createSupabaseClient } = require('./supabaseClient');

class SupabaseServiceAdvanced {
  constructor() {
    this.db = createSupabaseClient();
  }

  // ============== Helper Functions ==============
  _toDollars(cents) {
    if (cents == null) return 0;
    return Math.round(Number(cents) / 100);
  }

  // ============== Products - Advanced Management ==============

  // 獲取所有商品（管理用，包含詳細統計）
  async getAllProductsForAdmin(filters = {}) {
    const { page = 1, limit = 20, search, style, color, size, gender, status } = filters;

    let query = this.db
      .from('variants')
      .select(`
        *,
        products!inner(id, name, code, main_category, image_url)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 狀態篩選
    if (status) {
      query = query.eq('status', status);
    }

    // 商品名稱搜尋
    if (search) {
      query = query.ilike('products.name', `%${search}%`);
    }

    // 款式篩選
    if (style) {
      query = query.eq('style', style);
    }

    // 顏色篩選
    if (color) {
      query = query.eq('color', color);
    }

    // 尺寸篩選
    if (size) {
      query = query.eq('size', size);
    }

    // 性別篩選
    if (gender) {
      query = query.eq('gender', gender);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // 為每個變體獲取銷售統計
    const variantsWithStats = await Promise.all(
      (data || []).map(async (variant) => {
        const salesStats = await this.getProductSalesStats(variant.id);

        return {
          id: variant.id,
          name: variant.products?.name || '未知商品',
          productCode: variant.products?.code || variant.id.slice(-8),
          price: this._toDollars(variant.price_cents),
          mainCategory: variant.products?.main_category || '未分類',
          status: variant.status,
          variants: [{
            id: variant.id,
            style: variant.style,
            color: variant.color,
            size: variant.size,
            gender: variant.gender,
            price: this._toDollars(variant.price_cents),
            imageUrl: variant.image_url,
            status: variant.status,
          }],
          stats: salesStats,
          description: `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim(),
        };
      })
    );

    return {
      products: variantsWithStats,
      hasMore: data && data.length === limit,
      nextCursor: null,
      total: count || data.length,
    };
  }

  // 獲取商品銷售統計
  async getProductSalesStats(variantId) {
    const { data, error } = await this.db
      .from('order_items')
      .select('quantity, unit_price_cents, created_at')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`獲取變體 ${variantId} 銷售統計失敗:`, error);
      return {
        totalSold: 0,
        totalRevenue: 0,
        averagePrice: 0,
        stockLevel: 0,
        lastSold: null,
      };
    }

    if (!data || data.length === 0) {
      return {
        totalSold: 0,
        totalRevenue: 0,
        averagePrice: 0,
        stockLevel: 0,
        lastSold: null,
      };
    }

    const totalSold = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalRevenueCents = data.reduce(
      (sum, item) => sum + (item.unit_price_cents || 0) * (item.quantity || 0),
      0
    );
    const averagePrice = totalSold > 0 ? totalRevenueCents / totalSold : 0;

    return {
      totalSold,
      totalRevenue: this._toDollars(totalRevenueCents),
      averagePrice: this._toDollars(averagePrice),
      stockLevel: 0,
      lastSold: data[0]?.created_at || null,
    };
  }

  // 更新商品資料
  async updateProduct(variantId, updateData) {
    const updates = {};

    if (updateData.price !== undefined) {
      updates.price_cents = Math.round(updateData.price * 100);
    }

    if (updateData.status) {
      updates.status = updateData.status;
    }

    if (updateData.style) {
      updates.style = updateData.style;
    }

    if (updateData.color) {
      updates.color = updateData.color;
    }

    if (updateData.size) {
      updates.size = updateData.size;
    }

    const { data, error } = await this.db
      .from('variants')
      .update(updates)
      .eq('id', variantId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      style: data.style,
      color: data.color,
      size: data.size,
      price: this._toDollars(data.price_cents),
      status: data.status,
    };
  }

  // 獲取商品詳情（含銷售統計和最近訂單）
  async getProductDetailForAdmin(variantId) {
    // 獲取變體資料
    const { data: variant, error: variantError } = await this.db
      .from('variants')
      .select(`
        *,
        products!inner(id, name, code, main_category, image_url)
      `)
      .eq('id', variantId)
      .single();

    if (variantError) throw variantError;

    // 獲取銷售統計
    const salesStats = await this.getProductSalesStats(variantId);

    // 獲取最近訂單
    const recentOrders = await this.getProductRecentOrders(variantId);

    // 獲取相關變體
    const relatedVariants = await this.getRelatedVariants(variant.product_id, variantId);

    return {
      variant: {
        id: variant.id,
        productId: variant.product_id,
        name: variant.products?.name || '未知商品',
        productCode: variant.products?.code,
        style: variant.style,
        color: variant.color,
        size: variant.size,
        gender: variant.gender,
        price: this._toDollars(variant.price_cents),
        imageUrl: variant.image_url,
        status: variant.status,
      },
      stats: salesStats,
      recentOrders,
      relatedVariants,
    };
  }

  // 獲取商品最近訂單
  async getProductRecentOrders(variantId, limit = 10) {
    const { data, error } = await this.db
      .from('order_items')
      .select(`
        *,
        orders!inner(id, order_number, status, created_at, recipient_name)
      `)
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('獲取商品最近訂單失敗:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      orderId: item.order_id,
      orderNumber: item.orders?.order_number,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: this._toDollars(item.unit_price_cents),
      status: item.orders?.status,
      customerName: item.orders?.recipient_name,
      createdAt: item.orders?.created_at,
    }));
  }

  // 獲取相關變體（同一商品的其他變體）
  async getRelatedVariants(productId, excludeVariantId) {
    const { data, error } = await this.db
      .from('variants')
      .select('*')
      .eq('product_id', productId)
      .neq('id', excludeVariantId)
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('獲取相關變體失敗:', error);
      return [];
    }

    return (data || []).map(v => ({
      id: v.id,
      style: v.style,
      color: v.color,
      size: v.size,
      price: this._toDollars(v.price_cents),
      status: v.status,
    }));
  }

  // 獲取熱銷商品排行
  async getTopSellingProducts(limit = 10) {
    // 使用聚合查詢獲取銷售量最高的商品
    const { data, error } = await this.db
      .rpc('get_top_selling_variants', { limit_count: limit });

    if (error) {
      console.error('獲取熱銷商品失敗:', error);
      // 如果 RPC 不存在，使用備用方案
      return this.getTopSellingProductsFallback(limit);
    }

    return (data || []).map(item => ({
      id: item.variant_id,
      name: item.product_name,
      totalSold: item.total_quantity,
      totalRevenue: this._toDollars(item.total_revenue_cents),
      averagePrice: this._toDollars(Math.round(item.total_revenue_cents / item.total_quantity)),
    }));
  }

  // 備用方案：手動計算熱銷商品
  async getTopSellingProductsFallback(limit = 10) {
    const { data, error } = await this.db
      .from('order_items')
      .select('variant_id, product_name, quantity, unit_price_cents');

    if (error) throw error;

    const productStats = {};

    (data || []).forEach(item => {
      const key = item.variant_id || item.product_name;
      if (!productStats[key]) {
        productStats[key] = {
          id: item.variant_id,
          name: item.product_name,
          totalSold: 0,
          totalRevenue: 0,
        };
      }

      productStats[key].totalSold += item.quantity || 0;
      productStats[key].totalRevenue += (item.unit_price_cents || 0) * (item.quantity || 0);
    });

    return Object.values(productStats)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit)
      .map(item => ({
        ...item,
        totalRevenue: this._toDollars(item.totalRevenue),
        averagePrice: item.totalSold > 0 ? this._toDollars(Math.round(item.totalRevenue / item.totalSold)) : 0,
      }));
  }

  // ============== Batches & Parcels (批次出貨管理) ==============

  // 建立出貨批次
  async createBatch(batchData) {
    const { data, error } = await this.db
      .from('batches')
      .insert({
        name: batchData.name || `批次-${new Date().toISOString().split('T')[0]}`,
        status: batchData.status || 'PLANNING',
        notes: batchData.notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  // 獲取所有批次
  async getAllBatches(filters = {}) {
    const { status, page = 1, limit = 20 } = filters;

    let query = this.db
      .from('batches')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      batches: (data || []).map(batch => ({
        id: batch.id,
        name: batch.name,
        status: batch.status,
        notes: batch.notes,
        createdAt: batch.created_at,
      })),
      total: count || data.length,
      hasMore: data && data.length === limit,
    };
  }

  // 更新批次狀態
  async updateBatchStatus(batchId, status, notes) {
    const updateData = { status };
    if (notes) updateData.notes = notes;

    const { data, error } = await this.db
      .from('batches')
      .update(updateData)
      .eq('id', batchId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      notes: data.notes,
    };
  }

  // 建立包裹
  async createParcel(parcelData) {
    const shippingFeeCents = Math.round((parcelData.shippingFee || 0) * 100);

    const { data, error } = await this.db
      .from('parcels')
      .insert({
        customer_id: parcelData.customerId,
        batch_id: parcelData.batchId || null,
        status: parcelData.status || 'WAITING_PAYMENT',
        tracking_no: parcelData.trackingNo || null,
        shipping_info: parcelData.shippingInfo || null,
        shipping_fee_cents: shippingFeeCents,
        currency_code: parcelData.currencyCode || 'TWD',
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      customerId: data.customer_id,
      batchId: data.batch_id,
      status: data.status,
      trackingNo: data.tracking_no,
      shippingFee: this._toDollars(data.shipping_fee_cents),
      createdAt: data.created_at,
    };
  }

  // 獲取批次的所有包裹
  async getParcelsByBatchId(batchId) {
    const { data, error } = await this.db
      .from('parcels')
      .select(`
        *,
        customers!inner(id, name, phone)
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(parcel => ({
      id: parcel.id,
      customerId: parcel.customer_id,
      customerName: parcel.customers?.name,
      customerPhone: parcel.customers?.phone,
      status: parcel.status,
      trackingNo: parcel.tracking_no,
      shippingFee: this._toDollars(parcel.shipping_fee_cents),
      createdAt: parcel.created_at,
    }));
  }

  // 更新包裹狀態
  async updateParcelStatus(parcelId, status, trackingNo) {
    const updateData = { status };
    if (trackingNo) updateData.tracking_no = trackingNo;

    if (status === 'SHIPPED') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'PAID') {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await this.db
      .from('parcels')
      .update(updateData)
      .eq('id', parcelId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      status: data.status,
      trackingNo: data.tracking_no,
      paidAt: data.paid_at,
      shippedAt: data.shipped_at,
    };
  }

  // ============== Sales Reports (銷售報表) ==============

  // 獲取銷售報表
  async getSalesReport(filters = {}) {
    const { startDate, endDate, period = 'daily' } = filters;

    let query = this.db
      .from('orders')
      .select('*')
      .neq('status', 'CANCELED')
      .order('created_at', { ascending: true });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query.limit(100);
    if (error) throw error;

    // 獲取訂單項目數據
    const orderIds = orders.map(o => o.id);
    const orderItems = await this.getOrderItemsForReport(orderIds);

    // 生成報表數據
    return {
      summary: this.calculateSalesSummary(orders, orderItems),
      trends: this.generateSalesTrends(orders, period),
      topProducts: this.getTopSellingProductsFromOrders(orderItems),
      categoryAnalysis: this.analyzeSalesByCategory(orderItems),
      customerAnalysis: this.analyzeCustomerBehavior(orders),
    };
  }

  // 獲取訂單項目（用於報表）
  async getOrderItemsForReport(orderIds) {
    if (!orderIds || orderIds.length === 0) return [];

    const { data, error } = await this.db
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (error) {
      console.error('獲取訂單項目數據失敗:', error);
      return [];
    }

    return data || [];
  }

  // 計算銷售摘要
  calculateSalesSummary(orders, orderItems) {
    const summary = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalItems: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0,
    };

    orders.forEach(order => {
      summary.totalRevenue += this._toDollars(order.final_cents || 0);

      if (order.status === 'COMPLETED') {
        summary.completedOrders++;
      } else {
        summary.pendingOrders++;
      }
    });

    summary.totalItems = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    summary.averageOrderValue = summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0;

    return summary;
  }

  // 生成銷售趨勢
  generateSalesTrends(orders, period = 'daily') {
    const groupedData = {};

    orders.forEach(order => {
      if (!order.created_at) return;

      const date = new Date(order.created_at);
      let key;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          orders: 0,
          revenue: 0,
        };
      }

      groupedData[key].orders++;
      groupedData[key].revenue += this._toDollars(order.final_cents || 0);
    });

    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 從訂單項目分析熱銷商品
  getTopSellingProductsFromOrders(orderItems, limit = 10) {
    const productStats = {};

    orderItems.forEach(item => {
      const key = item.product_name || 'Unknown';
      if (!productStats[key]) {
        productStats[key] = {
          name: key,
          totalSold: 0,
          totalRevenue: 0,
          orderCount: 0,
        };
      }

      productStats[key].totalSold += item.quantity || 0;
      productStats[key].totalRevenue += this._toDollars((item.unit_price_cents || 0) * (item.quantity || 0));
      productStats[key].orderCount++;
    });

    return Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  // 分析分類銷售
  analyzeSalesByCategory(orderItems) {
    // 簡化版本，可根據實際需求擴展
    return [{
      name: '童裝',
      totalSold: orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      totalRevenue: orderItems.reduce((sum, item) =>
        sum + this._toDollars((item.unit_price_cents || 0) * (item.quantity || 0)), 0
      ),
      orderCount: orderItems.length,
    }];
  }

  // 分析客戶行為
  analyzeCustomerBehavior(orders) {
    const customerData = {};

    orders.forEach(order => {
      const customerId = order.customer_id;
      if (!customerId) return;

      if (!customerData[customerId]) {
        customerData[customerId] = {
          id: customerId,
          name: order.recipient_name || 'Unknown',
          orderCount: 0,
          totalSpent: 0,
          firstOrder: order.created_at,
          lastOrder: order.created_at,
        };
      }

      customerData[customerId].orderCount++;
      customerData[customerId].totalSpent += this._toDollars(order.final_cents || 0);

      if (order.created_at > customerData[customerId].lastOrder) {
        customerData[customerId].lastOrder = order.created_at;
      }
    });

    const customers = Object.values(customerData);

    return {
      newCustomers: customers.filter(c => c.orderCount === 1).length,
      returningCustomers: customers.filter(c => c.orderCount > 1).length,
      averageOrdersPerCustomer: customers.length > 0
        ? customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length
        : 0,
      topCustomers: customers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10),
    };
  }
}

module.exports = new SupabaseServiceAdvanced();
