FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/agent-runtime/package.json ./packages/agent-runtime/
COPY packages/sdk/package.json ./packages/sdk/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=packages/sdk && npm run build --workspace=packages/agent-runtime

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/agent-runtime/dist ./packages/agent-runtime/dist
COPY --from=builder /app/packages/agent-runtime/package.json ./packages/agent-runtime/
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "packages/agent-runtime/dist/index.js"]
