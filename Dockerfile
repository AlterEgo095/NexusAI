# ═══════════════════════════════════════════════════════════════════════
# NexusAI — Multi-stage Docker Production Build
# ═══════════════════════════════════════════════════════════════════════
FROM oven/bun:1 AS base

# ── Stage 1: Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production=false

# ── Stage 2: Build ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable standalone output for production build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Temporarily set standalone for build only
RUN cp next.config.mjs next.config.mjs.bak && \
    sed -i 's|const nextConfig = {|const nextConfig = {\n  output: "standalone",|' next.config.mjs

RUN bun run db:generate && \
    bun run build

# ── Stage 3: Production ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create data directory for SQLite DB
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1

CMD ["bun", "server.js"]