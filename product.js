const CATALOG_KEY = 'sip-of-ghoulaid-catalog';
const CART_KEY = 'sip-of-ghoulaid-cart';
const SAVED_KEY = 'sip-of-ghoulaid-saved-products';
const catalog = (() => {
    try {
        const saved = JSON.parse(localStorage.getItem(CATALOG_KEY));
        return Array.isArray(saved) ? saved : (window.SIP_OF_GHOULAID_CATALOG || []);
    } catch {
        return window.SIP_OF_GHOULAID_CATALOG || [];
    }
})();
const escapeHtml = (value) => {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
};
const normalizeProduct = (product) => {
    const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [{
        id: `${product.id}-default`, name: 'Default', price: product.price, stock: product.stock, options: {}
    }];
    return {
        ...product,
        variants: variants.map((variant, index) => ({
            id: String(variant.id || `${product.id}-variant-${index + 1}`),
            name: String(variant.name || 'Default'),
            price: Number(variant.price ?? product.price ?? 0),
            stock: Math.max(0, Number(variant.stock ?? product.stock ?? 0)),
            options: variant.options && typeof variant.options === 'object' ? variant.options : {}
        }))
    };
};
const getMediaItems = (product) => {
    const suppliedImages = Array.isArray(product.images) ? product.images : [];
    const items = [product.mediaUrl || product.image, ...suppliedImages].filter(Boolean).map((entry) => {
        if (typeof entry === 'string') return { url: entry, type: product.mediaType === 'video' ? 'video' : 'image' };
        return { url: entry.url, type: entry.type === 'video' ? 'video' : 'image' };
    }).filter((entry, index, entries) => entry.url && entries.findIndex((candidate) => candidate.url === entry.url) === index);
    return items.length ? items : [{ url: '', type: 'image' }];
};
const renderMedia = (media, product, className = 'product-photo') => {
    if (!media.url) return `<div class="product-image ${className}" aria-hidden="true">${escapeHtml(product.icon || '👻')}</div>`;
    return media.type === 'video'
        ? `<video class="${className} product-video" controls muted loop playsinline><source src="${escapeHtml(media.url)}"></video>`
        : `<img class="${className}" src="${escapeHtml(media.url)}" alt="${escapeHtml(product.name)}">`;
};
const getSavedProductIds = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const productId = new URLSearchParams(window.location.search).get('id');
const product = catalog.find((item) => item.id === productId && item.available);
const page = document.getElementById('productPage');

if (!product) {
    page.innerHTML = '<div><h1>PRODUCT NOT FOUND</h1><p>This drop may be unavailable or no longer listed.</p><a class="featured-cta" href="index.html">RETURN TO SHOP</a></div>';
} else {
    const item = normalizeProduct(product);
    const mediaItems = getMediaItems(item);
    document.title = `${item.name} | Sip of Ghoulaid`;
    const values = new Map();
    item.variants.forEach((variant) => Object.entries(variant.options).forEach(([name, value]) => {
        if (!values.has(name)) values.set(name, new Set());
        values.get(name).add(value);
    }));
    const selectors = [...values.entries()].map(([name, options]) => `<label class="variant-option">${escapeHtml(name)}
        <select data-option="${escapeHtml(name)}"><option value="">Choose ${escapeHtml(name)}</option>${[...options].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select>
    </label>`).join('');
    const recommendations = catalog.filter((candidate) => candidate.id !== item.id && candidate.available)
        .sort((left, right) => Number(right.category === item.category) - Number(left.category === item.category))
        .slice(0, 4);
    page.innerHTML = `<section class="product-main">
        <div class="product-gallery">
            <div id="productHeroMedia" class="product-hero-media">${renderMedia(mediaItems[0], item, 'product-hero-image')}</div>
            <div class="product-thumbnails" aria-label="Product images">
                ${mediaItems.map((media, index) => `<button class="product-thumbnail ${index === 0 ? 'active' : ''}" type="button" data-media-index="${index}" aria-label="View image ${index + 1}">${renderMedia(media, item, 'product-thumbnail-image')}</button>`).join('')}
            </div>
        </div>
        <div class="product-purchase">
            <p class="product-category">${escapeHtml(item.category)}</p><h1>${escapeHtml(item.name)}</h1>
            <p class="product-price" id="selectedPrice">SELECT OPTIONS</p>
            ${selectors}<p class="availability" id="selectedAvailability" aria-live="polite">Choose an in-stock option.</p>
            <button id="addVariantButton" class="add-to-cart" type="button" disabled>CHOOSE OPTIONS</button>
            <button id="saveProductButton" class="save-product-button" type="button"></button>
            <p id="productMessage" class="form-message" aria-live="polite"></p>
            <a id="viewCartButton" class="view-cart-button hidden" href="index.html?channel=cart">VIEW CART →</a>
            <div class="product-description"><h2>PRODUCT DESCRIPTION</h2><p>${escapeHtml(item.description)}</p></div>
        </div>
    </section>
    <section class="also-may-like"><h2>YOU ALSO MAY LIKE</h2><div class="recommendation-grid">
        ${recommendations.map((candidate) => {
            const candidateMedia = getMediaItems(candidate)[0];
            return `<a href="product.html?id=${encodeURIComponent(candidate.id)}">${renderMedia(candidateMedia, candidate, 'recommendation-image')}<span>${escapeHtml(candidate.name)}</span><strong>$${Number(candidate.price || 0).toFixed(2)}</strong></a>`;
        }).join('')}
    </div></section>`;
    const updateSelection = () => {
        const selections = Object.fromEntries([...page.querySelectorAll('[data-option]')].map((select) => [select.dataset.option, select.value]));
        const complete = [...values.keys()].every((name) => selections[name]);
        const variant = item.variants.find((entry) => Object.entries(selections).every(([name, value]) => entry.options[name] === value));
        const canBuy = complete && variant && variant.stock > 0;
        page.querySelector('#selectedPrice').textContent = variant ? `$${variant.price.toFixed(2)}` : 'OPTION UNAVAILABLE';
        page.querySelector('#selectedAvailability').textContent = !complete ? 'Choose an option.' : canBuy ? `${variant.stock} IN STOCK` : 'SOLD OUT';
        const button = page.querySelector('#addVariantButton');
        button.disabled = !canBuy;
        button.textContent = canBuy ? 'ADD TO CART' : !complete ? 'CHOOSE OPTIONS' : 'SOLD OUT';
        button.dataset.variantId = canBuy ? variant.id : '';
    };
    page.querySelectorAll('[data-option]').forEach((select) => select.addEventListener('change', updateSelection));
    const saveProductButton = page.querySelector('#saveProductButton');
    const renderSaveButton = () => {
        const saved = getSavedProductIds();
        const isSaved = saved.includes(item.id);
        saveProductButton.textContent = isSaved ? '♥ SAVED DROP' : '♡ SAVE DROP';
        saveProductButton.setAttribute('aria-pressed', String(isSaved));
    };
    saveProductButton.addEventListener('click', () => {
        const saved = getSavedProductIds();
        localStorage.setItem(SAVED_KEY, JSON.stringify(saved.includes(item.id) ? saved.filter((id) => id !== item.id) : [...saved, item.id]));
        renderSaveButton();
    });
    renderSaveButton();
    page.querySelectorAll('[data-media-index]').forEach((button) => button.addEventListener('click', () => {
        const index = Number(button.dataset.mediaIndex);
        page.querySelector('#productHeroMedia').innerHTML = renderMedia(mediaItems[index], item, 'product-hero-image');
        page.querySelectorAll('[data-media-index]').forEach((thumbnail) => thumbnail.classList.toggle('active', thumbnail === button));
    }));
    page.querySelector('#addVariantButton').addEventListener('click', () => {
        const button = page.querySelector('#addVariantButton');
        const variant = item.variants.find((entry) => entry.id === button.dataset.variantId);
        if (!variant) return;
        const cart = (() => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } })();
        const existing = cart.find((entry) => entry.id === item.id && entry.variantId === variant.id);
        if (existing && existing.quantity < variant.stock) existing.quantity += 1;
        else if (!existing) cart.push({ id: item.id, variantId: variant.id, quantity: 1 });
        else { page.querySelector('#productMessage').textContent = 'That option is already at its available stock limit.'; return; }
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        page.querySelector('#productMessage').textContent = 'Added to your haunted cart.';
        page.querySelector('#viewCartButton').classList.remove('hidden');
    });
    if (!values.size) {
        const onlyVariant = item.variants[0];
        page.querySelector('#selectedPrice').textContent = `$${onlyVariant.price.toFixed(2)}`;
        page.querySelector('#selectedAvailability').textContent = onlyVariant.stock ? `${onlyVariant.stock} IN STOCK` : 'SOLD OUT';
        const button = page.querySelector('#addVariantButton');
        button.disabled = !onlyVariant.stock;
        button.textContent = onlyVariant.stock ? 'ADD TO CART' : 'SOLD OUT';
        button.dataset.variantId = onlyVariant.id;
    }
}
