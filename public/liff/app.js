// LIFF 初始化和應用邏輯
let liffId = '';
let products = [];
let filteredProducts = [];
let cart = [];
let cartSummary = {};
let currentCategory = 'all';

// 初始化 LIFF
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 獲取 LIFF ID
        liffId = await getLiffId();
        
        // 初始化 LIFF
        await liff.init({ liffId: liffId });
        
        if (liff.isLoggedIn()) {
            console.log('LIFF 初始化成功');
            
            // 初始化應用
            await initializeApp();
            
            // 檢查是否為結帳模式（通過 URL 參數檢測）
            const urlParams = new URLSearchParams(window.location.search);
            const isCheckoutMode = urlParams.get('mode') === 'checkout';
            
            if (isCheckoutMode) {
                console.log('檢測到結帳模式，等待購物車載入...');
                // 等待購物車載入完成後再顯示結帳界面
                setTimeout(async () => {
                    await loadCart(); // 確保購物車已載入
                    if (cartSummary && cartSummary.totalItems > 0) {
                        showCheckoutMode();
                    } else {
                        showError('購物車是空的，無法進行結帳！');
                        // 移除 URL 參數並重新載入頁面
                        window.location.href = window.location.pathname;
                    }
                }, 1500); // 給更多時間載入
            }
            
        } else {
            liff.login();
        }
    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        alert('LIFF 初始化失敗，請重新整理頁面');
    }
});

// 獲取 LIFF ID
async function getLiffId() {
    try {
        const response = await fetch('/api/config/liff');
        const data = await response.json();
        return data.liffId;
    } catch (error) {
        console.error('獲取 LIFF ID 失敗:', error);
        // 如果 API 不存在，使用預設值（需要在伺服器設定）
        return 'YOUR_LIFF_ID_HERE';
    }
}

// 初始化應用
async function initializeApp() {
    // 設置事件監聽器
    setupEventListeners();
    
    // 載入商品
    await loadProducts();
    
    // 載入購物車
    loadCart();
    
    // 隱藏載入指示器
    document.getElementById('loadingIndicator').style.display = 'none';
}

// 設置事件監聽器
function setupEventListeners() {
    // 分類按鈕
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            selectCategory(category);
        });
    });
    
    // 搜尋功能
    document.getElementById('searchBtn').addEventListener('click', searchProducts);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    // 購物車按鈕
    document.getElementById('cartBtn').addEventListener('click', showCart);
    document.getElementById('floatingCartBtn').addEventListener('click', showCart);
}

// 載入商品
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success) {
            products = data.data;
            filteredProducts = [...products];
            renderProducts();
        } else {
            throw new Error(data.message || '載入商品失敗');
        }
    } catch (error) {
        console.error('載入商品失敗:', error);
        showError('載入商品失敗，請重新整理頁面');
    }
}

// 渲染商品
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const noProductsMsg = document.getElementById('noProductsMessage');
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        noProductsMsg.classList.remove('d-none');
        return;
    }
    
    noProductsMsg.classList.add('d-none');
    
    grid.innerHTML = filteredProducts.map(product => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card product-card h-100">
                <div class="position-relative">
                    <img src="${product.image || '/images/placeholder.jpg'}" 
                         class="product-image" 
                         alt="${product.name}"
                         onerror="this.src='/images/placeholder.jpg'">
                    <span class="product-status status-${product.status || '現貨'}">
                        ${product.status || '現貨'}
                    </span>
                </div>
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title">${product.name}</h6>
                    <p class="text-muted small mb-2">
                        <i class="fas fa-tag"></i> ${product.mainCategory}
                        ${product.subCategories && product.subCategories.length > 0 ? 
                          ' > ' + product.subCategories.join(', ') : ''}
                    </p>
                    <div class="mt-auto">
                        <button class="btn add-to-cart-btn w-100" 
                                onclick="showProductDetail('${product.id}')"
                                ${product.status === '缺貨' ? 'disabled' : ''}>
                            <i class="fas fa-eye"></i>
                            ${product.status === '缺貨' ? '暫時缺貨' : '查看詳情'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 選擇分類
function selectCategory(category) {
    currentCategory = category;
    
    // 更新按鈕狀態
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 篩選商品
    if (category === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => 
            product.mainCategory === category || 
            (product.subCategories && product.subCategories.includes(category))
        );
    }
    
    renderProducts();
}

// 搜尋商品
function searchProducts() {
    const keyword = document.getElementById('searchInput').value.trim();
    
    if (!keyword) {
        // 如果沒有關鍵字，顯示當前分類的所有商品
        selectCategory(currentCategory);
        return;
    }
    
    filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (product.mainCategory && product.mainCategory.toLowerCase().includes(keyword.toLowerCase())) ||
        (product.subCategories && product.subCategories.some(cat => 
            cat.toLowerCase().includes(keyword.toLowerCase())
        ))
    );
    
    renderProducts();
}

// 顯示商品詳情
async function showProductDetail(productId) {
    try {
        console.log('載入商品詳情:', productId);
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        
        console.log('商品詳情回應:', data);
        
        if (data.success) {
            const product = data.data;
            showProductModal(product);
        } else {
            throw new Error(data.message || '載入商品詳情失敗');
        }
    } catch (error) {
        console.error('載入商品詳情失敗:', error);
        alert('載入商品詳情失敗: ' + error.message);
    }
}

// 顯示商品詳情模態框
function showProductModal(product) {
    const modalHtml = `
        <div class="modal fade" id="productDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${product.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <img src="${product.image || '/images/placeholder.jpg'}" 
                                     class="img-fluid rounded" 
                                     alt="${product.name}">
                            </div>
                            <div class="col-md-6">
                                <h6>商品資訊</h6>
                                <p><strong>分類：</strong>${product.mainCategory}</p>
                                ${product.subCategories && product.subCategories.length > 0 ? 
                                  `<p><strong>子分類：</strong>${product.subCategories.join(', ')}</p>` : ''}
                                <p><strong>狀態：</strong><span class="status-${product.status}">${product.status}</span></p>
                                
                                ${product.variants && product.variants.length > 0 ? `
                                    <h6 class="mt-3">可選規格</h6>
                                    <div id="variantsList">
                                        ${product.variants.map(variant => `
                                            <div class="variant-item border rounded p-2 mb-2">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <strong>${variant.name || variant.style}</strong>
                                                        ${variant.color ? `<br><small>顏色: ${variant.color}</small>` : ''}
                                                        ${variant.size ? `<br><small>尺寸: ${variant.size}</small>` : ''}
                                                        ${variant.gender ? `<br><small>性別: ${variant.gender}</small>` : ''}
                                                    </div>
                                                    <div class="text-end">
                                                        <div class="fw-bold text-primary">NT$ ${variant.price}</div>
                                                        <button class="btn btn-sm add-to-cart-btn mt-1" 
                                                                onclick="addVariantToCart('${product.id}', '${variant.id}')"
                                                                ${variant.status !== '可訂購' ? 'disabled' : ''}>
                                                            ${variant.status !== '可訂購' ? '無法訂購' : '加入購物車'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="alert alert-info">
                                        此商品暫無可選規格，請聯絡客服了解詳情。
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除舊的模態框
    const oldModal = document.getElementById('productDetailModal');
    if (oldModal) {
        oldModal.remove();
    }
    
    // 添加新的模態框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 顯示模態框
    try {
        const modalElement = document.getElementById('productDetailModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('模態框已顯示');
        } else {
            console.error('無法找到模態框元素');
        }
    } catch (modalError) {
        console.error('顯示模態框時發生錯誤:', modalError);
        alert('無法顯示商品詳情視窗');
    }
}

// 加入購物車（變體）
async function addVariantToCart(productId, variantId) {
    try {
        const userId = liff.getContext().userId;
        
        const response = await fetch(`/api/cart/${userId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productId,
                variantId: variantId,
                quantity: 1
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(`商品已加入購物車 (${data.cartSummary.totalItems} 件商品)`);
            loadCart(); // 重新載入購物車
        } else {
            throw new Error(data.message || '加入購物車失敗');
        }
    } catch (error) {
        console.error('加入購物車失敗:', error);
        showError('加入購物車失敗');
    }
}

// 載入購物車
async function loadCart() {
    try {
        const userId = liff.getContext().userId;
        const response = await fetch(`/api/cart/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            cart = data.data || [];
            cartSummary = data.summary || {};
            updateCartUI();
            console.log('購物車已載入:', { items: cart.length, summary: cartSummary });
        }
    } catch (error) {
        console.error('載入購物車失敗:', error);
    }
}

// 更新購物車項目數量
async function updateCartItemQuantity(itemId, quantity) {
    try {
        const userId = liff.getContext().userId;
        
        const response = await fetch(`/api/cart/${userId}/update/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: quantity })
        });
        
        const data = await response.json();
        
        if (data.success) {
            cart = data.data.cart || [];
            cartSummary = data.cartSummary || {};
            updateCartUI();
            showSuccess(data.message);
        } else {
            throw new Error(data.message || '更新數量失敗');
        }
    } catch (error) {
        console.error('更新購物車項目失敗:', error);
        showError('更新數量失敗');
    }
}

// 從購物車移除項目
async function removeFromCart(itemId) {
    try {
        const userId = liff.getContext().userId;
        
        const response = await fetch(`/api/cart/${userId}/remove/${itemId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            cart = data.data.cart || [];
            cartSummary = data.cartSummary || {};
            updateCartUI();
            showSuccess('商品已從購物車移除');
        } else {
            throw new Error(data.message || '移除商品失敗');
        }
    } catch (error) {
        console.error('移除購物車項目失敗:', error);
        showError('移除商品失敗');
    }
}

// 清空購物車
async function clearCart() {
    try {
        if (!confirm('確定要清空購物車嗎？')) {
            return;
        }
        
        const userId = liff.getContext().userId;
        
        const response = await fetch(`/api/cart/${userId}/clear`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            cart = [];
            cartSummary = {};
            updateCartUI();
            showSuccess('購物車已清空');
        } else {
            throw new Error(data.message || '清空購物車失敗');
        }
    } catch (error) {
        console.error('清空購物車失敗:', error);
        showError('清空購物車失敗');
    }
}

// 更新購物車 UI
function updateCartUI() {
    const cartCount = cartSummary?.totalItems || 0;
    const cartCounters = document.querySelectorAll('#cartCounter, #floatingCartCounter');
    
    cartCounters.forEach(counter => {
        counter.textContent = cartCount;
        if (cartCount > 0) {
            counter.classList.remove('d-none');
        } else {
            counter.classList.add('d-none');
        }
    });
    
    const floatingBtn = document.getElementById('floatingCartBtn');
    if (floatingBtn) {
        if (cartCount > 0) {
            floatingBtn.classList.remove('d-none');
            // 更新按鈕文字顯示總金額
            const totalAmount = cartSummary?.totalAmount || 0;
            const cartText = floatingBtn.querySelector('.cart-text');
            if (cartText) {
                cartText.textContent = `$${totalAmount}`;
            }
        } else {
            floatingBtn.classList.add('d-none');
        }
    }
}

// 顯示購物車詳情
function showCart() {
    if (!cart || cart.length === 0) {
        showError('購物車是空的，請先選擇商品！');
        return;
    }
    
    // 建構購物車 HTML 內容
    let cartHTML = '';
    
    cart.forEach((item, index) => {
        cartHTML += `
            <div class="cart-item mb-3 p-3 border rounded">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6 class="mb-1">${item.productName}</h6>
                        ${item.variantName ? `<small class="text-muted">規格: ${item.variantName}</small><br>` : ''}
                        <small class="text-muted">單價: $${item.price}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="d-flex align-items-center justify-content-end">
                            <button class="btn btn-sm btn-outline-secondary me-2" onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="mx-2">${item.quantity}</span>
                            <button class="btn btn-sm btn-outline-secondary me-2" onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="mt-2">
                            <strong>$${item.subtotal}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // 添加總計資訊
    cartHTML += `
        <hr>
        <div class="row">
            <div class="col-md-8">
                <h6>商品總計:</h6>
                <h6>運費:</h6>
                <h5><strong>總金額:</strong></h5>
            </div>
            <div class="col-md-4 text-end">
                <h6>$${cartSummary.totalAmount}</h6>
                <h6>$${cartSummary.shippingFee}</h6>
                <h5><strong>$${cartSummary.finalAmount}</strong></h5>
            </div>
        </div>
        <hr>
        <div class="text-center">
            <button class="btn btn-outline-danger btn-sm" onclick="clearCart()">
                <i class="fas fa-trash"></i>
                清空購物車
            </button>
        </div>
    `;
    
    // 填充 modal 內容並顯示
    document.getElementById('cartModalBody').innerHTML = cartHTML;
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    cartModal.show();
}

// 前往結帳
function goToCheckout() {
    if (!cart || cart.length === 0) {
        showError('購物車是空的，請先選擇商品！');
        return;
    }
    
    // 顯示結帳確認訊息
    const confirmMessage = `🛒 準備結帳！\n\n商品數量: ${cartSummary.totalItems} 件\n總金額: $${cartSummary.finalAmount}\n\n請關閉此頁面，回到 LINE 聊天中輸入「我要送出」完成訂單！`;
    
    if (confirm(confirmMessage)) {
        // 關閉 LIFF 視窗
        liff.closeWindow();
    }
}

// 顯示成功訊息
function showSuccess(message) {
    console.log('✅', message);
    
    // 使用 Bootstrap Toast 顯示成功訊息
    const successToastBody = document.getElementById('successToastBody');
    const successToast = document.getElementById('successToast');
    
    if (successToastBody && successToast) {
        successToastBody.textContent = message;
        const toast = new bootstrap.Toast(successToast);
        toast.show();
    }
}

// 顯示錯誤訊息
function showError(message) {
    console.error('❌', message);
    
    // 使用 Bootstrap Toast 顯示錯誤訊息
    const errorToastBody = document.getElementById('errorToastBody');
    const errorToast = document.getElementById('errorToast');
    
    if (errorToastBody && errorToast) {
        errorToastBody.textContent = message;
        const toast = new bootstrap.Toast(errorToast);
        toast.show();
    } else {
        // 如果 toast 元素不存在，使用 alert 作為後備
        alert(message);
    }
} 

// 顯示結帳模式
function showCheckoutMode() {
    if (!cart || cart.length === 0) {
        showError('購物車是空的！');
        return;
    }
    
    // 隱藏商品瀏覽區域
    document.querySelector('.category-filter').style.display = 'none';
    document.querySelector('#searchSection').style.display = 'none';
    document.querySelector('#productsGrid').style.display = 'none';
    document.querySelector('#noProductsMessage').style.display = 'none';
    
    // 創建結帳界面
    const checkoutHTML = `
        <div id="checkoutContainer" class="checkout-container">
            <div class="row">
                <div class="col-12">
                    <div class="checkout-header text-center mb-4">
                        <h3><i class="fas fa-clipboard-check"></i> 填寫收件資料</h3>
                        <p class="text-muted">請填寫以下資訊完成訂單</p>
                    </div>
                </div>
            </div>
            
            <!-- 訂單摘要 -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-shopping-cart"></i> 訂單摘要</h5>
                        </div>
                        <div class="card-body" id="checkoutOrderSummary">
                            <!-- 訂單內容將在這裡顯示 -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 收件資料表單 -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-user"></i> 收件資料</h5>
                        </div>
                        <div class="card-body">
                            <form id="checkoutForm">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="recipientName" class="form-label">收件人姓名 *</label>
                                        <input type="text" class="form-control" id="recipientName" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="recipientPhone" class="form-label">聯絡電話 *</label>
                                        <input type="tel" class="form-control" id="recipientPhone" required>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="deliveryMethod" class="form-label">收件方式 *</label>
                                    <select class="form-select" id="deliveryMethod" required>
                                        <option value="">請選擇收件方式</option>
                                        <option value="宅配到府">宅配到府</option>
                                        <option value="7-11店到店">7-11 店到店</option>
                                        <option value="全家店到店">全家 店到店</option>
                                        <option value="萊爾富店到店">萊爾富 店到店</option>
                                        <option value="OK店到店">OK 店到店</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="deliveryAddress" class="form-label">收件地址 *</label>
                                    <textarea class="form-control" id="deliveryAddress" rows="3" required placeholder="請填寫完整地址（如選擇店到店請填寫門市資訊）"></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="paymentMethod" class="form-label">付款方式 *</label>
                                    <select class="form-select" id="paymentMethod" required>
                                        <option value="">請選擇付款方式</option>
                                        <option value="銀行轉帳">銀行轉帳</option>
                                        <option value="LINE Pay">LINE Pay</option>
                                        <option value="貨到付款">貨到付款</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="orderNotes" class="form-label">訂單備註</label>
                                    <textarea class="form-control" id="orderNotes" rows="2" placeholder="特殊需求或備註事項（選填）"></textarea>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary btn-lg">
                                        <i class="fas fa-check"></i> 確認送出訂單
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" onclick="exitCheckoutMode()">
                                        <i class="fas fa-arrow-left"></i> 返回購物
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 插入結帳界面到主容器
    const container = document.querySelector('.container.mt-3');
    container.innerHTML = checkoutHTML;
    
    // 填充訂單摘要
    populateOrderSummary();
    
    // 綁定表單提交事件
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);
    
    console.log('結帳模式已啟動');
}

// 填充訂單摘要
function populateOrderSummary() {
    const summaryContainer = document.getElementById('checkoutOrderSummary');
    
    let summaryHTML = '';
    
    cart.forEach((item, index) => {
        summaryHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <strong>${item.productName}</strong>
                    ${item.variantName ? `<br><small class="text-muted">規格: ${item.variantName}</small>` : ''}
                </div>
                <div class="text-end">
                    <div>${item.quantity} x $${item.price}</div>
                    <div><strong>$${item.subtotal}</strong></div>
                </div>
            </div>
            ${index < cart.length - 1 ? '<hr>' : ''}
        `;
    });
    
    summaryHTML += `
        <hr>
        <div class="d-flex justify-content-between">
            <span>商品總計:</span>
            <span>$${cartSummary.totalAmount}</span>
        </div>
        <div class="d-flex justify-content-between">
            <span>運費:</span>
            <span>$${cartSummary.shippingFee}</span>
        </div>
        <div class="d-flex justify-content-between">
            <span>折扣:</span>
            <span>$0</span>
        </div>
        <hr>
        <div class="d-flex justify-content-between h5">
            <strong>總金額:</strong>
            <strong class="text-primary">$${cartSummary.finalAmount}</strong>
        </div>
    `;
    
    summaryContainer.innerHTML = summaryHTML;
}

// 處理結帳表單提交
async function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    try {
        // 收集表單資料
        const formData = {
            recipientName: document.getElementById('recipientName').value,
            recipientPhone: document.getElementById('recipientPhone').value,
            deliveryMethod: document.getElementById('deliveryMethod').value,
            deliveryAddress: document.getElementById('deliveryAddress').value,
            paymentMethod: document.getElementById('paymentMethod').value,
            orderNotes: document.getElementById('orderNotes').value
        };
        
        // 驗證必填欄位
        if (!formData.recipientName || !formData.recipientPhone || !formData.deliveryMethod || !formData.deliveryAddress || !formData.paymentMethod) {
            showError('請填寫所有必填欄位');
            return;
        }
        
        // 提交訂單
        const userId = liff.getContext().userId;
        const orderData = {
            customerInfo: formData,
            items: cart,
            summary: cartSummary
        };
        
        const response = await fetch(`/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                orderData: orderData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 訂單成功，清空購物車並顯示成功訊息
            await clearCart();
            showSuccess('訂單已成功送出！感謝您的購買。');
            
            // 3秒後關閉 LIFF
            setTimeout(() => {
                liff.closeWindow();
            }, 3000);
            
        } else {
            throw new Error(result.message || '訂單提交失敗');
        }
        
    } catch (error) {
        console.error('提交訂單失敗:', error);
        showError('提交訂單失敗，請重新嘗試');
    }
}

// 退出結帳模式
function exitCheckoutMode() {
    // 重新載入頁面以回到購物模式
    window.location.reload();
} 