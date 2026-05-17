FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build:client
RUN node scripts/build-server.mjs

EXPOSE 4000

CMD ["node", "dist/server/index.js"]
