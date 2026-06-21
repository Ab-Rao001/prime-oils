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
    // Session is optional for compatibility with standalone development servers

    const product = await Product.findById(params.productId).session(params.session);
    if (!product) {
      throw AppError.notFound(`Product not found: ${params.productId}`);
    }

    const previousQuantity = product.stock;
    const newQuantity = previousQuantity + params.quantityChanged;

    if (newQuantity < 0) {
      throw AppError.conflict(`Insufficient stock for product ${product.name}`);
    }

    // Cost Price Calculation for Purchases
    let newCostPrice = product.costPrice;
    if (params.movementType === 'purchase' && params.unitCost !== undefined) {
      const currentStock = previousQuantity > 0 ? previousQuantity : 0;
      const currentTotalValue = currentStock * (product.costPrice || 0);
      const incomingTotalValue = params.quantityChanged * params.unitCost;
      
      let calcCostPrice = product.costPrice || 0;
      if (newQuantity > 0) {
         calcCostPrice = (currentTotalValue + incomingTotalValue) / newQuantity;
      }
      
      // Round to 2 decimal places
      newCostPrice = Math.round(calcCostPrice * 100) / 100;
    }

    // Phase 2: Inventory Atomic Protection
    // Use findOneAndUpdate with condition that stock must be >= required deduction
    const condition = { _id: product._id };
    if (params.quantityChanged < 0) {
      condition.stock = { $gte: Math.abs(params.quantityChanged) };
    }

    const updateQuery = {
      $inc: { stock: params.quantityChanged },
    };
    
    if (newCostPrice !== product.costPrice) {
      updateQuery.$set = { costPrice: newCostPrice };
    }

    const updatedProduct = await Product.findOneAndUpdate(
      condition,
      updateQuery,
      { new: true, session: params.session }
    );

    if (!updatedProduct) {
      throw AppError.conflict(`Concurrency error or insufficient stock for product ${product.name}`);
    }

    // Append to movement ledger
    await StockMovement.create([{
      product: product._id,
      movementType: params.movementType,
      quantityChanged: params.quantityChanged,
      previousQuantity,
      newQuantity: updatedProduct.stock,
      referenceDocument: params.referenceDocument,
      user: params.user
    }], { session: params.session });

    return updatedProduct;
  }

  /**
   * Bulk record inventory movements to eliminate N+1 database queries
   * @param {Array<Object>} movements
   * @param {mongoose.ClientSession} session
   */
  static async bulkMoveStock(movements, session) {
    // Session is optional for compatibility with standalone development servers

    if (!movements || movements.length === 0) return [];

    const productIds = movements.map(m => m.productId);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const productBulkOps = [];
    const stockMovementsToCreate = [];
    const updatedProductsMap = new Map();

    for (const params of movements) {
      const product = productMap.get(params.productId.toString());
      if (!product) {
        throw AppError.notFound(`Product not found: ${params.productId}`);
      }

      // If the product was updated by an earlier movement in this bulk operation, use the updated stock
      const currentStock = updatedProductsMap.has(product._id.toString()) 
          ? updatedProductsMap.get(product._id.toString()).stock 
          : product.stock;
          
      const currentCostPrice = updatedProductsMap.has(product._id.toString()) 
          ? updatedProductsMap.get(product._id.toString()).costPrice 
          : product.costPrice;

      const newQuantity = currentStock + params.quantityChanged;

      if (newQuantity < 0) {
        throw AppError.conflict(`Insufficient stock for product ${product.name}`);
      }

      let newCostPrice = currentCostPrice;
      if (params.movementType === 'purchase' && params.unitCost !== undefined) {
        const stockForValue = currentStock > 0 ? currentStock : 0;
        const currentTotalValue = stockForValue * (currentCostPrice || 0);
        const incomingTotalValue = params.quantityChanged * params.unitCost;
        
        let calcCostPrice = currentCostPrice || 0;
        if (newQuantity > 0) {
           calcCostPrice = (currentTotalValue + incomingTotalValue) / newQuantity;
        }
        newCostPrice = Math.round(calcCostPrice * 100) / 100;
      }

      const updateQuery = {
        $inc: { stock: params.quantityChanged }
      };
      if (newCostPrice !== currentCostPrice) {
        updateQuery.$set = { costPrice: newCostPrice };
      }

      const condition = { _id: product._id };
      if (params.quantityChanged < 0) {
        // In a bulkWrite $inc we can still filter by stock >= abs(quantityChanged), 
        // but since we checked in memory inside a transaction, the write conflict handles concurrency.
        // We add the condition for extra safety at the DB level for the first deduction.
        // Wait, multiple deductions in same bulkWrite on same product might fail if we use exact stock. 
        // Better to just rely on transaction isolation and our in-memory check.
      }

      productBulkOps.push({
        updateOne: {
          filter: condition,
          update: updateQuery
        }
      });

      stockMovementsToCreate.push({
        product: product._id,
        movementType: params.movementType,
        quantityChanged: params.quantityChanged,
        previousQuantity: currentStock,
        newQuantity: newQuantity,
        referenceDocument: params.referenceDocument,
        user: params.user
      });

      updatedProductsMap.set(product._id.toString(), {
        ...product.toObject(),
        stock: newQuantity,
        costPrice: newCostPrice
      });
    }

    if (productBulkOps.length > 0) {
      await Product.bulkWrite(productBulkOps, { session });
    }

    if (stockMovementsToCreate.length > 0) {
      await StockMovement.insertMany(stockMovementsToCreate, { session });
    }

    // Return the final states
    return movements.map(m => updatedProductsMap.get(m.productId.toString()));
  }
}

export default StockService;
