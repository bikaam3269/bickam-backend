/**
 * Phone number helper for Egyptian phone numbers
 */

/**
 * Validate and format Egyptian phone number
 * @param {string} phone - Phone number
 * @returns {object} { isValid: boolean, formatted: string, error: string }
 */
export const validateAndFormatEgyptianPhone = (phone) => {
  if (!phone) {
    return {
      isValid: false,
      formatted: null,
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it starts with +20 (Egypt country code)
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(3); // Remove +20
  } else if (cleaned.startsWith('20') && cleaned.length > 10) {
    // Only remove 20 if it's the country code (number is longer than 10 digits)
    cleaned = cleaned.substring(2); // Remove 20
  }

  // Handle numbers starting with 01 or 02 (11 digits) - remove leading 0
  // This handles cases like 01022980918, 01123456789, 02022980918, etc.
  if (cleaned.length === 11 && (cleaned.startsWith('01') || cleaned.startsWith('02'))) {
    cleaned = cleaned.substring(1); // Remove leading 0, now it's 10 digits
  }

  // Remove any remaining leading zeros (for safety, but preserve if it's part of 02)
  if (!cleaned.startsWith('02')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  // Egyptian mobile numbers should be 10 digits starting with 1
  // Valid formats: 10xxxxxxxx, 11xxxxxxxx, 12xxxxxxxx, 15xxxxxxxx
  // Also support landline numbers starting with 02
  if (cleaned.length === 10) {
    const firstTwo = cleaned.substring(0, 2);
    const validMobilePrefixes = ['10', '11', '12', '15'];
    const validLandlinePrefix = '02';
    
    // Check mobile numbers (10, 11, 12, 15)
    if (validMobilePrefixes.includes(firstTwo)) {
      return {
        isValid: true,
        formatted: `+20${cleaned}`,
        error: null
      };
    }
    
    // Check landline numbers (02)
    if (cleaned.startsWith(validLandlinePrefix)) {
      return {
        isValid: true,
        formatted: `+20${cleaned}`,
        error: null
      };
    }
  }

  return {
    isValid: false,
    formatted: null,
    error: 'Invalid Egyptian phone number. Must be 10 digits starting with 10, 11, 12, 15, or 02'
  };
};

/**
 * Format phone number for WhatsApp (Twilio format)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone for WhatsApp (whatsapp:+20xxxxxxxxxx)
 */
export const formatPhoneForWhatsApp = (phone) => {
  const validation = validateAndFormatEgyptianPhone(phone);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  return `whatsapp:${validation.formatted}`;
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone for display (0xxxxxxxxxx)
 */
export const formatPhoneForDisplay = (phone) => {
  const validation = validateAndFormatEgyptianPhone(phone);
  if (!validation.isValid) {
    return phone; // Return original if invalid
  }
  // Convert +20xxxxxxxxxx to 0xxxxxxxxxx for display
  return `0${validation.formatted.substring(3)}`;
};

