FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build:client

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "src/server/index.ts"]