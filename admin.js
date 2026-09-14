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

    let products = [];

    function setStatus(message) {
        statusMessage.textContent = message;
    }

    function resetForm() {
        productForm.reset();
        productIdInput.value = '';
        formTitle.textContent = 'Add New Product';
        submitLabel.textContent = '📼 Save Product';
        cancelEditButton.classList.add('hidden');
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
                setStatus(`Editing ${product.name}.`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'table-action-btn table-action-btn-danger click-item';
            deleteButton.textContent = '🗑️ Delete';
            deleteButton.addEventListener('click', () => {
                const filteredProducts = products.filter(item => item.id !== product.id);
                window.ProductStore.saveProducts(filteredProducts);
                resetForm();
                setStatus(`${product.name} removed from the lineup.`);
            });
            actionsCell.appendChild(deleteButton);

            row.appendChild(actionsCell);
            productTableBody.appendChild(row);

            const previewCard = document.createElement('div');
            previewCard.className = 'product-card';
            previewCard.appendChild(createProductSummary(product));
            adminPreviewGrid.appendChild(previewCard);
        });
    }

    productForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const product = {
            id: productIdInput.value || undefined,
            name: productNameInput.value,
            emoji: productEmojiInput.value,
            description: productDescriptionInput.value,
            subcategories: productSubcategoriesInput.value
        };

        const normalizedProduct = window.ProductStore.normalizeProducts([product])[0];
        if (!normalizedProduct) {
            setStatus('Add a product name before saving.');
            return;
        }

        const existingIndex = products.findIndex(item => item.id === normalizedProduct.id);
        const nextProducts = [...products];

        if (existingIndex >= 0) {
            nextProducts[existingIndex] = normalizedProduct;
            setStatus(`${normalizedProduct.name} updated.`);
        } else {
            nextProducts.push(normalizedProduct);
            setStatus(`${normalizedProduct.name} added to the shop.`);
        }

        window.ProductStore.saveProducts(nextProducts);
        resetForm();
    });

    cancelEditButton.addEventListener('click', () => {
        resetForm();
        setStatus('Edit cancelled.');
    });

    resetProductsButton.addEventListener('click', async () => {
        await window.ProductStore.resetProducts();
        resetForm();
        setStatus('Default products restored from products.json.');
    });

    const initialProducts = await window.ProductStore.getProducts();
    renderProducts(initialProducts);
    window.ProductStore.subscribe(renderProducts);
    resetForm();
    setStatus('Product admin panel ready.');
});
