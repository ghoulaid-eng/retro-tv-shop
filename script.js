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
const accountStatusMessage = document.getElementById('accountStatusMessage');
const savedAccountSelect = document.getElementById('savedAccountSelect');
const switchAccountButton = document.getElementById('switchAccountButton');
const createAccountModeButton = document.getElementById('createAccountModeButton');
const signOutButton = document.getElementById('signOutButton');
const accountProfileForm = document.getElementById('accountProfileForm');
const accountNameInput = document.getElementById('accountName');
const accountUsernameInput = document.getElementById('accountUsername');
const accountEmailInput = document.getElementById('accountEmail');
const accountContactMethodInput = document.getElementById('accountContactMethod');
const accountContactInfoInput = document.getElementById('accountContactInfo');
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
    container.querySelectorAll('.product-card, .product-detail').forEach(card => {
        if (card.dataset.cardEffectsBound === 'true') {
            return;
        }

        card.addEventListener('mousemove', event => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.backgroundPosition = `${x}px ${y}px`;
        });
        card.dataset.cardEffectsBound = 'true';
    });
}

function setStatus(target, message) {
    if (target) {
        target.textContent = message;
    }
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

function getCartQuantity(productId) {
    const activeUser = getActiveUser();
    if (!activeUser) {
        return 0;
    }

    return getCartEntry(activeUser.id).items.find(item => item.productId === productId)?.quantity || 0;
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

async function saveUsersWithLatest(applyChange) {
    const latestUsers = await window.ShopData.getUsers();
    const nextUsers = applyChange(latestUsers);
    window.ShopData.saveUsers(nextUsers);
}

async function saveWishlistsWithLatest(applyChange) {
    const latestWishlists = await window.ShopData.getWishlists();
    const nextWishlists = applyChange(latestWishlists);
    window.ShopData.saveWishlists(nextWishlists);
}

async function saveCartsWithLatest(applyChange) {
    const latestCarts = await window.ShopData.getCarts();
    const nextCarts = applyChange(latestCarts);
    window.ShopData.saveCarts(nextCarts);
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

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card click-item';

    const productImage = document.createElement('div');
    productImage.className = 'product-image';
    productImage.textContent = product.emoji || '🛍️';
    card.appendChild(productImage);

    const title = document.createElement('h3');
    title.textContent = product.name;
    card.appendChild(title);

    if (product.description) {
        const description = document.createElement('p');
        description.className = 'product-desc';
        description.textContent = product.description;
        card.appendChild(description);
    }

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
        const user = ensureActiveUser('Create or switch to an account to save a wishlist.');
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
        const user = ensureActiveUser('Create or switch to an account to save a cart.');
        if (!user) {
            return;
        }

        await saveCartsWithLatest(currentCarts => {
            const existingEntry = currentCarts.find(entry => entry.userId === user.id);
            const items = [...(existingEntry?.items || [])];
            const existingItemIndex = items.findIndex(item => item.productId === product.id);

            if (existingItemIndex >= 0) {
                items[existingItemIndex] = {
                    ...items[existingItemIndex],
                    quantity: items[existingItemIndex].quantity + 1
                };
            } else {
                items.push({ productId: product.id, quantity: 1 });
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
}

function applyAppCenter(appCenter) {
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
        setStatus(shopAccountSummary, 'Create a local account to save wishlists, carts, and shipping details on this device.');
        return;
    }

    const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
    const cartItemCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
    setStatus(shopAccountGreeting, `Browsing as ${getUserDisplayName(activeUser)}`);
    setStatus(shopAccountSummary, `${wishlistCount} wishlist item(s) • ${cartItemCount} cart item(s) saved on this device.`);
}

function loadAccountForms() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        accountProfileForm?.reset();
        shippingProfileForm?.reset();
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
}

function renderWishlist() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        renderSavedListMessage(wishlistList, 'Create or switch to an account to save wishlist items.');
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

        if (product.description) {
            const description = document.createElement('p');
            description.textContent = product.description;
            item.appendChild(description);
        }

        const actions = document.createElement('div');
        actions.className = 'product-card-actions';

        const moveButton = document.createElement('button');
        moveButton.type = 'button';
        moveButton.className = 'table-action-btn click-item';
        moveButton.textContent = 'Add to cart';
        moveButton.addEventListener('click', async () => {
            await saveCartsWithLatest(currentCarts => {
                const existingEntry = currentCarts.find(entry => entry.userId === activeUser.id);
                const items = [...(existingEntry?.items || [])];
                const existingItemIndex = items.findIndex(item => item.productId === product.id);

                if (existingItemIndex >= 0) {
                    items[existingItemIndex] = {
                        ...items[existingItemIndex],
                        quantity: items[existingItemIndex].quantity + 1
                    };
                } else {
                    items.push({ productId: product.id, quantity: 1 });
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
            cartSummaryMessage.textContent = 'Sign in to save a cart on this device.';
        }
        renderSavedListMessage(cartList, 'Create or switch to an account to save cart items.');
        return;
    }

    const cart = getCartEntry(activeUser.id);
    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    if (cartSummaryMessage) {
        cartSummaryMessage.textContent = `Your active account cart is saved automatically on this device. ${totalItems} item(s) saved right now.`;
    }

    if (!cart.items.length) {
        renderSavedListMessage(cartList, 'Your saved cart is empty. Add products from the shop channel.');
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

        const quantityText = document.createElement('p');
        quantityText.textContent = `Quantity: ${item.quantity}`;
        card.appendChild(quantityText);

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
                    .map(existingItem => existingItem.productId === item.productId
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
                const nextItems = (existingEntry?.items || []).map(existingItem => existingItem.productId === item.productId
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
                const nextItems = (existingEntry?.items || []).filter(existingItem => existingItem.productId !== item.productId);

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

    bindClickSound(cartList);
}

function renderAccountState() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        setStatus(accountGreeting, 'No account active');
        setStatus(accountSummary, 'Create an account or switch to one saved on this device.');
    } else {
        const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
        const cartCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
        setStatus(accountGreeting, `Welcome back, ${getUserDisplayName(activeUser)}`);
        setStatus(accountSummary, `${wishlistCount} wishlist item(s), ${cartCount} saved cart item(s), and shipping details stored on this device.`);
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
    const [products, discounts, marketing, settings, appCenter, designer, paymentMethods, users, currentUser, storedWishlists, storedCarts] = await Promise.all([
        window.ShopData.getProducts(),
        window.ShopData.getDiscounts(),
        window.ShopData.getMarketing(),
        window.ShopData.getSettings(),
        window.ShopData.getAppCenter(),
        window.ShopData.getDesigner(),
        window.ShopData.getPaymentMethods(),
        window.ShopData.getUsers(),
        window.ShopData.getCurrentUser(),
        window.ShopData.getWishlists(),
        window.ShopData.getCarts()
    ]);

    savedUsers = users;
    currentUserState = currentUser;
    wishlists = storedWishlists;
    carts = storedCarts;

    renderShopProducts(products);
    applySettings(settings);
    applyAppCenter(appCenter);
    applyDesigner(designer);
    renderPaymentMethods(paymentMethods);
    renderAnnouncement('homeAnnouncement', marketing.announcementTitle, marketing.announcementMessage, appCenter.marketingEnabled);
    renderAnnouncement('shopAnnouncement', marketing.announcementTitle, marketing.announcementMessage, appCenter.marketingEnabled);
    renderFeaturedBroadcast(marketing, appCenter.marketingEnabled);
    renderDiscounts(discounts, appCenter.discountsEnabled);
    renderAccountState();

    window.ShopData.subscribe('products', renderShopProducts);
    window.ShopData.subscribe('settings', applySettings);
    window.ShopData.subscribe('designer', applyDesigner);
    window.ShopData.subscribe('paymentMethods', renderPaymentMethods);
    window.ShopData.subscribe('users', nextUsers => {
        savedUsers = nextUsers;
        renderAccountState();
    });
    window.ShopData.subscribe('currentUser', nextCurrentUser => {
        currentUserState = nextCurrentUser;
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
        window.ShopData.getAppCenter().then(currentAppCenter => {
            renderDiscounts(nextDiscounts, currentAppCenter.discountsEnabled);
        });
    });
    window.ShopData.subscribe('marketing', nextMarketing => {
        window.ShopData.getAppCenter().then(currentAppCenter => {
            renderAnnouncement('homeAnnouncement', nextMarketing.announcementTitle, nextMarketing.announcementMessage, currentAppCenter.marketingEnabled);
            renderAnnouncement('shopAnnouncement', nextMarketing.announcementTitle, nextMarketing.announcementMessage, currentAppCenter.marketingEnabled);
            renderFeaturedBroadcast(nextMarketing, currentAppCenter.marketingEnabled);
        });
    });
    window.ShopData.subscribe('appCenter', nextAppCenter => {
        applyAppCenter(nextAppCenter);
        window.ShopData.getMarketing().then(currentMarketing => {
            renderAnnouncement('homeAnnouncement', currentMarketing.announcementTitle, currentMarketing.announcementMessage, nextAppCenter.marketingEnabled);
            renderAnnouncement('shopAnnouncement', currentMarketing.announcementTitle, currentMarketing.announcementMessage, nextAppCenter.marketingEnabled);
            renderFeaturedBroadcast(currentMarketing, nextAppCenter.marketingEnabled);
        });
        window.ShopData.getDiscounts().then(currentDiscounts => {
            renderDiscounts(currentDiscounts, nextAppCenter.discountsEnabled);
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

        const latestUsers = await window.ShopData.getUsers();
        const duplicateUser = latestUsers.find(user => user.id !== activeUser?.id && (
            user.username.toLowerCase() === nextUsername.toLowerCase() ||
            user.email.toLowerCase() === nextEmail.toLowerCase()
        ));

        if (duplicateUser) {
            setStatus(accountStatusMessage, 'That username or email is already saved on this device.');
            return;
        }

        if (activeUser) {
            await saveUsersWithLatest(currentUsers => currentUsers.map(user => user.id === activeUser.id ? {
                ...user,
                name: nextName,
                username: nextUsername,
                email: nextEmail,
                contactMethod: accountContactMethodInput.value,
                contactInfo: accountContactInfoInput.value.trim(),
                updatedAt: new Date().toISOString()
            } : user));
            setStatus(accountStatusMessage, `Updated account for ${nextName}.`);
            return;
        }

        const newUser = {
            id: window.ShopData.createId('user'),
            name: nextName,
            username: nextUsername,
            email: nextEmail,
            contactMethod: accountContactMethodInput.value,
            contactInfo: accountContactInfoInput.value.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveUsersWithLatest(currentUsers => [...currentUsers, newUser]);
        window.ShopData.saveCurrentUser({ userId: newUser.id, updatedAt: new Date().toISOString() });
        setStatus(accountStatusMessage, `Created local account for ${nextName}.`);
    });
}

if (shippingProfileForm) {
    shippingProfileForm.addEventListener('submit', async event => {
        event.preventDefault();

        const activeUser = ensureActiveUser('Create or switch to an account before saving shipping details.');
        if (!activeUser) {
            return;
        }

        await saveUsersWithLatest(currentUsers => currentUsers.map(user => user.id === activeUser.id ? {
            ...user,
            shippingFullName: shippingFullNameInput.value.trim(),
            shippingAddressLine1: shippingAddressLine1Input.value.trim(),
            shippingAddressLine2: shippingAddressLine2Input.value.trim(),
            shippingCity: shippingCityInput.value.trim(),
            shippingState: shippingStateInput.value.trim(),
            shippingPostalCode: shippingPostalCodeInput.value.trim(),
            shippingCountry: shippingCountryInput.value.trim(),
            updatedAt: new Date().toISOString()
        } : user));

        setStatus(shippingStatusMessage, 'Shipping details saved to your account.');
    });
}

if (switchAccountButton) {
    switchAccountButton.addEventListener('click', () => {
        if (!savedAccountSelect?.value) {
            setStatus(accountStatusMessage, 'Choose an account to switch.');
            return;
        }

        window.ShopData.saveCurrentUser({ userId: savedAccountSelect.value, updatedAt: new Date().toISOString() });
        setStatus(accountStatusMessage, 'Switched local account.');
    });
}

if (createAccountModeButton) {
    createAccountModeButton.addEventListener('click', () => {
        window.ShopData.saveCurrentUser({ userId: '', updatedAt: new Date().toISOString() });
        accountProfileForm?.reset();
        shippingProfileForm?.reset();
        setStatus(accountStatusMessage, 'Enter account details to create a new local account.');
        setStatus(shippingStatusMessage, '');
        setStatus(cartStatusMessage, '');
    });
}

if (signOutButton) {
    signOutButton.addEventListener('click', () => {
        window.ShopData.saveCurrentUser({ userId: '', updatedAt: new Date().toISOString() });
        setStatus(accountStatusMessage, 'Signed out on this device.');
    });
}

if (moveWishlistToCartButton) {
    moveWishlistToCartButton.addEventListener('click', async () => {
        const activeUser = ensureActiveUser('Create or switch to an account before moving wishlist items.');
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
                const existingItemIndex = items.findIndex(item => item.productId === productId);
                if (existingItemIndex >= 0) {
                    items[existingItemIndex] = {
                        ...items[existingItemIndex],
                        quantity: items[existingItemIndex].quantity + 1
                    };
                } else {
                    items.push({ productId, quantity: 1 });
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
        const activeUser = ensureActiveUser('Create or switch to an account before clearing a cart.');
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

        const existingOrders = await window.ShopData.getOrders();
        window.ShopData.saveOrders([order, ...existingOrders]);

        customOrderForm.style.display = 'none';
        orderSuccess.classList.remove('hidden');
        document.getElementById('orderSuccessMessage').textContent = `Thank you, ${order.fullName || 'ghoul'}! Your custom order has been saved. We’ll confirm your total and send ${availablePaymentMethods.find(method => method.id === order.paymentMethod)?.name || 'payment'} instructions soon.`;
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
