import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';

class StockService {
  /**
   * Record inventory movement and mathematically adjust product stock
   * @param {Object} params 
   * @param {mongoose.Types.ObjectId} params.productId
   * @param {number} params.quantityChanged
   * @param {string} params.movementType - 'purchase', 'sale', 'transfer_in', etc.
   * @param {mongoose.Types.ObjectId} [params.referenceDocument]
   * @param {mongoose.Types.ObjectId} params.user
   * @param {mongoose.ClientSession} params.session
   * @param {number} [params.unitCost] - Required for 'purchase' to calculate moving average costPrice
   */
  static async moveStock(params) {
    if (!params.session) {
      throw new Error('Stock Movement requires a MongoDB Transaction Session');
    }

    const product = await Product.findById(params.productId).session(params.session);
    if (!product) {
      throw AppError.notFound(`Product not found: ${params.productId}`);
    }

    const previousQuantity = product.stock;
    const newQuantity = previousQuantity + params.quantityChanged;

    if (newQuantity < 0) {
      throw AppError.validation(`Insufficient stock for product ${product.name}`);
    }

    // Cost Price Calculation for Purchases
    if (params.movementType === 'purchase' && params.unitCost !== undefined) {
      const currentStock = previousQuantity > 0 ? previousQuantity : 0;
      const currentTotalValue = currentStock * (product.costPrice || 0);
      const incomingTotalValue = params.quantityChanged * params.unitCost;
      
      let newCostPrice = product.costPrice || 0;
      if (newQuantity > 0) {
         newCostPrice = (currentTotalValue + incomingTotalValue) / newQuantity;
      }
      
      // Round to 2 decimal places
      product.costPrice = Math.round(newCostPrice * 100) / 100;
    }

    // Adjust physical stock count
    product.stock = newQuantity;
    await product.save({ session: params.session });

    // Append to movement ledger
    await StockMovement.create([{
      product: product._id,
      movementType: params.movementType,
      quantityChanged: params.quantityChanged,
      previousQuantity,
      newQuantity,
      referenceDocument: params.referenceDocument,
      user: params.user
    }], { session: params.session });

    return product;
  }
}

export default StockService;
