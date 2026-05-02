# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Vite 환경변수는 빌드 시점에 정적 번들에 포함된다.
ARG VITE_API_BASE_URL=https://capstone.studylink.click
ARG VITE_ADMIN_API_BASE_URL=https://admin.studylink.click
ARG VITE_SSE_BASE_URL=https://capstone.studylink.click
ARG VITE_DEMO_MODE=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ADMIN_API_BASE_URL=$VITE_ADMIN_API_BASE_URL
ENV VITE_SSE_BASE_URL=$VITE_SSE_BASE_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

# Install dependencies (cached layer)
COPY App/package.json App/package-lock.json ./
RUN npm ci

# Copy source and build
COPY App/ .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# SPA fallback: all routes → index.html
COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
    gzip_min_length 1024;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
