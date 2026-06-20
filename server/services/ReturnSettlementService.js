import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Shopkeeper from '../models/Shopkeeper.js';
import CreditNote from '../models/CreditNote.js';
import Refund from '../models/Refund.js';
import StockService from './StockService.js';
import AuditService from './AuditService.js';
import NotificationService from './NotificationService.js';
import AppError from '../utils/AppError.js';

class ReturnSettlementService {
  static async calculateReturnTotal(returnRequest, order, session) {
    const lines = [];
    let total = 0;

    for (const p of returnRequest.products) {
      const productId = p.productId?._id || p.productId;
      const lineItem = (order.lineItems || []).find(li => li.productId.toString() === productId.toString());
      let unitPrice = p.unitPrice || lineItem?.unitCost || 0;

      if (!unitPrice) {
        const product = await Product.findById(productId).session(session);
        unitPrice = product?.price || 0;
      }

      const lineTotal = unitPrice * p.quantity;
      total += lineTotal;
      lines.push({
        productId,
        productName: lineItem?.productName || p.productName,
        quantity: p.quantity,
        unitPrice,
        lineTotal,
      });
    }

    return { lines, total };
  }

  static async settle(returnRequest, userId, session) {
    if (returnRequest.settlementStatus === 'SETTLED') return returnRequest;

    const order = await Order.findById(returnRequest.order).session(session);
    if (!order) throw AppError.notFound('Order not found for settlement');

    const resolution = returnRequest.resolutionType || 'REFUND';
    const { lines, total } = await this.calculateReturnTotal(returnRequest, order, session);

    let creditNote = null;
    let refund = null;
    let replacementOrder = null;

    if (['REFUND', 'CREDIT_NOTE', 'EXCHANGE'].includes(resolution)) {
      const cnCount = await CreditNote.countDocuments().session(session);
      creditNote = (await CreditNote.create([{
        creditNoteId: `CN-${String(cnCount + 1).padStart(4, '0')}`,
        returnRequest: returnRequest._id,
        order: order._id,
        shop: returnRequest.customer,
        lines,
        total,
        status: 'POSTED',
        postedAt: new Date(),
        postedBy: userId,
      }], { session }))[0];

      const shop = await Shopkeeper.findById(returnRequest.customer).session(session);
      if (shop) {
        const newCredit = Math.max(0, (shop.credit || 0) - total);
        shop.credit = newCredit;
        await shop.save({ session });
      }

      const payment = await Payment.findOne({ order: order._id }).session(session);
      if (payment) {
        payment.total = Math.max(0, (payment.total || 0) - total);
        payment.paid = Math.min(payment.paid || 0, payment.total);
        if (payment.total === 0 || payment.paid >= payment.total) {
          payment.status = payment.total === 0 ? 'paid' : payment.status;
        }
        await payment.save({ session });
      }

      if (resolution === 'REFUND') {
        const rfCount = await Refund.countDocuments().session(session);
        refund = (await Refund.create([{
          refundId: `RF-${String(rfCount + 1).padStart(4, '0')}`,
          returnRequest: returnRequest._id,
          creditNote: creditNote._id,
          order: order._id,
          shop: returnRequest.customer,
          amount: total,
          method: 'CREDIT_BALANCE',
          status: 'COMPLETED',
          processedAt: new Date(),
          processedBy: userId,
        }], { session }))[0];
      }

      await NotificationService.send({
        title: 'Credit Note Posted',
        message: `Credit note ${creditNote.creditNoteId} for PKR ${total.toLocaleString()} posted against return ${returnRequest.rmaId}.`,
        type: 'PAYMENT',
        priority: 'MEDIUM',
        module: 'Returns',
        documentId: creditNote._id,
        sender: userId,
      }, null, 'admin', session);
    }

    if (['REPLACEMENT', 'EXCHANGE'].includes(resolution)) {
      replacementOrder = await this.createReplacementOrder(returnRequest, order, userId, session);
    }

    returnRequest.creditNoteId = creditNote?._id;
    returnRequest.refundId = refund?._id;
    returnRequest.replacementOrderId = replacementOrder?._id;
    returnRequest.settlementAmount = total;
    returnRequest.settlementStatus = 'SETTLED';
    returnRequest.settledAt = new Date();
    await returnRequest.save({ session });

    await AuditService.log({
      user: userId,
      action: 'RETURN_SETTLED',
      collectionName: 'ReturnRequest',
      documentId: returnRequest._id,
      newValue: {
        resolution,
        total,
        creditNoteId: creditNote?.creditNoteId,
        refundId: refund?.refundId,
        replacementOrderId: replacementOrder?.orderId,
      },
      session,
    });

    return { returnRequest, creditNote, refund, replacementOrder };
  }

  static async createReplacementOrder(returnRequest, originalOrder, userId, session) {
    const lineItems = [];
    let calculatedTotal = 0;
    let totalQuantity = 0;

    for (const p of returnRequest.products) {
      const productId = p.productId?._id || p.productId;
      const product = await StockService.moveStock({
        productId,
        quantityChanged: -Number(p.quantity),
        movementType: 'sale',
        referenceDocument: returnRequest._id,
        user: userId,
        session,
      });

      const costPrice = product.costPrice || 0;
      const totalItemCost = costPrice * Number(p.quantity);
      lineItems.push({
        productId: product._id,
        productName: product.name,
        quantity: Number(p.quantity),
        unitCost: costPrice,
        totalCost: totalItemCost,
      });
      calculatedTotal += (product.price || 0) * Number(p.quantity);
      totalQuantity += Number(p.quantity);
    }

    const count = await Order.countDocuments().session(session);
    const orderId = `ORD-${String(count + 1).padStart(3, '0')}`;

    const created = await Order.create([{
      orderId,
      shop: originalOrder.shop,
      man: originalOrder.man,
      items: totalQuantity,
      lineItems,
      totalCogs: lineItems.reduce((a, i) => a + i.totalCost, 0),
      total: calculatedTotal,
      status: 'confirmed',
      date: new Date().toISOString().slice(0, 10),
      pay: originalOrder.pay || 'installment',
      paymentStatus: 'paid',
      paidAmount: 0,
    }], { session });

    return created[0];
  }
}

export default ReturnSettlementService;
