/**
 * Timezone and Locale utilities for frontend
 * Captures user's timezone and locale from the browser
 */

/**
 * Get user's timezone in IANA format
 * @returns {string} IANA timezone (e.g., 'America/New_York')
 */
export function getUserTimezone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'UTC';
  } catch (error) {
    console.error('Error getting timezone:', error);
    return 'UTC';
  }
}

/**
 * Get user's locale
 * @returns {string} Locale string (e.g., 'en-US')
 */
export function getUserLocale() {
  try {
    // Prefer navigator.languages[0] over navigator.language
    const locale = navigator.languages?.[0] || navigator.language || 'en-US';
    return locale;
  } catch (error) {
    console.error('Error getting locale:', error);
    return 'en-US';
  }
}

/**
 * Get both timezone and locale as an object
 * @returns {Object} Object with timezone and locale
 */
export function getUserTimezoneAndLocale() {
  return {
    timezone: getUserTimezone(),
    locale: getUserLocale()
  };
}

/**
 * Add timezone and locale to request data
 * @param {Object} data - Request data object
 * @returns {Object} Data with timezone and locale added
 */
export function addTimezoneAndLocale(data = {}) {
  return {
    ...data,
    timezone: getUserTimezone(),
    locale: getUserLocale()
  };
}

/**
 * Get current date in user's timezone as YYYY-MM-DD
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getCurrentDateKey() {
  try {
    const timezone = getUserTimezone();
    const now = new Date();
    
    // Format date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch (error) {
    console.error('Error getting current date key:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get date key for a specific date in user's timezone
 * @param {Date|string} date - Date to convert
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateKeyInTimezone(date) {
  try {
    const timezone = getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error getting date key:', error);
    return new Date(date).toISOString().split('T')[0];
  }
}

/**
 * Format a date for display in user's timezone
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateInTimezone(date, options = {}) {
  try {
    const timezone = getUserTimezone();
    const locale = getUserLocale();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
}
