/**
 * Timezone utility functions for WishTrail
 * All times are stored in UTC in the database
 * These utilities help convert times to/from user's timezone
 */

/**
 * Convert a UTC date to user's timezone
 * @param {Date|string} utcDate - UTC date to convert
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @param {string} locale - Locale for formatting (e.g., 'en-US')
 * @returns {string} Formatted date string in user's timezone
 */
function formatDateInTimezone(utcDate, timezone = 'UTC', locale = 'en-US') {
  if (!utcDate) return null;
  
  try {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return utcDate.toString();
  }
}

/**
 * Get the current date in user's timezone as YYYY-MM-DD
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {string} Date in YYYY-MM-DD format
 */
function getCurrentDateInTimezone(timezone = 'UTC') {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch (error) {
    console.error('Error getting current date in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get date key (YYYY-MM-DD) for a given date in user's timezone
 * @param {Date|string} date - Date to convert
 * @param {string} timezone - IANA timezone
 * @returns {string} Date key in YYYY-MM-DD format
 */
function getDateKeyInTimezone(date, timezone = 'UTC') {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    console.error('Error getting date key in timezone:', error);
    return new Date(date).toISOString().split('T')[0];
  }
}

/**
 * Get start of day in user's timezone as UTC timestamp
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} timezone - IANA timezone
 * @returns {Date} Start of day in user's timezone as UTC Date object
 */
function getStartOfDayInTimezone(dateKey, timezone = 'UTC') {
  try {
    // Parse the date key in the user's timezone
    const [year, month, day] = dateKey.split('-').map(Number);
    
    // Create a date string in the format: "2025-12-31T00:00:00"
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    
    // Create a formatter that can parse the date in the user's timezone
    const date = new Date(dateString);
    
    // Get the offset for this timezone at this specific date
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = utcDate.getTime() - tzDate.getTime();
    
    return new Date(date.getTime() + offset);
  } catch (error) {
    console.error('Error getting start of day in timezone:', error);
    return new Date(dateKey + 'T00:00:00Z');
  }
}

/**
 * Get end of day in user's timezone as UTC timestamp
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} timezone - IANA timezone
 * @returns {Date} End of day in user's timezone as UTC Date object
 */
function getEndOfDayInTimezone(dateKey, timezone = 'UTC') {
  try {
    const startOfDay = getStartOfDayInTimezone(dateKey, timezone);
    return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
  } catch (error) {
    console.error('Error getting end of day in timezone:', error);
    return new Date(dateKey + 'T23:59:59.999Z');
  }
}

/**
 * Convert local time to UTC
 * @param {Date|string} localDate - Date in user's local timezone
 * @param {string} timezone - IANA timezone
 * @returns {Date} UTC Date object
 */
function localToUTC(localDate, timezone = 'UTC') {
  try {
    const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
    
    // If already UTC, return as is
    if (timezone === 'UTC') {
      return date;
    }
    
    // Get the date string in the specified timezone
    const dateString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(dateString + ' UTC');
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    return new Date(localDate);
  }
}

/**
 * Check if a date falls within a specific timezone's today
 * @param {Date|string} date - Date to check
 * @param {string} timezone - IANA timezone
 * @returns {boolean} True if date is today in the specified timezone
 */
function isToday(date, timezone = 'UTC') {
  try {
    const dateKey = getDateKeyInTimezone(date, timezone);
    const todayKey = getCurrentDateInTimezone(timezone);
    return dateKey === todayKey;
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
}

/**
 * Get a date range in user's timezone
 * @param {number} days - Number of days to go back
 * @param {string} timezone - IANA timezone
 * @returns {Object} Object with startDate and endDate as YYYY-MM-DD strings
 */
function getDateRangeInTimezone(days, timezone = 'UTC') {
  try {
    const now = new Date();
    const endDate = getCurrentDateInTimezone(timezone);
    
    // Calculate start date
    const startDateObj = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDate = getDateKeyInTimezone(startDateObj, timezone);
    
    return { startDate, endDate };
  } catch (error) {
    console.error('Error getting date range:', error);
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }
}

/**
 * Format a time in user's timezone
 * @param {Date|string} date - Date to format
 * @param {string} timezone - IANA timezone
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted time string (e.g., "2:30 PM")
 */
function formatTimeInTimezone(date, timezone = 'UTC', locale = 'en-US') {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting time:', error);
    return date.toString();
  }
}

/**
 * Validate IANA timezone string
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid IANA timezone
 */
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  formatDateInTimezone,
  getCurrentDateInTimezone,
  getDateKeyInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  localToUTC,
  isToday,
  getDateRangeInTimezone,
  formatTimeInTimezone,
  isValidTimezone
};
