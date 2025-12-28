FROM node:lts-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm ci

COPY . .

RUN mkdir -p data
ENV BUILD_STANDALONE=true
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p data && chown nextjs:nodejs data
VOLUME ["/app/data"]

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
