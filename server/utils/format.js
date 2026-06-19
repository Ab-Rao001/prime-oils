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
    _id: o._id?.toString(),
    shop: o.shop && typeof o.shop === 'object' ? (o.shop.name || o.shop._id?.toString() || o.shop.toString()) : o.shop,
    man: o.man && typeof o.man === 'object' ? (o.man.name || o.man._id?.toString() || o.man.toString()) : o.man,
    items: o.items,
    total: o.total,
    status: o.status,
    date: o.date,
    pay: o.pay,
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
    product: o.product,
    issue: o.issue,
    type: o.type,
    status: o.status,
    date: o.date,
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
