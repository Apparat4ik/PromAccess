FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install @mantine/core @mantine/hooks @mantine/notifications @mantine/form @tabler/icons-react axios react-router-dom jwt-decode
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Подмена стандартного конфига Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
