const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path'); // Added for static file serving

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boombank', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

// Import services
const cronService = require('./services/cronService');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Health check endpoint for Render monitoring
app.get('/api/health', (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join game room
  socket.on('join-game', (gameId) => {
    socket.join(`game-${gameId}`);
    console.log(`User ${socket.id} joined game ${gameId}`);
  });

  // Leave game room
  socket.on('leave-game', (gameId) => {
    socket.leave(`game-${gameId}`);
    console.log(`User ${socket.id} left game ${gameId}`);
  });

  // Handle game actions
  socket.on('game-action', (data) => {
    // Broadcast to all players in the game
    socket.to(`game-${data.gameId}`).emit('game-update', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve static files from Next.js build
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Check if Next.js build exists
  const nextBuildPath = path.join(__dirname, '../.next');
  const publicPath = path.join(__dirname, '../public');
  
  if (fs.existsSync(nextBuildPath)) {
    // Serve static files from .next/static
    app.use('/_next/static', express.static(path.join(__dirname, '../.next/static')));
    
    // Serve public files if they exist
    if (fs.existsSync(publicPath)) {
      app.use('/public', express.static(publicPath));
    }
    
    // Serve the main page for client-side routing (App Router)
    app.get('*', (req, res) => {
      const mainPagePath = path.join(__dirname, '../.next/server/app/page.html');
      
      if (fs.existsSync(mainPagePath)) {
        res.sendFile(mainPagePath);
      } else {
        // Fallback: serve a simple HTML that redirects to the main app
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>BoomBank</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
              <div id="root">Loading BoomBank...</div>
              <script>
                window.location.href = '/';
              </script>
            </body>
          </html>
        `);
      }
    });
  } else {
    // If Next.js build doesn't exist, serve a simple message
    app.get('*', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>BoomBank</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="root">
              <h1>BoomBank</h1>
              <p>Application is starting up...</p>
              <p>Please wait a moment and refresh the page.</p>
            </div>
          </body>
        </html>
      `);
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler (only for API routes in production)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Boombank Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎮 Game API: http://localhost:${PORT}/api/game`);
  console.log(`👤 Admin Panel: http://localhost:${PORT}/api/admin`);
  console.log(`🔌 Socket.IO: http://localhost:${PORT}`);
  
  // Start cron service for M-Pesa transaction processing
  try {
    cronService.start();
    console.log(`💳 M-Pesa cron service started`);
  } catch (error) {
    console.error(`❌ Failed to start cron service:`, error.message);
    console.log(`⚠️  M-Pesa transaction processing will not be available`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = { app, server, io };
