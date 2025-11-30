/**
 * Error Handler Utility
 * Provides centralized error handling and navigation for different error types
 */

/**
 * Handle API errors and navigate to appropriate error pages
 */
export const handleApiError = (error, navigate) => {
  // Network error (no response from server)
  if (!error.response) {
    navigate('/error/network');
    return;
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Check for maintenance mode
  if (status === 503 && data?.maintenanceMode) {
    window.location.reload(); // Reload to trigger maintenance check in App.jsx
    return;
  }

  // Handle different HTTP status codes
  switch (status) {
    case 401:
      // Unauthorized - token expired or invalid
      if (!window.location.pathname.startsWith('/auth')) {
        navigate('/error/auth');
      }
      break;

    case 403:
      // Forbidden - permission denied
      navigate('/error/permission');
      break;

    case 404:
      // Not found
      navigate('/404');
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      navigate('/error/500');
      break;

    default:
      // Generic error for other status codes
      navigate('/error/generic');
      break;
  }
};

/**
 * Get user-friendly error message from error object
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  // Network error
  if (!error.response) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  const status = error.response?.status;
  const message = error.response?.data?.message || error.response?.data?.error;

  // Return backend message if available
  if (message) return message;

  // Default messages based on status code
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You need to sign in to access this.';
    case 403:
      return 'You don\'t have permission to access this.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return !error.response && error.code !== 'ECONNABORTED';
};

/**
 * Check if error is a server error (5xx)
 */
export const isServerError = (error) => {
  const status = error.response?.status;
  return status >= 500 && status < 600;
};

/**
 * Check if error is a client error (4xx)
 */
export const isClientError = (error) => {
  const status = error.response?.status;
  return status >= 400 && status < 500;
};

/**
 * Log error to console in development
 */
export const logError = (error, context = '') => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, {
      message: getErrorMessage(error),
      status: error.response?.status,
      data: error.response?.data,
      error
    });
  }
};

export default {
  handleApiError,
  getErrorMessage,
  isNetworkError,
  isServerError,
  isClientError,
  logError
};
