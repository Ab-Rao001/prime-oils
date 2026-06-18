import logger from '../utils/logger.js';

/**
 * Centralized Zod Validation Middleware.
 * Accepts a Zod schema, validates req.body against it.
 * On success: attaches parsed/sanitized data to req.validatedBody.
 * On failure: returns 400 JSON { success: false, errors: [...field errors] }.
 */
export function validate(schema) {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync(req.body);
      
      if (!result.success) {
        const errors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          errors
        });
      }
      
      // Attach sanitized and parsed body to request
      req.validatedBody = result.data;
      next();
    } catch (err) {
      logger.error(`Validation runner error: ${err.message}`, { error: err });
      return res.status(500).json({
        success: false,
        message: 'Internal validation runner error'
      });
    }
  };
}

export default validate;
