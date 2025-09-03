# 💣 BoomBank - Advanced Minesweeper Betting Game

A comprehensive, full-stack minesweeper betting game with advanced features including OTP authentication, mind-reading algorithms, admin dashboard, and API endpoints for external integrations.

## 🚀 Features

### 🎮 Core Game Features
- **Minesweeper Gameplay**: Classic 5x5 grid with configurable bomb counts
- **Real-time Multiplayer**: Socket.IO integration for live game updates
- **Demo & Real Money Modes**: Play with virtual money or real stakes
- **Dynamic Odds**: Mind-reading algorithm optimizes odds based on user behavior 😈
- **Risk Levels**: Low, medium, high, and extreme risk configurations

### 🔐 Advanced Authentication
- **SMS OTP**: Primary authentication via SMS (Twilio integration)
- **Email Fallback**: Automatic fallback to email when SMS fails
- **2-Hour OTP Validity**: Secure time-limited verification codes
- **Rate Limiting**: Protection against brute force attacks
- **Device Tracking**: Monitor login attempts and device history
- **Account Lockout**: Automatic protection after failed attempts

### 🧠 Mind-Reading Algorithm 😈
- **Luxury Score Tracking**: Monitor user search patterns and interests
- **Behavioral Analysis**: Track gambling frequency and high-value interests
- **Optimized Odds**: Adjust game difficulty and payouts based on user profile
- **Search Pattern Analysis**: Real-time scoring of luxury and gambling keywords
- **Fair Play**: Maintains balance while providing personalized experience

### 👑 Admin Dashboard
- **Full CRUD Operations**: Complete user and game management
- **Real-time Analytics**: Live statistics and monitoring
- **User Management**: Block/unblock, role assignment, balance adjustments
- **Game Monitoring**: Track active games, results, and suspicious activity
- **Luxury Score Analytics**: View user behavior patterns and scores
- **System Health**: Monitor database, server status, and performance

### 🔌 API Integration
- **RESTful API**: Complete backend API for mobile apps
- **External Game Integration**: APIs for gambling sites and third-party platforms
- **WebSocket Support**: Real-time communication for live games
- **Rate Limiting**: API protection and usage monitoring
- **Documentation**: Comprehensive API documentation and examples

### 💰 Payment & Banking
- **M-Pesa Integration**: Local payment processing
- **Deposit/Withdrawal**: Secure money handling
- **Transaction Logging**: Complete audit trail
- **Balance Management**: Real-time balance updates
- **KYC Support**: User verification and document management

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Socket.IO Client**: Real-time communication
- **React Hooks**: Custom hooks for state management

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **Socket.IO**: Real-time bidirectional communication
- **JWT**: JSON Web Token authentication

### Services
- **Twilio**: SMS OTP delivery
- **Nodemailer**: Email OTP fallback
- **bcryptjs**: Password hashing
- **Rate Limiting**: API protection and abuse prevention

## 📁 Project Structure

```
boombank/
├── app/                    # Next.js app directory
├── components/            # React components
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── lib/                  # Utility libraries
├── server/               # Backend server
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── services/        # Business logic services
├── middleware/           # Next.js middleware
├── services/             # Frontend services
└── public/              # Static assets
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- Twilio account (for SMS)
- Gmail account (for email fallback)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/boombank.git
cd boombank
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/boombank

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# Admin Default Credentials
ADMIN_USERNAME=MAXWELL
ADMIN_PASSWORD=Maxwell21
```

### 4. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:client    # Frontend (Next.js)
npm run dev:server    # Backend (Express)
```

### 5. Access Applications
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/api/admin
- **Health Check**: http://localhost:5000/api/health

## 🎮 Game Rules

### Basic Gameplay
1. **Place Bet**: Choose your bet amount ($10 - $10,000)
2. **Grid Size**: Default 5x5 grid (configurable 3x3 to 10x10)
3. **Bomb Count**: Dynamic based on bet amount and user profile
4. **Reveal Tiles**: Click tiles to reveal safe spaces
5. **Multiplier**: Increases with each safe tile revealed
6. **Cash Out**: Collect winnings before hitting a bomb
7. **Game Over**: Hit a bomb and lose your bet

### Mind-Reading Algorithm 😈
- **Luxury Keywords**: Track searches for expensive items, brands, services
- **Gambling Patterns**: Monitor gambling-related search frequency
- **Score Calculation**: 0-100 luxury score with real-time updates
- **Odds Optimization**: Fewer bombs, better multipliers for high-value users
- **Fair Balance**: Maintains house edge while personalizing experience

## 🔐 Authentication Flow

### Registration
1. User provides name, phone, password, email (optional)
2. System generates 6-digit OTP
3. OTP sent via SMS (primary) or email (fallback)
4. User verifies OTP within 2 hours
5. Account activated and JWT token issued

### Login
1. User provides phone and password
2. System generates new 6-digit OTP
3. OTP sent via SMS (primary) or email (fallback)
4. User verifies OTP within 2 hours
5. New JWT token issued for session

### Security Features
- **Rate Limiting**: 5 attempts per 15 minutes
- **Account Lockout**: 30-minute lock after 5 failed attempts
- **Device Tracking**: Monitor login locations and devices
- **Session Management**: JWT tokens with 7-day expiration
- **OTP Expiry**: 2-hour validity with attempt limits

## 👑 Admin Features

### Default Credentials
- **Username**: MAXWELL
- **Password**: Maxwell21

### Dashboard Capabilities
- **User Management**: View, edit, block, delete users
- **Game Monitoring**: Track active games and results
- **Analytics**: Luxury scores, gambling patterns, system health
- **Financial Control**: Balance adjustments, transaction monitoring
- **System Health**: Database status, server performance, uptime

### User Operations
- **CRUD Operations**: Complete user lifecycle management
- **Role Assignment**: User, moderator, admin roles
- **Account Control**: Block/unblock, verification management
- **Balance Management**: Adjust demo and real money balances
- **KYC Management**: Document verification and approval

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset with OTP

### Game Management
- `POST /api/game/start` - Start new game
- `POST /api/game/reveal` - Reveal tile
- `POST /api/game/cashout` - Cash out winnings
- `POST /api/game/abandon` - Abandon game
- `GET /api/game/history` - Game history
- `GET /api/game/stats/summary` - User statistics

### Admin Operations
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/games` - Game monitoring
- `GET /api/admin/analytics/luxury-scores` - Luxury score analytics

### External Integration
- `GET /api/external/game/start` - External game start
- `POST /api/external/game/action` - External game actions
- `GET /api/external/game/status` - Game status check

## 🧠 Mind-Reading Algorithm Details 😈

### Luxury Keywords
- **High-End Brands**: Rolex, Hermes, Louis Vuitton, Gucci, Prada
- **Luxury Vehicles**: Ferrari, Lamborghini, Bentley, Rolls-Royce
- **Premium Services**: Private jets, yachts, exclusive memberships
- **Expensive Items**: Champagne, caviar, mansions, penthouses

### Scoring System
- **Base Score**: 0-100 luxury score
- **Keyword Weight**: 5 points per luxury keyword match
- **Gambling Frequency**: Tracks gambling-related searches
- **Real-time Updates**: Score updates with each search

### Odds Optimization
- **Bomb Reduction**: Fewer bombs for high luxury scores
- **Multiplier Boost**: Better base multipliers for VIP users
- **House Edge Reduction**: Lower house edge for luxury users
- **Fair Balance**: Maintains overall profitability

## 🚀 Deployment

### Production Setup
1. **Environment Variables**: Configure production environment
2. **Database**: Set up production MongoDB instance
3. **Services**: Configure Twilio and email services
4. **SSL**: Enable HTTPS for production
5. **Monitoring**: Set up logging and monitoring

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d

# Or build manually
docker build -t boombank .
docker run -p 5000:5000 boombank
```

### Cloud Deployment
- **Vercel**: Frontend deployment
- **Railway/Heroku**: Backend deployment
- **MongoDB Atlas**: Database hosting
- **Twilio**: SMS service

## 🔒 Security Features

### Data Protection
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Security**: Secure token generation and validation
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Mongoose ODM protection
- **XSS Prevention**: Helmet.js security headers

### Rate Limiting
- **API Protection**: Configurable rate limits per endpoint
- **IP-based Limiting**: Prevent abuse from single sources
- **User-based Limiting**: Prevent individual user abuse
- **Dynamic Adjustments**: Adaptive limits based on behavior

### Authentication Security
- **OTP Expiry**: Time-limited verification codes
- **Attempt Limits**: Maximum OTP verification attempts
- **Device Tracking**: Monitor suspicious login patterns
- **Session Management**: Secure token handling

## 📊 Monitoring & Analytics

### System Metrics
- **Performance Monitoring**: Response times and throughput
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Behavior patterns and preferences
- **Game Statistics**: Win rates, bet patterns, profitability

### Business Intelligence
- **Luxury Score Analytics**: User value assessment
- **Gambling Pattern Analysis**: Risk assessment and optimization
- **Revenue Tracking**: Real-time profit/loss monitoring
- **User Segmentation**: VIP identification and management

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow TypeScript and ESLint standards
2. **Testing**: Write tests for new features
3. **Documentation**: Update README and API docs
4. **Security**: Follow security best practices
5. **Performance**: Optimize for speed and efficiency

### Feature Requests
- **Game Enhancements**: New game modes and features
- **UI/UX Improvements**: Better user experience
- **Algorithm Updates**: Enhanced mind-reading capabilities
- **Integration Features**: New payment methods and services

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a gambling application. Please ensure compliance with local laws and regulations. The mind-reading algorithm is for entertainment purposes and should not be considered as actual mind-reading technology.

## 🆘 Support

### Documentation
- **API Docs**: `/api/docs` endpoint
- **Game Rules**: In-game tutorial and help
- **Admin Guide**: Admin panel documentation

### Contact
- **Issues**: GitHub issue tracker
- **Email**: support@boombank.com
- **Discord**: Join our community server

---

**BoomBank** - Where every click could be your next big win! 💣💰
