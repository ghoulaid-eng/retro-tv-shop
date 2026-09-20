'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

function skuFor(productId, variant, index) {
    const normalized = `${productId}-${variant}`
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 56);
    return `${normalized || 'PRODUCT'}-${index + 1}`;
}

async function main() {
    const source = await fs.readFile(path.join(__dirname, '..', 'products.json'), 'utf8');
    const products = JSON.parse(source);
    const defaultInventory = Math.max(0, Number.parseInt(process.env.SEED_INVENTORY_DEFAULT || '25', 10));

    for (const product of products) {
        const price = new Prisma.Decimal(String(product.listingPrice));
        const salePrice = product.onSale && product.salePrice
            ? new Prisma.Decimal(String(product.salePrice))
            : null;

        await prisma.product.upsert({
            where: { id: product.id },
            update: {
                name: product.name,
                emoji: product.emoji || null,
                description: product.description || '',
                subcategories: product.subcategories || [],
                price,
                salePrice,
                active: true
            },
            create: {
                id: product.id,
                name: product.name,
                emoji: product.emoji || null,
                description: product.description || '',
                subcategories: product.subcategories || [],
                price,
                salePrice
            }
        });

        const variants = product.variants?.length ? product.variants : ['Standard'];
        await prisma.productVariant.updateMany({
            where: {
                productId: product.id,
                name: { notIn: variants }
            },
            data: { active: false }
        });
        for (const [index, name] of variants.entries()) {
            const variant = await prisma.productVariant.upsert({
                where: { productId_name: { productId: product.id, name } },
                update: { active: true },
                create: {
                    productId: product.id,
                    name,
                    sku: skuFor(product.id, name, index)
                }
            });
            await prisma.inventory.upsert({
                where: { variantId: variant.id },
                update: {},
                create: { variantId: variant.id, quantity: defaultInventory }
            });
        }

        const media = [
            ...(product.images || []).map(url => ({ type: 'image', url })),
            ...(product.videos || []).map(url => ({ type: 'video', url }))
        ];
        await prisma.productMedia.deleteMany({ where: { productId: product.id } });
        if (media.length) {
            await prisma.productMedia.createMany({
                data: media.map((item, position) => ({
                    productId: product.id,
                    type: item.type,
                    url: item.url,
                    alt: `${product.name} preview ${position + 1}`,
                    position
                }))
            });
        }
    }

    console.log(`Seeded ${products.length} products with inventory.`);
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
