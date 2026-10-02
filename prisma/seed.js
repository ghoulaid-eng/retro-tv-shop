const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const products = [
  ['121119213', 'Melting Alien Holder', 'A creepy-cute 3D-printed alien holder for wax melts, brushes, pens, or plants.', 3000],
  ['121113183', 'Custom Wax Melt Order', 'A made-from-scratch custom wax melt design with your idea and a spooky little laboratory touch.', 10000],
  ['121111551', 'Custom Mini Melt Order', 'Tiny custom wax melts with the same big spooky process, made from your idea.', 4500],
  ['121111353', 'UV Alien Head Wax Melts', 'Handmade alien-head melts that glow under UV light and bring a little invasion to your warmer.', 2000],
  ['121109868', 'UV Reactive UFO Melts', 'A set of tiny saucer melts made for neon color, jelly wax, and blacklight weirdness.', 1800],
  ['121059912', 'Flame On Bookmark', 'A fiery little bookmark for readers who like their current chapter extra hot.', 1000],
  ['121008330', 'Gallows Coaster and Tea Bag Holder', 'A 3D-printed gallows tea bag holder that keeps your mug ritual delightfully grim.', 3000],
  ['121008153', 'Custom Headset Holder', 'A custom headset holder summoned from your reference picture and favorite strange details.', 10000],
  ['121007163', 'Jason Headset Holder', 'A horror-themed headset holder that brings a slasher-movie vibe to your desk.', 5500],
  ['121002057', 'Frankenstein Headset Holder', 'A detailed Frankenstein-inspired headset holder for a monster-worthy setup.', 5500],
  ['119666553', 'UFO Record Topper', 'An extraterrestrial record topper to give your vinyl player a cosmic upgrade.', 1500],
  ['119665884', 'Smut Bookmark Bundle', 'A cheeky two-bookmark bundle for the readers with the hottest shelves.', 1000],
  ['119394915', 'Godzilla Headset Holder', 'A detailed monster headset holder for a monster-worthy setup.', 5500],
  ['119292498', 'Zombie Holder', 'A creepy-cute 3D-printed zombie holder for your wax melts and desk treasures.', 3000],
  ['118842948', 'Summon a Boo Wax Melts', 'Soy wax ghosts and planchettes with UV-reactive details for your warmer.', 2000],
  ['118842819', '"But Daddy I Love Him!" Ghostface Soy Wax Melt', 'A Ghostface-inspired soy wax melt for fans of scary movies and spooky scent throws.', 1500]
];

async function main() {
  for (const [id, name, description, priceCents] of products) {
    await prisma.product.upsert({
      where: { id },
      update: {},
      create: { id, name, description, priceCents, inventoryQuantity: 1 }
    });
    await prisma.productVariant.upsert({
      where: { id: `${id}-default` },
      update: {},
      create: {
        id: `${id}-default`,
        productId: id,
        name: 'Default',
        optionValues: {},
        priceCents,
        inventoryQuantity: 1
      }
    });
  }

  await prisma.productOption.upsert({
    where: { productId_name: { productId: '121113183', name: 'Scent family' } },
    update: { values: ['Sweet', 'Fresh', 'Spooky'] },
    create: { productId: '121113183', name: 'Scent family', values: ['Sweet', 'Fresh', 'Spooky'] }
  });
  for (const [suffix, label, priceCents, inventoryQuantity] of [
    ['sweet', 'Sweet scent', 10000, 2],
    ['fresh', 'Fresh scent', 10000, 2],
    ['spooky', 'Spooky scent', 10500, 1]
  ]) {
    await prisma.productVariant.upsert({
      where: { id: `121113183-${suffix}` },
      update: {},
      create: {
        id: `121113183-${suffix}`,
        productId: '121113183',
        name: label,
        optionValues: { 'Scent family': label.replace(' scent', '') },
        priceCents,
        inventoryQuantity
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
