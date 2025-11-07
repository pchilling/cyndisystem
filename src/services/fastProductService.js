const NotionService = require('./notionService');

class FastProductService {
  
  // 快速獲取商品列表 - 不包含銷售統計
  static async getProductsForShopping(filters = {}) {
    try {
      const { category, page = 1, limit = 8 } = filters;
      
      // 構建基本查詢條件
      const queryFilter = { and: [] };
      
      // 根據分類設定篩選條件
      switch (category) {
        case 'newest':
          // 最新商品 - 只取最近的商品
          break;
        case 'classic':
          // 經典商品 - 可以篩選特定款式
          break;
        case 'sale':
          // 特價商品
          queryFilter.and.push({
            property: '狀態',
            select: { equals: '特價' }
          });
          break;
        case 'clothing':
          // 一般衣物
          queryFilter.and.push({
            property: '款式',
            select: { equals: '一般款' }
          });
          break;
        case 'dress':
          // 連身套裝
          queryFilter.and.push({
            property: '款式',
            select: { equals: '連身款' }
          });
          break;
      }
      
      // 只查詢可購買的商品
      queryFilter.and.push({
        property: '狀態',
        select: { equals: '可訂購' }
      });

      console.log(`🚀 快速查詢 ${category} 分類商品...`);
      
      // NotionService 已經是實例化的對象
      const response = await NotionService.notion.databases.query({
        database_id: NotionService.variantsDatabaseId,
        filter: queryFilter.and.length > 0 ? queryFilter : undefined,
        sorts: [
          { timestamp: 'created_time', direction: 'descending' }
        ],
        page_size: limit
      });

      console.log(`✅ 快速查詢完成，找到 ${response.results.length} 個商品`);

      // 快速轉換商品資料，不查詢銷售統計
      const products = response.results.map(variant => {
        const variantData = NotionService.transformVariantData(variant);
        return {
          id: variantData.id,
          variantId: variantData.id,
          name: variantData.name || '未知商品',
          price: variantData.price || 0,
          style: variantData.style || '',
          color: variantData.color || '',
          size: variantData.size || '',
          gender: variantData.gender || '',
          status: variantData.status || '未知',
          // 不包含銷售統計，節省時間
          imageUrl: null
        };
      });

      return {
        products,
        hasMore: response.has_more,
        total: response.results.length
      };

    } catch (error) {
      console.error('快速查詢商品失敗:', error);
      throw error;
    }
  }

  // 緩存常用商品分類
  static productCache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5分鐘緩存

  static async getCachedProducts(category) {
    const cacheKey = `category_${category}`;
    const cached = this.productCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📦 使用緩存數據: ${category}`);
      return cached.data;
    }

    console.log(`🔄 重新查詢並緩存: ${category}`);
    const products = await this.getProductsForShopping({ category });
    
    this.productCache.set(cacheKey, {
      data: products,
      timestamp: Date.now()
    });

    return products;
  }

  // 清除緩存
  static clearCache() {
    this.productCache.clear();
    console.log('🗑️ 商品緩存已清除');
  }
}

module.exports = FastProductService; 