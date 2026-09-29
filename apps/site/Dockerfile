FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy workspace package definitions
COPY package*.json ./
COPY apps/site/package*.json ./apps/site/
COPY apps/backend/package*.json ./apps/backend/
COPY apps/admin/package*.json ./apps/admin/
COPY apps/web/package*.json ./apps/web/

RUN npm install --include=optional

# Copy site source code
COPY apps/site ./apps/site

WORKDIR /app/apps/site
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/site ./apps/site

WORKDIR /app/apps/site

EXPOSE 3002

CMD ["npm", "run", "start"]
