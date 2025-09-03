const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  mpesaDetails: {
    phoneNumber: String, // Now optional since it comes from user record
    transactionId: String,
    merchantRequestId: String,
    checkoutRequestId: String,
    resultCode: String,
    resultDesc: String,
    amount: Number,
    mpesaReceiptNumber: String,
    transactionDate: Date
  },
  fees: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    gameId: String,
    betAmount: Number,
    multiplier: Number,
    winnings: Number
  },
  processedAt: Date,
  failedAt: Date,
  failureReason: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ 'mpesaDetails.transactionId': 1 });
transactionSchema.index({ 'mpesaDetails.checkoutRequestId': 1 });

// Pre-save middleware
transactionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed') {
      this.processedAt = new Date();
    } else if (this.status === 'failed') {
      this.failedAt = new Date();
    }
  }
  next();
});

// Instance methods
transactionSchema.methods.markAsCompleted = function(mpesaData) {
  this.status = 'completed';
  this.mpesaDetails = {
    ...this.mpesaDetails,
    ...mpesaData
  };
  this.processedAt = new Date();
};

transactionSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failedAt = new Date();
};

transactionSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

transactionSchema.methods.incrementRetryCount = function() {
  this.retryCount += 1;
  if (this.retryCount >= this.maxRetries) {
    this.status = 'cancelled';
  }
};

// Static methods
transactionSchema.statics.findPendingTransactions = function() {
  return this.find({ 
    status: { $in: ['pending', 'processing'] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  });
};

transactionSchema.statics.findByMpesaId = function(transactionId) {
  return this.findOne({ 'mpesaDetails.transactionId': transactionId });
};

transactionSchema.statics.findByCheckoutId = function(checkoutRequestId) {
  return this.findOne({ 'mpesaDetails.checkoutRequestId': checkoutRequestId });
};

// Virtual for display amount
transactionSchema.virtual('displayAmount').get(function() {
  return this.type === 'deposit' ? this.amount : -this.amount;
});

// Virtual for transaction summary
transactionSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    status: this.status,
    createdAt: this.createdAt,
    phoneNumber: this.mpesaDetails?.phoneNumber
  };
});

// Ensure virtual fields are serialized
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);
