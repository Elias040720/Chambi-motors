# Etapa 1: Base de Node.js Alpine
FROM node:20-alpine AS base

# Etapa 2: Dependencias (deps)
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Etapa 3: Compilación del proyecto (builder)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Etapa 4: Servidor ligero de producción (runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

# Habilitar enlace al puerto 80 para usuarios no privilegiados mediante setcap
RUN apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Crear usuario y grupo seguro no privilegiado
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos y estáticos
COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar artefactos standalone de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Exponer el puerto 80 para Azure App Service y mapeo estándar
EXPOSE 80

# Iniciar servidor en primer plano (el contenedor se mantiene encendido permanentemente)
CMD ["node", "server.js"]
