# --- Etapa 1: Compilación ---
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

# --- Etapa 2: Servidor de Producción ---
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Eliminar los archivos por defecto de Nginx
RUN rm -rf ./*

# Copiar la app compilada desde la etapa anterior
COPY --from=builder /app/dist .

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
