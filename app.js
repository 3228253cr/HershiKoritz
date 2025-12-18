// Hershi Koritz Catering System
var SUPABASE_URL = 'https://brmnbunyebbmdwvpaluz.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybW5idW55ZWJibWR3dnBhbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjgwOTYsImV4cCI6MjA4MTY0NDA5Nn0.YnZwnllqzaHeCZNehyhLryJXK_mMltKojQdv734q9cw';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var cachedData = {
    categories: [],
    products: [],
    containers: [],
    customers: [],
    suppliers: [],
    tableItems: [],
    ingredients: [],
    packingRules: []
};

var orderItemsCount = 0;
var orderTableItemsCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    var today = new Date().toISOString().split('T')[0];
    var el;
    el = document.getElementById('report-date'); if (el) el.value = today;
    el = document.getElementById('filter-from-date'); if (el) el.value = today;
    el = document.getElementById('filter-to-date'); if (el) el.value = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
    el = document.getElementById('payment-date'); if (el) el.value = today;
    
    loadAllData();
    setupFormHandlers();
});

function showLoading(show) {
    var spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) spinner.classList.add('show');
        else spinner.classList.remove('show');
    }
}

function showToast(message, type) {
    var container = document.querySelector('.toast-container');
    if (!container) return;
    var toastId = 'toast-' + Date.now();
    var bgClass = type === 'error' ? 'danger' : 'success';
    var icon = type === 'error' ? 'x-circle' : 'check-circle';
    var html = '<div id="' + toastId + '" class="toast align-items-center text-bg-' + bgClass + ' border-0" role="alert">' +
        '<div class="d-flex"><div class="toast-body"><i class="bi bi-' + icon + ' me-2"></i>' + message + '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
    container.insertAdjacentHTML('beforeend', html);
    var toastEl = document.getElementById(toastId);
    var toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', function() { toastEl.remove(); });
}

function showPage(pageId) {
    var pages = document.querySelectorAll('.page-content');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    var page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    
    if (pageId === 'orders') loadOrders();
    if (pageId === 'home') loadHomeStats();
    if (pageId === 'payments') loadPaymentsPage();
    if (pageId === 'new-order') {
        orderItemsCount = 0;
        orderTableItemsCount = 0;
        var c1 = document.getElementById('order-items-container');
        var c2 = document.getElementById('order-table-items-container');
        if (c1) c1.innerHTML = '';
        if (c2) c2.innerHTML = '';
        addOrderItem();
    }
    
    var navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        var bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}

function loadAllData() {
    showLoading(true);
    Promise.all([
        loadCategories(),
        loadProducts(),
        loadContainers(),
        loadCustomers(),
        loadSuppliers(),
        loadTableItems(),
        loadIngredients(),
        loadPackingRules()
    ]).then(function() {
        showLoading(false);
        loadHomeStats();
    }).catch(function(err) {
        console.error('Error loading data:', err);
        showToast('שגיאה בטעינת נתונים', 'error');
        showLoading(false);
    });
}

function loadCategories() {
    return db.from('categories').select('*').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.categories = res.data || [];
        renderCategoriesTable();
        populateCategoryDropdowns();
    });
}

function loadProducts() {
    return db.from('products').select('*, categories(name, type)').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.products = res.data || [];
        renderProductsTable();
        populateProductDropdowns();
    });
}

function loadContainers() {
    return db.from('containers').select('*').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.containers = res.data || [];
        renderContainersTable();
        populateContainerDropdowns();
    });
}

function loadCustomers() {
    return db.from('customers').select('*').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.customers = res.data || [];
        renderCustomersTable();
        populateCustomerDropdowns();
    });
}

function loadSuppliers() {
    return db.from('suppliers').select('*').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.suppliers = res.data || [];
        renderSuppliersTable();
        populateSupplierDropdowns();
    });
}

function loadTableItems() {
    return db.from('table_items').select('*, suppliers(name)').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.tableItems = res.data || [];
        renderTableItemsTable();
    });
}

function loadIngredients() {
    return db.from('ingredients').select('*').order('name').then(function(res) {
        if (res.error) throw res.error;
        cachedData.ingredients = res.data || [];
        renderIngredientsTable();
        populateIngredientDropdowns();
    });
}

function loadPackingRules() {
    return db.from('packing_rules').select('*, products(name), containers(name)').order('product_id').then(function(res) {
        if (res.error) throw res.error;
        cachedData.packingRules = res.data || [];
        renderPackingRulesTable();
    });
}

function loadOrders() {
    var fromDate = document.getElementById('filter-from-date').value;
    var toDate = document.getElementById('filter-to-date').value;
    var status = document.getElementById('filter-status').value;
    
    var query = db.from('orders').select('*, customers(name)').order('event_date', { ascending: true });
    if (fromDate) query = query.gte('event_date', fromDate);
    if (toDate) query = query.lte('event_date', toDate);
    if (status) query = query.eq('status', status);
    
    query.then(function(res) {
        if (res.error) { showToast('שגיאה בטעינת הזמנות', 'error'); return; }
        renderOrdersTable(res.data || []);
    });
}

function loadHomeStats() {
    var today = new Date().toISOString().split('T')[0];
    var weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
    
    db.from('orders').select('id').eq('event_date', today).then(function(res) {
        var el = document.getElementById('stat-orders-today');
        if (el) el.textContent = (res.data || []).length;
    });
    
    db.from('orders').select('id').gte('event_date', weekAgo).then(function(res) {
        var el = document.getElementById('stat-orders-week');
        if (el) el.textContent = (res.data || []).length;
    });
    
    db.from('orders').select('total_amount, paid_amount').then(function(res) {
        var orders = res.data || [];
        var pending = 0;
        for (var i = 0; i < orders.length; i++) {
            pending += (orders[i].total_amount || 0) - (orders[i].paid_amount || 0);
        }
        var el = document.getElementById('stat-pending-payments');
        if (el) el.textContent = '₪' + pending.toLocaleString();
    });
    
    var el = document.getElementById('stat-customers');
    if (el) el.textContent = cachedData.customers.length;
    
    db.from('orders').select('*, customers(name)').eq('event_date', today).order('delivery_time').then(function(res) {
        renderTodayOrdersTable(res.data || []);
    });
    
    loadOrdersForReportSelect();
}

function loadOrdersForReportSelect() {
    var today = new Date().toISOString().split('T')[0];
    db.from('orders').select('*, customers(name)').gte('event_date', today).order('event_date').then(function(res) {
        var select = document.getElementById('report-order-select');
        if (!select) return;
        select.innerHTML = '<option value="">בחר הזמנה...</option>';
        var orders = res.data || [];
        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            var option = document.createElement('option');
            option.value = o.id;
            option.textContent = '#' + o.order_number + ' - ' + (o.customers ? o.customers.name : 'לקוח') + ' - ' + o.event_date;
            select.appendChild(option);
        }
    });
}

function loadPaymentsPage() {
    db.from('orders').select('*, customers(name)').order('event_date', { ascending: false }).then(function(res) {
        var orders = res.data || [];
        var tbody = document.getElementById('payments-table');
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">אין הזמנות</td></tr>';
            return;
        }
        
        var totalReceived = 0, totalPending = 0, totalOrders = 0;
        var html = '';
        
        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            var balance = (o.total_amount || 0) - (o.paid_amount || 0);
            totalReceived += (o.paid_amount || 0);
            totalPending += balance > 0 ? balance : 0;
            totalOrders += (o.total_amount || 0);
            
            html += '<tr><td>' + o.order_number + '</td><td>' + (o.customers ? o.customers.name : '-') + '</td><td>' + o.event_date + '</td>';
            html += '<td>₪' + (o.total_amount || 0).toLocaleString() + '</td>';
            html += '<td>₪' + (o.paid_amount || 0).toLocaleString() + '</td>';
            html += '<td class="' + (balance > 0 ? 'text-danger fw-bold' : 'text-success') + '">₪' + balance.toLocaleString() + '</td>';
            html += '<td>' + (balance > 0 ? '<button class="btn btn-sm btn-success" onclick="openPaymentModal(\'' + o.id + '\')"><i class="bi bi-plus-circle me-1"></i> תשלום</button>' : '<span class="badge bg-success">שולם</span>') + '</td></tr>';
        }
        
        tbody.innerHTML = html;
        
        var el1 = document.getElementById('payments-total-received'); if (el1) el1.textContent = '₪' + totalReceived.toLocaleString();
        var el2 = document.getElementById('payments-total-pending'); if (el2) el2.textContent = '₪' + totalPending.toLocaleString();
        var el3 = document.getElementById('payments-total-orders'); if (el3) el3.textContent = '₪' + totalOrders.toLocaleString();
    });
}

// Populate dropdowns
function populateCategoryDropdowns() {
    var select = document.getElementById('product-category');
    if (!select) return;
    var val = select.value;
    select.innerHTML = '<option value="">בחר קטגוריה...</option>';
    for (var i = 0; i < cachedData.categories.length; i++) {
        var c = cachedData.categories[i];
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + ' (' + getTypeLabel(c.type) + ')';
        select.appendChild(opt);
    }
    select.value = val;
}

function populateProductDropdowns() {
    var ids = ['packing-rule-product', 'recipe-product'];
    for (var j = 0; j < ids.length; j++) {
        var select = document.getElementById(ids[j]);
        if (!select) continue;
        select.innerHTML = '<option value="">בחר מוצר...</option>';
        for (var i = 0; i < cachedData.products.length; i++) {
            var p = cachedData.products[i];
            var opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        }
    }
}

function populateContainerDropdowns() {
    var select = document.getElementById('packing-rule-container');
    if (!select) return;
    select.innerHTML = '<option value="">בחר מיכל...</option>';
    for (var i = 0; i < cachedData.containers.length; i++) {
        var c = cachedData.containers[i];
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    }
}

function populateCustomerDropdowns() {
    var select = document.getElementById('order-customer');
    if (!select) return;
    select.innerHTML = '<option value="">בחר לקוח...</option>';
    for (var i = 0; i < cachedData.customers.length; i++) {
        var c = cachedData.customers[i];
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    }
}

function populateSupplierDropdowns() {
    var select = document.getElementById('table-item-supplier');
    if (!select) return;
    select.innerHTML = '<option value="">בחר ספק...</option>';
    for (var i = 0; i < cachedData.suppliers.length; i++) {
        var s = cachedData.suppliers[i];
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    }
}

function populateIngredientDropdowns() {
    var select = document.getElementById('recipe-ingredient');
    if (!select) return;
    select.innerHTML = '<option value="">בחר חומר גלם...</option>';
    for (var i = 0; i < cachedData.ingredients.length; i++) {
        var ing = cachedData.ingredients[i];
        var opt = document.createElement('option');
        opt.value = ing.id;
        opt.textContent = ing.name + ' (' + ing.unit + ')';
        select.appendChild(opt);
    }
}

// Render tables
function renderCategoriesTable() {
    var tbody = document.getElementById('categories-table');
    if (!tbody) return;
    if (cachedData.categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">אין קטגוריות</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.categories.length; i++) {
        var c = cachedData.categories[i];
        html += '<tr><td>' + c.name + '</td>';
        html += '<td><span class="badge bg-' + getTypeBadgeColor(c.type) + '">' + getTypeLabel(c.type) + '</span></td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editCategory(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCategory(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderProductsTable(categoryFilter) {
    var tbody = document.getElementById('products-table');
    if (!tbody) return;
    var products = cachedData.products;
    if (categoryFilter && categoryFilter !== 'all') {
        products = products.filter(function(p) { return p.categories && p.categories.type === categoryFilter; });
    }
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">אין מוצרים</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        html += '<tr><td>' + p.name + '</td>';
        html += '<td>' + (p.categories ? p.categories.name : '-') + '</td>';
        html += '<td>₪' + (p.price_per_portion || 0).toFixed(2) + '</td>';
        html += '<td>' + (p.description || '-') + '</td>';
        html += '<td><span class="badge bg-' + (p.is_active ? 'success' : 'secondary') + '">' + (p.is_active ? 'פעיל' : 'לא פעיל') + '</span></td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editProduct(\'' + p.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteProduct(\'' + p.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderContainersTable() {
    var tbody = document.getElementById('containers-table');
    if (!tbody) return;
    if (cachedData.containers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין מיכלים</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.containers.length; i++) {
        var c = cachedData.containers[i];
        html += '<tr><td>' + c.name + '</td>';
        html += '<td>' + (c.capacity_liters || '-') + '</td>';
        html += '<td>' + (c.capacity_portions || '-') + '</td>';
        html += '<td>' + (c.description || '-') + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editContainer(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteContainer(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderCustomersTable() {
    var tbody = document.getElementById('customers-table');
    if (!tbody) return;
    if (cachedData.customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין לקוחות</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.customers.length; i++) {
        var c = cachedData.customers[i];
        html += '<tr><td>' + c.name + '</td>';
        html += '<td>' + (c.phone || '-') + '</td>';
        html += '<td>' + (c.email || '-') + '</td>';
        html += '<td>' + (c.address || '-') + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editCustomer(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCustomer(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderSuppliersTable() {
    var tbody = document.getElementById('suppliers-table');
    if (!tbody) return;
    if (cachedData.suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין ספקים</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.suppliers.length; i++) {
        var s = cachedData.suppliers[i];
        html += '<tr><td>' + s.name + '</td>';
        html += '<td><span class="badge bg-' + getSupplierTypeBadgeColor(s.type) + '">' + getSupplierTypeLabel(s.type) + '</span></td>';
        html += '<td>' + (s.phone || '-') + '</td>';
        html += '<td>' + (s.whatsapp ? '<a href="https://wa.me/' + s.whatsapp + '" target="_blank" class="btn btn-sm btn-success"><i class="bi bi-whatsapp"></i></a>' : '-') + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editSupplier(\'' + s.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteSupplier(\'' + s.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderTableItemsTable() {
    var tbody = document.getElementById('table-items-table');
    if (!tbody) return;
    if (cachedData.tableItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין פריטי שולחן</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.tableItems.length; i++) {
        var item = cachedData.tableItems[i];
        html += '<tr><td>' + item.name + '</td>';
        html += '<td>' + (item.category || '-') + '</td>';
        html += '<td>' + (item.suppliers ? item.suppliers.name : '-') + '</td>';
        html += '<td>₪' + (item.price_per_unit || 0).toFixed(2) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editTableItem(\'' + item.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteTableItem(\'' + item.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderIngredientsTable() {
    var tbody = document.getElementById('ingredients-table');
    if (!tbody) return;
    if (cachedData.ingredients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">אין חומרי גלם</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.ingredients.length; i++) {
        var ing = cachedData.ingredients[i];
        var warn = ing.current_stock < ing.min_stock ? 'table-warning' : '';
        html += '<tr class="' + warn + '"><td>' + ing.name + '</td>';
        html += '<td>' + getUnitLabel(ing.unit) + '</td>';
        html += '<td>₪' + (ing.cost_per_unit || 0).toFixed(2) + '</td>';
        html += '<td>' + (ing.current_stock || 0) + '</td>';
        html += '<td>' + (ing.min_stock || 0) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editIngredient(\'' + ing.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteIngredient(\'' + ing.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderPackingRulesTable() {
    var tbody = document.getElementById('packing-rules-table');
    if (!tbody) return;
    if (cachedData.packingRules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין כללי אריזה</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < cachedData.packingRules.length; i++) {
        var r = cachedData.packingRules[i];
        html += '<tr><td>' + (r.products ? r.products.name : '-') + '</td>';
        html += '<td>' + r.min_portions + '</td>';
        html += '<td>' + r.max_portions + '</td>';
        html += '<td>' + (r.containers ? r.containers.name : '-') + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editPackingRule(\'' + r.id + '\')"><i class="bi bi-pencil"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-danger btn-action" onclick="deletePackingRule(\'' + r.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderOrdersTable(orders) {
    var tbody = document.getElementById('orders-table');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">אין הזמנות</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        var balance = (o.total_amount || 0) - (o.paid_amount || 0);
        html += '<tr><td>' + o.order_number + '</td>';
        html += '<td>' + (o.customers ? o.customers.name : '-') + '</td>';
        html += '<td>' + o.event_date + '</td>';
        html += '<td>' + o.delivery_time + '</td>';
        html += '<td>₪' + (o.total_amount || 0).toLocaleString() + '</td>';
        html += '<td>₪' + (o.paid_amount || 0).toLocaleString() + '</td>';
        html += '<td class="' + (balance > 0 ? 'text-danger fw-bold' : 'text-success') + '">₪' + balance.toLocaleString() + '</td>';
        html += '<td><span class="badge bg-' + getStatusBadgeColor(o.status) + '">' + getStatusLabel(o.status) + '</span></td>';
        html += '<td><button class="btn btn-sm btn-outline-info btn-action" onclick="viewOrder(\'' + o.id + '\')"><i class="bi bi-eye"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-success btn-action" onclick="openPaymentModal(\'' + o.id + '\')"><i class="bi bi-cash"></i></button> ';
        html += '<button class="btn btn-sm btn-outline-primary btn-action" onclick="editOrder(\'' + o.id + '\')"><i class="bi bi-pencil"></i></button></td></tr>';
    }
    tbody.innerHTML = html;
}

function renderTodayOrdersTable(orders) {
    var tbody = document.getElementById('today-orders-table');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">אין הזמנות להיום</td></tr>';
        return;
    }
    var html = '';
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        html += '<tr><td>' + o.order_number + '</td>';
        html += '<td>' + (o.customers ? o.customers.name : '-') + '</td>';
        html += '<td>' + o.delivery_time + '</td>';
        html += '<td><span class="badge bg-' + getStatusBadgeColor(o.status) + '">' + getStatusLabel(o.status) + '</span></td>';
        html += '<td><button class="btn btn-sm btn-outline-primary" onclick="viewOrder(\'' + o.id + '\')"><i class="bi bi-eye"></i> צפה</button></td></tr>';
    }
    tbody.innerHTML = html;
}

// Form handlers
function setupFormHandlers() {
    var forms = [
        { id: 'customer-form', fn: saveCustomer },
        { id: 'product-form', fn: saveProduct },
        { id: 'category-form', fn: saveCategory },
        { id: 'container-form', fn: saveContainer },
        { id: 'supplier-form', fn: saveSupplier },
        { id: 'payment-form', fn: savePayment },
        { id: 'table-item-form', fn: saveTableItem },
        { id: 'packing-rule-form', fn: savePackingRule },
        { id: 'ingredient-form', fn: saveIngredient },
        { id: 'recipe-form', fn: saveRecipe },
        { id: 'new-order-form', fn: saveOrder }
    ];
    
    for (var i = 0; i < forms.length; i++) {
        var form = document.getElementById(forms[i].id);
        if (form) {
            (function(fn) {
                form.addEventListener('submit', function(e) { e.preventDefault(); fn(); });
            })(forms[i].fn);
        }
    }
    
    var tabs = document.querySelectorAll('#productCategoryTabs .nav-link');
    for (var j = 0; j < tabs.length; j++) {
        tabs[j].addEventListener('click', function(e) {
            e.preventDefault();
            for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('active');
            this.classList.add('active');
            renderProductsTable(this.dataset.category);
        });
    }
}

// CRUD - Customers
function saveCustomer() {
    var id = document.getElementById('customer-id').value;
    var data = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        email: document.getElementById('customer-email').value,
        address: document.getElementById('customer-address').value,
        notes: document.getElementById('customer-notes').value
    };
    
    var promise = id 
        ? db.from('customers').update(data).eq('id', id)
        : db.from('customers').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast(id ? 'לקוח עודכן' : 'לקוח נוצר');
        bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
        document.getElementById('customer-form').reset();
        document.getElementById('customer-id').value = '';
        loadCustomers();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function editCustomer(id) {
    var c = cachedData.customers.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById('customer-id').value = c.id;
    document.getElementById('customer-name').value = c.name;
    document.getElementById('customer-phone').value = c.phone || '';
    document.getElementById('customer-email').value = c.email || '';
    document.getElementById('customer-address').value = c.address || '';
    document.getElementById('customer-notes').value = c.notes || '';
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

function deleteCustomer(id) {
    if (!confirm('האם למחוק את הלקוח?')) return;
    db.from('customers').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('לקוח נמחק');
        loadCustomers();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Products
function saveProduct() {
    var id = document.getElementById('product-id').value;
    var data = {
        name: document.getElementById('product-name').value,
        category_id: document.getElementById('product-category').value || null,
        price_per_portion: parseFloat(document.getElementById('product-price').value) || 0,
        description: document.getElementById('product-description').value,
        is_active: document.getElementById('product-active').checked
    };
    
    var promise = id 
        ? db.from('products').update(data).eq('id', id)
        : db.from('products').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast(id ? 'מוצר עודכן' : 'מוצר נוצר');
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        loadProducts();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function editProduct(id) {
    var p = cachedData.products.find(function(x) { return x.id === id; });
    if (!p) return;
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-category').value = p.category_id || '';
    document.getElementById('product-price').value = p.price_per_portion || '';
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('product-active').checked = p.is_active;
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

function deleteProduct(id) {
    if (!confirm('האם למחוק את המוצר?')) return;
    db.from('products').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('מוצר נמחק');
        loadProducts();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Categories
function saveCategory() {
    var id = document.getElementById('category-id').value;
    var data = {
        name: document.getElementById('category-name').value,
        type: document.getElementById('category-type').value
    };
    
    var promise = id 
        ? db.from('categories').update(data).eq('id', id)
        : db.from('categories').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast(id ? 'קטגוריה עודכנה' : 'קטגוריה נוצרה');
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        document.getElementById('category-form').reset();
        document.getElementById('category-id').value = '';
        loadCategories();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function editCategory(id) {
    var c = cachedData.categories.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById('category-id').value = c.id;
    document.getElementById('category-name').value = c.name;
    document.getElementById('category-type').value = c.type;
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

function deleteCategory(id) {
    if (!confirm('האם למחוק את הקטגוריה?')) return;
    db.from('categories').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('קטגוריה נמחקה');
        loadCategories();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Containers
function saveContainer() {
    var id = document.getElementById('container-id').value;
    var data = {
        name: document.getElementById('container-name').value,
        capacity_liters: parseFloat(document.getElementById('container-liters').value) || null,
        capacity_portions: parseInt(document.getElementById('container-portions').value) || null,
        description: document.getElementById('container-description').value
    };
    
    var promise = id 
        ? db.from('containers').update(data).eq('id', id)
        : db.from('containers').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast(id ? 'מיכל עודכן' : 'מיכל נוצר');
        bootstrap.Modal.getInstance(document.getElementById('containerModal')).hide();
        document.getElementById('container-form').reset();
        document.getElementById('container-id').value = '';
        loadContainers();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function editContainer(id) {
    var c = cachedData.containers.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById('container-id').value = c.id;
    document.getElementById('container-name').value = c.name;
    document.getElementById('container-liters').value = c.capacity_liters || '';
    document.getElementById('container-portions').value = c.capacity_portions || '';
    document.getElementById('container-description').value = c.description || '';
    new bootstrap.Modal(document.getElementById('containerModal')).show();
}

function deleteContainer(id) {
    if (!confirm('האם למחוק את המיכל?')) return;
    db.from('containers').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('מיכל נמחק');
        loadContainers();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Suppliers
function saveSupplier() {
    var id = document.getElementById('supplier-id').value;
    var data = {
        name: document.getElementById('supplier-name').value,
        type: document.getElementById('supplier-type').value,
        phone: document.getElementById('supplier-phone').value,
        whatsapp: document.getElementById('supplier-whatsapp').value,
        email: document.getElementById('supplier-email').value,
        address: document.getElementById('supplier-address').value,
        notes: document.getElementById('supplier-notes').value
    };
    
    var promise = id 
        ? db.from('suppliers').update(data).eq('id', id)
        : db.from('suppliers').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast(id ? 'ספק עודכן' : 'ספק נוצר');
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
        document.getElementById('supplier-form').reset();
        document.getElementById('supplier-id').value = '';
        loadSuppliers();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function editSupplier(id) {
    var s = cachedData.suppliers.find(function(x) { return x.id === id; });
    if (!s) return;
    document.getElementById('supplier-id').value = s.id;
    document.getElementById('supplier-name').value = s.name;
    document.getElementById('supplier-type').value = s.type;
    document.getElementById('supplier-phone').value = s.phone || '';
    document.getElementById('supplier-whatsapp').value = s.whatsapp || '';
    document.getElementById('supplier-email').value = s.email || '';
    document.getElementById('supplier-address').value = s.address || '';
    document.getElementById('supplier-notes').value = s.notes || '';
    new bootstrap.Modal(document.getElementById('supplierModal')).show();
}

function deleteSupplier(id) {
    if (!confirm('האם למחוק את הספק?')) return;
    db.from('suppliers').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('ספק נמחק');
        loadSuppliers();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Table Items
function saveTableItem() {
    var id = document.getElementById('table-item-id').value;
    var data = {
        name: document.getElementById('table-item-name').value,
        category: document.getElementById('table-item-category').value,
        supplier_id: document.getElementById('table-item-supplier').value || null,
        price_per_unit: parseFloat(document.getElementById('table-item-price').value) || 0
    };
    
    var promise = id 
        ? db.from('table_items').update(data).eq('id', id)
        : db.from('table_items').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast('נשמר');
        bootstrap.Modal.getInstance(document.getElementById('tableItemModal')).hide();
        document.getElementById('table-item-form').reset();
        document.getElementById('table-item-id').value = '';
        loadTableItems();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

function editTableItem(id) {
    var item = cachedData.tableItems.find(function(x) { return x.id === id; });
    if (!item) return;
    document.getElementById('table-item-id').value = item.id;
    document.getElementById('table-item-name').value = item.name;
    document.getElementById('table-item-category').value = item.category || '';
    document.getElementById('table-item-supplier').value = item.supplier_id || '';
    document.getElementById('table-item-price').value = item.price_per_unit || '';
    new bootstrap.Modal(document.getElementById('tableItemModal')).show();
}

function deleteTableItem(id) {
    if (!confirm('למחוק?')) return;
    db.from('table_items').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('נמחק');
        loadTableItems();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Packing Rules
function savePackingRule() {
    var id = document.getElementById('packing-rule-id').value;
    var data = {
        product_id: document.getElementById('packing-rule-product').value,
        min_portions: parseInt(document.getElementById('packing-rule-min').value),
        max_portions: parseInt(document.getElementById('packing-rule-max').value),
        container_id: document.getElementById('packing-rule-container').value
    };
    
    var promise = id 
        ? db.from('packing_rules').update(data).eq('id', id)
        : db.from('packing_rules').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast('נשמר');
        bootstrap.Modal.getInstance(document.getElementById('packingRuleModal')).hide();
        document.getElementById('packing-rule-form').reset();
        document.getElementById('packing-rule-id').value = '';
        loadPackingRules();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

function editPackingRule(id) {
    var r = cachedData.packingRules.find(function(x) { return x.id === id; });
    if (!r) return;
    document.getElementById('packing-rule-id').value = r.id;
    document.getElementById('packing-rule-product').value = r.product_id;
    document.getElementById('packing-rule-min').value = r.min_portions;
    document.getElementById('packing-rule-max').value = r.max_portions;
    document.getElementById('packing-rule-container').value = r.container_id;
    new bootstrap.Modal(document.getElementById('packingRuleModal')).show();
}

function deletePackingRule(id) {
    if (!confirm('למחוק?')) return;
    db.from('packing_rules').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('נמחק');
        loadPackingRules();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// CRUD - Ingredients
function saveIngredient() {
    var id = document.getElementById('ingredient-id').value;
    var data = {
        name: document.getElementById('ingredient-name').value,
        unit: document.getElementById('ingredient-unit').value,
        cost_per_unit: parseFloat(document.getElementById('ingredient-cost').value) || 0,
        current_stock: parseFloat(document.getElementById('ingredient-stock').value) || 0,
        min_stock: parseFloat(document.getElementById('ingredient-min-stock').value) || 0
    };
    
    var promise = id 
        ? db.from('ingredients').update(data).eq('id', id)
        : db.from('ingredients').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast('נשמר');
        bootstrap.Modal.getInstance(document.getElementById('ingredientModal')).hide();
        document.getElementById('ingredient-form').reset();
        document.getElementById('ingredient-id').value = '';
        loadIngredients();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

function editIngredient(id) {
    var ing = cachedData.ingredients.find(function(x) { return x.id === id; });
    if (!ing) return;
    document.getElementById('ingredient-id').value = ing.id;
    document.getElementById('ingredient-name').value = ing.name;
    document.getElementById('ingredient-unit').value = ing.unit;
    document.getElementById('ingredient-cost').value = ing.cost_per_unit || '';
    document.getElementById('ingredient-stock').value = ing.current_stock || '';
    document.getElementById('ingredient-min-stock').value = ing.min_stock || '';
    new bootstrap.Modal(document.getElementById('ingredientModal')).show();
}

function deleteIngredient(id) {
    if (!confirm('למחוק?')) return;
    db.from('ingredients').delete().eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        showToast('נמחק');
        loadIngredients();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// Recipe
function saveRecipe() {
    var id = document.getElementById('recipe-id').value;
    var data = {
        product_id: document.getElementById('recipe-product').value,
        ingredient_id: document.getElementById('recipe-ingredient').value,
        quantity_per_portion: parseFloat(document.getElementById('recipe-quantity').value),
        unit: document.getElementById('recipe-unit').value
    };
    
    var promise = id 
        ? db.from('recipes').update(data).eq('id', id)
        : db.from('recipes').insert([data]);
    
    promise.then(function(res) {
        if (res.error) throw res.error;
        showToast('נשמר');
        bootstrap.Modal.getInstance(document.getElementById('recipeModal')).hide();
        document.getElementById('recipe-form').reset();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

// Payments
function savePayment() {
    var orderId = document.getElementById('payment-order-id').value;
    var amount = parseFloat(document.getElementById('payment-amount').value);
    var data = {
        order_id: orderId,
        amount: amount,
        payment_method: document.getElementById('payment-method').value,
        payment_date: document.getElementById('payment-date').value,
        reference: document.getElementById('payment-reference').value,
        notes: document.getElementById('payment-notes').value
    };
    
    db.from('payments').insert([data]).then(function(res) {
        if (res.error) throw res.error;
        return db.from('orders').select('paid_amount').eq('id', orderId).single();
    }).then(function(res) {
        var newPaid = (res.data.paid_amount || 0) + amount;
        return db.from('orders').update({ paid_amount: newPaid }).eq('id', orderId);
    }).then(function() {
        showToast('תשלום נרשם');
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        document.getElementById('payment-form').reset();
        loadOrders();
        loadHomeStats();
    }).catch(function() { showToast('שגיאה', 'error'); });
}

function openPaymentModal(orderId) {
    document.getElementById('payment-order-id').value = orderId;
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}

// Orders
function addOrderItem() {
    var container = document.getElementById('order-items-container');
    if (!container) return;
    var itemId = orderItemsCount++;
    var options = '<option value="">בחר מוצר...</option>';
    for (var i = 0; i < cachedData.products.length; i++) {
        var p = cachedData.products[i];
        if (p.is_active) {
            options += '<option value="' + p.id + '" data-price="' + p.price_per_portion + '">' + p.name + ' - ₪' + p.price_per_portion + '</option>';
        }
    }
    var html = '<div class="row g-2 mb-2 order-item" data-item-id="' + itemId + '">' +
        '<div class="col-md-5"><select class="form-select form-select-sm" name="product_' + itemId + '" required onchange="updateOrderItemPrice(' + itemId + ')">' + options + '</select></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="quantity_' + itemId + '" placeholder="כמות" min="1" required onchange="updateOrderItemPrice(' + itemId + ')"></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="price_' + itemId + '" placeholder="מחיר" step="0.01" onchange="calculateOrderTotal()"></div>' +
        '<div class="col-md-2"><span class="form-control-plaintext item-total" id="item-total-' + itemId + '">₪0</span></div>' +
        '<div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOrderItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>';
    container.insertAdjacentHTML('beforeend', html);
}

function removeOrderItem(itemId) {
    var el = document.querySelector('.order-item[data-item-id="' + itemId + '"]');
    if (el) el.remove();
    calculateOrderTotal();
}

function updateOrderItemPrice(itemId) {
    var select = document.querySelector('select[name="product_' + itemId + '"]');
    var qtyInput = document.querySelector('input[name="quantity_' + itemId + '"]');
    var priceInput = document.querySelector('input[name="price_' + itemId + '"]');
    var totalSpan = document.getElementById('item-total-' + itemId);
    
    var opt = select.options[select.selectedIndex];
    var price = opt && opt.dataset.price ? parseFloat(opt.dataset.price) : 0;
    var qty = parseInt(qtyInput.value) || 0;
    
    priceInput.value = price;
    totalSpan.textContent = '₪' + (price * qty).toFixed(2);
    calculateOrderTotal();
}

function addOrderTableItem() {
    var container = document.getElementById('order-table-items-container');
    if (!container) return;
    var itemId = orderTableItemsCount++;
    var options = '<option value="">בחר פריט...</option>';
    for (var i = 0; i < cachedData.tableItems.length; i++) {
        var t = cachedData.tableItems[i];
        options += '<option value="' + t.id + '" data-price="' + t.price_per_unit + '">' + t.name + ' - ₪' + t.price_per_unit + '</option>';
    }
    var html = '<div class="row g-2 mb-2 order-table-item" data-item-id="' + itemId + '">' +
        '<div class="col-md-5"><select class="form-select form-select-sm" name="table_item_' + itemId + '" required onchange="updateOrderTableItemPrice(' + itemId + ')">' + options + '</select></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="table_quantity_' + itemId + '" placeholder="כמות" min="1" required onchange="updateOrderTableItemPrice(' + itemId + ')"></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="table_price_' + itemId + '" placeholder="מחיר" step="0.01" onchange="calculateOrderTotal()"></div>' +
        '<div class="col-md-2"><span class="form-control-plaintext table-item-total" id="table-item-total-' + itemId + '">₪0</span></div>' +
        '<div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOrderTableItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>';
    container.insertAdjacentHTML('beforeend', html);
}

function removeOrderTableItem(itemId) {
    var el = document.querySelector('.order-table-item[data-item-id="' + itemId + '"]');
    if (el) el.remove();
    calculateOrderTotal();
}

function updateOrderTableItemPrice(itemId) {
    var select = document.querySelector('select[name="table_item_' + itemId + '"]');
    var qtyInput = document.querySelector('input[name="table_quantity_' + itemId + '"]');
    var priceInput = document.querySelector('input[name="table_price_' + itemId + '"]');
    var totalSpan = document.getElementById('table-item-total-' + itemId);
    
    var opt = select.options[select.selectedIndex];
    var price = opt && opt.dataset.price ? parseFloat(opt.dataset.price) : 0;
    var qty = parseInt(qtyInput.value) || 0;
    
    priceInput.value = price;
    totalSpan.textContent = '₪' + (price * qty).toFixed(2);
    calculateOrderTotal();
}

function calculateOrderTotal() {
    var productsTotal = 0;
    var tableTotal = 0;
    
    var itemTotals = document.querySelectorAll('.order-item .item-total');
    for (var i = 0; i < itemTotals.length; i++) {
        productsTotal += parseFloat(itemTotals[i].textContent.replace('₪', '')) || 0;
    }
    
    var tableTotals = document.querySelectorAll('.order-table-item .table-item-total');
    for (var j = 0; j < tableTotals.length; j++) {
        tableTotal += parseFloat(tableTotals[j].textContent.replace('₪', '')) || 0;
    }
    
    var el1 = document.getElementById('order-products-total'); if (el1) el1.textContent = '₪' + productsTotal.toFixed(2);
    var el2 = document.getElementById('order-table-total'); if (el2) el2.textContent = '₪' + tableTotal.toFixed(2);
    var el3 = document.getElementById('order-grand-total'); if (el3) el3.textContent = '₪' + (productsTotal + tableTotal).toFixed(2);
}

function saveOrder() {
    var orderData = {
        customer_id: document.getElementById('order-customer').value,
        event_type: document.getElementById('order-event-type').value,
        event_date: document.getElementById('order-event-date').value,
        delivery_time: document.getElementById('order-delivery-time').value,
        guests_count: parseInt(document.getElementById('order-guests').value) || null,
        delivery_address: document.getElementById('order-address').value,
        notes: document.getElementById('order-notes').value,
        total_amount: parseFloat(document.getElementById('order-grand-total').textContent.replace('₪', '')) || 0,
        paid_amount: 0,
        status: 'new'
    };
    
    db.from('orders').insert([orderData]).select().single().then(function(res) {
        if (res.error) throw res.error;
        var order = res.data;
        
        var orderItems = [];
        var items = document.querySelectorAll('.order-item');
        for (var i = 0; i < items.length; i++) {
            var itemId = items[i].dataset.itemId;
            var productId = document.querySelector('select[name="product_' + itemId + '"]').value;
            var qty = parseInt(document.querySelector('input[name="quantity_' + itemId + '"]').value) || 0;
            var price = parseFloat(document.querySelector('input[name="price_' + itemId + '"]').value) || 0;
            if (productId && qty > 0) {
                orderItems.push({ order_id: order.id, product_id: productId, quantity: qty, price_per_unit: price, total_price: price * qty });
            }
        }
        
        var tableItems = [];
        var tItems = document.querySelectorAll('.order-table-item');
        for (var j = 0; j < tItems.length; j++) {
            var tItemId = tItems[j].dataset.itemId;
            var tableItemId = document.querySelector('select[name="table_item_' + tItemId + '"]').value;
            var tQty = parseInt(document.querySelector('input[name="table_quantity_' + tItemId + '"]').value) || 0;
            var tPrice = parseFloat(document.querySelector('input[name="table_price_' + tItemId + '"]').value) || 0;
            if (tableItemId && tQty > 0) {
                tableItems.push({ order_id: order.id, table_item_id: tableItemId, quantity: tQty, price_per_unit: tPrice, total_price: tPrice * tQty });
            }
        }
        
        var promises = [];
        if (orderItems.length > 0) promises.push(db.from('order_items').insert(orderItems));
        if (tableItems.length > 0) promises.push(db.from('order_table_items').insert(tableItems));
        
        return Promise.all(promises);
    }).then(function() {
        showToast('הזמנה נשמרה');
        document.getElementById('new-order-form').reset();
        document.getElementById('order-items-container').innerHTML = '';
        document.getElementById('order-table-items-container').innerHTML = '';
        orderItemsCount = 0;
        orderTableItemsCount = 0;
        calculateOrderTotal();
        showPage('orders');
        loadOrders();
        loadHomeStats();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
    });
}

function viewOrder(id) {
    db.from('orders').select('*, customers(name, phone, address), order_items(*, products(name)), order_table_items(*, table_items(name))').eq('id', id).single().then(function(res) {
        if (res.error) { showToast('שגיאה בטעינת הזמנה', 'error'); return; }
        var order = res.data;
        var balance = (order.total_amount || 0) - (order.paid_amount || 0);
        
        var html = '<div class="row">';
        html += '<div class="col-md-6"><h6>פרטי לקוח</h6>';
        html += '<p><strong>שם:</strong> ' + (order.customers ? order.customers.name : '-') + '</p>';
        html += '<p><strong>טלפון:</strong> ' + (order.customers && order.customers.phone ? order.customers.phone : '-') + '</p>';
        html += '<p><strong>כתובת משלוח:</strong> ' + (order.delivery_address || '-') + '</p></div>';
        html += '<div class="col-md-6"><h6>פרטי אירוע</h6>';
        html += '<p><strong>תאריך:</strong> ' + order.event_date + '</p>';
        html += '<p><strong>שעת משלוח:</strong> ' + order.delivery_time + '</p>';
        html += '<p><strong>סוג אירוע:</strong> ' + getEventTypeLabel(order.event_type) + '</p>';
        html += '<p><strong>מספר אורחים:</strong> ' + (order.guests_count || '-') + '</p></div></div>';
        
        html += '<hr><h6>פריטי הזמנה</h6>';
        if (order.order_items && order.order_items.length > 0) {
            html += '<table class="table table-sm"><thead><tr><th>מוצר</th><th>כמות</th><th>מחיר</th><th>סה"כ</th></tr></thead><tbody>';
            for (var i = 0; i < order.order_items.length; i++) {
                var item = order.order_items[i];
                html += '<tr><td>' + (item.products ? item.products.name : '-') + '</td>';
                html += '<td>' + item.quantity + '</td>';
                html += '<td>₪' + (item.price_per_unit || 0).toFixed(2) + '</td>';
                html += '<td>₪' + (item.total_price || 0).toFixed(2) + '</td></tr>';
            }
            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted">אין פריטים</p>';
        }
        
        if (order.order_table_items && order.order_table_items.length > 0) {
            html += '<h6>פריטי שולחן</h6>';
            html += '<table class="table table-sm"><thead><tr><th>פריט</th><th>כמות</th><th>מחיר</th><th>סה"כ</th></tr></thead><tbody>';
            for (var j = 0; j < order.order_table_items.length; j++) {
                var tItem = order.order_table_items[j];
                html += '<tr><td>' + (tItem.table_items ? tItem.table_items.name : '-') + '</td>';
                html += '<td>' + tItem.quantity + '</td>';
                html += '<td>₪' + (tItem.price_per_unit || 0).toFixed(2) + '</td>';
                html += '<td>₪' + (tItem.total_price || 0).toFixed(2) + '</td></tr>';
            }
            html += '</tbody></table>';
        }
        
        html += '<hr><div class="row"><div class="col-md-6">';
        html += '<h6>הערות</h6><p>' + (order.notes || 'אין הערות') + '</p></div>';
        html += '<div class="col-md-6"><h6>סיכום כספי</h6>';
        html += '<p><strong>סה"כ:</strong> ₪' + (order.total_amount || 0).toLocaleString() + '</p>';
        html += '<p><strong>שולם:</strong> ₪' + (order.paid_amount || 0).toLocaleString() + '</p>';
        html += '<p class="' + (balance > 0 ? 'text-danger' : 'text-success') + '"><strong>יתרה:</strong> ₪' + balance.toLocaleString() + '</p>';
        html += '</div></div>';
        
        document.getElementById('view-order-content').innerHTML = html;
        document.getElementById('view-order-title').textContent = 'הזמנה #' + order.order_number;
        new bootstrap.Modal(document.getElementById('viewOrderModal')).show();
    });
}

var editOrderItemsCount = 0;
var editOrderTableItemsCount = 0;
var currentEditOrderId = null;

function editOrder(id) {
    currentEditOrderId = id;
    editOrderItemsCount = 0;
    editOrderTableItemsCount = 0;
    
    db.from('orders').select('*, order_items(*, products(name, price_per_portion)), order_table_items(*, table_items(name, price_per_unit))').eq('id', id).single().then(function(res) {
        if (res.error) { showToast('שגיאה בטעינת הזמנה', 'error'); return; }
        var order = res.data;
        
        document.getElementById('edit-order-id').value = order.id;
        document.getElementById('edit-order-customer').value = order.customer_id;
        document.getElementById('edit-order-event-type').value = order.event_type || '';
        document.getElementById('edit-order-event-date').value = order.event_date;
        document.getElementById('edit-order-delivery-time').value = order.delivery_time;
        document.getElementById('edit-order-guests').value = order.guests_count || '';
        document.getElementById('edit-order-address').value = order.delivery_address || '';
        document.getElementById('edit-order-notes').value = order.notes || '';
        document.getElementById('edit-order-status').value = order.status;
        
        // Populate customer dropdown
        var customerSelect = document.getElementById('edit-order-customer');
        customerSelect.innerHTML = '<option value="">בחר לקוח...</option>';
        for (var c = 0; c < cachedData.customers.length; c++) {
            var cust = cachedData.customers[c];
            var opt = document.createElement('option');
            opt.value = cust.id;
            opt.textContent = cust.name;
            if (cust.id === order.customer_id) opt.selected = true;
            customerSelect.appendChild(opt);
        }
        
        // Clear and populate order items
        var itemsContainer = document.getElementById('edit-order-items-container');
        itemsContainer.innerHTML = '';
        if (order.order_items && order.order_items.length > 0) {
            for (var i = 0; i < order.order_items.length; i++) {
                var item = order.order_items[i];
                addEditOrderItem(item.product_id, item.quantity, item.price_per_unit, item.id);
            }
        }
        
        // Clear and populate table items
        var tableContainer = document.getElementById('edit-order-table-items-container');
        tableContainer.innerHTML = '';
        if (order.order_table_items && order.order_table_items.length > 0) {
            for (var j = 0; j < order.order_table_items.length; j++) {
                var tItem = order.order_table_items[j];
                addEditOrderTableItem(tItem.table_item_id, tItem.quantity, tItem.price_per_unit, tItem.id);
            }
        }
        
        calculateEditOrderTotal();
        new bootstrap.Modal(document.getElementById('editOrderModal')).show();
    });
}

function addEditOrderItem(productId, quantity, price, existingId) {
    productId = productId || null;
    quantity = quantity || '';
    price = price || '';
    existingId = existingId || '';
    
    var container = document.getElementById('edit-order-items-container');
    if (!container) return;
    var itemId = editOrderItemsCount++;
    var options = '<option value="">בחר מוצר...</option>';
    for (var i = 0; i < cachedData.products.length; i++) {
        var p = cachedData.products[i];
        if (p.is_active) {
            var selected = (productId && p.id === productId) ? ' selected' : '';
            options += '<option value="' + p.id + '" data-price="' + p.price_per_portion + '"' + selected + '>' + p.name + ' - ₪' + p.price_per_portion + '</option>';
        }
    }
    var html = '<div class="row g-2 mb-2 edit-order-item" data-item-id="' + itemId + '" data-existing-id="' + existingId + '">' +
        '<div class="col-md-5"><select class="form-select form-select-sm" name="edit_product_' + itemId + '" onchange="updateEditOrderItemPrice(' + itemId + ')">' + options + '</select></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="edit_quantity_' + itemId + '" placeholder="כמות" min="1" value="' + quantity + '" onchange="updateEditOrderItemPrice(' + itemId + ')"></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="edit_price_' + itemId + '" placeholder="מחיר" step="0.01" value="' + price + '" onchange="calculateEditOrderTotal()"></div>' +
        '<div class="col-md-2"><span class="form-control-plaintext edit-item-total" id="edit-item-total-' + itemId + '">₪0</span></div>' +
        '<div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeEditOrderItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>';
    container.insertAdjacentHTML('beforeend', html);
    updateEditOrderItemPrice(itemId);
}

function removeEditOrderItem(itemId) {
    var el = document.querySelector('.edit-order-item[data-item-id="' + itemId + '"]');
    if (el) el.remove();
    calculateEditOrderTotal();
}

function updateEditOrderItemPrice(itemId) {
    var select = document.querySelector('select[name="edit_product_' + itemId + '"]');
    var qtyInput = document.querySelector('input[name="edit_quantity_' + itemId + '"]');
    var priceInput = document.querySelector('input[name="edit_price_' + itemId + '"]');
    var totalSpan = document.getElementById('edit-item-total-' + itemId);
    
    var opt = select.options[select.selectedIndex];
    var price = priceInput.value ? parseFloat(priceInput.value) : (opt && opt.dataset.price ? parseFloat(opt.dataset.price) : 0);
    var qty = parseInt(qtyInput.value) || 0;
    
    if (!priceInput.value && opt && opt.dataset.price) priceInput.value = opt.dataset.price;
    totalSpan.textContent = '₪' + (price * qty).toFixed(2);
    calculateEditOrderTotal();
}

function addEditOrderTableItem(tableItemId, quantity, price, existingId) {
    tableItemId = tableItemId || null;
    quantity = quantity || '';
    price = price || '';
    existingId = existingId || '';
    
    var container = document.getElementById('edit-order-table-items-container');
    if (!container) return;
    var itemId = editOrderTableItemsCount++;
    var options = '<option value="">בחר פריט...</option>';
    for (var i = 0; i < cachedData.tableItems.length; i++) {
        var t = cachedData.tableItems[i];
        var selected = (tableItemId && t.id === tableItemId) ? ' selected' : '';
        options += '<option value="' + t.id + '" data-price="' + t.price_per_unit + '"' + selected + '>' + t.name + ' - ₪' + t.price_per_unit + '</option>';
    }
    var html = '<div class="row g-2 mb-2 edit-order-table-item" data-item-id="' + itemId + '" data-existing-id="' + existingId + '">' +
        '<div class="col-md-5"><select class="form-select form-select-sm" name="edit_table_item_' + itemId + '" onchange="updateEditOrderTableItemPrice(' + itemId + ')">' + options + '</select></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="edit_table_quantity_' + itemId + '" placeholder="כמות" min="1" value="' + quantity + '" onchange="updateEditOrderTableItemPrice(' + itemId + ')"></div>' +
        '<div class="col-md-2"><input type="number" class="form-control form-control-sm" name="edit_table_price_' + itemId + '" placeholder="מחיר" step="0.01" value="' + price + '" onchange="calculateEditOrderTotal()"></div>' +
        '<div class="col-md-2"><span class="form-control-plaintext edit-table-item-total" id="edit-table-item-total-' + itemId + '">₪0</span></div>' +
        '<div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeEditOrderTableItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>';
    container.insertAdjacentHTML('beforeend', html);
    updateEditOrderTableItemPrice(itemId);
}

function removeEditOrderTableItem(itemId) {
    var el = document.querySelector('.edit-order-table-item[data-item-id="' + itemId + '"]');
    if (el) el.remove();
    calculateEditOrderTotal();
}

function updateEditOrderTableItemPrice(itemId) {
    var select = document.querySelector('select[name="edit_table_item_' + itemId + '"]');
    var qtyInput = document.querySelector('input[name="edit_table_quantity_' + itemId + '"]');
    var priceInput = document.querySelector('input[name="edit_table_price_' + itemId + '"]');
    var totalSpan = document.getElementById('edit-table-item-total-' + itemId);
    
    var opt = select.options[select.selectedIndex];
    var price = priceInput.value ? parseFloat(priceInput.value) : (opt && opt.dataset.price ? parseFloat(opt.dataset.price) : 0);
    var qty = parseInt(qtyInput.value) || 0;
    
    if (!priceInput.value && opt && opt.dataset.price) priceInput.value = opt.dataset.price;
    totalSpan.textContent = '₪' + (price * qty).toFixed(2);
    calculateEditOrderTotal();
}

function calculateEditOrderTotal() {
    var productsTotal = 0;
    var tableTotal = 0;
    
    var itemTotals = document.querySelectorAll('.edit-order-item .edit-item-total');
    for (var i = 0; i < itemTotals.length; i++) {
        productsTotal += parseFloat(itemTotals[i].textContent.replace('₪', '')) || 0;
    }
    
    var tableTotals = document.querySelectorAll('.edit-order-table-item .edit-table-item-total');
    for (var j = 0; j < tableTotals.length; j++) {
        tableTotal += parseFloat(tableTotals[j].textContent.replace('₪', '')) || 0;
    }
    
    var el1 = document.getElementById('edit-order-products-total'); if (el1) el1.textContent = '₪' + productsTotal.toFixed(2);
    var el2 = document.getElementById('edit-order-table-total'); if (el2) el2.textContent = '₪' + tableTotal.toFixed(2);
    var el3 = document.getElementById('edit-order-grand-total'); if (el3) el3.textContent = '₪' + (productsTotal + tableTotal).toFixed(2);
}

function updateOrder() {
    var id = document.getElementById('edit-order-id').value;
    var newTotal = parseFloat(document.getElementById('edit-order-grand-total').textContent.replace('₪', '')) || 0;
    
    var data = {
        customer_id: document.getElementById('edit-order-customer').value,
        event_type: document.getElementById('edit-order-event-type').value,
        event_date: document.getElementById('edit-order-event-date').value,
        delivery_time: document.getElementById('edit-order-delivery-time').value,
        guests_count: parseInt(document.getElementById('edit-order-guests').value) || null,
        delivery_address: document.getElementById('edit-order-address').value,
        notes: document.getElementById('edit-order-notes').value,
        status: document.getElementById('edit-order-status').value,
        total_amount: newTotal
    };
    
    // First update the order
    db.from('orders').update(data).eq('id', id).then(function(res) {
        if (res.error) throw res.error;
        
        // Delete existing items and insert new ones
        return db.from('order_items').delete().eq('order_id', id);
    }).then(function() {
        return db.from('order_table_items').delete().eq('order_id', id);
    }).then(function() {
        // Collect new order items
        var orderItems = [];
        var items = document.querySelectorAll('.edit-order-item');
        for (var i = 0; i < items.length; i++) {
            var itemId = items[i].dataset.itemId;
            var productId = document.querySelector('select[name="edit_product_' + itemId + '"]').value;
            var qty = parseInt(document.querySelector('input[name="edit_quantity_' + itemId + '"]').value) || 0;
            var price = parseFloat(document.querySelector('input[name="edit_price_' + itemId + '"]').value) || 0;
            if (productId && qty > 0) {
                orderItems.push({ order_id: id, product_id: productId, quantity: qty, price_per_unit: price, total_price: price * qty });
            }
        }
        if (orderItems.length > 0) {
            return db.from('order_items').insert(orderItems);
        }
        return Promise.resolve();
    }).then(function() {
        // Collect new table items
        var tableItems = [];
        var tItems = document.querySelectorAll('.edit-order-table-item');
        for (var j = 0; j < tItems.length; j++) {
            var tItemId = tItems[j].dataset.itemId;
            var tableItemId = document.querySelector('select[name="edit_table_item_' + tItemId + '"]').value;
            var tQty = parseInt(document.querySelector('input[name="edit_table_quantity_' + tItemId + '"]').value) || 0;
            var tPrice = parseFloat(document.querySelector('input[name="edit_table_price_' + tItemId + '"]').value) || 0;
            if (tableItemId && tQty > 0) {
                tableItems.push({ order_id: id, table_item_id: tableItemId, quantity: tQty, price_per_unit: tPrice, total_price: tPrice * tQty });
            }
        }
        if (tableItems.length > 0) {
            return db.from('order_table_items').insert(tableItems);
        }
        return Promise.resolve();
    }).then(function() {
        showToast('הזמנה עודכנה בהצלחה');
        bootstrap.Modal.getInstance(document.getElementById('editOrderModal')).hide();
        loadOrders();
        loadHomeStats();
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה בעדכון', 'error');
    });
}

function getEventTypeLabel(type) {
    var labels = { wedding: 'חתונה', bar_mitzvah: 'בר/בת מצווה', brit: 'ברית', sheva_brachot: 'שבע ברכות', corporate: 'אירוע עסקי', private: 'אירוע פרטי', other: 'אחר' };
    return labels[type] || type || '-';
}

function showQuickCustomerModal() {
    document.getElementById('customer-id').value = '';
    document.getElementById('customer-form').reset();
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

// Reports
function generateReport(reportType) {
    var reportDate = document.getElementById('report-date').value;
    var orderId = document.getElementById('report-order-select').value;
    
    if (!reportDate && !orderId) { showToast('בחר תאריך או הזמנה', 'error'); return; }
    
    showLoading(true);
    
    var query;
    if (orderId) {
        query = db.from('orders').select('*, customers(name), order_items(*, products(name, categories(type))), order_table_items(*, table_items(name))').eq('id', orderId);
    } else {
        query = db.from('orders').select('*, customers(name), order_items(*, products(name, categories(type))), order_table_items(*, table_items(name))').eq('event_date', reportDate);
    }
    
    query.then(function(res) {
        var orders = res.data || [];
        if (orders.length === 0) {
            showToast('לא נמצאו הזמנות', 'error');
            showLoading(false);
            return;
        }
        
        var reportContent = '';
        var reportTitle = '';
        var printHeader = '';
        
        switch (reportType) {
            case 'cold-production': 
                reportTitle = 'דוח ייצור פס קר'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>דוח ייצור פס קר</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateProductionReport(orders, 'cold'); 
                break;
            case 'cold-packing': 
                reportTitle = 'דוח אריזה פס קר'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>דוח אריזה פס קר</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateProductionReport(orders, 'cold'); 
                break;
            case 'hot-production': 
                reportTitle = 'דוח ייצור פס חם'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>דוח ייצור פס חם</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateProductionReport(orders, 'hot'); 
                break;
            case 'hot-packing': 
                reportTitle = 'דוח אריזה פס חם'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>דוח אריזה פס חם</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateProductionReport(orders, 'hot'); 
                break;
            case 'storage': 
                reportTitle = 'סיכום מלאי/אחסון'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>סיכום מלאי/אחסון</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateStorageReport(orders); 
                break;
            case 'quantities': 
                reportTitle = 'דוח כמויות כללי'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>דוח כמויות כללי</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateQuantitiesReport(orders); 
                break;
            case 'bakery': 
                reportTitle = 'הזמנה לקונדיטוריה'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>הזמנה לקונדיטוריה</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateSupplierOrderReport(orders, 'bakery'); 
                break;
            case 'table-items': 
                reportTitle = 'הזמנה לפריטי שולחן'; 
                printHeader = '<div class="print-only text-center mb-4"><h2>הזמנה לפריטי שולחן</h2><p>תאריך: ' + (reportDate || orders[0].event_date) + '</p></div>';
                reportContent = generateTableItemsReport(orders); 
                break;
        }
        
        document.getElementById('report-title').textContent = reportTitle;
        document.getElementById('report-content').innerHTML = printHeader + reportContent;
        showPage('report-display');
        showLoading(false);
    }).catch(function(err) {
        console.error(err);
        showToast('שגיאה', 'error');
        showLoading(false);
    });
}

function generateProductionReport(orders, type) {
    var html = '';
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        var items = (order.order_items || []).filter(function(item) {
            return item.products && item.products.categories && item.products.categories.type === type;
        });
        if (items.length === 0) continue;
        
        html += '<div class="report-section mb-4">';
        html += '<div class="bg-' + (type === 'cold' ? 'info' : 'danger') + ' text-white p-3 rounded-top">';
        html += '<h5 class="mb-1">הזמנה #' + order.order_number + ' - ' + (order.customers ? order.customers.name : 'לקוח') + '</h5>';
        html += '<p class="mb-0"><strong>תאריך:</strong> ' + order.event_date + ' | <strong>שעת משלוח:</strong> ' + order.delivery_time + '</p></div>';
        html += '<div class="bg-white p-3 border border-top-0 rounded-bottom">';
        
        for (var j = 0; j < items.length; j++) {
            html += '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox form-check-input" onchange="toggleChecklistItem(this)">';
            html += '<span><strong>' + items[j].products.name + '</strong> - ' + items[j].quantity + ' מנות</span></div>';
        }
        html += '</div></div>';
    }
    return html || '<p class="text-center text-muted py-4">אין פריטים להצגה</p>';
}

function generateStorageReport(orders) {
    var containerNeeds = {};
    for (var i = 0; i < orders.length; i++) {
        var items = orders[i].order_items || [];
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            var rule = cachedData.packingRules.find(function(r) {
                return r.product_id === item.product_id && item.quantity >= r.min_portions && item.quantity <= r.max_portions;
            });
            if (rule) {
                var cont = cachedData.containers.find(function(c) { return c.id === rule.container_id; });
                if (cont) containerNeeds[cont.name] = (containerNeeds[cont.name] || 0) + 1;
            }
        }
    }
    
    var html = '<h5 class="mb-3">סיכום מיכלים נדרשים</h5><table class="table"><thead><tr><th>מיכל</th><th>כמות</th></tr></thead><tbody>';
    var keys = Object.keys(containerNeeds);
    if (keys.length === 0) {
        html += '<tr><td colspan="2" class="text-center">לא נמצאו כללי אריזה</td></tr>';
    } else {
        for (var k = 0; k < keys.length; k++) {
            html += '<tr><td>' + keys[k] + '</td><td>' + containerNeeds[keys[k]] + '</td></tr>';
        }
    }
    return html + '</tbody></table>';
}

function generateQuantitiesReport(orders) {
    var quantities = {};
    for (var i = 0; i < orders.length; i++) {
        var items = orders[i].order_items || [];
        for (var j = 0; j < items.length; j++) {
            var name = items[j].products ? items[j].products.name : 'מוצר';
            quantities[name] = (quantities[name] || 0) + items[j].quantity;
        }
    }
    
    var html = '<h5 class="mb-3">סיכום כמויות כללי</h5><table class="table"><thead><tr><th>מוצר</th><th>כמות</th></tr></thead><tbody>';
    var keys = Object.keys(quantities).sort(function(a, b) { return quantities[b] - quantities[a]; });
    for (var k = 0; k < keys.length; k++) {
        html += '<tr><td>' + keys[k] + '</td><td>' + quantities[keys[k]] + ' מנות</td></tr>';
    }
    return html + '</tbody></table>';
}

function generateSupplierOrderReport(orders, supplierType) {
    var items = {};
    for (var i = 0; i < orders.length; i++) {
        var orderItems = orders[i].order_items || [];
        for (var j = 0; j < orderItems.length; j++) {
            var item = orderItems[j];
            if (item.products && item.products.categories && item.products.categories.type === 'bakery') {
                var name = item.products.name;
                items[name] = (items[name] || 0) + item.quantity;
            }
        }
    }
    
    var supplier = cachedData.suppliers.find(function(s) { return s.type === supplierType; });
    var html = '<h5 class="mb-3">הזמנה לקונדיטוריה</h5>';
    if (supplier) html += '<div class="mb-3"><strong>ספק:</strong> ' + supplier.name + '</div>';
    html += '<table class="table"><thead><tr><th>פריט</th><th>כמות</th></tr></thead><tbody>';
    var keys = Object.keys(items);
    for (var k = 0; k < keys.length; k++) {
        html += '<tr><td>' + keys[k] + '</td><td>' + items[keys[k]] + '</td></tr>';
    }
    html += '</tbody></table>';
    
    if (supplier && supplier.whatsapp) {
        var msg = 'הזמנה:\n';
        for (var m = 0; m < keys.length; m++) msg += keys[m] + ': ' + items[keys[m]] + '\n';
        html += '<div class="text-center mt-4"><a href="https://wa.me/' + supplier.whatsapp + '?text=' + encodeURIComponent(msg) + '" target="_blank" class="btn btn-success btn-lg"><i class="bi bi-whatsapp me-2"></i> שלח בוואטסאפ</a></div>';
    }
    return html;
}

function generateTableItemsReport(orders) {
    var items = {};
    for (var i = 0; i < orders.length; i++) {
        var tableItems = orders[i].order_table_items || [];
        for (var j = 0; j < tableItems.length; j++) {
            var name = tableItems[j].table_items ? tableItems[j].table_items.name : 'פריט';
            items[name] = (items[name] || 0) + tableItems[j].quantity;
        }
    }
    
    var supplier = cachedData.suppliers.find(function(s) { return s.type === 'table'; });
    var html = '<h5 class="mb-3">הזמנה לפריטי שולחן</h5>';
    if (supplier) html += '<div class="mb-3"><strong>ספק:</strong> ' + supplier.name + '</div>';
    html += '<table class="table"><thead><tr><th>פריט</th><th>כמות</th></tr></thead><tbody>';
    var keys = Object.keys(items);
    for (var k = 0; k < keys.length; k++) {
        html += '<tr><td>' + keys[k] + '</td><td>' + items[keys[k]] + '</td></tr>';
    }
    html += '</tbody></table>';
    
    if (supplier && supplier.whatsapp) {
        var msg = 'הזמנה:\n';
        for (var m = 0; m < keys.length; m++) msg += keys[m] + ': ' + items[keys[m]] + '\n';
        html += '<div class="text-center mt-4"><a href="https://wa.me/' + supplier.whatsapp + '?text=' + encodeURIComponent(msg) + '" target="_blank" class="btn btn-success btn-lg"><i class="bi bi-whatsapp me-2"></i> שלח בוואטסאפ</a></div>';
    }
    return html;
}

function toggleChecklistItem(checkbox) {
    var item = checkbox.closest('.checklist-item');
    if (item) item.classList.toggle('completed', checkbox.checked);
}

// Helper functions
function getTypeLabel(type) {
    var labels = { hot: 'פס חם', cold: 'פס קר', bakery: 'קונדיטוריה', table: 'פריטי שולחן' };
    return labels[type] || type;
}

function getTypeBadgeColor(type) {
    var colors = { hot: 'danger', cold: 'info', bakery: 'warning', table: 'secondary' };
    return colors[type] || 'secondary';
}

function getSupplierTypeLabel(type) {
    var labels = { bakery: 'קונדיטוריה', table: 'פריטי שולחן', ingredients: 'חומרי גלם', other: 'אחר' };
    return labels[type] || type;
}

function getSupplierTypeBadgeColor(type) {
    var colors = { bakery: 'warning', table: 'secondary', ingredients: 'success', other: 'dark' };
    return colors[type] || 'secondary';
}

function getStatusLabel(status) {
    var labels = { new: 'חדש', confirmed: 'מאושר', in_production: 'בייצור', ready: 'מוכן', delivered: 'נמסר', cancelled: 'בוטל' };
    return labels[status] || status;
}

function getStatusBadgeColor(status) {
    var colors = { new: 'primary', confirmed: 'info', in_production: 'warning', ready: 'success', delivered: 'secondary', cancelled: 'danger' };
    return colors[status] || 'secondary';
}

function getUnitLabel(unit) {
    var labels = { gram: 'גרם', kg: 'ק"ג', liter: 'ליטר', ml: 'מ"ל', unit: 'יחידה' };
    return labels[unit] || unit;
}
