import twilio from 'twilio';

// Twilio credentials from environment variables
// Make sure to set these in your .env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
const contentSid = process.env.TWILIO_CONTENT_SID;


// Initialize Twilio client

// Validate required credentials
if (!accountSid || !authToken) {
  console.warn('⚠️  Twilio credentials not found in environment variables');
  console.warn('⚠️  Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
} else {
  try {
    // Try standard method first (Account SID + Auth Token)
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized with Account SID and Auth Token');
  } catch (error) {
    console.warn('⚠️  Failed to initialize with Account SID + Auth Token, will try API Key method');
    
    // If standard method didn't work, try API Key method
    if (apiKeySid && apiKeySid.startsWith('SK') && apiKeySecret && accountSid) {
      try {
        client = twilio(apiKeySid, apiKeySecret, { accountSid });
        console.log('✅ Twilio client initialized with API Key');
      } catch (apiKeyError) {
        console.warn('⚠️  Failed to initialize with API Key method');
      }
    }
  }
}

class TwilioService {

  async sendVerificationCode(phoneNumber, code, type = 'verification') {
    try {
      console.log('TwilioService: Preparing to send verification code');
      console.log('Phone number received:', phoneNumber);
      console.log('Code:', code);
      console.log('Type:', type);
      
      // Initialize or get Twilio client
      let twilioClient = client;
      if (!twilioClient) {
        // Try standard method (Account SID + Auth Token)
        if (accountSid && authToken) {
          try {
            twilioClient = twilio(accountSid, authToken);
            client = twilioClient; // Cache for future use
            console.log('✅ Twilio client initialized with Account SID and Auth Token');
          } catch (error) {
            console.warn('⚠️  Standard method failed, trying API Key method');
          }
        }
        
        // Try API Key method if standard method didn't work
        if (!twilioClient && apiKeySid && apiKeySid.startsWith('SK') && apiKeySecret && accountSid) {
          try {
            twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
            client = twilioClient; // Cache for future use
            console.log('✅ Twilio client initialized with API Key');
          } catch (error) {
            console.error('❌ Failed to initialize Twilio client with API Key:', error.message);
          }
        }
        
        if (!twilioClient) {
          console.error('❌ Twilio credentials not configured!');
          console.error('Please check your credentials in twilioService.js');
          throw new Error('Twilio credentials are not configured');
        }
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
      
      // Check if content template is available (for paid accounts)
      const useContentTemplate = contentSid && !contentSid.includes('xxxxxxxx');
      console.log('Using content template:', useContentTemplate ? contentSid : 'No (using simple body message for Free Trial)');

      // Send WhatsApp message
      // For Free Trial: Use simple body message instead of content template
      // For Paid: Use content template
      let message;
      if (contentSid && !contentSid.includes('xxxxxxxx')) {
        // Use content template if available
        message = await twilioClient.messages.create({
          from: whatsappFrom,
          contentSid: contentSid,
          contentVariables: JSON.stringify({
            '1': code,
            '2': '10 minutes'
          }),
          to: formattedPhone
        });
      } else {
        // Use simple body message for Free Trial/Sandbox
        const messageBody = type === 'verification' 
          ? `Your verification code is: ${code}. This code expires in 10 minutes.`
          : `Your password reset code is: ${code}. This code expires in 10 minutes.`;
        
        message = await twilioClient.messages.create({
          from: whatsappFrom,
          body: messageBody,
          to: formattedPhone
        });
      }

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
      // Initialize or get Twilio client
      let twilioClient = client;
      if (!twilioClient) {
        // Try to initialize with API Key if available
        if (apiKeySid && apiKeySid.startsWith('SK') && apiKeySecret && accountSid && accountSid.startsWith('AC')) {
          twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
        } else if (accountSid && accountSid.startsWith('AC') && authToken) {
          twilioClient = twilio(accountSid, authToken);
        } else {
          throw new Error('Twilio credentials are not configured');
        }
      }
      
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('whatsapp:+')) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        formattedPhone = `whatsapp:+${cleaned}`;
      }

      const result = await twilioClient.messages.create({
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
