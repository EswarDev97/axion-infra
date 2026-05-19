# API Gateway Dockerfile
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --only=production

# Build stage
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./

USER expressjs

EXPOSE 3001

CMD ["node", "dist/app.js"]
