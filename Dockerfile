# Build stage
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

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

# Production stage - Main App
FROM node:22-alpine AS app

WORKDIR /app

# Copy package files first (no need for curl healthcheck, use wget which is built-in)
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

# Health check (use wget instead of curl to avoid QEMU ARM64 build issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/api/health || exit 1

# Start the application
CMD ["node", "scripts/production-server.js"]

# Worker stage - Email Worker (輕量化)
FROM node:22-alpine AS worker

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# 只安裝 worker 需要的依賴（不包含前端相關）
RUN npm ci --omit=dev --ignore-scripts --prefer-offline --no-audit && \
    npm install -g tsx

# 只複製 worker 需要的文件
COPY scripts/email-worker.ts ./scripts/
COPY src/lib/server/email-queue.ts ./src/lib/server/
COPY src/lib/server/email-worker.ts ./src/lib/server/
COPY src/lib/server/email.ts ./src/lib/server/
COPY src/lib/server/db ./src/lib/server/db

# Start the worker
CMD ["tsx", "scripts/email-worker.ts"]

