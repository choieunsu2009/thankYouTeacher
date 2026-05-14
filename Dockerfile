FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY BE/package.json BE/package-lock.json* ./BE/
RUN cd BE && npm install --production

# Copy application code
COPY BE/ ./BE/
COPY FE/ ./FE/

# Create uploads directory
RUN mkdir -p /app/BE/uploads

EXPOSE 3000

WORKDIR /app/BE
CMD ["node", "server.js"]
