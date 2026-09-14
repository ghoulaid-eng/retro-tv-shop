(function () {
    const STORAGE_KEY = 'sip-of-ghoulaid-products';
    const UPDATE_EVENT = 'sip-of-ghoulaid-products-updated';
    const DEFAULT_PRODUCTS_PATH = 'products.json';

    function createId() {
        return `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function normalizeSubcategories(subcategories) {
        if (Array.isArray(subcategories)) {
            return subcategories
                .map(item => String(item).trim())
                .filter(Boolean);
        }

        if (typeof subcategories === 'string') {
            return subcategories
                .split(/\r?\n|,/)
                .map(item => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    function normalizeProduct(product) {
        return {
            id: String(product.id || createId()),
            name: String(product.name || '').trim(),
            emoji: String(product.emoji || '🛍️').trim() || '🛍️',
            description: String(product.description || '').trim(),
            subcategories: normalizeSubcategories(product.subcategories)
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

    async function loadDefaultProducts() {
        const response = await fetch(DEFAULT_PRODUCTS_PATH, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Unable to load default products: ${response.status}`);
        }

        return normalizeProducts(await response.json());
    }

    function readStoredProducts() {
        const rawProducts = localStorage.getItem(STORAGE_KEY);
        if (!rawProducts) {
            return null;
        }

        return normalizeProducts(JSON.parse(rawProducts));
    }

    function dispatchUpdate(products) {
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
            detail: normalizeProducts(products)
        }));
    }

    function saveProducts(products) {
        const normalizedProducts = normalizeProducts(products);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedProducts));
        dispatchUpdate(normalizedProducts);
        return normalizedProducts;
    }

    async function getProducts() {
        try {
            const storedProducts = readStoredProducts();
            if (storedProducts) {
                return storedProducts;
            }
        } catch (error) {
            console.warn('Stored products were invalid. Reloading defaults.', error);
        }

        const defaultProducts = await loadDefaultProducts();
        saveProducts(defaultProducts);
        return defaultProducts;
    }

    function subscribe(listener) {
        window.addEventListener(UPDATE_EVENT, (event) => {
            listener(normalizeProducts(event.detail));
        });

        window.addEventListener('storage', (event) => {
            if (event.key !== STORAGE_KEY) {
                return;
            }

            try {
                const updatedProducts = event.newValue
                    ? normalizeProducts(JSON.parse(event.newValue))
                    : [];
                listener(updatedProducts);
            } catch (error) {
                console.warn('Unable to parse updated stored products.', error);
            }
        });
    }

    async function resetProducts() {
        const defaultProducts = await loadDefaultProducts();
        return saveProducts(defaultProducts);
    }

    window.ProductStore = {
        getProducts,
        saveProducts,
        subscribe,
        resetProducts,
        loadDefaultProducts,
        normalizeProducts
    };
})();
