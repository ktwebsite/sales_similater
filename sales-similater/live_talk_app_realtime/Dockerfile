# Multi-stage build for optimized production image

# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --prefer-offline --no-audit --progress=false

# Copy source code (excluding files in .dockerignore)
COPY . .

# Build arguments for React environment variables
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_ALLOWED_DOMAIN

# Set environment variables for build
ENV REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_ALLOWED_DOMAIN=$REACT_APP_ALLOWED_DOMAIN

# Build React app with production optimizations
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production runtime (minimal image)
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --prefer-offline --no-audit --progress=false && \
  npm cache clean --force && \
  rm -rf /tmp/*

# Copy built React app from builder stage
COPY --from=builder /app/build ./build

# Copy server files
COPY server.js ./
COPY server ./server

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run uses PORT environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]
