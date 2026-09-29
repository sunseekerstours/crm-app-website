FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy workspace package definitions
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY apps/backend/package*.json ./apps/backend/
COPY apps/web/package*.json ./apps/web/
COPY apps/site/package*.json ./apps/site/

RUN npm install --include=optional

# Copy admin source code
COPY apps/admin ./apps/admin

WORKDIR /app/apps/admin
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin ./apps/admin

WORKDIR /app/apps/admin

EXPOSE 3003

CMD ["npm", "run", "start"]
