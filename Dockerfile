FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing + reverse proxy to Ollama on host
RUN echo 'server { \
    listen 6301; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://host.docker.internal:11434/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Connection ""; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_buffering off; \
        proxy_cache off; \
        proxy_read_timeout 3600; \
        proxy_send_timeout 3600; \
        chunked_transfer_encoding on; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 6301
CMD ["nginx", "-g", "daemon off;"]
