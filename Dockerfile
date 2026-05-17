FROM node:20-alpine AS base
WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

# Build everything
FROM base AS builder
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build:client
RUN node scripts/build-server.mjs

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy only production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Remove dev dependencies from production node_modules
RUN npm prune --production

EXPOSE 4000

CMD ["node", "dist/server/index.js"]
