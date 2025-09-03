const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    length: 6,
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: 'Account ID must be exactly 6 digits'
    }
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  demoBalance: {
    type: Number,
    default: 5000,
    min: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastLoginDevice: {
    type: String,
    default: 'Unknown'
  },
  loginHistory: [{
    device: String,
    timestamp: Date,
    ip: String,
    userAgent: String
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  stats: {
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 },
    biggestWin: { type: Number, default: 0 },
    averageBet: { type: Number, default: 0 }
  },
  // Mind reading algorithm data 😈
  luxurySearches: [{
    query: String,
    timestamp: Date,
    category: String // luxury, gambling, expensive items, etc.
  }],
  searchPatterns: {
    luxuryScore: { type: Number, default: 0, min: 0, max: 100 },
    gamblingFrequency: { type: Number, default: 0 },
    highValueInterests: [String]
  },
  // OTP and verification
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0, max: 5 }
  },
  emailOtp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0, max: 5 }
  },
  // Security
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // KYC
  kyc: {
    isVerified: { type: Boolean, default: false },
    documents: [{
      type: String,
      url: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      uploadedAt: Date
    }],
    verifiedAt: Date
  },
  // Payment settings
  paymentSettings: {
    preferredPaymentMethod: {
      type: String,
      enum: ['mpesa', 'bank', 'card'],
      default: 'mpesa'
    },
    autoConfirmDeposits: { type: Boolean, default: true },
    withdrawalLimit: { type: Number, default: 200000 }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ accountId: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'otp.expiresAt': 1 }, { expireAfterSeconds: 0 });
userSchema.index({ 'emailOtp.expiresAt': 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Generate unique 6-digit account ID if not exists
  if (!this.accountId) {
    this.accountId = await this.constructor.generateUniqueAccountId();
  }
  
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateOTP = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  
  this.otp = {
    code,
    expiresAt,
    attempts: 0
  };
  
  return code;
};

userSchema.methods.generateEmailOTP = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  
  this.emailOtp = {
    code,
    expiresAt,
    attempts: 0
  };
  
  return code;
};

userSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code) return false;
  
  if (this.otp.attempts >= 5) {
    throw new Error('Too many OTP attempts. Please request a new OTP.');
  }
  
  if (new Date() > this.otp.expiresAt) {
    throw new Error('OTP has expired. Please request a new OTP.');
  }
  
  this.otp.attempts += 1;
  
  if (this.otp.code === code) {
    this.otp = undefined;
    this.isVerified = true;
    return true;
  }
  
  return false;
};

userSchema.methods.verifyEmailOTP = function(code) {
  if (!this.emailOtp || !this.emailOtp.code) return false;
  
  if (this.emailOtp.attempts >= 5) {
    throw new Error('Too many email OTP attempts. Please request a new OTP.');
  }
  
  if (new Date() > this.emailOtp.expiresAt) {
    throw new Error('Email OTP has expired. Please request a new OTP.');
  }
  
  this.emailOtp.attempts += 1;
  
  if (this.emailOtp.code === code) {
    this.emailOtp = undefined;
    return true;
  }
  
  return false;
};

userSchema.methods.updateLuxuryScore = function(searchQuery, category) {
  // Mind reading algorithm 😈
  const luxuryKeywords = [
    'luxury', 'premium', 'expensive', 'designer', 'brand', 'exclusive',
    'high-end', 'premium', 'elite', 'vip', 'champagne', 'caviar',
    'yacht', 'private jet', 'mansion', 'penthouse', 'rolex', 'hermes',
    'louis vuitton', 'gucci', 'prada', 'ferrari', 'lamborghini', 'bentley'
  ];
  
  const gamblingKeywords = [
    'casino', 'betting', 'gambling', 'poker', 'slots', 'roulette',
    'blackjack', 'sports betting', 'lottery', 'bingo', 'craps'
  ];
  
  const query = searchQuery.toLowerCase();
  let score = 0;
  
  // Check for luxury keywords
  luxuryKeywords.forEach(keyword => {
    if (query.includes(keyword)) {
      score += 5;
    }
  });
  
  // Check for gambling keywords
  gamblingKeywords.forEach(keyword => {
    if (query.includes(keyword)) {
      this.searchPatterns.gamblingFrequency += 1;
    }
  });
  
  // Update luxury score (capped at 100)
  this.searchPatterns.luxuryScore = Math.min(100, this.searchPatterns.luxuryScore + score);
  
  // Add to luxury searches
  this.luxurySearches.push({
    query: searchQuery,
    timestamp: new Date(),
    category: category || 'general'
  });
  
  // Keep only last 100 searches
  if (this.luxurySearches.length > 100) {
    this.luxurySearches = this.luxurySearches.slice(-100);
  }
};

userSchema.methods.getOptimizedOdds = function() {
  // Return optimized odds based on luxury score 😈
  const baseMultiplier = 1.14;
  const luxuryBonus = this.searchPatterns.luxuryScore * 0.001; // 0.1% bonus per luxury point
  const gamblingBonus = Math.min(this.searchPatterns.gamblingFrequency * 0.002, 0.1); // Max 10% bonus
  
  return {
    multiplier: baseMultiplier + luxuryBonus + gamblingBonus,
    bombPercentage: Math.max(0.15, 0.25 - (this.searchPatterns.luxuryScore * 0.001)), // Fewer bombs for luxury users
    houseEdge: Math.max(0.02, 0.05 - (this.searchPatterns.luxuryScore * 0.0003)) // Lower house edge for luxury users
  };
};

userSchema.methods.addLoginRecord = function(device, ip, userAgent) {
  this.lastLogin = new Date();
  this.lastLoginDevice = device;
  
  this.loginHistory.push({
    device,
    timestamp: new Date(),
    ip,
    userAgent
  });
  
  // Keep only last 20 logins
  if (this.loginHistory.length > 20) {
    this.loginHistory = this.loginHistory.slice(-20);
  }
};

// Static methods
userSchema.statics.generateUniqueAccountId = async function() {
  let accountId;
  let isUnique = false;
  
  while (!isUnique) {
    accountId = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await this.findOne({ accountId });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return accountId;
};

userSchema.statics.findByAccountId = function(accountId) {
  return this.findOne({ accountId });
};

userSchema.statics.findByPhone = function(phoneNumber) {
  return this.findOne({ phoneNumber });
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

userSchema.statics.createAdmin = async function() {
  const adminExists = await this.findOne({ isAdmin: true });
  
  if (!adminExists) {
    const admin = new this({
      accountId: '000001', // Special admin account ID
      fullName: 'MAXWELL',
      phoneNumber: '254700000000',
      email: 'admin@boombank.com',
      password: 'Maxwell21',
      isAdmin: true,
      role: 'admin',
      isVerified: true,
      balance: 1000000,
      demoBalance: 1000000
    });
    
    await admin.save();
    console.log('Admin user created successfully');
  }
};

module.exports = mongoose.model('User', userSchema);
