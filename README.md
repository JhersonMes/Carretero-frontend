# Carretero Frontend — Sistema de Ventas

Aplicación web del punto de venta de **El Carretero (Burgers & Wings)**. Es la interfaz que usa el personal del restaurante: meseros toman pedidos en las mesas, caja cobra y cuadra turnos, y las estaciones de cocina reciben las comandas en tiempo real.

Consume la API del repositorio [Carretero-backend](https://github.com/JhersonMes/Carretero-backend). **Sin el backend corriendo, esta app no funciona.**

---

## Pantallas

| Ruta | Para qué sirve |
|---|---|
| `/login` | Inicio de sesión. |
| `/pages/dashboard` | Resumen del día. |
| `/pages/salon` → `/pages/salon/:id` | Mapa de mesas y pedido por mesa, con modal de cobro. |
| `/pages/quick-sale` | Venta rápida de mostrador, sin mesa. |
| `/pages/kitchen` | Pantalla de comandas. Se actualiza sola vía WebSocket. |
| `/pages/cash-shift` | Apertura, cierre y arqueo de turnos de caja. |
| `/pages/catalog` · `/pages/product` | Carta y precios de los productos. |
| `/pages/menu` · `/pages/ingredient` | Menús e insumos (con alta y edición). |
| `/pages/client` | Clientes, con búsqueda por DNI/RUC. |
| `/pages/payment` · `/pages/payment-method` | Pagos y métodos de pago. |
| `/pages/user` · `/pages/role` | Usuarios y roles. |

Todo lo que cuelga de `/pages` está protegido: sin sesión iniciada te devuelve al login.

## Stack

- **Angular 19** con componentes *standalone* y rutas *lazy-loaded*
- **@stomp/stompjs** para las comandas en tiempo real (WebSocket nativo, sin SockJS)
- RxJS 7.8 · TypeScript 5.5
- CSS plano, sin framework de UI

---

## Requisitos

| Herramienta | Versión |
|---|---|
| **Node.js** | 20.11 o superior (recomendado 22 LTS) |
| **npm** | Viene con Node |
| **Carretero-backend** | Corriendo en `http://localhost:8080` |

No necesitas instalar el Angular CLI globalmente: viene en las dependencias del proyecto y se usa con `npm start`.

---

## Cómo ponerlo a funcionar

### 1. Clonar e instalar

```bash
git clone https://github.com/JhersonMes/Carretero-frontend-angular.git
cd Carretero-frontend-angular
npm install
```

`node_modules/` **no está en el repositorio** (son ~170 MB). `npm install` lo reconstruye desde `package-lock.json` con las versiones exactas. Tarda unos minutos la primera vez.

### 2. Levantar el backend primero

Sigue el README de [Carretero-backend](https://github.com/JhersonMes/Carretero-backend) y déjalo corriendo en el puerto 8080.

### 3. Revisar la dirección de la API

En [`src/environments/environment.ts`](src/environments/environment.ts):

```ts
export const environment = {
  production: false,
  HOST: 'http://localhost:8080',
  TOKEN_NAME: 'carretero_token'
};
```

Si el backend corre en otra máquina de la red del restaurante, cambia `HOST` por su IP —por ejemplo `http://192.168.1.50:8080`— en `environment.ts` **y** en `environment.development.ts`.

### 4. Arrancar

```bash
npm start
```

Abre **http://localhost:4200**. Entra con `admin` / `admin123` (el backend crea ese usuario solo en su primer arranque; los demás usuarios están listados en su README).

### 5. Compilar para producción

```bash
npm run build
```

El resultado queda en `dist/carretero-frontend-angular/`.

---

## 🔒 Nada secreto va en este proyecto

Todo lo que escribas aquí —incluido `environment.ts`— **termina en el bundle que descarga el navegador**. Cualquiera puede leerlo con F12.

Nunca pongas en el frontend: contraseñas, claves de API, el `JWT_SECRET`, ni credenciales de base de datos. Todo eso vive en el backend.

Ejemplo de cómo se hace bien en este proyecto: la consulta de DNI/RUC no llama a la API externa de SUNAT desde el navegador, sino que pasa por el backend (`${environment.HOST}/sunat`), que es quien guarda el token de ese servicio.

---

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| Todo da error de red o `ERR_CONNECTION_REFUSED` | El backend no está corriendo. Levántalo en el 8080. |
| Error de **CORS** | El backend acepta cualquier origen, así que casi siempre es que `HOST` en `environment.ts` apunta mal. |
| Login responde **401** | Usuario o contraseña incorrectos. Con la BD recién creada usa `admin` / `admin123`. |
| Entras al login pero te saca de `/pages` | No hay token guardado. Vuelve a iniciar sesión. |
| La pantalla de cocina no se actualiza sola | El WebSocket no conectó. Revisa que `HOST` sea correcto y que el backend exponga `/ws`. |
| `Port 4200 is already in use` | Otra instancia abierta. Ciérrala o usa `npm start -- --port 4300`. |
| Errores raros tras cambiar de rama | Borra `node_modules/` y `.angular/`, y corre `npm install` de nuevo. |

---

## Lo que NO se sube al repositorio

| Carpeta | Peso | Por qué |
|---|---|---|
| `node_modules/` | ~170 MB | Se regenera con `npm install`. |
| `.angular/` | ~9 MB | Caché de compilación, solo sirve en tu máquina. |
| `dist/` | — | Salida del build. |

`package-lock.json` **sí se sube**: es lo que garantiza que todos instalen exactamente las mismas versiones.
