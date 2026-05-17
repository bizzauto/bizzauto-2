FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

# Copy all files
COPY package.json package-lock.json ./
COPY . .

# Install ALL dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build frontend and server
RUN npm run build:client
RUN node scripts/build-server.mjs

# Remove dev dependencies
RUN npm prune --production

EXPOSE 4000

CMD ["node", "dist/server/index.js"]
