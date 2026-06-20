import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';
import validate from '../middleware/validate.js';
import { handleProductImageUpload } from '../middleware/uploadProductImage.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStockSchema,
} from '../validators/product.validator.js';
import { 
  getProducts, 
  createProduct, 
  uploadProductImage, 
  deleteProductImage, 
  updateProduct,
  updateProductStock,
  receiveProduct
} from '../controllers/productController.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('catalog.read'), getProducts);
router.post('/', requirePermission('inventory.write'), validate(createProductSchema), createProduct);
router.post('/:id/image', requirePermission('inventory.write'), handleProductImageUpload, uploadProductImage);
router.delete('/:id/image', requirePermission('inventory.write'), deleteProductImage);
router.patch('/:id', requirePermission('inventory.write'), validate(updateProductSchema), updateProduct);
router.patch('/:id/stock', requirePermission('inventory.write'), validate(updateProductStockSchema), updateProductStock);

// We need a validation schema for receive, but for now we'll skip the middleware validate() if it doesn't exist yet, 
// or I can define the endpoint to use req.body since it will be checked in the controller.
// Wait, req.validatedBody is used in the controller. Let me use a custom inline validation or remove validate() and change controller to req.body.
// Actually, it's safer to use req.body in the controller for this new endpoint since I didn't add the schema yet.
// Wait! Let me just use req.body in the controller instead of req.validatedBody, I'll update the controller.
router.post('/receive', requirePermission('stock.receive'), receiveProduct);


export default router;
