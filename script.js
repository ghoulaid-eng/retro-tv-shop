const CATALOG_KEY = 'sip-of-ghoulaid-catalog';
const CART_KEY = 'sip-of-ghoulaid-cart';
const SAVED_KEY = 'sip-of-ghoulaid-saved-products';
const ORDER_KEY = 'sip-of-ghoulaid-demo-orders';
const DISCOUNT_KEY = 'sip-of-ghoulaid-discounts';
const ACTIVE_DISCOUNT_KEY = 'sip-of-ghoulaid-active-discount';
const VISITOR_KEY = 'sip-of-ghoulaid-visitor-count';
const VISIT_SESSION_KEY = 'sip-of-ghoulaid-visit-recorded';
const CUSTOMER_AUTH_API = '/api/customer-auth';
const CUSTOM_ORDER_FORM_ENDPOINT = 'https://formspree.io/f/xljdrldq';
const CUSTOM_ORDER_API = '/api/custom-orders';
const defaultCatalog = window.SIP_OF_GHOULAID_CATALOG || [
    { id: 'xl-melts', name: 'Extra Large Wax Melts', category: 'Wax Melts', icon: '🕯️', price: 16, stock: 8, description: 'Hand-poured and hand-painted statement melts. Pick your scent family!', image: '', available: true },
    { id: 'full-melts', name: 'Full Size Wax Melts', category: 'Wax Melts', icon: '🔥', price: 9, stock: 12, description: 'Spooky scents ready to haunt every corner of your space.', image: '', available: true },
    { id: 'mini-melts', name: 'Mini Wax Melts', category: 'Wax Melts', icon: '✨', price: 5, stock: 18, description: 'Small but mighty creepy-cute designs for a tiny dose of chaos.', image: '', available: true },
    { id: 'book-accessories', name: 'Book Accessories', category: 'Accessories', icon: '📚', price: 7, stock: 10, description: 'Bookmarks and reading companions for the delightfully unhinged.', image: '', available: true },
    { id: 'headset-holder', name: 'Headset Holder', category: 'Accessories', icon: '🎧', price: 22, stock: 4, description: '3D-printed custom designs to keep your setup spooky.', image: '', available: true },
    { id: 'gift-boxes', name: 'Gift Boxes', category: 'Gift Boxes', icon: '🎁', price: 28, stock: 6, description: 'Curated collections for gifting your favorite ghoul.', image: '', available: true }
];
const LEGACY_DEFAULT_IDS = ['xl-melts', 'full-melts', 'mini-melts', 'book-accessories', 'headset-holder', 'gift-boxes'];
const PRODUCT_CATEGORY_MAP = {
    '121119213': ['Holders/Planters'],
    '121113183': ['Wax Melts', 'Custom Orders'],
    '121111551': ['Mini and Micro Melts', 'Custom Orders'],
    '121111353': ['Wax Melts'],
    '121109868': ['Wax Melts'],
    '121059912': ['Book Accessories'],
    '121008330': ['Book Accessories'],
    '121008153': ['Headset Holder'],
    '121007163': ['Headset Holder'],
    '121002057': ['Headset Holder'],
    '119665884': ['Book Accessories', 'Smut Exclusives'],
    '119394915': ['Headset Holder'],
    '119292498': ['Holders/Planters'],
    '118842948': ['Wax Melts'],
    '118842819': ['Wax Melts']
};
let audioContext;
let masterGain;
let masterGainConnected = false;
const AUDIO_VOLUME_KEY = 'sip-of-ghoulaid-audio-volume';
const VOLUME_LEVELS = [
    { value: 1, icon: '🔊', label: 'Sound: full volume' },
    { value: 0.65, icon: '🔉', label: 'Sound: medium volume' },
    { value: 0.3, icon: '🔈', label: 'Sound: low volume' },
    { value: 0, icon: '🔇', label: 'Sound: muted' }
];
const savedAudioVolume = localStorage.getItem(AUDIO_VOLUME_KEY);
let volumeIndex = savedAudioVolume === null ? 0 : Math.max(0, VOLUME_LEVELS.findIndex((level) => level.value === Number(savedAudioVolume)));
let featuredProductId = '';

function getCatalog() {
    try {
        const savedCatalog = JSON.parse(localStorage.getItem(CATALOG_KEY));
        if (!Array.isArray(savedCatalog)) return defaultCatalog.map(normalizeProduct);
        const isLegacyDemoCatalog = savedCatalog.length === LEGACY_DEFAULT_IDS.length
            && savedCatalog.every((product) => LEGACY_DEFAULT_IDS.includes(product.id));
        return (isLegacyDemoCatalog ? defaultCatalog : savedCatalog).map(normalizeProduct);
    } catch {
        return defaultCatalog.map(normalizeProduct);
    }
}

function normalizeProduct(product) {
        const fallback = {
            id: `${product.id}-default`, name: 'Default', price: Number(product.price || 0),
            stock: Math.max(0, Number(product.stock || 0)), options: {}
        };
        const variants = Array.isArray(product.variants) && product.variants.length
            ? product.variants.map((variant, index) => ({
                id: String(variant.id || `${product.id}-variant-${index + 1}`), name: String(variant.name || 'Default'),
                price: Number(variant.price ?? product.price ?? 0), stock: Math.max(0, Number(variant.stock ?? product.stock ?? 0)),
                options: variant.options && typeof variant.options === 'object' ? variant.options : {}
            }))
            : [fallback];
        return { ...product, variants, price: Math.min(...variants.map((variant) => variant.price)), stock: variants.reduce((sum, variant) => sum + variant.stock, 0) };
}

function getVariant(product, variantId) {
        return normalizeProduct(product).variants.find((variant) => variant.id === variantId);
}

function selectedVariant(product, selections = {}) {
        return normalizeProduct(product).variants.find((variant) => Object.entries(selections).every(([name, value]) => variant.options[name] === value));
}

function productOptionValues(product) {
        const values = new Map();
        normalizeProduct(product).variants.forEach((variant) => Object.entries(variant.options).forEach(([name, value]) => {
            if (!values.has(name)) values.set(name, new Set());
            values.get(name).add(value);
        }));
        return values;
}

function cartItemVariant(catalog, item) {
        const product = catalog.find((entry) => entry.id === item.id);
        return product && (getVariant(product, item.variantId || `${item.id}-default`) || normalizeProduct(product).variants[0]);
}

function getCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(savedCart) ? savedCart : [];
    } catch {
        return [];
    }
}

function getProductCategories(product) {
    return product.categories || PRODUCT_CATEGORY_MAP[product.id] || [product.category];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getSavedProductIds() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
        return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === 'string'))] : [];
    } catch {
        return [];
    }
}

function toggleSavedProduct(productId) {
    const saved = getSavedProductIds();
    const next = saved.includes(productId) ? saved.filter((id) => id !== productId) : [...saved, productId];
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    renderCatalog();
    renderSavedProducts();
}

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
        const discounts = JSON.parse(localStorage.getItem(DISCOUNT_KEY));
        return Array.isArray(discounts) ? discounts.map((discount) => ({
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

function getDiscountResult(discount, cart, catalog, subtotal) {
    const today = new Date().toISOString().slice(0, 10);
    if ((discount.start && discount.start > today)
        || (discount.expiry === 'date' && discount.endDate && discount.endDate < today)
        || (discount.expiry === 'uses' && discount.maxUses && discount.uses >= discount.maxUses)) return null;
    const items = cart.filter((item) => {
        const product = catalog.find((entry) => entry.id === item.id);
        return discount.scope === 'all' || (discount.scope === 'category' && product.category === discount.target)
            || (discount.scope === 'product' && product.name === discount.target);
    });
    const eligibleSubtotal = items.reduce((sum, item) => {
        const variant = cartItemVariant(catalog, item);
        return sum + Number(variant?.price || 0) * item.quantity;
    }, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (!items.length || (discount.condition === 'minimum-amount' && subtotal < discount.threshold)
        || (discount.condition === 'minimum-items' && itemCount < discount.threshold)) return null;
    const amount = discount.type === 'percent' ? eligibleSubtotal * discount.amount / 100
        : discount.type === 'amount-order' ? Math.min(discount.amount, eligibleSubtotal)
            : discount.type === 'amount-item' ? Math.min(discount.amount * items.reduce((sum, item) => sum + item.quantity, 0), eligibleSubtotal) : 0;
    return { discount, savings: amount, freeShipping: discount.type === 'free-shipping' };
}

function resolveDiscount(cart, catalog, subtotal) {
    const activeCode = sessionStorage.getItem(ACTIVE_DISCOUNT_KEY);
    const candidates = getDiscounts().filter((discount) => discount.automatic || discount.code === activeCode)
        .map((discount) => getDiscountResult(discount, cart, catalog, subtotal)).filter(Boolean);
    return candidates.sort((a, b) => b.savings - a.savings)[0] || null;
}

function recordVisit() {
    if (sessionStorage.getItem(VISIT_SESSION_KEY)) return;
    const visitors = Number(localStorage.getItem(VISITOR_KEY) || 0);
    localStorage.setItem(VISITOR_KEY, String(visitors + 1));
    sessionStorage.setItem(VISIT_SESSION_KEY, 'true');
}

function escapeHtml(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
}

async function readApiJson(response) {
    const body = await response.text();
    let data;
    try {
        data = body ? JSON.parse(body) : null;
    } catch {
        throw new Error('The local service returned an unexpected response. Open the shop through the local server instead of file://.');
    }
    if (!response.ok) throw new Error((data && data.error) || `The local service could not complete this request (${response.status}).`);
    if (!data || typeof data !== 'object') {
        throw new Error('The local service returned no data. Start the local server and reload this page.');
    }
    return data;
}

function setCustomerSession(session) {
    const signedIn = Boolean(session && session.authenticated);
    document.getElementById('customerSignedOut').classList.toggle('hidden', signedIn);
    document.getElementById('customerSignedIn').classList.toggle('hidden', !signedIn);
    document.getElementById('customerAccountName').textContent = signedIn ? session.username : '';
}

function refreshCustomerSession() {
    return fetch(`${CUSTOMER_AUTH_API}/session`, { credentials: 'same-origin' })
        .then(readApiJson)
        .then((session) => setCustomerSession(session))
        .catch((error) => {
            setCustomerSession(null);
            const message = document.getElementById('customerLoginMessage');
            if (message) message.textContent = error.message || 'Start the local server to sign in.';
        });
}

function getAudioOutput() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = audioContext || new AudioContextClass();
    masterGain = masterGain || audioContext.createGain();
    if (!masterGainConnected) {
        masterGain.connect(audioContext.destination);
        masterGainConnected = true;
    }
    masterGain.gain.setValueAtTime(VOLUME_LEVELS[volumeIndex].value, audioContext.currentTime);
    return masterGain;
}

function updateVolumeControl() {
    const level = VOLUME_LEVELS[volumeIndex];
    volumeBtn.textContent = level.icon;
    volumeBtn.setAttribute('aria-label', level.label);
    volumeBtn.setAttribute('aria-pressed', String(level.value === 0));
    localStorage.setItem(AUDIO_VOLUME_KEY, String(level.value));
    if (audioContext && masterGain) masterGain.gain.setValueAtTime(level.value, audioContext.currentTime);
}

function playClickSound() {
    try {
        const output = getAudioOutput();
        if (!output || VOLUME_LEVELS[volumeIndex].value === 0) return;
        if (audioContext.state === 'suspended') audioContext.resume();

        const now = audioContext.currentTime;
        const createTone = (frequency, type, duration, volume) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            oscillator.connect(gain);
            gain.connect(output);
            oscillator.start(now);
            oscillator.stop(now + duration);
        };

        createTone(1650, 'square', 0.028, 0.055);
        createTone(670, 'triangle', 0.052, 0.11);
    } catch (error) {
        console.warn('Unable to play TV click sound.', error);
    }
}

const channels = document.querySelectorAll('.channel');
const screenContent = document.getElementById('screenContent');
const channelStatus = document.getElementById('channelStatus');
const returnHomeButton = document.getElementById('returnHomeButton');
const guideToggle = document.getElementById('guideToggle');
const guideOptions = document.getElementById('guideOptions');
const guideLabel = document.getElementById('guideLabel');
const guideChannels = document.querySelectorAll('[data-channel]');
let isTuning = false;
const showChannel = (channelId) => {
    channels.forEach((channel) => channel.classList.toggle('active', channel.id === channelId));
    const activeGuideChannel = [...guideChannels].find((button) => button.dataset.channel === channelId);
    const channelNumber = [...guideChannels].indexOf(activeGuideChannel) + 1;
    guideLabel.textContent = `CH ${String(channelNumber).padStart(2, '0')} · ${activeGuideChannel.textContent.trim().replace(/^\d+\s*/, '')}`;
    channelStatus.textContent = `CHANNEL ${String(channelNumber).padStart(2, '0')}`;
};

function tuneToChannel(channelId) {
    if (isTuning) return;
    isTuning = true;
    guideToggle.disabled = true;
    guideOptions.hidden = true;
    guideToggle.setAttribute('aria-expanded', 'false');
    channelStatus.textContent = 'TUNING...';
    screenContent.classList.add('is-tuning');
    setTimeout(() => {
        showChannel(channelId);
        screenContent.classList.remove('is-tuning');
        guideToggle.disabled = false;
        isTuning = false;
    }, 430);
}

returnHomeButton.addEventListener('click', () => tuneToChannel('home'));

guideToggle.addEventListener('click', () => {
    const isOpen = !guideOptions.hidden;
    guideOptions.hidden = isOpen;
    guideToggle.setAttribute('aria-expanded', String(!isOpen));
});

guideChannels.forEach((button) => {
    button.addEventListener('click', () => tuneToChannel(button.dataset.channel));
});

document.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-channel-shortcut]');
    if (shortcut) tuneToChannel(shortcut.dataset.channelShortcut);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !guideOptions.hidden) {
        guideOptions.hidden = true;
        guideToggle.setAttribute('aria-expanded', 'false');
        guideToggle.focus();
    }
});

let activeCategory = 'all';
const shopGrid = document.getElementById('shopGrid');
const catalogEmpty = document.getElementById('catalogEmpty');
const productSearch = document.getElementById('productSearch');
function renderCatalog() {
    const searchTerm = productSearch.value.trim().toLowerCase();
    const savedProducts = new Set(getSavedProductIds());
    const products = getCatalog().filter((product) => product.available
        && (activeCategory === 'all' || getProductCategories(product).includes(activeCategory))
        && `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchTerm));
    shopGrid.innerHTML = products.map((product) => `
        <article class="product-card" data-product-url="product.html?id=${encodeURIComponent(product.id)}" tabindex="0" role="link" aria-label="View ${escapeHtml(product.name)}">
            ${renderProductMedia(product)}
            <p class="product-category">${escapeHtml(getProductCategories(product)[0])}</p>
            <h3><a class="product-details-button" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
            <p class="product-desc">${escapeHtml(product.description)}</p>
            <p class="product-price">$${Number(product.price || 0).toFixed(2)}</p>
            <span class="availability">${product.stock ? `${product.stock} IN STOCK` : 'SOLD OUT'}</span>
            <a class="add-to-cart" href="product.html?id=${encodeURIComponent(product.id)}">${product.stock ? 'CHOOSE OPTIONS' : 'SOLD OUT'}</a>
            <button class="save-product-button" type="button" data-save-product="${escapeHtml(product.id)}" aria-pressed="${savedProducts.has(product.id)}">${savedProducts.has(product.id) ? '♥ SAVED' : '♡ SAVE DROP'}</button>
        </article>`).join('');
    catalogEmpty.textContent = searchTerm ? 'No drops match that search. Try another spooky word.' : 'The crypt is being restocked. Check back soon, ghoul.';
    catalogEmpty.classList.toggle('hidden', products.length > 0);
}

function renderSavedProducts() {
    const savedItems = document.getElementById('savedItems');
    const savedEmpty = document.getElementById('savedEmpty');
    const savedProducts = getSavedProductIds().map((id) => getCatalog().find((product) => product.id === id && product.available)).filter(Boolean);
    savedItems.innerHTML = savedProducts.map((product) => `
        <article class="product-card" data-product-url="product.html?id=${encodeURIComponent(product.id)}" tabindex="0" role="link" aria-label="View ${escapeHtml(product.name)}">
            ${renderProductMedia(product)}
            <p class="product-category">${escapeHtml(getProductCategories(product)[0])}</p>
            <h3><a class="product-details-button" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
            <p class="product-price">$${Number(product.price || 0).toFixed(2)}</p>
            <a class="add-to-cart" href="product.html?id=${encodeURIComponent(product.id)}">VIEW DROP</a>
            <button class="save-product-button" type="button" data-save-product="${escapeHtml(product.id)}" aria-pressed="true">♥ REMOVE</button>
        </article>`).join('');
    savedEmpty.classList.toggle('hidden', savedProducts.length > 0);
}

function showProductDetails(productId) {
    const product = getCatalog().find((entry) => entry.id === productId && entry.available);
    if (!product) return;
    const details = document.getElementById('productDetails');
    const optionValues = productOptionValues(product);
    const selectors = [...optionValues.entries()].map(([name, values]) => `
        <label class="variant-option">${escapeHtml(name)}
            <select data-variant-option="${escapeHtml(name)}">
                <option value="">Choose ${escapeHtml(name)}</option>
                ${[...values].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}
            </select>
        </label>`).join('');
    details.innerHTML = `
        <button class="product-details-close" type="button" data-close-product-details aria-label="Close product details">×</button>
        <div class="product-details-media">${renderProductMedia(product)}</div>
        <div>
            <p class="product-category">${escapeHtml(getProductCategories(product)[0])}</p>
            <h2>${escapeHtml(product.name)}</h2>
            <p>${escapeHtml(product.description)}</p>
            <p class="product-price" data-selected-price>SELECT OPTIONS</p>
            ${selectors}
            <p class="availability" data-variant-availability aria-live="polite">Choose an in-stock option.</p>
            <button class="add-to-cart" type="button" data-add-variant="${escapeHtml(product.id)}" disabled>CHOOSE OPTIONS</button>
        </div>`;
    details.classList.remove('hidden');
    updateVariantSelection(productId);
    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateVariantSelection(productId) {
    const product = getCatalog().find((entry) => entry.id === productId);
    const details = document.getElementById('productDetails');
    const selections = Object.fromEntries([...details.querySelectorAll('[data-variant-option]')].map((select) => [select.dataset.variantOption, select.value]));
    const variant = selectedVariant(product, selections);
    const complete = [...productOptionValues(product).keys()].every((name) => selections[name]);
    const button = details.querySelector('[data-add-variant]');
    const availability = details.querySelector('[data-variant-availability]');
    const price = details.querySelector('[data-selected-price]');
    const valid = complete && variant && variant.stock > 0;
    price.textContent = variant ? `$${variant.price.toFixed(2)}` : 'OPTION UNAVAILABLE';
    availability.textContent = !complete ? 'Choose an option.' : valid ? `${variant.stock} IN STOCK` : 'SOLD OUT';
    button.disabled = !valid;
    button.textContent = valid ? 'ADD TO CART' : !complete ? 'CHOOSE OPTIONS' : 'SOLD OUT';
    button.dataset.variantId = valid ? variant.id : '';
}

function renderProductMedia(product) {
    const mediaUrl = product.mediaUrl || product.image;
    if (!mediaUrl) return `<div class="product-image" aria-hidden="true">${escapeHtml(product.icon || '👻')}</div>`;
    if (product.mediaType === 'video') {
        return `<video class="product-photo product-video" controls muted loop playsinline aria-label="${escapeHtml(product.name)} product video"><source src="${escapeHtml(mediaUrl)}">Your browser cannot play this product video.</video>`;
    }
    return `<img class="product-photo" src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(product.name)}">`;
}

function renderCart(discountNotice = '') {
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    const cartCount = document.getElementById('cartCount');
    const catalog = getCatalog();
    const savedCart = getCart();
    const cart = savedCart.map((item) => {
        const variant = cartItemVariant(catalog, item);
        return variant ? { ...item, variantId: variant.id, quantity: Math.min(Math.max(1, Number(item.quantity) || 1), variant.stock) } : null;
    }).filter(Boolean).filter((item) => item.quantity > 0);
    if (JSON.stringify(savedCart) !== JSON.stringify(cart)) saveCart(cart);
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => {
        const variant = cartItemVariant(catalog, item);
        return sum + Number(variant.price || 0) * item.quantity;
    }, 0);
    const applied = resolveDiscount(cart, catalog, subtotal);
    const discountAmount = applied ? applied.savings : 0;
    const shipping = cart.length && !applied?.freeShipping ? 6.95 : 0;
    const total = subtotal - discountAmount + shipping;

    cartCount.textContent = totalItems;
    cartItems.innerHTML = cart.map((item) => {
        const product = catalog.find((entry) => entry.id === item.id);
        const variant = cartItemVariant(catalog, item);
        return `<article class="cart-item">
            <div><strong>${escapeHtml(product.name)}</strong><p>${escapeHtml(variant.name)}${Object.keys(variant.options).length ? ` · ${escapeHtml(Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(', '))}` : ''}</p><p>$${Number(variant.price || 0).toFixed(2)} each</p></div>
            <div class="cart-item-actions">
                <button type="button" data-cart-action="decrease" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}" aria-label="Remove one ${escapeHtml(product.name)}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-action="increase" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}" ${item.quantity >= variant.stock ? 'disabled' : ''} aria-label="Add one ${escapeHtml(product.name)}">+</button>
                <button type="button" data-cart-action="remove" data-product-id="${escapeHtml(product.id)}" data-variant-id="${escapeHtml(variant.id)}">REMOVE</button>
            </div>
        </article>`;
    }).join('');
    cartEmpty.classList.toggle('hidden', cart.length > 0);
    cartSummary.classList.toggle('hidden', cart.length === 0);
    document.getElementById('cartQuantity').textContent = totalItems;
    document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cartDiscount').textContent = `−$${discountAmount.toFixed(2)}`;
    document.getElementById('cartShipping').textContent = applied?.freeShipping ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('discountMessage').textContent = applied
        ? `${applied.discount.code}: ${applied.discount.description || 'discount'} applied.${applied.freeShipping ? ' Free shipping applies at a real checkout; this demo has no shipping charge.' : ''}`
        : discountNotice;
}

function addToCart(productId, variantId) {
    const product = getCatalog().find((entry) => entry.id === productId);
    const variant = product && getVariant(product, variantId);
    if (!variant || variant.stock < 1) return;
    const cart = getCart();
    const item = cart.find((entry) => entry.id === productId && entry.variantId === variant.id);
    if (item && item.quantity < variant.stock) item.quantity += 1;
    else if (!item) cart.push({ id: productId, variantId: variant.id, quantity: 1 });
    saveCart(cart);
    renderCart();
}

function renderFeaturedDrop(rotate = false) {
    const featuredDrop = document.getElementById('featuredDrop');
    const featuredProducts = getCatalog().filter((product) => product.available);
    let featuredProduct = featuredProducts.find((product) => product.id === featuredProductId);
    if (rotate && featuredProducts.length > 1) {
        const otherProducts = featuredProducts.filter((product) => product.id !== featuredProductId);
        featuredProduct = otherProducts[Math.floor(Math.random() * otherProducts.length)];
    }
    featuredProduct = featuredProduct || featuredProducts[0];
    if (!featuredProduct) {
        featuredDrop.innerHTML = '<p class="featured-empty">THE FEATURED DROP IS RESTOCKING. TUNE IN SOON.</p>';
        return;
    }
    featuredProductId = featuredProduct.id;
    featuredDrop.innerHTML = `<div class="featured-content">
        <div class="featured-visual">${featuredProduct.mediaUrl || featuredProduct.image ? renderProductMedia(featuredProduct) : escapeHtml(featuredProduct.icon || '👻')}</div>
        <div class="featured-copy">
            <p class="featured-kicker">TONIGHT'S FEATURED DROP</p>
            <h2>${escapeHtml(featuredProduct.name)}</h2>
            <p>${escapeHtml(featuredProduct.description)}</p>
            <div class="featured-meta"><strong>$${Number(featuredProduct.price || 0).toFixed(2)}</strong><span>${Number(featuredProduct.stock || 0)} IN STOCK</span></div>
            <button class="featured-cta" type="button" data-channel-shortcut="shop">TUNE TO SHOP →</button>
        </div></div>`;
}

document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
        activeCategory = button.dataset.category;
        document.querySelectorAll('.filter-btn').forEach((filter) => filter.classList.toggle('active', filter === button));
        renderCatalog();
    });
});

productSearch.addEventListener('input', renderCatalog);
document.addEventListener('change', (event) => {
    const option = event.target.closest('[data-variant-option]');
    if (option) updateVariantSelection(document.getElementById('productDetails').querySelector('[data-add-variant]').dataset.addVariant);
});

document.addEventListener('click', (event) => {
    const productCard = event.target.closest('[data-product-url]');
    if (productCard && !event.target.closest('a, button, input, select, textarea, label')) {
        window.location.assign(productCard.dataset.productUrl);
        return;
    }
    const saveButton = event.target.closest('[data-save-product]');
    if (saveButton) {
        toggleSavedProduct(saveButton.dataset.saveProduct);
        return;
    }
    const addButton = event.target.closest('[data-add-to-cart]');
    if (addButton) {
        showProductDetails(addButton.dataset.productDetails);
        return;
    }
    const variantButton = event.target.closest('[data-add-variant]');
    if (variantButton) {
        addToCart(variantButton.dataset.addVariant, variantButton.dataset.variantId);
        return;
    }
    const detailsButton = event.target.closest('[data-product-details]');
    if (detailsButton) {
        showProductDetails(detailsButton.dataset.productDetails);
        return;
    }
    if (event.target.closest('[data-close-product-details]')) {
        document.getElementById('productDetails').classList.add('hidden');
        return;
    }
    const cartButton = event.target.closest('[data-cart-action]');
    if (!cartButton) return;
    const cart = getCart();
    const item = cart.find((entry) => entry.id === cartButton.dataset.productId && entry.variantId === cartButton.dataset.variantId);
    if (!item) return;
    const variant = cartItemVariant(getCatalog(), item);
    if (cartButton.dataset.cartAction === 'increase' && item.quantity < variant.stock) item.quantity += 1;
    if (cartButton.dataset.cartAction === 'decrease') item.quantity -= 1;
    const updatedCart = cartButton.dataset.cartAction === 'remove'
        ? cart.filter((entry) => entry !== item)
        : cart.filter((entry) => entry.quantity > 0);
    saveCart(updatedCart);
    renderCart();
});

document.addEventListener('keydown', (event) => {
    const productCard = event.target.closest('[data-product-url]');
    if (productCard && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        window.location.assign(productCard.dataset.productUrl);
    }
});

document.getElementById('clearCartButton').addEventListener('click', () => {
    saveCart([]);
    document.getElementById('checkoutPanel').classList.add('hidden');
    renderCart();
});
document.getElementById('customerLoginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('customerLoginMessage');
    message.textContent = 'Checking your signal...';
    fetch(`${CUSTOMER_AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ identity: document.getElementById('customerIdentity').value.trim(), password: document.getElementById('customerPassword').value })
    }).then(readApiJson).then((data) => {
        event.target.reset();
        setCustomerSession({ authenticated: true, username: data.username });
    }).catch((error) => { message.textContent = error.message || 'The local sign-in service is unavailable.'; });
});
document.getElementById('customerRegisterForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('customerRegisterMessage');
    message.textContent = 'Creating your account...';
    fetch(`${CUSTOMER_AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            username: document.getElementById('customerUsername').value.trim(),
            email: document.getElementById('customerEmail').value.trim(),
            password: document.getElementById('customerNewPassword').value
        })
    }).then(readApiJson).then((data) => {
        event.target.reset();
        setCustomerSession({ authenticated: true, username: data.username });
    }).catch((error) => { message.textContent = error.message || 'The local account could not be created.'; });
});
document.getElementById('customerLogoutButton').addEventListener('click', () => {
    fetch(`${CUSTOMER_AUTH_API}/logout`, { method: 'POST', credentials: 'same-origin' }).finally(() => setCustomerSession(null));
});
document.getElementById('applyDiscountButton').addEventListener('click', () => {
    const code = document.getElementById('cartDiscountCode').value.trim().toUpperCase();
    const discount = getDiscounts().find((item) => item.code === code);
    if (!discount) {
        sessionStorage.removeItem(ACTIVE_DISCOUNT_KEY);
    } else {
        sessionStorage.setItem(ACTIVE_DISCOUNT_KEY, discount.code);
    }
    renderCart(discount ? '' : 'That discount code is not active.');
});

async function beginCheckout() {
    const checkoutButton = document.getElementById('checkoutButton');
    const checkoutPanel = document.getElementById('checkoutPanel');
    const checkoutTitle = document.getElementById('checkoutPanelTitle');
    const checkoutDescription = document.getElementById('checkoutPanelDescription');
    const checkoutMessage = document.getElementById('checkoutMessage');
    const cart = getCart();
    const catalog = getCatalog();
    checkoutPanel.classList.remove('hidden');
    checkoutPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!cart.length) return;

    checkoutButton.disabled = true;
    checkoutMessage.textContent = 'Checking the secure checkout signal...';
    try {
        const configResponse = await fetch('/api/commerce/config', { credentials: 'same-origin' });
        const config = await readApiJson(configResponse);
        if (!config.enabled) {
            checkoutTitle.textContent = 'CHECKOUT';
            checkoutDescription.textContent = 'Local prototype: complete this form to record an order in this browser. No payment is collected, and tax/shipping are estimates only.';
            checkoutMessage.textContent = config.message || 'Secure checkout is not configured. You can still record a local demo order.';
            return;
        }

        checkoutTitle.textContent = 'SECURE CHECKOUT';
        checkoutDescription.textContent = 'Your order, price, and stock are verified by the secure server before Stripe Checkout opens.';
        checkoutMessage.textContent = 'Reserving your items and opening secure checkout...';
        const response = await fetch('/api/commerce/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ items: cart.map(({ id, variantId, quantity }) => ({
                id, variantId: variantId || cartItemVariant(catalog, { id, variantId }).id, quantity
            })) })
        });
        const result = await readApiJson(response);
        if (!result.url) throw new Error('Secure checkout could not be started.');
        window.location.assign(result.url);
    } catch (error) {
        checkoutTitle.textContent = 'CHECKOUT';
        checkoutDescription.textContent = 'Secure checkout could not be reached. Your cart is unchanged; you can retry or record a local demo order.';
        checkoutMessage.textContent = error.message || 'The secure checkout service is unavailable.';
    } finally {
        checkoutButton.disabled = false;
    }
}

document.getElementById('checkoutButton').addEventListener('click', beginCheckout);

document.getElementById('demoCheckoutForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) return;
    const catalog = getCatalog();
    const subtotal = cart.reduce((sum, item) => {
        const variant = cartItemVariant(catalog, item);
        return sum + Number(variant ? variant.price : 0) * item.quantity;
    }, 0);
    const applied = resolveDiscount(cart, catalog, subtotal);
    const discountAmount = applied ? applied.savings : 0;
    const shipping = applied?.freeShipping ? 0 : 6.95;
    const total = subtotal - discountAmount + shipping;
    const customer = {
        name: document.getElementById('checkoutName').value.trim(),
        email: document.getElementById('checkoutEmail').value.trim(),
        phone: document.getElementById('checkoutPhone').value.trim(),
        address: document.getElementById('checkoutAddress').value.trim(),
        city: document.getElementById('checkoutCity').value.trim(),
        state: document.getElementById('checkoutState').value.trim(),
        postalCode: document.getElementById('checkoutPostalCode').value.trim()
    };
    const orders = getOrders();
    orders.push({ id: `demo-${Date.now()}`, type: 'store-order', status: 'Demo order recorded', createdAt: new Date().toISOString(), subtotal, discountAmount, shipping, total, customer, items: cart, discountCode: applied ? applied.discount.code : '' });
    localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
    if (applied) {
        const discounts = getDiscounts().map((discount) => discount.code === applied.discount.code
            ? { ...discount, uses: discount.uses + 1 } : discount);
        localStorage.setItem(DISCOUNT_KEY, JSON.stringify(discounts));
    }
    saveCart([]);
    sessionStorage.removeItem(ACTIVE_DISCOUNT_KEY);
    renderCart();
    event.target.reset();
    document.getElementById('checkoutMessage').textContent = `Demo order recorded for ${customer.name}. No payment was taken and no real order was created.`;
});

const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');
customOrderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(customOrderForm);
    const details = Object.fromEntries(formData.entries());
    details.scent = formData.getAll('scent');
    details.specialEffects = ['glitter', 'glow'].filter((name) => formData.get(name) === 'yes');
    const submitButton = customOrderForm.querySelector('[type="submit"]');
    const submitMessage = document.getElementById('customOrderSubmitMessage');
    submitButton.disabled = true;
    submitMessage.textContent = 'Sending your request to the ghoul room...';
    formData.set('_subject', `Sip of Ghoulaid custom request from ${details.fullName || details.username}`);
    fetch(CUSTOM_ORDER_FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
    }).then(async (response) => {
        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.errors?.map((item) => item.message).join(' ') || 'Formspree could not accept your request. Please try again.');
        }
        let hostedOrderId = '';
        let hostedStorageMessage = '';
        try {
            const hostedResponse = await fetch(CUSTOM_ORDER_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: details.fullName,
                    customerUsername: details.username,
                    contactMethod: details.contactMethod,
                    contactInfo: details.contactInfo,
                    customizationLevel: details.customizationLevel,
                    details,
                    formspreeDelivered: true
                })
            });
            if (hostedResponse.ok) {
                const hostedOrder = await hostedResponse.json();
                hostedOrderId = hostedOrder.id;
            } else if (hostedResponse.status === 404 || hostedResponse.status === 405 || hostedResponse.status === 503) {
                hostedStorageMessage = 'It is available to the owner by email; hosted request storage is not configured yet.';
            } else {
                const hostedError = await hostedResponse.json().catch(() => null);
                hostedStorageMessage = hostedError?.error || 'It is available to the owner by email; the hosted request record could not be saved.';
            }
        } catch (error) {
            hostedStorageMessage = `It is available to the owner by email; hosted request storage could not be reached (${error.message}).`;
        }
        const orders = getOrders();
        const id = `custom-${Date.now()}`;
        orders.push({ id, type: 'custom-request', status: 'Sent to owner', createdAt: new Date().toISOString(), total: 0, customer: { name: details.fullName || '', contact: details.contactInfo || '', contactMethod: details.contactMethod || '' }, details });
        localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
        customOrderForm.hidden = true;
        orderSuccess.classList.remove('hidden');
        document.getElementById('customOrderMessage').textContent = hostedOrderId
            ? `Request ${hostedOrderId} was sent to the owner and stored securely for review. No payment was taken.`
            : `Request ${id} was sent to the owner and saved in this browser for local review. ${hostedStorageMessage} No payment was taken.`;
    }).catch((error) => {
        submitMessage.textContent = error.message || 'Your request could not be sent. Check your connection and try again.';
    }).finally(() => {
        submitButton.disabled = false;
    });
});
customOrderForm.addEventListener('reset', () => {
    orderSuccess.classList.add('hidden');
    document.getElementById('customOrderSubmitMessage').textContent = '';
});
const additionalSetCountGroup = document.getElementById('additionalSetCountGroup');
const additionalSetCount = document.getElementById('additionalSetCount');
document.querySelectorAll('input[name="additionalSets"]').forEach((input) => input.addEventListener('change', () => {
    const wantsAdditionalSets = input.value === 'yes' && input.checked;
    additionalSetCountGroup.hidden = !wantsAdditionalSets;
    additionalSetCount.required = wantsAdditionalSets;
    if (!wantsAdditionalSets) additionalSetCount.value = '';
}));
document.getElementById('newCustomRequestButton').addEventListener('click', () => {
    customOrderForm.reset();
    customOrderForm.hidden = false;
    orderSuccess.classList.add('hidden');
    document.getElementById('fullName').focus();
});

const powerBtn = document.getElementById('powerBtn');
let isPoweredOn = true;
let powerOffTimer;
powerBtn.addEventListener('click', () => {
    isPoweredOn = !isPoweredOn;
    const screen = document.getElementById('screenContent');
    clearTimeout(powerOffTimer);
    if (isPoweredOn) {
        screen.classList.remove('is-powering-down', 'screen-off');
    } else {
        screen.classList.add('is-powering-down');
        powerOffTimer = setTimeout(() => {
            if (!isPoweredOn) screen.classList.replace('is-powering-down', 'screen-off');
        }, 420);
    }
    powerBtn.setAttribute('aria-pressed', String(!isPoweredOn));
});

const volumeBtn = document.getElementById('volumeBtn');
volumeBtn.addEventListener('click', () => {
    volumeIndex = (volumeIndex + 1) % VOLUME_LEVELS.length;
    updateVolumeControl();
});

document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, a, input[type="radio"], input[type="checkbox"]')) {
        playClickSound();
    }
});

let storefrontInitialized = false;
function initializeStorefront() {
    if (storefrontInitialized) return;
    storefrontInitialized = true;
    recordVisit();
    const requestedChannel = new URLSearchParams(window.location.search).get('channel');
    const initialChannel = [...channels].some((channel) => channel.id === requestedChannel) ? requestedChannel : 'home';
    showChannel(initialChannel);
    renderCatalog();
    renderCart();
    renderSavedProducts();
    renderFeaturedDrop();
    refreshCustomerSession();
    updateVolumeControl();
    setInterval(() => renderFeaturedDrop(true), 5000);
    setTimeout(() => {
        screenContent.classList.remove('is-booting');
        const bootOverlay = document.getElementById('tvBoot');
        if (bootOverlay) bootOverlay.remove();
    }, 2100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStorefront, { once: true });
} else {
    initializeStorefront();
}

window.addEventListener('storage', (event) => {
    if (event.key === CATALOG_KEY) {
        renderCatalog();
        renderFeaturedDrop();
        renderCart();
        renderSavedProducts();
    }
    if (event.key === SAVED_KEY) {
        renderCatalog();
        renderSavedProducts();
    }
});
