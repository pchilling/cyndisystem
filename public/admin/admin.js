// 管理員後台 JavaScript

let salesChart;
let currentOrderId = null;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});

// 切換頁面區段
function showSection(sectionId) {
    // 隱藏所有區段
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 移除所有導航項目的 active 類別
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 顯示指定區段
    document.getElementById(sectionId).style.display = 'block';
    
    // 為對應的導航項目添加 active 類別
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
    
    // 根據不同頁面載入對應數據
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'products':
            loadProducts();
            break;
        case 'reports':
            initializeReportsPage();
            break;
        default:
            break;
    }
}

// 載入儀表板數據
async function loadDashboard() {
    try {
        const response = await fetch('/admin/dashboard?key=dev');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
            updateSalesChart(result.data.chartData);
            updateRecentOrders(result.data.recentOrders);
        }
    } catch (error) {
        console.error('載入儀表板失敗:', error);
        showAlert('載入儀表板失敗', 'danger');
    }
}

// 更新儀表板統計數據
function updateDashboardStats(data) {
    const overview = data.overview || {};
    
    document.getElementById('totalOrders').textContent = overview.totalOrders || 0;
    document.getElementById('pendingOrders').textContent = overview.pendingOrders || 0;
    document.getElementById('totalRevenue').textContent = `$${(overview.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('totalCustomers').textContent = overview.totalCustomers || 0;
}

// 更新銷售趨勢圖
function updateSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData?.salesTrend?.map(item => item.date) || ['暫無數據'],
            datasets: [{
                label: '銷售額',
                data: chartData?.salesTrend?.map(item => item.amount) || [0],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 更新最近訂單
function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-inbox"></i>
                <p class="mt-2">暫無最近訂單</p>
            </div>
        `;
        return;
    }
    
    const ordersHtml = orders.map(order => `
        <div class="d-flex justify-content-between align-items-center mb-3 p-2 border-bottom">
            <div>
                <div class="fw-bold">${order.orderNumber}</div>
                <small class="text-muted">${order.customerName}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success">$${order.amount.toLocaleString()}</div>
                <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = ordersHtml;
}

// 載入訂單列表
async function loadOrders() {
    try {
        const status = document.getElementById('orderStatusFilter')?.value || '';
        const mergeStatus = document.getElementById('mergeStatusFilter')?.value || '';
        const search = document.getElementById('orderSearch')?.value || '';
        
        const queryParams = new URLSearchParams({
            key: 'dev',
            ...(status && { status }),
            ...(mergeStatus && { mergeStatus }),
            ...(search && { search })
        });
        
        const response = await fetch(`/admin/orders?${queryParams}`);
        const result = await response.json();
        
        if (result.success) {
            updateOrdersTable(result.data.orders);
            updatePendingMergeCount(result.data.orders);
        }
    } catch (error) {
        console.error('載入訂單失敗:', error);
        showAlert('載入訂單失敗', 'danger');
    }
}

// 快速篩選函數
async function filterOrdersByStatus(status) {
    document.getElementById('orderStatusFilter').value = status;
    if (document.getElementById('mergeStatusFilter')) {
        document.getElementById('mergeStatusFilter').value = '';
    }
    await loadOrders();
}

async function filterOrdersByMergeStatus(mergeStatus) {
    if (document.getElementById('orderStatusFilter')) {
        document.getElementById('orderStatusFilter').value = '';
    }
    document.getElementById('mergeStatusFilter').value = mergeStatus;
    await loadOrders();
}

// 更新待併單數量
function updatePendingMergeCount(orders) {
    const pendingCount = orders.filter(order => order.mergeStatus === '待併單').length;
    const badge = document.getElementById('pendingMergeCount');
    if (badge) {
        badge.textContent = pendingCount;
    }
    
    // 控制批量併單按鈕的顯示
    const batchBtn = document.getElementById('batchMergeBtn');
    if (batchBtn) {
        batchBtn.style.display = pendingCount > 1 ? 'block' : 'none';
    }
}

// 顯示批量併單處理彈窗
async function showBatchMergeModal() {
    try {
        // 獲取所有待併單訂單
        const response = await fetch('/admin/orders?key=dev&mergeStatus=待併單');
        const result = await response.json();
        
        if (!result.success || !result.data.orders.length) {
            showAlert('沒有待併單訂單', 'info');
            return;
        }
        
        const orders = result.data.orders;
        
        // 按客戶分組
        const customerGroups = {};
        orders.forEach(order => {
            const customerKey = order.customerId || order.customerName;
            if (!customerGroups[customerKey]) {
                customerGroups[customerKey] = {
                    customerName: order.customerName,
                    orders: [],
                    totalAmount: 0
                };
            }
            customerGroups[customerKey].orders.push(order);
            customerGroups[customerKey].totalAmount += order.amount;
        });
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'batchMergeModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-layer-group me-2"></i>
                            批量併單處理
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">以下是按客戶分組的待併單訂單，您可以為每個客戶處理併單：</p>
                        <div class="accordion" id="customerAccordion">
                            ${Object.entries(customerGroups).map(([customerKey, group], index) => `
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="heading${index}">
                                        <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                                            <div class="d-flex justify-content-between w-100 me-3">
                                                <span class="fw-bold">${group.customerName}</span>
                                                <span class="badge bg-primary">${group.orders.length} 筆訂單 | $${group.totalAmount.toLocaleString()}</span>
                                            </div>
                                        </button>
                                    </h2>
                                    <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#customerAccordion">
                                        <div class="accordion-body">
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>訂單編號</th>
                                                            <th>金額</th>
                                                            <th>下單時間</th>
                                                            <th>操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${group.orders.map(order => `
                                                            <tr>
                                                                <td>
                                                                    <div class="fw-bold">${order.orderNumber}</div>
                                                                    <small class="text-muted">${order.id}</small>
                                                                </td>
                                                                <td class="fw-bold text-success">$${order.amount.toLocaleString()}</td>
                                                                <td>
                                                                    <div>${new Date(order.createdAt).toLocaleDateString('zh-TW')}</div>
                                                                    <small class="text-muted">${new Date(order.createdAt).toLocaleTimeString('zh-TW')}</small>
                                                                </td>
                                                                <td>
                                                                    <button class="btn btn-sm btn-outline-info" onclick="viewOrderItems('${order.id}')">
                                                                        <i class="fas fa-list"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div class="mt-3">
                                                <button class="btn btn-success" onclick="processCustomerOrders('${customerKey}', '${group.customerName}', ${JSON.stringify(group.orders).replace(/"/g, '&quot;')})">
                                                    <i class="fas fa-shipping-fast me-2"></i>
                                                    處理 ${group.customerName} 的 ${group.orders.length} 筆訂單
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // 模態框關閉後移除元素
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
    } catch (error) {
        console.error('載入批量併單失敗:', error);
        showAlert('載入批量併單失敗', 'danger');
    }
}

// 處理特定客戶的訂單
function processCustomerOrders(customerKey, customerName, orders) {
    // 關閉批量處理彈窗
    const batchModal = bootstrap.Modal.getInstance(document.getElementById('batchMergeModal'));
    batchModal.hide();
    
    // 顯示該客戶的併單選擇彈窗
    showMergeOrdersModal(orders, customerName);
}

// 處理單筆訂單（建立出貨批次）
async function processOrder(orderId, customerId, customerName) {
    try {
        // 獲取該客戶的所有待併單
        const response = await fetch(`/admin/orders?key=dev&mergeStatus=待併單&customerId=${customerId}`);
        const result = await response.json();
        
        if (result.success && result.data.orders) {
            const customerOrders = result.data.orders;
            
            if (customerOrders.length === 1) {
                // 只有一個訂單，直接建立出貨批次
                await createSingleOrderShipment(orderId, customerName);
            } else {
                // 多個訂單，讓 Cyndi 選擇要併哪些
                showMergeOrdersModal(customerOrders, customerName);
            }
        }
    } catch (error) {
        console.error('處理訂單失敗:', error);
        showAlert('處理訂單失敗', 'danger');
    }
}

// 顯示併單選擇彈窗
function showMergeOrdersModal(orders, customerName) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'mergeOrdersModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-layer-group me-2"></i>
                        選擇要合併出貨的訂單 - ${customerName}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">請勾選要一起出貨的訂單：</p>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th width="50">
                                        <input type="checkbox" id="selectAllOrders" onchange="toggleAllOrders(this)">
                                    </th>
                                    <th>訂單編號</th>
                                    <th>金額</th>
                                    <th>下單時間</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orders.map(order => `
                                    <tr>
                                        <td>
                                            <input type="checkbox" class="order-checkbox" value="${order.id}" data-amount="${order.amount}">
                                        </td>
                                        <td>
                                            <div class="fw-bold">${order.orderNumber}</div>
                                            <small class="text-muted">${order.id}</small>
                                        </td>
                                        <td class="fw-bold text-success">$${order.amount.toLocaleString()}</td>
                                        <td>
                                            <div>${new Date(order.createdAt).toLocaleDateString('zh-TW')}</div>
                                            <small class="text-muted">${new Date(order.createdAt).toLocaleTimeString('zh-TW')}</small>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-info" onclick="viewOrderItems('${order.id}')">
                                                <i class="fas fa-list"></i> 查看商品
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-3 p-3 bg-light rounded">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>已選擇訂單：<span id="selectedCount">0</span> 筆</strong>
                            </div>
                            <div class="col-md-6 text-end">
                                <strong>總金額：$<span id="selectedAmount">0</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-success" onclick="createSelectedOrdersShipment('${customerName}')" id="createShipmentBtn" disabled>
                        <i class="fas fa-shipping-fast me-2"></i>建立出貨批次
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // 綁定勾選事件
    modal.addEventListener('change', updateSelectedSummary);
    
    // 模態框關閉後移除元素
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// 切換全選
function toggleAllOrders(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateSelectedSummary();
}

// 更新已選擇的摘要
function updateSelectedSummary() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const count = checkboxes.length;
    const totalAmount = Array.from(checkboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
    
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectedAmount').textContent = totalAmount.toLocaleString();
    document.getElementById('createShipmentBtn').disabled = count === 0;
}

// 建立選定訂單的出貨批次
async function createSelectedOrdersShipment(customerName) {
    try {
        const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            showAlert('請至少選擇一個訂單', 'warning');
            return;
        }
        
        const selectedOrderIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const totalAmount = Array.from(selectedCheckboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
        
        // 獲取所有選定訂單的訂單項目
        const allOrderItems = [];
        for (const orderId of selectedOrderIds) {
            const response = await fetch(`/admin/orders/${orderId}/items?key=dev`);
            const result = await response.json();
            if (result.success) {
                allOrderItems.push(...result.data);
            }
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${selectedOrderIds.length}筆訂單 - ${new Date().toLocaleDateString('zh-TW')}`,
            // 暫時不設定 customerId，因為 Notion 的 relation 欄位比較複雜
            // customerId: null,
            orderItemIds: allOrderItems.map(item => item.id),
            status: '待付款',
            notes: `合併 ${selectedOrderIds.length} 筆訂單：${selectedOrderIds.join(', ')}`
        };
        
        console.log('📦 發送出貨批次資料:', shipmentData);
        
        const createResponse = await fetch('/admin/create-shipment?key=dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        console.log('📦 服務器回應狀態:', createResponse.status);
        
        let createResult;
        try {
            createResult = await createResponse.json();
            console.log('📦 服務器回應內容:', createResult);
        } catch (parseError) {
            console.error('📦 解析回應 JSON 失敗:', parseError);
            const responseText = await createResponse.text();
            console.error('📦 原始回應內容:', responseText);
            throw new Error(`服務器回應解析失敗 (${createResponse.status}): ${responseText}`);
        }
        
        if (createResult.success) {
            // 關閉模態框
            const modalElement = document.getElementById('mergeOrdersModal');
            const modal = modalElement ? bootstrap.Modal.getInstance(modalElement) : null;
            if (modal) {
                modal.hide();
            }
            
            showAlert(`✅ 已為 ${customerName} 建立出貨批次<br>合併 ${selectedOrderIds.length} 筆訂單，總金額 $${totalAmount.toLocaleString()}`, 'success');
            await loadOrders(); // 重新載入訂單列表
            
            // 詢問是否發送付款通知
            if (confirm(`是否立即發送付款通知給 ${customerName}？`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || '建立出貨批次失敗');
        }
    } catch (error) {
        console.error('建立出貨批次失敗:', error);
        showAlert('建立出貨批次失敗: ' + error.message, 'danger');
    }
}

// 查看訂單商品
async function viewOrderItems(orderId) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/items?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const items = result.data;
            const itemsHtml = items.map(item => `
                <div class="border-bottom pb-2 mb-2">
                    <div class="fw-bold">${item.productName || '商品'}</div>
                    <div class="text-muted">${item.notes}</div>
                    <div>數量：${item.quantity} | 單價：$${item.unitPrice} | 小計：$${item.subtotal}</div>
                </div>
            `).join('');
            
            showAlert(`
                <h6>訂單商品明細</h6>
                ${itemsHtml}
            `, 'info');
        }
    } catch (error) {
        console.error('查看訂單商品失敗:', error);
        showAlert('查看訂單商品失敗', 'danger');
    }
}

// 建立單筆訂單的出貨批次
async function createSingleOrderShipment(orderId, customerName) {
    try {
        // 取得訂單項目
        const orderItemsResponse = await fetch(`/admin/orders/${orderId}/items?key=dev`);
        const orderItemsResult = await orderItemsResponse.json();
        
        if (!orderItemsResult.success) {
            throw new Error('無法取得訂單項目');
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${new Date().toLocaleDateString('zh-TW')}`,
            // 不再傳 customerId，改由後端依 orderItemIds 推導
            orderItemIds: orderItemsResult.data.map(item => item.id),
            status: '待付款',
            notes: '單筆訂單直接出貨'
        };
        
        const createResponse = await fetch('/admin/create-shipment?key=dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        const createResult = await createResponse.json();
        
        if (createResult.success) {
            showAlert(`✅ 已為 ${customerName} 建立出貨批次`, 'success');
            await loadOrders(); // 重新載入訂單列表
            
            // 詢問是否發送付款通知
            if (confirm(`是否立即發送付款通知給 ${customerName}？`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || '建立出貨批次失敗');
        }
    } catch (error) {
        console.error('建立出貨批次失敗:', error);
        showAlert('建立出貨批次失敗: ' + error.message, 'danger');
    }
}

// 發送付款通知
async function sendPaymentNotification(shipmentId, customerName) {
    try {
        const response = await fetch(`/admin/send-payment-request/${shipmentId}?key=dev`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`✅ 已發送付款通知給 ${customerName}`, 'success');
        } else {
            throw new Error(result.message || '發送付款通知失敗');
        }
    } catch (error) {
        console.error('發送付款通知失敗:', error);
        showAlert('發送付款通知失敗: ' + error.message, 'warning');
    }
}

// 更新訂單表格
function updateOrdersTable(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">暫無訂單數據</td>
            </tr>
        `;
        return;
    }
    
    const ordersHtml = orders.map(order => `
        <tr>
            <td>
                <div class="fw-bold">${order.orderNumber}</div>
                <small class="text-muted">${order.id}</small>
            </td>
            <td>
                <div>${order.customerName}</div>
                <small class="text-muted">${order.customerPhone}</small>
            </td>
            <td class="fw-bold text-success">$${order.amount.toLocaleString()}</td>
            <td>
                <div class="d-flex flex-column">
                    <span class="badge ${getStatusBadgeClass(order.status)} mb-1">${order.status}</span>
                    <div class="order-progress">
                        <div class="order-progress-bar" style="width: ${getStatusProgress(order.status)}%"></div>
                    </div>
                    <small class="text-muted mt-1">${getStatusDescription(order.status)}</small>
                </div>
            </td>
            <td>
                <span class="badge ${getMergeStatusBadgeClass(order.mergeStatus || '待併單')}">${order.mergeStatus || '待併單'}</span>
            </td>
            <td>
                <div>${new Date(order.createdAt).toLocaleDateString('zh-TW')}</div>
                <small class="text-muted">${new Date(order.createdAt).toLocaleTimeString('zh-TW')}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrder('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openUpdateStatusModal('${order.id}', '${order.status}')">
                    <i class="fas fa-edit"></i>
                </button>
                ${(order.mergeStatus === '待併單') ? `
                <button class="btn btn-sm btn-outline-success" onclick="processOrder('${order.id}', '${order.customerId}', '${order.customerName}')" title="建立出貨批次">
                    <i class="fas fa-shipping-fast"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// 獲取狀態徽章類別 - 按照建議的標準顏色
function getStatusBadgeClass(status) {
    const statusClasses = {
        // 主要訂單狀態 - 標準顏色系統
        '待付款': 'bg-warning text-dark',        // 🟡 黃色 - 提醒付款
        '已付款': 'bg-success',                  // 🟢 綠色 - 表示成功
        '配貨中': 'bg-info',                     // 🔵 藍色 - 處理中進度
        '已出貨': 'bg-purple',                   // 🟣 紫色 - 運輸中
        '已完成': 'bg-light text-dark',          // ⚪️ 淺灰 - 任務結束
        '已取消': 'bg-danger',                   // 🔴 紅色 - 結束、異常
        
        // 新增的特殊狀態
        '退貨中': 'bg-warning-soft',             // 🟨 淺黃 - 退貨處理中
        '退款中': 'bg-orange',                   // 🟠 橙色 - 退款處理中
        '糾紛中': 'bg-dark',                     // ⚫ 深色 - 需要關注
        '暫停': 'bg-secondary'                   // ⚫ 灰色 - 暫停狀態
    };
    return statusClasses[status] || 'bg-secondary';
}

// 獲取併單狀態徽章類別
function getMergeStatusBadgeClass(mergeStatus) {
    const mergeStatusClasses = {
        '待併單': 'bg-warning text-dark',         // 🟡 等待處理
        '已併單': 'bg-info',                     // 🔵 已經合併
        '部分出貨': 'bg-purple',                 // 🟣 部分完成
        '已完成': 'bg-success'                   // 🟢 全部完成
    };
    return mergeStatusClasses[mergeStatus] || 'bg-secondary';
}

// 獲取狀態進度百分比
function getStatusProgress(status) {
    const progressMap = {
        '待付款': 10,
        '已付款': 30,
        '配貨中': 60,
        '已出貨': 80,
        '已完成': 100,
        '已取消': 0,
        '退貨中': 50,
        '退款中': 75
    };
    return progressMap[status] || 0;
}

// 獲取狀態的中文描述
function getStatusDescription(status) {
    const descriptions = {
        '待付款': '等待客戶付款',
        '已付款': '付款確認完成',
        '配貨中': '正在準備商品',
        '已出貨': '商品已寄出',
        '已完成': '訂單完成',
        '已取消': '訂單已取消',
        '退貨中': '客戶退貨處理中',
        '退款中': '退款處理中',
        '糾紛中': '訂單糾紛處理中',
        '暫停': '訂單暫停處理'
    };
    return descriptions[status] || status;
}

// 查看訂單詳情
function viewOrder(orderId) {
    // 這裡可以實現訂單詳情查看功能
    showAlert(`查看訂單 ${orderId} 的詳情功能開發中...`, 'info');
}

// 打開更新狀態模態框
function openUpdateStatusModal(orderId, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('newOrderStatus').value = currentStatus;
    document.getElementById('orderNotes').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    modal.show();
}

// 更新訂單狀態
async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    try {
        const status = document.getElementById('newOrderStatus').value;
        const notes = document.getElementById('orderNotes').value;
        
        // 檢查狀態轉換邏輯
        const statusTransitionResult = checkStatusTransition(status);
        if (statusTransitionResult.requiresConfirmation) {
            if (!confirm(statusTransitionResult.message)) {
                return;
            }
        }
        
        const response = await fetch(`/admin/orders/${currentOrderId}/status?key=dev`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                status, 
                notes,
                autoActions: statusTransitionResult.autoActions
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            let message = '訂單狀態已更新';
            if (statusTransitionResult.autoActions.length > 0) {
                message += `<br><small>自動執行：${statusTransitionResult.autoActions.join('、')}</small>`;
            }
            showAlert(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('updateOrderModal')).hide();
            loadOrders(); // 重新載入訂單列表
        } else {
            showAlert('更新失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('更新訂單狀態失敗:', error);
        showAlert('更新失敗', 'danger');
    }
}

// 檢查狀態轉換邏輯
function checkStatusTransition(newStatus) {
    const result = {
        requiresConfirmation: false,
        message: '',
        autoActions: []
    };
    
    switch (newStatus) {
        case '已付款':
            result.autoActions.push('發送付款確認通知');
            result.requiresConfirmation = true;
            result.message = '確認收到付款了嗎？\n系統將自動發送確認通知給客戶。';
            break;
            
        case '已出貨':
            result.autoActions.push('發送出貨通知', '提供物流資訊');
            result.requiresConfirmation = true;
            result.message = '確認商品已出貨了嗎？\n系統將自動通知客戶並提供追蹤資訊。';
            break;
            
        case '已完成':
            result.autoActions.push('發送完成確認');
            result.requiresConfirmation = true;
            result.message = '確認訂單已完成嗎？\n系統將發送完成通知給客戶。';
            break;
            
        case '已取消':
            result.autoActions.push('發送取消通知');
            result.requiresConfirmation = true;
            result.message = '確認要取消此訂單嗎？\n如果客戶已付款，請另外處理退款。';
            break;
            
        case '退貨中':
            result.autoActions.push('發送退貨指引');
            result.requiresConfirmation = true;
            result.message = '確認客戶要退貨嗎？\n系統將發送退貨指引給客戶。';
            break;
            
        case '退款中':
            result.autoActions.push('啟動退款通知');
            result.requiresConfirmation = true;
            result.message = '確認要進行退款嗎？\n系統將通知客戶退款處理中。';
            break;
    }
    
    return result;
}

// 載入客戶列表
async function loadCustomers() {
    try {
        const level = document.getElementById('customerLevelFilter').value;
        const search = document.getElementById('customerSearch').value;
        
        // 構建查詢參數
        const params = new URLSearchParams();
        if (level) params.append('level', level);
        if (search) params.append('search', search);
        params.append('key', 'dev');
        
        const response = await fetch(`/admin/customers?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            updateCustomersTable(result.data.customers);
            updateCustomerStats(result.data.customers);
        } else {
            showAlert('載入客戶列表失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶列表失敗:', error);
        showAlert('載入客戶列表失敗', 'danger');
    }
}

// 更新客戶表格
function updateCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>目前沒有客戶資料</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const customersHtml = customers.map(customer => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <div class="customer-avatar me-3">
                        <i class="fas fa-user-circle fa-2x text-secondary"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${customer.name || '未知客戶'}</div>
                        <small class="text-muted">ID: ${customer.id.slice(-8)}</small>
                    </div>
                </div>
            </td>
            <td>
                <div>
                    <div><i class="fas fa-phone me-1"></i>${customer.phone || '-'}</div>
                    <small class="text-muted">
                        <i class="fab fa-line me-1"></i>${customer.lineId || '-'}
                    </small>
                </div>
            </td>
            <td>
                <span class="badge ${getCustomerLevelBadgeClass(customer.level)}">
                    ${customer.level || '一般會員'}
                </span>
            </td>
            <td>
                <div class="text-center">
                    <div class="fw-bold text-primary">${customer.stats?.totalOrders || 0}</div>
                    <small class="text-muted">筆訂單</small>
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(customer.stats?.totalSpent || 0)}
                </div>
                <small class="text-muted">
                    平均: ${formatCurrency(customer.stats?.averageOrderValue || 0)}
                </small>
            </td>
            <td>
                <div class="text-muted">
                    ${customer.stats?.lastOrderDate ? formatDate(customer.stats.lastOrderDate) : '尚未下單'}
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomerDetail('${customer.id}')" title="查看詳情">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="openEditCustomerModal('${customer.id}')" title="編輯">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = customersHtml;
}

// 更新客戶統計
function updateCustomerStats(customers) {
    if (!customers || customers.length === 0) {
        document.getElementById('totalCustomersCount').textContent = '0';
        document.getElementById('vipCustomersCount').textContent = '0';
        document.getElementById('activeCustomersCount').textContent = '0';
        document.getElementById('newCustomersCount').textContent = '0';
        return;
    }
    
    const vipCount = customers.filter(c => c.level === 'VIP會員').length;
    const activeCount = customers.filter(c => c.stats && c.stats.totalOrders > 0).length;
    
    // 計算本月新客戶（這裡簡化為總客戶數，實際應該根據註冊時間計算）
    const currentMonth = new Date().getMonth();
    const newCount = customers.filter(c => {
        if (!c.registeredAt) return false;
        const regMonth = new Date(c.registeredAt).getMonth();
        return regMonth === currentMonth;
    }).length;
    
    document.getElementById('totalCustomersCount').textContent = customers.length.toString();
    document.getElementById('vipCustomersCount').textContent = vipCount.toString();
    document.getElementById('activeCustomersCount').textContent = activeCount.toString();
    document.getElementById('newCustomersCount').textContent = newCount.toString();
}

// 獲取客戶等級徽章樣式
function getCustomerLevelBadgeClass(level) {
    const levelClasses = {
        'VIP會員': 'bg-warning text-dark',
        '一般會員': 'bg-secondary',
        '黑名單': 'bg-danger'
    };
    return levelClasses[level] || 'bg-secondary';
}

// 變數來儲存當前編輯的客戶 ID
let currentEditCustomerId = null;

// 查看客戶詳情
async function viewCustomerDetail(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const customer = data.customer;
            const stats = data.stats;
            const orders = data.orders;
            
            // 填充基本資訊
            document.getElementById('customerDetailName').textContent = customer.name || '-';
            document.getElementById('customerDetailPhone').textContent = customer.phone || '-';
            document.getElementById('customerDetailLineId').textContent = customer.lineId || '-';
            
            const levelBadge = document.getElementById('customerDetailLevel');
            levelBadge.textContent = customer.level || '一般會員';
            levelBadge.className = `badge ${getCustomerLevelBadgeClass(customer.level)}`;
            
            document.getElementById('customerDetailDeliveryMethod').textContent = customer.deliveryMethod || '-';
            document.getElementById('customerDetailAddress').textContent = customer.address || '-';
            document.getElementById('customerDetailRegisteredAt').textContent = customer.registeredAt ? formatDate(customer.registeredAt) : '-';
            document.getElementById('customerDetailNotes').textContent = customer.notes || '-';
            
            // 填充統計資訊
            document.getElementById('customerDetailTotalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('customerDetailTotalSpent').textContent = formatCurrency(stats.totalSpent || 0);
            document.getElementById('customerDetailAvgOrder').textContent = formatCurrency(stats.averageOrderValue || 0);
            document.getElementById('customerDetailLastOrder').textContent = stats.lastOrderDate ? formatDate(stats.lastOrderDate) : '-';
            
            // 填充訂單歷史
            updateCustomerOrdersTable(orders);
            
            // 儲存客戶 ID 供編輯使用
            currentEditCustomerId = customerId;
            
            // 顯示模態框
            const modal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
            modal.show();
        } else {
            showAlert('載入客戶詳情失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶詳情失敗:', error);
        showAlert('載入客戶詳情失敗', 'danger');
    }
}

// 更新客戶訂單表格
function updateCustomerOrdersTable(orders) {
    const tbody = document.getElementById('customerDetailOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-shopping-cart me-1"></i>
                    尚無訂單記錄
                </td>
            </tr>
        `;
        return;
    }
    
    // 只顯示最近 5 筆訂單
    const recentOrders = orders.slice(0, 5);
    
    const ordersHtml = recentOrders.map(order => `
        <tr>
            <td>
                <span class="font-monospace">${order.id.slice(-8)}</span>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td class="fw-bold">${formatCurrency(order.totalAmount || 0)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${order.status || '待付款'}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// 開啟編輯客戶模態框
async function openEditCustomerModal(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const customer = result.data.customer;
            
            // 填充編輯表單
            document.getElementById('editCustomerName').value = customer.name || '';
            document.getElementById('editCustomerPhone').value = customer.phone || '';
            document.getElementById('editCustomerLevel').value = customer.level || '一般會員';
            document.getElementById('editCustomerDeliveryMethod').value = customer.deliveryMethod || '宅配到府';
            document.getElementById('editCustomerAddress').value = customer.address || '';
            document.getElementById('editCustomerBirthday').value = customer.birthday || '';
            document.getElementById('editCustomerNotes').value = customer.notes || '';
            
            // 儲存客戶 ID
            currentEditCustomerId = customerId;
            
            // 顯示編輯模態框
            const modal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
            modal.show();
        } else {
            showAlert('載入客戶資料失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶資料失敗:', error);
        showAlert('載入客戶資料失敗', 'danger');
    }
}

// 從詳情模態框開啟編輯模態框
function editCustomer() {
    if (currentEditCustomerId) {
        // 關閉詳情模態框
        bootstrap.Modal.getInstance(document.getElementById('customerDetailModal')).hide();
        
        // 開啟編輯模態框
        setTimeout(() => {
            openEditCustomerModal(currentEditCustomerId);
        }, 300);
    }
}

// 儲存客戶變更
async function saveCustomerChanges() {
    if (!currentEditCustomerId) return;
    
    try {
        const updateData = {
            name: document.getElementById('editCustomerName').value.trim(),
            phone: document.getElementById('editCustomerPhone').value.trim(),
            level: document.getElementById('editCustomerLevel').value,
            deliveryMethod: document.getElementById('editCustomerDeliveryMethod').value,
            address: document.getElementById('editCustomerAddress').value.trim(),
            birthday: document.getElementById('editCustomerBirthday').value,
            notes: document.getElementById('editCustomerNotes').value.trim()
        };
        
        // 移除空值
        Object.keys(updateData).forEach(key => {
            if (!updateData[key] && updateData[key] !== '') {
                delete updateData[key];
            }
        });
        
        const response = await fetch(`/admin/customers/${currentEditCustomerId}?key=dev`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('客戶資料已更新', 'success');
            
            // 關閉編輯模態框
            bootstrap.Modal.getInstance(document.getElementById('editCustomerModal')).hide();
            
            // 重新載入客戶列表
            loadCustomers();
            
            // 清除當前編輯 ID
            currentEditCustomerId = null;
        } else {
            showAlert('更新客戶資料失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('更新客戶資料失敗:', error);
        showAlert('更新客戶資料失敗', 'danger');
    }
}

// 載入商品列表
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const style = document.getElementById('styleFilter').value;
        const color = document.getElementById('colorFilter').value;
        const size = document.getElementById('sizeFilter').value;
        const gender = document.getElementById('genderFilter').value;
        const status = document.getElementById('productStatusFilter').value;
        
        // 構建查詢參數
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (style) params.append('style', style);
        if (color) params.append('color', color);
        if (size) params.append('size', size);
        if (gender) params.append('gender', gender);
        if (status) params.append('status', status);
        params.append('key', 'dev');
        
        const response = await fetch(`/admin/products?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            updateProductsTable(result.data.products);
            updateProductStats(result.data.products);
        } else {
            showAlert('載入商品列表失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入商品列表失敗:', error);
        showAlert('載入商品列表失敗', 'danger');
    }
}

// 更新商品表格
function updateProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-box fa-2x mb-2"></i>
                    <p>目前沒有商品資料</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const productsHtml = products.map(product => `
        <tr>
            <td>
                <div class="fw-bold">${product.name || '未知商品'}</div>
                <small class="text-muted">ID: ${product.productCode || product.id.slice(-8)}</small>
            </td>
            <td>
                <div class="small">
                    ${product.description ? product.description.split(' ').filter(spec => spec.trim()).map(spec => 
                        `<span class="badge bg-light text-dark me-1 mb-1">${spec}</span>`
                    ).join('') : '<span class="text-muted">無規格資訊</span>'}
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(product.price || 0)}
                </div>
            </td>
            <td>
                <div class="small">
                    <div><strong>銷量:</strong> <span class="text-primary">${product.stats?.totalSold || 0}</span></div>
                    <div><strong>營收:</strong> <span class="text-success">${formatCurrency(product.stats?.totalRevenue || 0)}</span></div>
                    ${product.stats?.lastSold ? 
                        `<div class="text-muted">最後: ${formatDate(product.stats.lastSold)}</div>` : ''
                    }
                </div>
            </td>
            <td>
                <span class="badge ${getProductStatusBadgeClass(product.status)}">
                    ${product.status || '未設定'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewProductDetail('${product.id}')" title="查看詳情">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="openEditProductModal('${product.id}')" title="編輯">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = productsHtml;
}

// 更新商品統計
function updateProductStats(products) {
    if (!products || products.length === 0) {
        document.getElementById('totalProductsCount').textContent = '0';
        document.getElementById('activeProductsCount').textContent = '0';
        document.getElementById('hotProductsCount').textContent = '0';
        document.getElementById('lowStockCount').textContent = '0';
        return;
    }
    
    const activeCount = products.filter(p => p.status === '上架中').length;
    const hotCount = products.filter(p => p.stats && p.stats.totalSold > 5).length; // 銷量 > 5 算熱銷
    const lowStockCount = products.filter(p => p.variants && p.variants.some(v => v.stock < 5)).length; // 庫存 < 5 算不足
    
    document.getElementById('totalProductsCount').textContent = products.length.toString();
    document.getElementById('activeProductsCount').textContent = activeCount.toString();
    document.getElementById('hotProductsCount').textContent = hotCount.toString();
    document.getElementById('lowStockCount').textContent = lowStockCount.toString();
}

// 獲取商品狀態徽章樣式
function getProductStatusBadgeClass(status) {
    const statusClasses = {
        '上架中': 'bg-success',
        '已下架': 'bg-secondary',
        '售完': 'bg-danger',
        '預購中': 'bg-warning text-dark'
    };
    return statusClasses[status] || 'bg-secondary';
}

// 變數來儲存當前編輯的商品 ID
let currentEditProductId = null;

// 查看商品詳情
async function viewProductDetail(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const variant = data.variant;  // 現在是變體資料
            const stats = data.stats;
            const relatedVariants = data.relatedVariants || [];
            const recentOrders = data.recentOrders;
            
            // 填充基本資訊（現在是變體資訊）
            document.getElementById('productDetailName').textContent = variant.name || '-';
            document.getElementById('productDetailCode').textContent = variant.variant_id || variant.id.slice(-8);
            document.getElementById('productDetailCategory').textContent = '童裝';  // 固定分類
            document.getElementById('productDetailPrice').textContent = formatCurrency(variant.price || 0);
            document.getElementById('productDetailCreatedAt').textContent = '-';  // 變體沒有創建時間
            document.getElementById('productDetailDescription').textContent = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '-';
            
            const statusBadge = document.getElementById('productDetailStatus');
            statusBadge.textContent = variant.status || '未設定';
            statusBadge.className = `badge ${getProductStatusBadgeClass(variant.status)}`;
            
            // 填充統計資訊
            document.getElementById('productDetailTotalSold').textContent = stats.totalSold || 0;
            document.getElementById('productDetailTotalRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
            document.getElementById('productDetailAvgPrice').textContent = formatCurrency(stats.averagePrice || 0);
            document.getElementById('productDetailLastSold').textContent = stats.lastSold ? formatDate(stats.lastSold) : '-';
            
            // 填充相關變體資訊（同商品名稱的其他變體）
            updateProductVariantsTable([variant, ...relatedVariants]);
            
            // 填充最近銷售
            updateProductRecentOrdersTable(recentOrders);
            
            // 儲存商品 ID 供編輯使用
            currentEditProductId = productId;
            
            // 顯示模態框
            const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            modal.show();
        } else {
            showAlert('載入商品詳情失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入商品詳情失敗:', error);
        showAlert('載入商品詳情失敗', 'danger');
    }
}

// 更新商品變體表格
function updateProductVariantsTable(variants) {
    const tbody = document.getElementById('productDetailVariants');
    
    if (!variants || variants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-layer-group me-1"></i>
                    尚無變體資料
                </td>
            </tr>
        `;
        return;
    }
    
    const variantsHtml = variants.map(variant => `
        <tr>
            <td>${variant.style || '-'}</td>
            <td>${variant.color || '-'}</td>
            <td>${variant.size || '-'}</td>
            <td>${variant.gender || '-'}</td>
            <td class="fw-bold">${formatCurrency(variant.price || 0)}</td>
            <td>
                <span class="badge ${getProductStatusBadgeClass(variant.status)}">
                    ${variant.status || '未知'}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = variantsHtml;
}

// 更新商品最近銷售表格
function updateProductRecentOrdersTable(orders) {
    const tbody = document.getElementById('productDetailRecentOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-history me-1"></i>
                    尚無銷售記錄
                </td>
            </tr>
        `;
        return;
    }
    
    const ordersHtml = orders.slice(0, 5).map(order => `
        <tr>
            <td>
                <span class="font-monospace">${order.orderId ? order.orderId.slice(-8) : '-'}</span>
            </td>
            <td class="fw-bold">${order.quantity || 0}</td>
            <td>${formatCurrency(order.unitPrice || 0)}</td>
            <td>${formatDate(order.createdAt)}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// 開啟編輯商品模態框
async function openEditProductModal(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const variant = result.data.variant;  // 現在是變體資料
            
            // 填充編輯表單（現在是變體編輯）
            document.getElementById('editProductName').value = variant.name || '';
            document.getElementById('editProductCode').value = variant.variant_id || '';
            document.getElementById('editProductCategory').value = '童裝';  // 固定分類
            document.getElementById('editProductPrice').value = variant.price || 0;
            document.getElementById('editProductStatus').value = variant.status || '未設定';
            document.getElementById('editProductDescription').value = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '';
            
            // 儲存商品 ID
            currentEditProductId = productId;
            
            // 顯示編輯模態框
            const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
            modal.show();
        } else {
            showAlert('載入商品資料失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入商品資料失敗:', error);
        showAlert('載入商品資料失敗', 'danger');
    }
}

// 從詳情模態框開啟編輯模態框
function editProduct() {
    if (currentEditProductId) {
        // 關閉詳情模態框
        bootstrap.Modal.getInstance(document.getElementById('productDetailModal')).hide();
        
        // 開啟編輯模態框
        setTimeout(() => {
            openEditProductModal(currentEditProductId);
        }, 300);
    }
}

// 儲存商品變更
async function saveProductChanges() {
    if (!currentEditProductId) return;
    
    try {
        const updateData = {
            name: document.getElementById('editProductName').value.trim(),
            productCode: document.getElementById('editProductCode').value.trim(),
            mainCategory: document.getElementById('editProductCategory').value,
            price: parseFloat(document.getElementById('editProductPrice').value) || 0,
            status: document.getElementById('editProductStatus').value,
            description: document.getElementById('editProductDescription').value.trim()
        };
        
        // 移除空值
        Object.keys(updateData).forEach(key => {
            if (!updateData[key] && updateData[key] !== 0) {
                delete updateData[key];
            }
        });
        
        const response = await fetch(`/admin/products/${currentEditProductId}?key=dev`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('商品資料已更新', 'success');
            
            // 關閉編輯模態框
            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            
            // 重新載入商品列表
            loadProducts();
            
            // 清除當前編輯 ID
            currentEditProductId = null;
        } else {
            showAlert('更新商品資料失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('更新商品資料失敗:', error);
        showAlert('更新商品資料失敗', 'danger');
    }
}

// 顯示提示訊息
function showAlert(message, type = 'info') {
    // 創建提示框
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3秒後自動消失
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 格式化金額
function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
} 

// ==================== 銷售報表功能 ====================

// 載入銷售報表
async function loadSalesReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const period = document.getElementById('reportPeriod').value;
        
        // 如果沒有指定日期，使用最近30天
        let queryStartDate = startDate;
        let queryEndDate = endDate;
        
        if (!startDate || !endDate) {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            queryStartDate = thirtyDaysAgo.toISOString().split('T')[0];
            queryEndDate = today.toISOString().split('T')[0];
            
            // 更新輸入框
            document.getElementById('reportStartDate').value = queryStartDate;
            document.getElementById('reportEndDate').value = queryEndDate;
        }
        
        const params = new URLSearchParams({
            startDate: queryStartDate,
            endDate: queryEndDate,
            period: period,
            key: 'dev'
        });
        
        const response = await fetch(`/admin/reports/sales?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            updateReportSummary(result.data.summary);
            updateSalesTrendChart(result.data.trends);
            updateTopProductsTable(result.data.topProducts);
            updateCustomerAnalysis(result.data.customerAnalysis);
            showAlert('報表已生成', 'success');
        } else {
            showAlert('生成報表失敗: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入銷售報表失敗:', error);
        showAlert('載入銷售報表失敗', 'danger');
    }
}

// 更新報表摘要
function updateReportSummary(summary) {
    document.getElementById('reportTotalOrders').textContent = summary.totalOrders || 0;
    document.getElementById('reportTotalRevenue').textContent = formatCurrency(summary.totalRevenue || 0);
    document.getElementById('reportTotalItems').textContent = summary.totalItems || 0;
    document.getElementById('reportAvgOrderValue').textContent = formatCurrency(summary.averageOrderValue || 0);
    document.getElementById('reportCompletedOrders').textContent = summary.completedOrders || 0;
    document.getElementById('reportPendingOrders').textContent = summary.pendingOrders || 0;
    document.getElementById('reportCancelledOrders').textContent = summary.cancelledOrders || 0;
}

// 更新銷售趨勢圖表
let salesTrendChartInstance = null;

function updateSalesTrendChart(trends) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    
    // 銷毀舊圖表
    if (salesTrendChartInstance) {
        salesTrendChartInstance.destroy();
    }
    
    const labels = trends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('zh-TW', { 
            month: 'short', 
            day: 'numeric' 
        });
    });
    
    const revenueData = trends.map(item => item.revenue || 0);
    const ordersData = trends.map(item => item.orders || 0);
    
    salesTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '營收 (NT$)',
                    data: revenueData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '訂單數',
                    data: ordersData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '營收 (NT$)'
                    },
                    ticks: {
                        callback: function(value) {
                            return 'NT$ ' + value.toLocaleString();
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '訂單數'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return '營收: NT$ ' + context.parsed.y.toLocaleString();
                            } else {
                                return '訂單數: ' + context.parsed.y;
                            }
                        }
                    }
                }
            }
        }
    });
}

// 更新熱銷商品表格
function updateTopProductsTable(topProducts) {
    const tbody = document.getElementById('topProductsTable');
    
    if (!topProducts || topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="fas fa-chart-bar me-1"></i>
                    暫無銷售數據
                </td>
            </tr>
        `;
        return;
    }
    
    const productsHtml = topProducts.map((product, index) => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <span class="badge bg-${index < 3 ? 'warning' : 'secondary'} me-2">
                        ${index + 1}
                    </span>
                    <span class="small">${product.name}</span>
                </div>
            </td>
            <td class="fw-bold text-primary">${product.totalSold}</td>
            <td class="fw-bold text-success">${formatCurrency(product.totalRevenue)}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = productsHtml;
}

// 更新客戶分析
function updateCustomerAnalysis(customerAnalysis) {
    document.getElementById('reportNewCustomers').textContent = customerAnalysis.newCustomers || 0;
    document.getElementById('reportReturningCustomers').textContent = customerAnalysis.returningCustomers || 0;
    document.getElementById('reportAvgOrdersPerCustomer').textContent = 
        (customerAnalysis.averageOrdersPerCustomer || 0).toFixed(1);
    
    // 更新優質客戶排行
    const tbody = document.getElementById('topCustomersTable');
    
    if (!customerAnalysis.topCustomers || customerAnalysis.topCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-users me-1"></i>
                    暫無客戶數據
                </td>
            </tr>
        `;
        return;
    }
    
    const customersHtml = customerAnalysis.topCustomers.map((customer, index) => `
        <tr>
            <td>
                <span class="badge bg-${index < 3 ? 'warning' : 'secondary'}">
                    ${index + 1}
                </span>
            </td>
            <td>
                <div class="fw-bold">${customer.name || '未知客戶'}</div>
                <small class="text-muted">${customer.id.slice(-8)}</small>
            </td>
            <td class="fw-bold text-primary">${customer.orderCount}</td>
            <td class="fw-bold text-success">${formatCurrency(customer.totalSpent)}</td>
            <td class="text-muted">${customer.lastOrder ? formatDate(customer.lastOrder) : '-'}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = customersHtml;
}

// 匯出報表
async function exportReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) {
            showAlert('請先選擇日期範圍', 'warning');
            return;
        }
        
        const params = new URLSearchParams({
            format: 'csv',
            startDate: startDate,
            endDate: endDate,
            key: 'dev'
        });
        
        // 創建下載連結
        const url = `/admin/reports/export?${params.toString()}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales_report_${startDate}_${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('報表匯出中...', 'info');
    } catch (error) {
        console.error('匯出報表失敗:', error);
        showAlert('匯出報表失敗', 'danger');
    }
}

// 自動載入最近30天報表（當進入報表頁面時）
function initializeReportsPage() {
    // 設定預設日期範圍（最近30天）
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('reportStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    
    // 自動載入報表
    loadSalesReport();
}

// ==================== 併單管理功能 ====================

// 載入併單池
async function loadMergePool() {
    try {
        const response = await fetch('/admin/merge-pool', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('載入併單池失敗');
        }
        
        const result = await response.json();
        updateMergePoolStats(result.data);
        updateMergePoolContainer(result.data);
        
    } catch (error) {
        console.error('載入併單池時發生錯誤:', error);
        showAlert('載入併單池失敗', 'danger');
    }
}

// 更新併單池統計
function updateMergePoolStats(mergePoolData) {
    const pendingCustomers = mergePoolData.length;
    const pendingItems = mergePoolData.reduce((total, customerData) => total + customerData.totalItems, 0);
    const pendingAmount = mergePoolData.reduce((total, customerData) => total + customerData.totalAmount, 0);
    
    // 計算今日新增訂單
    const today = new Date().toDateString();
    const todayNew = mergePoolData.reduce((total, customerData) => {
        const todayOrders = customerData.orders.filter(order => 
            new Date(order.createdAt).toDateString() === today
        ).length;
        return total + todayOrders;
    }, 0);
    
    document.getElementById('pendingCustomersCount').textContent = pendingCustomers;
    document.getElementById('pendingItemsCount').textContent = pendingItems;
    document.getElementById('pendingAmountTotal').textContent = `$${pendingAmount}`;
    document.getElementById('todayNewOrders').textContent = todayNew;
}

// 更新併單池容器
function updateMergePoolContainer(mergePoolData) {
    const container = document.getElementById('mergePoolContainer');
    
    if (mergePoolData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">目前沒有待併單商品</p>';
        return;
    }
    
    let html = '';
    mergePoolData.forEach(customerData => {
        html += `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="fas fa-user me-2"></i>
                        ${customerData.customer.name}
                        <small class="text-muted">(${customerData.customer.phone || '無電話'})</small>
                    </h6>
                    <div>
                        <span class="badge bg-warning me-2">${customerData.totalItems} 項商品</span>
                        <span class="badge bg-success">$${customerData.totalAmount}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>訂單列表：</h6>
                            ${customerData.orders.map(order => `
                                <div class="border rounded p-2 mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>${order.orderNumber || order.id.slice(-6)}</strong>
                                            <small class="text-muted d-block">${formatDate(order.createdAt)}</small>
                                        </div>
                                        <span class="badge bg-warning">${order.status}</span>
                                    </div>
                                    <div class="mt-2">
                                        <strong>商品項目：</strong>
                                        ${order.items.map(item => `
                                            <div class="small text-muted">
                                                • ${item.productName || '商品'} ${item.notes || ''} 
                                                (數量：${item.quantity}, 單價：$${item.unitPrice})
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="mt-1">
                                        <strong>小計：$${order.totalAmount}</strong>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-primary w-100" onclick="openCreateShipmentModal('${customerData.customer.id}', '${customerData.customer.name}')">
                                <i class="fas fa-shipping-fast me-2"></i>建立出貨批次
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 開啟建立出貨批次模態框
function openCreateShipmentModal(customerId, customerName) {
    document.getElementById('shipmentCustomerId').value = customerId;
    document.getElementById('shipmentCustomerName').value = customerName;
    
    // 設定預設批次名稱
    const today = new Date();
    const defaultBatchName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 批次`;
    document.getElementById('shipmentBatchName').value = defaultBatchName;
    
    // 載入客戶的商品項目
    loadCustomerItemsForShipment(customerId);
    
    new bootstrap.Modal(document.getElementById('createShipmentModal')).show();
}

// 載入客戶商品項目供選擇
async function loadCustomerItemsForShipment(customerId) {
    try {
        const response = await fetch(`/admin/merge-pool`, {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        const result = await response.json();
        const customerData = result.data.find(c => c.customer.id === customerId);
        
        if (!customerData) {
            document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-muted">找不到客戶資料</p>';
            return;
        }
        
        let html = '';
        customerData.orders.forEach(order => {
            order.items.forEach(item => {
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${item.id}" id="item_${item.id}" checked>
                        <label class="form-check-label" for="item_${item.id}">
                            ${item.productName || '商品'} ${item.notes || ''} 
                            <small class="text-muted">(數量：${item.quantity}, 單價：$${item.unitPrice})</small>
                        </label>
                    </div>
                `;
            });
        });
        
        document.getElementById('shipmentItemsContainer').innerHTML = html;
        
    } catch (error) {
        console.error('載入客戶商品時發生錯誤:', error);
        document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-danger">載入失敗</p>';
    }
}

// 建立出貨批次
async function createShipment() {
    try {
        const customerId = document.getElementById('shipmentCustomerId').value;
        const batchName = document.getElementById('shipmentBatchName').value;
        const shippingInfo = document.getElementById('shipmentShippingInfo').value;
        const shippingFee = document.getElementById('shipmentShippingFee').value;
        const notes = document.getElementById('shipmentNotes').value;
        
        // 收集選中的商品項目
        const checkedItems = Array.from(document.querySelectorAll('#shipmentItemsContainer input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (checkedItems.length === 0) {
            showAlert('請至少選擇一個商品項目', 'warning');
            return;
        }
        
        const response = await fetch('/admin/create-shipment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                customerId,
                orderItemIds: checkedItems,
                batchName,
                shippingInfo,
                shippingFee: parseInt(shippingFee),
                notes
            })
        });
        
        if (!response.ok) {
            throw new Error('建立出貨批次失敗');
        }
        
        showAlert('出貨批次建立成功！', 'success');
        bootstrap.Modal.getInstance(document.getElementById('createShipmentModal')).hide();
        
        // 重新載入併單池和出貨列表
        loadMergePool();
        loadShipments();
        
    } catch (error) {
        console.error('建立出貨批次時發生錯誤:', error);
        showAlert('建立出貨批次失敗', 'danger');
    }
}

// ==================== 出貨管理功能 ====================

// 載入出貨批次
async function loadShipments() {
    try {
        const response = await fetch('/admin/shipments', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('載入出貨批次失敗');
        }
        
        const result = await response.json();
        updateShipmentStats(result.data);
        updateShipmentsTable(result.data);
        
    } catch (error) {
        console.error('載入出貨批次時發生錯誤:', error);
        showAlert('載入出貨批次失敗', 'danger');
    }
}

// 更新出貨統計
function updateShipmentStats(shipments) {
    const pendingPayment = shipments.filter(s => s.status === '待付款').length;
    const preparing = shipments.filter(s => s.status === '配貨中').length;
    const shipped = shipments.filter(s => s.status === '已出貨').length;
    
    document.getElementById('pendingPaymentCount').textContent = pendingPayment;
    document.getElementById('preparingShipmentCount').textContent = preparing;
    document.getElementById('shippedCount').textContent = shipped;
}

// 更新出貨批次表格
function updateShipmentsTable(shipments) {
    const tableBody = document.getElementById('shipmentsTableBody');
    
    if (shipments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">沒有出貨批次</td></tr>';
        return;
    }
    
    tableBody.innerHTML = shipments.map(shipment => `
        <tr>
            <td>${shipment.batchName}</td>
            <td>${shipment.customerName || '未知客戶'}</td>
            <td><span class="badge ${getShipmentStatusBadgeClass(shipment.status)}">${shipment.status}</span></td>
            <td>$${shipment.totalAmount + shipment.shippingFee}</td>
            <td>${formatDate(shipment.createdTime)}</td>
            <td>
                ${shipment.status === '待付款' ? `
                    <button class="btn btn-sm btn-warning" onclick="openSendPaymentModal('${shipment.id}', '${shipment.batchName}', ${shipment.totalAmount + shipment.shippingFee})">
                        發送付款通知
                    </button>
                ` : ''}
                ${shipment.status === '已付款' ? `
                    <button class="btn btn-sm btn-info" onclick="updateShipmentStatus('${shipment.id}', '已出貨')">
                        標記已出貨
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// 取得出貨狀態樣式
function getShipmentStatusBadgeClass(status) {
    switch(status) {
        case '待付款': return 'bg-warning';
        case '已付款': return 'bg-info';
        case '配貨中': return 'bg-primary';
        case '已出貨': return 'bg-success';
        case '已完成': return 'bg-secondary';
        default: return 'bg-light';
    }
}

// 開啟發送付款通知模態框
function openSendPaymentModal(shipmentId, batchName, totalAmount) {
    document.getElementById('paymentShipmentId').value = shipmentId;
    document.getElementById('paymentShipmentInfo').innerHTML = `
        <strong>批次：</strong>${batchName}<br>
        <strong>總金額：</strong>$${totalAmount}
    `;
    
    new bootstrap.Modal(document.getElementById('sendPaymentModal')).show();
}

// 發送付款請求
async function sendPaymentRequest() {
    try {
        const shipmentId = document.getElementById('paymentShipmentId').value;
        const paymentInstructions = document.getElementById('paymentInstructions').value;
        
        const response = await fetch(`/admin/send-payment-request/${shipmentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                paymentInstructions
            })
        });
        
        if (!response.ok) {
            throw new Error('發送付款通知失敗');
        }
        
        showAlert('付款通知已發送！', 'success');
        bootstrap.Modal.getInstance(document.getElementById('sendPaymentModal')).hide();
        loadShipments();
        
    } catch (error) {
        console.error('發送付款通知時發生錯誤:', error);
        showAlert('發送付款通知失敗', 'danger');
    }
}

// 更新出貨批次狀態
async function updateShipmentStatus(shipmentId, newStatus) {
    try {
        // 這個功能需要在後端實作
        showAlert('功能開發中...', 'info');
        
    } catch (error) {
        console.error('更新出貨狀態時發生錯誤:', error);
        showAlert('更新狀態失敗', 'danger');
    }
} 