const fs = require('fs');
const path = require('path');

const mappings = {
  authApi: ['getMe', 'logout', 'loginLocal', 'signupLocal', 'loginWithFirebaseIdToken'],
  inventoryApi: ['getProducts', 'createProduct', 'updateProduct', 'adjustStock', 'uploadProductImage', 'deleteProductImage', 'getPurchaseOrders', 'createPurchaseOrder', 'receivePurchaseOrder', 'updatePurchaseOrder'],
  orderApi: ['getOrders', 'createOrder', 'updateOrder'],
  dispatchApi: ['getVehicles', 'createVehicle', 'getDispatches', 'createDispatch', 'startDispatch', 'completeDispatch'],
  analyticsApi: ['getPnlData', 'getChart', 'getReportsSummary', 'getExpenses', 'createExpense', 'updateExpense', 'deleteExpense', 'downloadReportExport'],
  paymentApi: ['getPayments', 'updatePayment', 'getTransactions'],
  userApi: ['getShopkeepers', 'createShopkeeper', 'updateShopkeeper', 'getComplaints', 'createComplaint', 'updateComplaint', 'getNotifications', 'createNotification', 'markNotificationRead', 'markAllNotificationsRead', 'getCampaigns', 'createCampaign', 'getUsers', 'getSalesmen', 'updateProfile', 'uploadProfileAvatar', 'createUser', 'updateUserRole', 'disableUser', 'resetUserPassword']
};

function getApiModule(methodName) {
  for (const [moduleName, methods] of Object.entries(mappings)) {
    if (methods.includes(methodName)) return moduleName;
  }
  return null;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all api.xxx calls
  const regex = /api\.([a-zA-Z0-9_]+)/g;
  let match;
  const modulesNeeded = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    const methodName = match[1];
    const mod = getApiModule(methodName);
    if (mod) {
      modulesNeeded.add(mod);
    }
  }

  // Also check for loginLocal, signupLocal which are imported directly
  if (content.includes('loginLocal')) modulesNeeded.add('authApi');
  if (content.includes('signupLocal')) modulesNeeded.add('authApi');
  if (content.includes('loginWithFirebaseIdToken')) modulesNeeded.add('authApi');

  if (modulesNeeded.size === 0) return;

  // Replace api.xxx with moduleApi.xxx
  for (const [moduleName, methods] of Object.entries(mappings)) {
    for (const method of methods) {
      const methodRegex = new RegExp(`api\\.${method}`, 'g');
      content = content.replace(methodRegex, `${moduleName}.${method}`);
    }
  }

  // For AuthContext specifically
  content = content.replace(/loginLocal\(/g, 'authApi.loginLocal(');
  content = content.replace(/signupLocal\(/g, 'authApi.signupLocal(');
  content = content.replace(/loginWithFirebaseIdToken\(/g, 'authApi.loginWithFirebaseIdToken(');

  // Replace import
  const importRegex = /import\s+\{\s*api[^\}]*\}\s+from\s+['"]\.\.\/api\/client['"];?/g;
  // Let's make it flexible for paths
  const importRegexFlex = /import\s+\{\s*api[^\}]*\}\s+from\s+['"](.+\/api\/client)['"];?/g;
  
  const matchFlex = importRegexFlex.exec(content);
  if (matchFlex) {
      const basePath = matchFlex[1].replace('/client', ''); // e.g., '../api'
      const newImports = Array.from(modulesNeeded).map(mod => `import { ${mod} } from '${basePath}/${mod}';`).join('\n');
      content = content.replace(importRegexFlex, newImports);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${path.basename(filePath)} with ${Array.from(modulesNeeded).join(', ')}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      // Don't process the api directory itself
      if (!fullPath.includes('\\api\\') && !fullPath.includes('/api/')) {
         processFile(fullPath);
      }
    }
  }
}

walkDir(path.join(__dirname, 'src'));
console.log('Refactoring complete.');
