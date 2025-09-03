const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const adminAuth = require('../middleware/adminAuth');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Admin rate limiting
const adminLimiter = rateLimiter({
  keyGenerator: (req) => req.ip,
  points: 1000, // 1000 admin actions
  duration: 60 * 60, // 1 hour
  blockDuration: 5 * 60 // 5 minutes block
});

// Admin login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], adminLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Check admin credentials
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      { 
        userId: 'admin',
        role: 'admin',
        username: username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        username,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Get dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      totalGames,
      activeGames,
      pendingDeposits,
      pendingWithdrawals,
      globalStats
    ] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments(),
      Game.countDocuments({ status: 'active' }),
      Transaction.countDocuments({ type: 'deposit', status: { $in: ['pending', 'processing'] } }),
      Transaction.countDocuments({ type: 'withdrawal', status: { $in: ['pending', 'processing'] } }),
      Game.getGlobalStats ? Game.getGlobalStats() : Promise.resolve({})
    ]);

    res.json({
      stats: {
        totalUsers,
        totalGames,
        activeGames,
        pendingDeposits,
        pendingWithdrawals,
        ...globalStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get all users with pagination and filters
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      role = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { accountId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      if (status === 'verified') filter.isVerified = true;
      else if (status === 'unverified') filter.isVerified = false;
      else if (status === 'blocked') filter.isBlocked = true;
      else if (status === 'active') filter.isBlocked = false;
    }
    
    if (role) {
      filter.role = role;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -otp -emailOtp')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      users: users.map(user => ({
        id: user._id,
        accountId: user.accountId,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        role: user.role,
        balance: user.balance,
        demoBalance: user.demoBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        stats: user.stats,
        luxuryScore: user.searchPatterns?.luxuryScore || 0,
        gamblingFrequency: user.searchPatterns?.gamblingFrequency || 0
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Search user by account ID or phone number
router.get('/users/search/:identifier', adminAuth, async (req, res) => {
  try {
    const { identifier } = req.params;

    let user;
    
    // Try to find by account ID first (6 digits)
    if (/^\d{6}$/.test(identifier)) {
      user = await User.findByAccountId(identifier);
    }
    
    // If not found by account ID, try phone number
    if (!user) {
      user = await User.findByPhone(identifier);
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found',
        message: 'No user found with the provided account ID or phone number'
      });
    }

    // Get user's transaction history
    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get user's game history
    const gameHistory = await Game.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      user: {
        id: user._id,
        accountId: user.accountId,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        role: user.role,
        balance: user.balance,
        demoBalance: user.demoBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        lastLoginDevice: user.lastLoginDevice,
        loginHistory: user.loginHistory,
        stats: user.stats,
        preferences: user.preferences,
        kyc: user.kyc,
        luxurySearches: user.luxurySearches,
        searchPatterns: user.searchPatterns,
        paymentSettings: user.paymentSettings
      },
      transactions: transactions.map(tx => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        description: tx.description
      })),
      gameHistory: gameHistory.map(game => ({
        id: game._id,
        betAmount: game.betAmount,
        status: game.status,
        result: game.result,
        winnings: game.winnings,
        profit: game.profit,
        startedAt: game.startedAt,
        endedAt: game.endedAt
      }))
    });

  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search user',
      message: error.message 
    });
  }
});

// Get user details
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -otp -emailOtp');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's game history
    const gameHistory = await Game.find({ userId }).sort({ createdAt: -1 }).limit(50);

    // Get user's transaction history
    const transactionHistory = await Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50);

    res.json({
      user: {
        id: user._id,
        accountId: user.accountId,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        role: user.role,
        balance: user.balance,
        demoBalance: user.demoBalance,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        lastLoginDevice: user.lastLoginDevice,
        loginHistory: user.loginHistory,
        stats: user.stats,
        preferences: user.preferences,
        kyc: user.kyc,
        luxurySearches: user.luxurySearches,
        searchPatterns: user.searchPatterns,
        paymentSettings: user.paymentSettings
      },
      gameHistory: gameHistory.map(game => ({
        id: game._id,
        betAmount: game.betAmount,
        status: game.status,
        result: game.result,
        winnings: game.winnings,
        profit: game.profit,
        startedAt: game.startedAt,
        endedAt: game.endedAt
      })),
      transactionHistory: transactionHistory.map(tx => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        description: tx.description,
        mpesaDetails: tx.mpesaDetails
      }))
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Update user
router.put('/users/:userId', adminAuth, [
  body('fullName').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['user', 'admin', 'moderator']),
  body('isVerified').optional().isBoolean(),
  body('isBlocked').optional().isBoolean(),
  body('balance').optional().isFloat({ min: 0 }),
  body('demoBalance').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    Object.keys(updateData).forEach(key => {
      if (key !== 'password') { // Don't allow password update via admin
        user[key] = updateData[key];
      }
    });

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        role: user.role,
        balance: user.balance,
        demoBalance: user.demoBalance
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Block/Unblock user
router.post('/users/:userId/toggle-block', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked: user.isBlocked
    });

  } catch (error) {
    console.error('Toggle user block error:', error);
    res.status(500).json({ error: 'Failed to toggle user block' });
  }
});

// Delete user
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Delete user's games
    await Game.deleteMany({ userId });
    
    // Delete user's transactions
    await Transaction.deleteMany({ user: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all games with filters
router.get('/games', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      gameType = '',
      userId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (gameType) filter.gameType = gameType;
    if (userId) filter.userId = userId;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [games, total] = await Promise.all([
      Game.find(filter)
        .populate('userId', 'fullName phoneNumber')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Game.countDocuments(filter)
    ]);

    res.json({
      games: games.map(game => ({
        id: game._id,
        userId: game.userId,
        betAmount: game.betAmount,
        gameType: game.gameType,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        status: game.status,
        result: game.result,
        winnings: game.winnings,
        profit: game.profit,
        currentMultiplier: game.currentMultiplier,
        maxMultiplier: game.maxMultiplier,
        tilesRevealed: game.tilesRevealed,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        duration: game.duration,
        riskLevel: game.riskLevel
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// Get game details
router.get('/games/:gameId', adminAuth, async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findById(gameId)
      .populate('userId', 'fullName phoneNumber email');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      game: {
        id: game._id,
        userId: game.userId,
        betAmount: game.betAmount,
        gameType: game.gameType,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        bombPositions: game.bombPositions,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        maxMultiplier: game.maxMultiplier,
        status: game.status,
        result: game.result,
        winnings: game.winnings,
        profit: game.profit,
        tilesRevealed: game.tilesRevealed,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        duration: game.duration,
        riskLevel: game.riskLevel,
        actions: game.actions,
        gameConfig: game.gameConfig,
        device: game.device,
        ip: game.ip,
        sessionId: game.sessionId
      }
    });

  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({ error: 'Failed to get game details' });
  }
});

// Get luxury score analytics 😈
router.get('/analytics/luxury-scores', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('searchPatterns.luxuryScore searchPatterns.gamblingFrequency fullName phoneNumber')
      .sort({ 'searchPatterns.luxuryScore': -1 })
      .limit(100);

    const luxuryStats = await User.aggregate([
      {
        $group: {
          _id: null,
          avgLuxuryScore: { $avg: '$searchPatterns.luxuryScore' },
          maxLuxuryScore: { $max: '$searchPatterns.luxuryScore' },
          minLuxuryScore: { $min: '$searchPatterns.luxuryScore' },
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    res.json({
      topLuxuryUsers: users.map(user => ({
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        luxuryScore: user.searchPatterns.luxuryScore,
        gamblingFrequency: user.searchPatterns.gamblingFrequency
      })),
      stats: luxuryStats[0] || {
        avgLuxuryScore: 0,
        maxLuxuryScore: 0,
        minLuxuryScore: 0,
        totalUsers: 0
      }
    });

  } catch (error) {
    console.error('Get luxury score analytics error:', error);
    res.status(500).json({ error: 'Failed to get luxury score analytics' });
  }
});

// Get system health
router.get('/health', adminAuth, async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;
