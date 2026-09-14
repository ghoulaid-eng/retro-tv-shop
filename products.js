(function () {
    const DEFAULT_PRODUCTS_PATH = 'products.json';
    const resourceConfigs = {
        products: {
            storageKey: 'sip-of-ghoulaid-products',
            eventName: 'sip-of-ghoulaid-products-updated',
            getDefault: async () => normalizeProducts(await loadDefaultProducts())
        },
        orders: {
            storageKey: 'sip-of-ghoulaid-orders',
            eventName: 'sip-of-ghoulaid-orders-updated',
            getDefault: async () => []
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
                homeHeadline: 'WELCOME CULT LEADERS AND GHOULAID DRINKERS',
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
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

    function normalizeProduct(product) {
        return {
            id: normalizeText(product.id, createId('product')),
            name: normalizeText(product.name),
            emoji: normalizeText(product.emoji, '🛍️'),
            description: normalizeText(product.description),
            subcategories: normalizeStringArray(product.subcategories)
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
            shopNote: normalizeText(settings.shopNote, 'Visit sipofghoulaid.com for the full collection and latest releases! 👻')
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

        return {};
    }

    const normalizers = {
        products: normalizeProducts,
        orders: normalizeOrders,
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
