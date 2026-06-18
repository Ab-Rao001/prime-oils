/**
 * Paginates a mongoose query.
 * 
 * @param {import('mongoose').Model} model - Mongoose model to query
 * @param {Object} filter - Filter query object
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Current page number
 * @param {number} [options.limit=20] - Number of documents per page
 * @param {Object|string} [options.sort] - Sorting criteria
 * @param {Object|string} [options.select] - Fields to select or exclude
 * @param {Array|Object|string} [options.populate] - Populate configuration
 * @returns {Promise<Object>} Object containing paginated data and page info
 */
export async function paginate(model, filter = {}, options = {}) {
  const page = Math.max(1, parseInt(options.page || 1, 10));
  const limit = Math.max(1, Math.min(100, parseInt(options.limit || 20, 10))); // Cap limit at 100
  const skip = (page - 1) * limit;

  const query = model.find(filter).skip(skip).limit(limit);

  if (options.sort) {
    query.sort(options.sort);
  }
  if (options.select) {
    query.select(options.select);
  }
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => query.populate(p));
    } else {
      query.populate(options.populate);
    }
  }

  // Always use lean() for optimal read speed unless explicitly disabled
  if (options.lean !== false) {
    query.lean();
  }

  const [data, total] = await Promise.all([
    query,
    model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
