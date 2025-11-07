class FlexShoppingService {
  
  // 主選單 - 商品分類選擇
  static createCategoryMenu() {
    return {
      type: 'flex',
      altText: '商品分類選單',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🛍️ 商品分類',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE',
              align: 'center'
            }
          ],
          paddingAll: 'lg'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '🆕 最新商品',
                data: 'category=newest'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '⭐ 經典商品',
                data: 'category=classic'
              },
              color: '#D4C5A9'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '💰 特價商品',
                data: 'category=sale'
              },
              color: '#B8860B'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '👕 一般衣物',
                data: 'category=clothing'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '👗 連身套裝',
                data: 'category=dress'
              },
              color: '#C8B99C'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '🛒 查看購物車',
                data: 'action=view_cart'
              }
            }
          ]
        }
      }
    };
  }

  // 商品輪播 - 根據分類顯示商品
  static createProductCarousel(products, category) {
    const bubbles = products.map(product => ({
      type: 'bubble',
      hero: {
        type: 'image',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        url: product.imageUrl || 'https://via.placeholder.com/400x260/FF69B4/FFFFFF?text=童裝商品',
        action: {
          type: 'postback',
          data: `action=view_product&productId=${product.id}`
        }
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: product.name,
            wrap: true,
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'box',
            layout: 'baseline',
            contents: [
              {
                type: 'text',
                text: `$${product.price}`,
                wrap: true,
                weight: 'bold',
                size: 'xl',
                flex: 0,
                color: '#FBF1CE'
              }
            ]
          },
          {
            type: 'text',
            text: `${product.style || ''} ${product.color || ''} ${product.size || ''}`.trim(),
            wrap: true,
            size: 'sm',
            color: '#666666'
          },
          {
            type: 'text',
            text: product.status === '可訂購' ? '✅ 現貨供應' : '❌ 暫時缺貨',
            wrap: true,
            size: 'xs',
            color: product.status === '可訂購' ? '#00AA00' : '#FF5551'
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
              label: product.status === '可訂購' ? '🛒 加入購物車' : '❌ 暫時缺貨',
              data: `action=add_to_cart&productId=${product.id}&variantId=${product.variantId || product.id}`
            },
            color: product.status === '可訂購' ? '#FBF1CE' : '#AAAAAA'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '📋 查看詳情',
              data: `action=view_product&productId=${product.id}`
            }
          }
        ]
      }
    }));

    // 添加"查看更多"和"返回選單"按鈕
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
            color: '#FBF1CE'
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
      altText: `${this.getCategoryName(category)} 商品列表`,
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  }

  // 購物車顯示
  static createCartView(cartItems, totalAmount) {
    if (!cartItems || cartItems.length === 0) {
      return {
        type: 'flex',
        altText: '購物車是空的',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🛒 我的購物車',
                weight: 'bold',
                size: 'xl',
                color: '#FBF1CE',
                align: 'center'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '購物車目前是空的',
                align: 'center',
                color: '#666666'
              },
              {
                type: 'text',
                text: '趕快去選購喜歡的商品吧！',
                align: 'center',
                color: '#666666',
                size: 'sm'
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                action: {
                  type: 'postback',
                  label: '🛍️ 開始購物',
                  data: 'action=show_categories'
                },
                color: '#FBF1CE'
              }
            ]
          }
        }
      };
    }

    const cartItemsContent = cartItems.map((item, index) => [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: item.productName,
            weight: 'bold',
            size: 'sm',
            flex: 3
          },
          {
            type: 'text',
            text: `x${item.quantity}`,
            size: 'sm',
            align: 'end',
            flex: 1
          }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `${item.color || ''} ${item.size || ''}`.trim(),
            size: 'xs',
            color: '#666666',
            flex: 3
          },
          {
            type: 'text',
            text: `$${item.subtotal}`,
            size: 'sm',
            align: 'end',
            color: '#FBF1CE',
            weight: 'bold',
            flex: 1
          }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '➖',
              data: `action=decrease_quantity&itemId=${item.id}`
            },
            flex: 1
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '➕',
              data: `action=increase_quantity&itemId=${item.id}`
            },
            flex: 1
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '🗑️',
              data: `action=remove_item&itemId=${item.id}`
            },
            flex: 1
          }
        ]
      },
      ...(index < cartItems.length - 1 ? [{
        type: 'separator',
        margin: 'md'
      }] : [])
    ]).flat();

    return {
      type: 'flex',
      altText: `購物車 (${cartItems.length} 項商品)`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🛒 我的購物車',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE',
              align: 'center'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            ...cartItemsContent,
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '總金額',
                  weight: 'bold',
                  size: 'lg',
                  flex: 2
                },
                {
                  type: 'text',
                  text: `$${totalAmount}`,
                  weight: 'bold',
                  size: 'xl',
                  color: '#FBF1CE',
                  align: 'end',
                  flex: 1
                }
              ]
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
                label: '🛒 送出訂單',
                data: 'action=merge_order'
              },
              color: '#FBF1CE'
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'secondary',
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '🛍️ 繼續購物',
                    data: 'action=show_categories'
                  },
                  flex: 1
                },
                {
                  type: 'button',
                  style: 'secondary',
                  height: 'sm',
                  action: {
                    type: 'postback',
                    label: '🗑️ 清空購物車',
                    data: 'action=clear_cart'
                  },
                  flex: 1
                }
              ]
            }
          ]
        }
      }
    };
  }

  // 結帳確認頁面
  static createCheckoutConfirmation(cartItems, totalAmount, customerInfo) {
    const itemsList = cartItems.map(item => ({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${item.productName} (${item.color} ${item.size})`,
          size: 'sm',
          flex: 3
        },
        {
          type: 'text',
          text: `x${item.quantity}`,
          size: 'sm',
          align: 'center',
          flex: 1
        },
        {
          type: 'text',
          text: `$${item.subtotal}`,
          size: 'sm',
          align: 'end',
          flex: 1
        }
      ]
    }));

    return {
      type: 'flex',
      altText: '訂單確認',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 訂單確認',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE',
              align: 'center'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: '📦 訂購商品',
              weight: 'bold',
              size: 'md'
            },
            ...itemsList,
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'text',
              text: '👤 收件資訊',
              weight: 'bold',
              size: 'md'
            },
            {
              type: 'text',
              text: `姓名：${customerInfo.name}\n電話：${customerInfo.phone}\n地址：${customerInfo.address}`,
              size: 'sm',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '總金額',
                  weight: 'bold',
                  size: 'lg'
                },
                {
                  type: 'text',
                  text: `$${totalAmount}`,
                  weight: 'bold',
                  size: 'xl',
                  color: '#FBF1CE',
                  align: 'end'
                }
              ]
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
                label: '✅ 確認下單',
                data: 'action=confirm_order'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'postback',
                label: '📝 修改資料',
                data: 'action=edit_customer_info'
              }
            }
          ]
        }
      }
    };
  }

  // 輔助方法
  static getCategoryName(category) {
    const categoryNames = {
      newest: '最新商品',
      classic: '經典商品',
      sale: '特價商品',
      clothing: '一般衣物',
      dress: '連身套裝'
    };
    return categoryNames[category] || '商品';
  }
}

module.exports = FlexShoppingService; 