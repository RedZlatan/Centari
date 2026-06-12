# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: compile TypeScript ───────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: minimal runtime ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 worker

# Production deps only (no devDependencies)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/dist ./dist

USER worker
CMD ["node", "dist/index.js"]
