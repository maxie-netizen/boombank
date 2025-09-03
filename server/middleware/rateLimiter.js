const { RateLimiterMemory } = require('rate-limiter-flexible');

/**
 * Create a rate limiter instance
 * @param {Object} options - Rate limiter options
 * @param {Function} options.keyGenerator - Function to generate unique keys
 * @param {number} options.points - Maximum number of points
 * @param {number} options.duration - Time window in seconds
 * @param {number} options.blockDuration - Block duration in seconds
 * @returns {Function} - Express middleware function
 */
const createRateLimiter = (options) => {
  const {
    keyGenerator = (req) => req.ip,
    points = 100,
    duration = 60,
    blockDuration = 60
  } = options;

  const rateLimiter = new RateLimiterMemory({
    keyGenerator,
    points,
    duration,
    blockDuration
  });

  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      await rateLimiter.consume(key);
      next();
    } catch (error) {
      if (error.msBeforeNext) {
        res.set('Retry-After', Math.ceil(error.msBeforeNext / 1000));
        res.set('X-RateLimit-Limit', points);
        res.set('X-RateLimit-Remaining', error.remainingPoints);
        res.set('X-RateLimit-Reset', new Date(Date.now() + error.msBeforeNext));
      }
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }
  };
};

/**
 * Default rate limiter for general API endpoints
 */
const defaultRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip,
  points: 100,
  duration: 60,
  blockDuration: 60
});

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip,
  points: 10,
  duration: 60,
  blockDuration: 300
});

/**
 * User-based rate limiter
 */
const userRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.user?.userId || req.ip,
  points: 1000,
  duration: 3600,
  blockDuration: 1800
});

/**
 * Admin rate limiter
 */
const adminRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip,
  points: 1000,
  duration: 3600,
  blockDuration: 300
});

module.exports = {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  userRateLimiter,
  adminRateLimiter
};
