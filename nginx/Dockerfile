FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY cert /etc/nginx/cert
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]