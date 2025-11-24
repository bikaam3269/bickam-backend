import 'dotenv/config';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // All Firebase configuration must be provided via environment variables
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error('Firebase configuration missing. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.');
    throw new Error('Firebase configuration is required');
  }

  // Handle private key - it might have literal \n or actual newlines
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Remove surrounding quotes if present
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
    // If it has literal \n (backslash-n), replace with actual newlines
    // If it already has newlines, keep them as is
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Ensure proper PEM format - trim each line but keep structure
    privateKey = privateKey.trim();
  }

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

class FirebaseService {
  /**
   * Send push notification to a single device
   * @param {string} fcmToken - FCM token of the device
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload (optional)
   * @returns {Promise<object>}
   */
  async sendNotification(fcmToken, title, body, data = {}) {
    if (!fcmToken) {
      throw new Error('FCM token is required');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        title,
        body
      },
      token: fcmToken,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        throw new Error('Invalid or unregistered FCM token');
      }
      
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {string[]} fcmTokens - Array of FCM tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload (optional)
   * @returns {Promise<object>}
   */
  async sendMulticastNotification(fcmTokens, title, body, data = {}) {
    if (!fcmTokens || fcmTokens.length === 0) {
      throw new Error('FCM tokens array is required');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        title,
        body
      },
      tokens: fcmTokens,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Successfully sent ${response.successCount} notifications`);
      console.log(`Failed: ${response.failureCount}`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      throw new Error(`Failed to send notifications: ${error.message}`);
    }
  }

  /**
   * Send notification to a topic
   * @param {string} topic - Topic name
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload (optional)
   * @returns {Promise<object>}
   */
  async sendTopicNotification(topic, title, body, data = {}) {
    if (!topic) {
      throw new Error('Topic is required');
    }

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        title,
        body
      },
      topic,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent topic notification:', response);
      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw new Error(`Failed to send topic notification: ${error.message}`);
    }
  }

  /**
   * Validate FCM token
   * @param {string} fcmToken - FCM token to validate
   * @returns {Promise<boolean>}
   */
  async validateToken(fcmToken) {
    if (!fcmToken) {
      return false;
    }

    try {
      // Try to send a test message (dry run)
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'Test',
          body: 'Test'
        }
      }, true); // dry run
      return true;
    } catch (error) {
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        return false;
      }
      // Other errors might be temporary, consider token as valid
      return true;
    }
  }
}

export default new FirebaseService();

