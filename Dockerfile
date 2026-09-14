FROM node:22-alpine AS client-dependencies
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

FROM client-dependencies AS client-build
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=server-dependencies /app/server/node_modules ./server/node_modules
COPY server ./server
COPY public/assets ./public/assets
COPY public/404 ./public/404
COPY --from=client-build /app/client/dist ./client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["sh","-c","node server/database/setup.js && node server/src/server.js"]
