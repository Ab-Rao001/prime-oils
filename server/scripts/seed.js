/**
 * Seeds MongoDB with mock data and uploads product images to Cloudinary.
 * Run: npm run seed   (from server/)
 */
import '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { configureCloudinary, imageUrl } from '../config/cloudinary.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Complaint from '../models/Complaint.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';
import ChartData from '../models/ChartData.js';
import User from '../models/User.js';
import Warehouse from '../models/Warehouse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRODUCT_IMAGE_MAP = {
  '1-Ltr-Bott.png': 'Canolive Oil 1 Ltr',
  '16-Ltr.png': 'Canolive Oil 16 Ltr',
  '3-Ltr-Bott-1024x1024.png': 'Canolive Oil 3 Ltr',
  '4.5-Ltr-Bott.png': 'Canolive Oil 4.5 Ltr',
  '5x1-Nozzle-Pack.png': 'Canolive Oil 5×1 Nozzle',
  '5x1-Pouch-Carton.png': 'Canolive Oil 5×1 Pouch',
};

const PRODUCTS = [
  { legacyId: 4, name: 'Canolive Oil 1 Ltr', cat: 'Cooking Oil', size: '1 Ltr', description: 'Sunflower cooking oil — 1 litre bottle', stock: 320, unit: 'Bottle', price: 650, min: 150 },
  { legacyId: 5, name: 'Canolive Oil 3 Ltr', cat: 'Cooking Oil', size: '3 Ltr', description: 'Premium cooking oil — 3 litre bottle', stock: 45, unit: 'Bottle', price: 1885, min: 50 },
  { legacyId: 1, name: 'Canolive Oil 4.5 Ltr', cat: 'Cooking Oil', size: '4.5 Ltr', description: 'Sufi cooking oil — 4.5 litre bottle', stock: 450, unit: 'Bottle', price: 2790, min: 100 },
  { legacyId: 3, name: 'Canolive Oil 5×1 Pouch', cat: 'Cooking Oil', size: '5×1 Pouch', description: 'Canola oil — 5×1 litre pouch carton', stock: 95, unit: 'Carton', price: 3150, min: 100 },
  { legacyId: 2, name: 'Canolive Oil 5×1 Nozzle', cat: 'Banaspati', size: '5×1 Nozzle', description: 'Dalda banaspati — 5×1 pack with nozzle', stock: 280, unit: 'Pack', price: 3350, min: 80 },
  { legacyId: 6, name: 'Canolive Oil 16 Ltr', cat: 'Palm Oil', size: '16 Ltr', description: 'Palm oil — 16 litre tin', stock: 180, unit: 'Tin', price: 6280, min: 60 },
];

const ORDERS = [
  { orderId: 'ORD-001', shop: 'Ali Traders', man: 'Kamran', items: 3, total: 28500, status: 'delivered', date: '2025-03-10', pay: 'installment' },
  { orderId: 'ORD-002', shop: 'Hassan Store', man: 'Usman', items: 2, total: 15200, status: 'processing', date: '2025-03-12', pay: 'full' },
  { orderId: 'ORD-003', shop: 'Al-Barkat Store', man: 'Kamran', items: 5, total: 52000, status: 'pending', date: '2025-03-14', pay: 'installment' },
  { orderId: 'ORD-004', shop: 'City Mart', man: 'Zubair', items: 1, total: 9800, status: 'delivered', date: '2025-03-08', pay: 'full' },
  { orderId: 'ORD-005', shop: 'Pak Kiryana', man: 'Usman', items: 4, total: 38400, status: 'cancelled', date: '2025-03-05', pay: 'full' },
  { orderId: 'ORD-006', shop: 'Al-Barkat Store', man: 'Zubair', items: 2, total: 21600, status: 'processing', date: '2025-03-15', pay: 'installment' },
];

const PAYMENTS = [
  { paymentId: 'PAY-001', shop: 'Ali Traders', total: 28500, paid: 19000, type: 'installment', due: '2025-04-10', status: 'partial' },
  { paymentId: 'PAY-002', shop: 'Hassan Store', total: 15200, paid: 15200, type: 'full', due: null, status: 'paid' },
  { paymentId: 'PAY-003', shop: 'Al-Barkat Store', total: 52000, paid: 17333, type: 'installment', due: '2025-03-20', status: 'overdue' },
  { paymentId: 'PAY-004', shop: 'City Mart', total: 9800, paid: 9800, type: 'full', due: null, status: 'paid' },
  { paymentId: 'PAY-005', shop: 'Al-Barkat Store', total: 21600, paid: 0, type: 'installment', due: '2025-04-01', status: 'pending' },
];

const COMPLAINTS = [
  { complaintId: 'CMP-001', shop: 'Ali Traders', product: 'Canola Oil 5L', issue: 'Leaking bottles received', type: 'damaged', status: 'resolved', date: '2025-03-08' },
  { complaintId: 'CMP-002', shop: 'Hassan Store', product: 'Dalda Banaspati', issue: 'Wrong quantity delivered', type: 'order', status: 'pending', date: '2025-03-11' },
  { complaintId: 'CMP-003', shop: 'Al-Barkat Store', product: 'Sunflower Oil 1L', issue: 'Exchange request – expired batch', type: 'exchange', status: 'processing', date: '2025-03-13' },
  { complaintId: 'CMP-004', shop: 'City Mart', product: 'Sufi Cooking Oil', issue: 'Seal broken on arrival', type: 'damaged', status: 'pending', date: '2025-03-15' },
];

const CAMPAIGNS = [
  { legacyId: 1, name: 'Ramadan Special', budget: 50000, spent: 38000, start: '2025-03-01', end: '2025-04-15', status: 'active', roi: '18%' },
  { legacyId: 2, name: 'Olive Oil Launch', budget: 30000, spent: 30000, start: '2025-02-01', end: '2025-02-28', status: 'completed', roi: '12%' },
  { legacyId: 3, name: 'Summer Drive', budget: 25000, spent: 0, start: '2025-05-01', end: '2025-05-31', status: 'planned', roi: '—' },
];

const SHOPKEEPERS = [
  { legacyId: 1, name: 'Ali Traders', owner: 'Muhammad Ali', loc: 'Lahore', phone: '0300-1234567', status: 'active', credit: 45000, total: 280000 },
  { legacyId: 2, name: 'Hassan Store', owner: 'Hassan Raza', loc: 'Faisalabad', phone: '0301-2345678', status: 'active', credit: 12000, total: 150000 },
  { legacyId: 3, name: 'Pak Kiryana', owner: 'Imran Khan', loc: 'Multan', phone: '0302-3456789', status: 'inactive', credit: 0, total: 95000 },
  { legacyId: 4, name: 'Al-Barkat Store', owner: 'Bilal Ahmed', loc: 'Rawalpindi', phone: '0303-4567890', status: 'active', credit: 78000, total: 420000 },
  { legacyId: 5, name: 'City Mart', owner: 'Farhan Malik', loc: 'Karachi', phone: '0304-5678901', status: 'active', credit: 23000, total: 190000 },
];

const WAREHOUSES = [
  { name: 'Main Warehouse', location: 'Faisalabad', type: 'MAIN', status: 'active' },
  { name: 'Sahiwal Regional Warehouse', location: 'Sahiwal', type: 'REGIONAL', status: 'active' },
  { name: 'Lahore Regional Warehouse', location: 'Lahore', type: 'REGIONAL', status: 'active' },
];

const NOTIFICATIONS = [
  { legacyId: 1, type: 'payment', msg: 'Al-Barkat Store installment overdue – PKR 17,333', date: 'Mar 15', read: false },
  { legacyId: 2, type: 'order', msg: 'New order ORD-006 placed by Al-Barkat Store', date: 'Mar 15', read: false },
  { legacyId: 3, type: 'stock', msg: 'Canola Oil 5L below minimum (95 / 100 units)', date: 'Mar 14', read: false },
  { legacyId: 4, type: 'complaint', msg: 'New complaint from City Mart – broken seal', date: 'Mar 15', read: true },
  { legacyId: 5, type: 'payment', msg: 'Full payment received from Hassan Store – PKR 15,200', date: 'Mar 12', read: true },
  { legacyId: 6, type: 'delivery', msg: 'Order ORD-001 delivered to Ali Traders', date: 'Mar 10', read: true },
];

const CHARTS = [
  { key: 'sales', data: [
    { m: 'Oct', sales: 285, target: 300 },
    { m: 'Nov', sales: 320, target: 300 },
    { m: 'Dec', sales: 410, target: 350 },
    { m: 'Jan', sales: 380, target: 350 },
    { m: 'Feb', sales: 295, target: 320 },
    { m: 'Mar', sales: 445, target: 400 },
  ]},
  { key: 'category', data: [
    { name: 'Cooking Oil', v: 45 },
    { name: 'Banaspati', v: 22 },
    { name: 'Palm Oil', v: 18 },
    { name: 'Specialty', v: 15 },
  ]},
  { key: 'cash', data: [
    { d: 'Mar 9', i: 45000, o: 28000 },
    { d: 'Mar 10', i: 28500, o: 15000 },
    { d: 'Mar 11', i: 62000, o: 40000 },
    { d: 'Mar 12', i: 15200, o: 22000 },
    { d: 'Mar 13', i: 38000, o: 18000 },
    { d: 'Mar 14', i: 52000, o: 35000 },
    { d: 'Mar 15', i: 21600, o: 12000 },
  ]},
];

function defaultZipPath() {
  return process.env.PRODUCT_IMAGES_ZIP
    || 'C:\\Users\\abrao\\OneDrive\\Desktop\\University\\Adv Web\\Final Project\\ProductImages.zip';
}

async function uploadProductImages(cloudinary) {
  const zipPath = defaultZipPath();
  if (!fs.existsSync(zipPath)) {
    console.warn('ProductImages.zip not found at:', zipPath);
    return {};
  }

  const extractDir = path.join(__dirname, '../.tmp-product-images');
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);

  const uploadsByProductName = {};

  for (const [fileName, productName] of Object.entries(PRODUCT_IMAGE_MAP)) {
    const candidates = [
      path.join(extractDir, 'ProductImages', fileName),
      path.join(extractDir, fileName),
    ];
    const filePath = candidates.find(p => fs.existsSync(p));
    if (!filePath) {
      console.warn('Missing image file:', fileName);
      continue;
    }

    const publicId = `prime-oil/products/${path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9-_]/g, '-')}`;

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'prime-oil/products',
        public_id: path.basename(publicId),
        overwrite: true,
        resource_type: 'image',
      });
      uploadsByProductName[productName] = {
        imageFile: fileName,
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
      };
      console.log('Uploaded:', fileName, '->', productName);
    } catch (err) {
      console.error('Cloudinary upload failed for', fileName, err.message);
    }
  }

  fs.rmSync(extractDir, { recursive: true, force: true });
  return uploadsByProductName;
}

const USERS = [
  { name: 'Admin User', email: 'admin@primeoil.com', password: 'password123', role: 'admin', status: 'active' },
  { name: 'Kamran', email: 'kamran@primeoil.com', password: 'password123', role: 'salesman', status: 'active' },
  { name: 'Usman', email: 'usman@primeoil.com', password: 'password123', role: 'salesman', status: 'active' },
  { name: 'Zubair', email: 'zubair@primeoil.com', password: 'password123', role: 'salesman', status: 'active' },
  { name: 'Supplier One', email: 'supplier@primeoil.com', password: 'password123', role: 'supplier', status: 'active' },
];

async function clearCollections() {
  await Promise.all([
    Product.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Shopkeeper.deleteMany({}),
    Complaint.deleteMany({}),
    Campaign.deleteMany({}),
    Notification.deleteMany({}),
    ChartData.deleteMany({}),
    User.deleteMany({}),
    Warehouse.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  const cloudinary = configureCloudinary();

  console.log('Clearing existing data...');
  await clearCollections();

  console.log('Seeding default users...');
  const seededUsers = await User.create(USERS);
  const userMap = {};
  seededUsers.forEach(u => {
    userMap[u.name] = u._id;
  });

  console.log('Seeding shopkeepers...');
  const seededShopkeepers = await Shopkeeper.insertMany(SHOPKEEPERS);
  const shopkeeperMap = {};
  seededShopkeepers.forEach(s => {
    shopkeeperMap[s.name] = s._id;
  });

  console.log('Seeding warehouses...');
  await Warehouse.insertMany(WAREHOUSES);

  console.log('Uploading product images to Cloudinary...');
  const imageMap = await uploadProductImages(cloudinary);

  const supplierId = seededUsers.find(u => u.role === 'supplier')?._id;
  const productsWithImages = PRODUCTS.map(p => ({
    ...p,
    ...(imageMap[p.name] || {}),
    sku: `PROD-${String(p.legacyId).padStart(3, '0')}`,
    supplier: supplierId,
  }));

  console.log('Seeding products...');
  const seededProducts = await Product.insertMany(productsWithImages);
  const productMap = {};
  seededProducts.forEach(p => {
    productMap[p.name] = p._id;
  });

  console.log('Seeding orders...');
  const ordersToInsert = ORDERS.map(o => ({
    ...o,
    shop: shopkeeperMap[o.shop] || null,
    man: userMap[o.man] || null,
  }));
  const seededOrders = await Order.insertMany(ordersToInsert);
  const orderMap = {};
  seededOrders.forEach(o => {
    orderMap[o.orderId] = o._id;
  });

  console.log('Seeding payments...');
  const paymentsToInsert = PAYMENTS.map(p => {
    const matchingOrder = ORDERS.find(o => o.shop === p.shop);
    const orderId = matchingOrder ? orderMap[matchingOrder.orderId] : null;
    return {
      ...p,
      shop: shopkeeperMap[p.shop] || null,
      order: orderId,
    };
  });
  await Payment.insertMany(paymentsToInsert);

  console.log('Seeding complaints...');
  const complaintsToInsert = COMPLAINTS.map(c => ({
    ...c,
    shop: shopkeeperMap[c.shop] || null,
    productRef: productMap[c.product] || null,
  }));
  await Complaint.insertMany(complaintsToInsert);

  console.log('Seeding notifications...');
  const notificationsToInsert = NOTIFICATIONS.map(n => {
    const adminId = seededUsers.find(u => u.role === 'admin')?._id;
    return {
      ...n,
      recipient: adminId,
    };
  });
  await Notification.insertMany(notificationsToInsert);

  console.log('Seeding campaigns...');
  await Campaign.insertMany(CAMPAIGNS);

  console.log('Seeding chart data...');
  await ChartData.insertMany(CHARTS);

  console.log('\nSeed complete.');
  console.log('Products with images:', Object.keys(imageMap).length, '/', PRODUCTS.length);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
