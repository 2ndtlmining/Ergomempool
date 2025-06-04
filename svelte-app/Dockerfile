# Simple Dockerfile for development/testing
FROM node:18

WORKDIR /app

# Copy everything
COPY . .

# Clean install
RUN rm -rf node_modules package-lock.json
RUN npm install

# Build
RUN npm run build

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]