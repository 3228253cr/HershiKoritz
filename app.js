// Hershi Koritz Catering - Application JavaScript
const SUPABASE_URL = 'https://brmnbunyebbmdwvpaluz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybW5idW55ZWJibWR3dnBhbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMTcxNDMsImV4cCI6MjA0OTU5MzE0M30.h0p3wMNMsxKCXLK7-LGYCgKnu8_lGzf4Xvxe_CPGFQE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let cachedData = { categories: [], products: [], containers: [], customers: [], suppliers: [], tableItems: [], ingredients: [], packingRules: [] };

document.addEventListener('DOMContentLoaded', async function() {
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('report-date')) document.getElementById('report-date').value = today;
    if (document.getElementById('filter-from-date')) document.getElementById('filter-from-date').value = today;
    if (document.getElementById('filter-to-date')) document.getElementById('filter-to-date').value = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
    if (document.getElementById('payment-date')) document.getElementById('payment-date').value = today;
    await loadAllData();
    setupFormHandlers();
    loadHomeStats();
});

async function loadAllData() {
    showLoading(true);
    try { 
        await Promise.all([loadCategories(), loadProducts(), loadContainers(), loadCustomers(), loadSuppliers(), loadTableItems(), loadIngredients(), loadPackingRules()]); 
    } catch (error) { 
        console.error('Error loading data:', error); 
        showToast('שגיאה בטעינת נתונים', 'error'); 
    }
    showLoading(false);
}

async function loadCategories() { 
    const { data, error } = await supabase.from('categories').select('*').order('name'); 
    if (error) throw error; 
    cachedData.categories = data || []; 
    populateCategoryDropdowns(); 
    renderCategoriesTable(); 
}

async function loadProducts() { 
    const { data, error } = await supabase.from('products').select('*, categories(name, type)').order('name'); 
    if (error) throw error; 
    cachedData.products = data || []; 
    populateProductDropdowns(); 
    renderProductsTable(); 
}

async function loadContainers() { 
    const { data, error } = await supabase.from('containers').select('*').order('name'); 
    if (error) throw error; 
    cachedData.containers = data || []; 
    populateContainerDropdowns(); 
    renderContainersTable(); 
}

async function loadCustomers() { 
    const { data, error } = await supabase.from('customers').select('*').order('name'); 
    if (error) throw error; 
    cachedData.customers = data || []; 
    populateCustomerDropdowns(); 
    renderCustomersTable(); 
}

async function loadSuppliers() { 
    const { data, error } = await supabase.from('suppliers').select('*').order('name'); 
    if (error) throw error; 
    cachedData.suppliers = data || []; 
    populateSupplierDropdowns(); 
    renderSuppliersTable(); 
}

async function loadTableItems() { 
    const { data, error } = await supabase.from('table_items').select('*, suppliers(name)').order('name'); 
    if (error) throw error; 
    cachedData.tableItems = data || []; 
    renderTableItemsTable(); 
}

async function loadIngredients() { 
    const { data, error } = await supabase.from('ingredients').select('*').order('name'); 
    if (error) throw error; 
    cachedData.ingredients = data || []; 
    populateIngredientDropdowns(); 
    renderIngredientsTable(); 
}

async function loadPackingRules() { 
    const { data, error } = await supabase.from('packing_rules').select('*, products(name), containers(name)').order('product_id'); 
    if (error) throw error; 
    cachedData.packingRules = data || []; 
    renderPackingRulesTable(); 
}

async function loadOrders() {
    const fromDate = document.getElementById('filter-from-date').value;
    const toDate = document.getElementById('filter-to-date').value;
    const status = document.getElementById('filter-status').value;
    let query = supabase.from('orders').select('*, customers(name)').order('event_date', { ascending: true });
    if (fromDate) query = query.gte('event_date', fromDate);
    if (toDate) query = query.lte('event_date', toDate);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) { showToast('שגיאה בטעינת הזמנות', 'error'); return; }
    renderOrdersTable(data || []);
}

async function loadHomeStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
    const { data: todayOrders } = await supabase.from('orders').select('id').eq('event_date', today);
    if (document.getElementById('stat-orders-today')) document.getElementById('stat-orders-today').textContent = todayOrders?.length || 0;
    const { data: weekOrders } = await supabase.from('orders').select('id').gte('event_date', weekAgo);
    if (document.getElementById('stat-orders-week')) document.getElementById('stat-orders-week').textContent = weekOrders?.length || 0;
    const { data: orders } = await supabase.from('orders').select('total_amount, paid_amount');
    const pendingTotal = (orders || []).reduce(function(sum, o) { return sum + ((o.total_amount || 0) - (o.paid_amount || 0)); }, 0);
    if (document.getElementById('stat-pending-payments')) document.getElementById('stat-pending-payments').textContent = '₪' + pendingTotal.toLocaleString();
    if (document.getElementById('stat-customers')) document.getElementById('stat-customers').textContent = cachedData.customers.length;
    const { data: todayOrdersData } = await supabase.from('orders').select('*, customers(name)').eq('event_date', today).order('delivery_time');
    renderTodayOrdersTable(todayOrdersData || []);
    loadOrdersForReportSelect();
}

async function loadOrdersForReportSelect() {
    const { data } = await supabase.from('orders').select('*, customers(name)').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date');
    const select = document.getElementById('report-order-select');
    if (!select) return;
    select.innerHTML = '<option value="">בחר הזמנה...</option>';
    (data || []).forEach(function(order) { 
        var option = document.createElement('option'); 
        option.value = order.id; 
        option.textContent = '#' + order.order_number + ' - ' + (order.customers?.name || 'לקוח') + ' - ' + order.event_date; 
        select.appendChild(option); 
    });
}

function populateCategoryDropdowns() { 
    var select = document.getElementById('product-category'); 
    if (select) { 
        var currentValue = select.value; 
        select.innerHTML = '<option value="">בחר קטגוריה...</option>'; 
        cachedData.categories.forEach(function(cat) { 
            var option = document.createElement('option'); 
            option.value = cat.id; 
            option.textContent = cat.name + ' (' + getTypeLabel(cat.type) + ')'; 
            select.appendChild(option); 
        }); 
        select.value = currentValue; 
    } 
}

function populateProductDropdowns() { 
    ['packing-rule-product', 'recipe-product'].forEach(function(id) { 
        var select = document.getElementById(id); 
        if (select) { 
            select.innerHTML = '<option value="">בחר מוצר...</option>'; 
            cachedData.products.forEach(function(p) { 
                var option = document.createElement('option'); 
                option.value = p.id; 
                option.textContent = p.name; 
                select.appendChild(option); 
            }); 
        } 
    }); 
}

function populateContainerDropdowns() { 
    var select = document.getElementById('packing-rule-container'); 
    if (select) { 
        select.innerHTML = '<option value="">בחר מיכל...</option>'; 
        cachedData.containers.forEach(function(c) { 
            var option = document.createElement('option'); 
            option.value = c.id; 
            option.textContent = c.name; 
            select.appendChild(option); 
        }); 
    } 
}

function populateCustomerDropdowns() { 
    var select = document.getElementById('order-customer'); 
    if (select) { 
        select.innerHTML = '<option value="">בחר לקוח...</option>'; 
        cachedData.customers.forEach(function(c) { 
            var option = document.createElement('option'); 
            option.value = c.id; 
            option.textContent = c.name; 
            select.appendChild(option); 
        }); 
    } 
}

function populateSupplierDropdowns() { 
    var select = document.getElementById('table-item-supplier'); 
    if (select) { 
        select.innerHTML = '<option value="">בחר ספק...</option>'; 
        cachedData.suppliers.forEach(function(s) { 
            var option = document.createElement('option'); 
            option.value = s.id; 
            option.textContent = s.name; 
            select.appendChild(option); 
        }); 
    } 
}

function populateIngredientDropdowns() { 
    var select = document.getElementById('recipe-ingredient'); 
    if (select) { 
        select.innerHTML = '<option value="">בחר חומר גלם...</option>'; 
        cachedData.ingredients.forEach(function(i) { 
            var option = document.createElement('option'); 
            option.value = i.id; 
            option.textContent = i.name + ' (' + i.unit + ')'; 
            select.appendChild(option); 
        }); 
    } 
}

function renderCategoriesTable() { 
    var tbody = document.getElementById('categories-table'); 
    if (!tbody) return; 
    if (cachedData.categories.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">אין קטגוריות</td></tr>'; 
        return; 
    } 
    var html = '';
    cachedData.categories.forEach(function(cat) {
        html += '<tr><td>' + cat.name + '</td><td><span class="badge bg-' + getTypeBadgeColor(cat.type) + '">' + getTypeLabel(cat.type) + '</span></td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editCategory(\'' + cat.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCategory(\'' + cat.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
    tbody.innerHTML = html;
}

function renderProductsTable(categoryFilter) { 
    categoryFilter = categoryFilter || 'all'; 
    var tbody = document.getElementById('products-table'); 
    if (!tbody) return; 
    var products = cachedData.products; 
    if (categoryFilter !== 'all') {
        products = products.filter(function(p) { return p.categories && p.categories.type === categoryFilter; });
    }
    if (products.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">אין מוצרים</td></tr>'; 
        return; 
    } 
    var html = '';
    products.forEach(function(p) {
        html += '<tr><td>' + p.name + '</td><td>' + (p.categories?.name || '-') + '</td><td>₪' + (p.price_per_portion || 0).toFixed(2) + '</td><td>' + (p.description || '-') + '</td><td><span class="badge bg-' + (p.is_active ? 'success' : 'secondary') + '">' + (p.is_active ? 'פעיל' : 'לא פעיל') + '</span></td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editProduct(\'' + p.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteProduct(\'' + p.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.containers.forEach(function(c) {
        html += '<tr><td>' + c.name + '</td><td>' + (c.capacity_liters || '-') + '</td><td>' + (c.capacity_portions || '-') + '</td><td>' + (c.description || '-') + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editContainer(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteContainer(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.customers.forEach(function(c) {
        html += '<tr><td>' + c.name + '</td><td>' + (c.phone || '-') + '</td><td>' + (c.email || '-') + '</td><td>' + (c.address || '-') + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editCustomer(\'' + c.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCustomer(\'' + c.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.suppliers.forEach(function(s) {
        html += '<tr><td>' + s.name + '</td><td><span class="badge bg-' + getSupplierTypeBadgeColor(s.type) + '">' + getSupplierTypeLabel(s.type) + '</span></td><td>' + (s.phone || '-') + '</td><td>' + (s.whatsapp ? '<a href="https://wa.me/' + s.whatsapp + '" target="_blank" class="btn btn-sm btn-success"><i class="bi bi-whatsapp"></i></a>' : '-') + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editSupplier(\'' + s.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteSupplier(\'' + s.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.tableItems.forEach(function(item) {
        html += '<tr><td>' + item.name + '</td><td>' + (item.category || '-') + '</td><td>' + (item.suppliers?.name || '-') + '</td><td>₪' + (item.price_per_unit || 0).toFixed(2) + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editTableItem(\'' + item.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteTableItem(\'' + item.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.ingredients.forEach(function(i) {
        html += '<tr class="' + (i.current_stock < i.min_stock ? 'table-warning' : '') + '"><td>' + i.name + '</td><td>' + getUnitLabel(i.unit) + '</td><td>₪' + (i.cost_per_unit || 0).toFixed(2) + '</td><td>' + (i.current_stock || 0) + '</td><td>' + (i.min_stock || 0) + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editIngredient(\'' + i.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteIngredient(\'' + i.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    cachedData.packingRules.forEach(function(r) {
        html += '<tr><td>' + (r.products?.name || '-') + '</td><td>' + r.min_portions + '</td><td>' + r.max_portions + '</td><td>' + (r.containers?.name || '-') + '</td><td><button class="btn btn-sm btn-outline-primary btn-action" onclick="editPackingRule(\'' + r.id + '\')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger btn-action" onclick="deletePackingRule(\'' + r.id + '\')"><i class="bi bi-trash"></i></button></td></tr>';
    });
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
    orders.forEach(function(o) { 
        var balance = (o.total_amount || 0) - (o.paid_amount || 0); 
        html += '<tr><td>' + o.order_number + '</td><td>' + (o.customers?.name || '-') + '</td><td>' + o.event_date + '</td><td>' + o.delivery_time + '</td><td>₪' + (o.total_amount || 0).toLocaleString() + '</td><td>₪' + (o.paid_amount || 0).toLocaleString() + '</td><td class="' + (balance > 0 ? 'text-danger fw-bold' : 'text-success') + '">₪' + balance.toLocaleString() + '</td><td><span class="badge bg-' + getStatusBadgeColor(o.status) + '">' + getStatusLabel(o.status) + '</span></td><td><button class="btn btn-sm btn-outline-info btn-action" onclick="viewOrder(\'' + o.id + '\')"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-outline-success btn-action" onclick="openPaymentModal(\'' + o.id + '\')"><i class="bi bi-cash"></i></button> <button class="btn btn-sm btn-outline-primary btn-action" onclick="editOrder(\'' + o.id + '\')"><i class="bi bi-pencil"></i></button></td></tr>'; 
    });
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
    orders.forEach(function(o) {
        html += '<tr><td>' + o.order_number + '</td><td>' + (o.customers?.name || '-') + '</td><td>' + o.delivery_time + '</td><td><span class="badge bg-' + getStatusBadgeColor(o.status) + '">' + getStatusLabel(o.status) + '</span></td><td><button class="btn btn-sm btn-outline-primary" onclick="viewOrder(\'' + o.id + '\')"><i class="bi bi-eye"></i> צפה</button></td></tr>';
    });
    tbody.innerHTML = html;
}

function setupFormHandlers() {
    var customerForm = document.getElementById('customer-form');
    if (customerForm) customerForm.addEventListener('submit', function(e) { e.preventDefault(); saveCustomer(); });
    
    var productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', function(e) { e.preventDefault(); saveProduct(); });
    
    var categoryForm = document.getElementById('category-form');
    if (categoryForm) categoryForm.addEventListener('submit', function(e) { e.preventDefault(); saveCategory(); });
    
    var containerForm = document.getElementById('container-form');
    if (containerForm) containerForm.addEventListener('submit', function(e) { e.preventDefault(); saveContainer(); });
    
    var supplierForm = document.getElementById('supplier-form');
    if (supplierForm) supplierForm.addEventListener('submit', function(e) { e.preventDefault(); saveSupplier(); });
    
    var paymentForm = document.getElementById('payment-form');
    if (paymentForm) paymentForm.addEventListener('submit', function(e) { e.preventDefault(); savePayment(); });
    
    var tableItemForm = document.getElementById('table-item-form');
    if (tableItemForm) tableItemForm.addEventListener('submit', function(e) { e.preventDefault(); saveTableItem(); });
    
    var packingRuleForm = document.getElementById('packing-rule-form');
    if (packingRuleForm) packingRuleForm.addEventListener('submit', function(e) { e.preventDefault(); savePackingRule(); });
    
    var ingredientForm = document.getElementById('ingredient-form');
    if (ingredientForm) ingredientForm.addEventListener('submit', function(e) { e.preventDefault(); saveIngredient(); });
    
    var recipeForm = document.getElementById('recipe-form');
    if (recipeForm) recipeForm.addEventListener('submit', function(e) { e.preventDefault(); saveRecipe(); });
    
    var newOrderForm = document.getElementById('new-order-form');
    if (newOrderForm) newOrderForm.addEventListener('submit', function(e) { e.preventDefault(); saveOrder(); });
    
    document.querySelectorAll('#productCategoryTabs .nav-link').forEach(function(tab) { 
        tab.addEventListener('click', function(e) { 
            e.preventDefault(); 
            document.querySelectorAll('#productCategoryTabs .nav-link').forEach(function(t) { t.classList.remove('active'); }); 
            tab.classList.add('active'); 
            renderProductsTable(tab.dataset.category); 
        }); 
    });
}

async function saveCustomer() { 
    var id = document.getElementById('customer-id').value; 
    var data = { 
        name: document.getElementById('customer-name').value, 
        phone: document.getElementById('customer-phone').value, 
        email: document.getElementById('customer-email').value, 
        address: document.getElementById('customer-address').value, 
        notes: document.getElementById('customer-notes').value 
    }; 
    try { 
        if (id) { 
            await supabase.from('customers').update(data).eq('id', id); 
            showToast('לקוח עודכן בהצלחה'); 
        } else { 
            await supabase.from('customers').insert([data]); 
            showToast('לקוח נוצר בהצלחה'); 
        } 
        bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide(); 
        document.getElementById('customer-form').reset(); 
        document.getElementById('customer-id').value = ''; 
        await loadCustomers(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה בשמירת לקוח', 'error'); 
    } 
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

async function deleteCustomer(id) { 
    if (!confirm('האם למחוק את הלקוח?')) return; 
    try { 
        await supabase.from('customers').delete().eq('id', id); 
        showToast('לקוח נמחק'); 
        await loadCustomers(); 
    } catch (error) { 
        showToast('שגיאה במחיקת לקוח', 'error'); 
    } 
}

async function saveProduct() { 
    var id = document.getElementById('product-id').value; 
    var data = { 
        name: document.getElementById('product-name').value, 
        category_id: document.getElementById('product-category').value || null, 
        price_per_portion: parseFloat(document.getElementById('product-price').value) || 0, 
        description: document.getElementById('product-description').value, 
        is_active: document.getElementById('product-active').checked 
    }; 
    try { 
        if (id) { 
            await supabase.from('products').update(data).eq('id', id); 
            showToast('מוצר עודכן בהצלחה'); 
        } else { 
            await supabase.from('products').insert([data]); 
            showToast('מוצר נוצר בהצלחה'); 
        } 
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide(); 
        document.getElementById('product-form').reset(); 
        document.getElementById('product-id').value = ''; 
        await loadProducts(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה בשמירת מוצר', 'error'); 
    } 
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

async function deleteProduct(id) { 
    if (!confirm('האם למחוק את המוצר?')) return; 
    try { 
        await supabase.from('products').delete().eq('id', id); 
        showToast('מוצר נמחק'); 
        await loadProducts(); 
    } catch (error) { 
        showToast('שגיאה במחיקת מוצר', 'error'); 
    } 
}

async function saveCategory() { 
    var id = document.getElementById('category-id').value; 
    var data = { 
        name: document.getElementById('category-name').value, 
        type: document.getElementById('category-type').value 
    }; 
    try { 
        if (id) { 
            await supabase.from('categories').update(data).eq('id', id); 
            showToast('קטגוריה עודכנה בהצלחה'); 
        } else { 
            await supabase.from('categories').insert([data]); 
            showToast('קטגוריה נוצרה בהצלחה'); 
        } 
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide(); 
        document.getElementById('category-form').reset(); 
        document.getElementById('category-id').value = ''; 
        await loadCategories(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה בשמירת קטגוריה', 'error'); 
    } 
}

function editCategory(id) { 
    var c = cachedData.categories.find(function(x) { return x.id === id; }); 
    if (!c) return; 
    document.getElementById('category-id').value = c.id; 
    document.getElementById('category-name').value = c.name; 
    document.getElementById('category-type').value = c.type; 
    new bootstrap.Modal(document.getElementById('categoryModal')).show(); 
}

async function deleteCategory(id) { 
    if (!confirm('האם למחוק את הקטגוריה?')) return; 
    try { 
        await supabase.from('categories').delete().eq('id', id); 
        showToast('קטגוריה נמחקה'); 
        await loadCategories(); 
    } catch (error) { 
        showToast('שגיאה במחיקת קטגוריה', 'error'); 
    } 
}

async function saveContainer() { 
    var id = document.getElementById('container-id').value; 
    var data = { 
        name: document.getElementById('container-name').value, 
        capacity_liters: parseFloat(document.getElementById('container-liters').value) || null, 
        capacity_portions: parseInt(document.getElementById('container-portions').value) || null, 
        description: document.getElementById('container-description').value 
    }; 
    try { 
        if (id) { 
            await supabase.from('containers').update(data).eq('id', id); 
            showToast('מיכל עודכן בהצלחה'); 
        } else { 
            await supabase.from('containers').insert([data]); 
            showToast('מיכל נוצר בהצלחה'); 
        } 
        bootstrap.Modal.getInstance(document.getElementById('containerModal')).hide(); 
        document.getElementById('container-form').reset(); 
        document.getElementById('container-id').value = ''; 
        await loadContainers(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה בשמירת מיכל', 'error'); 
    } 
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

async function deleteContainer(id) { 
    if (!confirm('האם למחוק את המיכל?')) return; 
    try { 
        await supabase.from('containers').delete().eq('id', id); 
        showToast('מיכל נמחק'); 
        await loadContainers(); 
    } catch (error) { 
        showToast('שגיאה במחיקת מיכל', 'error'); 
    } 
}

async function saveSupplier() { 
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
    try { 
        if (id) { 
            await supabase.from('suppliers').update(data).eq('id', id); 
            showToast('ספק עודכן בהצלחה'); 
        } else { 
            await supabase.from('suppliers').insert([data]); 
            showToast('ספק נוצר בהצלחה'); 
        } 
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide(); 
        document.getElementById('supplier-form').reset(); 
        document.getElementById('supplier-id').value = ''; 
        await loadSuppliers(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה בשמירת ספק', 'error'); 
    } 
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

async function deleteSupplier(id) { 
    if (!confirm('האם למחוק את הספק?')) return; 
    try { 
        await supabase.from('suppliers').delete().eq('id', id); 
        showToast('ספק נמחק'); 
        await loadSuppliers(); 
    } catch (error) { 
        showToast('שגיאה במחיקת ספק', 'error'); 
    } 
}

async function saveTableItem() { 
    var id = document.getElementById('table-item-id').value; 
    var data = { 
        name: document.getElementById('table-item-name').value, 
        category: document.getElementById('table-item-category').value, 
        supplier_id: document.getElementById('table-item-supplier').value || null, 
        price_per_unit: parseFloat(document.getElementById('table-item-price').value) || 0 
    }; 
    try { 
        if (id) { 
            await supabase.from('table_items').update(data).eq('id', id); 
        } else { 
            await supabase.from('table_items').insert([data]); 
        } 
        showToast('נשמר'); 
        bootstrap.Modal.getInstance(document.getElementById('tableItemModal')).hide(); 
        document.getElementById('table-item-form').reset(); 
        document.getElementById('table-item-id').value = ''; 
        await loadTableItems(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה', 'error'); 
    } 
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

async function deleteTableItem(id) { 
    if (!confirm('למחוק?')) return; 
    try { 
        await supabase.from('table_items').delete().eq('id', id); 
        showToast('נמחק'); 
        await loadTableItems(); 
    } catch (error) { 
        showToast('שגיאה', 'error'); 
    } 
}

async function savePackingRule() { 
    var id = document.getElementById('packing-rule-id').value; 
    var data = { 
        product_id: document.getElementById('packing-rule-product').value, 
        min_portions: parseInt(document.getElementById('packing-rule-min').value), 
        max_portions: parseInt(document.getElementById('packing-rule-max').value), 
        container_id: document.getElementById('packing-rule-container').value 
    }; 
    try { 
        if (id) { 
            await supabase.from('packing_rules').update(data).eq('id', id); 
        } else { 
            await supabase.from('packing_rules').insert([data]); 
        } 
        showToast('נשמר'); 
        bootstrap.Modal.getInstance(document.getElementById('packingRuleModal')).hide(); 
        document.getElementById('packing-rule-form').reset(); 
        document.getElementById('packing-rule-id').value = ''; 
        await loadPackingRules(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה', 'error'); 
    } 
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

async function deletePackingRule(id) { 
    if (!confirm('למחוק?')) return; 
    try { 
        await supabase.from('packing_rules').delete().eq('id', id); 
        showToast('נמחק'); 
        await loadPackingRules(); 
    } catch (error) { 
        showToast('שגיאה', 'error'); 
    } 
}

async function saveIngredient() { 
    var id = document.getElementById('ingredient-id').value; 
    var data = { 
        name: document.getElementById('ingredient-name').value, 
        unit: document.getElementById('ingredient-unit').value, 
        cost_per_unit: parseFloat(document.getElementById('ingredient-cost').value) || 0, 
        current_stock: parseFloat(document.getElementById('ingredient-stock').value) || 0, 
        min_stock: parseFloat(document.getElementById('ingredient-min-stock').value) || 0 
    }; 
    try { 
        if (id) { 
            await supabase.from('ingredients').update(data).eq('id', id); 
        } else { 
            await supabase.from('ingredients').insert([data]); 
        } 
        showToast('נשמר'); 
        bootstrap.Modal.getInstance(document.getElementById('ingredientModal')).hide(); 
        document.getElementById('ingredient-form').reset(); 
        document.getElementById('ingredient-id').value = ''; 
        await loadIngredients(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה', 'error'); 
    } 
}

function editIngredient(id) { 
    var i = cachedData.ingredients.find(function(x) { return x.id === id; }); 
    if (!i) return; 
    document.getElementById('ingredient-id').value = i.id; 
    document.getElementById('ingredient-name').value = i.name; 
    document.getElementById('ingredient-unit').value = i.unit; 
    document.getElementById('ingredient-cost').value = i.cost_per_unit || ''; 
    document.getElementById('ingredient-stock').value = i.current_stock || ''; 
    document.getElementById('ingredient-min-stock').value = i.min_stock || ''; 
    new bootstrap.Modal(document.getElementById('ingredientModal')).show(); 
}

async function deleteIngredient(id) { 
    if (!confirm('למחוק?')) return; 
    try { 
        await supabase.from('ingredients').delete().eq('id', id); 
        showToast('נמחק'); 
        await loadIngredients(); 
    } catch (error) { 
        showToast('שגיאה', 'error'); 
    } 
}

async function saveRecipe() { 
    var id = document.getElementById('recipe-id').value; 
    var data = { 
        product_id: document.getElementById('recipe-product').value, 
        ingredient_id: document.getElementById('recipe-ingredient').value, 
        quantity_per_portion: parseFloat(document.getElementById('recipe-quantity').value), 
        unit: document.getElementById('recipe-unit').value 
    }; 
    try { 
        if (id) { 
            await supabase.from('recipes').update(data).eq('id', id); 
        } else { 
            await supabase.from('recipes').insert([data]); 
        } 
        showToast('נשמר'); 
        bootstrap.Modal.getInstance(document.getElementById('recipeModal')).hide(); 
        document.getElementById('recipe-form').reset(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה', 'error'); 
    } 
}

async function savePayment() { 
    var orderId = document.getElementById('payment-order-id').value; 
    var data = { 
        order_id: orderId, 
        amount: parseFloat(document.getElementById('payment-amount').value), 
        payment_method: document.getElementById('payment-method').value, 
        payment_date: document.getElementById('payment-date').value, 
        reference: document.getElementById('payment-reference').value, 
        notes: document.getElementById('payment-notes').value 
    }; 
    try { 
        await supabase.from('payments').insert([data]); 
        var result = await supabase.from('orders').select('paid_amount').eq('id', orderId).single(); 
        var newPaidAmount = ((result.data && result.data.paid_amount) || 0) + data.amount; 
        await supabase.from('orders').update({ paid_amount: newPaidAmount }).eq('id', orderId); 
        showToast('תשלום נרשם'); 
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide(); 
        document.getElementById('payment-form').reset(); 
        loadOrders(); 
        loadHomeStats(); 
    } catch (error) { 
        console.error(error);
        showToast('שגיאה', 'error'); 
    } 
}

function openPaymentModal(orderId) { 
    document.getElementById('payment-order-id').value = orderId; 
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0]; 
    new bootstrap.Modal(document.getElementById('paymentModal')).show(); 
}

var orderItemsCount = 0;
var orderTableItemsCount = 0;

function addOrderItem() { 
    var container = document.getElementById('order-items-container'); 
    var itemId = orderItemsCount++; 
    var options = '<option value="">בחר מוצר...</option>'; 
    cachedData.products.filter(function(p) { return p.is_active; }).forEach(function(p) { 
        options += '<option value="' + p.id + '" data-price="' + p.price_per_portion + '">' + p.name + ' - ₪' + p.price_per_portion + '</option>'; 
    }); 
    container.insertAdjacentHTML('beforeend', '<div class="row g-2 mb-2 order-item" data-item-id="' + itemId + '"><div class="col-md-5"><select class="form-select form-select-sm" name="product_' + itemId + '" required onchange="updateOrderItemPrice(' + itemId + ')">' + options + '</select></div><div class="col-md-2"><input type="number" class="form-control form-control-sm" name="quantity_' + itemId + '" placeholder="כמות" min="1" required onchange="updateOrderItemPrice(' + itemId + ')"></div><div class="col-md-2"><input type="number" class="form-control form-control-sm" name="price_' + itemId + '" placeholder="מחיר" step="0.01" onchange="calculateOrderTotal()"></div><div class="col-md-2"><span class="form-control-plaintext item-total" id="item-total-' + itemId + '">₪0</span></div><div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOrderItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>'); 
}

function removeOrderItem(itemId) { 
    var item = document.querySelector('.order-item[data-item-id="' + itemId + '"]'); 
    if (item) item.remove(); 
    calculateOrderTotal(); 
}

function updateOrderItemPrice(itemId) { 
    var select = document.querySelector('select[name="product_' + itemId + '"]'); 
    var quantityInput = document.querySelector('input[name="quantity_' + itemId + '"]'); 
    var priceInput = document.querySelector('input[name="price_' + itemId + '"]'); 
    var totalSpan = document.getElementById('item-total-' + itemId); 
    var selectedOption = select.options[select.selectedIndex];
    var price = selectedOption && selectedOption.dataset && selectedOption.dataset.price ? parseFloat(selectedOption.dataset.price) : 0; 
    var quantity = parseInt(quantityInput.value) || 0; 
    priceInput.value = price; 
    totalSpan.textContent = '₪' + (price * quantity).toFixed(2); 
    calculateOrderTotal(); 
}

function addOrderTableItem() { 
    var container = document.getElementById('order-table-items-container'); 
    var itemId = orderTableItemsCount++; 
    var options = '<option value="">בחר פריט...</option>'; 
    cachedData.tableItems.forEach(function(i) { 
        options += '<option value="' + i.id + '" data-price="' + i.price_per_unit + '">' + i.name + ' - ₪' + i.price_per_unit + '</option>'; 
    }); 
    container.insertAdjacentHTML('beforeend', '<div class="row g-2 mb-2 order-table-item" data-item-id="' + itemId + '"><div class="col-md-5"><select class="form-select form-select-sm" name="table_item_' + itemId + '" required onchange="updateOrderTableItemPrice(' + itemId + ')">' + options + '</select></div><div class="col-md-2"><input type="number" class="form-control form-control-sm" name="table_quantity_' + itemId + '" placeholder="כמות" min="1" required onchange="updateOrderTableItemPrice(' + itemId + ')"></div><div class="col-md-2"><input type="number" class="form-control form-control-sm" name="table_price_' + itemId + '" placeholder="מחיר" step="0.01" onchange="calculateOrderTotal()"></div><div class="col-md-2"><span class="form-control-plaintext table-item-total" id="table-item-total-' + itemId + '">₪0</span></div><div class="col-md-1"><button type="button" class="btn btn-sm btn-outline-danger" onclick="removeOrderTableItem(' + itemId + ')"><i class="bi bi-x"></i></button></div></div>'); 
}

function removeOrderTableItem(itemId) { 
    var item = document.querySelector('.order-table-item[data-item-id="' + itemId + '"]'); 
    if (item) item.remove(); 
    calculateOrderTotal(); 
}

function updateOrderTableItemPrice(itemId) { 
    var select = document.querySelector('select[name="table_item_' + itemId + '"]'); 
    var quantityInput = document.querySelector('input[name="table_quantity_' + itemId + '"]'); 
    var priceInput = document.querySelector('input[name="table_price_' + itemId + '"]'); 
    var totalSpan = document.getElementById('table-item-total-' + itemId); 
    var selectedOption = select.options[select.selectedIndex];
    var price = selectedOption && selectedOption.dataset && selectedOption.dataset.price ? parseFloat(selectedOption.dataset.price) : 0; 
    var quantity = parseInt(quantityInput.value) || 0; 
    priceInput.value = price; 
    totalSpan.textContent = '₪' + (price * quantity).toFixed(2); 
    calculateOrderTotal(); 
}

function calculateOrderTotal() { 
    var productsTotal = 0; 
    var tableTotal = 0; 
    document.querySelectorAll('.order-item .item-total').forEach(function(span) { 
        productsTotal += parseFloat(span.textContent.replace('₪', '')) || 0; 
    }); 
    document.querySelectorAll('.order-table-item .table-item-total').forEach(function(span) { 
        tableTotal += parseFloat(span.textContent.replace('₪', '')) || 0; 
    }); 
    if (document.getElementById('order-products-total')) document.getElementById('order-products-total').textContent = '₪' + productsTotal.toFixed(2); 
    if (document.getElementById('order-table-total')) document.getElementById('order-table-total').textContent = '₪' + tableTotal.toFixed(2); 
    if (document.getElementById('order-grand-total')) document.getElementById('order-grand-total').textContent = '₪' + (productsTotal + tableTotal).toFixed(2); 
}

async function saveOrder() { 
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
    try { 
        var result = await supabase.from('orders').insert([orderData]).select().single(); 
        if (result.error) throw result.error; 
        var order = result.data;
        var orderItems = []; 
        document.querySelectorAll('.order-item').forEach(function(item) { 
            var itemId = item.dataset.itemId; 
            var productId = document.querySelector('select[name="product_' + itemId + '"]').value; 
            var quantity = parseInt(document.querySelector('input[name="quantity_' + itemId + '"]').value) || 0; 
            var price = parseFloat(document.querySelector('input[name="price_' + itemId + '"]').value) || 0; 
            if (productId && quantity > 0) orderItems.push({ order_id: order.id, product_id: productId, quantity: quantity, price_per_unit: price, total_price: price * quantity }); 
        }); 
        if (orderItems.length > 0) await supabase.from('order_items').insert(orderItems); 
        var tableItems = []; 
        document.querySelectorAll('.order-table-item').forEach(function(item) { 
            var itemId = item.dataset.itemId; 
            var tableItemId = document.querySelector('select[name="table_item_' + itemId + '"]').value; 
            var quantity = parseInt(document.querySelector('input[name="table_quantity_' + itemId + '"]').value) || 0; 
            var price = parseFloat(document.querySelector('input[name="table_price_' + itemId + '"]').value) || 0; 
            if (tableItemId && quantity > 0) tableItems.push({ order_id: order.id, table_item_id: tableItemId, quantity: quantity, price_per_unit: price, total_price: price * quantity }); 
        }); 
        if (tableItems.length > 0) await supabase.from('order_table_items').insert(tableItems); 
        showToast('הזמנה נשמרה בהצלחה'); 
        document.getElementById('new-order-form').reset(); 
        document.getElementById('order-items-container').innerHTML = ''; 
        document.getElementById('order-table-items-container').innerHTML = ''; 
        orderItemsCount = 0; 
        orderTableItemsCount = 0; 
        calculateOrderTotal(); 
        showPage('orders'); 
        loadOrders(); 
        loadHomeStats(); 
    } catch (error) { 
        console.error('Error saving order:', error); 
        showToast('שגיאה בשמירת הזמנה', 'error'); 
    } 
}

function viewOrder(orderId) { showToast('צפייה בהזמנה - בקרוב'); }
function editOrder(orderId) { showToast('עריכת הזמנה - בקרוב'); }

async function generateReport(reportType) { 
    var reportDate = document.getElementById('report-date').value; 
    var orderId = document.getElementById('report-order-select').value; 
    if (!reportDate && !orderId) { showToast('בחר תאריך או הזמנה', 'error'); return; } 
    showLoading(true); 
    try { 
        var orders = []; 
        if (orderId) { 
            var result = await supabase.from('orders').select('*, customers(name), order_items(*, products(name, categories(type))), order_table_items(*, table_items(name))').eq('id', orderId); 
            orders = result.data || []; 
        } else { 
            var result = await supabase.from('orders').select('*, customers(name), order_items(*, products(name, categories(type))), order_table_items(*, table_items(name))').eq('event_date', reportDate); 
            orders = result.data || []; 
        } 
        if (orders.length === 0) { showToast('לא נמצאו הזמנות', 'error'); showLoading(false); return; } 
        var reportContent = ''; 
        var reportTitle = ''; 
        switch (reportType) { 
            case 'cold-production': reportTitle = 'דוח ייצור פס קר'; reportContent = generateProductionReport(orders, 'cold', 'production'); break; 
            case 'cold-packing': reportTitle = 'דוח אריזה פס קר'; reportContent = generateProductionReport(orders, 'cold', 'packing'); break; 
            case 'hot-production': reportTitle = 'דוח ייצור פס חם'; reportContent = generateProductionReport(orders, 'hot', 'production'); break; 
            case 'hot-packing': reportTitle = 'דוח אריזה פס חם'; reportContent = generateProductionReport(orders, 'hot', 'packing'); break; 
            case 'storage': reportTitle = 'סיכום מלאי/אחסון'; reportContent = generateStorageReport(orders); break; 
            case 'quantities': reportTitle = 'דוח כמויות כללי'; reportContent = generateQuantitiesReport(orders); break; 
            case 'bakery': reportTitle = 'הזמנה לקונדיטוריה'; reportContent = generateSupplierOrderReport(orders, 'bakery'); break; 
            case 'table-items': reportTitle = 'הזמנה לפריטי שולחן'; reportContent = generateTableItemsReport(orders); break; 
        } 
        document.getElementById('report-title').textContent = reportTitle; 
        document.getElementById('report-content').innerHTML = reportContent; 
        showPage('report-display'); 
    } catch (error) { 
        console.error('Error:', error); 
        showToast('שגיאה', 'error'); 
    } 
    showLoading(false); 
}

function generateProductionReport(orders, type, stage) { 
    var html = ''; 
    orders.forEach(function(order) { 
        var items = (order.order_items || []).filter(function(item) { return item.products && item.products.categories && item.products.categories.type === type; }); 
        if (items.length === 0) return; 
        html += '<div class="report-section mb-4"><div class="bg-' + (type === 'cold' ? 'info' : 'danger') + ' text-white p-3 rounded-top"><h5 class="mb-1">הזמנה #' + order.order_number + ' - ' + (order.customers?.name || 'לקוח') + '</h5><p class="mb-0"><strong>תאריך:</strong> ' + order.event_date + ' | <strong>שעת משלוח:</strong> ' + order.delivery_time + '</p></div><div class="bg-white p-3 border border-top-0 rounded-bottom">'; 
        items.forEach(function(item) { 
            html += '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox form-check-input" onchange="toggleChecklistItem(this)"><span><strong>' + (item.products?.name || '') + '</strong> - ' + item.quantity + ' מנות</span></div>'; 
        }); 
        html += '</div></div>'; 
    }); 
    return html || '<p class="text-center text-muted py-4">אין פריטים להצגה</p>'; 
}

function generateStorageReport(orders) { 
    var containerNeeds = {}; 
    orders.forEach(function(order) { 
        (order.order_items || []).forEach(function(item) { 
            var rule = cachedData.packingRules.find(function(r) { return r.product_id === item.product_id && item.quantity >= r.min_portions && item.quantity <= r.max_portions; }); 
            if (rule) { 
                var container = cachedData.containers.find(function(c) { return c.id === rule.container_id; }); 
                if (container) containerNeeds[container.name] = (containerNeeds[container.name] || 0) + 1; 
            } 
        }); 
    }); 
    var html = '<h5 class="mb-3">סיכום מיכלים נדרשים</h5><table class="table"><thead><tr><th>מיכל</th><th>כמות</th></tr></thead><tbody>'; 
    var keys = Object.keys(containerNeeds);
    if (keys.length === 0) { 
        html += '<tr><td colspan="2" class="text-center">לא נמצאו כללי אריזה</td></tr>'; 
    } else {
        keys.forEach(function(container) { 
            html += '<tr><td>' + container + '</td><td>' + containerNeeds[container] + '</td></tr>'; 
        });
    }
    return html + '</tbody></table>'; 
}

function generateQuantitiesReport(orders) { 
    var quantities = {}; 
    orders.forEach(function(order) { 
        (order.order_items || []).forEach(function(item) { 
            var name = item.products?.name || 'מוצר'; 
            quantities[name] = (quantities[name] || 0) + item.quantity; 
        }); 
    }); 
    var html = '<h5 class="mb-3">סיכום כמויות כללי</h5><p class="text-muted">תאריך: ' + document.getElementById('report-date').value + '</p><table class="table"><thead><tr><th>מוצר</th><th>כמות כוללת</th></tr></thead><tbody>'; 
    var entries = Object.entries(quantities).sort(function(a, b) { return b[1] - a[1]; });
    entries.forEach(function(entry) { 
        html += '<tr><td>' + entry[0] + '</td><td>' + entry[1] + ' מנות</td></tr>'; 
    }); 
    return html + '</tbody></table>'; 
}

function generateSupplierOrderReport(orders, supplierType) { 
    var items = {}; 
    orders.forEach(function(order) { 
        (order.order_items || []).forEach(function(item) { 
            if (item.products && item.products.categories && item.products.categories.type === 'bakery') { 
                var name = item.products?.name || 'מוצר'; 
                items[name] = (items[name] || 0) + item.quantity; 
            } 
        }); 
    }); 
    var supplier = cachedData.suppliers.find(function(s) { return s.type === supplierType; }); 
    var html = '<h5 class="mb-3">הזמנה לקונדיטוריה</h5>'; 
    if (supplier) html += '<div class="mb-3"><strong>ספק:</strong> ' + supplier.name + '</div>'; 
    html += '<table class="table"><thead><tr><th>פריט</th><th>כמות</th></tr></thead><tbody>'; 
    Object.entries(items).forEach(function(entry) { 
        html += '<tr><td>' + entry[0] + '</td><td>' + entry[1] + '</td></tr>'; 
    }); 
    html += '</tbody></table>'; 
    if (supplier && supplier.whatsapp) { 
        var msg = encodeURIComponent('הזמנה:\n' + Object.entries(items).map(function(e) { return e[0] + ': ' + e[1]; }).join('\n')); 
        html += '<div class="text-center mt-4"><a href="https://wa.me/' + supplier.whatsapp + '?text=' + msg + '" target="_blank" class="btn btn-success btn-lg"><i class="bi bi-whatsapp me-2"></i> שלח בוואטסאפ</a></div>'; 
    } 
    return html; 
}

function generateTableItemsReport(orders) { 
    var items = {}; 
    orders.forEach(function(order) { 
        (order.order_table_items || []).forEach(function(item) { 
            var name = item.table_items?.name || 'פריט'; 
            items[name] = (items[name] || 0) + item.quantity; 
        }); 
    }); 
    var supplier = cachedData.suppliers.find(function(s) { return s.type === 'table'; }); 
    var html = '<h5 class="mb-3">הזמנה לפריטי שולחן</h5>'; 
    if (supplier) html += '<div class="mb-3"><strong>ספק:</strong> ' + supplier.name + '</div>'; 
    html += '<table class="table"><thead><tr><th>פריט</th><th>כמות</th></tr></thead><tbody>'; 
    Object.entries(items).forEach(function(entry) { 
        html += '<tr><td>' + entry[0] + '</td><td>' + entry[1] + '</td></tr>'; 
    }); 
    html += '</tbody></table>'; 
    if (supplier && supplier.whatsapp) { 
        var msg = encodeURIComponent('הזמנה:\n' + Object.entries(items).map(function(e) { return e[0] + ': ' + e[1]; }).join('\n')); 
        html += '<div class="text-center mt-4"><a href="https://wa.me/' + supplier.whatsapp + '?text=' + msg + '" target="_blank" class="btn btn-success btn-lg"><i class="bi bi-whatsapp me-2"></i> שלח בוואטסאפ</a></div>'; 
    } 
    return html; 
}

function toggleChecklistItem(checkbox) { 
    checkbox.closest('.checklist-item').classList.toggle('completed', checkbox.checked); 
}

function showPage(pageId) { 
    document.querySelectorAll('.page-content').forEach(function(page) { page.classList.remove('active'); }); 
    var page = document.getElementById('page-' + pageId); 
    if (page) page.classList.add('active'); 
    switch (pageId) { 
        case 'orders': loadOrders(); break; 
        case 'home': loadHomeStats(); break; 
        case 'new-order': 
            orderItemsCount = 0; 
            orderTableItemsCount = 0; 
            var itemsContainer = document.getElementById('order-items-container');
            var tableItemsContainer = document.getElementById('order-table-items-container');
            if (itemsContainer) itemsContainer.innerHTML = ''; 
            if (tableItemsContainer) tableItemsContainer.innerHTML = ''; 
            addOrderItem(); 
            break; 
        case 'payments': loadPaymentsPage(); break; 
    } 
    var navbarCollapse = document.querySelector('.navbar-collapse'); 
    if (navbarCollapse && navbarCollapse.classList.contains('show')) { 
        var bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse); 
        if (bsCollapse) bsCollapse.hide(); 
    } 
}

async function loadPaymentsPage() { 
    var result = await supabase.from('orders').select('*, customers(name)').order('event_date', { ascending: false }); 
    var orders = result.data;
    var totalReceived = 0; 
    var totalPending = 0; 
    var totalOrders = 0; 
    var tbody = document.getElementById('payments-table'); 
    if (!orders || orders.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">אין הזמנות</td></tr>'; 
        return; 
    } 
    var html = '';
    orders.forEach(function(o) { 
        var balance = (o.total_amount || 0) - (o.paid_amount || 0); 
        totalReceived += (o.paid_amount || 0); 
        totalPending += balance > 0 ? balance : 0; 
        totalOrders += (o.total_amount || 0); 
        html += '<tr><td>' + o.order_number + '</td><td>' + (o.customers?.name || '-') + '</td><td>' + o.event_date + '</td><td>₪' + (o.total_amount || 0).toLocaleString() + '</td><td>₪' + (o.paid_amount || 0).toLocaleString() + '</td><td class="' + (balance > 0 ? 'text-danger fw-bold' : 'text-success') + '">₪' + balance.toLocaleString() + '</td><td>' + (balance > 0 ? '<button class="btn btn-sm btn-success" onclick="openPaymentModal(\'' + o.id + '\')"><i class="bi bi-plus-circle me-1"></i> תשלום</button>' : '<span class="badge bg-success">שולם</span>') + '</td></tr>'; 
    });
    tbody.innerHTML = html;
    if (document.getElementById('payments-total-received')) document.getElementById('payments-total-received').textContent = '₪' + totalReceived.toLocaleString(); 
    if (document.getElementById('payments-total-pending')) document.getElementById('payments-total-pending').textContent = '₪' + totalPending.toLocaleString(); 
    if (document.getElementById('payments-total-orders')) document.getElementById('payments-total-orders').textContent = '₪' + totalOrders.toLocaleString(); 
}

function showLoading(show) { 
    var spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.toggle('show', show); 
}

function showToast(message, type) { 
    type = type || 'success'; 
    var container = document.querySelector('.toast-container'); 
    if (!container) return;
    var toastId = 'toast-' + Date.now(); 
    container.insertAdjacentHTML('beforeend', '<div id="' + toastId + '" class="toast align-items-center text-bg-' + (type === 'error' ? 'danger' : 'success') + ' border-0" role="alert"><div class="d-flex"><div class="toast-body"><i class="bi bi-' + (type === 'error' ? 'x-circle' : 'check-circle') + ' me-2"></i>' + message + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>'); 
    var toastElement = document.getElementById(toastId); 
    var toast = new bootstrap.Toast(toastElement, { delay: 3000 }); 
    toast.show(); 
    toastElement.addEventListener('hidden.bs.toast', function() { toastElement.remove(); }); 
}

function showQuickCustomerModal() { 
    document.getElementById('customer-id').value = ''; 
    document.getElementById('customer-form').reset(); 
    new bootstrap.Modal(document.getElementById('customerModal')).show(); 
}

function getTypeLabel(type) { 
    var labels = { 'hot': 'פס חם', 'cold': 'פס קר', 'bakery': 'קונדיטוריה', 'table': 'פריטי שולחן' }; 
    return labels[type] || type; 
}

function getTypeBadgeColor(type) { 
    var colors = { 'hot': 'danger', 'cold': 'info', 'bakery': 'warning', 'table': 'secondary' }; 
    return colors[type] || 'secondary'; 
}

function getSupplierTypeLabel(type) { 
    var labels = { 'bakery': 'קונדיטוריה', 'table': 'פריטי שולחן', 'ingredients': 'חומרי גלם', 'other': 'אחר' }; 
    return labels[type] || type; 
}

function getSupplierTypeBadgeColor(type) { 
    var colors = { 'bakery': 'warning', 'table': 'secondary', 'ingredients': 'success', 'other': 'dark' }; 
    return colors[type] || 'secondary'; 
}

function getStatusLabel(status) { 
    var labels = { 'new': 'חדש', 'confirmed': 'מאושר', 'in_production': 'בייצור', 'ready': 'מוכן', 'delivered': 'נמסר', 'cancelled': 'בוטל' }; 
    return labels[status] || status; 
}

function getStatusBadgeColor(status) { 
    var colors = { 'new': 'primary', 'confirmed': 'info', 'in_production': 'warning', 'ready': 'success', 'delivered': 'secondary', 'cancelled': 'danger' }; 
    return colors[status] || 'secondary'; 
}

function getUnitLabel(unit) { 
    var labels = { 'gram': 'גרם', 'kg': 'ק"ג', 'liter': 'ליטר', 'ml': 'מ"ל', 'unit': 'יחידה' }; 
    return labels[unit] || unit; 
}
