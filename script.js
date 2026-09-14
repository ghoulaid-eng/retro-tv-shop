// Initialize click sound
const clickSound = document.getElementById('clickSound');

// Create a better click sound using Web Audio API
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioContext = AudioContextClass ? new AudioContextClass() : null;

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
    } catch (e) {
        console.log('Audio context error:', e);
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

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
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

async function initializeProducts() {
    if (!window.ProductStore) {
        return;
    }

    try {
        const products = await window.ProductStore.getProducts();
        renderShopProducts(products);
        window.ProductStore.subscribe(renderShopProducts);
    } catch (error) {
        console.error('Unable to load products:', error);
        renderShopProducts([]);
    }
}

// Channel Switching Functionality
const channelSelector = document.getElementById('channelSelector');
const channels = document.querySelectorAll('.channel');

if (channelSelector && channels.length) {
    channelSelector.addEventListener('change', (e) => {
        const selectedChannel = e.target.value;

        channels.forEach(channel => {
            channel.classList.remove('active');
        });

        const targetChannel = document.getElementById(selectedChannel);
        if (targetChannel) {
            targetChannel.classList.add('active');
        }

        playClickSound();
    });
}

// Form Submission
const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');

if (customOrderForm) {
    customOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(customOrderForm);
        const data = Object.fromEntries(formData);

        console.log('Custom Order Submitted:', data);

        customOrderForm.style.display = 'none';
        orderSuccess.classList.remove('hidden');

        playClickSound();

        setTimeout(() => {
            customOrderForm.reset();
            customOrderForm.style.display = 'block';
            orderSuccess.classList.add('hidden');
        }, 3000);
    });
}

// Power Button Functionality
const powerBtn = document.getElementById('powerBtn');
let isPoweredOn = true;

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

// Volume Button Functionality
const volumeBtn = document.getElementById('volumeBtn');
let volumeLevel = 100;

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

// Smooth Scrolling for content area
const contentArea = document.querySelector('.content-area');
if (contentArea) {
    contentArea.addEventListener('wheel', () => {
        // Smooth scroll behavior
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (channels.length) {
        channels.forEach(channel => {
            channel.classList.remove('active');
        });
    }

    const homeChannel = document.getElementById('home');
    if (homeChannel) {
        homeChannel.classList.add('active');
    }

    if (channelSelector) {
        channelSelector.value = 'home';
    }

    bindClickSound();
    bindProductCardEffects();
    await initializeProducts();
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!channelSelector || !channels.length) {
        return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const options = Array.from(channelSelector.options);
        const currentIndex = channelSelector.selectedIndex;

        if (e.key === 'ArrowUp' && currentIndex > 0) {
            channelSelector.selectedIndex = currentIndex - 1;
        } else if (e.key === 'ArrowDown' && currentIndex < options.length - 1) {
            channelSelector.selectedIndex = currentIndex + 1;
        }

        channelSelector.dispatchEvent(new Event('change'));
    }
});

// Mobile touch support for better interaction
let touchStartX = 0;
let touchEndX = 0;

const contentScreenContent = document.querySelector('.screen-wrapper');
if (contentScreenContent) {
    contentScreenContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    contentScreenContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    if (!channelSelector || !channels.length) {
        return;
    }

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

console.log('%c📺 Welcome to Retro TV Shop! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
console.log('%cEnjoy your retro shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');
