# 🚀 Render Deployment Guide for BoomBank

## Overview
This guide will walk you through deploying the BoomBank application on Render, a modern cloud platform that makes deployment simple and efficient.

## 🎯 Prerequisites

### Required Accounts
- [Render Account](https://render.com) (free tier available)
- [MongoDB Atlas Account](https://mongodb.com/atlas) (free tier available)
- [Safaricom Daraja API Account](https://developer.safaricom.co.ke/)

### Application Requirements
- Node.js 18+ application
- MongoDB database
- Environment variables configuration
- M-Pesa API credentials

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your repository contains:
```
boombank/
├── Dockerfile              # Multi-stage Docker build
├── .dockerignore          # Docker build optimization
├── docker-compose.yml     # Local development setup
├── package.json           # Frontend dependencies
├── server/package.json    # Backend dependencies
├── .env.example          # Environment template
└── README.md             # Project documentation
```

### 2. Set Up MongoDB Atlas

1. **Create MongoDB Atlas Cluster**
   - Go to [MongoDB Atlas](https://mongodb.com/atlas)
   - Create a free cluster (M0 tier)
   - Choose your preferred cloud provider and region

2. **Configure Database Access**
   - Create a database user with read/write permissions
   - Note down username and password

3. **Configure Network Access**
   - Add `0.0.0.0/0` to IP Access List (allows Render to connect)
   - Or add Render's IP ranges for better security

4. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

### 3. Deploy on Render

#### A. Create New Web Service

1. **Sign in to Render**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub, GitLab, or Bitbucket

2. **Connect Repository**
   - Click "New +" → "Web Service"
   - Connect your BoomBank repository
   - Choose the repository branch (usually `main` or `master`)

3. **Configure Service**
   - **Name**: `boombank` (or your preferred name)
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repository)

#### B. Environment Variables

Add these environment variables in Render:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boombank?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# M-Pesa Configuration
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_BUSINESS_SHORTCODE=your_mpesa_business_shortcode
MPESA_PARTY_A=your_mpesa_party_a
MPESA_PARTY_B=your_mpesa_party_b
MPESA_CALLBACK_URL=https://your-app-name.onrender.com/api/payment/mpesa/callback
MPESA_TIMEOUT_URL=https://your-app-name.onrender.com/api/payment/mpesa/timeout
MPESA_ACCOUNT_REFERENCE=BOOMBANK
MPESA_TRANSACTION_DESC=BoomBank Payment

# Optional: Redis Configuration (if using Redis)
REDIS_URL=redis://your-redis-url:6379

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### C. Build Configuration

- **Build Command**: Leave empty (Docker handles this)
- **Start Command**: Leave empty (Dockerfile CMD handles this)

### 4. Deploy and Monitor

1. **Deploy Service**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - First deployment may take 5-10 minutes

2. **Monitor Deployment**
   - Watch the build logs for any errors
   - Check the deployment status
   - Verify the service is running

3. **Test Your Application**
   - Visit your Render URL: `https://your-app-name.onrender.com`
   - Test the main functionality
   - Check admin panel access

## 🔧 Advanced Configuration

### Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to your service settings
   - Click "Custom Domains"
   - Add your domain (e.g., `boombank.com`)

2. **Configure DNS**
   - Add CNAME record pointing to your Render URL
   - Wait for DNS propagation (up to 48 hours)

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/boombank
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
```

#### Production
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boombank
MPESA_BASE_URL=https://api.safaricom.co.ke
```

### Health Check Endpoint

Ensure your application has a health check endpoint:

```javascript
// In your server routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
- **Problem**: Docker build fails
- **Solution**: Check Dockerfile syntax and .dockerignore
- **Debug**: Review build logs in Render dashboard

#### 2. Database Connection Issues
- **Problem**: MongoDB connection fails
- **Solution**: Verify MONGODB_URI and network access
- **Debug**: Check environment variables and MongoDB Atlas settings

#### 3. M-Pesa Integration Issues
- **Problem**: Payment endpoints not working
- **Solution**: Verify M-Pesa credentials and callback URLs
- **Debug**: Check M-Pesa sandbox/production configuration

#### 4. Application Crashes
- **Problem**: Service keeps restarting
- **Solution**: Check application logs and health check endpoint
- **Debug**: Review error logs in Render dashboard

### Debug Commands

```bash
# Check application logs
# Available in Render dashboard under "Logs" tab

# Test health endpoint
curl https://your-app-name.onrender.com/api/health

# Test database connection
# Check MongoDB Atlas connection status
```

## 📊 Monitoring and Maintenance

### Render Dashboard Features

1. **Real-time Logs**
   - View application logs in real-time
   - Filter by log level and time

2. **Performance Metrics**
   - Monitor response times
   - Track request volumes
   - Monitor resource usage

3. **Deployment History**
   - View all deployments
   - Rollback to previous versions if needed

### Health Monitoring

- **Automatic Health Checks**: Render monitors your health endpoint
- **Auto-restart**: Service automatically restarts on failures
- **Uptime Monitoring**: Track service availability

## 🔒 Security Best Practices

### Environment Variables
- Never commit sensitive data to Git
- Use Render's secure environment variable storage
- Rotate secrets regularly

### Database Security
- Use MongoDB Atlas with proper authentication
- Restrict network access when possible
- Enable MongoDB Atlas security features

### Application Security
- Use HTTPS (automatic on Render)
- Implement proper rate limiting
- Validate all user inputs
- Use secure JWT secrets

## 💰 Cost Optimization

### Free Tier Limitations
- **Web Services**: 750 hours/month
- **MongoDB Atlas**: 512MB storage
- **Custom Domains**: Not available on free tier

### Paid Tier Benefits
- **Unlimited Hours**: No monthly limits
- **Custom Domains**: Professional domain support
- **Better Performance**: Faster build and deployment times
- **Priority Support**: Faster response times

## 🚀 Scaling Considerations

### Auto-scaling
- Render automatically scales based on traffic
- No manual configuration required
- Cost-effective for variable workloads

### Performance Optimization
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries
- Monitor and optimize Docker image size

## 📞 Support Resources

### Render Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status Page](https://status.render.com)

### Application Support
- Check application logs in Render dashboard
- Review MongoDB Atlas monitoring
- Test M-Pesa integration endpoints

---

## 🎯 Quick Deployment Checklist

- [ ] Repository contains Dockerfile and .dockerignore
- [ ] MongoDB Atlas cluster created and configured
- [ ] M-Pesa API credentials obtained
- [ ] Render account created and repository connected
- [ ] Environment variables configured in Render
- [ ] Service deployed successfully
- [ ] Application tested and working
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up
- [ ] Documentation updated

---

**Your BoomBank application is now ready for production deployment on Render! 🚀💣**

For additional support, refer to the main project documentation and Render's official guides.
