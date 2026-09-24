const { logger } = require('./../config/observability');

function formatDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateKeyParts(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) throw new Error('Invalid date key');
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function shiftDateKey(dateKey, days) {
  const { year, month, day } = dateKeyParts(dateKey);
  const value = new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12));
  return value.toISOString().slice(0, 10);
}

// Convert a local wall-clock time to UTC without relying on the server's own
// timezone. Iteration accounts for the timezone offset on the requested date.
function zonedDateTimeToUtc(dateKey, timezone, hour = 0, minute = 0, second = 0) {
  const { year, month, day } = dateKeyParts(dateKey);
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = desired;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(candidate));
    const value = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    const observed = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute), Number(value.second));
    const next = desired - (observed - candidate);
    if (next === candidate) break;
    candidate = next;
  }

  return new Date(candidate);
}
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
    logger.error('Error formatting date:', error);
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
    return formatDateKey(now, timezone);
  } catch (error) {
    logger.error('Error getting current date in timezone:', error);
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
    return formatDateKey(dateObj, timezone);
  } catch (error) {
    logger.error('Error getting date key in timezone:', error);
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
    return zonedDateTimeToUtc(dateKey, timezone);
  } catch (error) {
    logger.error('Error getting start of day in timezone:', error);
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
    const nextStart = getStartOfDayInTimezone(shiftDateKey(dateKey, 1), timezone);
    return new Date(nextStart.getTime() - 1);
  } catch (error) {
    logger.error('Error getting end of day in timezone:', error);
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
    logger.error('Error converting local to UTC:', error);
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
    logger.error('Error checking if date is today:', error);
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
    const endDate = getCurrentDateInTimezone(timezone);
    return { startDate: shiftDateKey(endDate, -Math.max(0, Number(days) || 0)), endDate };
  } catch (error) {
    logger.error('Error getting date range:', error);
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
    logger.error('Error formatting time:', error);
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
  shiftDateKey,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  localToUTC,
  isToday,
  getDateRangeInTimezone,
  formatTimeInTimezone,
  isValidTimezone
};
