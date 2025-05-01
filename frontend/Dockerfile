# Build stage
FROM node:22.14 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY cert /etc/nginx/cert
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]