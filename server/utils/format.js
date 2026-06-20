/** Map MongoDB documents to frontend-friendly shapes (keep legacy id fields). */
export function formatProduct(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.legacyId ?? o._id?.toString(),
    _id: o._id?.toString(),
    name: o.name,
    cat: o.cat,
    size: o.size,
    description: o.description,
    stock: o.stock,
    unit: o.unit,
    price: o.price,
    min: o.min,
    imageFile: o.imageFile,
    imageUrl: o.imageUrl,
    cloudinaryPublicId: o.cloudinaryPublicId,
  };
}

export function formatOrder(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.orderId,
    orderId: o.orderId,
    _id: o._id?.toString(),
    shop: o.shop && typeof o.shop === 'object' ? (o.shop.name || o.shop._id?.toString() || o.shop.toString()) : o.shop,
    shopId: o.shop && typeof o.shop === 'object'
      ? (o.shop._id?.toString() || o.shop.toString())
      : (o.shop?.toString?.() || o.shop),
    man: o.man && typeof o.man === 'object' ? (o.man.name || o.man._id?.toString() || o.man.toString()) : o.man,
    items: o.items,
    lineItems: (o.lineItems || []).map(item => ({
      productId: item.productId?.toString?.() || item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    })),
    total: o.total,
    status: o.status,
    date: o.date,
    pay: o.pay,
    paymentStatus: o.paymentStatus || 'pending',
    paidAmount: o.paidAmount || 0,
  };
}

export function formatPayment(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.paymentId,
    _id: o._id?.toString(),
    shop: o.shop && typeof o.shop === 'object' ? (o.shop.name || o.shop._id?.toString() || o.shop.toString()) : o.shop,
    total: o.total,
    paid: o.paid,
    type: o.type,
    due: o.due,
    status: o.status,
  };
}

export function formatShopkeeper(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.legacyId ?? o._id?.toString(),
    _id: o._id?.toString(),
    name: o.name,
    owner: o.owner,
    loc: o.loc,
    phone: o.phone,
    status: o.status,
    credit: o.credit,
    total: o.total,
  };
}

export function formatComplaint(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.complaintId,
    _id: o._id?.toString(),
    shop: o.shop && typeof o.shop === 'object' ? (o.shop.name || o.shop._id?.toString() || o.shop.toString()) : o.shop,
    shopId: o.shop && typeof o.shop === 'object' ? (o.shop._id?.toString() || o.shop.toString()) : o.shop,
    product: o.product,
    productRef: o.productRef?.toString?.() || o.productRef,
    orderRef: o.orderRef && typeof o.orderRef === 'object'
      ? { _id: o.orderRef._id?.toString(), orderId: o.orderRef.orderId, status: o.orderRef.status }
      : o.orderRef?.toString?.() || o.orderRef,
    returnRequestId: o.returnRequestId?.toString?.() || o.returnRequestId,
    issue: o.issue,
    type: o.type,
    status: o.status,
    date: o.date,
    targetUser: o.targetUser && typeof o.targetUser === 'object'
      ? { _id: o.targetUser._id?.toString(), name: o.targetUser.name, role: o.targetUser.role }
      : o.targetUser?.toString?.() || o.targetUser,
  };
}

export function formatReturnRequest(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id?.toString(),
    id: o.rmaId || o._id?.toString(),
    rmaId: o.rmaId,
    order: o.order && typeof o.order === 'object'
      ? { _id: o.order._id?.toString(), orderId: o.order.orderId, status: o.order.status, total: o.order.total }
      : o.order?.toString?.() || o.order,
    customer: o.customer && typeof o.customer === 'object'
      ? { _id: o.customer._id?.toString(), name: o.customer.name, loc: o.customer.loc, phone: o.customer.phone }
      : o.customer,
    products: (o.products || []).map(p => ({
      productId: p.productId?._id?.toString() || p.productId?.toString() || p.productId,
      productName: p.productId?.name,
      sku: p.productId?.sku,
      price: p.productId?.price,
      quantity: p.quantity,
      condition: p.condition,
      disposition: p.disposition,
      unitPrice: p.unitPrice,
    })),
    reason: o.reason,
    resolutionType: o.resolutionType || 'REFUND',
    status: o.status,
    notes: o.notes,
    inspectionNotes: o.inspectionNotes,
    inspectionGrade: o.inspectionGrade,
    inspectionPhotos: o.inspectionPhotos || [],
    approvalNotes: o.approvalNotes,
    settlementStatus: o.settlementStatus || 'PENDING',
    settlementAmount: o.settlementAmount || 0,
    settledAt: o.settledAt,
    creditNote: o.creditNoteId && typeof o.creditNoteId === 'object'
      ? { _id: o.creditNoteId._id?.toString(), creditNoteId: o.creditNoteId.creditNoteId, total: o.creditNoteId.total, status: o.creditNoteId.status }
      : o.creditNoteId?.toString?.() || o.creditNoteId,
    refund: o.refundId && typeof o.refundId === 'object'
      ? { _id: o.refundId._id?.toString(), refundId: o.refundId.refundId, amount: o.refundId.amount, status: o.refundId.status, method: o.refundId.method }
      : o.refundId?.toString?.() || o.refundId,
    replacementOrder: o.replacementOrderId && typeof o.replacementOrderId === 'object'
      ? { _id: o.replacementOrderId._id?.toString(), orderId: o.replacementOrderId.orderId, status: o.replacementOrderId.status, total: o.replacementOrderId.total }
      : o.replacementOrderId?.toString?.() || o.replacementOrderId,
    complaintId: o.complaintId && typeof o.complaintId === 'object'
      ? { _id: o.complaintId._id?.toString(), complaintId: o.complaintId.complaintId, issue: o.complaintId.issue }
      : o.complaintId?.toString?.() || o.complaintId,
    approvedBy: o.approvedBy && typeof o.approvedBy === 'object'
      ? { _id: o.approvedBy._id?.toString(), name: o.approvedBy.name }
      : o.approvedBy,
    receivedAt: o.receivedAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function formatCreditNote(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id?.toString(),
    id: o.creditNoteId,
    creditNoteId: o.creditNoteId,
    returnRequest: o.returnRequest && typeof o.returnRequest === 'object'
      ? { _id: o.returnRequest._id?.toString(), rmaId: o.returnRequest.rmaId, reason: o.returnRequest.reason }
      : o.returnRequest,
    order: o.order && typeof o.order === 'object'
      ? { _id: o.order._id?.toString(), orderId: o.order.orderId, total: o.order.total }
      : o.order,
    shop: o.shop && typeof o.shop === 'object' ? o.shop.name : o.shop,
    lines: o.lines || [],
    total: o.total,
    status: o.status,
    postedAt: o.postedAt,
    createdAt: o.createdAt,
  };
}

export function formatRefund(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id?.toString(),
    id: o.refundId,
    refundId: o.refundId,
    returnRequest: o.returnRequest && typeof o.returnRequest === 'object'
      ? { _id: o.returnRequest._id?.toString(), rmaId: o.returnRequest.rmaId }
      : o.returnRequest,
    shop: o.shop && typeof o.shop === 'object' ? o.shop.name : o.shop,
    amount: o.amount,
    method: o.method,
    status: o.status,
    processedAt: o.processedAt,
    createdAt: o.createdAt,
  };
}

export function formatCampaign(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.legacyId ?? o._id?.toString(),
    _id: o._id?.toString(),
    name: o.name,
    budget: o.budget,
    spent: o.spent,
    start: o.start,
    end: o.end,
    status: o.status,
    roi: o.roi,
  };
}

export function formatNotification(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.legacyId ?? o._id?.toString(),
    _id: o._id?.toString(),
    type: o.type,
    title: o.title || 'System Notification',
    msg: o.message || o.msg, // backwards compatible
    message: o.message || o.msg,
    date: o.date || o.createdAt,
    createdAt: o.createdAt,
    read: o.isRead ?? o.read, // backwards compatible
    isRead: o.isRead ?? o.read,
    priority: o.priority || 'MEDIUM',
    module: o.module,
    documentId: o.documentId?.toString(),
    role: o.role
  };
}

export function formatUser(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o.legacyId ?? o._id?.toString(),
    _id: o._id?.toString(),
    name: o.name,
    email: o.email,
    role: o.role,
    status: o.status,
    firebaseId: o.firebaseId,
  };
}
