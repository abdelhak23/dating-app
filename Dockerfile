# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/uploads ./uploads

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads/avatars

EXPOSE 3001

CMD ["node", "server.js"]
