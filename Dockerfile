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

# Copy everything from builder
COPY --from=builder /app/ ./

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads/avatars

EXPOSE 3001

CMD ["node", "server.js"]
