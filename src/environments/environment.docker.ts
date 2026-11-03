// Configuracion para el despliegue con DOCKER (la usa `ng build --configuration docker`).
// El frontend lo sirve Nginx, que tambien reenvia /api/* al backend (ver nginx.conf).
// Por eso HOST se arma con el mismo origen desde el que se abrio la pagina:
// funciona igual con http://localhost, con la IP del local (http://192.168.1.50)
// o con un dominio, sin recompilar.
export const environment = {
  production: true,
  HOST: `${window.location.origin}/api`,
  TOKEN_NAME: 'carretero_token'
};
