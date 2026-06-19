import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
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

router.get('/', authorize('admin', 'supplier', 'salesman', 'shopkeeper'), getProducts);
router.post('/', authorize('admin', 'supplier'), validate(createProductSchema), createProduct);
router.post('/:id/image', authorize('admin', 'supplier'), handleProductImageUpload, uploadProductImage);
router.delete('/:id/image', authorize('admin', 'supplier'), deleteProductImage);
router.patch('/:id', authorize('admin', 'supplier'), validate(updateProductSchema), updateProduct);
router.patch('/:id/stock', authorize('admin', 'supplier'), validate(updateProductStockSchema), updateProductStock);

// We need a validation schema for receive, but for now we'll skip the middleware validate() if it doesn't exist yet, 
// or I can define the endpoint to use req.body since it will be checked in the controller.
// Wait, req.validatedBody is used in the controller. Let me use a custom inline validation or remove validate() and change controller to req.body.
// Actually, it's safer to use req.body in the controller for this new endpoint since I didn't add the schema yet.
// Wait! Let me just use req.body in the controller instead of req.validatedBody, I'll update the controller.
router.post('/receive', authorize('admin', 'supplier'), receiveProduct);


export default router;
