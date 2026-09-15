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

let isPoweredOn = true;
let volumeLevel = 100;
let touchStartX = 0;
let touchEndX = 0;
let availablePaymentMethods = [];

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

    return card;
}

function renderShopProducts(products) {
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

async function initializeShopData() {
    const [products, discounts, marketing, settings, appCenter, designer, paymentMethods] = await Promise.all([
        window.ShopData.getProducts(),
        window.ShopData.getDiscounts(),
        window.ShopData.getMarketing(),
        window.ShopData.getSettings(),
        window.ShopData.getAppCenter(),
        window.ShopData.getDesigner(),
        window.ShopData.getPaymentMethods()
    ]);

    renderShopProducts(products);
    applySettings(settings);
    applyAppCenter(appCenter);
    applyDesigner(designer);
    renderPaymentMethods(paymentMethods);
    renderAnnouncement('homeAnnouncement', marketing.announcementTitle, marketing.announcementMessage, appCenter.marketingEnabled);
    renderAnnouncement('shopAnnouncement', marketing.announcementTitle, marketing.announcementMessage, appCenter.marketingEnabled);
    renderFeaturedBroadcast(marketing, appCenter.marketingEnabled);
    renderDiscounts(discounts, appCenter.discountsEnabled);

    window.ShopData.subscribe('products', renderShopProducts);
    window.ShopData.subscribe('settings', applySettings);
    window.ShopData.subscribe('designer', applyDesigner);
    window.ShopData.subscribe('paymentMethods', renderPaymentMethods);
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
