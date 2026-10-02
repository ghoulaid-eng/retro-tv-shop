const CATALOG_KEY = 'sip-of-ghoulaid-catalog';
const SESSION_KEY = 'sip-of-ghoulaid-owner-session';
const ORDER_KEY = 'sip-of-ghoulaid-demo-orders';
const VISITOR_KEY = 'sip-of-ghoulaid-visitor-count';
const DISCOUNT_KEY = 'sip-of-ghoulaid-discounts';
const API_BASE = '/api';
const DEMO_USERNAME = 'owner';
const DEMO_PASSWORD = 'ghoulaid-demo';
const MAX_MEDIA_SIZE_BYTES = 2 * 1024 * 1024;
const defaultCatalog = window.SIP_OF_GHOULAID_CATALOG || [
    { id: 'xl-melts', name: 'Extra Large Wax Melts', category: 'Wax Melts', icon: '🕯️', price: 16, stock: 8, description: 'Hand-poured and hand-painted statement melts. Pick your scent family!', image: '', available: true },
    { id: 'full-melts', name: 'Full Size Wax Melts', category: 'Wax Melts', icon: '🔥', price: 9, stock: 12, description: 'Spooky scents ready to haunt every corner of your space.', image: '', available: true },
    { id: 'mini-melts', name: 'Mini Wax Melts', category: 'Wax Melts', icon: '✨', price: 5, stock: 18, description: 'Small but mighty creepy-cute designs for a tiny dose of chaos.', image: '', available: true },
    { id: 'book-accessories', name: 'Book Accessories', category: 'Accessories', icon: '📚', price: 7, stock: 10, description: 'Bookmarks and reading companions for the delightfully unhinged.', image: '', available: true },
    { id: 'headset-holder', name: 'Headset Holder', category: 'Accessories', icon: '🎧', price: 22, stock: 4, description: '3D-printed custom designs to keep your setup spooky.', image: '', available: true },
    { id: 'gift-boxes', name: 'Gift Boxes', category: 'Gift Boxes', icon: '🎁', price: 28, stock: 6, description: 'Curated collections for gifting your favorite ghoul.', image: '', available: true }
];
const LEGACY_DEFAULT_IDS = ['xl-melts', 'full-melts', 'mini-melts', 'book-accessories', 'headset-holder', 'gift-boxes'];

const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const loginMessage = document.getElementById('loginMessage');
const productForm = document.getElementById('productForm');
const adminCatalogList = document.getElementById('adminCatalogList');
const productMediaUpload = document.getElementById('productMediaUpload');
const uploadMessage = document.getElementById('uploadMessage');
let uploadedMedia = '';
let uploadedMediaType = 'image';

async function readApiJson(response) {
    const body = await response.text();
    let data;
    try {
        data = body ? JSON.parse(body) : null;
    } catch {
        throw new Error('The local server returned an unexpected response. Open this console through the local server instead of file://.');
    }
    if (!response.ok) throw new Error((data && data.error) || `The local server could not complete this request (${response.status}).`);
    if (!data || typeof data !== 'object') {
        throw new Error('The local server returned no account data. Start the local server and reload this page.');
    }
    return data;
}

function getCatalog() {
    try {
        const saved = JSON.parse(localStorage.getItem(CATALOG_KEY));
        if (!Array.isArray(saved)) return defaultCatalog.map(normalizeProduct);
        const isLegacyDemoCatalog = saved.length === LEGACY_DEFAULT_IDS.length
            && saved.every((product) => LEGACY_DEFAULT_IDS.includes(product.id));
        return (isLegacyDemoCatalog ? defaultCatalog : saved).map(normalizeProduct);
    } catch {
        return defaultCatalog.map(normalizeProduct);
    }
}
function normalizeProduct(product) {
    const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [{
        id: `${product.id}-default`, name: 'Default', price: Number(product.price || 0), stock: Math.max(0, Number(product.stock || 0)), options: {}
    }];
    const cleanVariants = variants.map((variant, index) => ({
        id: String(variant.id || `${product.id}-variant-${index + 1}`), name: String(variant.name || 'Default'),
        price: Number(variant.price ?? product.price ?? 0), stock: Math.max(0, Number(variant.stock ?? product.stock ?? 0)),
        options: variant.options && typeof variant.options === 'object' ? variant.options : {}
    }));
    return { ...product, variants: cleanVariants, price: Math.min(...cleanVariants.map((variant) => variant.price)), stock: cleanVariants.reduce((sum, variant) => sum + variant.stock, 0) };
}
function saveCatalog(catalog) { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); }
function getOrders() {
    try {
        const savedOrders = JSON.parse(localStorage.getItem(ORDER_KEY));
        return Array.isArray(savedOrders) ? savedOrders : [];
    } catch {
        return [];
    }
}
function getDiscounts() {
    try {
        const savedDiscounts = JSON.parse(localStorage.getItem(DISCOUNT_KEY));
        return Array.isArray(savedDiscounts) ? savedDiscounts.map((discount) => ({
            ...discount,
            type: discount.type || 'percent',
            amount: Number(discount.amount || discount.percent || 0),
            condition: discount.condition || 'any',
            scope: discount.scope || 'all',
            expiry: discount.expiry || 'never',
            uses: Number(discount.uses || 0)
        })) : [];
    } catch {
        return [];
    }
}
function renderOrders() {
    const orders = getOrders().slice().reverse();
    document.getElementById('adminOrders').innerHTML = orders.length
        ? orders.map((order) => {
            const itemCount = Array.isArray(order.items) ? order.items.reduce((total, item) => total + item.quantity, 0) : 0;
            const customer = order.customer?.name || order.customer?.email || 'Customer details unavailable';
            const label = order.type === 'custom-request' ? 'CUSTOM REQUEST' : 'STORE ORDER';
            return `<article class="admin-product"><div><strong>${escapeHtml(label)} · ${escapeHtml(order.id)}</strong><p>${new Date(order.createdAt).toLocaleString()} · ${escapeHtml(order.status || 'Recorded')} · ${escapeHtml(customer)}${itemCount ? ` · ${itemCount} ITEMS` : ''}${order.discountCode ? ` · ${escapeHtml(order.discountCode)} APPLIED` : ''}</p></div><strong>${order.type === 'custom-request' ? 'REVIEW' : `$${Number(order.total).toFixed(2)}`}</strong></article>`;
        }).join('')
        : '<p class="insight-empty">No local store orders or custom requests yet.</p>';
}
function renderDiscounts() {
    const discounts = getDiscounts();
    document.getElementById('discountList').innerHTML = discounts.length
        ? discounts.map((discount) => `<article class="admin-product"><div><strong>${escapeHtml(discount.code)}</strong><p>${escapeHtml(discount.description || 'Discount')} · ${discount.type} · ${discount.automatic ? 'AUTO' : 'CODE'} · ${discount.uses || 0} uses</p></div><button type="button" data-discount-code="${escapeHtml(discount.code)}">DELETE</button></article>`).join('')
        : '<p class="insight-empty">No discount codes yet.</p>';
}
function populateDiscountTargets() {
    const target = document.getElementById('discountTarget');
    const scope = document.getElementById('discountScope').value;
    const catalog = getCatalog();
    if (scope === 'all') {
        target.innerHTML = '<option value="">Entire order</option>';
        target.disabled = true;
        return;
    }
    const values = scope === 'category' ? [...new Set(catalog.map((product) => product.category))] : catalog.map((product) => product.name);
    target.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    target.disabled = false;
}
function showAdminView(view) {
    document.querySelectorAll('[data-admin-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.adminPanel === view));
    document.querySelectorAll('[data-admin-view]').forEach((button) => button.classList.toggle('active', button.dataset.adminView === view));
    if (view === 'orders') renderOrders();
    if (view === 'discounts') renderDiscounts();
}
function setSignedIn(signedIn) {
    loginPanel.classList.toggle('hidden', signedIn);
    dashboardPanel.classList.toggle('hidden', !signedIn);
}
function escapeHtml(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
}
function renderAdminCatalog() {
    const catalog = getCatalog();
    adminCatalogList.innerHTML = catalog.map((product) => `
        <article class="admin-product ${product.available ? '' : 'is-hidden'}">
            <div><strong>${escapeHtml(product.name)}</strong><p>${product.available ? 'PUBLISHED' : 'HIDDEN'} · $${Number(product.price || 0).toFixed(2)} · ${Number(product.stock || 0)} IN STOCK</p></div>
            <div class="row-actions"><button type="button" data-action="edit" data-id="${product.id}">EDIT</button><button type="button" data-action="publish" data-id="${product.id}">${product.available ? 'UNPUBLISH' : 'PUBLISH'}</button><button type="button" data-action="delete" data-id="${product.id}">DELETE</button></div>
        </article>`).join('');
}
function renderOverview() {
    const catalog = getCatalog();
    const orders = getOrders();
    const visitors = Number(localStorage.getItem(VISITOR_KEY) || 0);
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const quantities = new Map();
    orders.forEach((order) => order.items.forEach((item) => {
        quantities.set(item.id, (quantities.get(item.id) || 0) + Number(item.quantity || 0));
    }));
    const categoryQuantities = new Map();
    quantities.forEach((quantity, productId) => {
        const product = catalog.find((entry) => entry.id === productId);
        if (product) categoryQuantities.set(product.category, (categoryQuantities.get(product.category) || 0) + quantity);
    });
    const renderInsight = (items, emptyCopy) => items.length
        ? items.map(([label, quantity]) => `<li><span>${escapeHtml(label)}</span><strong>${quantity}</strong></li>`).join('')
        : `<li class="insight-empty">${emptyCopy}</li>`;

    document.getElementById('visitorMetric').textContent = visitors;
    document.getElementById('orderMetric').textContent = orders.length;
    document.getElementById('conversionMetric').textContent = visitors ? `${((orders.length / visitors) * 100).toFixed(1)}%` : '0%';
    document.getElementById('averageOrderMetric').textContent = orders.length ? `$${(revenue / orders.length).toFixed(2)}` : '$0.00';
    document.getElementById('revenueMetric').textContent = `$${revenue.toFixed(2)}`;
    const topSellers = [...quantities.entries()]
        .map(([id, quantity]) => [catalog.find((product) => product.id === id)?.name || 'Removed product', quantity])
        .sort(([, left], [, right]) => right - left)
        .slice(0, 3);
    const topCategories = [...categoryQuantities.entries()].sort(([, left], [, right]) => right - left).slice(0, 3);
    document.getElementById('topSellers').innerHTML = renderInsight(topSellers, 'No demo orders yet.');
    document.getElementById('topCategories').innerHTML = renderInsight(topCategories, 'No category data yet.');
}
function resetProductForm() {
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productStock').value = '1';
    document.getElementById('productAvailable').checked = true;
    document.getElementById('productMediaUrl').value = '';
    document.getElementById('productAdditionalImages').value = '';
    document.getElementById('productMediaType').value = 'image';
    productMediaUpload.value = '';
    uploadedMedia = '';
    uploadMessage.textContent = '';
    document.getElementById('productFormTitle').textContent = 'ADD A NEW DROP';
    document.getElementById('cancelEditButton').classList.add('hidden');
    productForm.classList.add('hidden');
    document.getElementById('variantRows').replaceChildren();
    addVariantRow();
}

function addVariantRow(variant = {}) {
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.dataset.variantId = variant.id || '';
    const fields = [
        ['label', 'Variant label', variant.name || 'Default', 'text'],
        ['price', 'Price', variant.price ?? (Number(document.getElementById('productPrice').value) || 0), 'number'],
        ['stock', 'Inventory', variant.stock ?? 1, 'number'],
        ['options', 'Option values', Object.entries(variant.options || {}).map(([name, value]) => `${name}: ${value}`).join(', '), 'text']
    ];
    fields.forEach(([field, label, value, type]) => {
        const labelNode = document.createElement('label');
        labelNode.textContent = label;
        const input = document.createElement('input');
        input.type = type; input.dataset.variantField = field; input.value = value;
        if (type === 'number') { input.min = '0'; input.step = field === 'price' ? '0.01' : '1'; }
        labelNode.append(input); row.append(labelNode);
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-btn'; remove.dataset.removeVariant = 'true'; remove.textContent = 'REMOVE';
    row.append(remove);
    document.getElementById('variantRows').append(row);
}

function readVariants(productId, fallbackPrice) {
    const rows = [...document.querySelectorAll('#variantRows .variant-row')];
    if (!rows.length) return [];
    return rows.map((row, index) => {
        const value = (field) => row.querySelector(`[data-variant-field="${field}"]`).value.trim();
        const options = value('options').split(',').reduce((result, part) => {
            const [name, ...rest] = part.split(':');
            if (name && rest.join(':').trim()) result[name.trim()] = rest.join(':').trim();
            return result;
        }, {});
        return { id: row.dataset.variantId || `${productId}-variant-${index + 1}`, name: value('label') || `Variant ${index + 1}`, price: Number(value('price')), stock: Math.max(0, Number(value('stock'))), options };
    }).filter((variant) => Number.isFinite(variant.price) && Number.isInteger(variant.stock));
}
document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    loginMessage.textContent = 'Checking the owner signal...';
    fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, password }) })
        .then(readApiJson).then((data) => {
            setSignedIn(true);
            renderAdminCatalog();
            renderOverview();
            showAdminView('dashboard');
        })
        .catch((error) => { loginMessage.textContent = error.message || 'Start the local server, then try again.'; });
});
productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (productMediaUpload.files.length && !uploadedMedia) {
        uploadMessage.textContent = 'Please wait for the selected media to finish preparing, then save the product.';
        return;
    }
    const id = document.getElementById('productId').value || `product-${Date.now()}`;
    const catalog = getCatalog();
    const existing = catalog.find((item) => item.id === id);
    const mediaUrl = uploadedMedia || document.getElementById('productMediaUrl').value.trim();
    const images = document.getElementById('productAdditionalImages').value.split(',')
        .map((url) => url.trim()).filter(Boolean);
    const variants = readVariants(id, Number(document.getElementById('productPrice').value));
    if (!variants.length) { alert('Add at least one valid variant.'); return; }
    const product = { id, name: document.getElementById('productName').value.trim(), category: existing ? existing.category : 'Wax Melts', icon: existing ? existing.icon : '👻', price: Math.min(...variants.map((variant) => variant.price)), stock: variants.reduce((total, variant) => total + variant.stock, 0), variants, description: document.getElementById('productDescription').value.trim(), image: existing ? existing.image || '' : '', mediaUrl, images, mediaType: uploadedMedia ? uploadedMediaType : document.getElementById('productMediaType').value, available: document.getElementById('productAvailable').checked };
    const index = catalog.findIndex((item) => item.id === id);
    if (index === -1) catalog.push(product); else catalog[index] = product;
    saveCatalog(catalog);
    resetProductForm();
    renderAdminCatalog();
    renderOverview();
});
productMediaUpload.addEventListener('change', () => {
    const file = productMediaUpload.files[0];
    uploadedMedia = '';
    uploadMessage.textContent = '';
    if (!file) return;
    if (file.size > MAX_MEDIA_SIZE_BYTES) {
        productMediaUpload.value = '';
        uploadMessage.textContent = 'That file is too large. Choose an image or video smaller than 2 MB for this local prototype.';
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        uploadedMedia = reader.result;
        uploadedMediaType = file.type.startsWith('video/') ? 'video' : 'image';
        document.getElementById('productMediaType').value = uploadedMediaType;
        uploadMessage.textContent = `${file.name} is ready to save locally.`;
    });
    reader.addEventListener('error', () => {
        productMediaUpload.value = '';
        uploadMessage.textContent = 'The media file could not be read. Please choose another file.';
    });
    reader.readAsDataURL(file);
});
adminCatalogList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const catalog = getCatalog();
    const product = catalog.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === 'delete') {
        if (!window.confirm(`Delete "${product.name}" from this browser's catalog?`)) return;
        saveCatalog(catalog.filter((item) => item.id !== button.dataset.id));
        renderAdminCatalog();
        renderOverview();
        return;
    }
    if (button.dataset.action === 'publish') {
        product.available = !product.available;
        saveCatalog(catalog);
        renderAdminCatalog();
        renderOverview();
        return;
    }
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productMediaUrl').value = product.mediaUrl || product.image || '';
    document.getElementById('productAdditionalImages').value = Array.isArray(product.images) ? product.images.join(', ') : '';
    document.getElementById('productMediaType').value = product.mediaType || 'image';
    document.getElementById('productAvailable').checked = product.available;
    document.getElementById('variantRows').replaceChildren();
    product.variants.forEach(addVariantRow);
    document.getElementById('productFormTitle').textContent = 'EDIT DROP';
    document.getElementById('cancelEditButton').classList.remove('hidden');
    productForm.classList.remove('hidden');
    document.getElementById('productName').focus();
});
document.getElementById('cancelEditButton').addEventListener('click', resetProductForm);
document.getElementById('addVariantButton').addEventListener('click', () => addVariantRow());
document.getElementById('variantRows').addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-variant]')) event.target.closest('.variant-row').remove();
});
document.getElementById('newProductButton').addEventListener('click', () => {
    showAdminView('products');
    resetProductForm();
    productForm.classList.remove('hidden');
    document.getElementById('productName').focus();
});
document.querySelectorAll('[data-admin-view]').forEach((button) => button.addEventListener('click', () => showAdminView(button.dataset.adminView)));
document.getElementById('generateDiscountButton').addEventListener('click', () => {
    document.getElementById('discountCode').value = `GHOUL${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
});
document.getElementById('discountScope').addEventListener('change', populateDiscountTargets);
document.getElementById('discountForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const code = document.getElementById('discountCode').value.trim().toUpperCase();
    const form = event.target;
    const discount = {
        code,
        description: document.getElementById('discountDescription').value.trim(),
        automatic: document.getElementById('discountAutomatic').checked,
        condition: document.getElementById('discountCondition').value,
        threshold: Number(document.getElementById('discountThreshold').value),
        type: document.getElementById('discountType').value,
        amount: Number(document.getElementById('discountAmount').value),
        scope: document.getElementById('discountScope').value,
        target: document.getElementById('discountTarget').value,
        start: document.getElementById('discountStart').value,
        expiry: document.getElementById('discountExpiry').value,
        endDate: document.getElementById('discountEndDate').value,
        maxUses: Number(document.getElementById('discountMaxUses').value) || 0,
        onePerEmail: document.getElementById('discountOnePerEmail').checked,
        shippingEntire: document.getElementById('discountShippingEntire').checked,
        uses: 0
    };
    if (!code || (discount.type !== 'free-shipping' && discount.amount <= 0)
        || (discount.condition !== 'any' && discount.threshold <= 0)
        || (discount.scope !== 'all' && !discount.target)
        || (discount.expiry === 'date' && !discount.endDate)
        || (discount.expiry === 'uses' && !discount.maxUses)) {
        alert('Complete the required discount values before saving.');
        return;
    }
    const discounts = getDiscounts().filter((discount) => discount.code !== code);
    discounts.push(discount);
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(discounts));
    form.reset();
    populateDiscountTargets();
    renderDiscounts();
});
document.getElementById('discountList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-discount-code]');
    if (!button) return;
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(getDiscounts().filter((discount) => discount.code !== button.dataset.discountCode)));
    renderDiscounts();
});
document.getElementById('clearPrototypeDataButton').addEventListener('click', () => {
    if (!window.confirm('Clear all local catalog, cart, order, visitor, and discount data from this browser?')) return;
    [CATALOG_KEY, ORDER_KEY, VISITOR_KEY, DISCOUNT_KEY, 'sip-of-ghoulaid-cart'].forEach((key) => localStorage.removeItem(key));
    renderAdminCatalog(); renderOverview(); renderOrders(); renderDiscounts();
});
document.getElementById('resetCatalogButton').addEventListener('click', () => { saveCatalog(defaultCatalog); resetProductForm(); renderAdminCatalog(); renderOverview(); });
document.getElementById('ownerAccountForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('ownerAccountMessage');
    const username = document.getElementById('newOwnerUsername').value.trim();
    const password = document.getElementById('newOwnerPassword').value;
    message.textContent = 'Creating owner login...';
    fetch(`${API_BASE}/owner-accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, password }) })
        .then(readApiJson).then((data) => {
            event.target.reset();
            message.textContent = `${data.username} can now sign in as a local owner.`;
        })
        .catch((error) => { message.textContent = error.message || 'The owner login could not be created.'; });
});
document.getElementById('logoutButton').addEventListener('click', () => {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' }).finally(() => setSignedIn(false));
});
fetch(`${API_BASE}/auth/session`, { credentials: 'same-origin' })
    .then(readApiJson)
    .then((session) => {
        setSignedIn(session.authenticated);
        if (session.authenticated) { renderAdminCatalog(); renderOverview(); showAdminView('dashboard'); }
    })
    .catch(() => { setSignedIn(false); loginMessage.textContent = 'Start the local server to use owner logins.'; });
populateDiscountTargets();
