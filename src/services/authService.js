import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Government from '../models/Government.js';
import twilioService from './twilioService.js';

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
      email: user.email,
      type: user.type
    };
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

    const code = this.generateVerificationCode();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // Code expires in 10 minutes

    // Save verification code to user
    user.verificationCode = code;
    user.verificationCodeExpiry = expiry;
    await user.save();

    // Send via Twilio WhatsApp
    try {
      await twilioService.sendVerificationCode(user.phone, code, type);
    } catch (error) {
      console.error('Failed to send verification code:', error);
      // Don't throw error, code is still saved in database
    }

    return {
      message: 'Verification code sent successfully',
      code: code // In development, return code. Remove in production
    };
  }

  async register(data) {
    const { type, name, email, password, phone, governmentId, activity, description, logoImage, categoryId, backgroundImage } = data;

    // Validate required fields based on type
    if (!type || !['user', 'vendor', 'admin'].includes(type)) {
      throw new Error('Type must be either "user", "vendor", or "admin"');
    }

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }

    // Vendor specific validations
    if (type === 'vendor') {
      // Vendor fields are optional, but we can add validations here if needed
    }

    // Admin users don't need vendor-specific fields
    if (type === 'admin') {
      // Admin users don't require governmentId or vendor fields
    }

    // Check if email already exists
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

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const userData = {
      type,
      name,
      email,
      password: hashedPassword,
      phone,
      governmentId,
      isVerified: true // Users are verified by default
    };

    // Add vendor specific fields (only for vendor type)
    if (type === 'vendor') {
      if (activity !== undefined) userData.activity = activity;
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

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpiry;

    // Generate token since user is verified by default
    const token = this.generateToken(user);

    return {
      user: userResponse,
      token,
      message: 'Registration successful. You can now login.'
    };
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user with government relation
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Government,
        as: 'government',
        attributes: ['id', 'name', 'code']
      }]
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Compare password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Users are verified by default, so no verification check needed

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
  async verifyCode(phone, code) {
    if (!phone || !code) {
      throw new Error('Phone number and verification code are required');
    }

    // Format phone number for search - remove whatsapp: prefix and clean
    const cleanPhone = phone.replace(/whatsapp:\+/g, '').replace(/\D/g, '');
    const formattedPhone = `whatsapp:+${cleanPhone}`;

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: phone },
          { phone: formattedPhone },
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

    // Format phone number for search - remove whatsapp: prefix and clean
    const cleanPhone = phone.replace(/whatsapp:\+/g, '').replace(/\D/g, '');
    const formattedPhone = `whatsapp:+${cleanPhone}`;

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: phone },
          { phone: formattedPhone },
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

    // Format phone number for search - remove whatsapp: prefix and clean
    const cleanPhone = phone.replace(/whatsapp:\+/g, '').replace(/\D/g, '');
    const formattedPhone = `whatsapp:+${cleanPhone}`;

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: phone },
          { phone: formattedPhone },
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

    // Format phone number for search - remove whatsapp: prefix and clean
    const cleanPhone = phone.replace(/whatsapp:\+/g, '').replace(/\D/g, '');
    const formattedPhone = `whatsapp:+${cleanPhone}`;

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { phone: phone },
          { phone: formattedPhone },
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

