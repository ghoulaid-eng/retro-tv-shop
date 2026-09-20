const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'shop.db');
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'retro_tv_shop_session';
const SESSION_TTL_HOURS = Number.parseInt(process.env.SESSION_TTL_HOURS || '168', 10);
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? ['1', 'true', 'yes'].includes(String(process.env.COOKIE_SECURE).toLowerCase())
  : BASE_URL.startsWith('https://');
const ALLOW_TOKEN_PREVIEW = process.env.ALLOW_TOKEN_PREVIEW
  ? ['1', 'true', 'yes'].includes(String(process.env.ALLOW_TOKEN_PREVIEW).toLowerCase())
  : process.env.NODE_ENV !== 'production';
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'owner@sipofghoulaid.local';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'Shop Owner';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'images'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'videos'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS app_state (
  resource_name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  email_verified_at TEXT,
  email_verification_token_hash TEXT,
  password_reset_token_hash TEXT,
  password_reset_expires_at TEXT,
  profile_json TEXT NOT NULL DEFAULT '{}',
  shipping_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wishlists (
  user_id TEXT PRIMARY KEY,
  product_ids_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS carts (
  user_id TEXT PRIMARY KEY,
  items_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value, fallback = '') {
  const normalized = String(value ?? fallback).trim();
  return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', 'on', 'yes', '1'].includes(value.toLowerCase());
  if (typeof value === 'number') return value === 1;
  return fallback;
}

function normalizeAmount(value, fallback = 0) {
  const numericValue = Number.parseFloat(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return fallback;
  return Math.round(numericValue * 100) / 100;
}

function normalizeInteger(value, fallback = 1) {
  const numericValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numericValue) || numericValue < 1) return fallback;
  return numericValue;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeStringMatrix(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeMediaList(value, maxItems) {
  const media = Array.isArray(value) ? value : [];
  return media.map(item => String(item).trim()).filter(Boolean).slice(0, maxItems);
}

function normalizeProduct(product = {}) {
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
  return Array.isArray(products) ? products.map(normalizeProduct).filter(product => product.name) : [];
}

function normalizeOrder(order = {}) {
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
    createdAt: normalizeText(order.createdAt, nowIso()),
    updatedAt: normalizeText(order.updatedAt, nowIso()),
    userId: normalizeText(order.userId),
    totals: typeof order.totals === 'object' && order.totals ? {
      subtotal: normalizeAmount(order.totals.subtotal),
      shipping: normalizeAmount(order.totals.shipping),
      tax: normalizeAmount(order.totals.tax),
      total: normalizeAmount(order.totals.total)
    } : { subtotal: 0, shipping: 0, tax: 0, total: 0 }
  };
}

function normalizeOrders(orders) {
  return Array.isArray(orders)
    ? orders.map(normalizeOrder).filter(order => order.fullName || order.description).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
}

function normalizeDiscount(discount = {}) {
  return {
    id: normalizeText(discount.id, createId('discount')),
    code: normalizeText(discount.code).toUpperCase(),
    description: normalizeText(discount.description),
    details: normalizeText(discount.details)
  };
}

function normalizeDiscounts(discounts) {
  return Array.isArray(discounts) ? discounts.map(normalizeDiscount).filter(discount => discount.code || discount.description) : [];
}

function normalizePaymentMethod(method = {}) {
  return {
    id: normalizeText(method.id, createId('payment-method')),
    name: normalizeText(method.name),
    enabled: normalizeBoolean(method.enabled, true),
    instructions: normalizeText(method.instructions)
  };
}

function normalizePaymentMethods(methods) {
  return Array.isArray(methods) ? methods.map(normalizePaymentMethod).filter(method => method.name) : [];
}

function normalizeMarketing(marketing = {}) {
  return {
    announcementTitle: normalizeText(marketing.announcementTitle, 'Latest Broadcast'),
    announcementMessage: normalizeText(marketing.announcementMessage, 'Fresh spooky drops are always brewing in the Sip of Ghoulaid shop.'),
    featuredTitle: normalizeText(marketing.featuredTitle, 'Featured Fright'),
    featuredMessage: normalizeText(marketing.featuredMessage, 'Use the admin panel to spotlight your newest creepy-cute obsession.')
  };
}

function normalizeSettings(settings = {}) {
  return {
    shopName: normalizeText(settings.shopName, 'Sip of Ghoulaid Shop'),
    homeHeadline: normalizeText(settings.homeHeadline, 'WELCOME CULT LEADERS AND GHOULAID DRINKERS'),
    homeTagline: normalizeText(settings.homeTagline, 'CREEPY • CUTE • HANDMADE • A LITTLE UNHINGED'),
    shopNote: normalizeText(settings.shopNote, 'Visit sipofghoulaid.com for the full collection and latest releases! 👻'),
    salesTaxRate: normalizeAmount(settings.salesTaxRate, 8.25),
    shippingBaseRate: normalizeAmount(settings.shippingBaseRate, 4.99)
  };
}

function normalizeAppCenter(appCenter = {}) {
  return {
    marketingEnabled: normalizeBoolean(appCenter.marketingEnabled, true),
    discountsEnabled: normalizeBoolean(appCenter.discountsEnabled, true),
    customOrdersEnabled: normalizeBoolean(appCenter.customOrdersEnabled, true)
  };
}

function normalizeDesigner(designer = {}) {
  const allowedCardSizes = new Set(['compact', 'cozy', 'showcase']);
  const productCardSize = normalizeText(designer.productCardSize, 'cozy');
  return {
    productCardSize: allowedCardSizes.has(productCardSize) ? productCardSize : 'cozy',
    staticEffect: normalizeBoolean(designer.staticEffect, true)
  };
}

function normalizeWishlistEntry(entry = {}) {
  return {
    userId: normalizeText(entry.userId),
    productIds: [...new Set(normalizeStringArray(entry.productIds))],
    updatedAt: normalizeText(entry.updatedAt, nowIso())
  };
}

function normalizeCartItem(item = {}) {
  return {
    productId: normalizeText(item.productId),
    variant: normalizeText(item.variant),
    quantity: normalizeInteger(item.quantity, 1)
  };
}

function normalizeCart(entry = {}) {
  return {
    userId: normalizeText(entry.userId),
    items: Array.isArray(entry.items) ? entry.items.map(normalizeCartItem).filter(item => item.productId) : [],
    updatedAt: normalizeText(entry.updatedAt, nowIso())
  };
}

function readDefaultProducts() {
  return safeJsonParse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'), []);
}

const DEFAULT_PAYMENT_METHODS = normalizePaymentMethods([
  { id: 'paypal', name: 'PayPal', enabled: true, instructions: 'Send your payment through PayPal once your order total is confirmed.' },
  { id: 'klarna', name: 'Klarna', enabled: true, instructions: 'Ask for a Klarna-ready invoice after we confirm your spooky order details.' },
  { id: 'afterpay', name: 'Afterpay', enabled: true, instructions: 'Afterpay is available after we review and approve your final order total.' },
  { id: 'zip', name: 'Zip', enabled: true, instructions: 'Choose Zip if you want to split your payment after the order is confirmed.' },
  { id: 'apple-pay', name: 'Apple Pay', enabled: true, instructions: 'Apple Pay can be requested when we send your final payment request.' }
]);

const resourceDefaults = {
  products: () => normalizeProducts(readDefaultProducts()),
  orders: () => [],
  paymentMethods: () => DEFAULT_PAYMENT_METHODS,
  discounts: () => [],
  marketing: () => normalizeMarketing({}),
  settings: () => normalizeSettings({}),
  appCenter: () => normalizeAppCenter({}),
  designer: () => normalizeDesigner({})
};

const resourceNormalizers = {
  products: normalizeProducts,
  orders: normalizeOrders,
  paymentMethods: normalizePaymentMethods,
  discounts: normalizeDiscounts,
  marketing: normalizeMarketing,
  settings: normalizeSettings,
  appCenter: normalizeAppCenter,
  designer: normalizeDesigner
};

function normalizeResource(name, value) {
  switch (name) {
    case 'products': return normalizeProducts(value);
    case 'orders': return normalizeOrders(value);
    case 'paymentMethods': return normalizePaymentMethods(value);
    case 'discounts': return normalizeDiscounts(value);
    case 'marketing': return normalizeMarketing(value);
    case 'settings': return normalizeSettings(value);
    case 'appCenter': return normalizeAppCenter(value);
    case 'designer': return normalizeDesigner(value);
    default: throw new Error(`Unknown resource: ${name}`);
  }
}

function getDefaultResource(name) {
  switch (name) {
    case 'products': return resourceDefaults.products();
    case 'orders': return resourceDefaults.orders();
    case 'paymentMethods': return resourceDefaults.paymentMethods();
    case 'discounts': return resourceDefaults.discounts();
    case 'marketing': return resourceDefaults.marketing();
    case 'settings': return resourceDefaults.settings();
    case 'appCenter': return resourceDefaults.appCenter();
    case 'designer': return resourceDefaults.designer();
    default: throw new Error(`Unknown resource: ${name}`);
  }
}

function readResource(name) {
  const row = db.prepare('SELECT value FROM app_state WHERE resource_name = ?').get(name);
  if (!row) {
    const defaultValue = getDefaultResource(name);
    writeResource(name, defaultValue);
    return defaultValue;
  }
  return normalizeResource(name, safeJsonParse(row.value, getDefaultResource(name)));
}

function writeResource(name, value) {
  const normalizedValue = normalizeResource(name, value);
  db.prepare(`
    INSERT INTO app_state (resource_name, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(resource_name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(name, JSON.stringify(normalizedValue), nowIso());
  return normalizedValue;
}

function resetResource(name) {
  return writeResource(name, getDefaultResource(name));
}

function ensureResourceSeeds() {
  Object.keys(resourceDefaults).forEach(name => readResource(name));
}

function sanitizeUserRow(row) {
  if (!row) return null;
  const profile = safeJsonParse(row.profile_json, {});
  const shipping = safeJsonParse(row.shipping_json, {});
  return {
    id: row.id,
    name: normalizeText(profile.name),
    username: normalizeText(row.username),
    email: normalizeText(row.email),
    contactMethod: normalizeText(profile.contactMethod),
    contactInfo: normalizeText(profile.contactInfo),
    shippingFullName: normalizeText(shipping.shippingFullName || profile.name),
    shippingAddressLine1: normalizeText(shipping.shippingAddressLine1),
    shippingAddressLine2: normalizeText(shipping.shippingAddressLine2),
    shippingCity: normalizeText(shipping.shippingCity),
    shippingState: normalizeText(shipping.shippingState),
    shippingPostalCode: normalizeText(shipping.shippingPostalCode),
    shippingCountry: normalizeText(shipping.shippingCountry),
    role: row.role,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email);
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function createVerificationTokenForUser(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('UPDATE users SET email_verification_token_hash = ?, updated_at = ? WHERE id = ?').run(sha256(token), nowIso(), userId);
  return token;
}

function createPasswordResetTokenForUser(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  db.prepare('UPDATE users SET password_reset_token_hash = ?, password_reset_expires_at = ?, updated_at = ? WHERE id = ?').run(sha256(token), expiresAt, nowIso(), userId);
  return token;
}

function upsertWishlist(userId, productIds) {
  const entry = normalizeWishlistEntry({ userId, productIds, updatedAt: nowIso() });
  db.prepare(`
    INSERT INTO wishlists (user_id, product_ids_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET product_ids_json = excluded.product_ids_json, updated_at = excluded.updated_at
  `).run(entry.userId, JSON.stringify(entry.productIds), entry.updatedAt);
  return entry;
}

function upsertCart(userId, items) {
  const entry = normalizeCart({ userId, items, updatedAt: nowIso() });
  db.prepare(`
    INSERT INTO carts (user_id, items_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET items_json = excluded.items_json, updated_at = excluded.updated_at
  `).run(entry.userId, JSON.stringify(entry.items), entry.updatedAt);
  return entry;
}

function getWishlist(userId) {
  const row = db.prepare('SELECT * FROM wishlists WHERE user_id = ?').get(userId);
  return normalizeWishlistEntry({ userId, productIds: row ? safeJsonParse(row.product_ids_json, []) : [], updatedAt: row ? row.updated_at : nowIso() });
}

function getCart(userId) {
  const row = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  return normalizeCart({ userId, items: row ? safeJsonParse(row.items_json, []) : [], updatedAt: row ? row.updated_at : nowIso() });
}

function createSession(userId, res) {
  const sessionToken = createId('session');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(sha256(sessionToken), userId, expiresAt, createdAt);
  const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_HOURS * 60 * 60}${COOKIE_SECURE ? '; Secure' : ''}`;
  res.append('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  res.append('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}`);
}

function refreshSession(sessionToken, userId, res) {
  const nextExpiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ? AND user_id = ?').run(nextExpiresAt, sha256(sessionToken), userId);
  const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_HOURS * 60 * 60}${COOKIE_SECURE ? '; Secure' : ''}`;
  res.append('Set-Cookie', cookie);
}

function fileHeaderMatches(buffer, signature) {
  return signature.every((byte, index) => buffer[index] === byte);
}

function detectUploadedFileKind(filePath) {
  const handle = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    fs.readSync(handle, header, 0, header.length, 0);
    if (fileHeaderMatches(header, [0x89, 0x50, 0x4E, 0x47])) return 'image';
    if (fileHeaderMatches(header, [0xFF, 0xD8, 0xFF])) return 'image';
    if (fileHeaderMatches(header, [0x47, 0x49, 0x46, 0x38])) return 'image';
    if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return 'image';
    if (header.toString('ascii', 4, 8) === 'ftyp') return 'video';
    if (header.toString('ascii', 0, 4) === '\x1A\x45\xDF\xA3') return 'video';
    if (header.toString('ascii', 0, 4) === 'OggS') return 'video';
    return 'unknown';
  } finally {
    fs.closeSync(handle);
  }
}

function resolveTextUpdate(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value).trim();
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(rest.join('='));
    return cookies;
  }, {});
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(req.user ? 403 : 401).json({ error: 'Admin access required.' });
  }
  next();
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const readLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const publicReadableResources = new Set(['products', 'paymentMethods', 'discounts', 'marketing', 'settings', 'appCenter', 'designer']);
const publicStaticFiles = new Set(['index.html', 'admin.html', 'styles.css', 'products.js', 'script.js', 'admin.js', 'products.json']);

function ensureAdminUser() {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) return;
  const id = createId('user');
  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 12);
  const createdAt = nowIso();
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, role, email_verified_at, profile_json, shipping_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?)
  `).run(
    id,
    DEFAULT_ADMIN_EMAIL,
    'shop-owner',
    passwordHash,
    createdAt,
    JSON.stringify({ name: DEFAULT_ADMIN_NAME, contactMethod: 'email', contactInfo: DEFAULT_ADMIN_EMAIL }),
    JSON.stringify({ shippingFullName: DEFAULT_ADMIN_NAME }),
    createdAt,
    createdAt
  );
  upsertWishlist(id, []);
  upsertCart(id, []);
  console.warn(`Seeded admin user for ${DEFAULT_ADMIN_EMAIL}. Set ADMIN_PASSWORD explicitly before deployment.`);
}

ensureResourceSeeds();
ensureAdminUser();

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(readLimiter);
app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) {
    req.user = null;
    return next();
  }
  const sessionHash = sha256(sessionToken);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionHash);
  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionHash);
    clearSessionCookie(res);
    req.user = null;
    return next();
  }
  const userRow = getUserById(session.user_id);
  req.user = sanitizeUserRow(userRow);
  req.sessionToken = sessionToken;
  if (req.user) {
    refreshSession(sessionToken, req.user.id, res);
  }
  next();
});

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const kind = req.query.kind === 'video' ? 'videos' : 'images';
      cb(null, path.join(UPLOADS_DIR, kind));
    },
    filename(req, file, cb) {
      const extension = path.extname(file.originalname) || (req.query.kind === 'video' ? '.mp4' : '.png');
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
    }
  }),
  limits: {
    files: 10,
    fileSize: 25 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const kind = req.query.kind === 'video' ? 'video' : 'image';
    if (!file.mimetype.startsWith(`${kind}/`)) {
      return cb(new Error(`Only ${kind} uploads are allowed.`));
    }
    cb(null, true);
  }
});

function getPublicBootstrap() {
  return {
    products: readResource('products'),
    paymentMethods: readResource('paymentMethods'),
    discounts: readResource('discounts'),
    marketing: readResource('marketing'),
    settings: readResource('settings'),
    appCenter: readResource('appCenter'),
    designer: readResource('designer')
  };
}

function getAdminBootstrap() {
  return {
    ...getPublicBootstrap(),
    orders: readResource('orders'),
    paymentEvents: db.prepare('SELECT * FROM payment_events ORDER BY created_at DESC').all().map(event => ({
      ...event,
      metadata: safeJsonParse(event.metadata_json, {})
    }))
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: nowIso() });
});

app.get('/api/bootstrap/public', (_req, res) => {
  res.json(getPublicBootstrap());
});

app.get('/api/bootstrap/account', (req, res) => {
  if (!req.user) {
    return res.json({ user: null, wishlist: { productIds: [] }, cart: { items: [] } });
  }
  res.json({ user: req.user, wishlist: getWishlist(req.user.id), cart: getCart(req.user.id) });
});

app.get('/api/bootstrap/admin', requireAdmin, (_req, res) => {
  res.json(getAdminBootstrap());
});

app.get('/api/resources/:name', (req, res) => {
  const { name } = req.params;
  if (!resourceNormalizers[name]) {
    return res.status(404).json({ error: 'Unknown resource.' });
  }
  if (!publicReadableResources.has(name) && (!req.user || req.user.role !== 'admin')) {
    return res.status(req.user ? 403 : 401).json({ error: 'Admin access required.' });
  }
  res.json({ value: readResource(name) });
});

app.put('/api/resources/:name', writeLimiter, requireAdmin, (req, res) => {
  const { name } = req.params;
  if (!resourceNormalizers[name]) {
    return res.status(404).json({ error: 'Unknown resource.' });
  }
  const value = writeResource(name, req.body?.value);
  res.json({ value });
});

app.post('/api/resources/:name/reset', writeLimiter, requireAdmin, (req, res) => {
  const { name } = req.params;
  if (!resourceNormalizers[name]) {
    return res.status(404).json({ error: 'Unknown resource.' });
  }
  const value = resetResource(name);
  res.json({ value });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const name = normalizeText(req.body?.name);
  const username = normalizeText(req.body?.username).toLowerCase();
  const email = normalizeText(req.body?.email).toLowerCase();
  const password = String(req.body?.password || '');
  const contactMethod = normalizeText(req.body?.contactMethod);
  const contactInfo = normalizeText(req.body?.contactInfo);

  if (!name || !username || !email || password.length < 8) {
    return res.status(400).json({ error: 'Name, username, email, and an 8+ character password are required.' });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'That email is already registered.' });
  }
  if (getUserByUsername(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const id = createId('user');
  const createdAt = nowIso();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, role, profile_json, shipping_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'customer', ?, ?, ?, ?)
  `).run(
    id,
    email,
    username,
    passwordHash,
    JSON.stringify({ name, contactMethod, contactInfo }),
    JSON.stringify({ shippingFullName: name }),
    createdAt,
    createdAt
  );
  upsertWishlist(id, []);
  upsertCart(id, []);
  const verificationToken = createVerificationTokenForUser(id);
  createSession(id, res);
  const user = sanitizeUserRow(getUserById(id));
  res.status(201).json(ALLOW_TOKEN_PREVIEW
    ? {
        user,
        verificationPreviewUrl: `${BASE_URL}/api/auth/verify-email?token=${verificationToken}`
      }
    : { user });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = normalizeText(req.body?.email).toLowerCase();
  const password = String(req.body?.password || '');
  const userRow = getUserByEmail(email);
  if (!userRow) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const valid = await bcrypt.compare(password, userRow.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  createSession(userRow.id, res);
  res.json({ user: sanitizeUserRow(userRow) });
});

app.post('/api/auth/logout', writeLimiter, requireAuth, (req, res) => {
  if (req.sessionToken) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(req.sessionToken));
  }
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null });
});

app.post('/api/auth/request-password-reset', authLimiter, (req, res) => {
  const email = normalizeText(req.body?.email).toLowerCase();
  const userRow = getUserByEmail(email);
  if (!userRow) {
    return res.json({ message: 'If that email exists, a reset link has been generated.' });
  }
  const token = createPasswordResetTokenForUser(userRow.id);
  res.json(ALLOW_TOKEN_PREVIEW
    ? {
        message: 'If that email exists, a reset link has been generated.',
        resetPreviewUrl: `${BASE_URL}/index.html?resetToken=${token}`
      }
    : { message: 'If that email exists, a reset link has been generated.' });
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const token = normalizeText(req.body?.token);
  const password = String(req.body?.password || '');
  if (!token || password.length < 8) {
    return res.status(400).json({ error: 'Reset token and an 8+ character password are required.' });
  }
  const row = db.prepare('SELECT * FROM users WHERE password_reset_token_hash = ?').get(sha256(token));
  if (!row || !row.password_reset_expires_at || new Date(row.password_reset_expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, password_reset_token_hash = NULL, password_reset_expires_at = NULL, updated_at = ? WHERE id = ?').run(passwordHash, nowIso(), row.id);
  res.json({ message: 'Password updated.' });
});

app.post('/api/auth/resend-verification', authLimiter, requireAuth, (req, res) => {
  if (req.user.emailVerified) {
    return res.json({ message: 'Email already verified.' });
  }
  const token = createVerificationTokenForUser(req.user.id);
  res.json(ALLOW_TOKEN_PREVIEW
    ? { verificationPreviewUrl: `${BASE_URL}/api/auth/verify-email?token=${token}` }
    : { message: 'Verification email resent.' });
});

app.get('/api/auth/verify-email', (req, res) => {
  const token = normalizeText(req.query.token);
  const row = db.prepare('SELECT * FROM users WHERE email_verification_token_hash = ?').get(sha256(token));
  if (!row) {
    return res.status(400).send('Verification token is invalid.');
  }
  db.prepare('UPDATE users SET email_verified_at = ?, email_verification_token_hash = NULL, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), row.id);
  res.redirect('/index.html?verified=1');
});

app.post('/api/account/profile', writeLimiter, requireAuth, (req, res) => {
  const name = normalizeText(req.body?.name);
  const username = normalizeText(req.body?.username).toLowerCase();
  const email = normalizeText(req.body?.email).toLowerCase();
  const contactMethod = normalizeText(req.body?.contactMethod);
  const contactInfo = normalizeText(req.body?.contactInfo);
  if (!name || !username || !email) {
    return res.status(400).json({ error: 'Name, username, and email are required.' });
  }
  const emailOwner = getUserByEmail(email);
  if (emailOwner && emailOwner.id !== req.user.id) {
    return res.status(409).json({ error: 'That email is already registered.' });
  }
  const usernameOwner = getUserByUsername(username);
  if (usernameOwner && usernameOwner.id !== req.user.id) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }
  db.prepare('UPDATE users SET email = ?, username = ?, profile_json = ?, updated_at = ? WHERE id = ?').run(
    email,
    username,
    JSON.stringify({ name, contactMethod, contactInfo }),
    nowIso(),
    req.user.id
  );
  res.json({ user: sanitizeUserRow(getUserById(req.user.id)) });
});

app.post('/api/account/shipping', writeLimiter, requireAuth, (req, res) => {
  const shipping = {
    shippingFullName: normalizeText(req.body?.shippingFullName),
    shippingAddressLine1: normalizeText(req.body?.shippingAddressLine1),
    shippingAddressLine2: normalizeText(req.body?.shippingAddressLine2),
    shippingCity: normalizeText(req.body?.shippingCity),
    shippingState: normalizeText(req.body?.shippingState),
    shippingPostalCode: normalizeText(req.body?.shippingPostalCode),
    shippingCountry: normalizeText(req.body?.shippingCountry)
  };
  db.prepare('UPDATE users SET shipping_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(shipping), nowIso(), req.user.id);
  res.json({ user: sanitizeUserRow(getUserById(req.user.id)) });
});

app.put('/api/account/wishlist', writeLimiter, requireAuth, (req, res) => {
  const wishlist = upsertWishlist(req.user.id, req.body?.productIds || []);
  res.json({ wishlist });
});

app.put('/api/account/cart', writeLimiter, requireAuth, (req, res) => {
  const cart = upsertCart(req.user.id, req.body?.items || []);
  res.json({ cart });
});

app.post('/api/orders/custom', writeLimiter, (req, res) => {
  const normalizedOrder = normalizeOrder({
    ...req.body,
    id: createId('order'),
    userId: req.user?.id || '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    paymentStatus: 'Awaiting Payment',
    status: 'Pending'
  });
  const orders = readResource('orders');
  orders.unshift(normalizedOrder);
  writeResource('orders', orders);
  res.status(201).json({ order: normalizedOrder });
});

app.post('/api/admin/uploads', writeLimiter, requireAdmin, upload.array('files', 10), (req, res) => {
  const kind = req.query.kind === 'video' ? 'video' : 'image';
  const maxItems = kind === 'video' ? 3 : 10;
  const requestFiles = Array.isArray(req.files) ? req.files : [];
  if (requestFiles.length > maxItems) {
    requestFiles.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch {}
    });
    return res.status(400).json({ error: `You can upload up to ${maxItems} ${kind === 'video' ? 'videos' : 'images'} per request.` });
  }
  const invalidFile = requestFiles.find(file => detectUploadedFileKind(file.path) !== kind);
  if (invalidFile) {
    requestFiles.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch {}
    });
    return res.status(400).json({ error: `Only valid ${kind} files are allowed.` });
  }
  const uploadedFiles = requestFiles.slice(0, maxItems).map(file => `/uploads/${kind === 'video' ? 'videos' : 'images'}/${file.filename}`);
  res.status(201).json({ files: uploadedFiles });
});

app.post('/api/admin/payments/:orderId', writeLimiter, requireAdmin, (req, res) => {
  const orders = readResource('orders');
  const orderIndex = orders.findIndex(order => order.id === req.params.orderId);
  if (orderIndex < 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const provider = normalizeText(resolveTextUpdate(req.body?.paymentMethod, orders[orderIndex].paymentMethod));
  const status = normalizeText(resolveTextUpdate(req.body?.paymentStatus, orders[orderIndex].paymentStatus), 'Awaiting Payment');
  const amount = normalizeAmount(req.body?.paymentAmount ?? orders[orderIndex].paymentAmount);
  const reference = resolveTextUpdate(req.body?.paymentReference, orders[orderIndex].paymentReference);
  const notes = resolveTextUpdate(req.body?.paymentNotes, orders[orderIndex].paymentNotes);
  const wasPaid = orders[orderIndex].paymentStatus === 'Paid';
  const isPaid = status === 'Paid';
  orders[orderIndex] = normalizeOrder({
    ...orders[orderIndex],
    paymentMethod: provider,
    paymentStatus: status,
    paymentAmount: amount,
    paymentReference: reference,
    paymentNotes: notes,
    paymentReceivedAt: isPaid ? (wasPaid && orders[orderIndex].paymentReceivedAt ? orders[orderIndex].paymentReceivedAt : nowIso()) : '',
    updatedAt: nowIso()
  });
  writeResource('orders', orders);
  db.prepare(`
    INSERT INTO payment_events (id, order_id, provider, status, amount, reference, notes, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    createId('payment'),
    req.params.orderId,
    provider,
    status,
    amount,
    reference,
    notes,
    JSON.stringify({ source: 'admin-dashboard' }),
    nowIso(),
    nowIso()
  );
  res.json({ orders });
});

app.use('/uploads', express.static(UPLOADS_DIR, {
  index: false,
  fallthrough: false,
  maxAge: '7d'
}));
app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});
app.get('/:fileName', (req, res, next) => {
  const { fileName } = req.params;
  if (!publicStaticFiles.has(fileName)) {
    return next();
  }
  res.sendFile(path.join(ROOT, fileName));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Internal server error.' : (error.message || 'Request failed.') });
});

app.listen(PORT, () => {
  console.log(`Retro TV Shop server listening on ${BASE_URL}`);
});
