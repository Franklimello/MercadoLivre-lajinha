# syntax=docker/dockerfile:1
# Keep build and runtime on the same distribution for Prisma's native engine.
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --no-audit --no-fund
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
# Generation needs URL variables, but never connects to this placeholder database.
# These build-only URLs have no credentials and are not runtime configuration.
RUN DATABASE_URL=postgresql://localhost:5432/build_only \
    DIRECT_URL=postgresql://localhost:5432/build_only \
    npm run prisma:generate
RUN npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
# Prisma's optional TypeScript peer is not needed by the generated JS client.
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev --no-audit --no-fund \
    && rm -rf node_modules/typescript node_modules/.bin/tsc node_modules/.bin/tsserver \
    && npm cache clean --force

FROM base AS production
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=production-dependencies --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 8080
# Run Node directly so Cloud Run's SIGTERM reaches Nest's shutdown hooks.
CMD ["node", "dist/main.js"]
