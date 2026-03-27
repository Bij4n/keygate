FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/mcp/package.json packages/mcp/
COPY packages/sdk/package.json packages/sdk/
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
COPY packages/mcp/ packages/mcp/
COPY packages/sdk/ packages/sdk/
RUN npm run build --workspace=packages/core

# Copy static files
COPY preview.html landing.html docs.html ./

EXPOSE 3100
ENV PORT=3100
ENV NODE_ENV=production

CMD ["npx", "tsx", "packages/server/src/demo.ts"]
