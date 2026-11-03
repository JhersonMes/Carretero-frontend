# Imagen del frontend para el despliegue con Docker Compose.
# Etapa 1: compila Angular con la configuracion "docker" (HOST = <origen>/api).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration docker

# Etapa 2: Nginx sirve los archivos estaticos y hace de proxy hacia el backend.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/carretero-frontend-angular/browser /usr/share/nginx/html
EXPOSE 80
