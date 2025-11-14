import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Government from '../models/Government.js';

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

  async register(data) {
    const { type, name, email, password, phone, governmentId, activity, description, logoImage } = data;

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
    const existingUser = await User.findOne({ where: { email } });
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
      governmentId
    };

    // Add vendor specific fields (only for vendor type)
    if (type === 'vendor') {
      userData.activity = activity;
      userData.description = description;
      userData.logoImage = logoImage;
    }

    // Admin users don't need vendor-specific fields
    if (type === 'admin') {
      // Admin can have governmentId but it's optional
    }

    const user = await User.create(userData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Generate token
    const token = this.generateToken(user);

    return {
      user: userResponse,
      token
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

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Generate token
    const token = this.generateToken(user);

    return {
      user: userResponse,
      token
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

