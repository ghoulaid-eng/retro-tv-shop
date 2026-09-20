const clickSound = document.getElementById('clickSound');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioContext = AudioContextClass ? new AudioContextClass() : null;
const channelSelector = document.getElementById('channelSelector');
const channels = document.querySelectorAll('.channel');
const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');
const powerBtn = document.getElementById('powerBtn');
const volumeBtn = document.getElementById('volumeBtn');
const staticOverlay = document.getElementById('staticOverlay');
const additionalSetCountGroup = document.getElementById('additionalSetCountGroup');
const additionalSetRadios = document.querySelectorAll('input[name="additionalSets"]');
const paymentMethodsList = document.getElementById('paymentMethodsList');
const paymentMethodSelect = document.getElementById('paymentMethod');
const paymentMethodInstructions = document.getElementById('paymentMethodInstructions');
const openAccountFromShopButton = document.getElementById('openAccountFromShop');
const shopAccountGreeting = document.getElementById('shopAccountGreeting');
const shopAccountSummary = document.getElementById('shopAccountSummary');
const accountGreeting = document.getElementById('accountGreeting');
const accountSummary = document.getElementById('accountSummary');
const accountVerificationStatus = document.getElementById('accountVerificationStatus');
const accountStatusMessage = document.getElementById('accountStatusMessage');
const signInForm = document.getElementById('signInForm');
const signInEmailInput = document.getElementById('signInEmail');
const signInPasswordInput = document.getElementById('signInPassword');
const signInStatusMessage = document.getElementById('signInStatusMessage');
const requestPasswordResetButton = document.getElementById('requestPasswordResetButton');
const signOutButton = document.getElementById('signOutButton');
const accountProfileForm = document.getElementById('accountProfileForm');
const accountFormTitle = document.getElementById('accountFormTitle');
const accountNameInput = document.getElementById('accountName');
const accountUsernameInput = document.getElementById('accountUsername');
const accountEmailInput = document.getElementById('accountEmail');
const accountContactMethodInput = document.getElementById('accountContactMethod');
const accountContactInfoInput = document.getElementById('accountContactInfo');
const accountPasswordInput = document.getElementById('accountPassword');
const accountPasswordConfirmInput = document.getElementById('accountPasswordConfirm');
const accountSubmitButton = document.getElementById('accountSubmitButton');
const resendVerificationButton = document.getElementById('resendVerificationButton');
const shippingProfileForm = document.getElementById('shippingProfileForm');
const shippingFullNameInput = document.getElementById('shippingFullName');
const shippingAddressLine1Input = document.getElementById('shippingAddressLine1');
const shippingAddressLine2Input = document.getElementById('shippingAddressLine2');
const shippingCityInput = document.getElementById('shippingCity');
const shippingStateInput = document.getElementById('shippingState');
const shippingPostalCodeInput = document.getElementById('shippingPostalCode');
const shippingCountryInput = document.getElementById('shippingCountry');
const shippingStatusMessage = document.getElementById('shippingStatusMessage');
const wishlistList = document.getElementById('wishlistList');
const cartList = document.getElementById('cartList');
const cartSummaryMessage = document.getElementById('cartSummaryMessage');
const cartStatusMessage = document.getElementById('cartStatusMessage');
const moveWishlistToCartButton = document.getElementById('moveWishlistToCartButton');
const clearCartButton = document.getElementById('clearCartButton');
const cartTotalsPanel = document.getElementById('cartTotalsPanel');
const cartSubtotalValue = document.getElementById('cartSubtotalValue');
const cartTaxValue = document.getElementById('cartTaxValue');
const cartShippingValue = document.getElementById('cartShippingValue');
const cartTotalValue = document.getElementById('cartTotalValue');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const contactMethodInput = document.getElementById('contactMethod');
const contactInfoInput = document.getElementById('contactInfo');

let isPoweredOn = true;
let volumeLevel = 100;
let touchStartX = 0;
let touchEndX = 0;
let shopProducts = [];
let availablePaymentMethods = [];
let savedUsers = [];
let currentUserState = {};
let wishlists = [];
let carts = [];
let currentSettings = {};
let currentMarketingState = {};
let currentAppCenterState = {};

function playClickSound() {
    if (!audioContext) {
        return;
    }

    try {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } catch (error) {
        console.log('Audio context error:', error);
    }
}

function bindClickSound(container = document) {
    container.querySelectorAll('.click-item').forEach(item => {
        if (item.dataset.clickSoundBound === 'true') {
            return;
        }

        item.addEventListener('click', () => {
            playClickSound();
        });
        item.dataset.clickSoundBound = 'true';
    });
}

function bindProductCardEffects(container = document) {
    container.querySelectorAll('.product-media-viewport').forEach(viewport => {
        if (viewport.dataset.retroSignalBound === 'true') {
            return;
        }

        viewport.addEventListener('mouseenter', () => {
            viewport.classList.add('retro-signal-boost');
        });
        viewport.addEventListener('mouseleave', () => {
            viewport.classList.remove('retro-signal-boost');
        });
        viewport.dataset.retroSignalBound = 'true';
    });
}

function setStatus(target, message) {
    if (target) {
        target.textContent = message;
    }
}

function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function getEffectivePrice(product) {
    return product.onSale && product.salePrice > 0 ? product.salePrice : product.listingPrice;
}

function getActiveUser() {
    return savedUsers.find(user => user.id === currentUserState.userId) || null;
}

function getUserDisplayName(user) {
    if (!user) {
        return 'guest';
    }

    return user.name || user.username || user.email || 'ghoul';
}

function findProduct(productId) {
    return shopProducts.find(product => product.id === productId) || null;
}

function getWishlistEntry(userId) {
    return wishlists.find(entry => entry.userId === userId) || { userId, productIds: [] };
}

function getCartEntry(userId) {
    return carts.find(entry => entry.userId === userId) || { userId, items: [] };
}

function getCartItemVariantLabel(item) {
    return item.variant || 'Standard';
}

function getCartItemKey(productId, variant = '') {
    return `${productId}::${variant}`;
}

function getCartQuantity(productId) {
    const activeUser = getActiveUser();
    if (!activeUser) {
        return 0;
    }

    return getCartEntry(activeUser.id).items
        .filter(item => item.productId === productId)
        .reduce((total, item) => total + item.quantity, 0);
}

function getDefaultVariant(product) {
    return product.variants[0] || '';
}

function getSelectedVariant(select, product) {
    if (!select) {
        return '';
    }

    return select.value || getDefaultVariant(product);
}

function getProductMedia(product) {
    return [
        ...product.images.map(src => ({ type: 'image', src })),
        ...product.videos.map(src => ({ type: 'video', src }))
    ];
}

function setActiveChannel(channelName) {
    if (!channelSelector) {
        return;
    }

    channelSelector.value = channelName;
    channelSelector.dispatchEvent(new Event('change'));
}

function renderSavedListMessage(target, message) {
    if (!target) {
        return;
    }

    target.replaceChildren();
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-products-message';
    emptyState.textContent = message;
    target.appendChild(emptyState);
}

function syncAccountData(user, wishlist, cart) {
    savedUsers = user ? [user] : [];
    currentUserState = user ? { userId: user.id, updatedAt: user.updatedAt } : {};
    wishlists = user ? [window.ShopData.normalizeWishlistEntry(wishlist || { userId: user.id, productIds: [] })] : [];
    carts = user ? [window.ShopData.normalizeCart(cart || { userId: user.id, items: [] })] : [];
}

async function loadAccountSession() {
    const { user, wishlist, cart } = await window.ShopData.getAccountBootstrap();
    syncAccountData(user, wishlist, cart);
    return user;
}

async function saveWishlistsWithLatest(applyChange) {
    const activeUser = getActiveUser();
    if (!activeUser) {
        return;
    }

    const nextWishlists = applyChange([getWishlistEntry(activeUser.id)]);
    const nextEntry = nextWishlists.find(entry => entry.userId === activeUser.id) || { userId: activeUser.id, productIds: [] };
    const savedWishlist = await window.ShopData.account.saveWishlist(nextEntry);
    syncAccountData(activeUser, savedWishlist, getCartEntry(activeUser.id));
    renderAccountState();
}

async function saveCartsWithLatest(applyChange) {
    const activeUser = getActiveUser();
    if (!activeUser) {
        return;
    }

    const nextCarts = applyChange([getCartEntry(activeUser.id)]);
    const nextEntry = nextCarts.find(entry => entry.userId === activeUser.id) || { userId: activeUser.id, items: [] };
    const savedCart = await window.ShopData.account.saveCart(nextEntry);
    syncAccountData(activeUser, getWishlistEntry(activeUser.id), savedCart);
    renderAccountState();
}

function ensureActiveUser(message) {
    const activeUser = getActiveUser();
    if (activeUser) {
        return activeUser;
    }

    setStatus(accountStatusMessage, message);
    setStatus(cartStatusMessage, message);
    setActiveChannel('account');
    return null;
}

function createPriceDisplay(product) {
    const wrapper = document.createElement('div');
    wrapper.className = 'product-price-block';

    if (product.onSale && product.salePrice > 0) {
        const original = document.createElement('span');
        original.className = 'price price-original';
        original.textContent = formatMoney(product.listingPrice);
        wrapper.appendChild(original);

        const sale = document.createElement('span');
        sale.className = 'price price-sale';
        sale.textContent = formatMoney(product.salePrice);
        wrapper.appendChild(sale);
    } else {
        const listing = document.createElement('span');
        listing.className = 'price';
        listing.textContent = formatMoney(product.listingPrice);
        wrapper.appendChild(listing);
    }

    return wrapper;
}

function createProductMedia(product) {
    const media = getProductMedia(product);
    if (!media.length) {
        const fallback = document.createElement('div');
        fallback.className = 'product-image retro-static-placeholder';
        fallback.textContent = product.emoji || '🛍️';
        return fallback;
    }

    const viewport = document.createElement('div');
    viewport.className = 'product-media-viewport';
    viewport.style.setProperty('--media-shift', `${Math.max(media.length - 1, 0) * -100}%`);

    const track = document.createElement('div');
    track.className = 'product-media-track';

    if (media.length > 1) {
        track.style.animationDuration = `${Math.max(media.length * 2.5, 5)}s`;
        track.style.animationTimingFunction = `steps(${media.length - 1}, end)`;
    } else {
        track.classList.add('product-media-track-static');
    }

    media.forEach((entry, index) => {
        const frame = document.createElement('div');
        frame.className = 'product-media-frame';

        if (entry.type === 'image') {
            const image = document.createElement('img');
            image.src = entry.src;
            image.alt = `${product.name} preview ${index + 1}`;
            image.className = 'product-media-item';
            frame.appendChild(image);
        } else {
            const video = document.createElement('video');
            video.src = entry.src;
            video.className = 'product-media-item';
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'metadata';
            video.controls = true;
            frame.appendChild(video);
        }

        track.appendChild(frame);
    });

    const staticLayer = document.createElement('div');
    staticLayer.className = 'product-media-static';

    viewport.appendChild(track);
    viewport.appendChild(staticLayer);
    return viewport;
}

function calculateCartTotals(cart) {
    const baseShipping = Number(currentSettings.shippingBaseRate || 0);
    const salesTaxRate = Number(currentSettings.salesTaxRate || 0);

    const summary = cart.items.reduce((totals, item) => {
        const product = findProduct(item.productId);
        if (!product) {
            return totals;
        }

        const unitPrice = getEffectivePrice(product);
        totals.subtotal += unitPrice * item.quantity;
        totals.shipping += Number(product.shippingPrice || 0) * item.quantity;
        totals.items += item.quantity;
        return totals;
    }, { subtotal: 0, shipping: 0, items: 0 });

    if (summary.items > 0) {
        summary.shipping += baseShipping;
    }

    summary.tax = summary.subtotal * (salesTaxRate / 100);
    summary.total = summary.subtotal + summary.shipping + summary.tax;
    return summary;
}

function renderCartTotals(cart) {
    if (!cartTotalsPanel || !cartSubtotalValue || !cartTaxValue || !cartShippingValue || !cartTotalValue) {
        return;
    }

    if (!cart.items.length) {
        cartTotalsPanel.classList.add('hidden');
        cartSubtotalValue.textContent = '$0.00';
        cartTaxValue.textContent = '$0.00';
        cartShippingValue.textContent = '$0.00';
        cartTotalValue.textContent = '$0.00';
        return;
    }

    const totals = calculateCartTotals(cart);
    cartTotalsPanel.classList.remove('hidden');
    cartSubtotalValue.textContent = formatMoney(totals.subtotal);
    cartTaxValue.textContent = formatMoney(totals.tax);
    cartShippingValue.textContent = formatMoney(totals.shipping);
    cartTotalValue.textContent = formatMoney(totals.total);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card click-item';

    card.appendChild(createProductMedia(product));

    const title = document.createElement('h3');
    title.textContent = product.name;
    card.appendChild(title);

    if (product.description) {
        const description = document.createElement('p');
        description.className = 'product-desc';
        description.textContent = product.description;
        card.appendChild(description);
    }

    card.appendChild(createPriceDisplay(product));

    const shippingText = document.createElement('p');
    shippingText.className = 'product-meta-text';
    shippingText.textContent = `Shipping: ${formatMoney(product.shippingPrice)}`;
    card.appendChild(shippingText);

    if (product.subcategories.length) {
        const subcategories = document.createElement('div');
        subcategories.className = 'subcategories';

        product.subcategories.forEach(subcategory => {
            const item = document.createElement('p');
            item.className = 'subcategory';
            item.textContent = subcategory;
            subcategories.appendChild(item);
        });

        card.appendChild(subcategories);
    }

    let variantSelect = null;
    if (product.variants.length) {
        const variantGroup = document.createElement('div');
        variantGroup.className = 'product-variant-group';

        const variantLabel = document.createElement('label');
        variantLabel.className = 'product-variant-label';
        variantLabel.textContent = 'Variant';
        variantGroup.appendChild(variantLabel);

        variantSelect = document.createElement('select');
        variantSelect.className = 'product-variant-select';

        product.variants.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant;
            option.textContent = variant;
            variantSelect.appendChild(option);
        });

        variantGroup.appendChild(variantSelect);
        card.appendChild(variantGroup);
    }

    const actions = document.createElement('div');
    actions.className = 'product-card-actions';

    const activeUser = getActiveUser();
    const wishlistIds = activeUser ? getWishlistEntry(activeUser.id).productIds : [];
    const wishlistButton = document.createElement('button');
    wishlistButton.type = 'button';
    wishlistButton.className = 'table-action-btn click-item';
    wishlistButton.textContent = wishlistIds.includes(product.id) ? '♥ Wishlisted' : '♡ Wishlist';
    wishlistButton.addEventListener('click', async event => {
        event.stopPropagation();
        const user = ensureActiveUser('Create an account or sign in to save a wishlist.');
        if (!user) {
            return;
        }

        await saveWishlistsWithLatest(currentWishlists => {
            const existingEntry = currentWishlists.find(entry => entry.userId === user.id);
            const nextIds = new Set(existingEntry?.productIds || []);

            if (nextIds.has(product.id)) {
                nextIds.delete(product.id);
            } else {
                nextIds.add(product.id);
            }

            const nextEntry = {
                userId: user.id,
                productIds: [...nextIds],
                updatedAt: new Date().toISOString()
            };

            const remainingEntries = currentWishlists.filter(entry => entry.userId !== user.id);
            return [...remainingEntries, nextEntry];
        });

        setStatus(accountStatusMessage, `${product.name} wishlist updated.`);
    });
    actions.appendChild(wishlistButton);

    const cartButton = document.createElement('button');
    cartButton.type = 'button';
    cartButton.className = 'table-action-btn click-item';
    const quantity = getCartQuantity(product.id);
    cartButton.textContent = quantity ? `🛒 Add another (${quantity})` : '🛒 Save to cart';
    cartButton.addEventListener('click', async event => {
        event.stopPropagation();
        const user = ensureActiveUser('Create an account or sign in to save a cart.');
        if (!user) {
            return;
        }

        const variant = getSelectedVariant(variantSelect, product);
        await saveCartsWithLatest(currentCarts => {
            const existingEntry = currentCarts.find(entry => entry.userId === user.id);
            const items = [...(existingEntry?.items || [])];
            const existingItemIndex = items.findIndex(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(product.id, variant));

            if (existingItemIndex >= 0) {
                items[existingItemIndex] = {
                    ...items[existingItemIndex],
                    quantity: items[existingItemIndex].quantity + 1
                };
            } else {
                items.push({ productId: product.id, variant, quantity: 1 });
            }

            const nextEntry = {
                userId: user.id,
                items,
                updatedAt: new Date().toISOString()
            };

            const remainingEntries = currentCarts.filter(entry => entry.userId !== user.id);
            return [...remainingEntries, nextEntry];
        });

        setStatus(cartStatusMessage, `${product.name} saved to your cart.`);
    });
    actions.appendChild(cartButton);

    card.appendChild(actions);
    return card;
}

function renderShopProducts(products) {
    shopProducts = products;
    const shopGrid = document.getElementById('shopGrid');
    if (!shopGrid) {
        return;
    }

    shopGrid.replaceChildren();

    if (!products.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-products-message';
        emptyState.textContent = 'No spooky products on this channel yet.';
        shopGrid.appendChild(emptyState);
        return;
    }

    products.forEach(product => {
        shopGrid.appendChild(createProductCard(product));
    });

    bindClickSound(shopGrid);
    bindProductCardEffects(shopGrid);
}

function renderAnnouncement(targetId, title, message, enabled) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }

    if (!enabled || (!title && !message)) {
        target.replaceChildren();
        target.classList.add('hidden');
        return;
    }

    target.classList.remove('hidden');
    target.replaceChildren();

    if (title) {
        const heading = document.createElement('h3');
        heading.textContent = title;
        target.appendChild(heading);
    }

    if (message) {
        const paragraph = document.createElement('p');
        paragraph.textContent = message;
        target.appendChild(paragraph);
    }
}

function renderDiscounts(discounts, enabled) {
    const discountsContainer = document.getElementById('shopDiscounts');
    if (!discountsContainer) {
        return;
    }

    discountsContainer.replaceChildren();

    if (!enabled || !discounts.length) {
        discountsContainer.classList.add('hidden');
        return;
    }

    discountsContainer.classList.remove('hidden');

    const title = document.createElement('h3');
    title.textContent = 'Active Discounts';
    discountsContainer.appendChild(title);

    const list = document.createElement('div');
    list.className = 'discount-list';

    discounts.forEach(discount => {
        const item = document.createElement('div');
        item.className = 'discount-pill';
        item.textContent = discount.description
            ? `${discount.code} — ${discount.description}`
            : discount.code;
        list.appendChild(item);
    });

    discountsContainer.appendChild(list);
}

function renderFeaturedBroadcast(marketing, enabled) {
    const target = document.getElementById('shopFeaturedCard');
    if (!target) {
        return;
    }

    if (!enabled || (!marketing.featuredTitle && !marketing.featuredMessage)) {
        target.replaceChildren();
        target.classList.add('hidden');
        return;
    }

    target.classList.remove('hidden');
    target.replaceChildren();

    const title = document.createElement('h3');
    title.textContent = marketing.featuredTitle;
    target.appendChild(title);

    const text = document.createElement('p');
    text.textContent = marketing.featuredMessage;
    target.appendChild(text);
}

function renderPaymentMethodDetails() {
    if (!paymentMethodInstructions) {
        return;
    }

    const selectedMethod = availablePaymentMethods.find(method => method.id === paymentMethodSelect?.value);
    paymentMethodInstructions.textContent = selectedMethod?.instructions || 'We will confirm your order total before requesting payment.';
}

function renderPaymentMethods(paymentMethods) {
    availablePaymentMethods = paymentMethods.filter(method => method.enabled);

    if (paymentMethodsList) {
        paymentMethodsList.replaceChildren();

        availablePaymentMethods.forEach(method => {
            const badge = document.createElement('span');
            badge.className = 'payment-method-chip';
            badge.textContent = method.name;
            paymentMethodsList.appendChild(badge);
        });

        if (!availablePaymentMethods.length) {
            const emptyState = document.createElement('p');
            emptyState.className = 'empty-products-message';
            emptyState.textContent = 'Payment methods are being updated. Please check back soon.';
            paymentMethodsList.appendChild(emptyState);
        }
    }

    if (paymentMethodSelect) {
        const previousValue = paymentMethodSelect.value;
        paymentMethodSelect.replaceChildren();

        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = availablePaymentMethods.length
            ? 'Choose payment method...'
            : 'Payment methods unavailable';
        paymentMethodSelect.appendChild(placeholderOption);

        availablePaymentMethods.forEach(method => {
            const option = document.createElement('option');
            option.value = method.id;
            option.textContent = method.name;
            option.selected = previousValue ? previousValue === method.id : false;
            paymentMethodSelect.appendChild(option);
        });

        if (!availablePaymentMethods.some(method => method.id === previousValue) && availablePaymentMethods[0]) {
            paymentMethodSelect.value = availablePaymentMethods[0].id;
        }

        paymentMethodSelect.disabled = !availablePaymentMethods.length;
        paymentMethodSelect.required = availablePaymentMethods.length > 0;
    }

    renderPaymentMethodDetails();
}

function applySettings(settings) {
    currentSettings = settings;
    document.title = settings.shopName;

    const homeHeadline = document.getElementById('homeHeadline');
    if (homeHeadline) {
        homeHeadline.textContent = settings.homeHeadline;
        homeHeadline.setAttribute('data-text', settings.homeHeadline);
    }

    const homeTagline = document.getElementById('homeTagline');
    if (homeTagline) {
        homeTagline.textContent = settings.homeTagline;
    }

    const shopTitle = document.getElementById('shopChannelTitle');
    if (shopTitle) {
        shopTitle.textContent = settings.shopName.toUpperCase();
    }

    const shopNote = document.getElementById('shopNote');
    if (shopNote) {
        shopNote.textContent = settings.shopNote;
    }

    renderCart();
}

function applyAppCenter(appCenter) {
    currentAppCenterState = appCenter;
    const customOrderOption = channelSelector?.querySelector('option[value="custom-order"]');
    const customOrderSection = document.getElementById('custom-order');

    if (customOrderOption) {
        customOrderOption.hidden = !appCenter.customOrdersEnabled;
    }

    if (customOrderSection) {
        customOrderSection.classList.toggle('app-hidden', !appCenter.customOrdersEnabled);
    }

    if (!appCenter.customOrdersEnabled && channelSelector?.value === 'custom-order') {
        channelSelector.value = 'home';
        channelSelector.dispatchEvent(new Event('change'));
    }
}

function applyDesigner(designer) {
    const shopGrid = document.getElementById('shopGrid');
    if (shopGrid) {
        shopGrid.classList.remove('card-size-compact', 'card-size-cozy', 'card-size-showcase');
        shopGrid.classList.add(`card-size-${designer.productCardSize}`);
    }

    if (staticOverlay) {
        staticOverlay.classList.toggle('hidden', !designer.staticEffect);
    }
}

function updateAdditionalSetVisibility() {
    if (!additionalSetCountGroup) {
        return;
    }

    const shouldShow = [...additionalSetRadios].some(radio => radio.checked && radio.value === 'yes');
    additionalSetCountGroup.style.display = shouldShow ? 'block' : 'none';
}

function fillOrderProfileFromAccount() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        return;
    }

    if (fullNameInput) {
        fullNameInput.value = activeUser.name || activeUser.shippingFullName || '';
    }

    if (usernameInput) {
        usernameInput.value = activeUser.username || '';
    }

    if (contactMethodInput) {
        contactMethodInput.value = activeUser.contactMethod || '';
    }

    if (contactInfoInput) {
        contactInfoInput.value = activeUser.contactInfo || activeUser.email || '';
    }
}

function renderSavedAccounts() {
    if (!savedAccountSelect) {
        return;
    }

    const activeUser = getActiveUser();
    savedAccountSelect.replaceChildren();

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = savedUsers.length ? 'Choose an account...' : 'No saved accounts yet';
    savedAccountSelect.appendChild(placeholder);

    savedUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${getUserDisplayName(user)}${user.email ? ` • ${user.email}` : ''}`;
        option.selected = Boolean(activeUser && activeUser.id === user.id);
        savedAccountSelect.appendChild(option);
    });
}

function renderShopAccountBanner() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        setStatus(shopAccountGreeting, 'Browsing as guest');
        setStatus(shopAccountSummary, 'Create an account or sign in to sync wishlists, carts, and shipping details.');
        return;
    }

    const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
    const cartItemCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
    setStatus(shopAccountGreeting, `Browsing as ${getUserDisplayName(activeUser)}`);
    setStatus(shopAccountSummary, `${wishlistCount} wishlist item(s) • ${cartItemCount} cart item(s) synced to your account.`);
}

function loadAccountForms() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        accountProfileForm?.reset();
        shippingProfileForm?.reset();
        if (accountFormTitle) {
            accountFormTitle.textContent = 'Create account';
        }
        if (accountSubmitButton) {
            accountSubmitButton.textContent = 'Create account';
        }
        return;
    }

    accountNameInput.value = activeUser.name || '';
    accountUsernameInput.value = activeUser.username || '';
    accountEmailInput.value = activeUser.email || '';
    accountContactMethodInput.value = activeUser.contactMethod || '';
    accountContactInfoInput.value = activeUser.contactInfo || '';
    shippingFullNameInput.value = activeUser.shippingFullName || activeUser.name || '';
    shippingAddressLine1Input.value = activeUser.shippingAddressLine1 || '';
    shippingAddressLine2Input.value = activeUser.shippingAddressLine2 || '';
    shippingCityInput.value = activeUser.shippingCity || '';
    shippingStateInput.value = activeUser.shippingState || '';
    shippingPostalCodeInput.value = activeUser.shippingPostalCode || '';
    shippingCountryInput.value = activeUser.shippingCountry || '';
    if (accountFormTitle) {
        accountFormTitle.textContent = 'Account profile';
    }
    if (accountSubmitButton) {
        accountSubmitButton.textContent = 'Save account';
    }
}

function renderWishlist() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        renderSavedListMessage(wishlistList, 'Create an account or sign in to save wishlist items.');
        return;
    }

    const wishlistIds = getWishlistEntry(activeUser.id).productIds;
    if (!wishlistIds.length) {
        renderSavedListMessage(wishlistList, 'Your wishlist is empty. Save products from the shop channel.');
        return;
    }

    wishlistList.replaceChildren();

    wishlistIds.forEach(productId => {
        const product = findProduct(productId);
        if (!product) {
            return;
        }

        const item = document.createElement('div');
        item.className = 'saved-item-card';

        const title = document.createElement('strong');
        title.textContent = `${product.emoji || '🛍️'} ${product.name}`;
        item.appendChild(title);

        const price = document.createElement('p');
        price.textContent = `Current price: ${formatMoney(getEffectivePrice(product))}`;
        item.appendChild(price);

        if (product.description) {
            const description = document.createElement('p');
            description.textContent = product.description;
            item.appendChild(description);
        }

        if (product.variants.length) {
            const variantHint = document.createElement('p');
            variantHint.textContent = `Variants: ${product.variants.join(', ')}`;
            item.appendChild(variantHint);
        }

        const actions = document.createElement('div');
        actions.className = 'product-card-actions';

        const moveButton = document.createElement('button');
        moveButton.type = 'button';
        moveButton.className = 'table-action-btn click-item';
        moveButton.textContent = 'Add to cart';
        moveButton.addEventListener('click', async () => {
            const defaultVariant = getDefaultVariant(product);
            await saveCartsWithLatest(currentCarts => {
                const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
                const items = [...(existingEntry?.items || [])];
                const existingItemIndex = items.findIndex(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(product.id, defaultVariant));

                if (existingItemIndex >= 0) {
                    items[existingItemIndex] = {
                        ...items[existingItemIndex],
                        quantity: items[existingItemIndex].quantity + 1
                    };
                } else {
                    items.push({ productId: product.id, variant: defaultVariant, quantity: 1 });
                }

                return [
                    ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, items, updatedAt: new Date().toISOString() }
                ];
            });
            setStatus(cartStatusMessage, `${product.name} added to your cart.`);
        });
        actions.appendChild(moveButton);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'table-action-btn table-action-btn-danger click-item';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', async () => {
            await saveWishlistsWithLatest(currentWishlists => {
                const existingEntry = currentWishlists.find(entry => entry.userId === activeUser.id);
                const nextIds = (existingEntry?.productIds || []).filter(id => id !== product.id);

                return [
                    ...currentWishlists.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, productIds: nextIds, updatedAt: new Date().toISOString() }
                ];
            });
            setStatus(accountStatusMessage, `${product.name} removed from your wishlist.`);
        });
        actions.appendChild(removeButton);

        item.appendChild(actions);
        wishlistList.appendChild(item);
    });

    bindClickSound(wishlistList);
}

function renderCart() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        if (cartSummaryMessage) {
            cartSummaryMessage.textContent = 'Sign in to sync a saved cart to your account.';
        }
        renderSavedListMessage(cartList, 'Create an account or sign in to save cart items.');
        renderCartTotals({ items: [] });
        return;
    }

    const cart = getCartEntry(activeUser.id);
    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    if (cartSummaryMessage) {
        cartSummaryMessage.textContent = `Your account cart is synced securely. ${totalItems} item(s) saved right now.`;
    }

    if (!cart.items.length) {
        renderSavedListMessage(cartList, 'Your saved cart is empty. Add products from the shop channel.');
        renderCartTotals(cart);
        return;
    }

    cartList.replaceChildren();

    cart.items.forEach(item => {
        const product = findProduct(item.productId);
        if (!product) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'saved-item-card';

        const title = document.createElement('strong');
        title.textContent = `${product.emoji || '🛍️'} ${product.name}`;
        card.appendChild(title);

        const variantText = document.createElement('p');
        variantText.textContent = `Variant: ${getCartItemVariantLabel(item)}`;
        card.appendChild(variantText);

        const quantityText = document.createElement('p');
        quantityText.textContent = `Quantity: ${item.quantity}`;
        card.appendChild(quantityText);

        const priceText = document.createElement('p');
        priceText.textContent = `Item total: ${formatMoney(getEffectivePrice(product) * item.quantity)}`;
        card.appendChild(priceText);

        const shippingText = document.createElement('p');
        shippingText.textContent = `Shipping for this item: ${formatMoney(Number(product.shippingPrice || 0) * item.quantity)}`;
        card.appendChild(shippingText);

        const actions = document.createElement('div');
        actions.className = 'product-card-actions';

        const decreaseButton = document.createElement('button');
        decreaseButton.type = 'button';
        decreaseButton.className = 'table-action-btn click-item';
        decreaseButton.textContent = '−1';
        decreaseButton.addEventListener('click', async () => {
            await saveCartsWithLatest(currentCarts => {
                const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
                const nextItems = (existingEntry?.items || [])
                    .map(existingItem => getCartItemKey(existingItem.productId, existingItem.variant) === getCartItemKey(item.productId, item.variant)
                        ? { ...existingItem, quantity: existingItem.quantity - 1 }
                        : existingItem)
                    .filter(existingItem => existingItem.quantity > 0);

                return [
                    ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, items: nextItems, updatedAt: new Date().toISOString() }
                ];
            });
        });
        actions.appendChild(decreaseButton);

        const increaseButton = document.createElement('button');
        increaseButton.type = 'button';
        increaseButton.className = 'table-action-btn click-item';
        increaseButton.textContent = '+1';
        increaseButton.addEventListener('click', async () => {
            await saveCartsWithLatest(currentCarts => {
                const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
                const nextItems = (existingEntry?.items || []).map(existingItem => getCartItemKey(existingItem.productId, existingItem.variant) === getCartItemKey(item.productId, item.variant)
                    ? { ...existingItem, quantity: existingItem.quantity + 1 }
                    : existingItem);

                return [
                    ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, items: nextItems, updatedAt: new Date().toISOString() }
                ];
            });
        });
        actions.appendChild(increaseButton);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'table-action-btn table-action-btn-danger click-item';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', async () => {
            await saveCartsWithLatest(currentCarts => {
                const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
                const nextItems = (existingEntry?.items || []).filter(existingItem => getCartItemKey(existingItem.productId, existingItem.variant) !== getCartItemKey(item.productId, item.variant));

                return [
                    ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, items: nextItems, updatedAt: new Date().toISOString() }
                ];
            });
            setStatus(cartStatusMessage, `${product.name} removed from your cart.`);
        });
        actions.appendChild(removeButton);

        card.appendChild(actions);
        cartList.appendChild(card);
    });

    renderCartTotals(cart);
    bindClickSound(cartList);
}

function renderAccountState() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        setStatus(accountGreeting, 'No account active');
        setStatus(accountSummary, 'Create an account or sign in to manage your synced wishlist, cart, and shipping details.');
        setStatus(accountVerificationStatus, '');
    } else {
        const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
        const cartCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
        setStatus(accountGreeting, `Welcome back, ${getUserDisplayName(activeUser)}`);
        setStatus(accountSummary, `${wishlistCount} wishlist item(s), ${cartCount} saved cart item(s), and shipping details synced to your account.`);
        setStatus(accountVerificationStatus, activeUser.emailVerified ? 'Email verified.' : 'Email verification pending. Check your verification link or resend it below.');
    }

    renderSavedAccounts();
    renderShopAccountBanner();
    loadAccountForms();
    fillOrderProfileFromAccount();
    renderWishlist();
    renderCart();
    renderShopProducts(shopProducts);
}

async function initializeShopData() {
    const bootstrap = await window.ShopData.getPublicBootstrap();
    await loadAccountSession();

    currentMarketingState = bootstrap.marketing;
    currentAppCenterState = bootstrap.appCenter;
    renderShopProducts(bootstrap.products);
    applySettings(bootstrap.settings);
    applyAppCenter(bootstrap.appCenter);
    applyDesigner(bootstrap.designer);
    renderPaymentMethods(bootstrap.paymentMethods);
    renderAnnouncement('homeAnnouncement', bootstrap.marketing.announcementTitle, bootstrap.marketing.announcementMessage, bootstrap.appCenter.marketingEnabled);
    renderAnnouncement('shopAnnouncement', bootstrap.marketing.announcementTitle, bootstrap.marketing.announcementMessage, bootstrap.appCenter.marketingEnabled);
    renderFeaturedBroadcast(bootstrap.marketing, bootstrap.appCenter.marketingEnabled);
    renderDiscounts(bootstrap.discounts, bootstrap.appCenter.discountsEnabled);
    renderAccountState();

    window.ShopData.subscribe('products', renderShopProducts);
    window.ShopData.subscribe('settings', applySettings);
    window.ShopData.subscribe('designer', applyDesigner);
    window.ShopData.subscribe('paymentMethods', renderPaymentMethods);
    window.ShopData.subscribe('users', nextUsers => {
        savedUsers = nextUsers;
        renderAccountState();
    });
    window.ShopData.subscribe('wishlists', nextWishlists => {
        wishlists = nextWishlists;
        renderAccountState();
    });
    window.ShopData.subscribe('carts', nextCarts => {
        carts = nextCarts;
        renderAccountState();
    });
    window.ShopData.subscribe('discounts', nextDiscounts => {
        renderDiscounts(nextDiscounts, currentAppCenterState.discountsEnabled);
    });
    window.ShopData.subscribe('marketing', nextMarketing => {
        currentMarketingState = nextMarketing;
        renderAnnouncement('homeAnnouncement', nextMarketing.announcementTitle, nextMarketing.announcementMessage, currentAppCenterState.marketingEnabled);
        renderAnnouncement('shopAnnouncement', nextMarketing.announcementTitle, nextMarketing.announcementMessage, currentAppCenterState.marketingEnabled);
        renderFeaturedBroadcast(nextMarketing, currentAppCenterState.marketingEnabled);
    });
    window.ShopData.subscribe('appCenter', nextAppCenter => {
        applyAppCenter(nextAppCenter);
        renderAnnouncement('homeAnnouncement', currentMarketingState.announcementTitle, currentMarketingState.announcementMessage, nextAppCenter.marketingEnabled);
        renderAnnouncement('shopAnnouncement', currentMarketingState.announcementTitle, currentMarketingState.announcementMessage, nextAppCenter.marketingEnabled);
        renderFeaturedBroadcast(currentMarketingState, nextAppCenter.marketingEnabled);
        window.ShopData.getDiscounts().then(nextDiscounts => {
            renderDiscounts(nextDiscounts, nextAppCenter.discountsEnabled);
        });
    });
}

if (channelSelector && channels.length) {
    channelSelector.addEventListener('change', event => {
        const selectedChannel = event.target.value;

        channels.forEach(channel => {
            channel.classList.remove('active');
        });

        const targetChannel = document.getElementById(selectedChannel);
        if (targetChannel && !targetChannel.classList.contains('app-hidden')) {
            targetChannel.classList.add('active');
        } else {
            document.getElementById('home')?.classList.add('active');
            channelSelector.value = 'home';
        }

        playClickSound();
    });
}

if (openAccountFromShopButton) {
    openAccountFromShopButton.addEventListener('click', () => {
        setActiveChannel('account');
    });
}

if (accountProfileForm) {
    accountProfileForm.addEventListener('submit', async event => {
        event.preventDefault();

        const activeUser = getActiveUser();
        const nextName = accountNameInput.value.trim();
        const nextUsername = accountUsernameInput.value.trim();
        const nextEmail = accountEmailInput.value.trim();

        if (!nextName || !nextUsername || !nextEmail) {
            setStatus(accountStatusMessage, 'Name, username, and email are required.');
            return;
        }

        try {
            if (activeUser) {
                const updatedUser = await window.ShopData.account.updateProfile({
                    name: nextName,
                    username: nextUsername,
                    email: nextEmail,
                    contactMethod: accountContactMethodInput.value,
                    contactInfo: accountContactInfoInput.value.trim()
                });
                syncAccountData(updatedUser, getWishlistEntry(updatedUser.id), getCartEntry(updatedUser.id));
                renderAccountState();
                setStatus(accountStatusMessage, `Updated account for ${nextName}.`);
                return;
            }

            const password = accountPasswordInput?.value || '';
            const confirmPassword = accountPasswordConfirmInput?.value || '';
            if (password.length < 8) {
                setStatus(accountStatusMessage, 'Use a password with at least 8 characters.');
                return;
            }
            if (password !== confirmPassword) {
                setStatus(accountStatusMessage, 'Passwords do not match.');
                return;
            }

            const response = await window.ShopData.auth.signUp({
                name: nextName,
                username: nextUsername,
                email: nextEmail,
                password,
                contactMethod: accountContactMethodInput.value,
                contactInfo: accountContactInfoInput.value.trim()
            });
            await loadAccountSession();
            renderAccountState();
            fillOrderProfileFromAccount();
            setStatus(accountStatusMessage, response.verificationPreviewUrl
                ? `Account created. Verify your email: ${response.verificationPreviewUrl}`
                : `Account created for ${nextName}.`);
            if (signInEmailInput) {
                signInEmailInput.value = nextEmail;
            }
        } catch (error) {
            setStatus(accountStatusMessage, error.message);
        }
    });
}

if (shippingProfileForm) {
    shippingProfileForm.addEventListener('submit', async event => {
        event.preventDefault();

        const activeUser = ensureActiveUser('Create an account or sign in before saving shipping details.');
        if (!activeUser) {
            return;
        }

        try {
            const updatedUser = await window.ShopData.account.updateShipping({
                shippingFullName: shippingFullNameInput.value.trim(),
                shippingAddressLine1: shippingAddressLine1Input.value.trim(),
                shippingAddressLine2: shippingAddressLine2Input.value.trim(),
                shippingCity: shippingCityInput.value.trim(),
                shippingState: shippingStateInput.value.trim(),
                shippingPostalCode: shippingPostalCodeInput.value.trim(),
                shippingCountry: shippingCountryInput.value.trim()
            });
            syncAccountData(updatedUser, getWishlistEntry(updatedUser.id), getCartEntry(updatedUser.id));
            renderAccountState();
            setStatus(shippingStatusMessage, 'Shipping details saved to your account.');
        } catch (error) {
            setStatus(shippingStatusMessage, error.message);
        }
    });
}

if (signInForm) {
    signInForm.addEventListener('submit', async event => {
        event.preventDefault();
        try {
            await window.ShopData.auth.signIn({
                email: signInEmailInput.value.trim(),
                password: signInPasswordInput.value
            });
            await loadAccountSession();
            renderAccountState();
            fillOrderProfileFromAccount();
            setStatus(signInStatusMessage, 'Signed in.');
            setStatus(accountStatusMessage, '');
        } catch (error) {
            setStatus(signInStatusMessage, error.message);
        }
    });
}

if (requestPasswordResetButton) {
    requestPasswordResetButton.addEventListener('click', async () => {
        const email = signInEmailInput?.value.trim() || accountEmailInput?.value.trim();
        if (!email) {
            setStatus(signInStatusMessage, 'Enter your email first.');
            return;
        }
        try {
            const response = await window.ShopData.auth.requestPasswordReset(email);
            setStatus(signInStatusMessage, response.resetPreviewUrl
                ? `Reset link: ${response.resetPreviewUrl}`
                : response.message);
        } catch (error) {
            setStatus(signInStatusMessage, error.message);
        }
    });
}

if (signOutButton) {
    signOutButton.addEventListener('click', async () => {
        await window.ShopData.auth.signOut();
        syncAccountData(null);
        renderAccountState();
        accountProfileForm?.reset();
        shippingProfileForm?.reset();
        setStatus(signInStatusMessage, 'Signed out.');
        setStatus(accountStatusMessage, '');
    });
}

if (resendVerificationButton) {
    resendVerificationButton.addEventListener('click', async () => {
        const activeUser = ensureActiveUser('Sign in before requesting a verification link.');
        if (!activeUser) {
            return;
        }
        try {
            const response = await window.ShopData.auth.resendVerification();
            setStatus(accountVerificationStatus, response.verificationPreviewUrl
                ? `Verification link: ${response.verificationPreviewUrl}`
                : 'Verification email resent.');
        } catch (error) {
            setStatus(accountVerificationStatus, error.message);
        }
    });
}

if (moveWishlistToCartButton) {
    moveWishlistToCartButton.addEventListener('click', async () => {
        const activeUser = ensureActiveUser('Create an account or sign in before moving wishlist items.');
        if (!activeUser) {
            return;
        }

        const wishlistIds = getWishlistEntry(activeUser.id).productIds;
        if (!wishlistIds.length) {
            setStatus(cartStatusMessage, 'Your wishlist is empty.');
            return;
        }

        await saveCartsWithLatest(currentCarts => {
            const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
            const items = [...(existingEntry?.items || [])];

            wishlistIds.forEach(productId => {
                const product = findProduct(productId);
                const variant = product ? getDefaultVariant(product) : '';
                const existingItemIndex = items.findIndex(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(productId, variant));
                if (existingItemIndex >= 0) {
                    items[existingItemIndex] = {
                        ...items[existingItemIndex],
                        quantity: items[existingItemIndex].quantity + 1
                    };
                } else {
                    items.push({ productId, variant, quantity: 1 });
                }
            });

            return [
                ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                { userId: activeUser.id, items, updatedAt: new Date().toISOString() }
            ];
        });

        setStatus(cartStatusMessage, 'Moved wishlist items into your cart.');
    });
}

if (clearCartButton) {
    clearCartButton.addEventListener('click', async () => {
        const activeUser = ensureActiveUser('Create an account or sign in before clearing a cart.');
        if (!activeUser) {
            return;
        }

        await saveCartsWithLatest(currentCarts => [
            ...currentCarts.filter(entry => entry.userId !== activeUser.id),
            { userId: activeUser.id, items: [], updatedAt: new Date().toISOString() }
        ]);
        setStatus(cartStatusMessage, 'Cleared your saved cart.');
    });
}

if (customOrderForm) {
    customOrderForm.addEventListener('submit', async event => {
        event.preventDefault();

        if (!availablePaymentMethods.length) {
            document.getElementById('orderSuccessMessage').textContent = 'Payment methods are unavailable right now. Please try again later.';
            orderSuccess.classList.remove('hidden');
            return;
        }

        const formData = new FormData(customOrderForm);
        const rawData = Object.fromEntries(formData);
        const order = window.ShopData.normalizeOrders([{
            ...rawData,
            scents: formData.getAll('scent'),
            glitter: formData.get('glitter') === 'yes',
            glow: formData.get('glow') === 'yes',
            paymentStatus: 'Awaiting Payment',
            status: 'Pending'
        }])[0];

        const savedOrder = await window.ShopData.createCustomOrder(order);

        customOrderForm.style.display = 'none';
        orderSuccess.classList.remove('hidden');
        document.getElementById('orderSuccessMessage').textContent = `Thank you, ${savedOrder.fullName || 'ghoul'}! Your custom order has been saved. We’ll confirm your total and send ${availablePaymentMethods.find(method => method.id === savedOrder.paymentMethod)?.name || 'payment'} instructions soon.`;
        playClickSound();

        setTimeout(() => {
            customOrderForm.reset();
            updateAdditionalSetVisibility();
            fillOrderProfileFromAccount();
            customOrderForm.style.display = 'block';
            orderSuccess.classList.add('hidden');
        }, 3000);
    });
}

if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', renderPaymentMethodDetails);
}

if (powerBtn) {
    powerBtn.addEventListener('click', () => {
        isPoweredOn = !isPoweredOn;
        const screenContent = document.getElementById('screenContent');

        if (!screenContent) {
            return;
        }

        if (!isPoweredOn) {
            screenContent.style.opacity = '0.3';
            screenContent.style.animation = 'none';
            powerBtn.style.background = 'linear-gradient(135deg, #666 0%, #333 100%)';
            powerBtn.style.boxShadow = '0 0 10px rgba(100, 100, 100, 0.5)';
        } else {
            screenContent.style.opacity = '1';
            screenContent.style.animation = 'tvGlow 3s ease-in-out infinite';
            powerBtn.style.background = 'linear-gradient(135deg, #da70d6 0%, #ff69b4 100%)';
            powerBtn.style.boxShadow = '0 5px 15px rgba(255, 105, 180, 0.4)';
        }

        playClickSound();
    });
}

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        volumeLevel = (volumeLevel + 25) % 125;

        if (volumeLevel === 0) {
            volumeBtn.textContent = '🔇';
        } else if (volumeLevel === 25) {
            volumeBtn.textContent = '🔈';
        } else if (volumeLevel === 50) {
            volumeBtn.textContent = '🔉';
        } else {
            volumeBtn.textContent = '🔊';
        }

        playClickSound();

        const randomPulse = Math.random() * 0.3 + 0.2;
        volumeBtn.style.transform = `scale(${1 + randomPulse})`;
        setTimeout(() => {
            volumeBtn.style.transform = 'scale(1)';
        }, 200);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    channels.forEach(channel => {
        channel.classList.remove('active');
    });

    document.getElementById('home')?.classList.add('active');
    if (channelSelector) {
        channelSelector.value = 'home';
    }

    bindClickSound();
    bindProductCardEffects();
    additionalSetRadios.forEach(radio => {
        radio.addEventListener('change', updateAdditionalSetVisibility);
    });
    updateAdditionalSetVisibility();
    await initializeShopData();

    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
        setActiveChannel('account');
        setStatus(accountVerificationStatus, 'Email verified.');
    }
    if (params.get('resetToken')) {
        setActiveChannel('account');
        const nextPassword = window.prompt('Enter your new password (minimum 8 characters):');
        if (nextPassword) {
            try {
                await window.ShopData.auth.resetPassword(params.get('resetToken'), nextPassword);
                setStatus(signInStatusMessage, 'Password updated. You can sign in now.');
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                setStatus(signInStatusMessage, error.message);
            }
        }
    }
});

document.addEventListener('keydown', event => {
    if (!channelSelector || !channels.length) {
        return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const options = Array.from(channelSelector.options).filter(option => !option.hidden);
        const currentIndex = options.findIndex(option => option.value === channelSelector.value);

        if (event.key === 'ArrowUp' && currentIndex > 0) {
            channelSelector.value = options[currentIndex - 1].value;
        } else if (event.key === 'ArrowDown' && currentIndex < options.length - 1) {
            channelSelector.value = options[currentIndex + 1].value;
        }

        channelSelector.dispatchEvent(new Event('change'));
    }
});

const contentScreenContent = document.querySelector('.screen-wrapper');
if (contentScreenContent) {
    contentScreenContent.addEventListener('touchstart', event => {
        touchStartX = event.changedTouches[0].screenX;
    }, false);

    contentScreenContent.addEventListener('touchend', event => {
        touchEndX = event.changedTouches[0].screenX;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    if (!channelSelector || !channels.length) {
        return;
    }

    const visibleOptions = Array.from(channelSelector.options).filter(option => !option.hidden);
    const currentIndex = visibleOptions.findIndex(option => option.value === channelSelector.value);
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && currentIndex < visibleOptions.length - 1) {
            channelSelector.value = visibleOptions[currentIndex + 1].value;
        } else if (diff < 0 && currentIndex > 0) {
            channelSelector.value = visibleOptions[currentIndex - 1].value;
        }

        channelSelector.dispatchEvent(new Event('change'));
    }
}

console.log('%c📺 Welcome to Sip of Ghoulaid Shop! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
console.log('%cEnjoy your spooky shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');
