# Use Node.js 20 Alpine for better-sqlite3 compatibility
FROM node:20-alpine

# Install Python and build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Clean up build dependencies to reduce image size
RUN apk del python3 make g++

# Create uploads directory
RUN mkdir -p uploads uploads-test data

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
