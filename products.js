(function () {
    const DEFAULT_PRODUCTS_PATH = 'products.json';
    let idCounter = 0;
    const DEFAULT_PAYMENT_METHODS = [
        {
            id: 'paypal',
            name: 'PayPal',
            enabled: true,
            instructions: 'Send your payment through PayPal once your order total is confirmed.'
        },
        {
            id: 'klarna',
            name: 'Klarna',
            enabled: true,
            instructions: 'Ask for a Klarna-ready invoice after we confirm your spooky order details.'
        },
        {
            id: 'afterpay',
            name: 'Afterpay',
            enabled: true,
            instructions: 'Afterpay is available after we review and approve your final order total.'
        },
        {
            id: 'zip',
            name: 'Zip',
            enabled: true,
            instructions: 'Choose Zip if you want to split your payment after the order is confirmed.'
        },
        {
            id: 'apple-pay',
            name: 'Apple Pay',
            enabled: true,
            instructions: 'Apple Pay can be requested when we send your final payment request.'
        }
    ];
    const resourceConfigs = {
        products: {
            storageKey: 'sip-of-ghoulaid-products-v2',
            eventName: 'sip-of-ghoulaid-products-updated',
            getDefault: async () => normalizeProducts(await loadDefaultProducts())
        },
        orders: {
            storageKey: 'sip-of-ghoulaid-orders',
            eventName: 'sip-of-ghoulaid-orders-updated',
            getDefault: async () => []
        },
        users: {
            storageKey: 'sip-of-ghoulaid-users',
            eventName: 'sip-of-ghoulaid-users-updated',
            getDefault: async () => []
        },
        currentUser: {
            storageKey: 'sip-of-ghoulaid-current-user',
            eventName: 'sip-of-ghoulaid-current-user-updated',
            getDefault: async () => ({})
        },
        wishlists: {
            storageKey: 'sip-of-ghoulaid-wishlists',
            eventName: 'sip-of-ghoulaid-wishlists-updated',
            getDefault: async () => []
        },
        carts: {
            storageKey: 'sip-of-ghoulaid-carts',
            eventName: 'sip-of-ghoulaid-carts-updated',
            getDefault: async () => []
        },
        paymentMethods: {
            storageKey: 'sip-of-ghoulaid-payment-methods',
            eventName: 'sip-of-ghoulaid-payment-methods-updated',
            getDefault: async () => DEFAULT_PAYMENT_METHODS
        },
        discounts: {
            storageKey: 'sip-of-ghoulaid-discounts',
            eventName: 'sip-of-ghoulaid-discounts-updated',
            getDefault: async () => []
        },
        marketing: {
            storageKey: 'sip-of-ghoulaid-marketing',
            eventName: 'sip-of-ghoulaid-marketing-updated',
            getDefault: async () => ({
                announcementTitle: 'Latest Broadcast',
                announcementMessage: 'Fresh spooky drops are always brewing in the Sip of Ghoulaid shop.',
                featuredTitle: 'Featured Fright',
                featuredMessage: 'Use the admin panel to spotlight your newest creepy-cute obsession.'
            })
        },
        settings: {
            storageKey: 'sip-of-ghoulaid-settings',
            eventName: 'sip-of-ghoulaid-settings-updated',
            getDefault: async () => ({
                shopName: 'Sip of Ghoulaid Shop',
                homeHeadline: 'SIP OF GHOULAID',
                homeTagline: 'CREEPY • CUTE • HANDMADE • A LITTLE UNHINGED',
                shopNote: 'Visit sipofghoulaid.com for the full collection and latest releases! 👻'
            })
        },
        appCenter: {
            storageKey: 'sip-of-ghoulaid-app-center',
            eventName: 'sip-of-ghoulaid-app-center-updated',
            getDefault: async () => ({
                marketingEnabled: true,
                discountsEnabled: true,
                customOrdersEnabled: true
            })
        },
        designer: {
            storageKey: 'sip-of-ghoulaid-designer',
            eventName: 'sip-of-ghoulaid-designer-updated',
            getDefault: async () => ({
                productCardSize: 'cozy',
                staticEffect: true
            })
        }
    };

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

    function normalizeStock(value, fallback = 0) {
        const numericValue = Number.parseInt(value, 10);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
            return fallback;
        }

        return numericValue;
    }

    function normalizeHandle(value, name) {
        const source = normalizeText(value, name);
        return source
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
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

    function normalizeVariantDetails(value, legacyVariants, listingPrice) {
        const source = Array.isArray(value) && value.length
            ? value
            : normalizeStringMatrix(legacyVariants).map(name => ({ name }));

        return source
            .map((variant, index) => {
                const item = typeof variant === 'string' ? { name: variant } : variant;
                const name = normalizeText(item.name);
                if (!name) {
                    return null;
                }

                return {
                    id: normalizeText(item.id, `variant-${index + 1}`),
                    name,
                    price: normalizeAmount(item.price, listingPrice),
                    stock: item.stock === null || item.stock === '' || typeof item.stock === 'undefined'
                        ? null
                        : normalizeStock(item.stock)
                };
            })
            .filter(Boolean);
    }

    function normalizeProduct(product) {
        const listingPrice = normalizeAmount(product.listingPrice);
        const onSale = normalizeBoolean(product.onSale);
        const salePrice = normalizeAmount(product.salePrice);
        const trackInventory = normalizeBoolean(product.trackInventory);
        const categories = normalizeStringArray(product.categories || product.subcategories);
        const variantDetails = normalizeVariantDetails(product.variantDetails, product.variants, listingPrice);
        const stock = trackInventory ? normalizeStock(product.stock) : null;
        const hasAvailableVariant = variantDetails.some(variant => variant.stock === null || variant.stock > 0);

        return {
            id: normalizeText(product.id, createId('product')),
            name: normalizeText(product.name),
            handle: normalizeHandle(product.handle, product.name),
            emoji: normalizeText(product.emoji, '🛍️'),
            description: normalizeText(product.description),
            descriptionHtml: normalizeText(product.descriptionHtml),
            categories,
            subcategories: categories,
            listingPrice,
            onSale,
            salePrice: onSale && salePrice > 0 ? salePrice : 0,
            shippingPrice: normalizeAmount(product.shippingPrice),
            shippingWeight: normalizeAmount(product.shippingWeight),
            shippingWeightUnit: ['oz', 'g', 'kg', 'lb'].includes(product.shippingWeightUnit)
                ? product.shippingWeightUnit
                : 'oz',
            packageSize: normalizeText(product.packageSize),
            mustShipAlone: normalizeBoolean(product.mustShipAlone),
            trackInventory,
            stock,
            variantGroupName: normalizeText(product.variantGroupName, 'Options'),
            variantDetails,
            variants: variantDetails.map(variant => variant.name),
            images: normalizeMediaList(product.images, 25),
            videos: normalizeMediaList(product.videos, 3),
            available: product.available !== false
                && (!trackInventory || (variantDetails.length ? hasAvailableVariant : stock > 0)),
            priceSource: normalizeText(product.priceSource, 'browser-local'),
            sourceUrl: normalizeText(product.sourceUrl)
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
            createdAt: normalizeText(order.createdAt, new Date().toISOString())
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
            return normalizePaymentMethods(DEFAULT_PAYMENT_METHODS);
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
        const homeHeadline = normalizeText(settings.homeHeadline, 'SIP OF GHOULAID');

        return {
            shopName: normalizeText(settings.shopName, 'Sip of Ghoulaid Shop'),
            homeHeadline: homeHeadline === 'WELCOME CULT LEADERS AND GHOULAID DRINKERS'
                ? 'SIP OF GHOULAID'
                : homeHeadline,
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

    function getEmptyValue(resourceName) {
        if (resourceName === 'products' || resourceName === 'orders' || resourceName === 'discounts') {
            return [];
        }

        if (resourceName === 'users' || resourceName === 'wishlists' || resourceName === 'carts' || resourceName === 'paymentMethods') {
            return [];
        }

        return {};
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

    async function loadDefaultProducts() {
        const response = await fetch(DEFAULT_PRODUCTS_PATH, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Unable to load default products: ${response.status}`);
        }

        return await response.json();
    }

    function getConfig(resourceName) {
        const config = resourceConfigs[resourceName];
        if (!config) {
            throw new Error(`Unknown resource: ${resourceName}`);
        }

        return config;
    }

    function normalizeResource(resourceName, value) {
        return normalizers[resourceName](value);
    }

    function readStoredResource(resourceName) {
        const { storageKey } = getConfig(resourceName);
        const rawValue = localStorage.getItem(storageKey);
        if (!rawValue) {
            return null;
        }

        return normalizeResource(resourceName, JSON.parse(rawValue));
    }

    function dispatchUpdate(resourceName, value) {
        const { eventName } = getConfig(resourceName);
        window.dispatchEvent(new CustomEvent(eventName, {
            detail: normalizeResource(resourceName, value)
        }));
    }

    async function getResource(resourceName) {
        try {
            const storedValue = readStoredResource(resourceName);
            if (storedValue !== null) {
                return storedValue;
            }
        } catch (error) {
            console.warn(`Stored ${resourceName} were invalid. Reloading defaults.`, error);
        }

        const defaultValue = await getConfig(resourceName).getDefault();
        return saveResource(resourceName, defaultValue);
    }

    function saveResource(resourceName, value) {
        const { storageKey } = getConfig(resourceName);
        const normalizedValue = normalizeResource(resourceName, value);
        localStorage.setItem(storageKey, JSON.stringify(normalizedValue));
        dispatchUpdate(resourceName, normalizedValue);
        return normalizedValue;
    }

    async function resetResource(resourceName) {
        const defaultValue = await getConfig(resourceName).getDefault();
        return saveResource(resourceName, defaultValue);
    }

    function subscribe(resourceName, listener) {
        const { storageKey, eventName } = getConfig(resourceName);

        window.addEventListener(eventName, event => {
            listener(normalizeResource(resourceName, event.detail));
        });

        window.addEventListener('storage', event => {
            if (event.key !== storageKey) {
                return;
            }

            try {
                const value = event.newValue
                    ? normalizeResource(resourceName, JSON.parse(event.newValue))
                    : normalizeResource(resourceName, getEmptyValue(resourceName));
                listener(value);
            } catch (error) {
                console.warn(`Unable to parse updated stored ${resourceName}.`, error);
            }
        });
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
        getResource,
        saveResource,
        resetResource,
        subscribe,
        getProducts: () => getResource('products'),
        saveProducts: value => saveResource('products', value),
        resetProducts: () => resetResource('products'),
        getOrders: () => getResource('orders'),
        saveOrders: value => saveResource('orders', value),
        getUsers: () => getResource('users'),
        saveUsers: value => saveResource('users', value),
        getCurrentUser: () => getResource('currentUser'),
        saveCurrentUser: value => saveResource('currentUser', value),
        getWishlists: () => getResource('wishlists'),
        saveWishlists: value => saveResource('wishlists', value),
        getCarts: () => getResource('carts'),
        saveCarts: value => saveResource('carts', value),
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
