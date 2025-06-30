# Use the official Bun image
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Expose the port
EXPOSE 3001

# Start the application
CMD ["bun", "start"]