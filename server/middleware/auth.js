const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -otp -emailOtp');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Admin authentication middleware
 * Verifies JWT token and checks if user is admin
 */
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's the special admin token
    if (decoded.userId === 'admin' && decoded.role === 'admin') {
      req.user = { id: 'admin', role: 'admin', username: decoded.username };
      return next();
    }

    // Check if it's a regular user with admin role
    const user = await User.findById(decoded.userId).select('-password -otp -emailOtp');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (!user.isAdmin && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account is blocked. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -otp -emailOtp');
    
    if (user && !user.isBlocked) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient privileges.',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Device verification middleware
 * Checks if user is logging in from a new device
 */
const deviceVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.ip;
    
    // Check if this is a new device
    const isNewDevice = !req.user.loginHistory.some(login => 
      login.device === userAgent && login.ip === ip
    );

    if (isNewDevice) {
      // For new devices, require additional verification
      req.requiresDeviceVerification = true;
    }

    next();
  } catch (error) {
    console.error('Device verification error:', error);
    next();
  }
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  requireRole,
  deviceVerification
};
