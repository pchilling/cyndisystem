class FlexMessages {
  
  // 歡迎訊息
  static createWelcomeMessage() {
    return {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://via.placeholder.com/1024x512/FFB6C1/FFFFFF?text=Cyndi+韓國童裝代購",
        size: "full",
        aspectRatio: "20:10",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "歡迎來到 Cyndi 韓國童裝代購！",
            weight: "bold",
            size: "xl",
            color: "#FBF1CE"
          },
          {
            type: "text",
            text: "🎀 精選韓國童裝",
            size: "md",
            margin: "md"
          },
          {
            type: "text",
            text: "✨ 現貨+預購服務",
            size: "md"
          },
          {
            type: "text",
            text: "🚚 快速出貨",
            size: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "請點選下方按鈕開始購物：",
            size: "sm",
            color: "#666666",
            margin: "lg"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "message",
              label: "🛍️ 開始購物",
              text: "我要下單"
            },
            color: "#FBF1CE"
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "🌐 LIFF 選購頁",
              data: JSON.stringify({ action: "open_liff" })
            }
          }
        ]
      }
    };
  }
  
  // 商品輪播
  static createProductCarousel(products) {
    const bubbles = products.slice(0, 10).map(product => ({
      type: "bubble",
      hero: {
        type: "image",
        url: product.image || "https://via.placeholder.com/800x600/F0F8FF/000000?text=商品圖片",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
        action: {
          type: "postback",
          data: JSON.stringify({
            action: "view_product_detail",
            productId: product.id
          })
        }
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: product.name,
            weight: "bold",
            size: "lg",
            wrap: true
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "價格",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: `NT$ ${product.price}`,
                    wrap: true,
                    color: "#FBF1CE",
                    size: "lg",
                    weight: "bold",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "狀態",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: product.status,
                    wrap: true,
                    color: product.status === "現貨" ? "#00AA00" : "#FFA500",
                    size: "sm",
                    weight: "bold",
                    flex: 5
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "postback",
              label: "🛒 加入購物清單",
              data: JSON.stringify({
                action: "add_to_cart",
                productId: product.id,
                productName: product.name,
                price: product.price
              })
            },
            color: "#FBF1CE"
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "📋 查看詳情",
              data: JSON.stringify({
                action: "view_product_detail",
                productId: product.id
              })
            }
          }
        ]
      }
    }));
    
    return {
      type: "carousel",
      contents: bubbles
    };
  }
  
  // 尺寸選擇
  static createSizeSelection(product) {
    const sizes = ['S', 'M', 'L', 'XL', '90', '100', '110', '120', '130'];
    
    const sizeButtons = sizes.map(size => ({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "postback",
        label: size,
        data: JSON.stringify({
          action: "select_size",
          productId: product.id,
          size: size
        })
      }
    }));
    
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `選擇尺寸 - ${product.name}`,
            weight: "bold",
            size: "lg",
            wrap: true
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "請選擇尺寸：",
            margin: "lg",
            size: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: sizeButtons.slice(0, 5).concat([
          {
            type: "separator",
            margin: "sm"
          }
        ]).concat(sizeButtons.slice(5))
      }
    };
  }
  
  // 數量選擇
  static createQuantitySelection(product, size) {
    const quantities = ['1', '2', '3', '4', '5'];
    
    const quantityButtons = quantities.map(qty => ({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "postback",
        label: `${qty} 件`,
        data: JSON.stringify({
          action: "select_quantity",
          productId: product.id,
          size: size,
          quantity: qty
        })
      }
    }));
    
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `選擇數量 - ${product.name}`,
            weight: "bold",
            size: "lg",
            wrap: true
          },
          {
            type: "text",
            text: `尺寸：${size}`,
            size: "md",
            color: "#666666",
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "請選擇數量：",
            margin: "lg",
            size: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: quantityButtons
      }
    };
  }
  
  // 購物車
  static createCartMessage(cart) {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const cartItems = cart.map(item => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: item.productName,
              size: "sm",
              weight: "bold",
              wrap: true,
              flex: 0
            },
            {
              type: "text",
              text: `${item.size} / ${item.quantity}件`,
              size: "xs",
              color: "#666666",
              margin: "xs",
              flex: 0
            }
          ],
          flex: 4
        },
        {
          type: "text",
          text: `NT$ ${item.price * item.quantity}`,
          size: "sm",
          color: "#FBF1CE",
          weight: "bold",
          align: "end",
          flex: 1
        }
      ],
      margin: "md"
    }));
    
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🛒 購物清單",
            weight: "bold",
            size: "xl",
            color: "#FBF1CE"
          },
          {
            type: "separator",
            margin: "lg"
          }
        ].concat(cartItems).concat([
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "總計",
                size: "lg",
                weight: "bold",
                flex: 1
              },
              {
                type: "text",
                text: `NT$ ${totalPrice}`,
                size: "lg",
                weight: "bold",
                color: "#FBF1CE",
                align: "end",
                flex: 1
              }
            ],
            margin: "lg"
          }
        ])
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "message",
              label: "✅ 確認下單",
              text: "我要送出"
            },
            color: "#FBF1CE"
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "🗑️ 清空購物清單",
              data: JSON.stringify({ action: "clear_cart" })
            }
          }
        ]
      }
    };
  }
  
  // 訂單表單
  static createOrderForm(cart) {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📝 訂單確認",
            weight: "bold",
            size: "xl",
            color: "#FBF1CE"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: `共 ${cart.length} 項商品，總金額 NT$ ${totalPrice}`,
            margin: "lg",
            size: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "請點擊下方按鈕填寫收件資料，或直接回覆以下資訊：",
            wrap: true,
            margin: "lg",
            size: "sm",
            color: "#666666"
          },
          {
            type: "text",
            text: "• 收件人姓名\n• 聯絡電話\n• 收件地址\n• 備註（選填）",
            wrap: true,
            margin: "md",
            size: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "uri",
              label: "📝 填寫收件資料",
              uri: `https://liff.line.me/${process.env.LIFF_ID}?mode=checkout`
            },
            color: "#FBF1CE"
          }
        ]
      }
    };
  }
  
  // 訂單確認
  static createOrderConfirmation(order) {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "✅ 訂單已送出",
            weight: "bold",
            size: "xl",
            color: "#00AA00"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "訂單編號",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: order.orderNumber,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "訂單金額",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: `NT$ ${order.totalAmount}`,
                    wrap: true,
                    color: "#FBF1CE",
                    size: "lg",
                    weight: "bold",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "訂單狀態",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: "處理中",
                    wrap: true,
                    color: "#FFA500",
                    size: "sm",
                    weight: "bold",
                    flex: 5
                  }
                ]
              }
            ]
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "我們將盡快為您配貨並通知您付款資訊。",
            wrap: true,
            color: "#666666",
            size: "sm",
            margin: "lg"
          }
        ]
      }
    };
  }
  
  // 幫助訊息
  static createHelpMessage() {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📖 使用說明",
            weight: "bold",
            size: "xl",
            color: "#FBF1CE"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "購物流程：",
            weight: "bold",
            margin: "lg"
          },
          {
            type: "text",
            text: "1️⃣ 輸入「我要下單」查看商品\n2️⃣ 點選商品「加入購物清單」\n3️⃣ 選擇尺寸和數量\n4️⃣ 輸入「我要送出」確認訂單\n5️⃣ 填寫收件資料完成下單",
            wrap: true,
            size: "sm",
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "常用指令：",
            weight: "bold",
            margin: "lg"
          },
          {
            type: "text",
            text: "• 我要下單 - 查看商品\n• 查詢訂單 - 查看訂單狀態\n• 客服 - 聯絡客服",
            wrap: true,
            size: "sm",
            margin: "md"
          }
        ]
      }
    };
  }
  
  // 客服訊息
  static createCustomerServiceMessage() {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💬 聯絡客服",
            weight: "bold",
            size: "xl",
            color: "#FBF1CE"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "如有任何問題，歡迎直接在此對話或透過以下方式聯絡我們：",
            wrap: true,
            margin: "lg",
            size: "sm"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "營業時間",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: "週一～週五 9:00-18:00",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "回覆時間",
                    color: "#aaaaaa",
                    size: "sm",
                    flex: 3
                  },
                  {
                    type: "text",
                    text: "通常 2-4 小時內回覆",
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 5
                  }
                ]
              }
            ]
          }
        ]
      }
    };
  }

  // 收件資訊收集表單
  static createShippingForm(existingInfo = null) {
    return {
      type: 'flex',
      altText: '填寫收件資訊',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📦 收件資訊',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE'
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
              text: existingInfo ? '請確認以下收件資訊：' : '請依序提供以下資訊：',
              size: 'md',
              weight: 'bold'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '1️⃣ 收件人姓名',
                  size: 'sm',
                  color: '#666666'
                },
                {
                  type: 'text',
                  text: existingInfo ? existingInfo.name : '請輸入收件人姓名',
                  size: 'md',
                  weight: existingInfo ? 'bold' : 'regular',
                  color: existingInfo ? '#000000' : '#999999'
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '2️⃣ 聯絡電話',
                  size: 'sm',
                  color: '#666666'
                },
                {
                  type: 'text',
                  text: existingInfo ? existingInfo.phone : '請輸入聯絡電話',
                  size: 'md',
                  weight: existingInfo ? 'bold' : 'regular',
                  color: existingInfo ? '#000000' : '#999999'
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
              action: {
                type: 'postback',
                label: existingInfo ? '✅ 使用此資訊' : '📝 開始填寫',
                data: existingInfo ? 
                  `action=confirm_shipping_info&name=${existingInfo.name}&phone=${existingInfo.phone}` :
                  'action=input_shipping_info'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: '🛒 返回購物車',
                data: 'action=view_cart'
              }
            }
          ]
        }
      }
    };
  }

  // 配送方式選擇
  static createDeliveryMethodSelection() {
    return {
      type: 'flex',
      altText: '選擇配送方式',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚚 選擇配送方式',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '📦 宅配到府',
                data: 'action=select_delivery&method=home'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '🏪 7-11 店到店',
                data: 'action=select_delivery&method=711'
              },
              color: '#D4C5A9'
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '🏪 全家店到店',
                data: 'action=select_delivery&method=family'
              },
              color: '#D4C5A9'
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '🏪 萊爾富店到店',
                data: 'action=select_delivery&method=hilife'
              },
              color: '#D4C5A9'
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '🏪 OK店到店',
                data: 'action=select_delivery&method=okmart'
              },
              color: '#D4C5A9'
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
              action: {
                type: 'postback',
                label: '↩️ 返回上一步',
                data: 'action=back_to_shipping'
              }
            }
          ]
        }
      }
    };
  }

  // 訂單預覽
  static createOrderPreview(orderData) {
    const itemsContents = orderData.items.map(item => ({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: item.productName,
          size: 'sm',
          flex: 3
        },
        {
          type: 'text',
          text: `x${item.quantity}`,
          size: 'sm',
          align: 'end',
          flex: 1
        },
        {
          type: 'text',
          text: `$${item.subtotal}`,
          size: 'sm',
          align: 'end',
          flex: 2
        }
      ]
    }));

    return {
      type: 'flex',
      altText: '訂單預覽',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 訂單預覽',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE'
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
              text: '商品明細',
              weight: 'bold',
              size: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: itemsContents
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '收件資訊',
                  weight: 'bold',
                  size: 'md'
                },
                {
                  type: 'text',
                  text: `姓名：${orderData.shippingInfo.name}`,
                  size: 'sm'
                },
                {
                  type: 'text',
                  text: `電話：${orderData.shippingInfo.phone}`,
                  size: 'sm'
                },
                {
                  type: 'text',
                  text: `配送：${orderData.shippingInfo.method}`,
                  size: 'sm'
                },
                {
                  type: 'text',
                  text: `地址：${orderData.shippingInfo.address}`,
                  size: 'sm',
                  wrap: true
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '商品總額',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: `$${orderData.amount.subtotal}`,
                      size: 'sm',
                      align: 'end',
                      flex: 2
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '運費',
                      size: 'sm',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: `$${orderData.amount.shipping}`,
                      size: 'sm',
                      align: 'end',
                      flex: 2
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '應付總額',
                      size: 'md',
                      weight: 'bold',
                      flex: 3
                    },
                    {
                      type: 'text',
                      text: `$${orderData.amount.total}`,
                      size: 'md',
                      weight: 'bold',
                      align: 'end',
                      flex: 2,
                      color: '#FBF1CE'
                    }
                  ]
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
              action: {
                type: 'postback',
                label: '💳 選擇付款方式',
                data: 'action=select_payment'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: '✏️ 修改資料',
                data: 'action=edit_order_info'
              }
            }
          ]
        }
      }
    };
  }

  // 付款方式選擇
  static createPaymentMethodSelection() {
    return {
      type: 'flex',
      altText: '選擇付款方式',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💳 選擇付款方式',
              weight: 'bold',
              size: 'xl',
              color: '#FBF1CE'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '🏦 銀行轉帳',
                data: 'action=select_payment&method=bank'
              },
              color: '#FBF1CE'
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: '💵 貨到付款',
                data: 'action=select_payment&method=cod'
              },
              color: '#D4C5A9'
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
              action: {
                type: 'postback',
                label: '↩️ 返回訂單預覽',
                data: 'action=back_to_preview'
              }
            }
          ]
        }
      }
    };
  }
}

module.exports = FlexMessages; 