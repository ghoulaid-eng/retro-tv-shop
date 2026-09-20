(function () {
    const DEFAULT_PRODUCTS_PATH = 'products.json';
    let idCounter = 0;
    const listeners = new Map();
    const resourceCache = new Map();

    function createId(prefix = 'item') {
        idCounter += 1;

        if (window.crypto?.getRandomValues) {
            const values = new Uint32Array(2);
            window.crypto.getRandomValues(values);
            return `${prefix}-${Date.now().toString(36)}-${values[0].toString(36)}${values[1].toString(36)}`;
        }

        return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.floor(performance.now()).toString(36)}`;
    }

    function normalizeText(value, fallback = '') {
        const normalized = String(value ?? fallback).trim();
        return normalized || fallback;
    }

    function normalizeBoolean(value, fallback = false) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            return value === 'true' || value === 'on' || value === 'yes';
        }

        return fallback;
    }

    function normalizeStringArray(value) {
        if (Array.isArray(value)) {
            return value.map(item => String(item).trim()).filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(/\r?\n|,/) 
                .map(item => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    function normalizeAmount(value, fallback = 0) {
        const numericValue = Number.parseFloat(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
            return fallback;
        }

        return Math.round(numericValue * 100) / 100;
    }

    function normalizeInteger(value, fallback = 1) {
        const numericValue = Number.parseInt(value, 10);
        if (!Number.isFinite(numericValue) || numericValue < 1) {
            return fallback;
        }

        return numericValue;
    }

    function normalizeStringMatrix(value) {
        if (Array.isArray(value)) {
            return value
                .map(item => String(item).trim())
                .filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    function normalizeMediaList(value, maxItems) {
        const media = Array.isArray(value) ? value : [];
        return media
            .map(item => String(item).trim())
            .filter(Boolean)
            .slice(0, maxItems);
    }

    function normalizeProduct(product) {
        const listingPrice = normalizeAmount(product.listingPrice);
        const onSale = normalizeBoolean(product.onSale);
        const salePrice = normalizeAmount(product.salePrice);

        return {
            id: normalizeText(product.id, createId('product')),
            name: normalizeText(product.name),
            emoji: normalizeText(product.emoji, '🛍️'),
            description: normalizeText(product.description),
            subcategories: normalizeStringArray(product.subcategories),
            listingPrice,
            onSale,
            salePrice: onSale && salePrice > 0 ? salePrice : 0,
            shippingPrice: normalizeAmount(product.shippingPrice),
            variants: normalizeStringMatrix(product.variants),
            images: normalizeMediaList(product.images, 10),
            videos: normalizeMediaList(product.videos, 3)
        };
    }

    function normalizeProducts(products) {
        if (!Array.isArray(products)) {
            return [];
        }

        return products
            .map(normalizeProduct)
            .filter(product => product.name);
    }

    function normalizeOrder(order) {
        return {
            id: normalizeText(order.id, createId('order')),
            fullName: normalizeText(order.fullName),
            username: normalizeText(order.username),
            contactMethod: normalizeText(order.contactMethod),
            contactInfo: normalizeText(order.contactInfo),
            customizationLevel: normalizeText(order.customizationLevel),
            description: normalizeText(order.description),
            refImages: normalizeText(order.refImages),
            colors: normalizeText(order.colors),
            handPaintedDetails: normalizeText(order.handPaintedDetails),
            scents: normalizeStringArray(order.scents || order.scent),
            glitter: normalizeBoolean(order.glitter),
            glow: normalizeBoolean(order.glow),
            additionalSets: normalizeText(order.additionalSets),
            additionalSetCount: normalizeText(order.additionalSetCount),
            deadline: normalizeText(order.deadline),
            additionalInfo: normalizeText(order.additionalInfo),
            paymentMethod: normalizeText(order.paymentMethod),
            paymentStatus: normalizeText(order.paymentStatus, 'Awaiting Payment'),
            paymentAmount: normalizeAmount(order.paymentAmount),
            paymentReference: normalizeText(order.paymentReference),
            paymentNotes: normalizeText(order.paymentNotes),
            paymentReceivedAt: normalizeText(order.paymentReceivedAt),
            status: normalizeText(order.status, 'Pending'),
            createdAt: normalizeText(order.createdAt, new Date().toISOString()),
            updatedAt: normalizeText(order.updatedAt, new Date().toISOString()),
            userId: normalizeText(order.userId),
            totals: typeof order.totals === 'object' && order.totals
                ? {
                    subtotal: normalizeAmount(order.totals.subtotal),
                    shipping: normalizeAmount(order.totals.shipping),
                    tax: normalizeAmount(order.totals.tax),
                    total: normalizeAmount(order.totals.total)
                }
                : { subtotal: 0, shipping: 0, tax: 0, total: 0 }
        };
    }

    function normalizeOrders(orders) {
        if (!Array.isArray(orders)) {
            return [];
        }

        return orders
            .map(normalizeOrder)
            .filter(order => order.fullName || order.description)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    function normalizeUser(user) {
        return {
            id: normalizeText(user.id, createId('user')),
            name: normalizeText(user.name),
            username: normalizeText(user.username),
            email: normalizeText(user.email),
            contactMethod: normalizeText(user.contactMethod),
            contactInfo: normalizeText(user.contactInfo),
            shippingFullName: normalizeText(user.shippingFullName),
            shippingAddressLine1: normalizeText(user.shippingAddressLine1),
            shippingAddressLine2: normalizeText(user.shippingAddressLine2),
            shippingCity: normalizeText(user.shippingCity),
            shippingState: normalizeText(user.shippingState),
            shippingPostalCode: normalizeText(user.shippingPostalCode),
            shippingCountry: normalizeText(user.shippingCountry),
            role: normalizeText(user.role, 'customer'),
            emailVerified: normalizeBoolean(user.emailVerified),
            createdAt: normalizeText(user.createdAt, new Date().toISOString()),
            updatedAt: normalizeText(user.updatedAt, new Date().toISOString())
        };
    }

    function normalizeUsers(users) {
        if (!Array.isArray(users)) {
            return [];
        }

        return users
            .map(normalizeUser)
            .filter(user => user.name || user.username || user.email);
    }

    function normalizeCurrentUser(currentUser) {
        return {
            userId: normalizeText(currentUser.userId),
            updatedAt: normalizeText(currentUser.updatedAt, new Date().toISOString())
        };
    }

    function normalizeWishlistEntry(entry) {
        return {
            userId: normalizeText(entry.userId),
            productIds: [...new Set(normalizeStringArray(entry.productIds))],
            updatedAt: normalizeText(entry.updatedAt, new Date().toISOString())
        };
    }

    function normalizeWishlists(wishlists) {
        if (!Array.isArray(wishlists)) {
            return [];
        }

        return wishlists
            .map(normalizeWishlistEntry)
            .filter(entry => entry.userId);
    }

    function normalizeCartItem(item) {
        return {
            productId: normalizeText(item.productId),
            variant: normalizeText(item.variant),
            quantity: normalizeInteger(item.quantity, 1)
        };
    }

    function normalizeCart(cart) {
        return {
            userId: normalizeText(cart.userId),
            items: Array.isArray(cart.items)
                ? cart.items.map(normalizeCartItem).filter(item => item.productId)
                : [],
            updatedAt: normalizeText(cart.updatedAt, new Date().toISOString())
        };
    }

    function normalizeCarts(carts) {
        if (!Array.isArray(carts)) {
            return [];
        }

        return carts
            .map(normalizeCart)
            .filter(cart => cart.userId);
    }

    function normalizeDiscount(discount) {
        return {
            id: normalizeText(discount.id, createId('discount')),
            code: normalizeText(discount.code).toUpperCase(),
            description: normalizeText(discount.description),
            details: normalizeText(discount.details)
        };
    }

    function normalizeDiscounts(discounts) {
        if (!Array.isArray(discounts)) {
            return [];
        }

        return discounts
            .map(normalizeDiscount)
            .filter(discount => discount.code || discount.description);
    }

    function normalizePaymentMethod(method) {
        return {
            id: normalizeText(method.id, createId('payment-method')),
            name: normalizeText(method.name),
            enabled: normalizeBoolean(method.enabled, true),
            instructions: normalizeText(method.instructions)
        };
    }

    function normalizePaymentMethods(methods) {
        if (!Array.isArray(methods)) {
            return [];
        }

        return methods
            .map(normalizePaymentMethod)
            .filter(method => method.name);
    }

    function normalizeMarketing(marketing) {
        return {
            announcementTitle: normalizeText(marketing.announcementTitle, 'Latest Broadcast'),
            announcementMessage: normalizeText(marketing.announcementMessage, 'Fresh spooky drops are always brewing in the Sip of Ghoulaid shop.'),
            featuredTitle: normalizeText(marketing.featuredTitle, 'Featured Fright'),
            featuredMessage: normalizeText(marketing.featuredMessage, 'Use the admin panel to spotlight your newest creepy-cute obsession.')
        };
    }

    function normalizeSettings(settings) {
        return {
            shopName: normalizeText(settings.shopName, 'Sip of Ghoulaid Shop'),
            homeHeadline: normalizeText(settings.homeHeadline, 'WELCOME CULT LEADERS AND GHOULAID DRINKERS'),
            homeTagline: normalizeText(settings.homeTagline, 'CREEPY • CUTE • HANDMADE • A LITTLE UNHINGED'),
            shopNote: normalizeText(settings.shopNote, 'Visit sipofghoulaid.com for the full collection and latest releases! 👻'),
            salesTaxRate: normalizeAmount(settings.salesTaxRate, 8.25),
            shippingBaseRate: normalizeAmount(settings.shippingBaseRate, 4.99)
        };
    }

    function normalizeAppCenter(appCenter) {
        return {
            marketingEnabled: normalizeBoolean(appCenter.marketingEnabled, true),
            discountsEnabled: normalizeBoolean(appCenter.discountsEnabled, true),
            customOrdersEnabled: normalizeBoolean(appCenter.customOrdersEnabled, true)
        };
    }

    function normalizeDesigner(designer) {
        const allowedCardSizes = new Set(['compact', 'cozy', 'showcase']);
        const productCardSize = normalizeText(designer.productCardSize, 'cozy');

        return {
            productCardSize: allowedCardSizes.has(productCardSize) ? productCardSize : 'cozy',
            staticEffect: normalizeBoolean(designer.staticEffect, true)
        };
    }

    const normalizers = {
        products: normalizeProducts,
        orders: normalizeOrders,
        users: normalizeUsers,
        currentUser: normalizeCurrentUser,
        wishlists: normalizeWishlists,
        carts: normalizeCarts,
        paymentMethods: normalizePaymentMethods,
        discounts: normalizeDiscounts,
        marketing: normalizeMarketing,
        settings: normalizeSettings,
        appCenter: normalizeAppCenter,
        designer: normalizeDesigner
    };

    function normalizeResource(resourceName, value) {
        return normalizers[resourceName](value);
    }

    function emit(resourceName, value) {
        const normalizedValue = normalizeResource(resourceName, value);
        resourceCache.set(resourceName, normalizedValue);
        const resourceListeners = listeners.get(resourceName) || [];
        resourceListeners.forEach(listener => listener(normalizedValue));
    }

    async function api(path, options = {}) {
        const headers = new Headers(options.headers || {});
        if (!options.body || options.body instanceof FormData) {
            headers.delete('Content-Type');
        } else if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(path, {
            credentials: 'same-origin',
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        let payload = null;
        if (response.status !== 204) {
            payload = contentType.includes('application/json') ? await response.json() : await response.text();
        }

        if (!response.ok) {
            const error = new Error(payload?.error || response.statusText || 'Request failed');
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    }

    async function loadDefaultProducts() {
        const response = await fetch(DEFAULT_PRODUCTS_PATH, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Unable to load default products: ${response.status}`);
        }

        return await response.json();
    }

    async function getResource(resourceName) {
        const payload = await api(`/api/resources/${resourceName}`);
        const normalizedValue = normalizeResource(resourceName, payload.value);
        resourceCache.set(resourceName, normalizedValue);
        return normalizedValue;
    }

    async function saveResource(resourceName, value) {
        const payload = await api(`/api/resources/${resourceName}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
        emit(resourceName, payload.value);
        return resourceCache.get(resourceName);
    }

    async function resetResource(resourceName) {
        const payload = await api(`/api/resources/${resourceName}/reset`, {
            method: 'POST'
        });
        emit(resourceName, payload.value);
        return resourceCache.get(resourceName);
    }

    function subscribe(resourceName, listener) {
        const resourceListeners = listeners.get(resourceName) || [];
        resourceListeners.push(listener);
        listeners.set(resourceName, resourceListeners);
    }

    async function getPublicBootstrap() {
        const payload = await api('/api/bootstrap/public');
        Object.entries(payload).forEach(([resourceName, value]) => {
            if (normalizers[resourceName]) {
                resourceCache.set(resourceName, normalizeResource(resourceName, value));
            }
        });
        return payload;
    }

    async function getAdminBootstrap() {
        const payload = await api('/api/bootstrap/admin');
        Object.entries(payload).forEach(([resourceName, value]) => {
            if (normalizers[resourceName]) {
                resourceCache.set(resourceName, normalizeResource(resourceName, value));
            }
        });
        return payload;
    }

    async function getAccountBootstrap() {
        const payload = await api('/api/bootstrap/account');
        const user = payload.user ? normalizeUser(payload.user) : null;
        const wishlist = user
            ? normalizeWishlistEntry(payload.wishlist || { userId: user.id, productIds: [] })
            : { productIds: [] };
        const cart = user
            ? normalizeCart(payload.cart || { userId: user.id, items: [] })
            : { items: [] };

        resourceCache.set('users', user ? [user] : []);
        resourceCache.set('currentUser', normalizeCurrentUser(user ? { userId: user.id } : {}));
        resourceCache.set('wishlists', user ? [wishlist] : []);
        resourceCache.set('carts', user ? [cart] : []);

        return { user, wishlist, cart };
    }

    async function signUp(payload) {
        const response = await api('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const user = normalizeUser(response.user);
        resourceCache.set('users', [user]);
        resourceCache.set('currentUser', normalizeCurrentUser({ userId: user.id }));
        resourceCache.set('wishlists', [{ userId: user.id, productIds: [], updatedAt: new Date().toISOString() }]);
        resourceCache.set('carts', [{ userId: user.id, items: [], updatedAt: new Date().toISOString() }]);
        return { ...response, user };
    }

    async function signIn(payload) {
        const response = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const user = normalizeUser(response.user);
        resourceCache.set('users', [user]);
        resourceCache.set('currentUser', normalizeCurrentUser({ userId: user.id }));
        return { ...response, user };
    }

    async function signOut() {
        await api('/api/auth/logout', { method: 'POST' });
        resourceCache.set('users', []);
        resourceCache.set('currentUser', normalizeCurrentUser({ userId: '' }));
        resourceCache.set('wishlists', []);
        resourceCache.set('carts', []);
        emit('currentUser', { userId: '' });
        emit('users', []);
        emit('wishlists', []);
        emit('carts', []);
    }

    async function requestPasswordReset(email) {
        return await api('/api/auth/request-password-reset', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async function resetPassword(token, password) {
        return await api('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
    }

    async function resendVerification() {
        return await api('/api/auth/resend-verification', { method: 'POST' });
    }

    async function updateProfile(profile) {
        const response = await api('/api/account/profile', {
            method: 'POST',
            body: JSON.stringify(profile)
        });
        const user = normalizeUser(response.user);
        resourceCache.set('users', [user]);
        emit('users', [user]);
        return user;
    }

    async function updateShipping(shipping) {
        const response = await api('/api/account/shipping', {
            method: 'POST',
            body: JSON.stringify(shipping)
        });
        const user = normalizeUser(response.user);
        resourceCache.set('users', [user]);
        emit('users', [user]);
        return user;
    }

    async function saveWishlist(entry) {
        const response = await api('/api/account/wishlist', {
            method: 'PUT',
            body: JSON.stringify({ productIds: entry.productIds })
        });
        const wishlist = normalizeWishlistEntry(response.wishlist);
        resourceCache.set('wishlists', [wishlist]);
        emit('wishlists', [wishlist]);
        return wishlist;
    }

    async function saveCart(entry) {
        const response = await api('/api/account/cart', {
            method: 'PUT',
            body: JSON.stringify({ items: entry.items })
        });
        const cart = normalizeCart(response.cart);
        resourceCache.set('carts', [cart]);
        emit('carts', [cart]);
        return cart;
    }

    async function createCustomOrder(order) {
        const response = await api('/api/orders/custom', {
            method: 'POST',
            body: JSON.stringify(order)
        });
        return normalizeOrder(response.order);
    }

    async function uploadMedia(files, kind) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        const response = await api(`/api/admin/uploads?kind=${encodeURIComponent(kind)}`, {
            method: 'POST',
            body: formData
        });
        return Array.isArray(response.files) ? response.files : [];
    }

    async function updateOrderPayment(orderId, payload) {
        const response = await api(`/api/admin/payments/${encodeURIComponent(orderId)}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        emit('orders', response.orders);
        return normalizeOrders(response.orders);
    }

    const shopData = {
        createId,
        loadDefaultProducts,
        normalizeProducts,
        normalizeOrders,
        normalizeAmount,
        normalizeDiscounts,
        normalizeMarketing,
        normalizeSettings,
        normalizeAppCenter,
        normalizeDesigner,
        normalizeUser,
        normalizeCart,
        normalizeWishlistEntry,
        getResource,
        saveResource,
        resetResource,
        subscribe,
        getPublicBootstrap,
        getAdminBootstrap,
        getAccountBootstrap,
        auth: {
            signUp,
            signIn,
            signOut,
            requestPasswordReset,
            resetPassword,
            resendVerification
        },
        account: {
            updateProfile,
            updateShipping,
            saveWishlist,
            saveCart
        },
        createCustomOrder,
        uploadMedia,
        updateOrderPayment,
        getProducts: () => getResource('products'),
        saveProducts: value => saveResource('products', value),
        resetProducts: () => resetResource('products'),
        getOrders: () => getResource('orders'),
        saveOrders: value => saveResource('orders', value),
        getUsers: async () => resourceCache.get('users') || (await getAccountBootstrap(), resourceCache.get('users')),
        saveUsers: async value => {
            const firstUser = Array.isArray(value) ? value[0] : null;
            if (!firstUser) {
                throw new Error('Saving arbitrary user lists is not supported.');
            }
            return [await updateProfile(firstUser)];
        },
        getCurrentUser: async () => resourceCache.get('currentUser') || (await getAccountBootstrap(), resourceCache.get('currentUser')),
        saveCurrentUser: async value => {
            if (!value?.userId) {
                await signOut();
            }
            return resourceCache.get('currentUser') || normalizeCurrentUser(value);
        },
        getWishlists: async () => resourceCache.get('wishlists') || (await getAccountBootstrap(), resourceCache.get('wishlists')),
        saveWishlists: async value => {
            const firstEntry = Array.isArray(value) ? value[0] : null;
            if (!firstEntry) {
                throw new Error('Saving arbitrary wishlists is not supported.');
            }
            return [await saveWishlist(firstEntry)];
        },
        getCarts: async () => resourceCache.get('carts') || (await getAccountBootstrap(), resourceCache.get('carts')),
        saveCarts: async value => {
            const firstEntry = Array.isArray(value) ? value[0] : null;
            if (!firstEntry) {
                throw new Error('Saving arbitrary carts is not supported.');
            }
            return [await saveCart(firstEntry)];
        },
        getPaymentMethods: () => getResource('paymentMethods'),
        savePaymentMethods: value => saveResource('paymentMethods', value),
        resetPaymentMethods: () => resetResource('paymentMethods'),
        getDiscounts: () => getResource('discounts'),
        saveDiscounts: value => saveResource('discounts', value),
        getMarketing: () => getResource('marketing'),
        saveMarketing: value => saveResource('marketing', value),
        getSettings: () => getResource('settings'),
        saveSettings: value => saveResource('settings', value),
        getAppCenter: () => getResource('appCenter'),
        saveAppCenter: value => saveResource('appCenter', value),
        getDesigner: () => getResource('designer'),
        saveDesigner: value => saveResource('designer', value)
    };

    window.ShopData = shopData;
    window.ProductStore = {
        getProducts: shopData.getProducts,
        saveProducts: shopData.saveProducts,
        resetProducts: shopData.resetProducts,
        subscribe(listener) {
            shopData.subscribe('products', listener);
        },
        loadDefaultProducts,
        normalizeProducts
    };
})();
