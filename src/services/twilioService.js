import twilio from 'twilio';

// Get Twilio credentials from environment variables (required for security)
// NEVER commit these values to git - use .env file instead
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const contentSid = process.env.TWILIO_CONTENT_SID;

// Validate required credentials
if (!accountSid || !authToken) {
  console.warn('⚠️  Twilio credentials not set in environment variables.');
  console.warn('⚠️  Twilio features will not work until TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

class TwilioService {
  /**
   * Send verification code via WhatsApp
   * @param {string} phoneNumber - Phone number in format whatsapp:+201022980918
   * @param {string} code - Verification code
   * @param {string} type - Type of message: 'verification' or 'password_reset'
   * @returns {Promise}
   */
  async sendVerificationCode(phoneNumber, code, type = 'verification') {
    try {
      console.log('TwilioService: Preparing to send verification code');
      console.log('Phone number received:', phoneNumber);
      console.log('Code:', code);
      console.log('Type:', type);
      
      // Check if Twilio credentials are set
      if (!accountSid || !authToken || !client) {
        console.error('Twilio credentials are not set! Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env file');
        throw new Error('Twilio credentials are not configured');
      }
      
      if (!contentSid) {
        console.error('Twilio Content SID is not set! Please set TWILIO_CONTENT_SID in .env file');
        throw new Error('Twilio content template is not configured');
      }

      // Format phone number if not already formatted
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('whatsapp:+')) {
        // Remove any non-digit characters except +
        const cleaned = phoneNumber.replace(/\D/g, '');
        formattedPhone = `whatsapp:+${cleaned}`;
      }
      
      if (!whatsappFrom) {
        throw new Error('TWILIO_WHATSAPP_FROM is not configured');
      }
      
      console.log('Formatted phone number:', formattedPhone);
      console.log('Sending from:', whatsappFrom);
      console.log('Using content template:', contentSid);

      // Send WhatsApp message using content template
      const message = await client.messages.create({
        from: whatsappFrom,
        contentSid: contentSid,
        contentVariables: JSON.stringify({
          '1': code,
          '2': '10 minutes'
        }),
        to: formattedPhone
      });

      console.log('Twilio message sent successfully. Message SID:', message.sid);

      return {
        success: true,
        messageSid: message.sid,
        message: 'Verification code sent successfully'
      };
    } catch (error) {
      console.error('Twilio error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      });
      console.error('Full error:', error);
      throw new Error(`Failed to send verification code: ${error.message}`);
    }
  }

  /**
   * Send simple WhatsApp message
   * @param {string} phoneNumber - Phone number
   * @param {string} message - Message text
   * @returns {Promise}
   */
  async sendMessage(phoneNumber, message) {
    try {
      // Check if Twilio credentials are set
      if (!accountSid || !authToken || !client) {
        throw new Error('Twilio credentials are not configured');
      }
      
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('whatsapp:+')) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        formattedPhone = `whatsapp:+${cleaned}`;
      }

      const result = await client.messages.create({
        from: whatsappFrom,
        body: message,
        to: formattedPhone
      });

      return {
        success: true,
        messageSid: result.sid
      };
    } catch (error) {
      console.error('Twilio error:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}

export default new TwilioService();
