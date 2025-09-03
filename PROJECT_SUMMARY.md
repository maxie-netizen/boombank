# 💣 BoomBank - Explosive Gaming Platform

## 🎯 Project Overview
BoomBank is a cutting-edge online gaming platform featuring a unique "minesweeper" style game where players bet money to reveal tiles on a grid, avoiding bombs to multiply their winnings. The platform combines thrilling gameplay with robust financial management and comprehensive user tracking.

## ✨ Key Features

### 🎮 Core Gaming
✅ **Minesweeper Gameplay** with customizable grid sizes and bomb counts  
✅ **Real-time Multipliers** that increase with each safe tile revealed  
✅ **Demo & Real Money Modes** for practice and actual betting  
✅ **Risk Level Management** with adjustable difficulty settings  
✅ **Game History Tracking** with detailed statistics and analytics  

### 💰 Financial Management
✅ **M-Pesa STK Push Integration** for seamless deposits and withdrawals  
✅ **Automatic Phone Number Detection** using registered user numbers  
✅ **Transaction Limits**: Deposits (KES 10-100,000), Withdrawals (KES 100-200,000)  
✅ **Real-time Balance Updates** with instant transaction processing  
✅ **Comprehensive Transaction History** with filtering and pagination  
✅ **Automatic Transaction Processing** via cron jobs and callbacks  

### 👤 User Management
✅ **Unique 6-Digit Account IDs** for easy user identification and tracking  
✅ **Enhanced User Profiles** with payment preferences and settings  
✅ **Phone Number Registration** for automatic M-Pesa transactions  
✅ **KYC Integration** with document verification system  
✅ **Login History Tracking** with device and IP monitoring  

### 🛡️ Security & Compliance
✅ **JWT Authentication** with role-based access control  
✅ **Input Validation** with comprehensive error handling  
✅ **Rate Limiting** to prevent abuse and spam  
✅ **Transaction Auditing** with complete audit trails  
✅ **Fraud Detection** with automated monitoring systems  

### 🎨 User Experience
✅ **Responsive Design** with Tailwind CSS for all devices  
✅ **Interactive Game Board** that's always visible but inactive without bets  
✅ **Bet Placement Prompts** with clear user guidance  
✅ **Payment Modals** with real-time status updates  
✅ **Transaction History** with advanced filtering and search  
✅ **Error Handling** with user-friendly messages and solutions  

### 🔍 Admin Control Panel
✅ **User Search & Monitoring** by account ID or phone number  
✅ **Transaction Oversight** with real-time status monitoring  
✅ **Game Analytics** with detailed performance metrics  
✅ **Luxury Score Analytics** for VIP management  
✅ **System Health Monitoring** with comprehensive diagnostics  
✅ **User Account Management** with blocking and verification controls  

### 📊 Analytics & Insights
✅ **Luxury Score Analytics** for VIP management  
✅ **Game Performance Metrics** with detailed statistics  
✅ **User Behavior Tracking** with search pattern analysis  
✅ **Transaction Analytics** with success rates and processing times  
✅ **Revenue Tracking** with comprehensive financial reporting  

## 🏗️ Technical Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js with middleware for security and validation
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing
- **Payment Integration**: Safaricom Daraja API for M-Pesa
- **Background Jobs**: Node-cron for automated transaction processing
- **API Validation**: Express-validator for input sanitization
- **Rate Limiting**: Flexible rate limiting with IP-based protection

### Frontend (Next.js/React)
- **Framework**: Next.js 13+ with App Router
- **UI Library**: React with TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks for local state management
- **Components**: Modular, reusable components with props validation

### Database Models
- **User Model**: Enhanced with payment settings and account IDs
- **Transaction Model**: Comprehensive M-Pesa transaction tracking
- **Game Model**: Complete game state and history management
- **Indexing**: Optimized database queries with proper indexing

### Payment System
- **M-Pesa Integration**: STK push for deposits, B2C for withdrawals
- **Callback Handling**: Automatic transaction status updates
- **Error Recovery**: Retry mechanisms and timeout handling
- **Transaction Limits**: Enforced deposit and withdrawal limits
- **Balance Management**: Real-time balance synchronization

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5+ 
- Safaricom Daraja API account
- Modern web browser

### Installation
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd boombank
   ```

2. **Install Dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Configure your credentials
   # - MongoDB connection string
   # - JWT secret
   # - M-Pesa Daraja API credentials
   # - Admin credentials
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   mongod
   
   # The system will automatically create required collections
   ```

5. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

## 🔧 Configuration

### M-Pesa Setup
1. **Register** at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. **Create App** and get your API credentials
3. **Configure** callback URLs in your `.env` file
4. **Test** with sandbox credentials before going live

### Payment Limits
- **Deposits**: KES 10 - KES 100,000
- **Withdrawals**: KES 100 - KES 200,000
- **User Limits**: Configurable per-user withdrawal limits
- **Daily Limits**: Configurable daily transaction limits

### Account System
- **Account IDs**: Unique 6-digit identifiers generated automatically
- **Phone Numbers**: Required for M-Pesa transactions
- **Verification**: OTP-based phone and email verification
- **Security**: Multi-factor authentication and login tracking

## 📱 User Experience

### Game Flow
1. **User Registration** with phone number and basic details
2. **Account Verification** via OTP and email confirmation
3. **Balance Management** with deposits and withdrawals
4. **Game Play** with bet placement and tile revelation
5. **Winnings Management** with automatic balance updates
6. **Transaction History** with complete audit trail

### Payment Experience
- **No Phone Input**: System automatically uses registered number
- **Instant Feedback**: Real-time transaction status updates
- **Clear Validation**: Helpful error messages and guidance
- **Easy Cancellation**: Ability to cancel pending transactions
- **Mobile Optimized**: Responsive design for all devices

## 🛡️ Security Features

### Authentication & Authorization
- **JWT Tokens** with configurable expiration
- **Role-based Access** (user, admin, moderator)
- **Session Management** with secure token storage
- **Password Security** with bcrypt hashing

### Data Protection
- **Input Validation** with comprehensive sanitization
- **SQL Injection Prevention** with Mongoose ODM
- **XSS Protection** with content security policies
- **Rate Limiting** to prevent abuse and DDoS

### Transaction Security
- **Amount Validation** with enforced limits
- **Balance Verification** before withdrawals
- **Fraud Detection** with automated monitoring
- **Audit Logging** for compliance and security

## 📊 Monitoring & Analytics

### Admin Dashboard
- **Real-time Metrics**: User counts, transaction volumes, game statistics
- **System Health**: Database status, API performance, error rates
- **User Monitoring**: Account activity, transaction patterns, security alerts
- **Financial Reports**: Revenue tracking, payment success rates, fraud detection

### User Analytics
- **Game Performance**: Win/loss ratios, average bets, profit analysis
- **Behavior Patterns**: Login frequency, game preferences, payment habits
- **Luxury Scoring**: VIP identification, spending patterns, risk assessment
- **Transaction History**: Complete audit trail with filtering and search

## 🚀 Next Steps

1. **Configure Environment**: Set up `.env` file with your credentials
2. **Configure M-Pesa**: Add your Safaricom Daraja API credentials to `.env`
3. **Start Development**: Run `npm run dev` to start both servers
4. **Test Game**: Play the demo mode to test functionality
5. **Test M-Pesa**: Use sandbox credentials to test deposits/withdrawals
6. **Admin Access**: Visit `/admin` to access admin dashboard
7. **API Testing**: Use Postman or similar to test API endpoints
8. **Customization**: Modify game logic, UI, and algorithms as needed

## 🔮 Future Enhancements

### Planned Features
- **Multi-language Support** for international users
- **Advanced Analytics** with machine learning insights
- **Mobile App** for iOS and Android
- **Social Features** with friend challenges and leaderboards
- **Tournament System** with scheduled competitions
- **Affiliate Program** with referral rewards

### Technical Improvements
- **Microservices Architecture** for better scalability
- **Real-time Notifications** with WebSocket integration
- **Advanced Caching** with Redis for performance
- **Load Balancing** for high-traffic scenarios
- **Automated Testing** with comprehensive test suites

---

## 📞 Support & Documentation

- **Technical Documentation**: See `MPESA_INTEGRATION.md` for payment setup
- **API Reference**: Comprehensive endpoint documentation
- **Admin Guide**: Control panel usage and monitoring
- **User Guide**: Game rules and payment instructions

---

**BoomBank** - Where every click could be explosive! 💣✨
