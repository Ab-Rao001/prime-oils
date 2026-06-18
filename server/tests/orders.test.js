import request from 'supertest';
import app from '../index.js';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Product from '../models/Product.js';
import { getAuthToken, createTestUser } from './helpers.js';

describe('Orders Endpoints', () => {
  let adminUser, shopkeeperUserA, salesmanUser, supplierUser;
  let adminToken, shopkeeperTokenA, salesmanToken, supplierToken;
  let shopA, shopB;
  let product;

  beforeEach(async () => {
    adminUser = await createTestUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
    shopkeeperUserA = await createTestUser({ name: 'Shopkeeper A', email: 'skA@example.com', role: 'shopkeeper' });
    salesmanUser = await createTestUser({ name: 'Salesman', email: 'salesman@example.com', role: 'salesman' });
    supplierUser = await createTestUser({ name: 'Supplier', email: 'supplier@example.com', role: 'supplier' });

    adminToken = getAuthToken(adminUser);
    shopkeeperTokenA = getAuthToken(shopkeeperUserA);
    salesmanToken = getAuthToken(salesmanUser);
    supplierToken = getAuthToken(supplierUser);

    shopA = await Shopkeeper.create({
      name: 'Ali Traders',
      owner: 'Shopkeeper A',
      phone: '03001234567',
      loc: 'Lahore',
      credit: 1000,
      total: 5000
    });

    shopB = await Shopkeeper.create({
      name: 'Madina Oils',
      owner: 'Shopkeeper B',
      phone: '03007654321',
      loc: 'Karachi',
      credit: 500,
      total: 3000
    });

    product = await Product.create({

      sku: 'PROD-001',
      name: 'Super Engine Oil 4L',
      cat: 'Engine Oil',
      size: '4L',
      description: 'Premium grade oil',
      stock: 50,
      unit: 'can',
      price: 4500,
      isActive: true
    });
  });

  describe('POST /api/orders', () => {
    it('should successfully place an order and decrement stock (with admin/salesman/shopkeeper role)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shopkeeperId: shopA._id.toString(),
          shop: 'Ali Traders',
          items: [{ productId: product._id.toString(), quantity: 10 }],
          total: 45000,
          status: 'pending',
          pay: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.total).toBe(45000);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(40);
    });

    it('should fail to place an order if stock is insufficient (returning 400)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shopkeeperId: shopA._id.toString(),
          shop: 'Ali Traders',
          items: [{ productId: product._id.toString(), quantity: 100 }], // Exceeds stock (50)
          total: 450000,
          status: 'pending',
          pay: 'cash'
        });

      expect(res.status).toBe(400); // Expect validation error (400)
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Insufficient stock/i);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(50);
    });

    it('should fail to place an order if fields are missing (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${shopkeeperTokenA}`)
        .send({
          shopkeeperId: shopA._id.toString(),
          shop: 'Ali Traders',
          items: [],
          total: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject requests with forbidden roles (e.g. supplier)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          shopkeeperId: shopA._id.toString(),
          shop: 'Ali Traders',
          items: [{ productId: product._id.toString(), quantity: 1 }],
          total: 4500
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|access denied/i);
    });

    it('should return 401 if authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          shopkeeperId: shopA._id.toString(),
          items: [{ productId: product._id.toString(), quantity: 10 }],
          total: 45000
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer invalidtoken')
        .send({
          shopkeeperId: shopA._id.toString(),
          items: [{ productId: product._id.toString(), quantity: 10 }],
          total: 45000
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should resolve shop name and salesman name strings to ObjectIds', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Ali Traders',
          man: 'Salesman',
          items: [{ productId: product._id.toString(), quantity: 5 }],
          total: 22500,
          status: 'pending',
          pay: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 if shop name does not exist', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Nonexistent Shop',
          items: [{ productId: product._id.toString(), quantity: 5 }],
          total: 22500,
          status: 'pending',
          pay: 'cash'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Shopkeeper not found/i);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      await Order.create({
        orderId: 'ORD-001',
        shop: shopA._id,
        man: salesmanUser._id,
        items: 5,
        total: 22500,
        status: 'pending',
        date: '2026-05-25',
        pay: 'cash'
      });

      await Order.create({
        orderId: 'ORD-002',
        shop: shopB._id,
        man: salesmanUser._id,
        items: 2,
        total: 9000,
        status: 'confirmed',
        date: '2026-05-25',
        pay: 'installment'
      });
    });

    it('should allow admin to see all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const orders = res.body.data || res.body;
      expect(orders.length).toBe(2);
    });

    it('should restrict shopkeeper A to see only their own orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${shopkeeperTokenA}`);

      expect(res.status).toBe(200);
      const orders = res.body.data || res.body;
      expect(orders.length).toBe(1);
      expect(orders[0].shop).toBe('Ali Traders');
    });

    it('should support pagination on order lookup', async () => {
      const res = await request(app)
        .get('/api/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        orderId: 'ORD-100',
        shop: shopA._id,
        man: salesmanUser._id,
        items: 1,
        total: 4500,
        status: 'pending',
        date: '2026-05-25',
        pay: 'cash'
      });
    });

    it('should allow admin/salesman to change status for a valid transition', async () => {
      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');

      const updated = await Order.findById(testOrder._id);
      expect(updated.status).toBe('confirmed');
    });

    it('should reject invalid status transitions (e.g. pending -> delivered directly)', async () => {
      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid status transition/i);
    });

    it('should reject changes to already cancelled or delivered orders', async () => {
      await Order.findByIdAndUpdate(testOrder._id, { status: 'cancelled' });

      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Cannot change status of a cancelled order/i);
    });

    it('should deny access to shopkeepers (forbidden role)', async () => {
      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${shopkeeperTokenA}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|access denied/i);
    });

    it('should return 400 if status is missing in PUT /status', async () => {
      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Status is required/i);
    });

    it('should return 200 and unchanged order if status is the same in PUT /status', async () => {
      const res = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
    });

    it('should return 404 if order does not exist in PUT /status', async () => {
      const nonexistentOrderId = '60d5ec4b868e822d64f0b2f9';
      const res = await request(app)
        .put(`/api/orders/${nonexistentOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Order not found/i);
    });
  });

  describe('PATCH /api/orders/:orderId', () => {
    let patchOrder;

    beforeEach(async () => {
      patchOrder = await Order.create({
        orderId: 'ORD-200',
        shop: shopA._id,
        man: salesmanUser._id,
        items: 1,
        total: 4500,
        status: 'pending',
        date: '2026-05-25',
        pay: 'cash'
      });
    });

    it('should successfully update order details', async () => {
      const res = await request(app)
        .patch('/api/orders/ORD-200')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 5500, pay: 'installment' });

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5500);
      expect(res.body.pay).toBe('installment');
    });

    it('should return 404 for updating a non-existent order', async () => {
      const res = await request(app)
        .patch('/api/orders/ORD-999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ total: 5000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Order not found/i);
    });

    it('should resolve shop name, man name, and shopkeeperId strings to ObjectIds in PATCH', async () => {
      const res = await request(app)
        .patch('/api/orders/ORD-200')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ shop: 'Ali Traders', man: 'Salesman' });

      expect(res.status).toBe(200);

      const res2 = await request(app)
        .patch('/api/orders/ORD-200')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ shopkeeperId: shopB._id.toString() });

      expect(res2.status).toBe(200);
    });
  });
});
