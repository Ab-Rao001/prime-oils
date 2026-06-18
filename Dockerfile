FROM node:18-alpine as build

WORKDIR /app

# Copy root package.json for frontend
COPY package*.json ./
RUN npm install

# Copy frontend source
COPY . ./
RUN npm run build

# Nginx stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
