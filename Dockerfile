# Build stage (Debian for Prisma engine compatibility on Railway)
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# node:20-slim is Debian Bookworm (OpenSSL 3 only). Generate only 3.0.x engine so Prisma doesn't try to load 1.1.x.
RUN sed -i 's/binaryTargets = .*/binaryTargets = ["debian-openssl-3.0.x"]/' prisma/schema.prisma && npx prisma generate
RUN npm run build

# Production stage: install OpenSSL 3 libs so Prisma engine can load (Bookworm has libssl3)
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Force Prisma to use OpenSSL 3 engine (avoid runtime defaulting to 1.1.x)
ENV PRISMA_QUERY_ENGINE_LIBRARY="/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node"

# openssl CLI so Prisma can detect OpenSSL 3 (otherwise it defaults to 1.1.x and looks for the wrong engine)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/serpapi ./lib/serpapi

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Worker stage (BullMQ workers; needs full source)
FROM node:20-slim AS worker

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN sed -i 's/binaryTargets = .*/binaryTargets = ["debian-openssl-3.0.x"]/' prisma/schema.prisma && npx prisma generate

CMD ["npx", "ts-node", "workers/run-bullmq.ts"]
