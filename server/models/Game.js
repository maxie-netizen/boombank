const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    enum: ['minesweeper', 'demo'],
    default: 'minesweeper'
  },
  betAmount: {
    type: Number,
    required: true,
    min: 10
  },
  gridSize: {
    type: Number,
    default: 5
  },
  bombCount: {
    type: Number,
    required: true
  },
  revealedTiles: [{
    type: Number,
    min: 0
  }],
  bombPositions: [{
    type: Number,
    min: 0
  }],
  currentMultiplier: {
    type: Number,
    default: 1.0
  },
  maxMultiplier: {
    type: Number,
    default: 1.0
  },
  status: {
    type: String,
    enum: ['active', 'cashed_out', 'exploded', 'abandoned'],
    default: 'active'
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'pending'],
    default: 'pending'
  },
  winnings: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  // Game configuration based on user's luxury score
  gameConfig: {
    baseMultiplier: Number,
    bombPercentage: Number,
    houseEdge: Number,
    luxuryBonus: Number
  },
  // Device and session info
  device: String,
  ip: String,
  userAgent: String,
  sessionId: String,
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number, // in seconds
  // Game actions
  actions: [{
    action: {
      type: String,
      enum: ['reveal', 'cashout', 'explode']
    },
    tileIndex: Number,
    timestamp: Date,
    multiplier: Number
  }],
  // Statistics
  tilesRevealed: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'extreme'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes
gameSchema.index({ userId: 1, createdAt: -1 });
gameSchema.index({ status: 1, createdAt: -1 });
gameSchema.index({ 'actions.timestamp': 1 });

// Pre-save middleware
gameSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'active') {
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  if (this.isModified('result') && this.result === 'win') {
    this.profit = this.winnings - this.betAmount;
  } else if (this.isModified('result') && this.result === 'loss') {
    this.profit = -this.betAmount;
  }
  
  next();
});

// Instance methods
gameSchema.methods.revealTile = function(tileIndex) {
  if (this.status !== 'active') {
    throw new Error('Game is not active');
  }
  
  if (this.revealedTiles.includes(tileIndex)) {
    throw new Error('Tile already revealed');
  }
  
  if (this.bombPositions.includes(tileIndex)) {
    this.status = 'exploded';
    this.result = 'loss';
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.profit = -this.betAmount;
    
    this.actions.push({
      action: 'explode',
      tileIndex,
      timestamp: new Date(),
      multiplier: this.currentMultiplier
    });
    
    return { exploded: true, tileIndex };
  }
  
  // Safe tile revealed
  this.revealedTiles.push(tileIndex);
  this.tilesRevealed += 1;
  
  // Calculate new multiplier
  const safeTiles = this.gridSize * this.gridSize - this.bombCount;
  const remainingSafeTiles = safeTiles - this.tilesRevealed;
  
  if (remainingSafeTiles > 0) {
    // Calculate multiplier based on remaining safe tiles and house edge
    const houseEdge = this.gameConfig.houseEdge || 0.05;
    const baseMultiplier = this.gameConfig.baseMultiplier || 1.14;
    
    // More complex multiplier calculation
    const riskFactor = this.bombCount / (this.gridSize * this.gridSize);
    const safetyFactor = remainingSafeTiles / safeTiles;
    
    this.currentMultiplier = parseFloat((baseMultiplier + (safetyFactor * 0.5) - (riskFactor * 0.3)).toFixed(2));
    
    if (this.currentMultiplier > this.maxMultiplier) {
      this.maxMultiplier = this.currentMultiplier;
    }
  }
  
  this.actions.push({
    action: 'reveal',
    tileIndex,
    timestamp: new Date(),
    multiplier: this.currentMultiplier
  });
  
  return { 
    exploded: false, 
    tileIndex, 
    multiplier: this.currentMultiplier,
    remainingSafeTiles: safeTiles - this.tilesRevealed
  };
};

gameSchema.methods.cashOut = function() {
  if (this.status !== 'active') {
    throw new Error('Game is not active');
  }
  
  if (this.tilesRevealed === 0) {
    throw new Error('Cannot cash out without revealing any tiles');
  }
  
  this.status = 'cashed_out';
  this.result = 'win';
  this.winnings = this.betAmount * this.currentMultiplier;
  this.profit = this.winnings - this.betAmount;
  this.endedAt = new Date();
  this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  
  this.actions.push({
    action: 'cashout',
    tileIndex: null,
    timestamp: new Date(),
    multiplier: this.currentMultiplier
  });
  
  return {
    success: true,
    winnings: this.winnings,
    profit: this.profit,
    multiplier: this.currentMultiplier
  };
};

gameSchema.methods.calculateRiskLevel = function() {
  const bombPercentage = this.bombCount / (this.gridSize * this.gridSize);
  
  if (bombPercentage <= 0.2) {
    this.riskLevel = 'low';
  } else if (bombPercentage <= 0.3) {
    this.riskLevel = 'medium';
  } else if (bombPercentage <= 0.4) {
    this.riskLevel = 'high';
  } else {
    this.riskLevel = 'extreme';
  }
  
  return this.riskLevel;
};

// Static methods
gameSchema.statics.getActiveGames = function(userId) {
  return this.find({ userId, status: 'active' }).sort({ createdAt: -1 });
};

gameSchema.statics.getGameHistory = function(userId, limit = 50) {
  return this.find({ userId, status: { $ne: 'active' } })
    .sort({ createdAt: -1 })
    .limit(limit);
};

gameSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalBets: { $sum: '$betAmount' },
        totalWinnings: { $sum: '$winnings' },
        totalProfit: { $sum: '$profit' },
        wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
        biggestWin: { $max: '$winnings' },
        biggestLoss: { $min: '$profit' },
        averageBet: { $avg: '$betAmount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalGames: 0,
    totalBets: 0,
    totalWinnings: 0,
    totalProfit: 0,
    wins: 0,
    losses: 0,
    biggestWin: 0,
    biggestLoss: 0,
    averageBet: 0
  };
};

gameSchema.statics.getGlobalStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalBets: { $sum: '$betAmount' },
        totalWinnings: { $sum: '$winnings' },
        totalProfit: { $sum: '$profit' },
        activeGames: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completedGames: { $sum: { $cond: [{ $ne: ['$status', 'active'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalGames: 0,
    totalBets: 0,
    totalWinnings: 0,
    totalProfit: 0,
    activeGames: 0,
    completedGames: 0
  };
};

module.exports = mongoose.model('Game', gameSchema);
