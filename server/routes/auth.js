const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendSMS, sendEmail } = require('../services/communication');
const { rateLimiter } = require('../middleware/rateLimiter');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimiter({
  keyGenerator: (req) => req.ip,
  points: 5, // 5 attempts
  duration: 15 * 60, // 15 minutes
  blockDuration: 30 * 60 // 30 minutes block
});

// Registration with OTP
router.post('/register', [
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be 2-50 characters'),
  body('phoneNumber').matches(/^254[0-9]{9}$/).withMessage('Phone number must be in format 2547XXXXXXXX'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, phoneNumber, password, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findByPhone(phoneNumber);
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Create user
    const user = new User({
      fullName,
      phoneNumber,
      password,
      email
    });

    // Generate OTP for first registration (SMS only)
    const otpCode = user.generateOTP();
    await user.save();

    // Send OTP via SMS
    try {
      await sendSMS(phoneNumber, `Your Boombank verification code is: ${otpCode}. Valid for 2 hours.`);
      res.json({ 
        message: 'Registration successful. Please verify your phone number with the OTP sent via SMS.',
        userId: user._id,
        requiresOTP: true
      });
    } catch (smsError) {
      // If SMS fails, send via email as fallback
      if (email) {
        try {
          await sendEmail(email, 'Boombank Verification Code', `Your verification code is: ${otpCode}. Valid for 2 hours.`);
          res.json({ 
            message: 'Registration successful. SMS failed, OTP sent via email instead.',
            userId: user._id,
            requiresOTP: true,
            otpSentVia: 'email'
          });
        } catch (emailError) {
          // If both fail, still create user but require manual verification
          res.json({ 
            message: 'Registration successful but OTP delivery failed. Please contact support.',
            userId: user._id,
            requiresOTP: false
          });
        }
      } else {
        res.json({ 
          message: 'Registration successful but OTP delivery failed. Please contact support.',
          userId: user._id,
          requiresOTP: false
        });
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify OTP (for first registration)
router.post('/verify-otp', [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    try {
      const isValid = user.verifyOTP(otp);
      if (isValid) {
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, phoneNumber: user.phoneNumber },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Phone number verified successfully',
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            isVerified: user.isVerified,
            balance: user.balance,
            demoBalance: user.demoBalance
          }
        });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (otpError) {
      res.status(400).json({ error: otpError.message });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// Login with OTP
router.post('/login', [
  body('phoneNumber').matches(/^254[0-9]{9}$/).withMessage('Phone number must be in format 2547XXXXXXXX'),
  body('password').notEmpty().withMessage('Password is required')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, password } = req.body;

    const user = await User.findByPhone(phoneNumber);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
    }

    // Check if account is temporarily locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / 1000 / 60);
      return res.status(423).json({ 
        error: `Account temporarily locked. Try again in ${remainingTime} minutes.` 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();
        return res.status(423).json({ 
          error: 'Too many failed login attempts. Account locked for 30 minutes.' 
        });
      }
      
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = undefined;

    // Generate OTP for login (SMS only)
    const otpCode = user.generateOTP();
    
    // Add login record
    user.addLoginRecord(
      req.headers['user-agent'] || 'Unknown',
      req.ip,
      req.headers['user-agent']
    );
    
    await user.save();

    // Send OTP via SMS
    try {
      await sendSMS(phoneNumber, `Your Boombank login code is: ${otpCode}. Valid for 2 hours.`);
      res.json({ 
        message: 'Login OTP sent via SMS',
        userId: user._id,
        requiresOTP: true
      });
    } catch (smsError) {
      // If SMS fails, send via email as fallback
      if (user.email) {
        try {
          await sendEmail(user.email, 'Boombank Login Code', `Your login code is: ${otpCode}. Valid for 2 hours.`);
          res.json({ 
            message: 'Login OTP sent via email (SMS failed)',
            userId: user._id,
            requiresOTP: true,
            otpSentVia: 'email'
          });
        } catch (emailError) {
          res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify login OTP
router.post('/verify-login', [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      const isValid = user.verifyOTP(otp);
      if (isValid) {
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
          { userId: user._id, phoneNumber: user.phoneNumber },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            isVerified: user.isVerified,
            balance: user.balance,
            demoBalance: user.demoBalance,
            role: user.role,
            isAdmin: user.isAdmin
          }
        });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (otpError) {
      res.status(400).json({ error: otpError.message });
    }
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({ error: 'Login OTP verification failed' });
  }
});

// Resend OTP
router.post('/resend-otp', [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('type').isIn(['login', 'registration']).withMessage('Invalid OTP type')
], rateLimiter({
  keyGenerator: (req) => `${req.ip}-${req.body.userId}`,
  points: 3, // 3 resend attempts
  duration: 60 * 60, // 1 hour
  blockDuration: 2 * 60 * 60 // 2 hours block
}), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, type } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new OTP
    const otpCode = user.generateOTP();
    await user.save();

    // Send OTP via SMS
    try {
      await sendSMS(user.phoneNumber, `Your new Boombank ${type} code is: ${otpCode}. Valid for 2 hours.`);
      res.json({ 
        message: `New ${type} OTP sent via SMS`,
        otpSentVia: 'sms'
      });
    } catch (smsError) {
      // If SMS fails, send via email as fallback
      if (user.email) {
        try {
          await sendEmail(user.email, `Boombank ${type} Code`, `Your new ${type} code is: ${otpCode}. Valid for 2 hours.`);
          res.json({ 
            message: `New ${type} OTP sent via email (SMS failed)`,
            otpSentVia: 'email'
          });
        } catch (emailError) {
          res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      }
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// Password reset request
router.post('/forgot-password', [
  body('phoneNumber').matches(/^254[0-9]{9}$/).withMessage('Phone number must be in format 2547XXXXXXXX')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;

    const user = await User.findByPhone(phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Generate OTP for password reset
    const otpCode = user.generateOTP();
    await user.save();

    // Try SMS first, fallback to email
    try {
      await sendSMS(phoneNumber, `Your Boombank password reset code is: ${otpCode}. Valid for 2 hours.`);
      res.json({ 
        message: 'Password reset OTP sent via SMS',
        otpSentVia: 'sms'
      });
    } catch (smsError) {
      if (user.email) {
        try {
          await sendEmail(user.email, 'Boombank Password Reset', `Your password reset code is: ${otpCode}. Valid for 2 hours.`);
          res.json({ 
            message: 'Password reset OTP sent via email (SMS failed)',
            otpSentVia: 'email'
          });
        } catch (emailError) {
          res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
        }
      } else {
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
      }
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with OTP
router.post('/reset-password', [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, otp, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      const isValid = user.verifyOTP(otp);
      if (isValid) {
        user.password = newPassword;
        await user.save();
        
        res.json({ message: 'Password reset successful' });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (otpError) {
      res.status(400).json({ error: otpError.message });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Logout (invalidate token on client side)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a real implementation, you might want to add the token to a blacklist
    // For now, we'll just return success and let the client handle token removal
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp -emailOtp');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
