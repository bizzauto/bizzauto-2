# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN node scripts/build-server.mjs
RUN npm run build:client

# ---- Runner Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server/index.js"]
