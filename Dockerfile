ARG NODE_VERSION=24

# Stage 1: Build the backend
FROM node:${NODE_VERSION}-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
COPY prisma/ ./prisma/
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Build the frontend
FROM node:${NODE_VERSION}-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 3: Production environment
FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3232
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Prisma requires openssl. We also need su-exec and shadow for dynamic PUID/PGID
# We do not switch to USER node here because the entrypoint must run as root to change UID/GID
RUN apk add --no-cache openssl su-exec shadow && \
    mkdir -p /config

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma/ ./prisma/

# Install prod dependencies and generate prisma client
RUN npm ci --omit=dev --ignore-scripts && npx prisma generate

# Copy built backend
COPY --chown=node:node --from=backend-build /app/dist ./dist

# Copy built frontend
COPY --chown=node:node --from=frontend-build /app/dist/frontend/browser ./frontend/dist/frontend/browser

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3232
VOLUME ["/config"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Sync database schema and start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
