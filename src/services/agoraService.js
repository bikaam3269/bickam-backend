import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

class AgoraService {
  constructor() {
    // Try to get from environment variables first, fallback to hardcoded values
    this.appId = process.env.AGORA_APP_ID || '39eda0b38ebe46dfa8f0f34ae13979ea';
    this.appCertificate =  '6fba24e49439495895d64b1c2f84272f';
  
    if (!this.appId || !this.appCertificate) {
      console.warn('⚠️  Agora credentials not found in environment variables');
    } else {
      console.log('✅ Agora credentials loaded:', {
        appId: this.appId,
        certificateLength: this.appCertificate.length,
        certificateSet: !!this.appCertificate
      });
    }
  }

  /**
   * Generate Agora RTC Token
   * @param {string} channelName - Channel name
   * @param {number|string} uid - User ID (0 for auto-generated, or string for account-based)
   * @param {string} role - 'publisher' or 'subscriber'
   * @param {number} expirationTimeInSeconds - Token expiration time (default: 24 hours)
   * @param {boolean} useStringUid - Use string UID (account-based) instead of numeric UID
   * @returns {string} Agora token
   */
  generateToken(channelName, uid = 0, role = 'subscriber', expirationTimeInSeconds = 86400, useStringUid = false) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables.');
    }

    if (!channelName || channelName.trim().length === 0) {
      throw new Error('Channel name is required');
    }

    // Validate App Certificate format (should be 32 characters)
    if (this.appCertificate.length !== 32) {
      console.warn('⚠️ App Certificate length is not 32 characters. This may cause token generation issues.');
    }

    // Determine role
    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Calculate expiration time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + expirationTimeInSeconds;

    let token;
    let tokenGenerationMethod = '';
    
    try {
      if (useStringUid || typeof uid === 'string') {
        // Use account-based token (string UID)
        const stringUid = typeof uid === 'string' ? uid : String(uid);
        token = RtcTokenBuilder.buildTokenWithAccount(
          this.appId,
          this.appCertificate,
          channelName,
          stringUid,
          rtcRole,
          privilegeExpiredTs
        );
        tokenGenerationMethod = 'buildTokenWithAccount';
      } else {
        // Use numeric UID token
        const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;
        if (isNaN(numericUid)) {
          throw new Error('Invalid UID: must be a number or string');
        }
        token = RtcTokenBuilder.buildTokenWithUid(
          this.appId,
          this.appCertificate,
          channelName,
          numericUid,
          rtcRole,
          privilegeExpiredTs
        );
        tokenGenerationMethod = 'buildTokenWithUid';
      }
    } catch (error) {
      console.error('❌ Token generation error:', error);
      throw new Error(`Failed to generate token: ${error.message}. Please verify App Certificate is enabled in Agora Console.`);
    }

    // Log token generation for debugging
    console.log('🔑 Token Generation Details:', {
      channelName,
      uid: typeof uid === 'string' ? uid : uid,
      role,
      useStringUid: useStringUid || typeof uid === 'string',
      method: tokenGenerationMethod,
      appId: this.appId,
      appCertificateLength: this.appCertificate.length,
      tokenLength: token ? token.length : 0,
      tokenStartsWith: token ? token.substring(0, 10) : 'null',
      expirationTimeInSeconds,
      expiresAt: new Date((currentTime + expirationTimeInSeconds) * 1000).toISOString()
    });

    if (!token || token.length === 0) {
      throw new Error('Failed to generate token. Please check Agora credentials and ensure App Certificate is enabled in Agora Console.');
    }

    // Validate token format (should start with App ID prefix)
    if (!token.startsWith('006')) {
      console.warn('⚠️ Token does not start with expected prefix. This may indicate an issue with token generation.');
    }

    return token;
  }

  /**
   * Generate token for publisher (vendor)
   * @param {string} channelName - Channel name
   * @param {number|string} uid - User ID
   * @param {number} expirationTimeInSeconds - Token expiration time
   * @returns {string} Agora token
   */
  generatePublisherToken(channelName, uid, expirationTimeInSeconds = 86400) {
    return this.generateToken(channelName, uid, 'publisher', expirationTimeInSeconds);
  }

  /**
   * Generate token for subscriber (viewer)
   * @param {string} channelName - Channel name
   * @param {number|string} uid - User ID
   * @param {number} expirationTimeInSeconds - Token expiration time
   * @returns {string} Agora token
   */
  generateSubscriberToken(channelName, uid, expirationTimeInSeconds = 86400) {
    return this.generateToken(channelName, uid, 'subscriber', expirationTimeInSeconds);
  }

  /**
   * Get Agora App ID
   * @returns {string} Agora App ID
   */
  getAppId() {
    return this.appId;
  }

  /**
   * Validate Agora configuration
   * @returns {boolean} True if configured correctly
   */
  isConfigured() {
    return !!(this.appId && this.appCertificate);
  }

  /**
   * Validate Agora token format and structure
   * @param {string} token - Agora token to validate
   * @param {string} channelName - Expected channel name
   * @param {number|string} uid - Expected UID
   * @param {string} role - Expected role
   * @returns {object} Validation result with details
   */
  validateToken(token, channelName = null, uid = null, role = null) {
    const validation = {
      isValid: false,
      errors: [],
      warnings: [],
      details: {}
    };

    // Check if token exists
    if (!token || typeof token !== 'string') {
      validation.errors.push('Token is missing or not a string');
      return validation;
    }

    // Check token length (should be reasonable length, typically 200-500 characters)
    if (token.length < 50) {
      validation.errors.push(`Token is too short (${token.length} characters). Expected at least 50 characters.`);
    } else if (token.length > 1000) {
      validation.warnings.push(`Token is unusually long (${token.length} characters).`);
    }

    // Check token format (should start with '006' for RTC tokens)
    if (!token.startsWith('006')) {
      validation.errors.push('Token does not start with expected prefix "006". This may indicate an invalid token format.');
    } else {
      // Extract App ID from token (first part after '006')
      const tokenAppId = token.substring(3, 35); // '006' + 32 chars for App ID
      if (tokenAppId !== this.appId) {
        validation.errors.push(`Token App ID (${tokenAppId}) does not match configured App ID (${this.appId})`);
      } else {
        validation.details.appIdMatch = true;
      }
    }

    // Check if token contains expected App ID
    if (token.includes(this.appId)) {
      validation.details.appIdFound = true;
    } else {
      validation.warnings.push('Token does not contain the configured App ID');
    }

    // Basic structure validation
    // Agora tokens typically have this structure: 006[AppID][...token data...]
    const expectedMinLength = 3 + this.appId.length + 50; // '006' + AppID + minimum token data
    if (token.length < expectedMinLength) {
      validation.warnings.push(`Token length (${token.length}) is shorter than expected minimum (${expectedMinLength})`);
    }

    // If no errors, token format is valid
    if (validation.errors.length === 0) {
      validation.isValid = true;
      validation.details.format = 'valid';
      validation.details.length = token.length;
      validation.details.startsWith = token.substring(0, 10);
    }

    return validation;
  }

  /**
   * Comprehensive token validation with detailed report
   * @param {string} token - Agora token to validate
   * @param {object} expectedParams - Expected parameters { channelName, uid, role }
   * @returns {object} Detailed validation report
   */
  validateTokenComprehensive(token, expectedParams = {}) {
    const { channelName, uid, role } = expectedParams;
    
    const validation = this.validateToken(token, channelName, uid, role);
    
    // Add timestamp info
    validation.details.validatedAt = new Date().toISOString();
    validation.details.tokenPreview = token.substring(0, 50) + '...';
    
    // Log validation result
    if (validation.isValid) {
      console.log('✅ Token Validation: PASSED', {
        length: validation.details.length,
        appIdMatch: validation.details.appIdMatch,
        warnings: validation.warnings.length
      });
    } else {
      console.error('❌ Token Validation: FAILED', {
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    return validation;
  }
}

export default new AgoraService();

