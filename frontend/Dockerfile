FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY frontend/ ./

ARG VITE_APP_API_URL=/api
ARG VITE_APP_URL=http://localhost:3000

ENV VITE_APP_API_URL=${VITE_APP_API_URL}
ENV VITE_APP_URL=${VITE_APP_URL}

RUN pnpm build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
