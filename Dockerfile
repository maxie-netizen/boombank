# Multi-stage Dockerfile for BoomBank Application
# Optimized for Render deployment

# Stage 1: Base Node.js setup
FROM node:18-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Stage 2: Dependencies installation
FROM base AS deps
# Install frontend dependencies
RUN npm ci --only=production --silent

# Install backend dependencies
WORKDIR /app/server
RUN npm ci --only=production --silent

# Stage 3: Frontend build
FROM base AS frontend-build
WORKDIR /app

# Copy all source files first
COPY . .

# Install all dependencies for build
RUN npm ci

# Build the Next.js application
RUN npm run build

# Stage 4: Production runtime
FROM base AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend from build stage
COPY --from=frontend-build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=frontend-build --chown=nextjs:nodejs /app/public ./public
COPY --from=frontend-build --chown=nextjs:nodejs /app/package.json ./package.json

# Copy backend from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/server ./server

# Copy necessary configuration files from frontend-build stage
COPY --from=frontend-build --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=frontend-build --chown=nextjs:nodejs /app/tailwind.config.js ./
COPY --from=frontend-build --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=frontend-build --chown=nextjs:nodejs /app/postcss.config.js ./

# Copy environment template and create .env
COPY --from=frontend-build --chown=nextjs:nodejs /app/env.example ./.env

# Create logs directory
RUN mkdir -p logs && chown nextjs:nodejs logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start command for Render - run the server which handles both frontend and backend
CMD ["npm", "run", "server"]
