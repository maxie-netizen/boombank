const cron = require('node-cron');
const mpesaService = require('./mpesa');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class CronService {
  constructor() {
    this.isRunning = false;
  }

  // Start all cron jobs
  start() {
    if (this.isRunning) {
      console.log('Cron service is already running');
      return;
    }

    console.log('Starting cron service...');

    // Process pending transactions every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      await this.processPendingTransactions();
    }, {
      scheduled: true,
      timezone: "Africa/Nairobi"
    });

    // Clean up old failed transactions daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldTransactions();
    }, {
      scheduled: true,
      timezone: "Africa/Nairobi"
    });

    // Process stuck transactions every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.processStuckTransactions();
    }, {
      scheduled: true,
      timezone: "Africa/Nairobi"
    });

    this.isRunning = true;
    console.log('Cron service started successfully');
  }

  // Stop all cron jobs
  stop() {
    if (!this.isRunning) {
      console.log('Cron service is not running');
      return;
    }

    cron.getTasks().forEach(task => {
      task.stop();
    });

    this.isRunning = false;
    console.log('Cron service stopped');
  }

  // Process pending transactions
  async processPendingTransactions() {
    try {
      console.log('Processing pending transactions...');
      
      const result = await mpesaService.processPendingTransactions();
      
      if (result.success && result.processed > 0) {
        console.log(`Processed ${result.processed} pending transactions`);
      }
    } catch (error) {
      console.error('Error processing pending transactions:', error.message);
    }
  }

  // Clean up old failed transactions
  async cleanupOldTransactions() {
    try {
      console.log('Cleaning up old failed transactions...');
      
      // Find transactions older than 7 days with failed status
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await Transaction.updateMany(
        {
          status: 'failed',
          createdAt: { $lt: cutoffDate }
        },
        {
          $set: { status: 'cancelled' }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Cleaned up ${result.modifiedCount} old failed transactions`);
      }
    } catch (error) {
      console.error('Error cleaning up old transactions:', error.message);
    }
  }

  // Process stuck transactions (pending for more than 1 hour)
  async processStuckTransactions() {
    try {
      console.log('Processing stuck transactions...');
      
      // Find transactions pending for more than 1 hour
      const cutoffDate = new Date(Date.now() - 60 * 60 * 1000);
      
      const stuckTransactions = await Transaction.find({
        status: { $in: ['pending', 'processing'] },
        createdAt: { $lt: cutoffDate }
      });

      for (const transaction of stuckTransactions) {
        try {
          // Query M-Pesa for latest status
          const status = await mpesaService.queryTransactionStatus(
            transaction.mpesaDetails.checkoutRequestId
          );

          if (status.ResultCode === '0') {
            // Transaction completed - process it
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
          } else if (status.ResultCode !== '103') { // 103 = timeout, keep pending
            // Transaction failed - mark as failed
            transaction.markAsFailed(`Stuck transaction: ${status.ResultDesc}`);
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
        } catch (error) {
          console.error(`Error processing stuck transaction ${transaction._id}:`, error.message);
          
          // Increment retry count
          transaction.incrementRetryCount();
          await transaction.save();
        }
      }

      if (stuckTransactions.length > 0) {
        console.log(`Processed ${stuckTransactions.length} stuck transactions`);
      }
    } catch (error) {
      console.error('Error processing stuck transactions:', error.message);
    }
  }

  // Manual trigger for processing pending transactions
  async triggerPendingTransactions() {
    try {
      console.log('Manually triggering pending transactions processing...');
      await this.processPendingTransactions();
      return { success: true, message: 'Pending transactions processing triggered' };
    } catch (error) {
      console.error('Manual trigger error:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Manual trigger for cleanup
  async triggerCleanup() {
    try {
      console.log('Manually triggering cleanup...');
      await this.cleanupOldTransactions();
      return { success: true, message: 'Cleanup triggered' };
    } catch (error) {
      console.error('Manual cleanup error:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Get cron service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new CronService();
