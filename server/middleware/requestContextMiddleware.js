import { requestContext } from '../utils/asyncContext.js';

export const contextMiddleware = (req, res, next) => {
  const context = {
    requestId: req.id, 
    userId: null,
  };
  
  requestContext.run(context, () => {
    next();
  });
};

export default contextMiddleware;
