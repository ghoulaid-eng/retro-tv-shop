const clickSound = document.getElementById('clickSound');
let audioContext = null;

const channelSelector = document.getElementById('channelSelector');
const channels = Array.from(document.querySelectorAll('.channel'));
const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');
const formStatus = document.getElementById('formStatus');
const powerBtn = document.getElementById('powerBtn');
const volumeBtn = document.getElementById('volumeBtn');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsList = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartSubtotal = document.getElementById('cartSubtotal');
const clearCartBtn = document.getElementById('clearCartBtn');
const statusLive = document.getElementById('statusLive');
const additionalYes = document.getElementById('additionalYes');
const additionalNo = document.getElementById('additionalNo');
const additionalSetCountGroup = document.getElementById('additionalSetCountGroup');
const additionalSetCount = document.getElementById('additionalSetCount');

const CART_STORAGE_KEY = 'retroTvCartItems';
let formResetTimer = null;
let isPoweredOn = true;
let volumeLevel = 100;
let touchStartX = 0;
let touchEndX = 0;

let cartItems = loadCart();

function getAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        return null;
    }

    if (!audioContext) {
        const AudioConstructor = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioConstructor();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    return audioContext;
}

function playClickSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.start(now);
        osc.stop(now + 0.08);
    } catch (error) {
        console.warn('Audio context error:', error);
    }
}

function announceStatus(message) {
    if (statusLive) {
        statusLive.textContent = message;
    }
}

function setChannel(channelId, shouldPlaySound = false) {
    if (!channels.length) return;
    const targetChannel = channels.find((channel) => channel.id === channelId);
    if (!targetChannel) return;

    channels.forEach((channel) => {
        const isActive = channel.id === channelId;
        channel.classList.toggle('active', isActive);
        channel.hidden = !isActive;
        channel.setAttribute('aria-hidden', String(!isActive));
    });

    if (channelSelector && channelSelector.value !== channelId) {
        channelSelector.value = channelId;
    }

    if (shouldPlaySound) {
        playClickSound();
    }
}

function formatCurrency(value) {
    return `$${value.toFixed(2)}`;
}

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to load cart from storage:', error);
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
        console.warn('Failed to save cart to storage:', error);
    }
}

function getCartCount() {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCart() {
    if (!cartItemsList || !cartEmpty || !cartSubtotal || !cartCount) return;

    cartItemsList.innerHTML = '';

    cartItems.forEach((item) => {
        const lineItem = document.createElement('li');
        lineItem.className = 'cart-item';

        const details = document.createElement('div');
        details.className = 'cart-item-details';

        const title = document.createElement('h3');
        title.textContent = item.name;
        details.appendChild(title);

        const quantity = document.createElement('p');
        quantity.textContent = `${formatCurrency(item.price)} × ${item.quantity}`;
        details.appendChild(quantity);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-item-btn click-item';
        removeButton.dataset.action = 'remove-item';
        removeButton.dataset.productId = item.id;
        removeButton.dataset.skipClickSound = 'true';
        removeButton.setAttribute('aria-label', `Remove all ${item.name} items from cart`);
        removeButton.textContent = 'Remove All';

        lineItem.append(details, removeButton);
        cartItemsList.appendChild(lineItem);
    });

    const totalCount = getCartCount();
    cartCount.textContent = String(totalCount);
    cartEmpty.hidden = totalCount > 0;
    cartItemsList.hidden = totalCount === 0;
    cartSubtotal.textContent = formatCurrency(getCartSubtotal());

    if (clearCartBtn) {
        clearCartBtn.disabled = totalCount === 0;
    }
}

function addItemToCart(productCard) {
    if (!productCard) return;

    const id = productCard.dataset.productId;
    const name = productCard.dataset.productName;
    const price = Number.parseFloat(productCard.dataset.productPrice || '0');

    if (!id || !name || Number.isNaN(price)) return;

    const existingItem = cartItems.find((item) => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({ id, name, price, quantity: 1 });
    }

    saveCart();
    renderCart();
    announceStatus(`${name} added to cart.`);
}

function removeItemFromCart(productId) {
    const item = cartItems.find((entry) => entry.id === productId);
    cartItems = cartItems.filter((entry) => entry.id !== productId);
    saveCart();
    renderCart();
    if (item) {
        announceStatus(`${item.name} removed from cart.`);
    }
}

function clearCart() {
    cartItems = [];
    saveCart();
    renderCart();
    announceStatus('Cart cleared.');
}

function hideOrderSuccess() {
    if (orderSuccess) {
        orderSuccess.classList.add('hidden');
    }
}

function updateAdditionalSetCountState() {
    if (!additionalSetCountGroup || !additionalSetCount) return;

    const shouldShow = !!(additionalYes && additionalYes.checked);
    additionalSetCountGroup.hidden = !shouldShow;
    additionalSetCountGroup.setAttribute('aria-hidden', String(!shouldShow));
    additionalSetCount.disabled = !shouldShow;
    additionalSetCount.required = shouldShow;
    additionalSetCount.setCustomValidity('');

    if (!shouldShow) {
        additionalSetCount.value = '';
    }
}

function setFormStatus(message, isError = false) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.toggle('error', isError);
    formStatus.classList.toggle('success', !isError && !!message);
}

function clearFormState() {
    if (formResetTimer) {
        clearTimeout(formResetTimer);
        formResetTimer = null;
    }

    hideOrderSuccess();
    setFormStatus('');
}

function setupCartInteractions() {
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            setChannel('cart', true);
        });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            clearCart();
            playClickSound();
        });
    }

    document.addEventListener('click', (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) return;

        const action = actionButton.dataset.action;

        if (action === 'add-to-cart') {
            const productCard = actionButton.closest('.product-card');
            addItemToCart(productCard);
            playClickSound();
        }

        if (action === 'remove-item') {
            removeItemFromCart(actionButton.dataset.productId);
            playClickSound();
        }
    });
}

function setupChannelSelector() {
    if (!channelSelector) return;

    channelSelector.addEventListener('change', (event) => {
        setChannel(event.target.value, true);
    });
}

function setupGlobalClickSound() {
    document.addEventListener('click', (event) => {
        const clickTarget = event.target.closest('.click-item');
        if (!clickTarget) return;
        if (clickTarget.dataset.skipClickSound === 'true') return;
        playClickSound();
    });
}

function setupCustomOrderForm() {
    if (!customOrderForm) return;

    if (additionalYes) {
        additionalYes.addEventListener('change', updateAdditionalSetCountState);
    }
    if (additionalNo) {
        additionalNo.addEventListener('change', updateAdditionalSetCountState);
    }

    customOrderForm.addEventListener('invalid', (event) => {
        const field = event.target;
        if (!(field instanceof HTMLElement) || typeof field.setAttribute !== 'function') return;

        field.setAttribute('aria-invalid', 'true');
        setFormStatus('Please complete the required fields highlighted by your browser.', true);
    }, true);

    customOrderForm.addEventListener('input', (event) => {
        const field = event.target;
        if (!(field instanceof HTMLElement) || typeof field.setAttribute !== 'function') return;

        const isValidField = !('checkValidity' in field) || field.checkValidity();
        field.setAttribute('aria-invalid', String(!isValidField));
        if ('setCustomValidity' in field) {
            field.setCustomValidity('');
        }
        clearFormState();
    });

    customOrderForm.addEventListener('reset', () => {
        clearFormState();
        setTimeout(() => {
            updateAdditionalSetCountState();
            if (customOrderForm) {
                customOrderForm.style.display = 'block';
            }
        }, 0);
    });

    customOrderForm.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFormState();

        if (!customOrderForm.checkValidity()) {
            customOrderForm.reportValidity();
            return;
        }

        const formData = new FormData(customOrderForm);
        const data = Object.fromEntries(formData);
        console.log('Custom Order Submitted:', data);

        customOrderForm.style.display = 'none';
        if (orderSuccess) {
            orderSuccess.classList.remove('hidden');
        }

        setFormStatus('Order submitted successfully.');
        announceStatus('Custom order submitted successfully.');
        playClickSound();

        formResetTimer = setTimeout(() => {
            customOrderForm.reset();
            customOrderForm.style.display = 'block';
        }, 3000);
    });

    updateAdditionalSetCountState();
}

function setupPowerControl() {
    if (!powerBtn) return;

    powerBtn.addEventListener('click', () => {
        isPoweredOn = !isPoweredOn;
        const screenContent = document.getElementById('screenContent');

        if (!isPoweredOn) {
            if (screenContent) {
                screenContent.style.opacity = '0.3';
                screenContent.style.animation = 'none';
            }
            powerBtn.style.background = 'linear-gradient(135deg, #666 0%, #333 100%)';
            powerBtn.style.boxShadow = '0 0 10px rgba(100, 100, 100, 0.5)';
        } else {
            if (screenContent) {
                screenContent.style.opacity = '1';
                screenContent.style.animation = 'tvGlow 3s ease-in-out infinite';
            }
            powerBtn.style.background = 'linear-gradient(135deg, #da70d6 0%, #ff69b4 100%)';
            powerBtn.style.boxShadow = '0 5px 15px rgba(255, 105, 180, 0.4)';
        }
    });
}

function setupVolumeControl() {
    if (!volumeBtn) return;

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

        const randomPulse = Math.random() * 0.3 + 0.2;
        volumeBtn.style.transform = `scale(${1 + randomPulse})`;
        setTimeout(() => {
            volumeBtn.style.transform = 'scale(1)';
        }, 200);
    });
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
        if (!channelSelector) return;
        if (document.activeElement !== channelSelector) return;

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const options = Array.from(channelSelector.options);
            const currentIndex = channelSelector.selectedIndex;

            if (event.key === 'ArrowUp' && currentIndex > 0) {
                channelSelector.selectedIndex = currentIndex - 1;
            } else if (event.key === 'ArrowDown' && currentIndex < options.length - 1) {
                channelSelector.selectedIndex = currentIndex + 1;
            }

            channelSelector.dispatchEvent(new Event('change'));
        }
    });
}

function setupSwipeNavigation() {
    const screenWrapper = document.querySelector('.screen-wrapper');
    if (!screenWrapper) return;

    screenWrapper.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    screenWrapper.addEventListener('touchend', (event) => {
        touchEndX = event.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    if (!channelSelector) return;

    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        const options = Array.from(channelSelector.options);
        const currentIndex = channelSelector.selectedIndex;

        if (diff > 0 && currentIndex < options.length - 1) {
            channelSelector.selectedIndex = currentIndex + 1;
        } else if (diff < 0 && currentIndex > 0) {
            channelSelector.selectedIndex = currentIndex - 1;
        }

        channelSelector.dispatchEvent(new Event('change'));
    }
}

function setupProductCardRipple() {
    const productCards = document.querySelectorAll('.product-card, .product-detail');
    productCards.forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.backgroundPosition = `${x}px ${y}px`;
        });
    });
}

function initializePage() {
    setChannel('home');
    setupChannelSelector();
    setupGlobalClickSound();
    setupCartInteractions();
    setupCustomOrderForm();
    setupPowerControl();
    setupVolumeControl();
    setupKeyboardNavigation();
    setupSwipeNavigation();
    setupProductCardRipple();
    renderCart();

    if (clickSound) {
        clickSound.volume = 0.2;
    }

    console.log('%c📺 Welcome to Retro TV Shop! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
    console.log('%cEnjoy your retro shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');
}

document.addEventListener('DOMContentLoaded', initializePage);
