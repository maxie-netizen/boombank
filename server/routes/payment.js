const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const mpesaService = require('../services/mpesa');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Validation middleware
const validateDeposit = [
  body('amount')
    .isFloat({ min: 10, max: 100000 })
    .withMessage('Amount must be between KES 10 and KES 100,000'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Description must be less than 100 characters')
];

const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 100, max: 200000 })
    .withMessage('Amount must be between KES 100 and KES 200,000'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Description must be less than 100 characters')
];

// Initiate deposit via STK push
router.post('/deposit', auth, validateDeposit, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, description } = req.body;
    const userId = req.user.id;

    // Get user details including registered phone number
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a registered phone number
    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No registered phone number found. Please update your profile first.'
      });
    }

    // Check if user has pending transactions
    const pendingTransactions = await Transaction.find({
      user: userId,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingTransactions.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You have too many pending transactions. Please wait for them to complete.'
      });
    }

    // Initiate STK push using user's registered phone number
    const result = await mpesaService.initiateSTKPush(
      user.phoneNumber,
      amount,
      userId,
      description
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        transactionId: result.transactionId,
        checkoutRequestId: result.checkoutRequestId,
        amount,
        phoneNumber: user.phoneNumber,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Deposit error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate deposit'
    });
  }
});

// Initiate withdrawal
router.post('/withdraw', auth, validateWithdrawal, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, description } = req.body;
    const userId = req.user.id;

    // Get user details including registered phone number
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a registered phone number
    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No registered phone number found. Please update your profile first.'
      });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for withdrawal'
      });
    }

    // Check if user has pending transactions
    const pendingTransactions = await Transaction.find({
      user: userId,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingTransactions.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'You have too many pending transactions. Please wait for them to complete.'
      });
    }

    // Check withdrawal limits
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is KES 100'
      });
    }

    if (amount > 200000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum withdrawal amount is KES 200,000'
      });
    }

    // Check user's withdrawal limit
    if (amount > user.paymentSettings.withdrawalLimit) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal amount exceeds your limit of KES ${user.paymentSettings.withdrawalLimit.toLocaleString()}`
      });
    }

    // Initiate withdrawal using user's registered phone number
    const result = await mpesaService.initiateWithdrawal(
      user.phoneNumber,
      amount,
      userId,
      description
    );

    // Deduct amount from user balance immediately
    user.balance -= amount;
    await user.save();

    res.json({
      success: true,
      message: result.message,
      data: {
        transactionId: result.transactionId,
        checkoutRequestId: result.checkoutRequestId,
        amount,
        phoneNumber: user.phoneNumber,
        status: 'pending',
        newBalance: user.balance
      }
    });

  } catch (error) {
    console.error('Withdrawal error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate withdrawal'
    });
  }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const userId = req.user.id;

    let query = { user: userId };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'fullName phoneNumber');

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Get transaction by ID
router.get('/transactions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId
    }).populate('user', 'fullName phoneNumber');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Get transaction error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction'
    });
  }
});

// Check transaction status
router.get('/transactions/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'pending' || transaction.status === 'processing') {
      // Query M-Pesa for latest status
      try {
        const status = await mpesaService.queryTransactionStatus(
          transaction.mpesaDetails.checkoutRequestId
        );
        
        // Update transaction if status changed
        if (status.ResultCode === '0' && transaction.status !== 'completed') {
          await mpesaService.handleSTKPushCallback({
            Body: {
              stkCallback: {
                CheckoutRequestID: transaction.mpesaDetails.checkoutRequestId,
                ResultCode: status.ResultCode,
                ResultDesc: status.ResultDesc,
                Amount: status.Amount,
                MpesaReceiptNumber: status.MpesaReceiptNumber,
                TransactionDate: status.TransactionDate
              }
            }
          });
          
          // Refresh transaction data
          await transaction.populate('user', 'fullName phoneNumber');
        }
      } catch (mpesaError) {
        console.error('M-Pesa status query error:', mpesaError.message);
        // Continue with current transaction status
      }
    }

    res.json({
      success: true,
      data: {
        id: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
        type: transaction.type,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        mpesaDetails: transaction.mpesaDetails
      }
    });

  } catch (error) {
    console.error('Check transaction status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check transaction status'
    });
  }
});

// Cancel pending transaction
router.post('/transactions/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId,
      status: { $in: ['pending', 'processing'] }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or cannot be cancelled'
      });
    }

    // Cancel transaction
    transaction.status = 'cancelled';
    await transaction.save();

    // Refund withdrawal amount if it was a withdrawal
    if (transaction.type === 'withdrawal') {
      const user = await User.findById(userId);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Transaction cancelled successfully',
      data: {
        id: transaction._id,
        status: transaction.status,
        refundedAmount: transaction.type === 'withdrawal' ? transaction.amount : 0
      }
    });

  } catch (error) {
    console.error('Cancel transaction error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transaction'
    });
  }
});

// M-Pesa callback endpoint (public, no auth required)
router.post('/mpesa/callback', async (req, res) => {
  try {
    console.log('M-Pesa callback received:', JSON.stringify(req.body, null, 2));

    // Handle STK push callback
    const result = await mpesaService.handleSTKPushCallback(req.body);

    if (result.success) {
      res.json({
        ResultCode: '0',
        ResultDesc: 'Success'
      });
    } else {
      res.json({
        ResultCode: '1',
        ResultDesc: 'Failed'
      });
    }

  } catch (error) {
    console.error('M-Pesa callback error:', error.message);
    res.json({
      ResultCode: '1',
      ResultDesc: 'Error processing callback'
    });
  }
});

// M-Pesa timeout callback
router.post('/mpesa/timeout', async (req, res) => {
  try {
    console.log('M-Pesa timeout callback received:', JSON.stringify(req.body, null, 2));

    // Handle timeout - mark transaction as failed
    const { Body: { stkCallback: { CheckoutRequestID } } } = req.body;
    
    const transaction = await Transaction.findByCheckoutId(CheckoutRequestID);
    if (transaction) {
      transaction.markAsFailed('Transaction timed out');
      await transaction.save();

      // Refund withdrawal amount if it was a withdrawal
      if (transaction.type === 'withdrawal') {
        const user = await User.findById(transaction.user);
        if (user) {
          user.balance += transaction.amount;
          await user.save();
        }
      }
    }

    res.json({
      ResultCode: '0',
      ResultDesc: 'Timeout handled'
    });

  } catch (error) {
    console.error('M-Pesa timeout callback error:', error.message);
    res.json({
      ResultCode: '1',
      ResultDesc: 'Error handling timeout'
    });
  }
});

module.exports = router;
