// 管�??��???JavaScript

let salesChart;
let currentOrderId = null;

// ?�面載入完�?後�?始�?
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});

// ?��??�面?��?function showSection(sectionId) {
    // ?��??�?��?�?    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 移除?�?��??��??��? active 類別
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 顯示?��??��?    document.getElementById(sectionId).style.display = 'block';
    
    // ?��??��?導航?�目添�? active 類別
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
    
    // ?��?不�??�面載入對�??��?
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

// 載入?�表板?��?
async function loadDashboard() {
    try {
        const response = await fetch('/admin/api/dashboard?key=cyndi2024admin');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
            updateSalesChart(result.data.chartData);
            updateRecentOrders(result.data.recentOrders);
        }
    } catch (error) {
        console.error('載入?�表板失�?:', error);
        showAlert('載入?�表板失�?', 'danger');
    }
}

// ?�新?�表板統�??��?
function updateDashboardStats(data) {
    const overview = data.overview || {};
    
    document.getElementById('totalOrders').textContent = overview.totalOrders || 0;
    document.getElementById('pendingOrders').textContent = overview.pendingOrders || 0;
    document.getElementById('totalRevenue').textContent = `$${(overview.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('totalCustomers').textContent = overview.totalCustomers || 0;
}

// ?�新?�售趨勢??function updateSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData?.salesTrend?.map(item => item.date) || ['?�無?��?'],
            datasets: [{
                label: '?�售�?,
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

// ?�新?�近�???function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-inbox"></i>
                <p class="mt-2">?�無?�近�???/p>
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

// 載入訂單?�表
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
        console.error('載入訂單失�?:', error);
        showAlert('載入訂單失�?', 'danger');
    }
}

// 快速篩?�函??async function filterOrdersByStatus(status) {
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

// ?�新待併?�數??function updatePendingMergeCount(orders) {
    const pendingCount = orders.filter(order => order.mergeStatus === '待併??).length;
    const badge = document.getElementById('pendingMergeCount');
    if (badge) {
        badge.textContent = pendingCount;
    }
    
    // ?�制?��?併單?��??�顯�?    const batchBtn = document.getElementById('batchMergeBtn');
    if (batchBtn) {
        batchBtn.style.display = pendingCount > 1 ? 'block' : 'none';
    }
}

// 顯示?��?併單?��?彈�?
async function showBatchMergeModal() {
    try {
        // ?��??�?��?併單訂單
        const response = await fetch('/admin/api/orders?key=cyndi2024admin&mergeStatus=待併??);
        const result = await response.json();
        
        if (!result.success || !result.data.orders.length) {
            showAlert('沒�?待併?��???, 'info');
            return;
        }
        
        const orders = result.data.orders;
        
        // ?�客?��?�?        const customerGroups = {};
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
                            ?��?併單?��?
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">以�??��?客戶?��??��?併單訂單，您?�以?��??�客?��??�併?��?</p>
                        <div class="accordion" id="customerAccordion">
                            ${Object.entries(customerGroups).map(([customerKey, group], index) => `
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="heading${index}">
                                        <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                                            <div class="d-flex justify-content-between w-100 me-3">
                                                <span class="fw-bold">${group.customerName}</span>
                                                <span class="badge bg-primary">${group.orders.length} 筆�???| $${group.totalAmount.toLocaleString()}</span>
                                            </div>
                                        </button>
                                    </h2>
                                    <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#customerAccordion">
                                        <div class="accordion-body">
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>訂單編�?</th>
                                                            <th>?��?</th>
                                                            <th>下單?��?</th>
                                                            <th>?��?</th>
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
                                                    ?��? ${group.customerName} ??${group.orders.length} 筆�???                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">?��?</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // 模�?框�??��?移除?��?
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
    } catch (error) {
        console.error('載入?��?併單失�?:', error);
        showAlert('載入?��?併單失�?', 'danger');
    }
}

// ?��??��?客戶?��???function processCustomerOrders(customerKey, customerName, orders) {
    // ?��??��??��?彈�?
    const batchModal = bootstrap.Modal.getInstance(document.getElementById('batchMergeModal'));
    batchModal.hide();
    
    // 顯示該客?��?併單?��?彈�?
    showMergeOrdersModal(orders, customerName);
}

// ?��??��?訂單（建立出貨批次�?
async function processOrder(orderId, customerId, customerName) {
    try {
        // ?��?該客?��??�?��?併單
        const response = await fetch(`/admin/orders?key=cyndi2024admin&mergeStatus=待併??customerId=${customerId}`);
        const result = await response.json();
        
        if (result.success && result.data.orders) {
            const customerOrders = result.data.orders;
            
            if (customerOrders.length === 1) {
                // ?��?一?��??��??�接建�??�貨?�次
                await createSingleOrderShipment(orderId, customerName);
            } else {
                // 多個�??��?�?Cyndi ?��?要併?��?
                showMergeOrdersModal(customerOrders, customerName);
            }
        }
    } catch (error) {
        console.error('?��?訂單失�?:', error);
        showAlert('?��?訂單失�?', 'danger');
    }
}

// 顯示併單?��?彈�?
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
                        ?��?要�?併出貨�?訂單 - ${customerName}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">請勾?��?一起出貨�?訂單�?/p>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th width="50">
                                        <input type="checkbox" id="selectAllOrders" onchange="toggleAllOrders(this)">
                                    </th>
                                    <th>訂單編�?</th>
                                    <th>?��?</th>
                                    <th>下單?��?</th>
                                    <th>?��?</th>
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
                                                <i class="fas fa-list"></i> ?��??��?
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
                                <strong>已選?��??��?<span id="selectedCount">0</span> �?/strong>
                            </div>
                            <div class="col-md-6 text-end">
                                <strong>總�?額�?$<span id="selectedAmount">0</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">?��?</button>
                    <button type="button" class="btn btn-success" onclick="createSelectedOrdersShipment('${customerName}')" id="createShipmentBtn" disabled>
                        <i class="fas fa-shipping-fast me-2"></i>建�??�貨?�次
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // 綁�??�選事件
    modal.addEventListener('change', updateSelectedSummary);
    
    // 模�?框�??��?移除?��?
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// ?��??�選
function toggleAllOrders(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateSelectedSummary();
}

// ?�新已選?��??��?
function updateSelectedSummary() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const count = checkboxes.length;
    const totalAmount = Array.from(checkboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
    
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectedAmount').textContent = totalAmount.toLocaleString();
    document.getElementById('createShipmentBtn').disabled = count === 0;
}

// 建�??��?訂單?�出貨批�?async function createSelectedOrdersShipment(customerName) {
    try {
        const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            showAlert('請至少選?��??��???, 'warning');
            return;
        }
        
        const selectedOrderIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const totalAmount = Array.from(selectedCheckboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
        
        // ?��??�?�選定�??��?訂單?�目
        const allOrderItems = [];
        for (const orderId of selectedOrderIds) {
            const response = await fetch(`/admin/orders/${orderId}/items?key=cyndi2024admin`);
            const result = await response.json();
            if (result.success) {
                allOrderItems.push(...result.data);
            }
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${selectedOrderIds.length}筆�???- ${new Date().toLocaleDateString('zh-TW')}`,
            // ?��?不設�?customerId，�???Notion ??relation 欄�?比�?複�?
            // customerId: null,
            orderItemIds: allOrderItems.map(item => item.id),
            status: '待�?�?,
            notes: `?�併 ${selectedOrderIds.length} 筆�??��?${selectedOrderIds.join(', ')}`
        };
        
        console.log('?�� ?�送出貨批次�???', shipmentData);
        
        const createResponse = await fetch('/admin/api/create-shipment?key=cyndi2024admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        console.log('?�� ?��??��??��???', createResponse.status);
        
        let createResult;
        try {
            createResult = await createResponse.json();
            console.log('?�� ?��??��??�內�?', createResult);
        } catch (parseError) {
            console.error('?�� �???��? JSON 失�?:', parseError);
            const responseText = await createResponse.text();
            console.error('?�� ?��??��??�容:', responseText);
            throw new Error(`?��??��??�解?�失??(${createResponse.status}): ${responseText}`);
        }
        
        if (createResult.success) {
            // ?��?模�?�?            const modalElement = document.getElementById('mergeOrdersModal');
            const modal = modalElement ? bootstrap.Modal.getInstance(modalElement) : null;
            if (modal) {
                modal.hide();
            }
            
            showAlert(`??已為 ${customerName} 建�??�貨?�次<br>?�併 ${selectedOrderIds.length} 筆�??��?總�?�?$${totalAmount.toLocaleString()}`, 'success');
            await loadOrders(); // ?�新載入訂單?�表
            
            // 詢�??�否?�送�?款通知
            if (confirm(`?�否立即?�送�?款通知�?${customerName}？`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || '建�??�貨?�次失�?');
        }
    } catch (error) {
        console.error('建�??�貨?�次失�?:', error);
        showAlert('建�??�貨?�次失�?: ' + error.message, 'danger');
    }
}

// ?��?訂單?��?
async function viewOrderItems(orderId) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/items?key=cyndi2024admin`);
        const result = await response.json();
        
        if (result.success) {
            const items = result.data;
            const itemsHtml = items.map(item => `
                <div class="border-bottom pb-2 mb-2">
                    <div class="fw-bold">${item.productName || '?��?'}</div>
                    <div class="text-muted">${item.notes}</div>
                    <div>?��?�?{item.quantity} | ?�價�?${item.unitPrice} | 小�?�?${item.subtotal}</div>
                </div>
            `).join('');
            
            showAlert(`
                <h6>訂單?��??�細</h6>
                ${itemsHtml}
            `, 'info');
        }
    } catch (error) {
        console.error('?��?訂單?��?失�?:', error);
        showAlert('?��?訂單?��?失�?', 'danger');
    }
}

// 建�??��?訂單?�出貨批�?async function createSingleOrderShipment(orderId, customerName) {
    try {
        // ?��?訂單?�目
        const orderItemsResponse = await fetch(`/admin/orders/${orderId}/items?key=cyndi2024admin`);
        const orderItemsResult = await orderItemsResponse.json();
        
        if (!orderItemsResult.success) {
            throw new Error('?��??��?訂單?�目');
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${new Date().toLocaleDateString('zh-TW')}`,
            // 不�???customerId，改?��?端�? orderItemIds ?��?
            orderItemIds: orderItemsResult.data.map(item => item.id),
            status: '待�?�?,
            notes: '?��?訂單?�接?�貨'
        };
        
        const createResponse = await fetch('/admin/api/create-shipment?key=cyndi2024admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        const createResult = await createResponse.json();
        
        if (createResult.success) {
            showAlert(`??已為 ${customerName} 建�??�貨?�次`, 'success');
            await loadOrders(); // ?�新載入訂單?�表
            
            // 詢�??�否?�送�?款通知
            if (confirm(`?�否立即?�送�?款通知�?${customerName}？`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || '建�??�貨?�次失�?');
        }
    } catch (error) {
        console.error('建�??�貨?�次失�?:', error);
        showAlert('建�??�貨?�次失�?: ' + error.message, 'danger');
    }
}

// ?�送�?款通知
async function sendPaymentNotification(shipmentId, customerName) {
    try {
        const response = await fetch(`/admin/send-payment-request/${shipmentId}?key=cyndi2024admin`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`??已發?��?款通知�?${customerName}`, 'success');
        } else {
            throw new Error(result.message || '?�送�?款通知失�?');
        }
    } catch (error) {
        console.error('?�送�?款通知失�?:', error);
        showAlert('?�送�?款通知失�?: ' + error.message, 'warning');
    }
}

// ?�新訂單表格
function updateOrdersTable(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">?�無訂單?��?</td>
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
                <span class="badge ${getMergeStatusBadgeClass(order.mergeStatus || '待併??)}">${order.mergeStatus || '待併??}</span>
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
                ${(order.mergeStatus === '待併??) ? `
                <button class="btn btn-sm btn-outline-success" onclick="processOrder('${order.id}', '${order.customerId}', '${order.customerName}')" title="建�??�貨?�次">
                    <i class="fas fa-shipping-fast"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// ?��??�?�徽章�???- ?�照建議?��?準�???function getStatusBadgeClass(status) {
    const statusClasses = {
        // 主�?訂單?�??- 標�?顏色系統
        '待�?�?: 'bg-warning text-dark',        // ?�� 黃色 - ?��?付款
        '已�?�?: 'bg-success',                  // ?�� 綠色 - 表示?��?
        '?�貨�?: 'bg-info',                     // ?�� ?�色 - ?��?中進度
        '已出�?: 'bg-purple',                   // ?�� 紫色 - ?�輸�?        '已�???: 'bg-light text-dark',          // ?��? 淺灰 - 任�?結�?
        '已�?�?: 'bg-danger',                   // ?�� 紅色 - 結�??�異�?        
        // ?��??�特殊�???        '?�貨中': 'bg-warning-soft',             // ?�� 淺�? - ?�貨�??�中
        '?�款中': 'bg-orange',                   // ?? 橙色 - ?�款�??�中
        '糾�?�?: 'bg-dark',                     // ??深色 - ?�要�?�?        '?��?': 'bg-secondary'                   // ???�色 - ?��??�??    };
    return statusClasses[status] || 'bg-secondary';
}

// ?��?併單?�?�徽章�???function getMergeStatusBadgeClass(mergeStatus) {
    const mergeStatusClasses = {
        '待併??: 'bg-warning text-dark',         // ?�� 等�??��?
        '已併??: 'bg-info',                     // ?�� 已�??�併
        '?��??�貨': 'bg-purple',                 // ?�� ?��?完�?
        '已�???: 'bg-success'                   // ?�� ?�部完�?
    };
    return mergeStatusClasses[mergeStatus] || 'bg-secondary';
}

// ?��??�?�進度?��?�?function getStatusProgress(status) {
    const progressMap = {
        '待�?�?: 10,
        '已�?�?: 30,
        '?�貨�?: 60,
        '已出�?: 80,
        '已�???: 100,
        '已�?�?: 0,
        '?�貨中': 50,
        '?�款中': 75
    };
    return progressMap[status] || 0;
}

// ?��??�?��?中�??�述
function getStatusDescription(status) {
    const descriptions = {
        '待�?�?: '等�?客戶付款',
        '已�?�?: '付款確�?完�?',
        '?�貨�?: '�?��準�??��?',
        '已出�?: '?��?已�???,
        '已�???: '訂單完�?',
        '已�?�?: '訂單已�?�?,
        '?�貨中': '客戶?�貨�??�中',
        '?�款中': '?�款�??�中',
        '糾�?�?: '訂單糾�??��?�?,
        '?��?': '訂單?��??��?'
    };
    return descriptions[status] || status;
}

// ?��?訂單詳�?
function viewOrder(orderId) {
    // ?�裡?�以實現訂單詳�??��??�能
    showAlert(`?��?訂單 ${orderId} ?�詳?��??��??�中...`, 'info');
}

// ?��??�新?�?�模?��?
function openUpdateStatusModal(orderId, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('newOrderStatus').value = currentStatus;
    document.getElementById('orderNotes').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    modal.show();
}

// ?�新訂單?�??async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    try {
        const status = document.getElementById('newOrderStatus').value;
        const notes = document.getElementById('orderNotes').value;
        
        // 檢查?�?��??��?�?        const statusTransitionResult = checkStatusTransition(status);
        if (statusTransitionResult.requiresConfirmation) {
            if (!confirm(statusTransitionResult.message)) {
                return;
            }
        }
        
        const response = await fetch(`/admin/orders/${currentOrderId}/status?key=cyndi2024admin`, {
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
            let message = '訂單?�?�已?�新';
            if (statusTransitionResult.autoActions.length > 0) {
                message += `<br><small>?��??��?�?{statusTransitionResult.autoActions.join('??)}</small>`;
            }
            showAlert(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('updateOrderModal')).hide();
            loadOrders(); // ?�新載入訂單?�表
        } else {
            showAlert('?�新失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?�新訂單?�?�失??', error);
        showAlert('?�新失�?', 'danger');
    }
}

// 檢查?�?��??��?�?function checkStatusTransition(newStatus) {
    const result = {
        requiresConfirmation: false,
        message: '',
        autoActions: []
    };
    
    switch (newStatus) {
        case '已�?�?:
            result.autoActions.push('?�送�?款確認通知');
            result.requiresConfirmation = true;
            result.message = '確�??�到付款了�?？\n系統將自?�發?�確認通知給客?��?;
            break;
            
        case '已出�?:
            result.autoActions.push('?�送出貨通知', '?��??��?資�?');
            result.requiresConfirmation = true;
            result.message = '確�??��?已出貨�??��?\n系統將自?�通知客戶並�?供追蹤�?訊�?;
            break;
            
        case '已�???:
            result.autoActions.push('?�送�??�確�?);
            result.requiresConfirmation = true;
            result.message = '確�?訂單已�??��?？\n系統將發?��??�通知給客?��?;
            break;
            
        case '已�?�?:
            result.autoActions.push('?�送�?消通知');
            result.requiresConfirmation = true;
            result.message = '確�?要�?消此訂單?��?\n如�?客戶已�?款�?請另外�??�退款�?;
            break;
            
        case '?�貨中':
            result.autoActions.push('?�送退貨�?�?);
            result.requiresConfirmation = true;
            result.message = '確�?客戶要退貨�?？\n系統將發?�退貨�?引給客戶??;
            break;
            
        case '?�款中':
            result.autoActions.push('?��??�款通知');
            result.requiresConfirmation = true;
            result.message = '確�?要進�??�款�?？\n系統將通知客戶?�款�??�中??;
            break;
    }
    
    return result;
}

// 載入客戶?�表
async function loadCustomers() {
    try {
        const level = document.getElementById('customerLevelFilter').value;
        const search = document.getElementById('customerSearch').value;
        
        // 構建?�詢?�數
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
            showAlert('載入客戶?�表失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶?�表失�?:', error);
        showAlert('載入客戶?�表失�?', 'danger');
    }
}

// ?�新客戶表格
function updateCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>?��?沒�?客戶資�?</p>
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
                        <div class="fw-bold">${customer.name || '?�知客戶'}</div>
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
                    ${customer.level || '一?��???}
                </span>
            </td>
            <td>
                <div class="text-center">
                    <div class="fw-bold text-primary">${customer.stats?.totalOrders || 0}</div>
                    <small class="text-muted">筆�???/small>
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(customer.stats?.totalSpent || 0)}
                </div>
                <small class="text-muted">
                    平�?: ${formatCurrency(customer.stats?.averageOrderValue || 0)}
                </small>
            </td>
            <td>
                <div class="text-muted">
                    ${customer.stats?.lastOrderDate ? formatDate(customer.stats.lastOrderDate) : '尚未下單'}
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomerDetail('${customer.id}')" title="?��?詳�?">
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

// ?�新客戶統�?
function updateCustomerStats(customers) {
    if (!customers || customers.length === 0) {
        document.getElementById('totalCustomersCount').textContent = '0';
        document.getElementById('vipCustomersCount').textContent = '0';
        document.getElementById('activeCustomersCount').textContent = '0';
        document.getElementById('newCustomersCount').textContent = '0';
        return;
    }
    
    const vipCount = customers.filter(c => c.level === 'VIP?�員').length;
    const activeCount = customers.filter(c => c.stats && c.stats.totalOrders > 0).length;
    
    // 計�??��??�客?��??�裡簡�??�總客戶?��?實�??�該?��?註�??��?計�?�?    const currentMonth = new Date().getMonth();
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

// ?��?客戶等�?徽�?�??
function getCustomerLevelBadgeClass(level) {
    const levelClasses = {
        'VIP?�員': 'bg-warning text-dark',
        '一?��???: 'bg-secondary',
        '黑�???: 'bg-danger'
    };
    return levelClasses[level] || 'bg-secondary';
}

// 變數來儲存當?�編輯�?客戶 ID
let currentEditCustomerId = null;

// ?��?客戶詳�?
async function viewCustomerDetail(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=cyndi2024admin`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const customer = data.customer;
            const stats = data.stats;
            const orders = data.orders;
            
            // 填�??�本資�?
            document.getElementById('customerDetailName').textContent = customer.name || '-';
            document.getElementById('customerDetailPhone').textContent = customer.phone || '-';
            document.getElementById('customerDetailLineId').textContent = customer.lineId || '-';
            
            const levelBadge = document.getElementById('customerDetailLevel');
            levelBadge.textContent = customer.level || '一?��???;
            levelBadge.className = `badge ${getCustomerLevelBadgeClass(customer.level)}`;
            
            document.getElementById('customerDetailDeliveryMethod').textContent = customer.deliveryMethod || '-';
            document.getElementById('customerDetailAddress').textContent = customer.address || '-';
            document.getElementById('customerDetailRegisteredAt').textContent = customer.registeredAt ? formatDate(customer.registeredAt) : '-';
            document.getElementById('customerDetailNotes').textContent = customer.notes || '-';
            
            // 填�?統�?資�?
            document.getElementById('customerDetailTotalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('customerDetailTotalSpent').textContent = formatCurrency(stats.totalSpent || 0);
            document.getElementById('customerDetailAvgOrder').textContent = formatCurrency(stats.averageOrderValue || 0);
            document.getElementById('customerDetailLastOrder').textContent = stats.lastOrderDate ? formatDate(stats.lastOrderDate) : '-';
            
            // 填�?訂單歷史
            updateCustomerOrdersTable(orders);
            
            // ?��?客戶 ID 供編輯使??            currentEditCustomerId = customerId;
            
            // 顯示模�?�?            const modal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
            modal.show();
        } else {
            showAlert('載入客戶詳�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶詳�?失�?:', error);
        showAlert('載入客戶詳�?失�?', 'danger');
    }
}

// ?�新客戶訂單表格
function updateCustomerOrdersTable(orders) {
    const tbody = document.getElementById('customerDetailOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-shopping-cart me-1"></i>
                    尚無訂單記�?
                </td>
            </tr>
        `;
        return;
    }
    
    // ?�顯示�?�?5 筆�???    const recentOrders = orders.slice(0, 5);
    
    const ordersHtml = recentOrders.map(order => `
        <tr>
            <td>
                <span class="font-monospace">${order.id.slice(-8)}</span>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td class="fw-bold">${formatCurrency(order.totalAmount || 0)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${order.status || '待�?�?}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// ?��?編輯客戶模�?�?async function openEditCustomerModal(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=cyndi2024admin`);
        const result = await response.json();
        
        if (result.success) {
            const customer = result.data.customer;
            
            // 填�?編輯表單
            document.getElementById('editCustomerName').value = customer.name || '';
            document.getElementById('editCustomerPhone').value = customer.phone || '';
            document.getElementById('editCustomerLevel').value = customer.level || '一?��???;
            document.getElementById('editCustomerDeliveryMethod').value = customer.deliveryMethod || '宅�??��?';
            document.getElementById('editCustomerAddress').value = customer.address || '';
            document.getElementById('editCustomerBirthday').value = customer.birthday || '';
            document.getElementById('editCustomerNotes').value = customer.notes || '';
            
            // ?��?客戶 ID
            currentEditCustomerId = customerId;
            
            // 顯示編輯模�?�?            const modal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
            modal.show();
        } else {
            showAlert('載入客戶資�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入客戶資�?失�?:', error);
        showAlert('載入客戶資�?失�?', 'danger');
    }
}

// 從詳?�模?��??��?編輯模�?�?function editCustomer() {
    if (currentEditCustomerId) {
        // ?��?詳�?模�?�?        bootstrap.Modal.getInstance(document.getElementById('customerDetailModal')).hide();
        
        // ?��?編輯模�?�?        setTimeout(() => {
            openEditCustomerModal(currentEditCustomerId);
        }, 300);
    }
}

// ?��?客戶變更
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
        
        // 移除空�?        Object.keys(updateData).forEach(key => {
            if (!updateData[key] && updateData[key] !== '') {
                delete updateData[key];
            }
        });
        
        const response = await fetch(`/admin/customers/${currentEditCustomerId}?key=cyndi2024admin`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('客戶資�?已更??, 'success');
            
            // ?��?編輯模�?�?            bootstrap.Modal.getInstance(document.getElementById('editCustomerModal')).hide();
            
            // ?�新載入客戶?�表
            loadCustomers();
            
            // 清除?��?編輯 ID
            currentEditCustomerId = null;
        } else {
            showAlert('?�新客戶資�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?�新客戶資�?失�?:', error);
        showAlert('?�新客戶資�?失�?', 'danger');
    }
}

// 載入?��??�表
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const style = document.getElementById('styleFilter').value;
        const color = document.getElementById('colorFilter').value;
        const size = document.getElementById('sizeFilter').value;
        const gender = document.getElementById('genderFilter').value;
        const status = document.getElementById('productStatusFilter').value;
        
        // 構建?�詢?�數
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
            showAlert('載入?��??�表失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入?��??�表失�?:', error);
        showAlert('載入?��??�表失�?', 'danger');
    }
}

// ?�新?��?表格
function updateProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-box fa-2x mb-2"></i>
                    <p>?��?沒�??��?資�?</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const productsHtml = products.map(product => `
        <tr>
            <td>
                <div class="fw-bold">${product.name || '?�知?��?'}</div>
                <small class="text-muted">ID: ${product.productCode || product.id.slice(-8)}</small>
            </td>
            <td>
                <div class="small">
                    ${product.description ? product.description.split(' ').filter(spec => spec.trim()).map(spec => 
                        `<span class="badge bg-light text-dark me-1 mb-1">${spec}</span>`
                    ).join('') : '<span class="text-muted">?��??��?�?/span>'}
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(product.price || 0)}
                </div>
            </td>
            <td>
                <div class="small">
                    <div><strong>?��?:</strong> <span class="text-primary">${product.stats?.totalSold || 0}</span></div>
                    <div><strong>?�收:</strong> <span class="text-success">${formatCurrency(product.stats?.totalRevenue || 0)}</span></div>
                    ${product.stats?.lastSold ? 
                        `<div class="text-muted">?��? ${formatDate(product.stats.lastSold)}</div>` : ''
                    }
                </div>
            </td>
            <td>
                <span class="badge ${getProductStatusBadgeClass(product.status)}">
                    ${product.status || '?�設�?}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewProductDetail('${product.id}')" title="?��?詳�?">
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

// ?�新?��?統�?
function updateProductStats(products) {
    if (!products || products.length === 0) {
        document.getElementById('totalProductsCount').textContent = '0';
        document.getElementById('activeProductsCount').textContent = '0';
        document.getElementById('hotProductsCount').textContent = '0';
        document.getElementById('lowStockCount').textContent = '0';
        return;
    }
    
    const activeCount = products.filter(p => p.status === '上架�?).length;
    const hotCount = products.filter(p => p.stats && p.stats.totalSold > 5).length; // ?��? > 5 算熱??    const lowStockCount = products.filter(p => p.variants && p.variants.some(v => v.stock < 5)).length; // 庫�? < 5 算�?�?    
    document.getElementById('totalProductsCount').textContent = products.length.toString();
    document.getElementById('activeProductsCount').textContent = activeCount.toString();
    document.getElementById('hotProductsCount').textContent = hotCount.toString();
    document.getElementById('lowStockCount').textContent = lowStockCount.toString();
}

// ?��??��??�?�徽章樣�?function getProductStatusBadgeClass(status) {
    const statusClasses = {
        '上架�?: 'bg-success',
        '已�???: 'bg-secondary',
        '?��?': 'bg-danger',
        '?�購�?: 'bg-warning text-dark'
    };
    return statusClasses[status] || 'bg-secondary';
}

// 變數來儲存當?�編輯�??��? ID
let currentEditProductId = null;

// ?��??��?詳�?
async function viewProductDetail(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=cyndi2024admin`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const variant = data.variant;  // ?�在?��?體�???            const stats = data.stats;
            const relatedVariants = data.relatedVariants || [];
            const recentOrders = data.recentOrders;
            
            // 填�??�本資�?（現?�是變�?資�?�?            document.getElementById('productDetailName').textContent = variant.name || '-';
            document.getElementById('productDetailCode').textContent = variant.variant_id || variant.id.slice(-8);
            document.getElementById('productDetailCategory').textContent = '童�?';  // ?��??��?
            document.getElementById('productDetailPrice').textContent = formatCurrency(variant.price || 0);
            document.getElementById('productDetailCreatedAt').textContent = '-';  // 變�?沒�??�建?��?
            document.getElementById('productDetailDescription').textContent = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '-';
            
            const statusBadge = document.getElementById('productDetailStatus');
            statusBadge.textContent = variant.status || '?�設�?;
            statusBadge.className = `badge ${getProductStatusBadgeClass(variant.status)}`;
            
            // 填�?統�?資�?
            document.getElementById('productDetailTotalSold').textContent = stats.totalSold || 0;
            document.getElementById('productDetailTotalRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
            document.getElementById('productDetailAvgPrice').textContent = formatCurrency(stats.averagePrice || 0);
            document.getElementById('productDetailLastSold').textContent = stats.lastSold ? formatDate(stats.lastSold) : '-';
            
            // 填�??��?變�?資�?（�??��??�稱?�其他�?體�?
            updateProductVariantsTable([variant, ...relatedVariants]);
            
            // 填�??�近銷??            updateProductRecentOrdersTable(recentOrders);
            
            // ?��??��? ID 供編輯使??            currentEditProductId = productId;
            
            // 顯示模�?�?            const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            modal.show();
        } else {
            showAlert('載入?��?詳�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入?��?詳�?失�?:', error);
        showAlert('載入?��?詳�?失�?', 'danger');
    }
}

// ?�新?��?變�?表格
function updateProductVariantsTable(variants) {
    const tbody = document.getElementById('productDetailVariants');
    
    if (!variants || variants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-layer-group me-1"></i>
                    尚無變�?資�?
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
                    ${variant.status || '?�知'}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = variantsHtml;
}

// ?�新?��??�近銷?�表??function updateProductRecentOrdersTable(orders) {
    const tbody = document.getElementById('productDetailRecentOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-history me-1"></i>
                    尚無?�售記�?
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

// ?��?編輯?��?模�?�?async function openEditProductModal(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=cyndi2024admin`);
        const result = await response.json();
        
        if (result.success) {
            const variant = result.data.variant;  // ?�在?��?體�???            
            // 填�?編輯表單（現?�是變�?編輯�?            document.getElementById('editProductName').value = variant.name || '';
            document.getElementById('editProductCode').value = variant.variant_id || '';
            document.getElementById('editProductCategory').value = '童�?';  // ?��??��?
            document.getElementById('editProductPrice').value = variant.price || 0;
            document.getElementById('editProductStatus').value = variant.status || '?�設�?;
            document.getElementById('editProductDescription').value = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '';
            
            // ?��??��? ID
            currentEditProductId = productId;
            
            // 顯示編輯模�?�?            const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
            modal.show();
        } else {
            showAlert('載入?��?資�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入?��?資�?失�?:', error);
        showAlert('載入?��?資�?失�?', 'danger');
    }
}

// 從詳?�模?��??��?編輯模�?�?function editProduct() {
    if (currentEditProductId) {
        // ?��?詳�?模�?�?        bootstrap.Modal.getInstance(document.getElementById('productDetailModal')).hide();
        
        // ?��?編輯模�?�?        setTimeout(() => {
            openEditProductModal(currentEditProductId);
        }, 300);
    }
}

// ?��??��?變更
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
        
        // 移除空�?        Object.keys(updateData).forEach(key => {
            if (!updateData[key] && updateData[key] !== 0) {
                delete updateData[key];
            }
        });
        
        const response = await fetch(`/admin/products/${currentEditProductId}?key=cyndi2024admin`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('?��?資�?已更??, 'success');
            
            // ?��?編輯模�?�?            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            
            // ?�新載入?��??�表
            loadProducts();
            
            // 清除?��?編輯 ID
            currentEditProductId = null;
        } else {
            showAlert('?�新?��?資�?失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?�新?��?資�?失�?:', error);
        showAlert('?�新?��?資�?失�?', 'danger');
    }
}

// 顯示?�示訊息
function showAlert(message, type = 'info') {
    // ?�建?�示�?    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3秒�??��?消失
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// ?��??�日??function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ?��??��?�?function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
} 

// ==================== ?�售?�表?�能 ====================

// 載入?�售?�表
async function loadSalesReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const period = document.getElementById('reportPeriod').value;
        
        // 如�?沒�??��??��?，使?��?�?0�?        let queryStartDate = startDate;
        let queryEndDate = endDate;
        
        if (!startDate || !endDate) {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            queryStartDate = thirtyDaysAgo.toISOString().split('T')[0];
            queryEndDate = today.toISOString().split('T')[0];
            
            // ?�新輸入�?            document.getElementById('reportStartDate').value = queryStartDate;
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
            showAlert('?�表已�???, 'success');
        } else {
            showAlert('?��??�表失�?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('載入?�售?�表失�?:', error);
        showAlert('載入?�售?�表失�?', 'danger');
    }
}

// ?�新?�表?��?
function updateReportSummary(summary) {
    document.getElementById('reportTotalOrders').textContent = summary.totalOrders || 0;
    document.getElementById('reportTotalRevenue').textContent = formatCurrency(summary.totalRevenue || 0);
    document.getElementById('reportTotalItems').textContent = summary.totalItems || 0;
    document.getElementById('reportAvgOrderValue').textContent = formatCurrency(summary.averageOrderValue || 0);
    document.getElementById('reportCompletedOrders').textContent = summary.completedOrders || 0;
    document.getElementById('reportPendingOrders').textContent = summary.pendingOrders || 0;
    document.getElementById('reportCancelledOrders').textContent = summary.cancelledOrders || 0;
}

// ?�新?�售趨勢?�表
let salesTrendChartInstance = null;

function updateSalesTrendChart(trends) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    
    // ?��??��?�?    if (salesTrendChartInstance) {
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
                    label: '?�收 (NT$)',
                    data: revenueData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '訂單??,
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
                        text: '?��?'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '?�收 (NT$)'
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
                        text: '訂單??
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
                                return '?�收: NT$ ' + context.parsed.y.toLocaleString();
                            } else {
                                return '訂單?? ' + context.parsed.y;
                            }
                        }
                    }
                }
            }
        }
    });
}

// ?�新?�銷?��?表格
function updateTopProductsTable(topProducts) {
    const tbody = document.getElementById('topProductsTable');
    
    if (!topProducts || topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="fas fa-chart-bar me-1"></i>
                    ?�無?�售?��?
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

// ?�新客戶?��?
function updateCustomerAnalysis(customerAnalysis) {
    document.getElementById('reportNewCustomers').textContent = customerAnalysis.newCustomers || 0;
    document.getElementById('reportReturningCustomers').textContent = customerAnalysis.returningCustomers || 0;
    document.getElementById('reportAvgOrdersPerCustomer').textContent = 
        (customerAnalysis.averageOrdersPerCustomer || 0).toFixed(1);
    
    // ?�新?�質客戶?��?
    const tbody = document.getElementById('topCustomersTable');
    
    if (!customerAnalysis.topCustomers || customerAnalysis.topCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-users me-1"></i>
                    ?�無客戶?��?
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
                <div class="fw-bold">${customer.name || '?�知客戶'}</div>
                <small class="text-muted">${customer.id.slice(-8)}</small>
            </td>
            <td class="fw-bold text-primary">${customer.orderCount}</td>
            <td class="fw-bold text-success">${formatCurrency(customer.totalSpent)}</td>
            <td class="text-muted">${customer.lastOrder ? formatDate(customer.lastOrder) : '-'}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = customersHtml;
}

// ?�出?�表
async function exportReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) {
            showAlert('請�??��??��?範�?', 'warning');
            return;
        }
        
        const params = new URLSearchParams({
            format: 'csv',
            startDate: startDate,
            endDate: endDate,
            key: 'dev'
        });
        
        // ?�建下�????
        const url = `/admin/reports/export?${params.toString()}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales_report_${startDate}_${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('?�表?�出�?..', 'info');
    } catch (error) {
        console.error('?�出?�表失�?:', error);
        showAlert('?�出?�表失�?', 'danger');
    }
}

// ?��?載入?��?0天報表�??�進入?�表?�面?��?
function initializeReportsPage() {
    // 設�??�設?��?範�?（�?�?0天�?
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('reportStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    
    // ?��?載入?�表
    loadSalesReport();
}

// ==================== 併單管�??�能 ====================

// 載入併單�?async function loadMergePool() {
    try {
        const response = await fetch('/admin/api/merge-pool', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('載入併單池失??);
        }
        
        const result = await response.json();
        updateMergePoolStats(result.data);
        updateMergePoolContainer(result.data);
        
    } catch (error) {
        console.error('載入併單池�??��??�誤:', error);
        showAlert('載入併單池失??, 'danger');
    }
}

// ?�新併單池統�?function updateMergePoolStats(mergePoolData) {
    const pendingCustomers = mergePoolData.length;
    const pendingItems = mergePoolData.reduce((total, customerData) => total + customerData.totalItems, 0);
    const pendingAmount = mergePoolData.reduce((total, customerData) => total + customerData.totalAmount, 0);
    
    // 計�?今日?��?訂單
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

// ?�新併單池容??function updateMergePoolContainer(mergePoolData) {
    const container = document.getElementById('mergePoolContainer');
    
    if (mergePoolData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">?��?沒�?待併?��???/p>';
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
                        <small class="text-muted">(${customerData.customer.phone || '?�電�?})</small>
                    </h6>
                    <div>
                        <span class="badge bg-warning me-2">${customerData.totalItems} ?��???/span>
                        <span class="badge bg-success">$${customerData.totalAmount}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>訂單?�表�?/h6>
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
                                        <strong>?��??�目�?/strong>
                                        ${order.items.map(item => `
                                            <div class="small text-muted">
                                                ??${item.productName || '?��?'} ${item.notes || ''} 
                                                (?��?�?{item.quantity}, ?�價�?${item.unitPrice})
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="mt-1">
                                        <strong>小�?�?${order.totalAmount}</strong>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-primary w-100" onclick="openCreateShipmentModal('${customerData.customer.id}', '${customerData.customer.name}')">
                                <i class="fas fa-shipping-fast me-2"></i>建�??�貨?�次
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ?��?建�??�貨?�次模�?�?function openCreateShipmentModal(customerId, customerName) {
    document.getElementById('shipmentCustomerId').value = customerId;
    document.getElementById('shipmentCustomerName').value = customerName;
    
    // 設�??�設?�次?�稱
    const today = new Date();
    const defaultBatchName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ?�次`;
    document.getElementById('shipmentBatchName').value = defaultBatchName;
    
    // 載入客戶?��??��???    loadCustomerItemsForShipment(customerId);
    
    new bootstrap.Modal(document.getElementById('createShipmentModal')).show();
}

// 載入客戶?��??�目供選??async function loadCustomerItemsForShipment(customerId) {
    try {
        const response = await fetch(`/admin/merge-pool`, {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        const result = await response.json();
        const customerData = result.data.find(c => c.customer.id === customerId);
        
        if (!customerData) {
            document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-muted">?��??�客?��???/p>';
            return;
        }
        
        let html = '';
        customerData.orders.forEach(order => {
            order.items.forEach(item => {
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${item.id}" id="item_${item.id}" checked>
                        <label class="form-check-label" for="item_${item.id}">
                            ${item.productName || '?��?'} ${item.notes || ''} 
                            <small class="text-muted">(?��?�?{item.quantity}, ?�價�?${item.unitPrice})</small>
                        </label>
                    </div>
                `;
            });
        });
        
        document.getElementById('shipmentItemsContainer').innerHTML = html;
        
    } catch (error) {
        console.error('載入客戶?��??�發?�錯�?', error);
        document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-danger">載入失�?</p>';
    }
}

// 建�??�貨?�次
async function createShipment() {
    try {
        const customerId = document.getElementById('shipmentCustomerId').value;
        const batchName = document.getElementById('shipmentBatchName').value;
        const shippingInfo = document.getElementById('shipmentShippingInfo').value;
        const shippingFee = document.getElementById('shipmentShippingFee').value;
        const notes = document.getElementById('shipmentNotes').value;
        
        // ?��??�中?��??��???        const checkedItems = Array.from(document.querySelectorAll('#shipmentItemsContainer input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (checkedItems.length === 0) {
            showAlert('請至少選?��??��??��???, 'warning');
            return;
        }
        
        const response = await fetch('/admin/api/create-shipment', {
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
            throw new Error('建�??�貨?�次失�?');
        }
        
        showAlert('?�貨?�次建�??��?�?, 'success');
        bootstrap.Modal.getInstance(document.getElementById('createShipmentModal')).hide();
        
        // ?�新載入併單池�??�貨?�表
        loadMergePool();
        loadShipments();
        
    } catch (error) {
        console.error('建�??�貨?�次?�發?�錯�?', error);
        showAlert('建�??�貨?�次失�?', 'danger');
    }
}

// ==================== ?�貨管�??�能 ====================

// 載入?�貨?�次
async function loadShipments() {
    try {
        const response = await fetch('/admin/api/shipments', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('載入?�貨?�次失�?');
        }
        
        const result = await response.json();
        updateShipmentStats(result.data);
        updateShipmentsTable(result.data);
        
    } catch (error) {
        console.error('載入?�貨?�次?�發?�錯�?', error);
        showAlert('載入?�貨?�次失�?', 'danger');
    }
}

// ?�新?�貨統�?
function updateShipmentStats(shipments) {
    const pendingPayment = shipments.filter(s => s.status === '待�?�?).length;
    const preparing = shipments.filter(s => s.status === '?�貨�?).length;
    const shipped = shipments.filter(s => s.status === '已出�?).length;
    
    document.getElementById('pendingPaymentCount').textContent = pendingPayment;
    document.getElementById('preparingShipmentCount').textContent = preparing;
    document.getElementById('shippedCount').textContent = shipped;
}

// ?�新?�貨?�次表格
function updateShipmentsTable(shipments) {
    const tableBody = document.getElementById('shipmentsTableBody');
    
    if (shipments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">沒�??�貨?�次</td></tr>';
        return;
    }
    
    tableBody.innerHTML = shipments.map(shipment => `
        <tr>
            <td>${shipment.batchName}</td>
            <td>${shipment.customerName || '?�知客戶'}</td>
            <td><span class="badge ${getShipmentStatusBadgeClass(shipment.status)}">${shipment.status}</span></td>
            <td>$${shipment.totalAmount + shipment.shippingFee}</td>
            <td>${formatDate(shipment.createdTime)}</td>
            <td>
                ${shipment.status === '待�?�? ? `
                    <button class="btn btn-sm btn-warning" onclick="openSendPaymentModal('${shipment.id}', '${shipment.batchName}', ${shipment.totalAmount + shipment.shippingFee})">
                        ?�送�?款通知
                    </button>
                ` : ''}
                ${shipment.status === '已�?�? ? `
                    <button class="btn btn-sm btn-info" onclick="updateShipmentStatus('${shipment.id}', '已出�?)">
                        標�?已出�?                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// ?��??�貨?�?�樣�?function getShipmentStatusBadgeClass(status) {
    switch(status) {
        case '待�?�?: return 'bg-warning';
        case '已�?�?: return 'bg-info';
        case '?�貨�?: return 'bg-primary';
        case '已出�?: return 'bg-success';
        case '已�???: return 'bg-secondary';
        default: return 'bg-light';
    }
}

// ?��??�送�?款通知模�?�?function openSendPaymentModal(shipmentId, batchName, totalAmount) {
    document.getElementById('paymentShipmentId').value = shipmentId;
    document.getElementById('paymentShipmentInfo').innerHTML = `
        <strong>?�次�?/strong>${batchName}<br>
        <strong>總�?額�?</strong>$${totalAmount}
    `;
    
    new bootstrap.Modal(document.getElementById('sendPaymentModal')).show();
}

// ?�送�?款�?�?async function sendPaymentRequest() {
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
            throw new Error('?�送�?款通知失�?');
        }
        
        showAlert('付款?�知已發?��?', 'success');
        bootstrap.Modal.getInstance(document.getElementById('sendPaymentModal')).hide();
        loadShipments();
        
    } catch (error) {
        console.error('?�送�?款通知?�發?�錯�?', error);
        showAlert('?�送�?款通知失�?', 'danger');
    }
}

// ?�新?�貨?�次?�??async function updateShipmentStatus(shipmentId, newStatus) {
    try {
        // ?�個�??��?要在後端實�?
        showAlert('?�能?�發�?..', 'info');

    } catch (error) {
        console.error('?�新?�貨?�?��??��??�誤:', error);
        showAlert('?�新?�?�失??, 'danger');
    }
}

// ==================== Supabase 商品上傳功能 ====================

// Supabase 配置
const SUPABASE_URL = 'https://lfcqmuztnsaxgksmfbov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY3FtdXp0bnNheGdrc21mYm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzExNTU2NzMsImV4cCI6MjA0NjczMTY3M30.bsKiF6JpqPIlTwXd2q40Zt_VgKLJb4SJrAcAr3IrMUg';

// 初始化 Supabase 客戶端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 顯示新增商品模態框
function showAddProductModal() {
    // 清空表單
    document.getElementById('addProductForm').reset();
    document.getElementById('addProductSuccess').style.display = 'none';
    document.getElementById('addProductError').style.display = 'none';

    // 顯示模態框
    const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
    modal.show();
}

// 提交新商品
async function submitNewProduct() {
    const successMsg = document.getElementById('addProductSuccess');
    const errorMsg = document.getElementById('addProductError');
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
        // 獲取表單數據
        const productName = document.getElementById('newProductName').value;
        const productCode = document.getElementById('newProductCode').value || null;
        const imageUrl = document.getElementById('newProductImageUrl').value || null;
        const mainCategory = document.getElementById('newProductMainCategory').value;
        const originCountry = document.getElementById('newProductOriginCountry').value;
        const description = document.getElementById('newProductDescription').value || null;

        const style = document.getElementById('newProductStyle').value || null;
        const color = document.getElementById('newProductColor').value || null;
        const size = document.getElementById('newProductSize').value || null;
        const gender = document.getElementById('newProductGender').value || null;
        const price = parseFloat(document.getElementById('newProductPrice').value);
        const stock = parseInt(document.getElementById('newProductStock').value) || 0;
        const status = document.getElementById('newProductStatus').value;

        if (!productName) {
            errorMsg.innerHTML = '請輸入商品名稱';
            errorMsg.style.display = 'block';
            return;
        }

        if (!price || price <= 0) {
            errorMsg.innerHTML = '請輸入有效的價格';
            errorMsg.style.display = 'block';
            return;
        }

        // 1. 創建產品
        const productData = {
            name: productName,
            code: productCode,
            image_url: imageUrl,
            main_category: mainCategory,
            origin_country: originCountry,
            description: description,
        };

        const { data: product, error: productError } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (productError) throw productError;

        console.log('Product created:', product);

        // 2. 創建變體
        const variantData = {
            product_id: product.id,
            name: productName,
            variant_id: productCode || `VAR-${Date.now()}`,
            style: style,
            color: color,
            size: size,
            gender: gender,
            price_cents: Math.round(price * 100), // 轉成分
            stock: stock,
            status: status,
        };

        const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .insert([variantData])
            .select()
            .single();

        if (variantError) throw variantError;

        console.log('Variant created:', variant);

        // 成功
        successMsg.innerHTML = `✅ 產品「${product.name}」新增成功！<br>產品 ID: ${product.id}<br>變體 ID: ${variant.id}`;
        successMsg.style.display = 'block';

        // 清空表單
        document.getElementById('addProductForm').reset();

        // 重新載入商品列表
        setTimeout(() => {
            loadProducts();
            const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
            modal.hide();
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        errorMsg.innerHTML = `❌ 新增失敗：${error.message}`;
        errorMsg.style.display = 'block';
    }
} 
