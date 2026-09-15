function createProductSummary(product) {
    const productSummary = document.createElement('div');
    productSummary.className = 'admin-product-summary';

    const emoji = document.createElement('span');
    emoji.className = 'admin-product-emoji';
    emoji.textContent = product.emoji || '🛍️';
    productSummary.appendChild(emoji);

    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = product.name;
    details.appendChild(title);

    if (product.description) {
        const description = document.createElement('p');
        description.textContent = product.description;
        details.appendChild(description);
    }

    if (product.subcategories.length) {
        const subcategories = document.createElement('div');
        subcategories.className = 'subcategories';

        product.subcategories.forEach(subcategory => {
            const item = document.createElement('span');
            item.className = 'subcategory';
            item.textContent = subcategory;
            subcategories.appendChild(item);
        });

        details.appendChild(subcategories);
    }

    productSummary.appendChild(details);
    return productSummary;
}

document.addEventListener('DOMContentLoaded', async () => {
    const clickSound = document.getElementById('clickSound');
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productEmojiInput = document.getElementById('productEmoji');
    const productDescriptionInput = document.getElementById('productDescription');
    const productSubcategoriesInput = document.getElementById('productSubcategories');
    const cancelEditButton = document.getElementById('cancelEdit');
    const resetProductsButton = document.getElementById('resetProducts');
    const productTableBody = document.getElementById('productTableBody');
    const emptyProductsState = document.getElementById('emptyProductsState');
    const adminPreviewGrid = document.getElementById('adminPreviewGrid');
    const formTitle = document.getElementById('formTitle');
    const submitLabel = document.getElementById('submitLabel');
    const statusMessage = document.getElementById('statusMessage');
    const productCountStat = document.getElementById('productCountStat');
    const subcategoryCountStat = document.getElementById('subcategoryCountStat');
    const orderCountStat = document.getElementById('orderCountStat');
    const navButtons = Array.from(document.querySelectorAll('[data-section-target]'));
    const sectionPanels = Array.from(document.querySelectorAll('[data-section-panel]'));
    const quickSectionButtons = Array.from(document.querySelectorAll('[data-open-section]'));
    const newProductShortcut = document.getElementById('newProductShortcut');
    const adminShopName = document.getElementById('adminShopName');
    const adminShopSubtitle = document.getElementById('adminShopSubtitle');
    const discountForm = document.getElementById('discountForm');
    const discountCodeInput = document.getElementById('discountCode');
    const discountDescriptionInput = document.getElementById('discountDescription');
    const discountDetailsInput = document.getElementById('discountDetails');
    const discountList = document.getElementById('discountList');
    const discountStatus = document.getElementById('discountStatus');
    const marketingForm = document.getElementById('marketingForm');
    const marketingAnnouncementTitle = document.getElementById('marketingAnnouncementTitle');
    const marketingAnnouncementMessage = document.getElementById('marketingAnnouncementMessage');
    const marketingFeaturedTitle = document.getElementById('marketingFeaturedTitle');
    const marketingFeaturedMessage = document.getElementById('marketingFeaturedMessage');
    const marketingStatus = document.getElementById('marketingStatus');
    const settingsForm = document.getElementById('settingsForm');
    const settingsShopName = document.getElementById('settingsShopName');
    const settingsHomeHeadline = document.getElementById('settingsHomeHeadline');
    const settingsHomeTagline = document.getElementById('settingsHomeTagline');
    const settingsShopNote = document.getElementById('settingsShopNote');
    const settingsStatus = document.getElementById('settingsStatus');
    const appCenterForm = document.getElementById('appCenterForm');
    const appMarketingEnabled = document.getElementById('appMarketingEnabled');
    const appDiscountsEnabled = document.getElementById('appDiscountsEnabled');
    const appCustomOrdersEnabled = document.getElementById('appCustomOrdersEnabled');
    const appCenterStatus = document.getElementById('appCenterStatus');
    const designerForm = document.getElementById('designerForm');
    const designerProductCardSize = document.getElementById('designerProductCardSize');
    const designerStaticEffect = document.getElementById('designerStaticEffect');
    const designerStatus = document.getElementById('designerStatus');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const emptyOrdersState = document.getElementById('emptyOrdersState');

    let products = [];
    let orders = [];
    let discounts = [];
    let marketing = {};
    let settings = {};
    let appCenter = {};
    let designer = {};

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = AudioContextClass ? new AudioContextClass() : null;

    function playClickSound() {
        if (!audioContext) {
            return;
        }

        try {
            const now = audioContext.currentTime;
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
        } catch (error) {
            console.log('Audio context error:', error);
        }
    }

    function bindClickSound(container = document) {
        container.querySelectorAll('.click-item').forEach(item => {
            if (item.dataset.clickSoundBound === 'true') {
                return;
            }

            item.addEventListener('click', () => {
                if (clickSound) {
                    playClickSound();
                }
            });
            item.dataset.clickSoundBound = 'true';
        });
    }

    function setStatus(target, message) {
        if (target) {
            target.textContent = message;
        }
    }

    function activateSection(sectionName) {
        navButtons.forEach(button => {
            const isActive = button.dataset.sectionTarget === sectionName;
            button.classList.toggle('admin-nav-item-active', isActive);
            button.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        sectionPanels.forEach(panel => {
            panel.classList.toggle('hidden', panel.dataset.sectionPanel !== sectionName);
        });
    }

    function applyAdminBranding() {
        document.title = `${settings.shopName} Admin`;
        adminShopName.textContent = `${settings.shopName} Admin`;
        adminShopSubtitle.textContent = `A spooky control panel for ${settings.shopName.toLowerCase()}, products, and storefront tools.`;
    }

    function applyDesignerPreview() {
        adminPreviewGrid.classList.remove('card-size-compact', 'card-size-cozy', 'card-size-showcase');
        adminPreviewGrid.classList.add(`card-size-${designer.productCardSize || 'cozy'}`);
    }

    function resetProductForm() {
        productForm.reset();
        productIdInput.value = '';
        formTitle.textContent = 'Add New Product';
        submitLabel.textContent = '📼 Save Product';
        cancelEditButton.classList.add('hidden');
    }

    function renderDashboardStats() {
        productCountStat.textContent = String(products.length);
        subcategoryCountStat.textContent = String(products.reduce((count, product) => count + product.subcategories.length, 0));
        orderCountStat.textContent = String(orders.length);
    }

    async function saveProductsWithLatest(applyChange) {
        const latestProducts = await window.ShopData.getProducts();
        const nextProducts = applyChange(latestProducts);
        window.ShopData.saveProducts(nextProducts);
    }

    function renderProducts(nextProducts) {
        products = nextProducts;
        productTableBody.replaceChildren();
        adminPreviewGrid.replaceChildren();
        emptyProductsState.classList.toggle('hidden', products.length > 0);

        products.forEach(product => {
            const row = document.createElement('tr');

            const productCell = document.createElement('td');
            productCell.appendChild(createProductSummary(product));
            row.appendChild(productCell);

            const subcategoryCell = document.createElement('td');
            subcategoryCell.textContent = product.subcategories.join(', ') || '—';
            row.appendChild(subcategoryCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'admin-actions';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'table-action-btn click-item';
            editButton.textContent = '✏️ Edit';
            editButton.addEventListener('click', () => {
                productIdInput.value = product.id;
                productNameInput.value = product.name;
                productEmojiInput.value = product.emoji;
                productDescriptionInput.value = product.description;
                productSubcategoriesInput.value = product.subcategories.join('\n');
                formTitle.textContent = `Edit ${product.name}`;
                submitLabel.textContent = '💾 Update Product';
                cancelEditButton.classList.remove('hidden');
                activateSection('products');
                setStatus(statusMessage, `Editing ${product.name}.`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'table-action-btn table-action-btn-danger click-item';
            deleteButton.textContent = '🗑️ Delete';
            deleteButton.addEventListener('click', async () => {
                await saveProductsWithLatest(currentProducts => currentProducts.filter(item => item.id !== product.id));
                resetProductForm();
                setStatus(statusMessage, `${product.name} removed from the lineup.`);
            });
            actionsCell.appendChild(deleteButton);

            row.appendChild(actionsCell);
            productTableBody.appendChild(row);

            const previewCard = document.createElement('div');
            previewCard.className = 'product-card';
            previewCard.appendChild(createProductSummary(product));
            adminPreviewGrid.appendChild(previewCard);
        });

        renderDashboardStats();
        applyDesignerPreview();
        bindClickSound(productTableBody);
        bindClickSound(adminPreviewGrid);
    }

    function renderOrders(nextOrders) {
        orders = nextOrders;
        ordersTableBody.replaceChildren();
        emptyOrdersState.classList.toggle('hidden', orders.length > 0);

        orders.forEach(order => {
            const row = document.createElement('tr');

            const customerCell = document.createElement('td');
            const customerName = document.createElement('strong');
            customerName.textContent = order.fullName || 'Unknown ghoul';
            customerCell.appendChild(customerName);
            customerCell.appendChild(document.createElement('br'));
            const customerHandle = document.createElement('span');
            customerHandle.textContent = order.username || 'No username';
            customerCell.appendChild(customerHandle);
            row.appendChild(customerCell);

            const requestCell = document.createElement('td');
            requestCell.textContent = order.description || 'No description provided';
            row.appendChild(requestCell);

            const detailCell = document.createElement('td');
            detailCell.textContent = `${order.contactMethod || 'No method'} • ${order.contactInfo || 'No contact'}`;
            row.appendChild(detailCell);

            const statusCell = document.createElement('td');
            const statusSelect = document.createElement('select');
            ['Pending', 'In Progress', 'Ready to Confirm', 'Completed'].forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                option.selected = optionValue === order.status;
                statusSelect.appendChild(option);
            });
            statusSelect.addEventListener('change', () => {
                const updatedOrders = orders.map(item => item.id === order.id ? { ...item, status: statusSelect.value } : item);
                window.ShopData.saveOrders(updatedOrders);
            });
            statusCell.appendChild(statusSelect);
            row.appendChild(statusCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'admin-actions';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'table-action-btn table-action-btn-danger click-item';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                window.ShopData.saveOrders(orders.filter(item => item.id !== order.id));
            });
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            ordersTableBody.appendChild(row);
        });

        renderDashboardStats();
        bindClickSound(ordersTableBody);
    }

    function renderDiscounts(nextDiscounts) {
        discounts = nextDiscounts;
        discountList.replaceChildren();

        if (!discounts.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-products-message';
            empty.textContent = 'No discounts scheduled yet.';
            discountList.appendChild(empty);
            return;
        }

        const list = document.createElement('div');
        list.className = 'admin-stack';

        discounts.forEach(discount => {
            const card = document.createElement('div');
            card.className = 'admin-info-card';

            const title = document.createElement('h3');
            title.textContent = discount.code;
            card.appendChild(title);

            const description = document.createElement('p');
            description.textContent = discount.description || 'No description yet.';
            card.appendChild(description);

            if (discount.details) {
                const details = document.createElement('p');
                details.textContent = discount.details;
                card.appendChild(details);
            }

            const actions = document.createElement('div');
            actions.className = 'admin-actions';

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'table-action-btn table-action-btn-danger click-item';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                window.ShopData.saveDiscounts(discounts.filter(item => item.id !== discount.id));
                setStatus(discountStatus, `${discount.code} removed.`);
            });

            actions.appendChild(deleteButton);
            card.appendChild(actions);
            list.appendChild(card);
        });

        discountList.appendChild(list);
        bindClickSound(discountList);
    }

    function loadMarketingForm() {
        marketingAnnouncementTitle.value = marketing.announcementTitle || '';
        marketingAnnouncementMessage.value = marketing.announcementMessage || '';
        marketingFeaturedTitle.value = marketing.featuredTitle || '';
        marketingFeaturedMessage.value = marketing.featuredMessage || '';
    }

    function loadSettingsForm() {
        settingsShopName.value = settings.shopName || '';
        settingsHomeHeadline.value = settings.homeHeadline || '';
        settingsHomeTagline.value = settings.homeTagline || '';
        settingsShopNote.value = settings.shopNote || '';
        applyAdminBranding();
    }

    function loadAppCenterForm() {
        appMarketingEnabled.checked = Boolean(appCenter.marketingEnabled);
        appDiscountsEnabled.checked = Boolean(appCenter.discountsEnabled);
        appCustomOrdersEnabled.checked = Boolean(appCenter.customOrdersEnabled);
    }

    function loadDesignerForm() {
        designerProductCardSize.value = designer.productCardSize || 'cozy';
        designerStaticEffect.checked = Boolean(designer.staticEffect);
        applyDesignerPreview();
    }

    productForm.addEventListener('submit', async event => {
        event.preventDefault();

        const normalizedProduct = window.ShopData.normalizeProducts([{
            id: productIdInput.value || undefined,
            name: productNameInput.value,
            emoji: productEmojiInput.value,
            description: productDescriptionInput.value,
            subcategories: productSubcategoriesInput.value
        }])[0];

        if (!normalizedProduct) {
            setStatus(statusMessage, 'Add a product name before saving.');
            return;
        }

        await saveProductsWithLatest(currentProducts => {
            const existingIndex = currentProducts.findIndex(item => item.id === normalizedProduct.id);
            const nextProducts = [...currentProducts];

            if (existingIndex >= 0) {
                nextProducts[existingIndex] = normalizedProduct;
                setStatus(statusMessage, `${normalizedProduct.name} updated.`);
            } else {
                nextProducts.push(normalizedProduct);
                setStatus(statusMessage, `${normalizedProduct.name} added to the shop.`);
            }

            return nextProducts;
        });
        resetProductForm();
        activateSection('products');
    });

    cancelEditButton.addEventListener('click', () => {
        resetProductForm();
        setStatus(statusMessage, 'Edit cancelled.');
    });

    resetProductsButton.addEventListener('click', async () => {
        await window.ShopData.resetProducts();
        resetProductForm();
        activateSection('products');
        setStatus(statusMessage, 'Default products restored from products.json.');
    });

    discountForm.addEventListener('submit', event => {
        event.preventDefault();

        const nextDiscounts = [...discounts, ...window.ShopData.normalizeDiscounts([{
            code: discountCodeInput.value,
            description: discountDescriptionInput.value,
            details: discountDetailsInput.value
        }])];

        window.ShopData.saveDiscounts(nextDiscounts);
        discountForm.reset();
        setStatus(discountStatus, 'Discount saved.');
    });

    marketingForm.addEventListener('submit', event => {
        event.preventDefault();
        window.ShopData.saveMarketing({
            announcementTitle: marketingAnnouncementTitle.value,
            announcementMessage: marketingAnnouncementMessage.value,
            featuredTitle: marketingFeaturedTitle.value,
            featuredMessage: marketingFeaturedMessage.value
        });
        setStatus(marketingStatus, 'Marketing broadcast saved.');
    });

    settingsForm.addEventListener('submit', event => {
        event.preventDefault();
        window.ShopData.saveSettings({
            shopName: settingsShopName.value,
            homeHeadline: settingsHomeHeadline.value,
            homeTagline: settingsHomeTagline.value,
            shopNote: settingsShopNote.value
        });
        setStatus(settingsStatus, 'Shop settings saved.');
    });

    appCenterForm.addEventListener('submit', event => {
        event.preventDefault();
        window.ShopData.saveAppCenter({
            marketingEnabled: appMarketingEnabled.checked,
            discountsEnabled: appDiscountsEnabled.checked,
            customOrdersEnabled: appCustomOrdersEnabled.checked
        });
        setStatus(appCenterStatus, 'App center settings saved.');
    });

    designerForm.addEventListener('submit', event => {
        event.preventDefault();
        window.ShopData.saveDesigner({
            productCardSize: designerProductCardSize.value,
            staticEffect: designerStaticEffect.checked
        });
        setStatus(designerStatus, 'Designer settings saved.');
    });

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            activateSection(button.dataset.sectionTarget);
        });
    });

    quickSectionButtons.forEach(button => {
        button.addEventListener('click', () => {
            activateSection(button.dataset.openSection);
        });
    });

    if (newProductShortcut) {
        newProductShortcut.addEventListener('click', () => {
            resetProductForm();
            activateSection('products');
            productNameInput.focus();
            setStatus(statusMessage, 'Ready to add a new product.');
        });
    }

    try {
        [products, orders, discounts, marketing, settings, appCenter, designer] = await Promise.all([
            window.ShopData.getProducts(),
            window.ShopData.getOrders(),
            window.ShopData.getDiscounts(),
            window.ShopData.getMarketing(),
            window.ShopData.getSettings(),
            window.ShopData.getAppCenter(),
            window.ShopData.getDesigner()
        ]);

        renderProducts(products);
        renderOrders(orders);
        renderDiscounts(discounts);
        loadMarketingForm();
        loadSettingsForm();
        loadAppCenterForm();
        loadDesignerForm();
        resetProductForm();
        bindClickSound();
        activateSection('dashboard');
        setStatus(statusMessage, 'Product admin panel ready.');
        setStatus(discountStatus, 'Create and manage promo codes here.');
        setStatus(marketingStatus, 'Broadcast shop announcements here.');
        setStatus(settingsStatus, 'Update your public shop text here.');
        setStatus(appCenterStatus, 'Toggle storefront features here.');
        setStatus(designerStatus, 'Adjust the public shop look here.');

        window.ShopData.subscribe('products', renderProducts);
        window.ShopData.subscribe('orders', renderOrders);
        window.ShopData.subscribe('discounts', renderDiscounts);
        window.ShopData.subscribe('marketing', nextMarketing => {
            marketing = nextMarketing;
            loadMarketingForm();
        });
        window.ShopData.subscribe('settings', nextSettings => {
            settings = nextSettings;
            loadSettingsForm();
        });
        window.ShopData.subscribe('appCenter', nextAppCenter => {
            appCenter = nextAppCenter;
            loadAppCenterForm();
        });
        window.ShopData.subscribe('designer', nextDesigner => {
            designer = nextDesigner;
            loadDesignerForm();
        });
    } catch (error) {
        console.error('Unable to initialize product admin panel.', error);
        activateSection('products');
        setStatus(statusMessage, `Unable to load product admin data: ${error.message}`);
    }
});
