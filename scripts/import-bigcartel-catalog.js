const fs = require('node:fs/promises');
const path = require('node:path');

const STORE_ORIGIN = 'https://www.sipofghoulaid.com';
const SITEMAP_URL = `${STORE_ORIGIN}/sitemap.xml`;
const OUTPUT_PATH = path.resolve(__dirname, '..', 'products.json');
const ASSET_ROOT = path.resolve(__dirname, '..', 'assets', 'products');

function extractProductUrls(sitemap) {
    return [...sitemap.matchAll(/<loc>(https:\/\/www\.sipofghoulaid\.com\/product\/[^<]+)<\/loc>/gi)]
        .map(match => match[1]);
}

function extractJsonObject(source, marker) {
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) {
        throw new Error(`Could not find ${marker}`);
    }

    const start = source.indexOf('{', markerIndex + marker.length);
    if (start < 0) {
        throw new Error(`Could not find JSON object after ${marker}`);
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
        const character = source[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }

        if (character === '"') {
            inString = true;
        } else if (character === '{') {
            depth += 1;
        } else if (character === '}') {
            depth -= 1;
            if (depth === 0) {
                return JSON.parse(source.slice(start, index + 1));
            }
        }
    }

    throw new Error(`Unterminated JSON object after ${marker}`);
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function sanitizeDescription(html) {
    return String(html || '')
        .replace(/<div class="bc-product-video-embed">[\s\S]*?<\/div>/gi, '')
        .replace(/\s(?:class|style)="[^"]*"/gi, '')
        .replace(/<(?!\/?(?:p|br|strong|b|em|i|s|strike|ul|ol|li|h2|h3|h4)\b)[^>]+>/gi, '')
        .trim();
}

function getExtension(imageUrl) {
    const extension = path.extname(new URL(imageUrl).pathname).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension) ? extension : '.jpg';
}

async function downloadImage(imageUrl, destination) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Image request failed (${response.status}): ${imageUrl}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 15 * 1024 * 1024) {
        throw new Error(`Image exceeds 15 MB: ${imageUrl}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 15 * 1024 * 1024) {
        throw new Error(`Image exceeds 15 MB: ${imageUrl}`);
    }

    await fs.writeFile(destination, buffer);
}

async function importProduct(productUrl, position, total) {
    const response = await fetch(productUrl);
    if (!response.ok) {
        throw new Error(`Product request failed (${response.status}): ${productUrl}`);
    }

    const html = await response.text();
    const product = extractJsonObject(html, '"product":');
    const handle = String(product.permalink || new URL(productUrl).pathname.split('/').pop()).toLowerCase();
    const productDirectory = path.join(ASSET_ROOT, handle);
    await fs.mkdir(productDirectory, { recursive: true });

    const images = [];
    for (const [index, image] of (product.images || []).slice(0, 25).entries()) {
        const extension = getExtension(image.url);
        const filename = `${String(index + 1).padStart(2, '0')}${extension}`;
        const destination = path.join(productDirectory, filename);
        const sourceUrl = new URL(image.url);
        sourceUrl.searchParams.set('auto', 'format');
        sourceUrl.searchParams.set('fit', 'max');
        sourceUrl.searchParams.set('h', '1200');
        sourceUrl.searchParams.set('w', '1200');
        await downloadImage(sourceUrl.toString(), destination);
        images.push(`assets/products/${handle}/${filename}`);
    }

    const optionGroupName = product.option_groups?.map(group => group.name).filter(Boolean).join(' / ') || 'Options';
    const variantDetails = (product.options || []).map(option => ({
        id: String(option.id),
        name: option.name,
        price: Number(option.price || product.default_price || product.price || 0),
        stock: null
    }));
    const prices = variantDetails.map(variant => variant.price).filter(price => price > 0);
    const listingPrice = prices.length ? Math.min(...prices) : Number(product.default_price || product.price || 0);
    const available = product.status === 'active' && (product.options || []).some(option => !option.sold_out);

    console.log(`[${position}/${total}] ${product.name.trim()} — ${images.length} image(s)`);

    return {
        id: `bigcartel-${product.id}`,
        name: product.name.trim(),
        handle,
        emoji: '👻',
        description: stripHtml(product.description),
        descriptionHtml: sanitizeDescription(product.description),
        categories: (product.categories || []).map(category => category.name.trim()).filter(Boolean),
        subcategories: (product.categories || []).map(category => category.name.trim()).filter(Boolean),
        listingPrice,
        onSale: Boolean(product.on_sale),
        salePrice: product.on_sale ? Number(product.price || 0) : 0,
        shippingPrice: 0,
        shippingWeight: 0,
        shippingWeightUnit: 'oz',
        packageSize: '',
        mustShipAlone: false,
        trackInventory: false,
        stock: null,
        variantGroupName: optionGroupName,
        variantDetails,
        variants: variantDetails.map(variant => variant.name),
        images,
        videos: [],
        available,
        priceSource: 'sipofghoulaid.com',
        sourceUrl: productUrl
    };
}

async function main() {
    const sitemapResponse = await fetch(SITEMAP_URL);
    if (!sitemapResponse.ok) {
        throw new Error(`Sitemap request failed (${sitemapResponse.status})`);
    }

    const productUrls = extractProductUrls(await sitemapResponse.text());
    if (!productUrls.length) {
        throw new Error('No product URLs were found in the sitemap.');
    }

    await fs.rm(ASSET_ROOT, { recursive: true, force: true });
    await fs.mkdir(ASSET_ROOT, { recursive: true });

    const products = [];
    for (const [index, productUrl] of productUrls.entries()) {
        products.push(await importProduct(productUrl, index + 1, productUrls.length));
    }

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
    console.log(`Imported ${products.length} products into ${OUTPUT_PATH}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
