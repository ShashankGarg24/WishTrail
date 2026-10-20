// Share only pending, ordinary JSON reads. Settled responses are never cached here.
export function dedupeReads(api, getSessionKey) {
  const pending = new Map();
  const originalGet = api.get.bind(api);
  const invalidate = () => pending.clear();
  const isWrite = config => !['get', 'head', 'options'].includes((config?.method || 'get').toLowerCase());

  api.interceptors.request.use(config => {
    if (isWrite(config)) invalidate();
    return config;
  });
  api.interceptors.response.use(response => {
    if (isWrite(response.config)) invalidate();
    return response;
  }, error => {
    if (isWrite(error.config)) invalidate();
    return Promise.reject(error);
  });

  api.get = (url, config = {}) => {
    // Cancellation, custom headers/adapters and other per-caller behavior must
    // retain independent requests. All existing options still pass through.
    if (Object.keys(config).some(key => !['params', 'timeout'].includes(key))) return originalGet(url, config);
    const key = JSON.stringify([getSessionKey(), api.getUri({ ...config, url }), config.timeout ?? api.defaults.timeout]);
    if (pending.has(key)) return pending.get(key);
    const request = originalGet(url, config).finally(() => {
      // A write may have invalidated this request and started a newer one.
      if (pending.get(key) === request) pending.delete(key);
    });
    pending.set(key, request);
    return request;
  };
}
