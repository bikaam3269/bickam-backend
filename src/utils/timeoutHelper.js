/**
 * Timeout helper utility
 * Wraps async functions with timeout protection
 */

/**
 * Execute a promise with timeout
 * @param {Promise} promise - Promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000 = 30 seconds)
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} Promise that rejects on timeout
 */
export const withTimeout = (promise, timeoutMs = 30000, errorMessage = 'Operation timeout') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(errorMessage);
        error.name = 'TimeoutError';
        error.code = 'ETIMEDOUT';
        reject(error);
      }, timeoutMs);
    })
  ]);
};

/**
 * Execute database query with timeout
 * @param {Function} queryFn - Function that returns a Sequelize query promise
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Promise} Query result
 */
export const withQueryTimeout = async (queryFn, timeoutMs = 30000) => {
  try {
    return await withTimeout(queryFn(), timeoutMs, 'Database query timeout');
  } catch (error) {
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      const timeoutError = new Error('Operation timeout');
      timeoutError.name = 'SequelizeTimeoutError';
      timeoutError.code = 'ETIMEDOUT';
      throw timeoutError;
    }
    throw error;
  }
};

/**
 * Retry a function with timeout and retry logic
 * @param {Function} fn - Function to execute
 * @param {object} options - Options
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {number} options.retries - Number of retries
 * @param {number} options.delay - Delay between retries in milliseconds
 * @returns {Promise} Result
 */
export const withRetryAndTimeout = async (fn, options = {}) => {
  const {
    timeout = 30000,
    retries = 3,
    delay = 1000
  } = options;

  let lastError;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await withTimeout(fn(), timeout);
    } catch (error) {
      lastError = error;
      
      // Don't retry on timeout or non-retryable errors
      if (error.name === 'TimeoutError' || 
          error.code === 'ETIMEDOUT' ||
          i === retries) {
        throw error;
      }
      
      // Wait before retrying
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
};

