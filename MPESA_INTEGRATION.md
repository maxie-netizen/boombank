# 💳 M-Pesa STK Push Integration Guide

## Overview
BoomBank now features a comprehensive M-Pesa STK Push integration using the Safaricom Daraja API. This system handles deposits and withdrawals automatically using users' registered phone numbers, with robust transaction tracking and admin monitoring capabilities.

## 🚀 Features

### Core Payment Features
- **Automatic Phone Number Detection**: Uses user's registered phone number from database
- **STK Push for Deposits**: Instant M-Pesa push notifications for deposits
- **B2C Withdrawals**: Direct bank-to-customer withdrawals
- **Transaction History**: Complete audit trail of all transactions
- **Real-time Status Updates**: Live transaction status monitoring
- **Automatic Balance Updates**: Seamless balance synchronization

### Security & Compliance
- **Input Validation**: Comprehensive amount and data validation
- **Rate Limiting**: Protection against abuse and spam
- **Transaction Limits**: Enforced deposit/withdrawal limits
- **Audit Logging**: Complete transaction history for compliance
- **Admin Monitoring**: Full admin oversight of all transactions

### User Experience
- **No Phone Input Required**: System automatically uses registered number
- **Instant Feedback**: Real-time transaction status updates
- **Error Handling**: Clear error messages and validation feedback
- **Responsive UI**: Mobile-friendly payment modals
- **Transaction Cancellation**: Ability to cancel pending transactions

## 🔧 Setup Requirements

### 1. Safaricom Daraja API Account
- Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- Create a new app and get your credentials
- Set up callback URLs for your domain

### 2. Required API Credentials
- Consumer Key
- Consumer Secret
- Passkey
- Shortcode
- Business Shortcode
- Party A (your business number)
- Party B (your business number)

### 3. Environment Variables
```bash
# M-Pesa Configuration
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_BUSINESS_SHORTCODE=your_mpesa_business_shortcode
MPESA_PARTY_A=your_mpesa_party_a
MPESA_PARTY_B=your_mpesa_party_b
MPESA_CALLBACK_URL=https://yourdomain.com/api/payment/mpesa/callback
MPESA_TIMEOUT_URL=https://yourdomain.com/api/payment/mpesa/timeout
MPESA_ACCOUNT_REFERENCE=BOOMBANK
MPESA_TRANSACTION_DESC=BoomBank Payment
```

## 📱 How It Works

### 1. Deposit Flow
1. User initiates deposit (no phone number input required)
2. System retrieves user's registered phone number from database
3. M-Pesa STK push is sent to user's phone
4. User enters M-Pesa PIN when prompted
5. Transaction is processed and balance updated
6. User receives confirmation

### 2. Withdrawal Flow
1. User initiates withdrawal (no phone number input required)
2. System validates balance and withdrawal limits
3. System retrieves user's registered phone number
4. M-Pesa B2C payment is initiated
5. Funds are sent directly to user's M-Pesa account
6. Transaction status is updated in real-time

## 🔌 API Endpoints

### Deposits
- **POST** `/api/payment/deposit`
  - Amount: KES 10 - KES 100,000
  - No phone number required (uses registered number)
  - Automatic validation and limits enforcement

### Withdrawals
- **POST** `/api/payment/withdraw`
  - Amount: KES 100 - KES 200,000
  - Balance validation
  - User withdrawal limit enforcement
  - No phone number required (uses registered number)

### Transaction History
- **GET** `/api/payment/transactions`
  - Paginated results
  - Filtering by type and status
  - Complete transaction details

### Transaction Status
- **GET** `/api/payment/transactions/:id/status`
  - Real-time status updates
  - M-Pesa API integration for live status

### Cancel Transaction
- **POST** `/api/payment/transactions/:id/cancel`
  - Cancel pending transactions
  - Automatic refund for withdrawals

### M-Pesa Callbacks
- **POST** `/api/payment/mpesa/callback` - STK push responses
- **POST** `/api/payment/mpesa/timeout` - Transaction timeouts

## 📊 Transaction Statuses

- **pending**: Transaction initiated, waiting for M-Pesa response
- **processing**: M-Pesa processing the transaction
- **completed**: Transaction successful, funds transferred
- **failed**: Transaction failed, no funds transferred
- **cancelled**: Transaction cancelled by user or system

## 🔄 Callback URLs

### STK Push Callback
- **URL**: `/api/payment/mpesa/callback`
- **Purpose**: Receives M-Pesa STK push responses
- **Data**: Transaction status, receipt numbers, amounts
- **Action**: Updates transaction status and user balance

### Timeout Callback
- **URL**: `/api/payment/mpesa/timeout`
- **Purpose**: Handles transaction timeouts
- **Action**: Marks transaction as failed, refunds if necessary

## ⚙️ Cron Jobs

### Automated Transaction Processing
- **Process Pending**: Every 2 minutes - checks pending transactions
- **Cleanup Old**: Daily at 2 AM - removes old failed transactions
- **Process Stuck**: Every 10 minutes - handles stuck transactions

### Benefits
- Automatic transaction status updates
- Reduced manual intervention
- Improved user experience
- Better transaction reliability

## 🛡️ Security Features

### Input Validation
- Amount limits enforcement (KES 10-100,000 deposits, KES 100-200,000 withdrawals)
- Phone number validation (automatic from database)
- Description length limits
- Rate limiting on API endpoints

### Transaction Security
- JWT authentication required
- User-specific transaction access
- Balance validation before withdrawals
- Automatic fraud detection

### Admin Security
- Admin-only access to transaction monitoring
- Comprehensive audit logs
- User search by account ID or phone number
- Transaction history access

## 📱 Frontend Components

### PaymentModal
- **Features**: Amount input, validation, status tracking
- **UI**: Modern, responsive design with clear feedback
- **States**: Form, processing, success, error, cancellation
- **Validation**: Real-time amount validation and limits

### TransactionHistory
- **Features**: Complete transaction listing, filtering, pagination
- **Filters**: By type (deposit/withdrawal) and status
- **Details**: Full transaction information including M-Pesa receipts
- **UI**: Clean table layout with status indicators

### GameBoard Integration
- **Bet Placement**: Prompts users to place bets before revealing tiles
- **Always Visible**: Board is always displayed but inactive without bet
- **User Guidance**: Clear instructions and call-to-action buttons
- **Seamless Experience**: Integrated bet placement workflow

## 🧪 Testing

### Sandbox Testing
1. Use Safaricom sandbox credentials
2. Test with sandbox phone numbers
3. Verify callback handling
4. Test error scenarios and edge cases

### Production Testing
1. Use production Daraja API credentials
2. Test with real M-Pesa accounts
3. Verify callback URLs are accessible
4. Monitor transaction processing

## 🚨 Common Issues & Solutions

### Transaction Timeouts
- **Issue**: M-Pesa doesn't respond within timeout period
- **Solution**: Automatic timeout handling, user can retry

### Insufficient Balance
- **Issue**: User tries to withdraw more than available
- **Solution**: Real-time balance validation, clear error messages

### Phone Number Issues
- **Issue**: User has no registered phone number
- **Solution**: Profile update required before transactions

### Network Errors
- **Issue**: API calls fail due to network issues
- **Solution**: Retry mechanisms, user-friendly error messages

## 📈 Monitoring & Analytics

### Admin Dashboard
- Real-time transaction counts
- Pending deposits and withdrawals
- User activity monitoring
- System health status

### Transaction Analytics
- Success/failure rates
- Processing times
- User transaction patterns
- Revenue tracking

### Error Monitoring
- Failed transaction logging
- API error tracking
- User feedback collection
- Performance metrics

## 🔧 Configuration Options

### Transaction Limits
- **Deposits**: KES 10 - KES 100,000 (configurable)
- **Withdrawals**: KES 100 - KES 200,000 (configurable)
- **User Limits**: Per-user withdrawal limits
- **Daily Limits**: Configurable daily transaction limits

### Processing Settings
- **Auto-confirm Deposits**: Enable/disable automatic confirmation
- **Retry Attempts**: Number of retry attempts for failed transactions
- **Timeout Settings**: Transaction timeout periods
- **Callback URLs**: Configurable M-Pesa callback endpoints

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Safaricom Daraja API credentials configured
- [ ] Environment variables set correctly
- [ ] Callback URLs accessible from internet
- [ ] Database models migrated
- [ ] Cron jobs configured

### Post-deployment
- [ ] Test deposit with small amount
- [ ] Test withdrawal functionality
- [ ] Verify callback handling
- [ ] Monitor cron job execution
- [ ] Check admin dashboard access

### Production Considerations
- [ ] Use production Daraja API
- [ ] Secure callback URLs with HTTPS
- [ ] Monitor transaction logs
- [ ] Set up alerting for failures
- [ ] Regular backup of transaction data

## 📞 Support

### Technical Support
- Check server logs for detailed error information
- Verify M-Pesa API credentials and configuration
- Test callback URL accessibility
- Monitor cron job execution

### User Support
- Clear error messages for common issues
- Transaction status tracking
- Balance verification
- Phone number updates

### Admin Support
- Comprehensive user search and monitoring
- Transaction history access
- System health monitoring
- User account management

---

## 🎯 Key Benefits

1. **Seamless Integration**: No phone number input required from users
2. **Automatic Processing**: Hands-off transaction handling
3. **Comprehensive Tracking**: Complete audit trail for compliance
4. **Admin Oversight**: Full monitoring and control capabilities
5. **User Experience**: Intuitive, responsive payment interface
6. **Security**: Robust validation and fraud prevention
7. **Scalability**: Handles high transaction volumes efficiently
8. **Compliance**: Meets regulatory requirements for financial transactions

This integration provides a professional, secure, and user-friendly payment experience that enhances the overall BoomBank platform while maintaining strict security and compliance standards.
