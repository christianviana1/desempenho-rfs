# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) deps: instala TODAS as dependências (inclui devDependencies) para build.
#    O schema é copiado antes do `npm ci` porque o script `postinstall`
#    (prisma generate) precisa dele — sem isso a instalação falha aqui.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# 2) builder: gera o Prisma Client e o build standalone do Next.js.
#    Não precisa de DATABASE_URL real — só é usada em runtime.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# 3) prod-deps: instala SOMENTE dependencies (sem devDependencies) — usado
#    para ter o Prisma CLI + tsx disponíveis em runtime (migrate/seed) sem
#    carregar eslint/typescript/tailwind na imagem final.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# 4) runner: imagem final, executa como usuário não-root.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# node_modules "de produção" (inclui prisma, @prisma/client, tsx)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Build standalone do Next.js (server.js + subset traçado de node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Necessários para `prisma migrate deploy` / `prisma db seed` em runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
