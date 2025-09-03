const express = require('express');
const { body, validationResult } = require('express-validator');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { rateLimiter } = require('../middleware/middleware/rateLimiter');

const router = express.Router();

// Rate limiting for game actions
const gameLimiter = rateLimiter({
  keyGenerator: (req) => req.user.userId,
  points: 100, // 100 game actions
  duration: 60 * 60, // 1 hour
  blockDuration: 15 * 60 // 15 minutes block
});

// Start new game
router.post('/start', [
  body('betAmount').isFloat({ min: 10, max: 10000 }).withMessage('Bet amount must be between $10 and $10,000'),
  body('gridSize').optional().isInt({ min: 3, max: 10 }).withMessage('Grid size must be between 3 and 10'),
  body('gameType').optional().isIn(['minesweeper', 'demo']).withMessage('Invalid game type')
], auth, gameLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { betAmount, gridSize = 5, gameType = 'minesweeper' } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check balance
    const balance = gameType === 'demo' ? user.demoBalance : user.balance;
    if (balance < betAmount) {
      return res.status(400).json({ 
        error: `Insufficient ${gameType === 'demo' ? 'demo ' : ''}balance` 
      });
    }

    // Apply mind-reading algorithm for optimized odds 😈
    const optimizedOdds = user.getOptimizedOdds();
    
    // Calculate bomb count based on user's luxury score
    const baseBombPercentage = optimizedOdds.bombPercentage;
    const totalTiles = gridSize * gridSize;
    const bombCount = Math.floor(totalTiles * baseBombPercentage);

    // Place bombs randomly
    const bombPositions = [];
    while (bombPositions.length < bombCount) {
      const randomIndex = Math.floor(Math.random() * totalTiles);
      if (!bombPositions.includes(randomIndex)) {
        bombPositions.push(randomIndex);
      }
    }

    // Create game
    const game = new Game({
      userId,
      gameType,
      betAmount,
      gridSize,
      bombCount,
      bombPositions,
      gameConfig: {
        baseMultiplier: optimizedOdds.multiplier,
        bombPercentage: baseBombPercentage,
        houseEdge: optimizedOdds.houseEdge,
        luxuryBonus: user.searchPatterns.luxuryScore
      },
      device: req.headers['user-agent'] || 'Unknown',
      ip: req.ip,
      sessionId: req.sessionID || 'unknown'
    });

    // Calculate risk level
    game.calculateRiskLevel();

    // Deduct bet amount
    if (gameType === 'demo') {
      user.demoBalance -= betAmount;
    } else {
      user.balance -= betAmount;
    }

    await Promise.all([game.save(), user.save()]);

    res.json({
      message: 'Game started successfully',
      game: {
        id: game._id,
        betAmount: game.betAmount,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        currentMultiplier: game.currentMultiplier,
        status: game.status,
        riskLevel: game.riskLevel,
        gameConfig: {
          baseMultiplier: game.gameConfig.baseMultiplier,
          bombPercentage: game.gameConfig.bombPercentage,
          houseEdge: game.gameConfig.houseEdge
        }
      }
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Reveal tile
router.post('/reveal', [
  body('gameId').isMongoId().withMessage('Invalid game ID'),
  body('tileIndex').isInt({ min: 0 }).withMessage('Invalid tile index')
], auth, gameLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId, tileIndex } = req.body;
    const userId = req.user.userId;

    const game = await Game.findOne({ _id: gameId, userId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Reveal tile
    const result = game.revealTile(tileIndex);
    
    if (result.exploded) {
      // Game over - user lost
      await game.save();
      
      // Update user stats
      const user = await User.findById(userId);
      if (user) {
        user.stats.totalGames += 1;
        user.stats.totalLosses += 1;
        user.stats.totalBets += game.betAmount;
        await user.save();
      }

      res.json({
        message: 'Game over - you hit a bomb!',
        game: {
          id: game._id,
          status: game.status,
          result: game.result,
          profit: game.profit,
          bombPositions: game.bombPositions,
          revealedTiles: game.revealedTiles
        }
      });
    } else {
      // Safe tile revealed
      await game.save();
      
      res.json({
        message: 'Safe tile revealed',
        game: {
          id: game._id,
          currentMultiplier: game.currentMultiplier,
          maxMultiplier: game.maxMultiplier,
          tilesRevealed: game.tilesRevealed,
          remainingSafeTiles: result.remainingSafeTiles,
          status: game.status
        }
      });
    }

  } catch (error) {
    console.error('Reveal tile error:', error);
    res.status(500).json({ error: 'Failed to reveal tile' });
  }
});

// Cash out
router.post('/cashout', [
  body('gameId').isMongoId().withMessage('Invalid game ID')
], auth, gameLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId } = req.body;
    const userId = req.user.userId;

    const game = await Game.findOne({ _id: gameId, userId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Cash out
    const result = game.cashOut();
    
    // Update user balance and stats
    const user = await User.findById(userId);
    if (user) {
      if (game.gameType === 'demo') {
        user.demoBalance += result.winnings;
      } else {
        user.balance += result.winnings;
      }
      
      user.stats.totalGames += 1;
      user.stats.totalWins += 1;
      user.stats.totalBets += game.betAmount;
      user.stats.totalWinnings += result.winnings;
      
      if (result.winnings > user.stats.biggestWin) {
        user.stats.biggestWin = result.winnings;
      }
      
      await user.save();
    }

    await game.save();

    res.json({
      message: 'Cash out successful!',
      game: {
        id: game._id,
        status: game.status,
        result: game.result,
        winnings: result.winnings,
        profit: result.profit,
        multiplier: result.multiplier,
        duration: game.duration
      }
    });

  } catch (error) {
    console.error('Cash out error:', error);
    res.status(500).json({ error: 'Failed to cash out' });
  }
});

// Get active games
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const activeGames = await Game.getActiveGames(userId);
    
    res.json({
      activeGames: activeGames.map(game => ({
        id: game._id,
        betAmount: game.betAmount,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        currentMultiplier: game.currentMultiplier,
        maxMultiplier: game.maxMultiplier,
        tilesRevealed: game.tilesRevealed,
        status: game.status,
        startedAt: game.startedAt,
        riskLevel: game.riskLevel
      }))
    });
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Failed to get active games' });
  }
});

// Get game history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const games = await Game.find({ userId, status: { $ne: 'active' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Game.countDocuments({ userId, status: { $ne: 'active' } });
    
    res.json({
      games: games.map(game => ({
        id: game._id,
        betAmount: game.betAmount,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        status: game.status,
        result: game.result,
        winnings: game.winnings,
        profit: game.profit,
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
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
});

// Get game details
router.get('/:gameId', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const game = await Game.findOne({ _id: gameId, userId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      game: {
        id: game._id,
        betAmount: game.betAmount,
        gridSize: game.gridSize,
        bombCount: game.bombCount,
        bombPositions: game.status !== 'active' ? game.bombPositions : [],
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
        gameConfig: game.gameConfig
      }
    });
  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({ error: 'Failed to get game details' });
  }
});

// Abandon game
router.post('/abandon', [
  body('gameId').isMongoId().withMessage('Invalid game ID')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId } = req.body;
    const userId = req.user.userId;

    const game = await Game.findOne({ _id: gameId, userId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Abandon game
    game.status = 'abandoned';
    game.result = 'loss';
    game.profit = -game.betAmount;
    game.endedAt = new Date();
    game.duration = Math.floor((game.endedAt - game.startedAt) / 1000);

    // Refund partial amount based on tiles revealed
    const refundPercentage = game.tilesRevealed / (game.gridSize * game.gridSize - game.bombCount);
    const refundAmount = Math.floor(game.betAmount * refundPercentage * 0.5); // 50% of proportional amount

    // Update user balance
    const user = await User.findById(userId);
    if (user) {
      if (game.gameType === 'demo') {
        user.demoBalance += refundAmount;
      } else {
        user.balance += refundAmount;
      }
      
      user.stats.totalGames += 1;
      user.stats.totalLosses += 1;
      user.stats.totalBets += game.betAmount;
      await user.save();
    }

    await game.save();

    res.json({
      message: 'Game abandoned',
      game: {
        id: game._id,
        status: game.status,
        result: game.result,
        profit: game.profit,
        refundAmount,
        duration: game.duration
      }
    });

  } catch (error) {
    console.error('Abandon game error:', error);
    res.status(500).json({ error: 'Failed to abandon game' });
  }
});

// Get user stats
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await Game.getUserStats(userId);
    
    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Track user search behavior for mind-reading algorithm 😈
router.post('/track-search', [
  body('query').trim().notEmpty().withMessage('Search query is required'),
  body('category').optional().isString().withMessage('Category must be a string')
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { query, category = 'general' } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update luxury score based on search query
    user.updateLuxuryScore(query, category);
    await user.save();

    res.json({ 
      message: 'Search tracked successfully',
      currentLuxuryScore: user.searchPatterns.luxuryScore,
      gamblingFrequency: user.searchPatterns.gamblingFrequency
    });

  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

// Get optimized odds for user
router.get('/odds/optimized', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const optimizedOdds = user.getOptimizedOdds();
    
    res.json({
      odds: optimizedOdds,
      userProfile: {
        luxuryScore: user.searchPatterns.luxuryScore,
        gamblingFrequency: user.searchPatterns.gamblingFrequency,
        highValueInterests: user.searchPatterns.highValueInterests
      }
    });

  } catch (error) {
    console.error('Get optimized odds error:', error);
    res.status(500).json({ error: 'Failed to get optimized odds' });
  }
});

module.exports = router;
