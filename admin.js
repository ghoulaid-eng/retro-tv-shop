function formatMoney(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function getEffectivePrice(product) {
    return product.onSale && product.salePrice > 0 ? product.salePrice : product.listingPrice;
}

function createProductPricing(product) {
    const wrapper = document.createElement('div');
    wrapper.className = 'price-stack';

    if (product.listingPrice > 0) {
        if (product.onSale && product.salePrice > 0) {
            const listingPrice = document.createElement('span');
            listingPrice.className = 'price price-original';
            listingPrice.textContent = formatMoney(product.listingPrice);
            wrapper.appendChild(listingPrice);

            const salePrice = document.createElement('span');
            salePrice.className = 'price price-sale';
            salePrice.textContent = formatMoney(product.salePrice);
            wrapper.appendChild(salePrice);
        } else {
            const price = document.createElement('span');
            price.className = 'price';
            price.textContent = formatMoney(product.listingPrice);
            wrapper.appendChild(price);
        }
    }

    return wrapper;
}

function createProductSummary(product, onEdit) {
    const productSummary = document.createElement('div');
    productSummary.className = 'admin-product-summary';

    const emoji = document.createElement('span');
    emoji.className = 'admin-product-emoji';
    emoji.textContent = product.emoji || '🛍️';
    productSummary.appendChild(emoji);

    const details = document.createElement('div');
    const title = document.createElement(onEdit ? 'button' : 'strong');
    title.textContent = product.name;
    if (onEdit) {
        title.type = 'button';
        title.className = 'admin-product-edit-link click-item';
        title.setAttribute('aria-label', `Edit ${product.name}`);
        title.addEventListener('click', onEdit);
    }
    details.appendChild(title);

    if (product.description) {
        const description = document.createElement('p');
        description.textContent = product.description;
        details.appendChild(description);
    }

    const pricing = createProductPricing(product);
    if (pricing.childElementCount) {
        details.appendChild(pricing);
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
    const productListingPriceInput = document.getElementById('productListingPrice');
    const productShippingPriceInput = document.getElementById('productShippingPrice');
    const productOnSaleInput = document.getElementById('productOnSale');
    const productSalePriceInput = document.getElementById('productSalePrice');
    const productVariantsInput = document.getElementById('productVariants');
    const productImagesInput = document.getElementById('productImages');
    const productVideosInput = document.getElementById('productVideos');
    const productImagesPreview = document.getElementById('productImagesPreview');
    const productVideosPreview = document.getElementById('productVideosPreview');
    const clearProductImagesButton = document.getElementById('clearProductImages');
    const clearProductVideosButton = document.getElementById('clearProductVideos');
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
    const paidOrderCountStat = document.getElementById('paidOrderCountStat');
    const paymentReceivedStat = document.getElementById('paymentReceivedStat');
    const adminSectionSelect = document.getElementById('adminSectionSelect');
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
    const settingsSalesTaxRate = document.getElementById('settingsSalesTaxRate');
    const settingsShippingBaseRate = document.getElementById('settingsShippingBaseRate');
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
    const paymentMethodsForm = document.getElementById('paymentMethodsForm');
    const paymentMethodsAdminList = document.getElementById('paymentMethodsAdminList');
    const paymentMethodsStatus = document.getElementById('paymentMethodsStatus');
    const paymentSummaryCards = document.getElementById('paymentSummaryCards');
    const paymentManagerStatus = document.getElementById('paymentManagerStatus');
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    const emptyPaymentsState = document.getElementById('emptyPaymentsState');
    const resetPaymentMethodsButton = document.getElementById('resetPaymentMethods');

    let products = [];
    let orders = [];
    let paymentMethods = [];
    let discounts = [];
    let marketing = {};
    let settings = {};
    let appCenter = {};
    let designer = {};
    let productImagesDraft = [];
    let productVideosDraft = [];

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

    function getPaymentMethodName(methodId) {
        return paymentMethods.find(method => method.id === methodId)?.name || 'Not selected';
    }

    function activateSection(sectionName) {
        if (adminSectionSelect) {
            adminSectionSelect.value = sectionName;
        }

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
        productListingPriceInput.value = '';
        productShippingPriceInput.value = '';
        productSalePriceInput.value = '';
        productVariantsInput.value = '';
        productOnSaleInput.checked = false;
        productImagesDraft = [];
        productVideosDraft = [];
        renderMediaPreview(productImagesPreview, productImagesDraft, 'image');
        renderMediaPreview(productVideosPreview, productVideosDraft, 'video');
        formTitle.textContent = 'Add New Product';
        submitLabel.textContent = '📼 Save Product';
        cancelEditButton.classList.add('hidden');
        syncSalePriceField();
    }

    function renderDashboardStats() {
        productCountStat.textContent = String(products.length);
        subcategoryCountStat.textContent = String(products.reduce((count, product) => count + product.subcategories.length, 0));
        orderCountStat.textContent = String(orders.length);
        paidOrderCountStat.textContent = String(orders.filter(order => order.paymentStatus === 'Paid').length);
        paymentReceivedStat.textContent = formatMoney(orders.reduce((total, order) => total + Number(order.paymentStatus === 'Paid' ? order.paymentAmount : 0), 0));
    }

    function syncSalePriceField() {
        productSalePriceInput.disabled = !productOnSaleInput.checked;
        if (!productOnSaleInput.checked) {
            productSalePriceInput.value = '';
        }
    }

    function renderMediaPreview(target, items, kind) {
        target.replaceChildren();

        if (!items.length) {
            const empty = document.createElement('p');
            empty.className = 'admin-helper-text';
            empty.textContent = kind === 'image' ? 'No images uploaded yet.' : 'No videos uploaded yet.';
            target.appendChild(empty);
            return;
        }

        items.forEach((src, index) => {
            const card = document.createElement('div');
            card.className = 'admin-media-preview-card';

            const media = document.createElement(kind === 'image' ? 'img' : 'video');
            media.src = src;
            media.className = 'admin-media-preview-item';
            if (kind === 'video') {
                media.controls = true;
                media.muted = true;
                media.preload = 'metadata';
            } else {
                media.alt = `Product ${kind} ${index + 1}`;
            }

            const label = document.createElement('p');
            label.className = 'admin-helper-text';
            label.textContent = `${kind === 'image' ? 'Image' : 'Video'} ${index + 1}`;

            card.appendChild(media);
            card.appendChild(label);
            target.appendChild(card);
        });
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error || new Error(`Unable to read ${file.name}`));
            reader.readAsDataURL(file);
        });
    }

    async function appendMediaFiles(input, kind, maxItems) {
        const files = Array.from(input.files || []);
        if (!files.length) {
            return;
        }

        const currentItems = kind === 'image' ? productImagesDraft : productVideosDraft;
        const nextCount = currentItems.length + files.length;
        if (nextCount > maxItems) {
            setStatus(statusMessage, `You can upload up to ${maxItems} ${kind === 'image' ? 'images' : 'videos'} per product.`);
            input.value = '';
            return;
        }

        const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
        if (kind === 'image') {
            productImagesDraft = [...productImagesDraft, ...dataUrls].slice(0, maxItems);
            renderMediaPreview(productImagesPreview, productImagesDraft, 'image');
        } else {
            productVideosDraft = [...productVideosDraft, ...dataUrls].slice(0, maxItems);
            renderMediaPreview(productVideosPreview, productVideosDraft, 'video');
        }

        input.value = '';
    }

    async function saveProductsWithLatest(applyChange) {
        const latestProducts = await window.ShopData.getProducts();
        const nextProducts = applyChange(latestProducts);
        window.ShopData.saveProducts(nextProducts);
    }

    async function saveOrdersWithLatest(applyChange) {
        const latestOrders = await window.ShopData.getOrders();
        const nextOrders = applyChange(latestOrders);
        window.ShopData.saveOrders(nextOrders);
    }

    async function savePaymentMethodsWithLatest(applyChange) {
        const latestPaymentMethods = await window.ShopData.getPaymentMethods();
        const nextPaymentMethods = applyChange(latestPaymentMethods);
        window.ShopData.savePaymentMethods(nextPaymentMethods);
    }

    function editProduct(product) {
        productIdInput.value = product.id;
        productNameInput.value = product.name;
        productEmojiInput.value = product.emoji;
        productDescriptionInput.value = product.description;
        productListingPriceInput.value = product.listingPrice || '';
        productShippingPriceInput.value = product.shippingPrice || '';
        productOnSaleInput.checked = Boolean(product.onSale);
        productSalePriceInput.value = product.salePrice || '';
        productSubcategoriesInput.value = product.subcategories.join('\n');
        productVariantsInput.value = product.variants.join('\n');
        productImagesDraft = [...product.images];
        productVideosDraft = [...product.videos];
        renderMediaPreview(productImagesPreview, productImagesDraft, 'image');
        renderMediaPreview(productVideosPreview, productVideosDraft, 'video');
        syncSalePriceField();
        formTitle.textContent = `Edit ${product.name}`;
        submitLabel.textContent = '💾 Update Product';
        cancelEditButton.classList.remove('hidden');
        activateSection('products');
        setStatus(statusMessage, `Editing ${product.name}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderProducts(nextProducts) {
        products = nextProducts;
        productTableBody.replaceChildren();
        adminPreviewGrid.replaceChildren();
        emptyProductsState.classList.toggle('hidden', products.length > 0);

        products.forEach(product => {
            const row = document.createElement('tr');

            const productCell = document.createElement('td');
            productCell.appendChild(createProductSummary(product, () => editProduct(product)));
            row.appendChild(productCell);

            const pricingCell = document.createElement('td');
            const effectivePrice = getEffectivePrice(product);
            pricingCell.appendChild(createProductPricing(product));
            const shippingText = document.createElement('p');
            shippingText.textContent = `Shipping: ${formatMoney(product.shippingPrice)}`;
            pricingCell.appendChild(shippingText);
            if (product.variants.length) {
                const variantText = document.createElement('p');
                variantText.textContent = `${product.variants.length} variant option(s)`;
                pricingCell.appendChild(variantText);
            }
            if (!effectivePrice && !product.shippingPrice) {
                pricingCell.textContent = '—';
            }
            row.appendChild(pricingCell);

            const subcategoryCell = document.createElement('td');
            subcategoryCell.textContent = product.subcategories.join(', ') || '—';
            row.appendChild(subcategoryCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'admin-actions';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'table-action-btn click-item';
            editButton.textContent = '✏️ Edit';
            editButton.addEventListener('click', () => editProduct(product));
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
            previewCard.appendChild(createProductSummary(product, () => editProduct(product)));
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
            statusSelect.addEventListener('change', async () => {
                await saveOrdersWithLatest(currentOrders => currentOrders.map(item => item.id === order.id ? { ...item, status: statusSelect.value } : item));
            });
            statusCell.appendChild(statusSelect);
            row.appendChild(statusCell);

            const paymentCell = document.createElement('td');
            const paymentMethod = document.createElement('strong');
            paymentMethod.textContent = getPaymentMethodName(order.paymentMethod);
            paymentCell.appendChild(paymentMethod);
            paymentCell.appendChild(document.createElement('br'));
            const paymentSummary = document.createElement('span');
            paymentSummary.textContent = `${order.paymentStatus || 'Awaiting Payment'} • ${formatMoney(order.paymentAmount)}`;
            paymentCell.appendChild(paymentSummary);
            if (order.paymentReference) {
                paymentCell.appendChild(document.createElement('br'));
                const paymentReference = document.createElement('span');
                paymentReference.textContent = `Ref: ${order.paymentReference}`;
                paymentCell.appendChild(paymentReference);
            }
            row.appendChild(paymentCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'admin-actions';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'table-action-btn table-action-btn-danger click-item';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', async () => {
                await saveOrdersWithLatest(currentOrders => currentOrders.filter(item => item.id !== order.id));
            });
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            ordersTableBody.appendChild(row);
        });

        renderDashboardStats();
        bindClickSound(ordersTableBody);
    }

    function renderPaymentMethods(nextPaymentMethods) {
        paymentMethods = nextPaymentMethods;
        paymentMethodsAdminList.replaceChildren();

        paymentMethods.forEach(method => {
            const card = document.createElement('div');
            card.className = 'admin-payment-method-card';

            const toggle = document.createElement('label');
            toggle.className = 'admin-toggle-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = `payment-method-enabled-${method.id}`;
            checkbox.checked = Boolean(method.enabled);
            const labelText = document.createElement('span');
            labelText.textContent = `Accept ${method.name}`;
            toggle.appendChild(checkbox);
            toggle.appendChild(labelText);
            card.appendChild(toggle);

            const instructionsGroup = document.createElement('div');
            instructionsGroup.className = 'form-group';
            const instructionsLabel = document.createElement('label');
            instructionsLabel.setAttribute('for', `payment-method-instructions-${method.id}`);
            instructionsLabel.textContent = `${method.name} instructions`;
            const instructionsInput = document.createElement('textarea');
            instructionsInput.id = `payment-method-instructions-${method.id}`;
            instructionsInput.name = `payment-method-instructions-${method.id}`;
            instructionsInput.rows = 3;
            instructionsInput.value = method.instructions || '';
            instructionsGroup.appendChild(instructionsLabel);
            instructionsGroup.appendChild(instructionsInput);
            card.appendChild(instructionsGroup);

            paymentMethodsAdminList.appendChild(card);
        });

        bindClickSound(paymentMethodsAdminList);
        renderOrders(orders);
        renderPayments();
    }

    function renderPaymentSummary() {
        paymentSummaryCards.replaceChildren();
        const paidOrders = orders.filter(order => order.paymentStatus === 'Paid');
        const awaitingOrders = orders.filter(order => order.paymentStatus === 'Awaiting Payment');
        const partialOrders = orders.filter(order => order.paymentStatus === 'Partial Payment');
        const totalReceived = paidOrders.reduce((total, order) => total + Number(order.paymentAmount || 0), 0);

        [
            ['Paid orders', String(paidOrders.length)],
            ['Awaiting payment', String(awaitingOrders.length)],
            ['Partial payment', String(partialOrders.length)],
            ['Received total', formatMoney(totalReceived)]
        ].forEach(([label, value]) => {
            const card = document.createElement('div');
            card.className = 'admin-stat-card';

            const heading = document.createElement('span');
            heading.className = 'admin-stat-label';
            heading.textContent = label;
            card.appendChild(heading);

            const amount = document.createElement('strong');
            amount.className = 'admin-stat-value admin-stat-text';
            amount.textContent = value;
            card.appendChild(amount);

            paymentSummaryCards.appendChild(card);
        });
    }

    function renderPayments() {
        paymentsTableBody.replaceChildren();
        emptyPaymentsState.classList.toggle('hidden', orders.length > 0);

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

            const methodCell = document.createElement('td');
            const methodSelect = document.createElement('select');
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Not selected';
            methodSelect.appendChild(placeholderOption);
            paymentMethods.forEach(method => {
                const option = document.createElement('option');
                option.value = method.id;
                option.textContent = method.name;
                option.selected = method.id === order.paymentMethod;
                methodSelect.appendChild(option);
            });
            methodCell.appendChild(methodSelect);
            row.appendChild(methodCell);

            const paymentStatusCell = document.createElement('td');
            const paymentStatusSelect = document.createElement('select');
            ['Awaiting Payment', 'Partial Payment', 'Paid', 'Refunded'].forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                option.selected = optionValue === order.paymentStatus;
                paymentStatusSelect.appendChild(option);
            });
            paymentStatusCell.appendChild(paymentStatusSelect);
            row.appendChild(paymentStatusCell);

            const amountCell = document.createElement('td');
            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.min = '0';
            amountInput.step = '0.01';
            amountInput.value = String(order.paymentAmount || 0);
            amountCell.appendChild(amountInput);
            row.appendChild(amountCell);

            const referenceCell = document.createElement('td');
            const referenceInput = document.createElement('input');
            referenceInput.type = 'text';
            referenceInput.value = order.paymentReference || '';
            referenceInput.placeholder = 'Invoice / txn id';
            referenceCell.appendChild(referenceInput);
            row.appendChild(referenceCell);

            const receivedCell = document.createElement('td');
            receivedCell.textContent = order.paymentReceivedAt
                ? new Date(order.paymentReceivedAt).toLocaleDateString()
                : '—';
            row.appendChild(receivedCell);

            const actionsCell = document.createElement('td');
            actionsCell.className = 'admin-actions';

            const saveButton = document.createElement('button');
            saveButton.type = 'button';
            saveButton.className = 'table-action-btn click-item';
            saveButton.textContent = 'Save';
            const savePaymentUpdate = async () => {
                const nextStatus = paymentStatusSelect.value;
                const nextAmount = Number.parseFloat(amountInput.value) || 0;
                const nextReference = referenceInput.value.trim();
                await saveOrdersWithLatest(currentOrders => currentOrders.map(item => {
                    if (item.id !== order.id) {
                        return item;
                    }

                    const wasPaid = item.paymentStatus === 'Paid';
                    const isPaid = nextStatus === 'Paid';

                    return {
                        ...item,
                        paymentMethod: methodSelect.value,
                        paymentStatus: nextStatus,
                        paymentAmount: nextAmount,
                        paymentReference: nextReference,
                        paymentReceivedAt: isPaid
                            ? (wasPaid && item.paymentReceivedAt ? item.paymentReceivedAt : new Date().toISOString())
                            : ''
                    };
                }));
                setStatus(paymentManagerStatus, `Saved payment update for ${order.fullName || 'this order'}.`);
            };
            saveButton.addEventListener('click', savePaymentUpdate);
            actionsCell.appendChild(saveButton);

            const markPaidButton = document.createElement('button');
            markPaidButton.type = 'button';
            markPaidButton.className = 'table-action-btn click-item';
            markPaidButton.textContent = 'Mark Paid';
            markPaidButton.addEventListener('click', async () => {
                paymentStatusSelect.value = 'Paid';
                await savePaymentUpdate();
            });
            actionsCell.appendChild(markPaidButton);

            row.appendChild(actionsCell);
            paymentsTableBody.appendChild(row);
        });

        renderPaymentSummary();
        bindClickSound(paymentsTableBody);
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
        settingsSalesTaxRate.value = settings.salesTaxRate ?? 8.25;
        settingsShippingBaseRate.value = settings.shippingBaseRate ?? 4.99;
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

    paymentMethodsForm.addEventListener('submit', async event => {
        event.preventDefault();
        await savePaymentMethodsWithLatest(currentPaymentMethods => currentPaymentMethods.map(method => {
            const enabledInput = paymentMethodsForm.elements.namedItem(`payment-method-enabled-${method.id}`);
            const instructionsInput = paymentMethodsForm.elements.namedItem(`payment-method-instructions-${method.id}`);

            return {
                ...method,
                enabled: Boolean(enabledInput?.checked),
                instructions: instructionsInput?.value?.trim() || ''
            };
        }));
        setStatus(paymentMethodsStatus, 'Payment methods saved.');
    });

    resetPaymentMethodsButton.addEventListener('click', async () => {
        await window.ShopData.resetPaymentMethods();
        setStatus(paymentMethodsStatus, 'Default payment methods restored.');
    });

    productOnSaleInput.addEventListener('change', syncSalePriceField);

    productImagesInput.addEventListener('change', async () => {
        try {
            await appendMediaFiles(productImagesInput, 'image', 10);
        } catch (error) {
            console.error('Unable to load image files.', error);
            setStatus(statusMessage, `Unable to load images: ${error.message}`);
        }
    });

    productVideosInput.addEventListener('change', async () => {
        try {
            await appendMediaFiles(productVideosInput, 'video', 3);
        } catch (error) {
            console.error('Unable to load video files.', error);
            setStatus(statusMessage, `Unable to load videos: ${error.message}`);
        }
    });

    clearProductImagesButton.addEventListener('click', () => {
        productImagesDraft = [];
        productImagesInput.value = '';
        renderMediaPreview(productImagesPreview, productImagesDraft, 'image');
        setStatus(statusMessage, 'Product images cleared.');
    });

    clearProductVideosButton.addEventListener('click', () => {
        productVideosDraft = [];
        productVideosInput.value = '';
        renderMediaPreview(productVideosPreview, productVideosDraft, 'video');
        setStatus(statusMessage, 'Product videos cleared.');
    });

    productForm.addEventListener('submit', async event => {
        event.preventDefault();

        const normalizedProduct = window.ShopData.normalizeProducts([{
            id: productIdInput.value || undefined,
            name: productNameInput.value,
            emoji: productEmojiInput.value,
            description: productDescriptionInput.value,
            listingPrice: productListingPriceInput.value,
            shippingPrice: productShippingPriceInput.value,
            onSale: productOnSaleInput.checked,
            salePrice: productSalePriceInput.value,
            subcategories: productSubcategoriesInput.value,
            variants: productVariantsInput.value,
            images: productImagesDraft,
            videos: productVideosDraft
        }])[0];

        if (!normalizedProduct) {
            setStatus(statusMessage, 'Add a product name before saving.');
            return;
        }

        if (normalizedProduct.listingPrice <= 0) {
            setStatus(statusMessage, 'Add a listing price greater than zero.');
            return;
        }

        if (normalizedProduct.onSale && normalizedProduct.salePrice <= 0) {
            setStatus(statusMessage, 'Add a sale price greater than zero when the on-sale box is checked.');
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
            shopNote: settingsShopNote.value,
            salesTaxRate: settingsSalesTaxRate.value,
            shippingBaseRate: settingsShippingBaseRate.value
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

    if (adminSectionSelect) {
        adminSectionSelect.addEventListener('change', () => {
            activateSection(adminSectionSelect.value);
            playClickSound();
        });
    }

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
        [products, orders, paymentMethods, discounts, marketing, settings, appCenter, designer] = await Promise.all([
            window.ShopData.getProducts(),
            window.ShopData.getOrders(),
            window.ShopData.getPaymentMethods(),
            window.ShopData.getDiscounts(),
            window.ShopData.getMarketing(),
            window.ShopData.getSettings(),
            window.ShopData.getAppCenter(),
            window.ShopData.getDesigner()
        ]);

        renderProducts(products);
        renderOrders(orders);
        renderPaymentMethods(paymentMethods);
        renderPayments();
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
        setStatus(paymentMethodsStatus, 'Manage PayPal, Klarna, Afterpay, Zip, and Apple Pay here.');
        setStatus(paymentManagerStatus, 'Monitor payments received for each custom order here.');

        window.ShopData.subscribe('products', renderProducts);
        window.ShopData.subscribe('orders', renderOrders);
        window.ShopData.subscribe('orders', renderPayments);
        window.ShopData.subscribe('paymentMethods', renderPaymentMethods);
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
