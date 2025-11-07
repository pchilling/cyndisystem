// ç®¡ç??¡å???JavaScript

let salesChart;
let currentOrderId = null;

// ?é¢è¼‰å…¥å®Œæ?å¾Œå?å§‹å?
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});

// ?‡æ??é¢?€æ®?function showSection(sectionId) {
    // ?±è??€?‰å?æ®?    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // ç§»é™¤?€?‰å??ªé??®ç? active é¡åˆ¥
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // é¡¯ç¤º?‡å??€æ®?    document.getElementById(sectionId).style.display = 'block';
    
    // ?ºå??‰ç?å°èˆª?…ç›®æ·»å? active é¡åˆ¥
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
    
    // ?¹æ?ä¸å??é¢è¼‰å…¥å°æ??¸æ?
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

// è¼‰å…¥?€è¡¨æ¿?¸æ?
async function loadDashboard() {
    try {
        const response = await fetch('/admin/api/dashboard?key=dev');
        const result = await response.json();
        
        if (result.success) {
            updateDashboardStats(result.data);
            updateSalesChart(result.data.chartData);
            updateRecentOrders(result.data.recentOrders);
        }
    } catch (error) {
        console.error('è¼‰å…¥?€è¡¨æ¿å¤±æ?:', error);
        showAlert('è¼‰å…¥?€è¡¨æ¿å¤±æ?', 'danger');
    }
}

// ?´æ–°?€è¡¨æ¿çµ±è??¸æ?
function updateDashboardStats(data) {
    const overview = data.overview || {};
    
    document.getElementById('totalOrders').textContent = overview.totalOrders || 0;
    document.getElementById('pendingOrders').textContent = overview.pendingOrders || 0;
    document.getElementById('totalRevenue').textContent = `$${(overview.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('totalCustomers').textContent = overview.totalCustomers || 0;
}

// ?´æ–°?·å”®è¶¨å‹¢??function updateSalesChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData?.salesTrend?.map(item => item.date) || ['?«ç„¡?¸æ?'],
            datasets: [{
                label: '?·å”®é¡?,
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

// ?´æ–°?€è¿‘è???function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-inbox"></i>
                <p class="mt-2">?«ç„¡?€è¿‘è???/p>
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

// è¼‰å…¥è¨‚å–®?—è¡¨
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
        console.error('è¼‰å…¥è¨‚å–®å¤±æ?:', error);
        showAlert('è¼‰å…¥è¨‚å–®å¤±æ?', 'danger');
    }
}

// å¿«é€Ÿç¯©?¸å‡½??async function filterOrdersByStatus(status) {
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

// ?´æ–°å¾…ä½µ?®æ•¸??function updatePendingMergeCount(orders) {
    const pendingCount = orders.filter(order => order.mergeStatus === 'å¾…ä½µ??).length;
    const badge = document.getElementById('pendingMergeCount');
    if (badge) {
        badge.textContent = pendingCount;
    }
    
    // ?§åˆ¶?¹é?ä½µå–®?‰é??„é¡¯ç¤?    const batchBtn = document.getElementById('batchMergeBtn');
    if (batchBtn) {
        batchBtn.style.display = pendingCount > 1 ? 'block' : 'none';
    }
}

// é¡¯ç¤º?¹é?ä½µå–®?•ç?å½ˆç?
async function showBatchMergeModal() {
    try {
        // ?²å??€?‰å?ä½µå–®è¨‚å–®
        const response = await fetch('/admin/api/orders?key=dev&mergeStatus=å¾…ä½µ??);
        const result = await response.json();
        
        if (!result.success || !result.data.orders.length) {
            showAlert('æ²’æ?å¾…ä½µ?®è???, 'info');
            return;
        }
        
        const orders = result.data.orders;
        
        // ?‰å®¢?¶å?çµ?        const customerGroups = {};
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
                            ?¹é?ä½µå–®?•ç?
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">ä»¥ä??¯æ?å®¢æˆ¶?†ç??„å?ä½µå–®è¨‚å–®ï¼Œæ‚¨?¯ä»¥?ºæ??‹å®¢?¶è??†ä½µ?®ï?</p>
                        <div class="accordion" id="customerAccordion">
                            ${Object.entries(customerGroups).map(([customerKey, group], index) => `
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="heading${index}">
                                        <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                                            <div class="d-flex justify-content-between w-100 me-3">
                                                <span class="fw-bold">${group.customerName}</span>
                                                <span class="badge bg-primary">${group.orders.length} ç­†è???| $${group.totalAmount.toLocaleString()}</span>
                                            </div>
                                        </button>
                                    </h2>
                                    <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#customerAccordion">
                                        <div class="accordion-body">
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>è¨‚å–®ç·¨è?</th>
                                                            <th>?‘é?</th>
                                                            <th>ä¸‹å–®?‚é?</th>
                                                            <th>?ä?</th>
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
                                                    ?•ç? ${group.customerName} ??${group.orders.length} ç­†è???                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">?œé?</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // æ¨¡æ?æ¡†é??‰å?ç§»é™¤?ƒç?
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
    } catch (error) {
        console.error('è¼‰å…¥?¹é?ä½µå–®å¤±æ?:', error);
        showAlert('è¼‰å…¥?¹é?ä½µå–®å¤±æ?', 'danger');
    }
}

// ?•ç??¹å?å®¢æˆ¶?„è???function processCustomerOrders(customerKey, customerName, orders) {
    // ?œé??¹é??•ç?å½ˆç?
    const batchModal = bootstrap.Modal.getInstance(document.getElementById('batchMergeModal'));
    batchModal.hide();
    
    // é¡¯ç¤ºè©²å®¢?¶ç?ä½µå–®?¸æ?å½ˆç?
    showMergeOrdersModal(orders, customerName);
}

// ?•ç??®ç?è¨‚å–®ï¼ˆå»ºç«‹å‡ºè²¨æ‰¹æ¬¡ï?
async function processOrder(orderId, customerId, customerName) {
    try {
        // ?²å?è©²å®¢?¶ç??€?‰å?ä½µå–®
        const response = await fetch(`/admin/orders?key=dev&mergeStatus=å¾…ä½µ??customerId=${customerId}`);
        const result = await response.json();
        
        if (result.success && result.data.orders) {
            const customerOrders = result.data.orders;
            
            if (customerOrders.length === 1) {
                // ?ªæ?ä¸€?‹è??®ï??´æ¥å»ºç??ºè²¨?¹æ¬¡
                await createSingleOrderShipment(orderId, customerName);
            } else {
                // å¤šå€‹è??®ï?è®?Cyndi ?¸æ?è¦ä½µ?ªä?
                showMergeOrdersModal(customerOrders, customerName);
            }
        }
    } catch (error) {
        console.error('?•ç?è¨‚å–®å¤±æ?:', error);
        showAlert('?•ç?è¨‚å–®å¤±æ?', 'danger');
    }
}

// é¡¯ç¤ºä½µå–®?¸æ?å½ˆç?
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
                        ?¸æ?è¦å?ä½µå‡ºè²¨ç?è¨‚å–® - ${customerName}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">è«‹å‹¾?¸è?ä¸€èµ·å‡ºè²¨ç?è¨‚å–®ï¼?/p>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th width="50">
                                        <input type="checkbox" id="selectAllOrders" onchange="toggleAllOrders(this)">
                                    </th>
                                    <th>è¨‚å–®ç·¨è?</th>
                                    <th>?‘é?</th>
                                    <th>ä¸‹å–®?‚é?</th>
                                    <th>?ä?</th>
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
                                                <i class="fas fa-list"></i> ?¥ç??†å?
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
                                <strong>å·²é¸?‡è??®ï?<span id="selectedCount">0</span> ç­?/strong>
                            </div>
                            <div class="col-md-6 text-end">
                                <strong>ç¸½é?é¡ï?$<span id="selectedAmount">0</span></strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">?–æ?</button>
                    <button type="button" class="btn btn-success" onclick="createSelectedOrdersShipment('${customerName}')" id="createShipmentBtn" disabled>
                        <i class="fas fa-shipping-fast me-2"></i>å»ºç??ºè²¨?¹æ¬¡
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // ç¶å??¾é¸äº‹ä»¶
    modal.addEventListener('change', updateSelectedSummary);
    
    // æ¨¡æ?æ¡†é??‰å?ç§»é™¤?ƒç?
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// ?‡æ??¨é¸
function toggleAllOrders(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateSelectedSummary();
}

// ?´æ–°å·²é¸?‡ç??˜è?
function updateSelectedSummary() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const count = checkboxes.length;
    const totalAmount = Array.from(checkboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
    
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectedAmount').textContent = totalAmount.toLocaleString();
    document.getElementById('createShipmentBtn').disabled = count === 0;
}

// å»ºç??¸å?è¨‚å–®?„å‡ºè²¨æ‰¹æ¬?async function createSelectedOrdersShipment(customerName) {
    try {
        const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            showAlert('è«‹è‡³å°‘é¸?‡ä??‹è???, 'warning');
            return;
        }
        
        const selectedOrderIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        const totalAmount = Array.from(selectedCheckboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
        
        // ?²å??€?‰é¸å®šè??®ç?è¨‚å–®?…ç›®
        const allOrderItems = [];
        for (const orderId of selectedOrderIds) {
            const response = await fetch(`/admin/orders/${orderId}/items?key=dev`);
            const result = await response.json();
            if (result.success) {
                allOrderItems.push(...result.data);
            }
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${selectedOrderIds.length}ç­†è???- ${new Date().toLocaleDateString('zh-TW')}`,
            // ?«æ?ä¸è¨­å®?customerIdï¼Œå???Notion ??relation æ¬„ä?æ¯”è?è¤‡é?
            // customerId: null,
            orderItemIds: allOrderItems.map(item => item.id),
            status: 'å¾…ä?æ¬?,
            notes: `?ˆä½µ ${selectedOrderIds.length} ç­†è??®ï?${selectedOrderIds.join(', ')}`
        };
        
        console.log('?“¦ ?¼é€å‡ºè²¨æ‰¹æ¬¡è???', shipmentData);
        
        const createResponse = await fetch('/admin/api/create-shipment?key=dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        console.log('?“¦ ?å??¨å??‰ç???', createResponse.status);
        
        let createResult;
        try {
            createResult = await createResponse.json();
            console.log('?“¦ ?å??¨å??‰å…§å®?', createResult);
        } catch (parseError) {
            console.error('?“¦ è§???æ? JSON å¤±æ?:', parseError);
            const responseText = await createResponse.text();
            console.error('?“¦ ?Ÿå??æ??§å®¹:', responseText);
            throw new Error(`?å??¨å??‰è§£?å¤±??(${createResponse.status}): ${responseText}`);
        }
        
        if (createResult.success) {
            // ?œé?æ¨¡æ?æ¡?            const modalElement = document.getElementById('mergeOrdersModal');
            const modal = modalElement ? bootstrap.Modal.getInstance(modalElement) : null;
            if (modal) {
                modal.hide();
            }
            
            showAlert(`??å·²ç‚º ${customerName} å»ºç??ºè²¨?¹æ¬¡<br>?ˆä½µ ${selectedOrderIds.length} ç­†è??®ï?ç¸½é?é¡?$${totalAmount.toLocaleString()}`, 'success');
            await loadOrders(); // ?æ–°è¼‰å…¥è¨‚å–®?—è¡¨
            
            // è©¢å??¯å¦?¼é€ä?æ¬¾é€šçŸ¥
            if (confirm(`?¯å¦ç«‹å³?¼é€ä?æ¬¾é€šçŸ¥çµ?${customerName}ï¼Ÿ`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || 'å»ºç??ºè²¨?¹æ¬¡å¤±æ?');
        }
    } catch (error) {
        console.error('å»ºç??ºè²¨?¹æ¬¡å¤±æ?:', error);
        showAlert('å»ºç??ºè²¨?¹æ¬¡å¤±æ?: ' + error.message, 'danger');
    }
}

// ?¥ç?è¨‚å–®?†å?
async function viewOrderItems(orderId) {
    try {
        const response = await fetch(`/admin/orders/${orderId}/items?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const items = result.data;
            const itemsHtml = items.map(item => `
                <div class="border-bottom pb-2 mb-2">
                    <div class="fw-bold">${item.productName || '?†å?'}</div>
                    <div class="text-muted">${item.notes}</div>
                    <div>?¸é?ï¼?{item.quantity} | ?®åƒ¹ï¼?${item.unitPrice} | å°è?ï¼?${item.subtotal}</div>
                </div>
            `).join('');
            
            showAlert(`
                <h6>è¨‚å–®?†å??ç´°</h6>
                ${itemsHtml}
            `, 'info');
        }
    } catch (error) {
        console.error('?¥ç?è¨‚å–®?†å?å¤±æ?:', error);
        showAlert('?¥ç?è¨‚å–®?†å?å¤±æ?', 'danger');
    }
}

// å»ºç??®ç?è¨‚å–®?„å‡ºè²¨æ‰¹æ¬?async function createSingleOrderShipment(orderId, customerName) {
    try {
        // ?–å?è¨‚å–®?…ç›®
        const orderItemsResponse = await fetch(`/admin/orders/${orderId}/items?key=dev`);
        const orderItemsResult = await orderItemsResponse.json();
        
        if (!orderItemsResult.success) {
            throw new Error('?¡æ??–å?è¨‚å–®?…ç›®');
        }
        
        const shipmentData = {
            batchName: `${customerName} - ${new Date().toLocaleDateString('zh-TW')}`,
            // ä¸å???customerIdï¼Œæ”¹?±å?ç«¯ä? orderItemIds ?¨å?
            orderItemIds: orderItemsResult.data.map(item => item.id),
            status: 'å¾…ä?æ¬?,
            notes: '?®ç?è¨‚å–®?´æ¥?ºè²¨'
        };
        
        const createResponse = await fetch('/admin/api/create-shipment?key=dev', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shipmentData)
        });
        
        const createResult = await createResponse.json();
        
        if (createResult.success) {
            showAlert(`??å·²ç‚º ${customerName} å»ºç??ºè²¨?¹æ¬¡`, 'success');
            await loadOrders(); // ?æ–°è¼‰å…¥è¨‚å–®?—è¡¨
            
            // è©¢å??¯å¦?¼é€ä?æ¬¾é€šçŸ¥
            if (confirm(`?¯å¦ç«‹å³?¼é€ä?æ¬¾é€šçŸ¥çµ?${customerName}ï¼Ÿ`)) {
                await sendPaymentNotification(createResult.data.id, customerName);
            }
        } else {
            throw new Error(createResult.message || 'å»ºç??ºè²¨?¹æ¬¡å¤±æ?');
        }
    } catch (error) {
        console.error('å»ºç??ºè²¨?¹æ¬¡å¤±æ?:', error);
        showAlert('å»ºç??ºè²¨?¹æ¬¡å¤±æ?: ' + error.message, 'danger');
    }
}

// ?¼é€ä?æ¬¾é€šçŸ¥
async function sendPaymentNotification(shipmentId, customerName) {
    try {
        const response = await fetch(`/admin/send-payment-request/${shipmentId}?key=dev`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`??å·²ç™¼?ä?æ¬¾é€šçŸ¥çµ?${customerName}`, 'success');
        } else {
            throw new Error(result.message || '?¼é€ä?æ¬¾é€šçŸ¥å¤±æ?');
        }
    } catch (error) {
        console.error('?¼é€ä?æ¬¾é€šçŸ¥å¤±æ?:', error);
        showAlert('?¼é€ä?æ¬¾é€šçŸ¥å¤±æ?: ' + error.message, 'warning');
    }
}

// ?´æ–°è¨‚å–®è¡¨æ ¼
function updateOrdersTable(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">?«ç„¡è¨‚å–®?¸æ?</td>
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
                <span class="badge ${getMergeStatusBadgeClass(order.mergeStatus || 'å¾…ä½µ??)}">${order.mergeStatus || 'å¾…ä½µ??}</span>
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
                ${(order.mergeStatus === 'å¾…ä½µ??) ? `
                <button class="btn btn-sm btn-outline-success" onclick="processOrder('${order.id}', '${order.customerId}', '${order.customerName}')" title="å»ºç??ºè²¨?¹æ¬¡">
                    <i class="fas fa-shipping-fast"></i>
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// ?²å??€?‹å¾½ç« é???- ?‰ç…§å»ºè­°?„æ?æº–é???function getStatusBadgeClass(status) {
    const statusClasses = {
        // ä¸»è?è¨‚å–®?€??- æ¨™æ?é¡è‰²ç³»çµ±
        'å¾…ä?æ¬?: 'bg-warning text-dark',        // ?Ÿ¡ é»ƒè‰² - ?é?ä»˜æ¬¾
        'å·²ä?æ¬?: 'bg-success',                  // ?Ÿ¢ ç¶ è‰² - è¡¨ç¤º?å?
        '?è²¨ä¸?: 'bg-info',                     // ?”µ ?è‰² - ?•ç?ä¸­é€²åº¦
        'å·²å‡ºè²?: 'bg-purple',                   // ?Ÿ£ ç´«è‰² - ?‹è¼¸ä¸?        'å·²å???: 'bg-light text-dark',          // ?ªï? æ·ºç° - ä»»å?çµæ?
        'å·²å?æ¶?: 'bg-danger',                   // ?”´ ç´…è‰² - çµæ??ç•°å¸?        
        // ?°å??„ç‰¹æ®Šç???        '?€è²¨ä¸­': 'bg-warning-soft',             // ?Ÿ¨ æ·ºé? - ?€è²¨è??†ä¸­
        '?€æ¬¾ä¸­': 'bg-orange',                   // ?? æ©™è‰² - ?€æ¬¾è??†ä¸­
        'ç³¾ç?ä¸?: 'bg-dark',                     // ??æ·±è‰² - ?€è¦é?æ³?        '?«å?': 'bg-secondary'                   // ???°è‰² - ?«å??€??    };
    return statusClasses[status] || 'bg-secondary';
}

// ?²å?ä½µå–®?€?‹å¾½ç« é???function getMergeStatusBadgeClass(mergeStatus) {
    const mergeStatusClasses = {
        'å¾…ä½µ??: 'bg-warning text-dark',         // ?Ÿ¡ ç­‰å??•ç?
        'å·²ä½µ??: 'bg-info',                     // ?”µ å·²ç??ˆä½µ
        '?¨å??ºè²¨': 'bg-purple',                 // ?Ÿ£ ?¨å?å®Œæ?
        'å·²å???: 'bg-success'                   // ?Ÿ¢ ?¨éƒ¨å®Œæ?
    };
    return mergeStatusClasses[mergeStatus] || 'bg-secondary';
}

// ?²å??€?‹é€²åº¦?¾å?æ¯?function getStatusProgress(status) {
    const progressMap = {
        'å¾…ä?æ¬?: 10,
        'å·²ä?æ¬?: 30,
        '?è²¨ä¸?: 60,
        'å·²å‡ºè²?: 80,
        'å·²å???: 100,
        'å·²å?æ¶?: 0,
        '?€è²¨ä¸­': 50,
        '?€æ¬¾ä¸­': 75
    };
    return progressMap[status] || 0;
}

// ?²å??€?‹ç?ä¸­æ??è¿°
function getStatusDescription(status) {
    const descriptions = {
        'å¾…ä?æ¬?: 'ç­‰å?å®¢æˆ¶ä»˜æ¬¾',
        'å·²ä?æ¬?: 'ä»˜æ¬¾ç¢ºè?å®Œæ?',
        '?è²¨ä¸?: 'æ­?œ¨æº–å??†å?',
        'å·²å‡ºè²?: '?†å?å·²å???,
        'å·²å???: 'è¨‚å–®å®Œæ?',
        'å·²å?æ¶?: 'è¨‚å–®å·²å?æ¶?,
        '?€è²¨ä¸­': 'å®¢æˆ¶?€è²¨è??†ä¸­',
        '?€æ¬¾ä¸­': '?€æ¬¾è??†ä¸­',
        'ç³¾ç?ä¸?: 'è¨‚å–®ç³¾ç??•ç?ä¸?,
        '?«å?': 'è¨‚å–®?«å??•ç?'
    };
    return descriptions[status] || status;
}

// ?¥ç?è¨‚å–®è©³æ?
function viewOrder(orderId) {
    // ?™è£¡?¯ä»¥å¯¦ç¾è¨‚å–®è©³æ??¥ç??Ÿèƒ½
    showAlert(`?¥ç?è¨‚å–® ${orderId} ?„è©³?…å??½é??¼ä¸­...`, 'info');
}

// ?“é??´æ–°?€?‹æ¨¡?‹æ?
function openUpdateStatusModal(orderId, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('newOrderStatus').value = currentStatus;
    document.getElementById('orderNotes').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('updateOrderModal'));
    modal.show();
}

// ?´æ–°è¨‚å–®?€??async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    try {
        const status = document.getElementById('newOrderStatus').value;
        const notes = document.getElementById('orderNotes').value;
        
        // æª¢æŸ¥?€?‹è??›é?è¼?        const statusTransitionResult = checkStatusTransition(status);
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
            let message = 'è¨‚å–®?€?‹å·²?´æ–°';
            if (statusTransitionResult.autoActions.length > 0) {
                message += `<br><small>?ªå??·è?ï¼?{statusTransitionResult.autoActions.join('??)}</small>`;
            }
            showAlert(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('updateOrderModal')).hide();
            loadOrders(); // ?æ–°è¼‰å…¥è¨‚å–®?—è¡¨
        } else {
            showAlert('?´æ–°å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?´æ–°è¨‚å–®?€?‹å¤±??', error);
        showAlert('?´æ–°å¤±æ?', 'danger');
    }
}

// æª¢æŸ¥?€?‹è??›é?è¼?function checkStatusTransition(newStatus) {
    const result = {
        requiresConfirmation: false,
        message: '',
        autoActions: []
    };
    
    switch (newStatus) {
        case 'å·²ä?æ¬?:
            result.autoActions.push('?¼é€ä?æ¬¾ç¢ºèªé€šçŸ¥');
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè??¶åˆ°ä»˜æ¬¾äº†å?ï¼Ÿ\nç³»çµ±å°‡è‡ª?•ç™¼?ç¢ºèªé€šçŸ¥çµ¦å®¢?¶ã€?;
            break;
            
        case 'å·²å‡ºè²?:
            result.autoActions.push('?¼é€å‡ºè²¨é€šçŸ¥', '?ä??©æ?è³‡è?');
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè??†å?å·²å‡ºè²¨ä??ï?\nç³»çµ±å°‡è‡ª?•é€šçŸ¥å®¢æˆ¶ä¸¦æ?ä¾›è¿½è¹¤è?è¨Šã€?;
            break;
            
        case 'å·²å???:
            result.autoActions.push('?¼é€å??ç¢ºèª?);
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè?è¨‚å–®å·²å??å?ï¼Ÿ\nç³»çµ±å°‡ç™¼?å??é€šçŸ¥çµ¦å®¢?¶ã€?;
            break;
            
        case 'å·²å?æ¶?:
            result.autoActions.push('?¼é€å?æ¶ˆé€šçŸ¥');
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè?è¦å?æ¶ˆæ­¤è¨‚å–®?ï?\nå¦‚æ?å®¢æˆ¶å·²ä?æ¬¾ï?è«‹å¦å¤–è??†é€€æ¬¾ã€?;
            break;
            
        case '?€è²¨ä¸­':
            result.autoActions.push('?¼é€é€€è²¨æ?å¼?);
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè?å®¢æˆ¶è¦é€€è²¨å?ï¼Ÿ\nç³»çµ±å°‡ç™¼?é€€è²¨æ?å¼•çµ¦å®¢æˆ¶??;
            break;
            
        case '?€æ¬¾ä¸­':
            result.autoActions.push('?Ÿå??€æ¬¾é€šçŸ¥');
            result.requiresConfirmation = true;
            result.message = 'ç¢ºè?è¦é€²è??€æ¬¾å?ï¼Ÿ\nç³»çµ±å°‡é€šçŸ¥å®¢æˆ¶?€æ¬¾è??†ä¸­??;
            break;
    }
    
    return result;
}

// è¼‰å…¥å®¢æˆ¶?—è¡¨
async function loadCustomers() {
    try {
        const level = document.getElementById('customerLevelFilter').value;
        const search = document.getElementById('customerSearch').value;
        
        // æ§‹å»º?¥è©¢?ƒæ•¸
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
            showAlert('è¼‰å…¥å®¢æˆ¶?—è¡¨å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥å®¢æˆ¶?—è¡¨å¤±æ?:', error);
        showAlert('è¼‰å…¥å®¢æˆ¶?—è¡¨å¤±æ?', 'danger');
    }
}

// ?´æ–°å®¢æˆ¶è¡¨æ ¼
function updateCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>?®å?æ²’æ?å®¢æˆ¶è³‡æ?</p>
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
                        <div class="fw-bold">${customer.name || '?ªçŸ¥å®¢æˆ¶'}</div>
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
                    ${customer.level || 'ä¸€?¬æ???}
                </span>
            </td>
            <td>
                <div class="text-center">
                    <div class="fw-bold text-primary">${customer.stats?.totalOrders || 0}</div>
                    <small class="text-muted">ç­†è???/small>
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(customer.stats?.totalSpent || 0)}
                </div>
                <small class="text-muted">
                    å¹³å?: ${formatCurrency(customer.stats?.averageOrderValue || 0)}
                </small>
            </td>
            <td>
                <div class="text-muted">
                    ${customer.stats?.lastOrderDate ? formatDate(customer.stats.lastOrderDate) : 'å°šæœªä¸‹å–®'}
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomerDetail('${customer.id}')" title="?¥ç?è©³æ?">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="openEditCustomerModal('${customer.id}')" title="ç·¨è¼¯">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = customersHtml;
}

// ?´æ–°å®¢æˆ¶çµ±è?
function updateCustomerStats(customers) {
    if (!customers || customers.length === 0) {
        document.getElementById('totalCustomersCount').textContent = '0';
        document.getElementById('vipCustomersCount').textContent = '0';
        document.getElementById('activeCustomersCount').textContent = '0';
        document.getElementById('newCustomersCount').textContent = '0';
        return;
    }
    
    const vipCount = customers.filter(c => c.level === 'VIP?ƒå“¡').length;
    const activeCount = customers.filter(c => c.stats && c.stats.totalOrders > 0).length;
    
    // è¨ˆç??¬æ??°å®¢?¶ï??™è£¡ç°¡å??ºç¸½å®¢æˆ¶?¸ï?å¯¦é??‰è©²?¹æ?è¨»å??‚é?è¨ˆç?ï¼?    const currentMonth = new Date().getMonth();
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

// ?²å?å®¢æˆ¶ç­‰ç?å¾½ç?æ¨??
function getCustomerLevelBadgeClass(level) {
    const levelClasses = {
        'VIP?ƒå“¡': 'bg-warning text-dark',
        'ä¸€?¬æ???: 'bg-secondary',
        'é»‘å???: 'bg-danger'
    };
    return levelClasses[level] || 'bg-secondary';
}

// è®Šæ•¸ä¾†å„²å­˜ç•¶?ç·¨è¼¯ç?å®¢æˆ¶ ID
let currentEditCustomerId = null;

// ?¥ç?å®¢æˆ¶è©³æ?
async function viewCustomerDetail(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const customer = data.customer;
            const stats = data.stats;
            const orders = data.orders;
            
            // å¡«å??ºæœ¬è³‡è?
            document.getElementById('customerDetailName').textContent = customer.name || '-';
            document.getElementById('customerDetailPhone').textContent = customer.phone || '-';
            document.getElementById('customerDetailLineId').textContent = customer.lineId || '-';
            
            const levelBadge = document.getElementById('customerDetailLevel');
            levelBadge.textContent = customer.level || 'ä¸€?¬æ???;
            levelBadge.className = `badge ${getCustomerLevelBadgeClass(customer.level)}`;
            
            document.getElementById('customerDetailDeliveryMethod').textContent = customer.deliveryMethod || '-';
            document.getElementById('customerDetailAddress').textContent = customer.address || '-';
            document.getElementById('customerDetailRegisteredAt').textContent = customer.registeredAt ? formatDate(customer.registeredAt) : '-';
            document.getElementById('customerDetailNotes').textContent = customer.notes || '-';
            
            // å¡«å?çµ±è?è³‡è?
            document.getElementById('customerDetailTotalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('customerDetailTotalSpent').textContent = formatCurrency(stats.totalSpent || 0);
            document.getElementById('customerDetailAvgOrder').textContent = formatCurrency(stats.averageOrderValue || 0);
            document.getElementById('customerDetailLastOrder').textContent = stats.lastOrderDate ? formatDate(stats.lastOrderDate) : '-';
            
            // å¡«å?è¨‚å–®æ­·å²
            updateCustomerOrdersTable(orders);
            
            // ?²å?å®¢æˆ¶ ID ä¾›ç·¨è¼¯ä½¿??            currentEditCustomerId = customerId;
            
            // é¡¯ç¤ºæ¨¡æ?æ¡?            const modal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
            modal.show();
        } else {
            showAlert('è¼‰å…¥å®¢æˆ¶è©³æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥å®¢æˆ¶è©³æ?å¤±æ?:', error);
        showAlert('è¼‰å…¥å®¢æˆ¶è©³æ?å¤±æ?', 'danger');
    }
}

// ?´æ–°å®¢æˆ¶è¨‚å–®è¡¨æ ¼
function updateCustomerOrdersTable(orders) {
    const tbody = document.getElementById('customerDetailOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-shopping-cart me-1"></i>
                    å°šç„¡è¨‚å–®è¨˜é?
                </td>
            </tr>
        `;
        return;
    }
    
    // ?ªé¡¯ç¤ºæ?è¿?5 ç­†è???    const recentOrders = orders.slice(0, 5);
    
    const ordersHtml = recentOrders.map(order => `
        <tr>
            <td>
                <span class="font-monospace">${order.id.slice(-8)}</span>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td class="fw-bold">${formatCurrency(order.totalAmount || 0)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${order.status || 'å¾…ä?æ¬?}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = ordersHtml;
}

// ?‹å?ç·¨è¼¯å®¢æˆ¶æ¨¡æ?æ¡?async function openEditCustomerModal(customerId) {
    try {
        const response = await fetch(`/admin/customers/${customerId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const customer = result.data.customer;
            
            // å¡«å?ç·¨è¼¯è¡¨å–®
            document.getElementById('editCustomerName').value = customer.name || '';
            document.getElementById('editCustomerPhone').value = customer.phone || '';
            document.getElementById('editCustomerLevel').value = customer.level || 'ä¸€?¬æ???;
            document.getElementById('editCustomerDeliveryMethod').value = customer.deliveryMethod || 'å®…é??°å?';
            document.getElementById('editCustomerAddress').value = customer.address || '';
            document.getElementById('editCustomerBirthday').value = customer.birthday || '';
            document.getElementById('editCustomerNotes').value = customer.notes || '';
            
            // ?²å?å®¢æˆ¶ ID
            currentEditCustomerId = customerId;
            
            // é¡¯ç¤ºç·¨è¼¯æ¨¡æ?æ¡?            const modal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
            modal.show();
        } else {
            showAlert('è¼‰å…¥å®¢æˆ¶è³‡æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥å®¢æˆ¶è³‡æ?å¤±æ?:', error);
        showAlert('è¼‰å…¥å®¢æˆ¶è³‡æ?å¤±æ?', 'danger');
    }
}

// å¾è©³?…æ¨¡?‹æ??‹å?ç·¨è¼¯æ¨¡æ?æ¡?function editCustomer() {
    if (currentEditCustomerId) {
        // ?œé?è©³æ?æ¨¡æ?æ¡?        bootstrap.Modal.getInstance(document.getElementById('customerDetailModal')).hide();
        
        // ?‹å?ç·¨è¼¯æ¨¡æ?æ¡?        setTimeout(() => {
            openEditCustomerModal(currentEditCustomerId);
        }, 300);
    }
}

// ?²å?å®¢æˆ¶è®Šæ›´
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
        
        // ç§»é™¤ç©ºå€?        Object.keys(updateData).forEach(key => {
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
            showAlert('å®¢æˆ¶è³‡æ?å·²æ›´??, 'success');
            
            // ?œé?ç·¨è¼¯æ¨¡æ?æ¡?            bootstrap.Modal.getInstance(document.getElementById('editCustomerModal')).hide();
            
            // ?æ–°è¼‰å…¥å®¢æˆ¶?—è¡¨
            loadCustomers();
            
            // æ¸…é™¤?¶å?ç·¨è¼¯ ID
            currentEditCustomerId = null;
        } else {
            showAlert('?´æ–°å®¢æˆ¶è³‡æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?´æ–°å®¢æˆ¶è³‡æ?å¤±æ?:', error);
        showAlert('?´æ–°å®¢æˆ¶è³‡æ?å¤±æ?', 'danger');
    }
}

// è¼‰å…¥?†å??—è¡¨
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch').value;
        const style = document.getElementById('styleFilter').value;
        const color = document.getElementById('colorFilter').value;
        const size = document.getElementById('sizeFilter').value;
        const gender = document.getElementById('genderFilter').value;
        const status = document.getElementById('productStatusFilter').value;
        
        // æ§‹å»º?¥è©¢?ƒæ•¸
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
            showAlert('è¼‰å…¥?†å??—è¡¨å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥?†å??—è¡¨å¤±æ?:', error);
        showAlert('è¼‰å…¥?†å??—è¡¨å¤±æ?', 'danger');
    }
}

// ?´æ–°?†å?è¡¨æ ¼
function updateProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fas fa-box fa-2x mb-2"></i>
                    <p>?®å?æ²’æ??†å?è³‡æ?</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const productsHtml = products.map(product => `
        <tr>
            <td>
                <div class="fw-bold">${product.name || '?ªçŸ¥?†å?'}</div>
                <small class="text-muted">ID: ${product.productCode || product.id.slice(-8)}</small>
            </td>
            <td>
                <div class="small">
                    ${product.description ? product.description.split(' ').filter(spec => spec.trim()).map(spec => 
                        `<span class="badge bg-light text-dark me-1 mb-1">${spec}</span>`
                    ).join('') : '<span class="text-muted">?¡è??¼è?è¨?/span>'}
                </div>
            </td>
            <td>
                <div class="fw-bold text-success">
                    ${formatCurrency(product.price || 0)}
                </div>
            </td>
            <td>
                <div class="small">
                    <div><strong>?·é?:</strong> <span class="text-primary">${product.stats?.totalSold || 0}</span></div>
                    <div><strong>?Ÿæ”¶:</strong> <span class="text-success">${formatCurrency(product.stats?.totalRevenue || 0)}</span></div>
                    ${product.stats?.lastSold ? 
                        `<div class="text-muted">?€å¾? ${formatDate(product.stats.lastSold)}</div>` : ''
                    }
                </div>
            </td>
            <td>
                <span class="badge ${getProductStatusBadgeClass(product.status)}">
                    ${product.status || '?ªè¨­å®?}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="viewProductDetail('${product.id}')" title="?¥ç?è©³æ?">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="openEditProductModal('${product.id}')" title="ç·¨è¼¯">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = productsHtml;
}

// ?´æ–°?†å?çµ±è?
function updateProductStats(products) {
    if (!products || products.length === 0) {
        document.getElementById('totalProductsCount').textContent = '0';
        document.getElementById('activeProductsCount').textContent = '0';
        document.getElementById('hotProductsCount').textContent = '0';
        document.getElementById('lowStockCount').textContent = '0';
        return;
    }
    
    const activeCount = products.filter(p => p.status === 'ä¸Šæ¶ä¸?).length;
    const hotCount = products.filter(p => p.stats && p.stats.totalSold > 5).length; // ?·é? > 5 ç®—ç†±??    const lowStockCount = products.filter(p => p.variants && p.variants.some(v => v.stock < 5)).length; // åº«å? < 5 ç®—ä?è¶?    
    document.getElementById('totalProductsCount').textContent = products.length.toString();
    document.getElementById('activeProductsCount').textContent = activeCount.toString();
    document.getElementById('hotProductsCount').textContent = hotCount.toString();
    document.getElementById('lowStockCount').textContent = lowStockCount.toString();
}

// ?²å??†å??€?‹å¾½ç« æ¨£å¼?function getProductStatusBadgeClass(status) {
    const statusClasses = {
        'ä¸Šæ¶ä¸?: 'bg-success',
        'å·²ä???: 'bg-secondary',
        '?®å?': 'bg-danger',
        '?è³¼ä¸?: 'bg-warning text-dark'
    };
    return statusClasses[status] || 'bg-secondary';
}

// è®Šæ•¸ä¾†å„²å­˜ç•¶?ç·¨è¼¯ç??†å? ID
let currentEditProductId = null;

// ?¥ç??†å?è©³æ?
async function viewProductDetail(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            const variant = data.variant;  // ?¾åœ¨?¯è?é«”è???            const stats = data.stats;
            const relatedVariants = data.relatedVariants || [];
            const recentOrders = data.recentOrders;
            
            // å¡«å??ºæœ¬è³‡è?ï¼ˆç¾?¨æ˜¯è®Šé?è³‡è?ï¼?            document.getElementById('productDetailName').textContent = variant.name || '-';
            document.getElementById('productDetailCode').textContent = variant.variant_id || variant.id.slice(-8);
            document.getElementById('productDetailCategory').textContent = 'ç«¥è?';  // ?ºå??†é?
            document.getElementById('productDetailPrice').textContent = formatCurrency(variant.price || 0);
            document.getElementById('productDetailCreatedAt').textContent = '-';  // è®Šé?æ²’æ??µå»º?‚é?
            document.getElementById('productDetailDescription').textContent = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '-';
            
            const statusBadge = document.getElementById('productDetailStatus');
            statusBadge.textContent = variant.status || '?ªè¨­å®?;
            statusBadge.className = `badge ${getProductStatusBadgeClass(variant.status)}`;
            
            // å¡«å?çµ±è?è³‡è?
            document.getElementById('productDetailTotalSold').textContent = stats.totalSold || 0;
            document.getElementById('productDetailTotalRevenue').textContent = formatCurrency(stats.totalRevenue || 0);
            document.getElementById('productDetailAvgPrice').textContent = formatCurrency(stats.averagePrice || 0);
            document.getElementById('productDetailLastSold').textContent = stats.lastSold ? formatDate(stats.lastSold) : '-';
            
            // å¡«å??¸é?è®Šé?è³‡è?ï¼ˆå??†å??ç¨±?„å…¶ä»–è?é«”ï?
            updateProductVariantsTable([variant, ...relatedVariants]);
            
            // å¡«å??€è¿‘éŠ·??            updateProductRecentOrdersTable(recentOrders);
            
            // ?²å??†å? ID ä¾›ç·¨è¼¯ä½¿??            currentEditProductId = productId;
            
            // é¡¯ç¤ºæ¨¡æ?æ¡?            const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            modal.show();
        } else {
            showAlert('è¼‰å…¥?†å?è©³æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥?†å?è©³æ?å¤±æ?:', error);
        showAlert('è¼‰å…¥?†å?è©³æ?å¤±æ?', 'danger');
    }
}

// ?´æ–°?†å?è®Šé?è¡¨æ ¼
function updateProductVariantsTable(variants) {
    const tbody = document.getElementById('productDetailVariants');
    
    if (!variants || variants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-layer-group me-1"></i>
                    å°šç„¡è®Šé?è³‡æ?
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
                    ${variant.status || '?ªçŸ¥'}
                </span>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = variantsHtml;
}

// ?´æ–°?†å??€è¿‘éŠ·?®è¡¨??function updateProductRecentOrdersTable(orders) {
    const tbody = document.getElementById('productDetailRecentOrders');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    <i class="fas fa-history me-1"></i>
                    å°šç„¡?·å”®è¨˜é?
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

// ?‹å?ç·¨è¼¯?†å?æ¨¡æ?æ¡?async function openEditProductModal(productId) {
    try {
        const response = await fetch(`/admin/products/${productId}?key=dev`);
        const result = await response.json();
        
        if (result.success) {
            const variant = result.data.variant;  // ?¾åœ¨?¯è?é«”è???            
            // å¡«å?ç·¨è¼¯è¡¨å–®ï¼ˆç¾?¨æ˜¯è®Šé?ç·¨è¼¯ï¼?            document.getElementById('editProductName').value = variant.name || '';
            document.getElementById('editProductCode').value = variant.variant_id || '';
            document.getElementById('editProductCategory').value = 'ç«¥è?';  // ?ºå??†é?
            document.getElementById('editProductPrice').value = variant.price || 0;
            document.getElementById('editProductStatus').value = variant.status || '?ªè¨­å®?;
            document.getElementById('editProductDescription').value = `${variant.style || ''} ${variant.color || ''} ${variant.size || ''} ${variant.gender || ''}`.trim() || '';
            
            // ?²å??†å? ID
            currentEditProductId = productId;
            
            // é¡¯ç¤ºç·¨è¼¯æ¨¡æ?æ¡?            const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
            modal.show();
        } else {
            showAlert('è¼‰å…¥?†å?è³‡æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥?†å?è³‡æ?å¤±æ?:', error);
        showAlert('è¼‰å…¥?†å?è³‡æ?å¤±æ?', 'danger');
    }
}

// å¾è©³?…æ¨¡?‹æ??‹å?ç·¨è¼¯æ¨¡æ?æ¡?function editProduct() {
    if (currentEditProductId) {
        // ?œé?è©³æ?æ¨¡æ?æ¡?        bootstrap.Modal.getInstance(document.getElementById('productDetailModal')).hide();
        
        // ?‹å?ç·¨è¼¯æ¨¡æ?æ¡?        setTimeout(() => {
            openEditProductModal(currentEditProductId);
        }, 300);
    }
}

// ?²å??†å?è®Šæ›´
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
        
        // ç§»é™¤ç©ºå€?        Object.keys(updateData).forEach(key => {
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
            showAlert('?†å?è³‡æ?å·²æ›´??, 'success');
            
            // ?œé?ç·¨è¼¯æ¨¡æ?æ¡?            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            
            // ?æ–°è¼‰å…¥?†å??—è¡¨
            loadProducts();
            
            // æ¸…é™¤?¶å?ç·¨è¼¯ ID
            currentEditProductId = null;
        } else {
            showAlert('?´æ–°?†å?è³‡æ?å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('?´æ–°?†å?è³‡æ?å¤±æ?:', error);
        showAlert('?´æ–°?†å?è³‡æ?å¤±æ?', 'danger');
    }
}

// é¡¯ç¤º?ç¤ºè¨Šæ¯
function showAlert(message, type = 'info') {
    // ?µå»º?ç¤ºæ¡?    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 3ç§’å??ªå?æ¶ˆå¤±
    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// ?¼å??–æ—¥??function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW') + ' ' + date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ?¼å??–é?é¡?function formatCurrency(amount) {
    return '$' + amount.toLocaleString();
} 

// ==================== ?·å”®?±è¡¨?Ÿèƒ½ ====================

// è¼‰å…¥?·å”®?±è¡¨
async function loadSalesReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const period = document.getElementById('reportPeriod').value;
        
        // å¦‚æ?æ²’æ??‡å??¥æ?ï¼Œä½¿?¨æ?è¿?0å¤?        let queryStartDate = startDate;
        let queryEndDate = endDate;
        
        if (!startDate || !endDate) {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            queryStartDate = thirtyDaysAgo.toISOString().split('T')[0];
            queryEndDate = today.toISOString().split('T')[0];
            
            // ?´æ–°è¼¸å…¥æ¡?            document.getElementById('reportStartDate').value = queryStartDate;
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
            showAlert('?±è¡¨å·²ç???, 'success');
        } else {
            showAlert('?Ÿæ??±è¡¨å¤±æ?: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('è¼‰å…¥?·å”®?±è¡¨å¤±æ?:', error);
        showAlert('è¼‰å…¥?·å”®?±è¡¨å¤±æ?', 'danger');
    }
}

// ?´æ–°?±è¡¨?˜è?
function updateReportSummary(summary) {
    document.getElementById('reportTotalOrders').textContent = summary.totalOrders || 0;
    document.getElementById('reportTotalRevenue').textContent = formatCurrency(summary.totalRevenue || 0);
    document.getElementById('reportTotalItems').textContent = summary.totalItems || 0;
    document.getElementById('reportAvgOrderValue').textContent = formatCurrency(summary.averageOrderValue || 0);
    document.getElementById('reportCompletedOrders').textContent = summary.completedOrders || 0;
    document.getElementById('reportPendingOrders').textContent = summary.pendingOrders || 0;
    document.getElementById('reportCancelledOrders').textContent = summary.cancelledOrders || 0;
}

// ?´æ–°?·å”®è¶¨å‹¢?–è¡¨
let salesTrendChartInstance = null;

function updateSalesTrendChart(trends) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    
    // ?·æ??Šå?è¡?    if (salesTrendChartInstance) {
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
                    label: '?Ÿæ”¶ (NT$)',
                    data: revenueData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'è¨‚å–®??,
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
                        text: '?¥æ?'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '?Ÿæ”¶ (NT$)'
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
                        text: 'è¨‚å–®??
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
                                return '?Ÿæ”¶: NT$ ' + context.parsed.y.toLocaleString();
                            } else {
                                return 'è¨‚å–®?? ' + context.parsed.y;
                            }
                        }
                    }
                }
            }
        }
    });
}

// ?´æ–°?±éŠ·?†å?è¡¨æ ¼
function updateTopProductsTable(topProducts) {
    const tbody = document.getElementById('topProductsTable');
    
    if (!topProducts || topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="fas fa-chart-bar me-1"></i>
                    ?«ç„¡?·å”®?¸æ?
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

// ?´æ–°å®¢æˆ¶?†æ?
function updateCustomerAnalysis(customerAnalysis) {
    document.getElementById('reportNewCustomers').textContent = customerAnalysis.newCustomers || 0;
    document.getElementById('reportReturningCustomers').textContent = customerAnalysis.returningCustomers || 0;
    document.getElementById('reportAvgOrdersPerCustomer').textContent = 
        (customerAnalysis.averageOrdersPerCustomer || 0).toFixed(1);
    
    // ?´æ–°?ªè³ªå®¢æˆ¶?’è?
    const tbody = document.getElementById('topCustomersTable');
    
    if (!customerAnalysis.topCustomers || customerAnalysis.topCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    <i class="fas fa-users me-1"></i>
                    ?«ç„¡å®¢æˆ¶?¸æ?
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
                <div class="fw-bold">${customer.name || '?ªçŸ¥å®¢æˆ¶'}</div>
                <small class="text-muted">${customer.id.slice(-8)}</small>
            </td>
            <td class="fw-bold text-primary">${customer.orderCount}</td>
            <td class="fw-bold text-success">${formatCurrency(customer.totalSpent)}</td>
            <td class="text-muted">${customer.lastOrder ? formatDate(customer.lastOrder) : '-'}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = customersHtml;
}

// ?¯å‡º?±è¡¨
async function exportReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) {
            showAlert('è«‹å??¸æ??¥æ?ç¯„å?', 'warning');
            return;
        }
        
        const params = new URLSearchParams({
            format: 'csv',
            startDate: startDate,
            endDate: endDate,
            key: 'dev'
        });
        
        // ?µå»ºä¸‹è????
        const url = `/admin/reports/export?${params.toString()}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `sales_report_${startDate}_${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('?±è¡¨?¯å‡ºä¸?..', 'info');
    } catch (error) {
        console.error('?¯å‡º?±è¡¨å¤±æ?:', error);
        showAlert('?¯å‡º?±è¡¨å¤±æ?', 'danger');
    }
}

// ?ªå?è¼‰å…¥?€è¿?0å¤©å ±è¡¨ï??¶é€²å…¥?±è¡¨?é¢?‚ï?
function initializeReportsPage() {
    // è¨­å??è¨­?¥æ?ç¯„å?ï¼ˆæ?è¿?0å¤©ï?
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('reportStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
    
    // ?ªå?è¼‰å…¥?±è¡¨
    loadSalesReport();
}

// ==================== ä½µå–®ç®¡ç??Ÿèƒ½ ====================

// è¼‰å…¥ä½µå–®æ±?async function loadMergePool() {
    try {
        const response = await fetch('/admin/api/merge-pool', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('è¼‰å…¥ä½µå–®æ± å¤±??);
        }
        
        const result = await response.json();
        updateMergePoolStats(result.data);
        updateMergePoolContainer(result.data);
        
    } catch (error) {
        console.error('è¼‰å…¥ä½µå–®æ± æ??¼ç??¯èª¤:', error);
        showAlert('è¼‰å…¥ä½µå–®æ± å¤±??, 'danger');
    }
}

// ?´æ–°ä½µå–®æ± çµ±è¨?function updateMergePoolStats(mergePoolData) {
    const pendingCustomers = mergePoolData.length;
    const pendingItems = mergePoolData.reduce((total, customerData) => total + customerData.totalItems, 0);
    const pendingAmount = mergePoolData.reduce((total, customerData) => total + customerData.totalAmount, 0);
    
    // è¨ˆç?ä»Šæ—¥?°å?è¨‚å–®
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

// ?´æ–°ä½µå–®æ± å®¹??function updateMergePoolContainer(mergePoolData) {
    const container = document.getElementById('mergePoolContainer');
    
    if (mergePoolData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">?®å?æ²’æ?å¾…ä½µ?®å???/p>';
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
                        <small class="text-muted">(${customerData.customer.phone || '?¡é›»è©?})</small>
                    </h6>
                    <div>
                        <span class="badge bg-warning me-2">${customerData.totalItems} ?…å???/span>
                        <span class="badge bg-success">$${customerData.totalAmount}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6>è¨‚å–®?—è¡¨ï¼?/h6>
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
                                        <strong>?†å??…ç›®ï¼?/strong>
                                        ${order.items.map(item => `
                                            <div class="small text-muted">
                                                ??${item.productName || '?†å?'} ${item.notes || ''} 
                                                (?¸é?ï¼?{item.quantity}, ?®åƒ¹ï¼?${item.unitPrice})
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="mt-1">
                                        <strong>å°è?ï¼?${order.totalAmount}</strong>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-primary w-100" onclick="openCreateShipmentModal('${customerData.customer.id}', '${customerData.customer.name}')">
                                <i class="fas fa-shipping-fast me-2"></i>å»ºç??ºè²¨?¹æ¬¡
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ?‹å?å»ºç??ºè²¨?¹æ¬¡æ¨¡æ?æ¡?function openCreateShipmentModal(customerId, customerName) {
    document.getElementById('shipmentCustomerId').value = customerId;
    document.getElementById('shipmentCustomerName').value = customerName;
    
    // è¨­å??è¨­?¹æ¬¡?ç¨±
    const today = new Date();
    const defaultBatchName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ?¹æ¬¡`;
    document.getElementById('shipmentBatchName').value = defaultBatchName;
    
    // è¼‰å…¥å®¢æˆ¶?„å??é???    loadCustomerItemsForShipment(customerId);
    
    new bootstrap.Modal(document.getElementById('createShipmentModal')).show();
}

// è¼‰å…¥å®¢æˆ¶?†å??…ç›®ä¾›é¸??async function loadCustomerItemsForShipment(customerId) {
    try {
        const response = await fetch(`/admin/merge-pool`, {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        const result = await response.json();
        const customerData = result.data.find(c => c.customer.id === customerId);
        
        if (!customerData) {
            document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-muted">?¾ä??°å®¢?¶è???/p>';
            return;
        }
        
        let html = '';
        customerData.orders.forEach(order => {
            order.items.forEach(item => {
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${item.id}" id="item_${item.id}" checked>
                        <label class="form-check-label" for="item_${item.id}">
                            ${item.productName || '?†å?'} ${item.notes || ''} 
                            <small class="text-muted">(?¸é?ï¼?{item.quantity}, ?®åƒ¹ï¼?${item.unitPrice})</small>
                        </label>
                    </div>
                `;
            });
        });
        
        document.getElementById('shipmentItemsContainer').innerHTML = html;
        
    } catch (error) {
        console.error('è¼‰å…¥å®¢æˆ¶?†å??‚ç™¼?ŸéŒ¯èª?', error);
        document.getElementById('shipmentItemsContainer').innerHTML = '<p class="text-danger">è¼‰å…¥å¤±æ?</p>';
    }
}

// å»ºç??ºè²¨?¹æ¬¡
async function createShipment() {
    try {
        const customerId = document.getElementById('shipmentCustomerId').value;
        const batchName = document.getElementById('shipmentBatchName').value;
        const shippingInfo = document.getElementById('shipmentShippingInfo').value;
        const shippingFee = document.getElementById('shipmentShippingFee').value;
        const notes = document.getElementById('shipmentNotes').value;
        
        // ?¶é??¸ä¸­?„å??é???        const checkedItems = Array.from(document.querySelectorAll('#shipmentItemsContainer input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (checkedItems.length === 0) {
            showAlert('è«‹è‡³å°‘é¸?‡ä??‹å??é???, 'warning');
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
            throw new Error('å»ºç??ºè²¨?¹æ¬¡å¤±æ?');
        }
        
        showAlert('?ºè²¨?¹æ¬¡å»ºç??å?ï¼?, 'success');
        bootstrap.Modal.getInstance(document.getElementById('createShipmentModal')).hide();
        
        // ?æ–°è¼‰å…¥ä½µå–®æ± å??ºè²¨?—è¡¨
        loadMergePool();
        loadShipments();
        
    } catch (error) {
        console.error('å»ºç??ºè²¨?¹æ¬¡?‚ç™¼?ŸéŒ¯èª?', error);
        showAlert('å»ºç??ºè²¨?¹æ¬¡å¤±æ?', 'danger');
    }
}

// ==================== ?ºè²¨ç®¡ç??Ÿèƒ½ ====================

// è¼‰å…¥?ºè²¨?¹æ¬¡
async function loadShipments() {
    try {
        const response = await fetch('/admin/api/shipments', {
            headers: {
                'Authorization': `Bearer ${getApiKey()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('è¼‰å…¥?ºè²¨?¹æ¬¡å¤±æ?');
        }
        
        const result = await response.json();
        updateShipmentStats(result.data);
        updateShipmentsTable(result.data);
        
    } catch (error) {
        console.error('è¼‰å…¥?ºè²¨?¹æ¬¡?‚ç™¼?ŸéŒ¯èª?', error);
        showAlert('è¼‰å…¥?ºè²¨?¹æ¬¡å¤±æ?', 'danger');
    }
}

// ?´æ–°?ºè²¨çµ±è?
function updateShipmentStats(shipments) {
    const pendingPayment = shipments.filter(s => s.status === 'å¾…ä?æ¬?).length;
    const preparing = shipments.filter(s => s.status === '?è²¨ä¸?).length;
    const shipped = shipments.filter(s => s.status === 'å·²å‡ºè²?).length;
    
    document.getElementById('pendingPaymentCount').textContent = pendingPayment;
    document.getElementById('preparingShipmentCount').textContent = preparing;
    document.getElementById('shippedCount').textContent = shipped;
}

// ?´æ–°?ºè²¨?¹æ¬¡è¡¨æ ¼
function updateShipmentsTable(shipments) {
    const tableBody = document.getElementById('shipmentsTableBody');
    
    if (shipments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">æ²’æ??ºè²¨?¹æ¬¡</td></tr>';
        return;
    }
    
    tableBody.innerHTML = shipments.map(shipment => `
        <tr>
            <td>${shipment.batchName}</td>
            <td>${shipment.customerName || '?ªçŸ¥å®¢æˆ¶'}</td>
            <td><span class="badge ${getShipmentStatusBadgeClass(shipment.status)}">${shipment.status}</span></td>
            <td>$${shipment.totalAmount + shipment.shippingFee}</td>
            <td>${formatDate(shipment.createdTime)}</td>
            <td>
                ${shipment.status === 'å¾…ä?æ¬? ? `
                    <button class="btn btn-sm btn-warning" onclick="openSendPaymentModal('${shipment.id}', '${shipment.batchName}', ${shipment.totalAmount + shipment.shippingFee})">
                        ?¼é€ä?æ¬¾é€šçŸ¥
                    </button>
                ` : ''}
                ${shipment.status === 'å·²ä?æ¬? ? `
                    <button class="btn btn-sm btn-info" onclick="updateShipmentStatus('${shipment.id}', 'å·²å‡ºè²?)">
                        æ¨™è?å·²å‡ºè²?                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// ?–å??ºè²¨?€?‹æ¨£å¼?function getShipmentStatusBadgeClass(status) {
    switch(status) {
        case 'å¾…ä?æ¬?: return 'bg-warning';
        case 'å·²ä?æ¬?: return 'bg-info';
        case '?è²¨ä¸?: return 'bg-primary';
        case 'å·²å‡ºè²?: return 'bg-success';
        case 'å·²å???: return 'bg-secondary';
        default: return 'bg-light';
    }
}

// ?‹å??¼é€ä?æ¬¾é€šçŸ¥æ¨¡æ?æ¡?function openSendPaymentModal(shipmentId, batchName, totalAmount) {
    document.getElementById('paymentShipmentId').value = shipmentId;
    document.getElementById('paymentShipmentInfo').innerHTML = `
        <strong>?¹æ¬¡ï¼?/strong>${batchName}<br>
        <strong>ç¸½é?é¡ï?</strong>$${totalAmount}
    `;
    
    new bootstrap.Modal(document.getElementById('sendPaymentModal')).show();
}

// ?¼é€ä?æ¬¾è?æ±?async function sendPaymentRequest() {
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
            throw new Error('?¼é€ä?æ¬¾é€šçŸ¥å¤±æ?');
        }
        
        showAlert('ä»˜æ¬¾?šçŸ¥å·²ç™¼?ï?', 'success');
        bootstrap.Modal.getInstance(document.getElementById('sendPaymentModal')).hide();
        loadShipments();
        
    } catch (error) {
        console.error('?¼é€ä?æ¬¾é€šçŸ¥?‚ç™¼?ŸéŒ¯èª?', error);
        showAlert('?¼é€ä?æ¬¾é€šçŸ¥å¤±æ?', 'danger');
    }
}

// ?´æ–°?ºè²¨?¹æ¬¡?€??async function updateShipmentStatus(shipmentId, newStatus) {
    try {
        // ?™å€‹å??½é?è¦åœ¨å¾Œç«¯å¯¦ä?
        showAlert('?Ÿèƒ½?‹ç™¼ä¸?..', 'info');
        
    } catch (error) {
        console.error('?´æ–°?ºè²¨?€?‹æ??¼ç??¯èª¤:', error);
        showAlert('?´æ–°?€?‹å¤±??, 'danger');
    }
} 
