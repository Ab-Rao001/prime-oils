import request from 'supertest';
import app from '../index.js';
import Order from '../models/Order.js';
import Shopkeeper from '../models/Shopkeeper.js';
import Payment from '../models/Payment.js';
import { getAuthToken, createTestUser } from './helpers.js';

describe('Payments Endpoints', () => {
  let adminUser, salesmanUser;
  let adminToken, salesmanToken;
  let shop;
  let order;

  beforeEach(async () => {
    adminUser = await createTestUser({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
    salesmanUser = await createTestUser({ name: 'Salesman', email: 'salesman@example.com', role: 'salesman' });

    adminToken = getAuthToken(adminUser);
    salesmanToken = getAuthToken(salesmanUser);

    shop = await Shopkeeper.create({
      name: 'Super Oils Shop',
      owner: 'Shop Owner',
      phone: '03001112223',
      loc: 'Rawalpindi',
      credit: 0,
      total: 0
    });

    order = await Order.create({
      orderId: 'ORD-500',
      shop: shop._id,
      man: salesmanUser._id,
      items: 3,
      total: 10000,
      status: 'pending',
      date: '2026-05-25',
      pay: 'installment'
    });
  });

  describe('POST /api/payments', () => {
    it('should successfully record a payment and update status', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 10000,
          paid: 4000,
          type: 'cash',
          due: '2026-06-25'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.paid).toBe(4000);
      expect(res.body.status).toBe('partial');

      const checkOrder = await Order.findById(order._id);
      expect(checkOrder.status).toBe('pending');
    });

    it('should reject a payment if the paid amount exceeds the total payment amount', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 5000,
          paid: 6000,
          type: 'bank'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot exceed total payment amount/i);
    });

    it('should reject a payment targeting a non-existent orderId', async () => {
      const nonexistentOrderId = '60d5ec4b868e822d64f0b2f9';
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: nonexistentOrderId,
          total: 5000,
          paid: 2000,
          type: 'cash'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/order not found/i);
    });

    it('should reject a payment that exceeds the remaining order total balance', async () => {
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 10000,
          paid: 6000,
          type: 'cash'
        });

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 10000,
          paid: 5000,
          type: 'cash'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds order remaining total/i);
    });

    it('should accumulate payments and update order status to paid when fully settled', async () => {
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 10000,
          paid: 4000,
          type: 'cash'
        });

      let checkOrder = await Order.findById(order._id);
      expect(checkOrder.status).toBe('pending');

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: order._id.toString(),
          total: 10000,
          paid: 6000,
          type: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');

      checkOrder = await Order.findById(order._id);
      expect(checkOrder.status).toBe('paid');
    });

    it('should resolve order reference by orderId string during payment creation', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          shop: 'Super Oils Shop',
          order: 'ORD-500',
          total: 10000,
          paid: 3000,
          type: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });
  });

  describe('GET /api/payments', () => {
    beforeEach(async () => {
      await Payment.create({
        paymentId: 'PAY-001',
        shop: shop._id,
        order: order._id,
        total: 10000,
        paid: 5000,
        type: 'cash',
        status: 'partial'
      });
    });

    it('should retrieve payments successfully', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const payments = res.body.data || res.body;
      expect(payments.length).toBe(1);
      expect(payments[0].shop).toBe('Super Oils Shop');
    });

    it('should support pagination on payments lookup', async () => {
      const res = await request(app)
        .get('/api/payments?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should hit the cache on second lookup', async () => {
      await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/payments/:paymentId', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        paymentId: 'PAY-100',
        shop: shop._id,
        order: order._id,
        total: 10000,
        paid: 3000,
        type: 'cash',
        status: 'partial'
      });
    });

    it('should successfully update a payment', async () => {
      const res = await request(app)
        .patch('/api/payments/PAY-100')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paid: 4000, type: 'bank' });

      expect(res.status).toBe(200);
      expect(res.body.paid).toBe(4000);
      expect(res.body.type).toBe('bank');
    });

    it('should return 404 for updating a non-existent payment', async () => {
      const res = await request(app)
        .patch('/api/payments/PAY-999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paid: 1000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Payment not found/i);
    });

    it('should resolve shop name and orderId strings to ObjectIds in PATCH', async () => {
      const res = await request(app)
        .patch('/api/payments/PAY-100')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ shop: 'Super Oils Shop', order: 'ORD-500' });

      expect(res.status).toBe(200);
    });
  });
});
