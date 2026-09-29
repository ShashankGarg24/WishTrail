async function persistRefreshToken(secureStore, token, options = {}) {
  if (!secureStore?.setItemAsync || !token) throw new Error('secure_refresh_storage_unavailable');
  const delays = options.delays || [100, 400];
  const wait = options.wait || (delay => new Promise(resolve => setTimeout(resolve, delay)));
  let lastError;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await secureStore.setItemAsync('wt_refresh_token', token);
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) await wait(delays[attempt]);
    }
  }
  throw lastError || new Error('secure_refresh_storage_failed');
}

module.exports = { persistRefreshToken };
