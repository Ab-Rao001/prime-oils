/**
 * catchAsync Wrapper Utility.
 * Wraps async Express handlers and automatically forwards any thrown errors or
 * promise rejections to the global Express error handler by calling next(err).
 * Eliminates repetitive try/catch blocks in route controllers.
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
