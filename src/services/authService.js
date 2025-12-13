import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Government from '../models/Government.js';
import twilioService from './twilioService.js';
import notificationService from './notificationService.js';
import { validateAndFormatEgyptianPhone, formatPhoneForWhatsApp } from '../utils/phoneHelper.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      type: user.type
    };
    // Add email to payload only if it exists
    if (user.email) {
      payload.email = user.email;
    }
    // Add phone to payload for marketing users
    if (user.type === 'marketing' && user.phone) {
      payload.phone = user.phone;
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code to user's phone
   */
  async sendVerificationCode(user, type = 'verification') {
    if (!user.phone) {
      throw new Error('Phone number is required for verification');
    }

    // Validate and format phone number
    const phoneValidation = validateAndFormatEgyptianPhone(user.phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }

    const code = this.generateVerificationCode();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // Code expires in 10 minutes

    // Save verification code to user
    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    await user.save();

    // Format phone for WhatsApp (whatsapp:+20xxxxxxxxxx)
    const whatsappPhone = formatPhoneForWhatsApp(user.phone);

    // Send via Twilio WhatsApp
    try {
      await twilioService.sendVerificationCode(whatsappPhone, code, type);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      // Throw Sandbox errors so user knows they need to join Sandbox
      if (error.isSandboxError || error.code === 63015) {
        throw error;
      }
      // Don't throw other errors, code is still saved in database
    }

    return {
      message: 'Verification code sent successfully',
      code: code // In development, return code. Remove in production
    };
  }

  async register(data) {
    const { type, name, email, password, phone, governmentId, cityId, description, logoImage, categoryId, backgroundImage } = data;

    // Validate required fields based on type
    if (!type || !['user', 'vendor', 'admin', 'marketing'].includes(type)) {
      throw new Error('Type must be either "user", "vendor", "admin", or "marketing"');
    }

    // Marketing users need: name, phone, password, governmentId
    if (type === 'marketing') {
      if (!name || !phone || !password || !governmentId) {
        throw new Error('Name, phone, password, and government are required for marketing users');
      }
    } else {
      // Other types need: name and password (email is optional)
      if (!name || !password) {
        throw new Error('Name and password are required');
      }
    }

    // Validate and format Egyptian phone number if provided
    let formattedPhone = phone;
    if (phone) {
      const phoneValidation = validateAndFormatEgyptianPhone(phone);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error);
      }
      formattedPhone = phoneValidation.formatted;
    } else if (type === 'marketing') {
      throw new Error('Phone number is required for marketing users');
    }

    // Vendor specific validations
    if (type === 'vendor') {
      // Vendor fields are optional, but we can add validations here if needed
    }

    // Admin users don't need vendor-specific fields
    if (type === 'admin') {
      // Admin users don't require governmentId or vendor fields
    }

    // Check if email already exists (if provided)
    if (email) {
      let existingUser;
      try {
        existingUser = await User.findOne({ where: { email } });
      } catch (error) {
        // Handle database query limit exceeded error
        if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
          throw new Error('Database query limit exceeded. Please wait a few minutes and try again, or contact support if the issue persists.');
        }
        throw error;
      }
      
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    // Check if phone already exists for marketing users
    if (type === 'marketing' && formattedPhone) {
      let existingUser;
      try {
        const cleanPhone = formattedPhone.replace('+20', '');
        existingUser = await User.findOne({
          where: {
            [Op.or]: [
              { phone: formattedPhone },
              { phone: `+20${cleanPhone}` },
              { phone: `0${cleanPhone}` },
              { phone: cleanPhone }
            ],
            type: 'marketing'
          }
        });
      } catch (error) {
        // Handle database query limit exceeded error
        if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
          throw new Error('Database query limit exceeded. Please wait a few minutes and try again, or contact support if the issue persists.');
        }
        throw error;
      }
      
      if (existingUser) {
        throw new Error('Phone number already exists for a marketing user');
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    // For vendors with phone, require verification. Others can be verified by default
    const requiresVerification = type === 'vendor' && phone;
    const userData = {
      type,
      name,
      password: hashedPassword,
      phone: formattedPhone,
      governmentId,
      cityId,
      isVerified: !requiresVerification // Vendors with phone need verification
    };

    // Add email if provided (optional for all types)
    if (email) {
      userData.email = email;
    }

    // Add vendor specific fields (only for vendor type)
    if (type === 'vendor') {
      if (description !== undefined) userData.description = description;
      if (logoImage !== undefined) userData.logoImage = logoImage;
      if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        userData.categoryId = categoryId;
      }
      if (backgroundImage !== undefined) userData.backgroundImage = backgroundImage;
    }

    // Admin users don't need vendor-specific fields
    if (type === 'admin') {
      // Admin can have governmentId but it's optional
    }

    let user;
    try {
      user = await User.create(userData);
    } catch (error) {
      // Handle database query limit exceeded error
      if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
        throw new Error('Database query limit exceeded. Please wait a few minutes and try again, or contact support if the issue persists.');
      }
      throw error;
    }

    // Send verification code for vendors with phone
    if (requiresVerification && user.phone) {
      try {
        await this.sendVerificationCode(user, 'verification');
      } catch (error) {
        console.error('Failed to send verification code during registration:', error);
        // Continue with registration even if code sending fails
      }
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpiry;

    // Only generate token if user is verified
    let token = null;
    if (user.isVerified) {
      token = this.generateToken(user);
    }

    return {
      user: userResponse,
      token,
      message: requiresVerification 
        ? 'Registration successful. Please verify your phone number with the code sent via WhatsApp.'
        : 'Registration successful. You can now login.'
    };
  }

  async login(phone, password, fcmToken = null) {
    if (!phone || !password) {
      throw new Error('Phone number and password are required');
    }

    // Validate and format Egyptian phone number
    const phoneValidation = validateAndFormatEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }
    const formattedPhone = phoneValidation.formatted;

    // Find user with government relation by phone (search with different formats)
    const cleanPhone = formattedPhone.replace('+20', '');
    const user = await User.findOne({
      where: { 
        [Op.or]: [
          { phone: formattedPhone },
          { phone: `+20${cleanPhone}` },
          { phone: `0${cleanPhone}` },
          { phone: cleanPhone },
          { phone: { [Op.like]: `%${cleanPhone}%` } }
        ]
      },
      include: [{
        model: Government,
        as: 'government',
        attributes: ['id', 'name', 'code']
      }]
    });

    if (!user) {
      throw new Error('Invalid phone number or password');
    }

    // Compare password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid phone number or password');
    }

    // Check if vendor needs verification (only vendors need verification, not users or admins)
    if (!user.isVerified && user.type === 'vendor' && user.phone) {
      // Resend verification code for vendors only
      try {
        await this.sendVerificationCode(user, 'verification');
      } catch (error) {
        console.error('Failed to send verification code during login:', error);
      }
      
      // Return vendor data with isVerified: false (don't throw error)
      const userResponse = user.toJSON();
      delete userResponse.password;
      delete userResponse.verificationCode;
      delete userResponse.verificationCodeExpiry;
      
      return {
        user: userResponse,
        token: null,
        isVerified: false,
        message: 'Verification code has been sent to your phone. Please verify your account to complete login.'
      };
    }

    // Save FCM token if provided (for future notifications, but don't send login notification)
    if (fcmToken) {
      try {
        await notificationService.saveFCMToken(user.id, fcmToken);
        // Refresh user to get updated fcmToken
        await user.reload();
      } catch (error) {
        // Log error but don't fail login if token validation fails
        console.error('Failed to save FCM token during login:', error.message);
      }
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpiry;

    // Generate token
    const token = this.generateToken(user);

    return {
      user: userResponse,
      token
    };
  }

  /**
   * Verify user's phone number with verification code
   */
  async verifyCode(phone, code, fcmToken = null) {
    if (!phone || !code) {
      throw new Error('Phone number and verification code are required');
    }

    // Validate and format Egyptian phone number
    const phoneValidation = validateAndFormatEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }
    const formattedPhone = phoneValidation.formatted;

    // Find user by phone (search with different formats)
    const cleanPhone = formattedPhone.replace('+20', '');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: formattedPhone },
          { phone: `+20${cleanPhone}` },
          { phone: `0${cleanPhone}` },
          { phone: cleanPhone },
          { phone: { [Op.like]: `%${cleanPhone}%` } }
        ]
      } 
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('User is already verified');
    }

    // Check if code matches
    if (user.verificationCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Check if code is expired
    if (!user.verificationCodeExpiry || new Date() > new Date(user.verificationCodeExpiry)) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Verify user
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    await user.save();

    // Save FCM token if provided
    if (fcmToken) {
      try {
        await notificationService.saveFCMToken(user.id, fcmToken);
        // Refresh user to get updated fcmToken
        await user.reload();
      } catch (error) {
        // Log error but don't fail verification if token validation fails
        console.error('Failed to save FCM token during verification:', error.message);
      }
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpiry;

    // Generate token
    const token = this.generateToken(user);

    return {
      user: userResponse,
      token,
      message: 'Account verified successfully'
    };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Validate and format Egyptian phone number
    const phoneValidation = validateAndFormatEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }
    const formattedPhone = phoneValidation.formatted;

    // Find user by phone (search with different formats)
    const cleanPhone = formattedPhone.replace('+20', '');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: formattedPhone },
          { phone: `+20${cleanPhone}` },
          { phone: `0${cleanPhone}` },
          { phone: cleanPhone },
          { phone: { [Op.like]: `%${cleanPhone}%` } }
        ]
      } 
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('User is already verified');
    }

    if (!user.phone) {
      throw new Error('Phone number is required for verification');
    }

    const result = await this.sendVerificationCode(user, 'verification');
    return {
      message: 'Verification code sent successfully',
      code: result.code // In development only
    };
  }

  /**
   * Forgot password - send reset code via WhatsApp
   */
  async forgotPassword(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Validate and format Egyptian phone number
    const phoneValidation = validateAndFormatEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }
    const formattedPhone = phoneValidation.formatted;

    // Find user by phone (search with different formats)
    const cleanPhone = formattedPhone.replace('+20', '');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: formattedPhone },
          { phone: `+20${cleanPhone}` },
          { phone: `0${cleanPhone}` },
          { phone: cleanPhone },
          { phone: { [Op.like]: `%${cleanPhone}%` } }
        ]
      } 
    });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account exists with this phone number, a password reset code has been sent via WhatsApp.'
      };
    }

    if (!user.phone) {
      throw new Error('Phone number is required for password reset');
    }

    // Send password reset code via WhatsApp
    await this.sendVerificationCode(user, 'password_reset');

    return {
      message: 'If an account exists with this phone number, a password reset code has been sent via WhatsApp.'
    };
  }

  /**
   * Reset password with verification code (sent via WhatsApp)
   */
  async resetPassword(phone, code, newPassword) {
    if (!phone || !code || !newPassword) {
      throw new Error('Phone number, verification code, and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate and format Egyptian phone number
    const phoneValidation = validateAndFormatEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }
    const formattedPhone = phoneValidation.formatted;

    // Find user by phone (search with different formats)
    const cleanPhone = formattedPhone.replace('+20', '');
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: formattedPhone },
          { phone: `+20${cleanPhone}` },
          { phone: `0${cleanPhone}` },
          { phone: cleanPhone },
          { phone: { [Op.like]: `%${cleanPhone}%` } }
        ]
      } 
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if code matches
    if (user.verificationCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Check if code is expired
    if (!user.verificationCodeExpiry || new Date() > new Date(user.verificationCodeExpiry)) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Update password
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    await user.save();

    return {
      message: 'Password reset successfully'
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Check if new password is different from current password
    const isSamePassword = await this.comparePassword(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password changed successfully'
    };
  }
}

export default new AuthService();

