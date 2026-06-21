import AppError from './AppError.js';

export const permissions = {
  admin: ['*'],
  supplier: [
    'inventory.read',
    'inventory.write',
    'orders.read',
    'orders.approve',
    'dispatch.manage',
    'dispatch.read',
    'stock.receive',
    'stock.read',
    'delivery.complete',
    'reports.read',
    'catalog.read',
    'customers.read',
    'payments.read',
    'complaints.read',
    'returns.read',
    'returns.manage',
    'returns.create'
  ],
  salesman: [
    'customers.read',
    'customers.create',
    'orders.create',
    'orders.read',
    'orders.manage', // specifically for salesman adjustments
    'orders.approve',
    'payments.collect',
    'payments.read',
    'complaints.create',
    'complaints.read',
    'visits.manage',
    'dispatch.read',
    'dispatch.driver', // can accept driving tasks
    'catalog.read',
    'returns.read',
    'reports.read'
  ],
  driver: [ // Added a driver role in case it's distinct
    'dispatch.read',
    'dispatch.driver',
    'delivery.complete',
    'orders.read'
  ],
  shopkeeper: [
    'catalog.read',
    'orders.create',
    'orders.read',
    'payments.read',
    'payments.pay',
    'complaints.create',
    'complaints.read',
    'customers.read',
    'returns.read',
    'returns.create',
    'dispatch.read',
    'reports.read'
  ]
};

export const hasPermission = (userRole, requiredPermission) => {
  if (!userRole) return false;
  if (!permissions[userRole]) return false;
  if (permissions[userRole].includes('*')) return true;
  return permissions[userRole].includes(requiredPermission);
};

export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!hasPermission(req.user.role, requiredPermission)) {
      return next(AppError.forbidden(`Access Denied: Requires ${requiredPermission} permission`));
    }

    next();
  };
};
