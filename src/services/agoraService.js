import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

class AgoraService {
  constructor() {
    this.appId = '39eda0b38ebe46dfa8f0f34ae13979ea';
    this.appCertificate = '6fba24e49439495895d64b1c2f84272f';
  
    if (!this.appId || !this.appCertificate) {
      console.warn('⚠️  Agora credentials not found in environment variables');
    }
  }

  /**
   * Generate Agora RTC Token
   * @param {string} channelName - Channel name
   * @param {number|string} uid - User ID (0 for auto-generated)
   * @param {string} role - 'publisher' or 'subscriber'
   * @param {number} expirationTimeInSeconds - Token expiration time (default: 24 hours)
   * @returns {string} Agora token
   */
  generateToken(channelName, uid = 0, role = 'subscriber', expirationTimeInSeconds = 86400) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables.');
    }

    if (!channelName) {
      throw new Error('Channel name is required');
    }

    // Convert uid to number if it's a string
    const numericUid = typeof uid === 'string' ? parseInt(uid) : uid;

    // Determine role
    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Calculate expiration time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + expirationTimeInSeconds;

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      numericUid,
      rtcRole,
      privilegeExpiredTs
    );

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
}

export default new AgoraService();

