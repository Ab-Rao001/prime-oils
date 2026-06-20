/**
 * Parses and sanitizes pagination parameters from req.query.
 * @param {Object} query - req.query object
 * @returns {Object} { page, limit, skip }
 */
export function getPagination(query) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Reject negative, NaN, or non-numeric strings
  if (isNaN(page) || page <= 0) page = 1;
  if (isNaN(limit) || limit <= 0) limit = 25;

  // Hard cap limit
  limit = Math.min(limit, 100);

  // Calculate skip
  // Prevent integer overflow / huge values (though Math.min handles limit)
  if (page > 1000000) page = 1000000; // basic safeguard
  
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Validates and sanitizes the sort parameter based on an allowlist.
 * @param {string} sortParam - The sort query string (e.g., "-totalAmount", "status")
 * @param {Array<string>} allowedFields - List of allowed sort fields
 * @param {Object} defaultSort - Default sort object (e.g., { createdAt: -1 })
 * @returns {Object} Mongoose sort object
 */
export function getSafeSort(sortParam, allowedFields = [], defaultSort = { createdAt: -1 }) {
  if (!sortParam || typeof sortParam !== 'string') return defaultSort;
  
  const sortObj = {};
  const fields = sortParam.split(',');
  
  let validFieldsCount = 0;
  
  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) continue;
    
    const isDescending = trimmed.startsWith('-');
    const cleanField = isDescending ? trimmed.substring(1) : trimmed;
    
    if (allowedFields.includes(cleanField)) {
      sortObj[cleanField] = isDescending ? -1 : 1;
      validFieldsCount++;
    }
  }
  
  return validFieldsCount > 0 ? sortObj : defaultSort;
}

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
  const { page, limit, skip } = getPagination({ page: options.page, limit: options.limit });

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
      count: total,
      totalRecords: total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
}
