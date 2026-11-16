# Imagen del frontend para el despliegue con Docker Compose.
# Etapa 1: compila Angular con la configuracion "docker" (HOST = <origen>/api).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -- --configuration docker

# Etapa 2: Nginx (sin root, escucha en 8080) sirve los archivos estaticos y hace de proxy hacia el backend.
FROM nginxinc/nginx-unprivileged:1.27-alpine
# nginx.conf es una plantilla: al arrancar, ${BACKEND_URL} se reemplaza por la variable de entorno.
ENV BACKEND_URL=http://backend:8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/carretero-frontend-angular/browser /usr/share/nginx/html
USER nginx
EXPOSE 8080
