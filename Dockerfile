# ══════════════════════════════════════════════════════════════
#  R.A.G.E LAN 2 — image de production (Dokploy / Docker)
# ══════════════════════════════════════════════════════════════

FROM node:22-alpine AS base
# openssl : requis par le moteur Prisma. libc6-compat : binaires glibc.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Dépendances ───────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL factice : le build ne se connecte pas, mais Prisma et Next
# exigent que la variable existe. Les pages qui interrogent la base
# retombent sur leur fallback statique pendant la génération.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV AUTH_SECRET="build-only-placeholder-secret-not-used-at-runtime"
RUN npx prisma generate
RUN npm run build
# Le seed est écrit en TypeScript : on le bundle en un seul fichier JS
# exécutable par `node` dans l'image finale (qui n'a pas tsx).
RUN npx esbuild prisma/seed.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --outfile=seed.cjs \
      --external:@prisma/client --external:.prisma --external:bcryptjs
RUN npx esbuild prisma/status.ts \
      --bundle --platform=node --format=cjs --target=node22 \
      --outfile=status.cjs \
      --external:@prisma/client --external:.prisma

# ── Image finale ──────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# CLI Prisma : nécessaire à `migrate deploy` au démarrage.
# --no-save pour ne pas toucher au package.json embarqué.
RUN npm install --no-save --no-audit --no-fund prisma@5.22.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/seed.cjs ./seed.cjs
COPY --from=builder /app/status.cjs ./status.cjs
# `standalone` contient server.js + les node_modules réellement utilisés.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Filet de sécurité : le tracing de Next oublie parfois le moteur de requête
# Prisma. On le copie explicitement, après standalone pour ne pas être écrasé.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
