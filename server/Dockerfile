FROM node:18-alpine

WORKDIR /app

# Copy server package.json
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server/ ./

# Expose port
EXPOSE 5000

# Start server using PM2 or node directly
# We use node directly in Docker for better signal handling
CMD ["npm", "start"]
