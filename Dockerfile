# Build stage (Debian for Prisma engine compatibility on Railway)
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Generate only OpenSSL 3 engine so runtime does not load libssl.so.1.1
RUN sed -i 's/binaryTargets = .*/binaryTargets = ["debian-openssl-3.0.x"]/' prisma/schema.prisma && npx prisma generate
RUN npm run build

# Production stage (Debian = glibc + OpenSSL, avoids musl/libssl.so.1.1 errors)
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Worker stage (BullMQ workers; needs full source)
FROM node:20-slim AS worker

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN sed -i 's/binaryTargets = .*/binaryTargets = ["debian-openssl-3.0.x"]/' prisma/schema.prisma && npx prisma generate

CMD ["npx", "ts-node", "workers/run-bullmq.ts"]
