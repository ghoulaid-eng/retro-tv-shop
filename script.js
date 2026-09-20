// Initialize click sound
const clickSound = document.getElementById('clickSound');
let audioContext = null;

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

// Channel Switching Functionality
const channelSelector = document.getElementById('channelSelector');
const channels = document.querySelectorAll('.channel');

if (channelSelector) {
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

// Add click sound to all clickable items
const clickItems = document.querySelectorAll('.click-item');
clickItems.forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
    });
});

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

        if (orderSuccess) {
            orderSuccess.classList.remove('hidden');
        }

        playClickSound();

        setTimeout(() => {
            customOrderForm.reset();
            customOrderForm.style.display = 'block';

            if (orderSuccess) {
                orderSuccess.classList.add('hidden');
            }
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

// Add ripple effect on product cards
const productCards = document.querySelectorAll('.product-card, .product-detail');
productCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.backgroundPosition = `${x}px ${y}px`;
    });
});

// Initialize page with home channel
document.addEventListener('DOMContentLoaded', () => {
    channels.forEach(channel => {
        channel.classList.remove('active');
    });

    const homeChannel = document.getElementById('home');
    if (homeChannel) {
        homeChannel.classList.add('active');
    }

    if (channelSelector) {
        channelSelector.value = 'home';
    }
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!channelSelector) return;

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
    }, { passive: true });

    contentScreenContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
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

// Add some fun interactions
console.log('%c📺 Welcome to Retro TV Shop! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
console.log('%cEnjoy your retro shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');

if (clickSound) {
    clickSound.volume = 0.2;
}
