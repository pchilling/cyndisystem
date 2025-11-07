const NotionService = require('./notionService');
const FlexShoppingService = require('./flexShoppingService');

class ProductFlowService {
  
  // 快速獲取主商品列表（Products Database）
  static async getMainProducts(filters = {}) {
    try {
      const { category, page = 1, limit = 8 } = filters;
      
      console.log(`🛍️ 查詢主商品列表 - 分類: ${category}`);
      
      // 構建查詢條件
      const queryFilter = { and: [] };
      
      // 根據分類篩選
      switch (category) {
        case 'newest':
          // 最新商品 - 按創建時間排序
          break;
        case 'classic':
          // 經典商品
          break;
        case 'sale':
          // 特價商品
          queryFilter.and.push({
            property: '狀態',
            select: { equals: '特價' }
          });
          break;
        case 'clothing':
          // 衣物分類
          queryFilter.and.push({
            property: '主分類',
            select: { equals: '衣物' }
          });
          break;
        case 'dress':
          // 洋裝等
          queryFilter.and.push({
            property: '子分類',
            multi_select: { contains: '洋裝' }
          });
          break;
      }
      
      // 只查詢有效商品
      queryFilter.and.push({
        property: '狀態',
        select: { does_not_equal: '停售' }
      });

      const response = await NotionService.notion.databases.query({
        database_id: NotionService.productsDatabaseId,
        filter: queryFilter.and.length > 0 ? queryFilter : undefined,
        sorts: [
          { timestamp: 'created_time', direction: 'descending' }
        ],
        page_size: limit
      });

      console.log(`✅ 找到 ${response.results.length} 個主商品`);

      // 轉換主商品資料
      const products = response.results.map(product => {
        const productData = NotionService.transformProductData(product);
        return {
          id: productData.id,
          name: productData.name || '未知商品',
          productCode: productData.productCode || '',
          mainCategory: productData.mainCategory || '',
          subCategory: productData.subCategory || [],
          status: productData.status || '未知',
          imageUrl: productData.imageUrl || null
        };
      });

      return {
        products,
        hasMore: response.has_more,
        total: response.results.length
      };

    } catch (error) {
      console.error('查詢主商品失敗:', error);
      throw error;
    }
  }

  // 根據主商品 ID 獲取其所有變體
  static async getProductVariants(productId) {
    try {
      console.log(`🎨 查詢商品變體 - 商品ID: ${productId}`);
      
      const response = await NotionService.notion.databases.query({
        database_id: NotionService.variantsDatabaseId,
        filter: {
          property: 'Cyndi Product Database',
          relation: {
            contains: productId
          }
        },
        sorts: [
          { property: '款式', direction: 'ascending' },
          { property: '顏色', direction: 'ascending' },
          { property: '尺寸', direction: 'ascending' }
        ]
      });

      console.log(`✅ 找到 ${response.results.length} 個變體`);

      // 轉換變體資料
      const variants = response.results.map(variant => {
        const variantData = NotionService.transformVariantData(variant);
        return {
          id: variantData.id,
          productId: productId,
          name: variantData.name || '未知變體',
          style: variantData.style || '',
          color: variantData.color || '',
          size: variantData.size || '',
          gender: variantData.gender || '',
          price: variantData.price || 0,
          status: variantData.status || '未知',
          imageUrl: null
        };
      });

      return variants;

    } catch (error) {
      console.error('查詢商品變體失敗:', error);
      throw error;
    }
  }

  // 搜尋商品（主商品和變體）
  static async searchProducts(keyword) {
    try {
      console.log(`🔍 搜尋關鍵字: ${keyword}`);
      
      // 搜尋主商品
      const productResponse = await NotionService.notion.databases.query({
        database_id: NotionService.productsDatabaseId,
        filter: {
          or: [
            {
              property: '商品名稱',
              title: { contains: keyword }
            },
            {
              property: '商品描述',
              rich_text: { contains: keyword }
            },
            {
              property: '主分類',
              select: { equals: keyword }
            }
          ]
        },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 20
      });

      // 搜尋變體
      const variantResponse = await NotionService.notion.databases.query({
        database_id: NotionService.variantsDatabaseId,
        filter: {
          and: [
            {
              or: [
                {
                  property: '商品名稱',
                  title: { contains: keyword }
                },
                {
                  property: '顏色',
                  select: { equals: keyword }
                },
                {
                  property: '尺寸',
                  select: { equals: keyword }
                },
                {
                  property: '款式',
                  select: { equals: keyword }
                }
              ]
            },
            {
              property: '狀態',
              select: { equals: '可訂購' }
            }
          ]
        },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 20
      });

      // 轉換主商品資料
      const products = productResponse.results.map(product => {
        const productData = NotionService.transformProductData(product);
        return {
          id: productData.id,
          name: productData.name || '未知商品',
          productCode: productData.productCode || '',
          mainCategory: productData.mainCategory || '',
          subCategory: productData.subCategory || [],
          status: productData.status || '未知',
          imageUrl: productData.imageUrl || null,
          type: 'product'
        };
      });

      // 轉換變體資料
      const variants = variantResponse.results.map(variant => {
        const variantData = NotionService.transformVariantData(variant);
        return {
          id: variantData.id,
          productId: variantData.productRef,
          name: variantData.name || '未知變體',
          style: variantData.style || '',
          color: variantData.color || '',
          size: variantData.size || '',
          gender: variantData.gender || '',
          price: variantData.price || 0,
          status: variantData.status || '未知',
          imageUrl: null,
          type: 'variant'
        };
      });

      console.log(`✅ 搜尋完成，找到 ${products.length} 個主商品，${variants.length} 個變體`);

      return {
        products,
        variants,
        total: products.length + variants.length
      };

    } catch (error) {
      console.error('搜尋商品失敗:', error);
      throw error;
    }
  }

  // 創建主商品選擇的 Flex Message（新的時尚設計）
  static createMainProductCarousel(products, category) {
    const bubbles = products.map(product => ({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: product.imageUrl || 'https://via.placeholder.com/400x600/FF69B4/FFFFFF?text=童裝商品',
            size: 'full',
            aspectMode: 'cover',
            aspectRatio: '2:3',
            gravity: 'top'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: product.name,
                    size: 'xl',
                    color: '#ffffff',
                    weight: 'bold',
                    wrap: true
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: `編號：${product.productCode}`,
                    color: '#ebebeb',
                    size: 'sm',
                    flex: 0
                  }
                ],
                spacing: 'lg'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'filler'
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      {
                        type: 'filler'
                      },
                      {
                        type: 'text',
                        text: '🎨 選擇款式',
                        color: '#ffffff',
                        flex: 0,
                        offsetTop: '-2px'
                      },
                      {
                        type: 'filler'
                      }
                    ],
                    spacing: 'sm'
                  },
                  {
                    type: 'filler'
                  }
                ],
                borderWidth: '1px',
                cornerRadius: '4px',
                spacing: 'sm',
                borderColor: '#ffffff',
                margin: 'xxl',
                height: '40px',
                action: {
                  type: 'postback',
                  data: `action=select_product&productId=${product.id}`
                }
              }
            ],
            position: 'absolute',
            offsetBottom: '0px',
            offsetStart: '0px',
            offsetEnd: '0px',
            backgroundColor: '#8B7355cc',
            paddingAll: '20px',
            paddingTop: '18px'
          },
          // 狀態標籤
          ...(product.status === '現貨' || product.status === '特價' ? [{
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: product.status === '現貨' ? '現貨' : '特價',
                color: '#ffffff',
                align: 'center',
                size: 'xs',
                offsetTop: '3px'
              }
            ],
            position: 'absolute',
            cornerRadius: '20px',
            offsetTop: '18px',
            backgroundColor: product.status === '現貨' ? '#00AA00' : '#ff334b',
            offsetStart: '18px',
            height: '25px',
            width: '53px'
          }] : [])
        ],
        paddingAll: '0px'
      }
    }));

    // 添加導航按鈕
    bubbles.push({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'button',
            flex: 1,
            gravity: 'center',
            style: 'primary',
            action: {
              type: 'postback',
              label: '📱 查看更多商品',
              data: `category=${category}&page=2`
            },
            color: '#20B2AA'
          },
          {
            type: 'button',
            flex: 1,
            gravity: 'center',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '🔙 返回分類選單',
              data: 'action=show_categories'
            }
          },
          {
            type: 'button',
            flex: 1,
            gravity: 'center',
            style: 'primary',
            action: {
              type: 'postback',
              label: '🛒 查看購物車',
              data: 'action=view_cart'
            },
                              color: '#FBF1CE'
          }
        ]
      }
    });

    return {
      type: 'flex',
      altText: `${FlexShoppingService.getCategoryName(category)} 商品系列`,
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  }

  // 創建變體選擇的 Flex Message（新的時尚設計）
  static createVariantSelectionCarousel(productName, variants) {
    // 按款式分組
    const groupedVariants = this.groupVariantsByStyle(variants);
    
    const bubbles = Object.entries(groupedVariants).map(([style, styleVariants]) => {
      // 取第一個變體作為代表
      const representative = styleVariants[0];
      
      return {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'image',
              url: representative.imageUrl || 'https://via.placeholder.com/400x600/FF69B4/FFFFFF?text=變體款式',
              size: 'full',
              aspectMode: 'cover',
              aspectRatio: '2:3',
              gravity: 'top'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: `${productName} - ${style}`,
                      size: 'xl',
                      color: '#ffffff',
                      weight: 'bold',
                      wrap: true
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: `$${representative.price}`,
                      color: '#ebebeb',
                      size: 'lg',
                      weight: 'bold',
                      flex: 0
                    }
                  ],
                  spacing: 'lg'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: `顏色：${this.getAvailableColors(styleVariants).join('、')}`,
                      color: '#ffffffcc',
                      size: 'sm',
                      wrap: true
                    },
                    {
                      type: 'text',
                      text: `尺寸：${this.getAvailableSizes(styleVariants).join('、')}`,
                      color: '#ffffffcc',
                      size: 'sm',
                      wrap: true
                    }
                  ],
                  spacing: 'sm',
                  margin: 'md'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'filler'
                    },
                    {
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        {
                          type: 'filler'
                        },
                        {
                          type: 'text',
                          text: '🎯 選擇規格',
                          color: '#ffffff',
                          flex: 0,
                          offsetTop: '-2px'
                        },
                        {
                          type: 'filler'
                        }
                      ],
                      spacing: 'sm'
                    },
                    {
                      type: 'filler'
                    }
                  ],
                  borderWidth: '1px',
                  cornerRadius: '4px',
                  spacing: 'sm',
                  borderColor: '#ffffff',
                  margin: 'xxl',
                  height: '40px',
                  action: {
                    type: 'postback',
                    data: `action=select_variant_details&productId=${representative.productId}&style=${encodeURIComponent(style)}`
                  }
                }
              ],
              position: 'absolute',
              offsetBottom: '0px',
              offsetStart: '0px',
              offsetEnd: '0px',
              backgroundColor: '#6B5B47cc',
              paddingAll: '20px',
              paddingTop: '18px'
            },
            // 可訂購狀態標籤
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '可訂購',
                  color: '#ffffff',
                  align: 'center',
                  size: 'xs',
                  offsetTop: '3px'
                }
              ],
              position: 'absolute',
              cornerRadius: '20px',
              offsetTop: '18px',
              backgroundColor: '#00AA00',
              offsetStart: '18px',
              height: '25px',
              width: '58px'
            }
          ],
          paddingAll: '0px'
        }
      };
    });

    return {
      type: 'flex',
      altText: `${productName} 款式選擇`,
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  }

  // 輔助方法：按款式分組變體
  static groupVariantsByStyle(variants) {
    const grouped = {};
    variants.forEach(variant => {
      const style = variant.style || '預設款式';
      if (!grouped[style]) {
        grouped[style] = [];
      }
      grouped[style].push(variant);
    });
    return grouped;
  }

  // 輔助方法：獲取可用顏色
  static getAvailableColors(variants) {
    const colors = [...new Set(variants.map(v => v.color).filter(c => c))];
    return colors.length > 0 ? colors : ['預設'];
  }

  // 輔助方法：獲取可用尺寸
  static getAvailableSizes(variants) {
    const sizes = [...new Set(variants.map(v => v.size).filter(s => s))];
    return sizes.length > 0 ? sizes : ['One Size'];
  }

  // 緩存機制
  static productCache = new Map();
  static variantCache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5分鐘

  static async getCachedMainProducts(category) {
    const cacheKey = `main_products_${category}`;
    const cached = this.productCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📦 使用主商品緩存: ${category}`);
      return cached.data;
    }

    console.log(`🔄 重新查詢主商品: ${category}`);
    const products = await this.getMainProducts({ category });
    
    this.productCache.set(cacheKey, {
      data: products,
      timestamp: Date.now()
    });

    return products;
  }

  static async getCachedVariants(productId) {
    const cacheKey = `variants_${productId}`;
    const cached = this.variantCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📦 使用變體緩存: ${productId}`);
      return cached.data;
    }

    console.log(`🔄 重新查詢變體: ${productId}`);
    const variants = await this.getProductVariants(productId);
    
    this.variantCache.set(cacheKey, {
      data: variants,
      timestamp: Date.now()
    });

    return variants;
  }
}

module.exports = ProductFlowService; 