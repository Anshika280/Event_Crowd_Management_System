# =================================================================
# Production Dockerfile for Event Crowd Management Backend
# =================================================================
FROM node:20-alpine AS runner

# Set production environment flag
ENV NODE_ENV=production

# Base application directory
WORKDIR /app

# Copy package manifests for efficient layer caching
COPY backend/package*.json ./backend/

# Install production dependencies only using deterministic npm ci
WORKDIR /app/backend
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy backend application source code
COPY backend/ ./

# Copy static client landing page (served by express.static('../client'))
COPY client/ ../client/

# Enforce secure file ownership and switch to non-root user
RUN chown -R node:node /app
USER node

# Expose backend port (REST API & Socket.IO)
EXPOSE 5000

# Health check targeting backend /api-status endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api-status', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Default execution command
CMD ["node", "server.js"]
