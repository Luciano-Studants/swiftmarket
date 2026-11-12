# syntax=docker/dockerfile:1

# ---------- API ----------
FROM node:22-slim AS api
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace @swiftmarket/api --workspace @swiftmarket/shared

COPY packages/shared packages/shared
COPY apps/api apps/api

# Banco e uploads ficam em volume (/data), nunca dentro da imagem.
ENV DB_FILE=/data/swiftmarket.db UPLOAD_DIR=/data/uploads PORT=3333 HOST=0.0.0.0
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/src/server.js"]

# ---------- Painel admin (build estático) ----------
FROM node:22-slim AS admin-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/admin/package.json apps/admin/
RUN npm ci --workspace @swiftmarket/admin --workspace @swiftmarket/shared
COPY packages/shared packages/shared
COPY apps/admin apps/admin
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace @swiftmarket/admin

FROM caddy:2-alpine AS admin
COPY --from=admin-build /app/apps/admin/dist /srv/admin
