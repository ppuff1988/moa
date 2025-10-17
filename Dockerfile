# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with optimizations for cross-platform builds
# Use --ignore-scripts to avoid running scripts that might fail in QEMU
# Use --prefer-offline and --no-audit to reduce network operations
RUN npm ci --ignore-scripts --prefer-offline --no-audit

# Copy source code
COPY . .

# Set build arguments
ARG DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ARG PUBLIC_GTM_ID
ENV DATABASE_URL=$DATABASE_URL
ENV PUBLIC_GTM_ID=$PUBLIC_GTM_ID

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install production dependencies with QEMU-friendly settings
# --ignore-scripts prevents running native binaries that fail in QEMU
# --prefer-offline reduces network operations
# --no-audit speeds up installation
RUN npm ci --omit=dev --ignore-scripts --prefer-offline --no-audit

# Copy built application from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.env.example ./.env.example

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5173/api/health || exit 1

# Start the application
CMD ["node", "scripts/production-server.js"]
