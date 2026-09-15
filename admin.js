const CATALOG_KEY = 'sip-of-ghoulaid-catalog';
const SESSION_KEY = 'sip-of-ghoulaid-owner-session';
const DEMO_USERNAME = 'owner';
const DEMO_PASSWORD = 'ghoulaid-demo';
const defaultCatalog = [
    { id: 'xl-melts', name: 'Extra Large Wax Melts', category: 'Wax Melts', icon: '🕯️', price: 16, stock: 8, description: 'Hand-poured and hand-painted statement melts. Pick your scent family!', image: '', available: true },
    { id: 'full-melts', name: 'Full Size Wax Melts', category: 'Wax Melts', icon: '🔥', price: 9, stock: 12, description: 'Spooky scents ready to haunt every corner of your space.', image: '', available: true },
    { id: 'mini-melts', name: 'Mini Wax Melts', category: 'Wax Melts', icon: '✨', price: 5, stock: 18, description: 'Small but mighty creepy-cute designs for a tiny dose of chaos.', image: '', available: true },
    { id: 'book-accessories', name: 'Book Accessories', category: 'Accessories', icon: '📚', price: 7, stock: 10, description: 'Bookmarks and reading companions for the delightfully unhinged.', image: '', available: true },
    { id: 'headset-holder', name: 'Headset Holder', category: 'Accessories', icon: '🎧', price: 22, stock: 4, description: '3D-printed custom designs to keep your setup spooky.', image: '', available: true },
    { id: 'gift-boxes', name: 'Gift Boxes', category: 'Gift Boxes', icon: '🎁', price: 28, stock: 6, description: 'Curated collections for gifting your favorite ghoul.', image: '', available: true }
];

const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const loginMessage = document.getElementById('loginMessage');
const productForm = document.getElementById('productForm');
const adminCatalogList = document.getElementById('adminCatalogList');

function getCatalog() {
    try {
        const saved = JSON.parse(localStorage.getItem(CATALOG_KEY));
        return Array.isArray(saved) ? saved : defaultCatalog;
    } catch {
        return defaultCatalog;
    }
}
function saveCatalog(catalog) { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); }
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
function resetProductForm() {
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productStock').value = '1';
    document.getElementById('productAvailable').checked = true;
    document.getElementById('productFormTitle').textContent = 'ADD A NEW DROP';
    document.getElementById('cancelEditButton').classList.add('hidden');
    productForm.classList.add('hidden');
}
document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
        loginMessage.textContent = 'That signal does not open the ghoul room. Use the displayed demo credentials.';
        return;
    }
    sessionStorage.setItem(SESSION_KEY, 'true');
    setSignedIn(true);
    renderAdminCatalog();
});
productForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = document.getElementById('productId').value || `product-${Date.now()}`;
    const catalog = getCatalog();
    const existing = catalog.find((item) => item.id === id);
    const product = { id, name: document.getElementById('productName').value.trim(), category: existing ? existing.category : 'Wax Melts', icon: existing ? existing.icon : '👻', price: Number(document.getElementById('productPrice').value), stock: Number(document.getElementById('productStock').value), description: document.getElementById('productDescription').value.trim(), image: document.getElementById('productImage').value.trim(), available: document.getElementById('productAvailable').checked };
    const index = catalog.findIndex((item) => item.id === id);
    if (index === -1) catalog.push(product); else catalog[index] = product;
    saveCatalog(catalog);
    resetProductForm();
    renderAdminCatalog();
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
        return;
    }
    if (button.dataset.action === 'publish') {
        product.available = !product.available;
        saveCatalog(catalog);
        renderAdminCatalog();
        return;
    }
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productAvailable').checked = product.available;
    document.getElementById('productFormTitle').textContent = 'EDIT DROP';
    document.getElementById('cancelEditButton').classList.remove('hidden');
    productForm.classList.remove('hidden');
    document.getElementById('productName').focus();
});
document.getElementById('cancelEditButton').addEventListener('click', resetProductForm);
document.getElementById('newProductButton').addEventListener('click', () => {
    resetProductForm();
    productForm.classList.remove('hidden');
    document.getElementById('productName').focus();
});
document.getElementById('resetCatalogButton').addEventListener('click', () => { saveCatalog(defaultCatalog); resetProductForm(); renderAdminCatalog(); });
document.getElementById('logoutButton').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); setSignedIn(false); });
setSignedIn(sessionStorage.getItem(SESSION_KEY) === 'true');
if (sessionStorage.getItem(SESSION_KEY) === 'true') renderAdminCatalog();
