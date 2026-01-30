# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build essentials for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ 

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y sqlite3

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
# Default path for chat.db inside container
ENV CHAT_DB_PATH=/data/chat.db

# Ensure the data directory exists
RUN mkdir -p /data

ENTRYPOINT ["node", "dist/index.js"]
