const CATALOG_KEY = 'sip-of-ghoulaid-catalog';
const defaultCatalog = [
    { id: 'xl-melts', name: 'Extra Large Wax Melts', category: 'Wax Melts', icon: '🕯️', price: 16, stock: 8, description: 'Hand-poured and hand-painted statement melts. Pick your scent family!', image: '', available: true },
    { id: 'full-melts', name: 'Full Size Wax Melts', category: 'Wax Melts', icon: '🔥', price: 9, stock: 12, description: 'Spooky scents ready to haunt every corner of your space.', image: '', available: true },
    { id: 'mini-melts', name: 'Mini Wax Melts', category: 'Wax Melts', icon: '✨', price: 5, stock: 18, description: 'Small but mighty creepy-cute designs for a tiny dose of chaos.', image: '', available: true },
    { id: 'book-accessories', name: 'Book Accessories', category: 'Accessories', icon: '📚', price: 7, stock: 10, description: 'Bookmarks and reading companions for the delightfully unhinged.', image: '', available: true },
    { id: 'headset-holder', name: 'Headset Holder', category: 'Accessories', icon: '🎧', price: 22, stock: 4, description: '3D-printed custom designs to keep your setup spooky.', image: '', available: true },
    { id: 'gift-boxes', name: 'Gift Boxes', category: 'Gift Boxes', icon: '🎁', price: 28, stock: 6, description: 'Curated collections for gifting your favorite ghoul.', image: '', available: true }
];
let audioContext;

function getCatalog() {
    try {
        const savedCatalog = JSON.parse(localStorage.getItem(CATALOG_KEY));
        return Array.isArray(savedCatalog) ? savedCatalog : defaultCatalog;
    } catch {
        return defaultCatalog;
    }
}

function escapeHtml(value) {
    const node = document.createElement('span');
    node.textContent = value;
    return node.innerHTML;
}

function playClickSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioContext = audioContext || new AudioContextClass();
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
            gain.connect(audioContext.destination);
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

guideToggle.addEventListener('click', () => {
    const isOpen = !guideOptions.hidden;
    guideOptions.hidden = isOpen;
    guideToggle.setAttribute('aria-expanded', String(!isOpen));
});

guideChannels.forEach((button) => {
    button.addEventListener('click', () => tuneToChannel(button.dataset.channel));
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
function renderCatalog() {
    const products = getCatalog().filter((product) => product.available && (activeCategory === 'all' || product.category === activeCategory));
    shopGrid.innerHTML = products.map((product) => `
        <article class="product-card">
            ${product.image ? `<img class="product-photo" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">` : `<div class="product-image" aria-hidden="true">${escapeHtml(product.icon || '👻')}</div>`}
            <p class="product-category">${escapeHtml(product.category)}</p>
            <h3>${escapeHtml(product.name)}</h3>
            <p class="product-desc">${escapeHtml(product.description)}</p>
            <p class="product-price">$${Number(product.price || 0).toFixed(2)}</p>
            <span class="availability">IN STOCK</span>
        </article>`).join('');
    catalogEmpty.classList.toggle('hidden', products.length > 0);
}

document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
        activeCategory = button.dataset.category;
        document.querySelectorAll('.filter-btn').forEach((filter) => filter.classList.toggle('active', filter === button));
        renderCatalog();
    });
});

const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');
customOrderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    customOrderForm.hidden = true;
    orderSuccess.classList.remove('hidden');
    setTimeout(() => {
        customOrderForm.reset();
        customOrderForm.hidden = false;
        orderSuccess.classList.add('hidden');
    }, 3000);
});
customOrderForm.addEventListener('reset', () => orderSuccess.classList.add('hidden'));

const powerBtn = document.getElementById('powerBtn');
let isPoweredOn = true;
powerBtn.addEventListener('click', () => {
    isPoweredOn = !isPoweredOn;
    document.getElementById('screenContent').classList.toggle('screen-off', !isPoweredOn);
    powerBtn.setAttribute('aria-pressed', String(!isPoweredOn));
});

const volumeBtn = document.getElementById('volumeBtn');
const volumeIcons = ['🔊', '🔉', '🔈', '🔇'];
let volumeIndex = 0;
volumeBtn.addEventListener('click', () => {
    volumeIndex = (volumeIndex + 1) % volumeIcons.length;
    volumeBtn.textContent = volumeIcons[volumeIndex];
});

document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, a, input[type="radio"], input[type="checkbox"]')) {
        playClickSound();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    showChannel('home');
    renderCatalog();
    setTimeout(() => {
        screenContent.classList.remove('is-booting');
        document.getElementById('tvBoot').remove();
    }, 1350);
});

window.addEventListener('storage', (event) => {
    if (event.key === CATALOG_KEY) renderCatalog();
});
