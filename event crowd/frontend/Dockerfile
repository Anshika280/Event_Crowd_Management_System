# =================================================================
# Stage 1: Build React Application
# =================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests for cache optimization
COPY package*.json ./

# Install all dependencies with legacy peer deps for React 19 compatibility
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# =================================================================
# Stage 2: Serve via Nginx
# =================================================================
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy production Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check configuration using Nginx /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
