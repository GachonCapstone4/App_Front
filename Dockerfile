# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env vars (VITE_ prefix → embedded in bundle at build time)
ARG VITE_BACKEND_ORIGIN=https://capstone.studylink.click
ARG VITE_SSE_ORIGIN=https://capstone.studylink.click
ENV VITE_BACKEND_ORIGIN=$VITE_BACKEND_ORIGIN
ENV VITE_SSE_ORIGIN=$VITE_SSE_ORIGIN

# Install dependencies (cached layer)
COPY App/package.json App/package-lock.json ./
RUN npm ci

# Copy source and build
COPY App/ .
RUN echo 'export { StatusBadge as AiUsageBadge } from "./StatusBadge";' \
    > src/shared/ui/primitives/AiUsageBadge.ts
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
