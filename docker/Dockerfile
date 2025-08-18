# Multi-stage Dockerfile for Universal Web Scraper

# Base stage with common dependencies
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Playwright to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Testing stage
FROM base AS testing
ENV NODE_ENV=test
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test:ci
CMD ["npm", "test"]

# Production dependencies stage
FROM base AS deps
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S scraper -u 1001 -G nodejs

# Copy production dependencies
COPY --from=deps --chown=scraper:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=scraper:nodejs src/ ./src/
COPY --chown=scraper:nodejs seeds.txt ./
COPY --chown=scraper:nodejs package.json ./

# Switch to non-root user
USER scraper

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Default command
ENTRYPOINT ["node", "src/index.js"]
CMD ["--help"]
