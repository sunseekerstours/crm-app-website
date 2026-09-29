FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package definitions
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/admin/package*.json ./apps/admin/
COPY apps/web/package*.json ./apps/web/
COPY apps/site/package*.json ./apps/site/

# Install all dependencies for monorepo
RUN npm install --include=optional

# Copy backend source code
COPY apps/backend ./apps/backend

# Generate Prisma Client and build NestJS
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
