# Final Docker Solution - Fixed terser dependency
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies including terser for production builds
RUN npm install --legacy-peer-deps && npm install terser --save-dev

# Copy source code
COPY . .

# Create a simpler vite config without terser to avoid the dependency issue
RUN echo 'import { sveltekit } from "@sveltejs/kit/vite";' > vite.config.js && \
    echo 'import { defineConfig } from "vite";' >> vite.config.js && \
    echo '' >> vite.config.js && \
    echo 'export default defineConfig({' >> vite.config.js && \
    echo '    plugins: [sveltekit()],' >> vite.config.js && \
    echo '    build: {' >> vite.config.js && \
    echo '        minify: false,' >> vite.config.js && \
    echo '        sourcemap: false' >> vite.config.js && \
    echo '    }' >> vite.config.js && \
    echo '});' >> vite.config.js

# Build for production
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

EXPOSE 3000

# Use the built production server
CMD ["node", "build"]