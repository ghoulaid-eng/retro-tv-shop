const clickSound = document.getElementById('clickSound');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext = null;
const channelSelector = document.getElementById('channelSelector');
const channels = document.querySelectorAll('.channel');
const customOrderForm = document.getElementById('customOrderForm');
const orderSuccess = document.getElementById('orderSuccess');
const formStatus = document.getElementById('formStatus');
const statusLive = document.getElementById('statusLive');
const tvBootOverlay = document.getElementById('tvBootOverlay');
const channelIndicator = document.getElementById('channelIndicator');
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
const customerAuthPanel = document.getElementById('customerAuthPanel');
const customerAuthForm = document.getElementById('customerAuthForm');
const customerAuthEmailInput = document.getElementById('customerAuthEmail');
const customerAuthPasswordInput = document.getElementById('customerAuthPassword');
const customerCreateAccountButton = document.getElementById('customerCreateAccount');
const customerMagicLinkButton = document.getElementById('customerMagicLink');
const signOutButton = document.getElementById('signOutButton');
const accountProfilePanel = document.getElementById('accountProfilePanel');
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
const shippingProfilePanel = document.getElementById('shippingProfilePanel');
const savedPaymentsPanel = document.getElementById('savedPaymentsPanel');
const savedPaymentMethods = document.getElementById('savedPaymentMethods');
const savedPaymentsStatus = document.getElementById('savedPaymentsStatus');
const addPaymentMethodButton = document.getElementById('addPaymentMethodButton');
const managePaymentMethodsButton = document.getElementById('managePaymentMethodsButton');
const accountCartPanel = document.getElementById('accountCartPanel');
const wishlistList = document.getElementById('wishlistList');
const wishlistStatusMessage = document.getElementById('wishlistStatusMessage');
const memberLoungeLocked = document.getElementById('memberLoungeLocked');
const memberLoungeContent = document.getElementById('memberLoungeContent');
const memberLoungeGreeting = document.getElementById('memberLoungeGreeting');
const memberRecentOrders = document.getElementById('memberRecentOrders');
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
const checkoutButton = document.getElementById('checkoutButton');
const commerceModeMessage = document.getElementById('commerceModeMessage');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const contactMethodInput = document.getElementById('contactMethod');
const contactInfoInput = document.getElementById('contactInfo');
const reviewForm = document.getElementById('reviewForm');
const reviewNicknameInput = document.getElementById('reviewNickname');
const reviewRatingInput = document.getElementById('reviewRating');
const reviewProductInput = document.getElementById('reviewProduct');
const reviewCommentInput = document.getElementById('reviewComment');
const reviewStatus = document.getElementById('reviewStatus');
const reviewsList = document.getElementById('reviewsList');
const orderSupportForm = document.getElementById('orderSupportForm');
const orderSupportStatus = document.getElementById('orderSupportStatus');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistStatus = document.getElementById('waitlistStatus');
const productDetailContent = document.getElementById('productDetailContent');
const productDetailBack = document.getElementById('productDetailBack');
const policyContent = document.getElementById('policyContent');
const musicPlayer = document.getElementById('musicPlayer');
const musicVideo = document.getElementById('musicVideo');
const musicTrackTitle = document.getElementById('musicTrackTitle');
const musicTrackArtist = document.getElementById('musicTrackArtist');
const musicPlayPauseButton = document.getElementById('musicPlayPause');
const musicNextButton = document.getElementById('musicNext');

let isPoweredOn = true;
let volumeLevel = 100;
let touchStartX = 0;
let touchEndX = 0;
let shopProducts = [];
let latestBroadcastTimer = null;
let latestBroadcastProductId = '';
let latestBroadcastDeck = [];
let availablePaymentMethods = [];
let savedUsers = [];
let currentUserState = {};
let wishlists = [];
let carts = [];
let currentSettings = {};
let commerceCapabilities = {
    catalogAvailable: false,
    customOrdersAvailable: false,
    checkoutAvailable: false,
    automaticTaxEnabled: false,
    freeShippingThresholdCents: 5000,
    localPickupAvailable: false
};
let catalogSource = 'browser-local';
let musicSongs = [];
let musicSongIndex = 0;
let customerSupabaseClient = null;
let customerSession = null;
let customerProfile = null;
const MAX_CART_LINE_QUANTITY = 10;
const MAX_CART_LINES = 50;
const REVIEWS_STORAGE_KEY = 'sip-of-ghoulaid-reviews';
const CHANNEL_NUMBERS = {
    home: '01',
    shop: '02',
    'product-detail': '02',
    account: '03',
    'custom-order': '04',
    waitlist: '05',
    summon: '06',
    about: '07',
    reviews: '08',
    wishlist: '09',
    'member-lounge': '10',
    policies: '--'
};
const POLICY_CONTENT = {
    privacy: {
        title: 'Privacy Policy',
        updated: 'April 17, 2026',
        intro: [
            'This Privacy Policy explains how Sip of Ghoulaid collects, uses, and shares your personal information when you shop on this website or contact us.',
            'Sip of Ghoulaid is a small handmade business based in Southern California, United States.'
        ],
        sections: [
            {
                heading: 'Information We Collect',
                paragraphs: ['When you place an order, we receive:'],
                bullets: ['Your name', 'Shipping address', 'Email address', 'Phone number, if provided', 'Order details'],
                after: ['If you message us, we collect your name, email, and message content. If you join the monthly mystery-box waitlist, we collect your email address to send availability and related subscription updates.', 'We do not collect or store payment-card information. Payments are processed securely by Stripe or the applicable payment provider.']
            },
            {
                heading: 'How We Use Your Information',
                bullets: ['Process and ship your orders', 'Send shipping updates and respond to your messages', 'Provide customer support', 'Meet legal and tax record-keeping requirements']
            },
            {
                heading: 'Sharing Your Information',
                paragraphs: ['We do not sell or rent your information. We may share it only as needed with:'],
                bullets: ['Shipping carriers such as USPS or UPS to deliver your package', 'Stripe and other payment processors to complete transactions', 'Service providers that host or operate our storefront', 'Legal authorities if required by law']
            },
            {
                heading: 'Data Retention',
                paragraphs: ['We keep order information only as long as needed to fulfill orders, provide support, and comply with tax laws—usually 3–7 years—then securely delete or anonymize it.']
            },
            {
                heading: 'Your Rights',
                paragraphs: ['You can request access to, correction of, or deletion of your personal information by contacting us. California residents may have additional rights under state law.']
            },
            {
                heading: 'Security',
                paragraphs: ['We take reasonable steps to protect your data, but no online method is 100% secure.']
            },
            {
                heading: 'Changes to This Policy',
                paragraphs: ['We may update this policy occasionally. The “Last Updated” date shows the latest version.']
            },
            {
                heading: 'Contact Us',
                paragraphs: ['Sip of Ghoulaid', 'California, United States', 'Email: support@sipofghoulaid.com', 'By placing an order, you agree to this Privacy Policy.']
            }
        ]
    },
    terms: {
        title: 'Terms and Conditions',
        updated: 'April 17, 2026',
        intro: ['Welcome to Sip of Ghoulaid! These Terms and Conditions govern your purchase of products from our shop. By placing an order, you agree to these terms.'],
        sections: [
            { heading: '1. Our Products', paragraphs: ['All items are handmade in small batches using premium soy wax and fragrance oils. Slight variations in color, shape, scent strength, or fill level are normal and part of the handmade process. We strive for consistency, but exact matches to photos cannot be guaranteed.'] },
            { heading: '2. Orders and Pricing', bullets: ['All prices are in USD and include any applicable taxes unless stated otherwise.', 'We reserve the right to correct pricing or typographical errors before shipping.', 'We may refuse, cancel, or limit any order at our discretion, including suspected fraud or stock issues.'] },
            { heading: '3. Payments', paragraphs: ['Payments are processed securely through Stripe and its payment providers. We do not store your payment-card information.'] },
            { heading: '4. Shipping and Delivery', bullets: ['Shipping times are estimates only and not guaranteed. Delays due to carriers, weather, or high volume may occur.', 'Once your package is handed to the carrier, we are not responsible for carrier delays.', 'Please provide a correct shipping address. We are not liable for orders sent to incorrect addresses.'] },
            { heading: '5. Returns, Refunds, and Exchanges', paragraphs: ['All sales are final. Please see our separate No Returns or Refunds Policy for full details. We do not accept returns or exchanges due to the handmade and perishable nature of our wax products.'] },
            { heading: '6. Intellectual Property', paragraphs: ['All shop content—including photos, descriptions, designs, logos, and product names—is owned by Sip of Ghoulaid and protected by copyright and trademark laws. You may not use, copy, or reproduce our content without written permission.'] },
            { heading: '7. Limitation of Liability', paragraphs: ['To the fullest extent permitted by law, Sip of Ghoulaid is not liable for indirect, incidental, or consequential damages arising from your purchase or use of our products. Our total liability shall not exceed the amount paid for the specific item in question.'] },
            { heading: '8. Product Use and Safety', paragraphs: ['Our wax melts are for use in electric warmers only. Never leave a warmer unattended. Keep out of reach of children and pets. We are not responsible for damage, injury, or issues resulting from improper use.'] },
            { heading: '9. Changes to Terms', paragraphs: ['We may update these Terms and Conditions occasionally. The “Last Updated” date shows the latest version. Continued use of our shop after changes means you accept the updated terms.'] },
            { heading: '10. Governing Law', paragraphs: ['These terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles.'] },
            { heading: 'Contact Us', paragraphs: ['Questions about these Terms and Conditions may be sent to support@sipofghoulaid.com.'] }
        ]
    },
    shipping: {
        title: 'Shipping and Delivery Policy',
        updated: 'April 17, 2026',
        intro: ['Thank you for shopping with Sip of Ghoulaid!'],
        sections: [
            { heading: 'Processing Time', paragraphs: ['All orders are handmade to order. Please allow 1–3 business days for processing and preparation before your order ships. During busy periods or holidays, processing may take up to 5 business days. We will notify you if there is a delay.'] },
            { heading: 'Shipping Methods and Costs', paragraphs: ['We ship within the United States via USPS.'], bullets: ['Shipping cost is calculated at checkout based on your location and package weight.', 'Standard shipping is available. Expedited or priority options may be available at checkout.'] },
            { heading: 'Shipping Times', bullets: ['Standard shipping: 3–7 business days, not guaranteed'], after: ['Shipping times are estimates and can be affected by carrier delays, weather, holidays, or high shipping volume. We are not responsible for delays caused by the shipping carrier.'] },
            { heading: 'Order Tracking', paragraphs: ['You will receive a tracking number by email once your package ships. You can track your order through the link provided or on the USPS website.'] },
            { heading: 'International Shipping', paragraphs: ['We do not offer international shipping at this time.'] },
            { heading: 'Address Accuracy', paragraphs: ['Please double-check your shipping address at checkout. We are not responsible for orders shipped to an incorrect or incomplete address. If an order is returned due to an incorrect address, you are responsible for reshipping costs, or we may issue a refund minus original shipping fees.'] },
            { heading: 'Damaged or Lost Packages', paragraphs: ['If your package arrives damaged, contact us with photos within 48 hours of delivery.', 'If your package is lost by the carrier, we will work with you and the carrier to resolve the issue.'] },
            { heading: 'Questions', paragraphs: ['Email support@sipofghoulaid.com with shipping questions.'] }
        ]
    },
    returns: {
        title: 'No Returns or Refunds Policy',
        intro: ['Due to the handmade and custom nature of our products, we do not accept returns, exchanges, or refunds. All sales are final.'],
        sections: [
            {
                heading: 'Please Note',
                bullets: [
                    'Each item is made to order with care using premium soy wax and fragrance oils.',
                    'We thoroughly inspect every order before shipping to ensure quality.',
                    'Slight variations in color, shape, or fill level are normal and part of the handmade process.',
                    'Once an item leaves our studio, we cannot accept returns for hygiene and safety reasons because melted-wax products cannot be resold.'
                ]
            },
            {
                heading: 'Exceptions',
                paragraphs: ['We want you to be happy with your purchase. If your item arrives damaged or significantly different from what you ordered—for example, the wrong scent or a broken item—contact us with photos within 48 hours of delivery. We will review your case and may offer a replacement or refund at our discretion.']
            },
            {
                heading: 'Before Purchasing',
                bullets: ['Read the full item description carefully', 'Check all listing photos', 'Message us with any questions before buying'],
                after: ['By completing your purchase, you agree to this No Returns or Refunds Policy.']
            }
        ]
    },
    'custom-orders': {
        title: 'Custom Order and Deposit Policy',
        updated: 'April 17, 2026',
        intro: ['Custom pieces require design, mold-making, printing, pouring, curing, painting, and other work that begins specifically for your order.'],
        sections: [
            { heading: 'Approval and Quote', paragraphs: ['Submitting a custom-order request is not an accepted order. We will discuss the design, scope, timing, and final price with you before work begins. A custom order starts only after you approve the written details and deposit request.'] },
            { heading: '50% Non-Refundable Deposit', paragraphs: ['A deposit equal to 50% of the approved custom-order total is required before design or production begins. The deposit is non-refundable because it reserves production time and covers design work, custom materials, molds, prototypes, and other order-specific costs.'] },
            { heading: 'Remaining Balance', paragraphs: ['The remaining balance and any approved shipping charges are due before the completed order ships. The order will not ship until payment is complete.'] },
            { heading: 'Changes and Cancellations', paragraphs: ['Requested changes may affect price and delivery timing. Changes made after approval may require an additional payment. If you cancel after paying the deposit, the deposit is retained. Work completed beyond the deposit amount may also be invoiced.'] },
            { heading: 'Creative Variations', paragraphs: ['Handmade custom products may have slight differences in color, shape, finish, scent strength, or other details. These normal handmade variations are not defects.'] },
            { heading: 'One-of-a-Kind Work', paragraphs: ['When an order is approved as one-of-a-kind, its custom mold may be retired after fulfillment as described in the approved order details.'] },
            { heading: 'Agreement', paragraphs: ['Paying the deposit confirms that you approve the custom-order details and agree to this policy and the shop’s No Returns or Refunds Policy.'] }
        ]
    },
    contact: {
        title: 'Contact and Support Policy',
        updated: 'April 17, 2026',
        intro: ['We are here to help with product questions, order updates, shipping concerns, damaged deliveries, and custom-order discussions.'],
        sections: [
            { heading: 'Contact', paragraphs: ['Email: support@sipofghoulaid.com', 'You may also use the Order Support form on the Summon Us channel for an existing checkout order.'] },
            { heading: 'What to Include', bullets: ['Your order ID and the email used for the order', 'A clear description of the issue', 'Photos of damage or an incorrect item when applicable'] },
            { heading: 'Damaged or Incorrect Orders', paragraphs: ['Report damaged or significantly incorrect items with photos within 48 hours of delivery so we can review the issue.'] },
            { heading: 'Response Time', paragraphs: ['We aim to respond within 2 business days. Response times may be longer during holidays or high-volume periods.'] },
            { heading: 'Payment Security', paragraphs: ['Never email payment-card numbers or account passwords. We will never ask you to send full payment-card information by email or through the support form.'] }
        ]
    },
    legal: {
        title: 'Legal Notice',
        updated: 'April 17, 2026',
        intro: ['Sip of Ghoulaid is a small handmade business offering soy wax melts and resin products. All items are created and sold by Sip of Ghoulaid.'],
        sections: [
            { heading: 'Intellectual Property', paragraphs: ['All shop content—including product photos, descriptions, designs, logos, product names, and branding—is the exclusive property of Sip of Ghoulaid and is protected by United States copyright and trademark laws.', 'You may not copy, reproduce, distribute, modify, or use our content for commercial or personal purposes without prior written permission.'] },
            { heading: 'Product Information', paragraphs: ['While we strive for accuracy, product descriptions, colors, and images are illustrative. Slight variations are normal due to the handmade nature of our products and may occur from batch to batch.'] },
            { heading: 'Disclaimer of Warranties', paragraphs: ['All products are provided “as is” without express or implied warranties. We do not guarantee a specific scent strength or melt time because results vary based on warmer type, room conditions, and usage.'] },
            { heading: 'Limitation of Liability', paragraphs: ['To the fullest extent permitted by law, Sip of Ghoulaid shall not be liable for direct, indirect, incidental, or consequential damages arising from the purchase or use of our products.'] },
            { heading: 'Governing Law', paragraphs: ['This Legal Notice and disputes related to our shop are governed by the laws of the State of California, United States.'] },
            { heading: 'Contact Information', paragraphs: ['For legal inquiries or permission requests, email support@sipofghoulaid.com.'] }
        ]
    }
};

async function commerceRequest(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(path, {
            ...options,
            headers: {
                Accept: 'application/json',
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.message || `Request failed (${response.status}).`);
            error.status = response.status;
            error.code = payload.error;
            throw error;
        }

        return payload;
    } finally {
        clearTimeout(timeout);
    }
}

async function customerRequest(path, options = {}) {
            const accessToken = customerSession?.access_token;
            if (!accessToken) {
                throw new Error('Sign in to continue.');
            }
            return commerceRequest(path, {
                ...options,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...(options.headers || {})
                }
            });
        }

        function getCustomerDisplayName() {
            return customerProfile?.name || customerSession?.user?.email?.split('@')[0] || 'Ghoul';
        }

        async function loadRecentOrders() {
                if (!memberRecentOrders || !customerSession) {
                    return;
                }
                memberRecentOrders.replaceChildren();
                try {
                    const { orders } = await customerRequest('/api/customer/orders');
                    if (!orders.length) {
                        const empty = document.createElement('p');
                        empty.textContent = 'No completed checkouts are linked to this account yet.';
                        memberRecentOrders.appendChild(empty);
                        return;
                    }
                    orders.forEach(order => {
                        const item = document.createElement('div');
                        item.className = 'account-list-item';
                        const date = new Date(order.createdAt).toLocaleDateString();
                        const total = formatMoney(
                            Number(order.subtotal || 0)
                            + Number(order.shippingAmount || 0)
                            + Number(order.taxAmount || 0)
                        );
                        item.textContent = `${date} · ${total} · ${order.status || 'processing'}`;
                        memberRecentOrders.appendChild(item);
                    });
                } catch (error) {
                    const message = document.createElement('p');
                    message.textContent = error.message;
                    memberRecentOrders.appendChild(message);
                }
            }

        async function loadSavedPaymentMethods() {
            if (!savedPaymentMethods || !savedPaymentsStatus || !customerSession) {
                return;
            }
            savedPaymentMethods.innerHTML = '';
            savedPaymentsStatus.textContent = 'Checking your Stripe wallet...';
            try {
                const { paymentMethods } = await customerRequest('/api/customer/payment-methods');
                if (!paymentMethods.length) {
                    savedPaymentsStatus.textContent = 'No saved payment methods yet. Card details stay securely with Stripe.';
                    return;
                }
                savedPaymentsStatus.textContent = '';
                paymentMethods.forEach(method => {
                    const item = document.createElement('li');
                    item.className = 'account-list-item';
                    item.textContent = `${String(method.brand || 'card').toUpperCase()} ending in ${method.last4} · expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}`;
                    savedPaymentMethods.appendChild(item);
                });
            } catch (error) {
                savedPaymentsStatus.textContent = error.message;
            }
        }

        async function loadCustomerProfile() {
            const { profile } = await customerRequest('/api/customer/profile');
            customerProfile = profile;
            currentUserState = customerSession
                ? { userId: customerSession.user.id, email: customerSession.user.email }
                : {};
            savedUsers = customerSession
                ? [{
                    id: customerSession.user.id,
                    email: customerSession.user.email,
                    name: profile?.name || '',
                    username: profile?.username || ''
                }]
                : [];
            renderAccountState();
            await Promise.all([loadSavedPaymentMethods(), loadRecentOrders()]);
        }

        async function applyCustomerSession(session) {
            customerSession = session || null;
            customerProfile = null;
            if (!customerSession) {
                currentUserState = {};
                savedUsers = [];
                renderAccountState();
                return;
            }
            try {
                await loadCustomerProfile();
            } catch (error) {
                accountStatusMessage.textContent = error.message;
                renderAccountState();
            }
        }

        async function initializeCustomerAuth() {
            if (!commerceCapabilities.customerAuthAvailable) {
                customerAuthPanel?.classList.remove('hidden');
                customerAuthForm?.querySelectorAll('input, button').forEach(control => {
                    control.disabled = true;
                });
                accountStatusMessage.textContent = 'Customer accounts are temporarily unavailable.';
                renderAccountState();
                return;
            }
            if (!window.supabase?.createClient) {
                throw new Error('The secure account service could not be loaded.');
            }
            customerSupabaseClient = window.supabase.createClient(
                commerceCapabilities.supabaseUrl,
                commerceCapabilities.supabaseAnonKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );
            const { data, error } = await customerSupabaseClient.auth.getSession();
            if (error) {
                throw error;
            }
            await applyCustomerSession(data.session);
            customerSupabaseClient.auth.onAuthStateChange((_event, session) => {
                window.setTimeout(() => {
                    applyCustomerSession(session).catch(error => {
                        accountStatusMessage.textContent = error.message;
                    });
                }, 0);
            });
        }

function getCartVariantQuantity(productId, variant = '') {
    const activeUser = getActiveUser();
    if (!activeUser) {
        return 0;
    }
    return getCartEntry(activeUser.id).items
        .filter(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(productId, variant))
        .reduce((total, item) => total + item.quantity, 0);
}

async function loadCommerceCapabilities() {
    try {
        commerceCapabilities = await commerceRequest('/api/commerce/config');
    } catch {
        commerceCapabilities = {
            catalogAvailable: false,
            customOrdersAvailable: false,
            checkoutAvailable: false,
            automaticTaxEnabled: false,
            freeShippingThresholdCents: 5000,
            localPickupAvailable: false
        };
    }
    if (commerceModeMessage) {
        commerceModeMessage.textContent = commerceCapabilities.checkoutAvailable
            ? 'Secure checkout is enabled. Stripe calculates tax; free local pickup and free US shipping at $50 are available.'
            : 'Demo/browser-local cart only. Hosted checkout is unavailable; no payment or hosted order will be created.';
        commerceModeMessage.classList.toggle('success', commerceCapabilities.checkoutAvailable);
        commerceModeMessage.classList.toggle('error', !commerceCapabilities.checkoutAvailable);
    }
}

function getAudioContext() {
    if (!AudioContextClass) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    return audioContext;
}

function playClickSound() {
    if (volumeLevel === 0) {
        return;
    }
    const context = getAudioContext();
    if (!context) {
        return;
    }

    try {
        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.connect(gain);
        gain.connect(context.destination);
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

function renderMusicTrack() {
    const song = musicSongs[musicSongIndex];
    if (!song || !musicVideo) return;
    musicPlayer?.classList.remove('music-player-empty');
    if (musicVideo.src !== song.url) {
        musicVideo.src = song.url;
        musicVideo.load();
    }
    musicVideo.setAttribute('aria-label', `${song.title}${song.artist ? ` by ${song.artist}` : ''}`);
    setStatus(musicTrackTitle, song.title);
    setStatus(musicTrackArtist, song.artist || 'Unknown band / artist');
}

function renderEmptyMusicPlayer(title, message) {
    musicPlayer?.classList.remove('hidden');
    musicPlayer?.classList.add('music-player-empty');
    if (musicVideo) {
        musicVideo.pause();
        musicVideo.removeAttribute('src');
        musicVideo.load();
        musicVideo.setAttribute('aria-label', title);
    }
    setStatus(musicTrackTitle, title);
    setStatus(musicTrackArtist, message);
}

async function playMusic() {
    if (!musicVideo || !musicSongs.length) return;
    renderMusicTrack();
    try {
        await musicVideo.play();
    } catch {
        setStatus(musicTrackArtist, 'Press play to start this video');
    }
}

function changeMusicTrack(offset) {
    if (!musicSongs.length || !musicVideo) return;
    const wasPlaying = !musicVideo.paused;
    musicSongIndex = (musicSongIndex + offset + musicSongs.length) % musicSongs.length;
    renderMusicTrack();
    if (wasPlaying) playMusic();
}

async function loadMusicPlaylist() {
    try {
        const music = await commerceRequest('/api/music');
        musicSongs = music.enabled && Array.isArray(music.songs) ? music.songs : [];
        if (musicSongs.length) {
            musicPlayer?.classList.remove('hidden');
            renderMusicTrack();
        } else {
            renderEmptyMusicPlayer('NO SIGNAL', 'Add a music video in the Admin Portal');
        }
    } catch (error) {
        console.warn('Store music videos are unavailable.', error);
        renderEmptyMusicPlayer('SIGNAL LOST', 'Music videos are temporarily unavailable');
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

function announceStatus(message) {
    setStatus(statusLive, message);
}

function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function getVariantDetail(product, variantName) {
    return product.variantDetails?.find(variant => variant.name === variantName) || null;
}

function getEffectivePrice(product, variantName = '') {
    if (product.onSale && product.salePrice > 0) {
        return product.salePrice;
    }

    const variant = getVariantDetail(product, variantName);
    return variant?.price > 0 ? variant.price : product.listingPrice;
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

function activateChannel(channelName, shouldPlaySound = false) {
    if (!channelSelector || !channels.length) {
        return;
    }

    const requestedChannel = document.getElementById(channelName);
    const targetChannel = requestedChannel && !requestedChannel.classList.contains('app-hidden')
        ? requestedChannel
        : document.getElementById('home');

    channels.forEach(channel => {
        const isActive = channel === targetChannel;
        channel.classList.toggle('active', isActive);
        channel.hidden = !isActive;
        channel.setAttribute('aria-hidden', String(!isActive));
    });

    const activeChannel = targetChannel?.id || 'home';
    if (!['product-detail', 'policies'].includes(activeChannel)) {
        channelSelector.value = activeChannel;
    }
    const activeLabel = activeChannel === 'product-detail'
        ? 'PRODUCT'
        : activeChannel === 'policies'
            ? 'STORE POLICIES'
        : channelSelector.selectedOptions[0]?.textContent
            ?.replace(/^[^\p{L}\p{N}]+/u, '')
            .trim() || 'HOME';

    if (channelIndicator) {
        channelIndicator.textContent = `CH ${CHANNEL_NUMBERS[activeChannel] || '--'} · ${activeLabel}`;
    }

    if (shouldPlaySound) {
        playClickSound();
        announceStatus(`${targetChannel?.querySelector('h1')?.textContent || 'Home'} channel selected.`);
        if (activeChannel !== 'product-detail') {
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.set('channel', activeChannel);
            window.history.pushState(null, '', url);
        }
    }
}

function setActiveChannel(channelName) {
    activateChannel(channelName, true);
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

async function toggleProductWishlist(product) {
    const user = ensureActiveUser('Create or switch to an account to save a wishlist.');
    if (!user) {
        return null;
    }

    let wishlisted = false;
    await saveWishlistsWithLatest(currentWishlists => {
        const existingEntry = currentWishlists.find(entry => entry.userId === user.id);
        const nextIds = new Set(existingEntry?.productIds || []);
        if (nextIds.has(product.id)) {
            nextIds.delete(product.id);
        } else {
            nextIds.add(product.id);
        }
        wishlisted = nextIds.has(product.id);
        const nextEntry = {
            userId: user.id,
            productIds: [...nextIds],
            updatedAt: new Date().toISOString()
        };
        return [...currentWishlists.filter(entry => entry.userId !== user.id), nextEntry];
    });

    setStatus(accountStatusMessage, `${product.name} wishlist updated.`);
    return wishlisted;
}

async function addProductToCart(product, variant = '') {
    const user = ensureActiveUser('Create or switch to an account to save a cart.');
    if (!user) {
        return false;
    }

    const variantDetail = getVariantDetail(product, variant);
    const stockLimit = variantDetail?.stock ?? (product.trackInventory ? product.stock : null);
    const cart = getCartEntry(user.id);
    const matchingQuantity = cart.items
        .filter(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(product.id, variant))
        .reduce((total, item) => total + item.quantity, 0);
    if (stockLimit !== null && matchingQuantity >= stockLimit) {
        setStatus(cartStatusMessage, `${product.name} has no more stock available for this option.`);
        return false;
    }
    if (matchingQuantity >= MAX_CART_LINE_QUANTITY) {
        setStatus(cartStatusMessage, `${product.name} reached the per-option cart limit.`);
        return false;
    }
    if (!matchingQuantity && cart.items.length >= MAX_CART_LINES) {
        setStatus(cartStatusMessage, 'Your cart has reached its product limit.');
        return false;
    }

    await saveCartsWithLatest(currentCarts => {
        const existingEntry = currentCarts.find(entry => entry.userId === user.id);
        const items = [...(existingEntry?.items || [])];
        const existingItemIndex = items.findIndex(item => (
            getCartItemKey(item.productId, item.variant) === getCartItemKey(product.id, variant)
        ));
        if (existingItemIndex >= 0) {
            items[existingItemIndex] = {
                ...items[existingItemIndex],
                quantity: items[existingItemIndex].quantity + 1
            };
        } else {
            items.push({ productId: product.id, variant, quantity: 1 });
        }
        return [
            ...currentCarts.filter(entry => entry.userId !== user.id),
            { userId: user.id, items, updatedAt: new Date().toISOString() }
        ];
    });

    setStatus(cartStatusMessage, `${product.name} saved to your cart.`);
    return true;
}

function productPath(product) {
    return `/product/${encodeURIComponent(product.handle || product.id)}`;
}

function setProductDocumentMetadata(product) {
    document.title = `${product.name} — Sip of Ghoulaid`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.appendChild(description);
    }
    description.content = product.description.slice(0, 160);
}

function renderProductDetail(product) {
    if (!productDetailContent) {
        return;
    }
    productDetailContent.replaceChildren();
    setProductDocumentMetadata(product);

    const gallery = document.createElement('div');
    gallery.className = 'product-detail-gallery';
    const stage = document.createElement('div');
    stage.className = 'product-detail-stage';
    const thumbnails = document.createElement('div');
    thumbnails.className = 'product-detail-thumbnails';
    const media = getProductMedia(product);

    const showMedia = (entry, index) => {
        stage.replaceChildren();
        thumbnails.querySelectorAll('button').forEach((button, buttonIndex) => {
            button.classList.toggle('active', buttonIndex === index);
        });
        if (!entry) {
            const fallback = document.createElement('span');
            fallback.className = 'product-detail-fallback';
            fallback.textContent = product.emoji || '🛍️';
            stage.appendChild(fallback);
            return;
        }
        if (entry.type === 'video') {
            const video = document.createElement('video');
            video.src = entry.src;
            video.controls = true;
            video.playsInline = true;
            video.preload = 'metadata';
            stage.appendChild(video);
        } else {
            const image = document.createElement('img');
            image.src = entry.src;
            image.alt = `${product.name} image ${index + 1}`;
            stage.appendChild(image);
        }
    };

    media.forEach((entry, index) => {
        const thumbnail = document.createElement('button');
        thumbnail.type = 'button';
        thumbnail.setAttribute('aria-label', `Show ${entry.type} ${index + 1}`);
        if (entry.type === 'image') {
            const image = document.createElement('img');
            image.src = entry.src;
            image.alt = '';
            thumbnail.appendChild(image);
        } else {
            thumbnail.textContent = '▶';
        }
        thumbnail.addEventListener('click', () => showMedia(entry, index));
        thumbnails.appendChild(thumbnail);
    });
    showMedia(media[0], 0);
    gallery.append(stage, thumbnails);

    const information = document.createElement('div');
    information.className = 'product-detail-info';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'product-detail-eyebrow';
    eyebrow.textContent = product.categories.join(' • ') || 'SIP OF GHOULAID ORIGINAL';
    const title = document.createElement('h1');
    title.className = 'channel-title';
    title.textContent = product.name;
    let price = createPriceDisplay(product);
    price.classList.add('product-detail-price');

    const description = document.createElement('div');
    description.className = 'product-detail-description';
    if (product.descriptionHtml) {
        appendSanitizedRichText(description, product.descriptionHtml);
    } else {
        description.textContent = product.description;
    }

    const variantGroup = document.createElement('div');
    variantGroup.className = 'form-group';
    const variantLabel = document.createElement('label');
    variantLabel.textContent = product.variantGroupName || 'Option';
    const variantSelect = document.createElement('select');
    const variantDetails = product.variantDetails?.length
        ? product.variantDetails
        : [{ name: '', price: product.listingPrice, stock: product.trackInventory ? product.stock : null }];
    variantDetails.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant.name;
        option.textContent = variant.name || 'Standard';
        option.disabled = variant.stock !== null && variant.stock <= 0;
        variantSelect.appendChild(option);
    });
    const firstAvailable = variantDetails.find(variant => variant.stock === null || variant.stock > 0);
    if (firstAvailable) variantSelect.value = firstAvailable.name;
    variantGroup.append(variantLabel, variantSelect);

    const inventory = document.createElement('p');
    inventory.className = 'product-detail-inventory';
    const shipping = document.createElement('p');
    shipping.className = 'product-meta-text';
    shipping.textContent = catalogSource === 'hosted'
        ? 'Shipping calculated at secure checkout'
        : `Shipping: ${formatMoney(product.shippingPrice)}`;
    if (product.mustShipAlone) {
        shipping.append(' • Ships separately');
    }
    const updateVariantState = () => {
        const selected = getVariantDetail(product, variantSelect.value) || firstAvailable;
        const nextPrice = createPriceDisplay({
            ...product,
            listingPrice: selected?.price ?? product.listingPrice
        });
        nextPrice.classList.add('product-detail-price');
        price.replaceWith(nextPrice);
        price = nextPrice;
        inventory.textContent = selected?.stock === null || selected?.stock === undefined
            ? (product.available === false ? 'SOLD OUT' : 'AVAILABLE')
            : `${selected.stock} IN STOCK`;
        cartButton.disabled = product.available === false || (selected?.stock !== null && selected?.stock <= 0);
    };

    const actions = document.createElement('div');
    actions.className = 'product-detail-actions';
    const activeUser = getActiveUser();
    const wishlistButton = document.createElement('button');
    wishlistButton.type = 'button';
    wishlistButton.className = 'table-action-btn click-item';
    wishlistButton.textContent = activeUser && getWishlistEntry(activeUser.id).productIds.includes(product.id)
        ? '♥ Wishlisted'
        : '♡ Add to wishlist';
    wishlistButton.addEventListener('click', async () => {
        const wishlisted = await toggleProductWishlist(product);
        if (wishlisted !== null) wishlistButton.textContent = wishlisted ? '♥ Wishlisted' : '♡ Add to wishlist';
    });
    const cartButton = document.createElement('button');
    cartButton.type = 'button';
    cartButton.className = 'submit-btn click-item';
    cartButton.textContent = product.available === false ? 'Sold out' : 'Add to cart';
    cartButton.addEventListener('click', async () => {
        if (await addProductToCart(product, variantSelect.value)) {
            cartButton.textContent = `Added to cart (${getCartQuantity(product.id)})`;
        }
    });
    variantSelect.addEventListener('change', updateVariantState);
    actions.append(wishlistButton, cartButton);

    information.append(eyebrow, title, price, inventory, shipping);
    if (variantDetails.length > 1 || variantDetails[0]?.name) information.appendChild(variantGroup);
    information.append(actions, description);
    productDetailContent.append(gallery, information);
    updateVariantState();
    bindClickSound(productDetailContent);
}

function openProductDetail(product, pushHistory = true) {
    if (!product) return;
    renderProductDetail(product);
    activateChannel('product-detail');
    if (pushHistory) {
        window.history.pushState({ productHandle: product.handle }, '', productPath(product));
    }
    playClickSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function appendPolicyParagraph(container, text) {
    const paragraph = document.createElement('p');
    const supportEmail = 'support@sipofghoulaid.com';
    const emailIndex = text.toLowerCase().indexOf(supportEmail);
    if (emailIndex < 0) {
        paragraph.textContent = text;
    } else {
        paragraph.append(text.slice(0, emailIndex));
        const link = document.createElement('a');
        link.href = `mailto:${supportEmail}`;
        link.textContent = text.slice(emailIndex, emailIndex + supportEmail.length);
        paragraph.append(link, text.slice(emailIndex + supportEmail.length));
    }
    container.appendChild(paragraph);
}

function renderPolicy(policyKey) {
    const policy = POLICY_CONTENT[policyKey] || POLICY_CONTENT.privacy;
    if (!policyContent) return;
    policyContent.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = policy.title;
    policyContent.appendChild(title);
    if (policy.updated) {
        const updated = document.createElement('p');
        updated.className = 'policy-updated';
        updated.textContent = `Last Updated: ${policy.updated}`;
        policyContent.appendChild(updated);
    }
    policy.intro.forEach(text => appendPolicyParagraph(policyContent, text));

    policy.sections.forEach(section => {
        const heading = document.createElement('h3');
        heading.textContent = section.heading;
        policyContent.appendChild(heading);
        (section.paragraphs || []).forEach(text => appendPolicyParagraph(policyContent, text));
        if (section.bullets?.length) {
            const list = document.createElement('ul');
            section.bullets.forEach(text => {
                const item = document.createElement('li');
                item.textContent = text;
                list.appendChild(item);
            });
            policyContent.appendChild(list);
        }
        (section.after || []).forEach(text => appendPolicyParagraph(policyContent, text));
    });

    document.querySelectorAll('[data-policy]').forEach(link => {
        if (link.dataset.policy === policyKey) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    document.title = `${policy.title} — Sip of Ghoulaid`;
}

function openPolicy(policyKey, pushHistory = true) {
    const normalizedKey = POLICY_CONTENT[policyKey] ? policyKey : 'privacy';
    renderPolicy(normalizedKey);
    activateChannel('policies');
    if (pushHistory) {
        window.history.pushState({ policy: normalizedKey }, '', `/policies/${normalizedKey}`);
    }
    playClickSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncProductRoute() {
    const policyMatch = window.location.pathname.match(/^\/policies\/([^/]+)\/?$/);
    if (policyMatch) {
        let policyKey = '';
        try {
            policyKey = decodeURIComponent(policyMatch[1]).toLowerCase();
        } catch {
            policyKey = '';
        }
        openPolicy(policyKey, false);
        return;
    }

    const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
    if (!match) {
        document.title = 'Sip of Ghoulaid Shop';
        const requested = new URLSearchParams(window.location.search).get('channel');
        activateChannel(document.getElementById(requested) ? requested : 'home');
        return;
    }
    let handle;
    try {
        handle = decodeURIComponent(match[1]).toLowerCase();
    } catch {
        handle = '';
    }
    const product = shopProducts.find(item => item.handle.toLowerCase() === handle || item.id === handle);
    if (product) {
        openProductDetail(product, false);
        return;
    }
    productDetailContent.replaceChildren();
    const missing = document.createElement('div');
    missing.className = 'empty-products-message';
    missing.textContent = 'This product transmission could not be found.';
    productDetailContent.appendChild(missing);
    activateChannel('product-detail');
}

function appendSanitizedRichText(target, html) {
    const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'P', 'BR', 'DIV', 'H2', 'H3', 'H4']);
    const source = document.createElement('template');
    source.innerHTML = html;

    function copySafeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const output = allowedTags.has(node.tagName)
            ? document.createElement(node.tagName.toLowerCase())
            : document.createDocumentFragment();
        Array.from(node.childNodes).forEach(child => output.appendChild(copySafeNode(child)));
        return output;
    }

    Array.from(source.content.childNodes).forEach(node => target.appendChild(copySafeNode(node)));
}

function calculateCartTotals(cart) {
    const baseShipping = Number(currentSettings.shippingBaseRate || 0);
    const salesTaxRate = Number(currentSettings.salesTaxRate || 0);

    const summary = cart.items.reduce((totals, item) => {
        const product = findProduct(item.productId);
        if (!product) {
            return totals;
        }

        const unitPrice = getEffectivePrice(product, item.variant);
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
    const hostedCheckout = commerceCapabilities.checkoutAvailable && catalogSource === 'hosted';
    cartTaxValue.textContent = hostedCheckout && commerceCapabilities.automaticTaxEnabled
        ? 'Calculated by Stripe'
        : formatMoney(totals.tax);
    const freeShippingThreshold = Number(commerceCapabilities.freeShippingThresholdCents || 5000) / 100;
    cartShippingValue.textContent = hostedCheckout
        ? totals.subtotal >= freeShippingThreshold
            ? 'FREE standard / pickup'
            : `Calculated at checkout • FREE pickup`
        : formatMoney(totals.shipping);
    cartTotalValue.textContent = hostedCheckout ? 'Calculated at checkout' : formatMoney(totals.total);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card click-item';
    card.dataset.productId = product.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', `View ${product.name}`);

    card.appendChild(createProductMedia(product));

    const title = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.href = productPath(product);
    titleLink.textContent = product.name;
    titleLink.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault();
        openProductDetail(product);
    });
    title.appendChild(titleLink);
    card.appendChild(title);

    if (product.description) {
        const excerpt = document.createElement('p');
        excerpt.className = 'product-desc';
        excerpt.textContent = product.description.length > 220
            ? `${product.description.slice(0, 217).trimEnd()}...`
            : product.description;
        card.appendChild(excerpt);

        if (product.description.length > 220) {
            const details = document.createElement('details');
            details.className = 'product-description-details';
            const summary = document.createElement('summary');
            summary.textContent = 'Read full description';
            const fullDescription = document.createElement('div');
            fullDescription.className = 'product-description-full';
            if (product.descriptionHtml) {
                appendSanitizedRichText(fullDescription, product.descriptionHtml);
            } else {
                fullDescription.textContent = product.description;
            }
            details.append(summary, fullDescription);
            card.appendChild(details);
        }
    }

    let cardPrice = createPriceDisplay(product);
    card.appendChild(cardPrice);

    const shippingText = document.createElement('p');
    shippingText.className = 'product-meta-text';
    shippingText.textContent = catalogSource === 'hosted'
        ? 'Shipping calculated at secure checkout'
        : `Shipping: ${formatMoney(product.shippingPrice)}`;
    card.appendChild(shippingText);

    let stockText = null;
    if (product.trackInventory) {
        stockText = document.createElement('p');
        stockText.className = 'product-meta-text';
        const totalStock = product.variantDetails?.length
            ? product.variantDetails.reduce((total, variant) => total + Number(variant.stock || 0), 0)
            : product.stock;
        stockText.textContent = `${totalStock} in stock`;
        card.appendChild(stockText);
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

        const variantDetails = product.variantDetails?.length
            ? product.variantDetails
            : product.variants.map(name => ({ name, price: product.listingPrice, stock: null }));

        variantDetails.forEach(variant => {
            const option = document.createElement('option');
            option.value = variant.name;
            const stockLabel = variant.stock === null ? '' : ` · ${variant.stock} in stock`;
            option.textContent = `${variant.name} — ${formatMoney(variant.price)}${stockLabel}`;
            option.disabled = variant.stock !== null && variant.stock <= 0;
            variantSelect.appendChild(option);
        });

        const firstAvailable = variantDetails.find(variant => variant.stock === null || variant.stock > 0);
        if (firstAvailable) {
            variantSelect.value = firstAvailable.name;
        }

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
        const wishlisted = await toggleProductWishlist(product);
        if (wishlisted !== null) {
            wishlistButton.textContent = wishlisted ? '♥ Wishlisted' : '♡ Wishlist';
        }
    });
    actions.appendChild(wishlistButton);

    const cartButton = document.createElement('button');
    cartButton.type = 'button';
    cartButton.className = 'table-action-btn click-item';
    const quantity = getCartVariantQuantity(product.id, getSelectedVariant(variantSelect, product));
    cartButton.textContent = quantity ? `🛒 Add another (${quantity})` : '🛒 Save to cart';
    cartButton.disabled = product.available === false || quantity >= MAX_CART_LINE_QUANTITY;
    if (product.available === false) {
        cartButton.textContent = 'Sold out';
    } else if (quantity >= MAX_CART_LINE_QUANTITY) {
        cartButton.textContent = `Cart limit reached (${MAX_CART_LINE_QUANTITY})`;
    }
    cartButton.addEventListener('click', async event => {
        event.stopPropagation();
        const variant = getSelectedVariant(variantSelect, product);
        if (await addProductToCart(product, variant)) {
            const nextQuantity = getCartVariantQuantity(product.id, variant);
            cartButton.textContent = `🛒 Add another (${nextQuantity})`;
            cartButton.disabled = nextQuantity >= MAX_CART_LINE_QUANTITY;
        }
    });
    actions.appendChild(cartButton);

    card.appendChild(actions);

    const refreshVariantSummary = () => {
        const variantName = getSelectedVariant(variantSelect, product);
        const variant = getVariantDetail(product, variantName);
        const nextPrice = createPriceDisplay({
            ...product,
            listingPrice: variant?.price ?? product.listingPrice
        });
        cardPrice.replaceWith(nextPrice);
        cardPrice = nextPrice;

        if (stockText) {
            const stock = variant?.stock ?? product.stock;
            stockText.textContent = stock === null ? 'Available' : `${stock} in stock`;
        }

        const variantQuantity = getCartVariantQuantity(product.id, variantName);
        const soldOut = product.available === false || (variant?.stock !== null && variant?.stock <= 0);
        cartButton.disabled = soldOut || variantQuantity >= MAX_CART_LINE_QUANTITY;
        cartButton.textContent = soldOut
            ? 'Sold out'
            : variantQuantity
                ? `🛒 Add another (${variantQuantity})`
                : '🛒 Save to cart';
    };
    variantSelect?.addEventListener('change', refreshVariantSummary);
    refreshVariantSummary();

    const openCard = event => {
        if (event.target.closest('button, select, input, a, label, details, summary, video')) {
            return;
        }
        openProductDetail(product);
    };
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', event => {
        if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openProductDetail(product);
        }
    });
    return card;
}

function shuffleProducts(products) {
    const shuffled = [...products];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const replacementIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[replacementIndex]] = [shuffled[replacementIndex], shuffled[index]];
    }
    return shuffled;
}

function updateLatestBroadcast(product) {
    const screen = document.getElementById('latestBroadcastScreen');
    const target = document.getElementById('latestBroadcastProduct');
    if (!screen || !target || !product) {
        return;
    }

    latestBroadcastProductId = product.id;
    target.replaceChildren();

    const image = product.images?.[0];
    if (image) {
        const artwork = document.createElement('img');
        artwork.src = image;
        artwork.alt = '';
        target.appendChild(artwork);
    } else {
        const fallback = document.createElement('span');
        fallback.className = 'broadcast-product-fallback';
        fallback.textContent = product.emoji || '🛍️';
        target.appendChild(fallback);
    }

    const details = document.createElement('span');
    details.className = 'broadcast-product-details';

    const status = document.createElement('span');
    status.className = 'broadcast-product-status';
    status.textContent = product.available === false ? 'SIGNAL LOST • SOLD OUT' : 'NOW TRANSMITTING';

    const name = document.createElement('strong');
    name.textContent = product.name;

    const price = document.createElement('span');
    price.className = 'broadcast-product-price';
    price.textContent = formatMoney(product.onSale && product.salePrice > 0 ? product.salePrice : product.listingPrice);

    details.append(status, name, price);
    target.appendChild(details);
    screen.setAttribute('aria-label', `View ${product.name} in the shop`);
}

function renderLatestBroadcast(products) {
    const screen = document.getElementById('latestBroadcastScreen');
    if (!screen) {
        return;
    }

    window.clearTimeout(latestBroadcastTimer);
    latestBroadcastDeck = shuffleProducts(products);

    if (!latestBroadcastDeck.length) {
        screen.disabled = true;
        latestBroadcastProductId = '';
        document.getElementById('latestBroadcastProduct').textContent = 'NO PRODUCT SIGNAL';
        return;
    }

    screen.disabled = false;
    let broadcastIndex = 0;
    updateLatestBroadcast(latestBroadcastDeck[broadcastIndex]);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || latestBroadcastDeck.length === 1) {
        return;
    }

    const tuneNextProduct = () => {
        screen.classList.add('is-static');
        latestBroadcastTimer = window.setTimeout(() => {
            broadcastIndex = (broadcastIndex + 1) % latestBroadcastDeck.length;
            if (broadcastIndex === 0) {
                latestBroadcastDeck = shuffleProducts(latestBroadcastDeck);
            }
            updateLatestBroadcast(latestBroadcastDeck[broadcastIndex]);
            screen.classList.remove('is-static');
            latestBroadcastTimer = window.setTimeout(tuneNextProduct, 4500);
        }, 550);
    };

    latestBroadcastTimer = window.setTimeout(tuneNextProduct, 4500);
}

function renderShopProducts(products) {
    shopProducts = products;
    renderLatestBroadcast(products);
    populateReviewProducts(products);
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
    if (window.location.pathname.startsWith('/product/')) {
        syncProductRoute();
    }
}

function populateReviewProducts(products) {
    if (!reviewProductInput) {
        return;
    }

    const selectedValue = reviewProductInput.value;
    reviewProductInput.replaceChildren();

    const overallOption = document.createElement('option');
    overallOption.value = '';
    overallOption.textContent = 'Overall shop experience';
    reviewProductInput.appendChild(overallOption);

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        reviewProductInput.appendChild(option);
    });

    if (Array.from(reviewProductInput.options).some(option => option.value === selectedValue)) {
        reviewProductInput.value = selectedValue;
    }
}

function loadReviews() {
    try {
        const storedReviews = JSON.parse(localStorage.getItem(REVIEWS_STORAGE_KEY) || '[]');
        if (!Array.isArray(storedReviews)) {
            return [];
        }

        return storedReviews.filter(review => (
            review
            && typeof review.nickname === 'string'
            && review.nickname.length >= 2
            && review.nickname.length <= 40
            && Number.isInteger(review.rating)
            && review.rating >= 1
            && review.rating <= 5
            && typeof review.comment === 'string'
            && review.comment.length >= 10
            && review.comment.length <= 1000
            && typeof review.createdAt === 'string'
        )).slice(0, 50);
    } catch (error) {
        console.error('Unable to load reviews.', error);
        setStatus(reviewStatus, 'Saved reviews could not be loaded on this device.');
        return [];
    }
}

function renderReviews() {
    if (!reviewsList) {
        return;
    }

    reviewsList.replaceChildren();
    const reviews = loadReviews();

    if (!reviews.length) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-products-message';
        emptyState.textContent = 'No reviews transmitted yet. Be the first.';
        reviewsList.appendChild(emptyState);
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement('article');
        card.className = 'review-card';

        const header = document.createElement('div');
        header.className = 'review-card-header';

        const nickname = document.createElement('strong');
        nickname.textContent = review.nickname;

        const rating = document.createElement('span');
        rating.className = 'review-stars';
        rating.setAttribute('aria-label', `${review.rating} out of 5 stars`);
        rating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;

        header.append(nickname, rating);
        card.appendChild(header);

        if (review.productName) {
            const product = document.createElement('p');
            product.className = 'review-product';
            product.textContent = `Reviewing: ${review.productName}`;
            card.appendChild(product);
        }

        const comment = document.createElement('p');
        comment.textContent = review.comment;
        card.appendChild(comment);

        const date = document.createElement('time');
        date.dateTime = review.createdAt;
        date.textContent = new Date(review.createdAt).toLocaleDateString();
        card.appendChild(date);

        reviewsList.appendChild(card);
    });
}

function saveReview(event) {
    event.preventDefault();

    const nickname = reviewNicknameInput.value.trim();
    const rating = Number.parseInt(reviewRatingInput.value, 10);
    const comment = reviewCommentInput.value.trim();

    if (nickname.length < 2 || nickname.length > 40 || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 1000) {
        setStatus(reviewStatus, 'Enter a nickname, star rating, and review of at least 10 characters.');
        return;
    }

    const productName = reviewProductInput.selectedOptions[0]?.textContent || '';
    const review = {
        id: window.crypto?.randomUUID?.() || `review-${Date.now()}`,
        nickname,
        rating,
        productId: reviewProductInput.value,
        productName: reviewProductInput.value ? productName : '',
        comment,
        createdAt: new Date().toISOString()
    };

    try {
        const reviews = loadReviews();
        reviews.unshift(review);
        localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews.slice(0, 50)));
    } catch (error) {
        console.error('Unable to save review.', error);
        setStatus(reviewStatus, 'Your review could not be saved on this device.');
        return;
    }

    reviewForm.reset();
    setStatus(reviewStatus, 'Review transmitted. Thank you!');
    renderReviews();
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

        if (orderSupportForm) {
            orderSupportForm.addEventListener('submit', async event => {
                event.preventDefault();
                setStatus(orderSupportStatus, 'Sending support request...');
                try {
                    const response = await fetch('/api/support/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(Object.fromEntries(new FormData(orderSupportForm)))
                    });
                    const result = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        throw new Error(result.message || 'Support request could not be sent.');
                    }
                    orderSupportForm.reset();
                    setStatus(orderSupportStatus, result.message);
                } catch (error) {
                    setStatus(orderSupportStatus, error.message);
                }
            });
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
    const additionalSetCount = document.getElementById('additionalSetCount');
    additionalSetCountGroup.hidden = !shouldShow;
    additionalSetCountGroup.setAttribute('aria-hidden', String(!shouldShow));

    if (additionalSetCount) {
        additionalSetCount.disabled = !shouldShow;
        additionalSetCount.required = shouldShow;
        if (!shouldShow) {
            additionalSetCount.value = '';
        }
    }
}

function fillOrderProfileFromAccount() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        return;
    }

    if (fullNameInput) {
        fullNameInput.value = customerProfile?.name || customerProfile?.shippingFullName || '';
    }

    if (usernameInput) {
        usernameInput.value = customerProfile?.username || '';
    }

    if (contactMethodInput) {
        contactMethodInput.value = customerProfile?.contactMethod || '';
    }

    if (contactInfoInput) {
        contactInfoInput.value = customerProfile?.contactInfo || customerSession?.user?.email || '';
    }
}

function renderShopAccountBanner() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        setStatus(shopAccountGreeting, 'Browsing as guest');
        setStatus(shopAccountSummary, 'Create a secure account to save wishlists, carts, and private shipping details.');
        return;
    }

    const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
    const cartItemCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
    setStatus(shopAccountGreeting, `Browsing as ${getUserDisplayName(activeUser)}`);
    setStatus(shopAccountSummary, `${wishlistCount} wishlist item(s) • ${cartItemCount} cart item(s) in your vault.`);
}

function renderMemberLounge() {
    const activeUser = getActiveUser();
    memberLoungeLocked?.classList.toggle('hidden', Boolean(activeUser));
    memberLoungeContent?.classList.toggle('hidden', !activeUser);
    if (activeUser) {
        setStatus(memberLoungeGreeting, `Welcome, ${getUserDisplayName(activeUser)}`);
    }
}

function renderWishlist() {
    const activeUser = getActiveUser();

    if (!activeUser) {
        renderSavedListMessage(wishlistList, 'Sign in to save wishlist items.');
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
                    if (items[existingItemIndex].quantity >= MAX_CART_LINE_QUANTITY) {
                        return currentCarts;
                    }
                    items[existingItemIndex] = {
                        ...items[existingItemIndex],
                        quantity: items[existingItemIndex].quantity + 1
                    };
                } else {
                    if (items.length >= MAX_CART_LINES) {
                        return currentCarts;
                    }
                    items.push({ productId: product.id, variant: defaultVariant, quantity: 1 });
                }

                return [
                    ...currentCarts.filter(entry => entry.userId !== activeUser.id),
                    { userId: activeUser.id, items, updatedAt: new Date().toISOString() }
                ];
            });
            setStatus(wishlistStatusMessage, `${product.name} added to your cart.`);
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
            setStatus(wishlistStatusMessage, `${product.name} removed from your wishlist.`);
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
        renderCartTotals({ items: [] });
        return;
    }

    const cart = getCartEntry(activeUser.id);
    const totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    if (cartSummaryMessage) {
        cartSummaryMessage.textContent = `Your active account cart is saved automatically on this device. ${totalItems} item(s) saved right now.`;
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
        priceText.textContent = `Item total: ${formatMoney(getEffectivePrice(product, item.variant) * item.quantity)}`;
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
    if (customerSession) {
        currentUserState = {
            userId: customerSession.user.id,
            email: customerSession.user.email
        };
        savedUsers = [{
            id: customerSession.user.id,
            email: customerSession.user.email,
            name: customerProfile?.name || '',
            username: customerProfile?.username || ''
        }];
    }
    const activeUser = getActiveUser();
    const signedIn = Boolean(customerSession && activeUser);

    customerAuthPanel?.classList.toggle('hidden', signedIn);
    accountProfilePanel?.classList.toggle('hidden', !signedIn);
    shippingProfilePanel?.classList.toggle('hidden', !signedIn);
    savedPaymentsPanel?.classList.toggle('hidden', !signedIn);
    accountCartPanel?.classList.toggle('hidden', !signedIn);
    signOutButton?.classList.toggle('hidden', !signedIn);
    [accountProfilePanel, shippingProfilePanel, savedPaymentsPanel, accountCartPanel].forEach(panel => {
        panel?.setAttribute('aria-hidden', String(!signedIn));
    });

    if (!signedIn) {
        setStatus(accountGreeting, 'No account active');
        setStatus(accountSummary, 'Sign in or create a secure account to open your private vault.');
    } else {
        const wishlistCount = getWishlistEntry(activeUser.id).productIds.length;
        const cartCount = getCartEntry(activeUser.id).items.reduce((total, item) => total + item.quantity, 0);
        setStatus(accountGreeting, `Welcome back, ${getCustomerDisplayName()}`);
        setStatus(accountSummary, `${wishlistCount} wishlist item(s), ${cartCount} saved cart item(s), and private shipping details protected in your account.`);

        accountNameInput.value = customerProfile?.name || '';
        accountUsernameInput.value = customerProfile?.username || '';
        accountEmailInput.value = customerSession.user.email || '';
        accountContactMethodInput.value = customerProfile?.contactMethod || '';
        accountContactInfoInput.value = customerProfile?.contactInfo || '';
        shippingFullNameInput.value = customerProfile?.shippingFullName || '';
        shippingAddressLine1Input.value = customerProfile?.shippingAddressLine1 || '';
        shippingAddressLine2Input.value = customerProfile?.shippingAddressLine2 || '';
        shippingCityInput.value = customerProfile?.shippingCity || '';
        shippingStateInput.value = customerProfile?.shippingState || '';
        shippingPostalCodeInput.value = customerProfile?.shippingPostalCode || '';
        shippingCountryInput.value = customerProfile?.shippingCountry || 'US';
    }

    renderShopAccountBanner();
    renderMemberLounge();
    fillOrderProfileFromAccount();
    renderWishlist();
    renderCart();
    renderShopProducts(shopProducts);
}

async function initializeShopData() {
    await loadCommerceCapabilities();
    const [localProducts, discounts, marketing, settings, appCenter, designer, paymentMethods, storedWishlists, storedCarts] = await Promise.all([
        window.ShopData.getProducts(),
        window.ShopData.getDiscounts(),
        window.ShopData.getMarketing(),
        window.ShopData.getSettings(),
        window.ShopData.getAppCenter(),
        window.ShopData.getDesigner(),
        window.ShopData.getPaymentMethods(),
        window.ShopData.getWishlists(),
        window.ShopData.getCarts()
    ]);

    savedUsers = [];
    currentUserState = {};
    wishlists = storedWishlists;
    carts = storedCarts;

    let products = localProducts;
    if (commerceCapabilities.catalogAvailable) {
        try {
            const catalog = await commerceRequest('/api/catalog');
            products = window.ShopData.normalizeProducts(catalog.products);
            catalogSource = 'hosted';
        } catch (error) {
            console.warn('Hosted catalog unavailable; using browser-local catalog.', error);
            catalogSource = 'browser-local';
        }
    }
    renderShopProducts(products);
    applySettings(settings);
    applyAppCenter(appCenter);
    applyDesigner(designer);
    renderPaymentMethods(paymentMethods);
    renderAnnouncement('shopAnnouncement', marketing.announcementTitle, marketing.announcementMessage, appCenter.marketingEnabled);
    renderFeaturedBroadcast(marketing, appCenter.marketingEnabled);
    renderDiscounts(discounts, appCenter.discountsEnabled);
    renderAccountState();
    try {
        await initializeCustomerAuth();
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }

    window.ShopData.subscribe('products', nextProducts => {
        if (catalogSource === 'browser-local') {
            renderShopProducts(nextProducts);
        }
    });
    window.ShopData.subscribe('settings', applySettings);
    window.ShopData.subscribe('designer', applyDesigner);
    window.ShopData.subscribe('paymentMethods', renderPaymentMethods);
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
            renderAnnouncement('shopAnnouncement', nextMarketing.announcementTitle, nextMarketing.announcementMessage, currentAppCenter.marketingEnabled);
            renderFeaturedBroadcast(nextMarketing, currentAppCenter.marketingEnabled);
        });
    });
    window.ShopData.subscribe('appCenter', nextAppCenter => {
        applyAppCenter(nextAppCenter);
        window.ShopData.getMarketing().then(currentMarketing => {
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
        activateChannel(event.target.value, true);
    });
}

document.addEventListener('click', event => {
    const policyLink = event.target.closest('[data-policy]');
    if (policyLink) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault();
        openPolicy(policyLink.dataset.policy);
        return;
    }

    const channelTarget = event.target.closest('[data-channel-target]');
    if (!channelTarget) {
        return;
    }
    activateChannel(channelTarget.dataset.channelTarget, true);
});

document.getElementById('latestBroadcastScreen')?.addEventListener('click', () => {
    if (!latestBroadcastProductId) {
        return;
    }

    openProductDetail(findProduct(latestBroadcastProductId));
});

productDetailBack?.addEventListener('click', () => {
    if (window.history.state?.productHandle) {
        window.history.back();
        return;
    }
    const url = new URL('/', window.location.origin);
    url.searchParams.set('channel', 'shop');
    window.history.replaceState(null, '', url);
    activateChannel('shop');
    document.title = 'Sip of Ghoulaid Shop';
    playClickSound();
});

window.addEventListener('popstate', () => {
    syncProductRoute();
});

if (openAccountFromShopButton) {
    openAccountFromShopButton.addEventListener('click', () => {
        setActiveChannel('account');
    });
}

function getCustomerProfilePayload(includeShippingForm = true) {
    const shipping = includeShippingForm
        ? {
            shippingFullName: shippingFullNameInput.value.trim(),
            shippingAddressLine1: shippingAddressLine1Input.value.trim(),
            shippingAddressLine2: shippingAddressLine2Input.value.trim(),
            shippingCity: shippingCityInput.value.trim(),
            shippingState: shippingStateInput.value.trim(),
            shippingPostalCode: shippingPostalCodeInput.value.trim(),
            shippingCountry: shippingCountryInput.value.trim()
        }
        : {
            shippingFullName: customerProfile?.shippingFullName || '',
            shippingAddressLine1: customerProfile?.shippingAddressLine1 || '',
            shippingAddressLine2: customerProfile?.shippingAddressLine2 || '',
            shippingCity: customerProfile?.shippingCity || '',
            shippingState: customerProfile?.shippingState || '',
            shippingPostalCode: customerProfile?.shippingPostalCode || '',
            shippingCountry: customerProfile?.shippingCountry || ''
        };
    return {
        name: accountNameInput.value.trim(),
        username: accountUsernameInput.value.trim(),
        contactMethod: accountContactMethodInput.value,
        contactInfo: accountContactInfoInput.value.trim(),
        ...shipping
    };
}

customerAuthForm?.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus(accountStatusMessage, 'Signing in securely...');
    try {
        const { error } = await customerSupabaseClient.auth.signInWithPassword({
            email: customerAuthEmailInput.value.trim(),
            password: customerAuthPasswordInput.value
        });
        if (error) throw error;
        customerAuthForm.reset();
        setStatus(accountStatusMessage, 'Signed in securely.');
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }
});

customerCreateAccountButton?.addEventListener('click', async () => {
    setStatus(accountStatusMessage, 'Creating your secure account...');
    try {
        const { data, error } = await customerSupabaseClient.auth.signUp({
            email: customerAuthEmailInput.value.trim(),
            password: customerAuthPasswordInput.value,
            options: { emailRedirectTo: `${window.location.origin}/?channel=account` }
        });
        if (error) throw error;
        setStatus(accountStatusMessage, data.session
            ? 'Account created. Your secure vault is ready.'
            : 'Account created. Check your email to verify it, then sign in.');
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }
});

customerMagicLinkButton?.addEventListener('click', async () => {
    const email = customerAuthEmailInput.value.trim();
    if (!email) {
        setStatus(accountStatusMessage, 'Enter your email address first.');
        return;
    }
    setStatus(accountStatusMessage, 'Sending your secure sign-in link...');
    try {
        const { error } = await customerSupabaseClient.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/?channel=account` }
        });
        if (error) throw error;
        setStatus(accountStatusMessage, 'Magic link sent. Check your email.');
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }
});

accountProfileForm?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const { profile } = await customerRequest('/api/customer/profile', {
            method: 'PUT',
            body: JSON.stringify(getCustomerProfilePayload(false))
        });
        customerProfile = profile;
        renderAccountState();
        setStatus(accountStatusMessage, 'Private profile saved securely.');
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }
});

shippingProfileForm?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const { profile } = await customerRequest('/api/customer/profile', {
            method: 'PUT',
            body: JSON.stringify(getCustomerProfilePayload())
        });
        customerProfile = profile;
        renderAccountState();
        setStatus(shippingStatusMessage, 'Private shipping details saved securely.');
    } catch (error) {
        setStatus(shippingStatusMessage, error.message);
    }
});

signOutButton?.addEventListener('click', async () => {
    try {
        const { error } = await customerSupabaseClient.auth.signOut();
        if (error) throw error;
        setStatus(accountStatusMessage, 'Signed out securely.');
    } catch (error) {
        setStatus(accountStatusMessage, error.message);
    }
});

addPaymentMethodButton?.addEventListener('click', async () => {
    try {
        setStatus(savedPaymentsStatus, 'Opening secure Stripe setup...');
        const { url } = await customerRequest('/api/customer/payment-methods/setup', {
            method: 'POST',
            body: JSON.stringify({})
        });
        window.location.assign(url);
    } catch (error) {
        setStatus(savedPaymentsStatus, error.message);
    }
});

managePaymentMethodsButton?.addEventListener('click', async () => {
    try {
        setStatus(savedPaymentsStatus, 'Opening Stripe billing portal...');
        const { url } = await customerRequest('/api/customer/billing-portal', {
            method: 'POST',
            body: JSON.stringify({})
        });
        window.location.assign(url);
    } catch (error) {
        setStatus(savedPaymentsStatus, error.message);
    }
});

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
                const product = findProduct(productId);
                const variant = product ? getDefaultVariant(product) : '';
                const existingItemIndex = items.findIndex(item => getCartItemKey(item.productId, item.variant) === getCartItemKey(productId, variant));
                if (existingItemIndex >= 0) {
                    if (items[existingItemIndex].quantity < MAX_CART_LINE_QUANTITY) {
                        items[existingItemIndex] = {
                            ...items[existingItemIndex],
                            quantity: items[existingItemIndex].quantity + 1
                        };
                    }
                } else if (items.length < MAX_CART_LINES) {
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

if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
        const activeUser = ensureActiveUser('Sign in before checking out.');
        if (!activeUser) return;
        const cart = getCartEntry(activeUser.id);
        if (!cart.items.length) {
            setStatus(cartStatusMessage, 'Your cart is empty.');
            return;
        }
        if (!commerceCapabilities.checkoutAvailable || catalogSource !== 'hosted') {
            setStatus(cartStatusMessage, 'Secure hosted checkout is unavailable. This cart is browser-local; no order or payment was created.');
            return;
        }
        if (cart.items.length > MAX_CART_LINES
            || cart.items.some(item => item.quantity > MAX_CART_LINE_QUANTITY)) {
            setStatus(cartStatusMessage, 'Update the cart so it has at most 50 variants and no more than 10 of each before checkout.');
            return;
        }

        checkoutButton.disabled = true;
        setStatus(cartStatusMessage, 'Validating stock, shipping rules, and opening secure Stripe Checkout…');
        try {
            const result = await customerRequest('/api/commerce/checkout-sessions', {
                method: 'POST',
                body: JSON.stringify({ items: cart.items })
            });
            if (!result.url || !result.url.startsWith('https://checkout.stripe.com/')) {
                throw new Error('The checkout service returned an invalid redirect.');
            }
            window.location.assign(result.url);
        } catch (error) {
            setStatus(cartStatusMessage, error.status === 503
                ? 'Secure hosted checkout is unavailable. No order or payment was created.'
                : `Checkout could not start: ${error.message}`);
            checkoutButton.disabled = false;
        }
    });
}

if (waitlistForm) {
    waitlistForm.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = waitlistForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        setStatus(waitlistStatus, 'Tuning the signal...');
        waitlistStatus?.classList.remove('error', 'success');
        try {
            const formData = new FormData(waitlistForm);
            const result = await commerceRequest('/api/waitlist', {
                method: 'POST',
                body: JSON.stringify({ email: formData.get('email') })
            });
            waitlistForm.reset();
            setStatus(waitlistStatus, result.message);
            waitlistStatus?.classList.add('success');
        } catch (error) {
            setStatus(waitlistStatus, `Waitlist signup failed: ${error.message}`);
            waitlistStatus?.classList.add('error');
        } finally {
            submitButton.disabled = false;
        }
    });
}

if (customOrderForm) {
    customOrderForm.addEventListener('invalid', event => {
        const field = event.target;
        if (!(field instanceof HTMLElement)) {
            return;
        }

        field.setAttribute('aria-invalid', 'true');
        setStatus(formStatus, 'Please complete the required fields highlighted by your browser.');
        formStatus?.classList.add('error');
    }, true);

    customOrderForm.addEventListener('input', event => {
        const field = event.target;
        if (!(field instanceof HTMLElement) || !('checkValidity' in field)) {
            return;
        }

        field.setAttribute('aria-invalid', String(!field.checkValidity()));
        setStatus(formStatus, '');
        formStatus?.classList.remove('error');
    });

    customOrderForm.addEventListener('reset', () => {
        setStatus(formStatus, '');
        formStatus?.classList.remove('error');
        orderSuccess?.classList.add('hidden');
        setTimeout(updateAdditionalSetVisibility, 0);
    });

    customOrderForm.addEventListener('submit', async event => {
        event.preventDefault();
        setStatus(formStatus, '');
        formStatus?.classList.remove('error');

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

        let successMessage;
        try {
            const result = await commerceRequest('/api/custom-orders', {
                method: 'POST',
                body: JSON.stringify(order)
            });
            successMessage = `Thank you, ${order.fullName || 'ghoul'}! Your request ${result.request.id} was securely saved for review. We’ll contact you with next steps.`;
        } catch (error) {
            if (error.status && ![404, 405, 503].includes(error.status)) {
                setStatus(formStatus, `Request could not be submitted: ${error.message}`);
                formStatus?.classList.add('error');
                return;
            }
            const existingOrders = await window.ShopData.getOrders();
            window.ShopData.saveOrders([order, ...existingOrders]);
            setStatus(formStatus, 'Demo/browser-local only: this request was saved on this device because hosted storage is unavailable. It was not submitted to the shop.');
            formStatus?.classList.add('error');
            orderSuccess.classList.add('hidden');
            return;
        }

        customOrderForm.style.display = 'none';
        orderSuccess.classList.remove('hidden');
        document.getElementById('orderSuccessMessage').textContent = successMessage;
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

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        const muted = volumeLevel !== 0;
        volumeLevel = muted ? 0 : 100;
        if (musicVideo) musicVideo.muted = muted;
        volumeBtn.textContent = muted ? '🔇' : '🔊';
        volumeBtn.setAttribute('aria-pressed', String(muted));
        volumeBtn.setAttribute('aria-label', muted ? 'Unmute store music' : 'Mute store music');

        const randomPulse = Math.random() * 0.3 + 0.2;
        volumeBtn.style.transform = `scale(${1 + randomPulse})`;
        setTimeout(() => {
            volumeBtn.style.transform = 'scale(1)';
        }, 200);
    });
}

musicPlayPauseButton?.addEventListener('click', () => {
    if (musicVideo?.paused) {
        playMusic();
    } else {
        musicVideo.pause();
    }
});
musicNextButton?.addEventListener('click', () => changeMusicTrack(1));
musicVideo?.addEventListener('click', () => {
    if (musicVideo.paused) {
        playMusic();
    } else {
        musicVideo.pause();
    }
});
musicVideo?.addEventListener('play', () => {
    musicPlayPauseButton.textContent = '⏸';
    musicPlayPauseButton.setAttribute('aria-label', 'Pause video');
});
musicVideo?.addEventListener('pause', () => {
    musicPlayPauseButton.textContent = '▶';
    musicPlayPauseButton.setAttribute('aria-label', 'Play video');
});
musicVideo?.addEventListener('ended', () => {
    changeMusicTrack(1);
    playMusic();
});

document.addEventListener('DOMContentLoaded', async () => {
    const requestedChannel = new URLSearchParams(window.location.search).get('channel');
    const availableChannels = new Set(Array.from(channelSelector?.options || []).map(option => option.value));
    activateChannel(availableChannels.has(requestedChannel) ? requestedChannel : 'home');

    bindClickSound();
    bindProductCardEffects();
    additionalSetRadios.forEach(radio => {
        radio.addEventListener('change', updateAdditionalSetVisibility);
    });
    updateAdditionalSetVisibility();
    renderReviews();

    if (reviewForm) {
        reviewForm.addEventListener('submit', saveReview);
    }

    if (tvBootOverlay) {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.setTimeout(() => {
            tvBootOverlay.classList.add('boot-complete');
        }, reducedMotion ? 0 : 2600);
    }

    await Promise.all([initializeShopData(), loadMusicPlaylist()]);
    syncProductRoute();

    const checkoutResult = new URLSearchParams(window.location.search).get('checkout');
    if (checkoutResult === 'success') {
        setStatus(cartStatusMessage, 'Stripe received your checkout. Payment and inventory are finalized by the signed webhook.');
        announceStatus('Checkout completed. Payment confirmation is processing.');
    } else if (checkoutResult === 'cancelled') {
        setStatus(cartStatusMessage, 'Checkout was cancelled. Your browser-local cart is unchanged.');
    }
});

document.addEventListener('keydown', event => {
    if (!channelSelector || !channels.length || document.activeElement !== channelSelector) {
        return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const options = Array.from(channelSelector.options).filter(option => !option.hidden);
        const currentIndex = options.findIndex(option => option.value === channelSelector.value);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowUp' && currentIndex > 0) {
            nextIndex = currentIndex - 1;
        } else if (event.key === 'ArrowDown' && currentIndex < options.length - 1) {
            nextIndex = currentIndex + 1;
        }

        if (nextIndex !== currentIndex) {
            activateChannel(options[nextIndex].value, true);
        }
    }
});

const contentScreenContent = document.querySelector('.screen-wrapper');
if (contentScreenContent) {
    contentScreenContent.addEventListener('touchstart', event => {
        touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    contentScreenContent.addEventListener('touchend', event => {
        touchEndX = event.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
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
            activateChannel(visibleOptions[currentIndex + 1].value, true);
        } else if (diff < 0 && currentIndex > 0) {
            activateChannel(visibleOptions[currentIndex - 1].value, true);
        }
    }
}

console.log('%c📺 Welcome to Sip of Ghoulaid Shop! 📺', 'color: #00ff88; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00ff88;');
console.log('%cEnjoy your spooky shopping experience! 🎨', 'color: #ff69b4; font-size: 14px;');
