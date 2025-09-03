const axios = require('axios');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class MpesaService {
  constructor() {
    this.baseURL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.timeoutURL = process.env.MPESA_TIMEOUT_URL;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
    this.partyA = process.env.MPESA_PARTY_A;
    this.partyB = process.env.MPESA_PARTY_B;
    this.accountReference = process.env.MPESA_ACCOUNT_REFERENCE || 'BOOMBANK';
    this.transactionDesc = process.env.MPESA_TRANSACTION_DESC || 'BoomBank Payment';
    
    // Token management
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate access token
  async generateAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000); // 5 min buffer
      
      return this.accessToken;
    } catch (error) {
      console.error('Error generating access token:', error.message);
      throw new Error('Failed to generate M-Pesa access token');
    }
  }

  // Generate timestamp
  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Generate password for STK push
  generatePassword() {
    const timestamp = this.generateTimestamp();
    const password = `${this.shortcode}${this.passkey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  // Initiate STK push for deposit
  async initiateSTKPush(phoneNumber, amount, userId, description = '') {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      // Format phone number (remove + and add 254 if needed)
      let formattedPhone = phoneNumber.replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: this.accountReference,
        TransactionDesc: description || this.transactionDesc
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ResponseCode === '0') {
        // Create transaction record
        const transaction = new Transaction({
          user: userId,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          mpesaDetails: {
            phoneNumber: phoneNumber,
            checkoutRequestId: response.data.CheckoutRequestID,
            merchantRequestId: response.data.MerchantRequestID
          },
          netAmount: amount,
          description: description || 'Deposit via M-Pesa'
        });

        await transaction.save();

        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          transactionId: transaction._id,
          message: 'STK push sent successfully. Please check your phone to complete the payment.'
        };
      } else {
        throw new Error(`STK push failed: ${response.data.ResponseDescription}`);
      }
    } catch (error) {
      console.error('STK push error:', error.message);
      throw new Error(`Failed to initiate STK push: ${error.message}`);
    }
  }

  // Initiate STK push for withdrawal
  async initiateWithdrawal(phoneNumber, amount, userId, description = '') {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      // Format phone number
      let formattedPhone = phoneNumber.replace(/^\+/, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      const requestBody = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'BusinessPayment',
        Amount: Math.round(amount),
        PartyA: this.shortcode,
        PartyB: formattedPhone,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: this.accountReference,
        TransactionDesc: description || 'Withdrawal from BoomBank'
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/b2c/v1/paymentrequest`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ResponseCode === '0') {
        // Create transaction record
        const transaction = new Transaction({
          user: userId,
          type: 'withdrawal',
          amount: amount,
          status: 'pending',
          mpesaDetails: {
            phoneNumber: phoneNumber,
            checkoutRequestId: response.data.CheckoutRequestID,
            merchantRequestId: response.data.MerchantRequestID
          },
          netAmount: amount,
          description: description || 'Withdrawal via M-Pesa'
        });

        await transaction.save();

        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          transactionId: transaction._id,
          message: 'Withdrawal initiated successfully. Please check your phone to complete the transaction.'
        };
      } else {
        throw new Error(`Withdrawal failed: ${response.data.ResponseDescription}`);
      }
    } catch (error) {
      console.error('Withdrawal error:', error.message);
      throw new Error(`Failed to initiate withdrawal: ${error.message}`);
    }
  }

  // Handle STK push callback
  async handleSTKPushCallback(callbackData) {
    try {
      const {
        Body: {
          stkCallback: {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            Amount,
            MpesaReceiptNumber,
            TransactionDate
          }
        }
      } = callbackData;

      // Find transaction by checkout request ID
      const transaction = await Transaction.findByCheckoutId(CheckoutRequestID);
      if (!transaction) {
        console.error('Transaction not found for checkout ID:', CheckoutRequestID);
        return { success: false, message: 'Transaction not found' };
      }

      if (ResultCode === '0') {
        // Success - update transaction and user balance
        transaction.markAsCompleted({
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          amount: Amount,
          mpesaReceiptNumber: MpesaReceiptNumber,
          transactionDate: new Date(TransactionDate)
        });

        await transaction.save();

        // Update user balance
        const user = await User.findById(transaction.user);
        if (user) {
          if (transaction.type === 'deposit') {
            user.balance += transaction.amount;
          } else if (transaction.type === 'withdrawal') {
            user.balance -= transaction.amount;
          }
          await user.save();
        }

        return {
          success: true,
          message: 'Transaction completed successfully',
          transactionId: transaction._id
        };
      } else {
        // Failed - mark transaction as failed
        transaction.markAsFailed(ResultDesc);
        await transaction.save();

        return {
          success: false,
          message: `Transaction failed: ${ResultDesc}`,
          transactionId: transaction._id
        };
      }
    } catch (error) {
      console.error('STK push callback error:', error.message);
      throw new Error(`Failed to process STK push callback: ${error.message}`);
    }
  }

  // Query transaction status
  async queryTransactionStatus(checkoutRequestId) {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Transaction query error:', error.message);
      throw new Error(`Failed to query transaction status: ${error.message}`);
    }
  }

  // Get transaction history for user
  async getUserTransactions(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const transactions = await Transaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName phoneNumber');

      const total = await Transaction.countDocuments({ user: userId });

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get user transactions error:', error.message);
      throw new Error(`Failed to get user transactions: ${error.message}`);
    }
  }

  // Process pending transactions (for cron job)
  async processPendingTransactions() {
    try {
      const pendingTransactions = await Transaction.findPendingTransactions();
      
      for (const transaction of pendingTransactions) {
        try {
          const status = await this.queryTransactionStatus(transaction.mpesaDetails.checkoutRequestId);
          
          if (status.ResultCode === '0') {
            await this.handleSTKPushCallback({
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
            transaction.markAsFailed(status.ResultDesc);
            await transaction.save();
          }
        } catch (error) {
          console.error(`Error processing transaction ${transaction._id}:`, error.message);
          transaction.incrementRetryCount();
          await transaction.save();
        }
      }

      return { success: true, processed: pendingTransactions.length };
    } catch (error) {
      console.error('Process pending transactions error:', error.message);
      throw new Error(`Failed to process pending transactions: ${error.message}`);
    }
  }
}

module.exports = new MpesaService();
