FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build-time env vars for SvelteKit static adapter
ARG PUBLIC_API_URL
ARG PUBLIC_APP_NAME
ARG PUBLIC_GOOGLE_CLIENT_ID
ARG PUBLIC_GOOGLE_CLIENT_SECRET
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_APP_NAME=$PUBLIC_APP_NAME
ENV PUBLIC_GOOGLE_CLIENT_ID=$PUBLIC_GOOGLE_CLIENT_ID
ENV PUBLIC_GOOGLE_CLIENT_SECRET=$PUBLIC_GOOGLE_CLIENT_SECRET

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
# SPA fallback: all routes → index.html
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
