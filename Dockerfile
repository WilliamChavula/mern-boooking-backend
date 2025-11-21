# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Production stage
FROM node:22-alpine

# Install security updates and dumb-init for proper signal handling
RUN apk --no-cache upgrade && \
  apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy dependencies and code from builder
COPY --from=builder /app/node_modules ./node_modules


# Expose port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5050/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]