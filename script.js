// Initialize click sound
const clickSound = document.getElementById('clickSound');

// Create a better click sound using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
    try {
        // Create oscillator for click sound
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        // Click sound parameters
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

// Channel Switching Functionality
const channelSelector = document.getElementById('channelSelector');
const channels = document.querySelectorAll('.channel');

channelSelector.addEventListener('change', (e) => {
    const selectedChannel = e.target.value;
    
    // Hide all channels
    channels.forEach(channel => {
        channel.classList.remove('active');
    });
    
    // Show selected channel
    const targetChannel = document.getElementById(selectedChannel);
    if (targetChannel) {
        targetChannel.classList.add('active');
    }
    
    // Play click sound
    playClickSound();
});

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
        
        // Get form data
        const formData = new FormData(customOrderForm);
        const data = Object.fromEntries(formData);
        
        // Log the data (in a real app, this would be sent to a server)
        console.log('Custom Order Submitted:', data);
        
        // Show success message
        customOrderForm.style.display = 'none';
        orderSuccess.classList.remove('hidden');
        
        // Play success sound
        playClickSound();
        
        // Reset after 3 seconds
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
        
        // Visual feedback
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
    contentArea.addEventListener('wheel', (e) => {
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
        
        // Apply subtle glow at mouse position
        card.style.backgroundPosition = `${x}px ${y}px`;
    });
});

// Initialize page with home channel
document.addEventListener('DOMContentLoaded', () => {
    channels.forEach(channel => {
        channel.classList.remove('active');
    });
    document.getElementById('home').classList.add('active');
    channelSelector.value = 'home';
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const options = Array.from(channelSelector.options);
        const currentIndex = channelSelector.selectedIndex;
        
        if (e.key === 'ArrowUp' && currentIndex > 0) {
            channelSelector.selectedIndex = currentIndex - 1;
        } else if (e.key === 'ArrowDown' && currentIndex < options.length - 1) {
            channelSelector.selectedIndex = currentIndex + 1;
        }
        
        // Trigger change event
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
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        const options = Array.from(channelSelector.options);
        const currentIndex = channelSelector.selectedIndex;
        
        if (diff > 0 && currentIndex < options.length - 1) {
            // Swiped left - next channel
            channelSelector.selectedIndex = currentIndex + 1;
        } else if (diff < 0 && currentIndex > 0) {
            // Swiped right - previous channel
            channelSelector.selectedIndex = currentIndex - 1;
        }
        
        channelSelector.dispatchEvent(new Event('change'));
    }
}

// Add some fun interactions
console.log('%c📺 Welcome to Sip of Ghoulaid! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
console.log('%cEnjoy your retro shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');
