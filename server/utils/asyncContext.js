import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage();

export const getRequestId = () => {
  const store = requestContext.getStore();
  return store ? store.requestId : null;
};

export const getUserId = () => {
  const store = requestContext.getStore();
  return store ? store.userId : null;
};
