import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

const PUBLIC_ENDPOINTS = ['/login', '/register'];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((path) => req.url.endsWith(path));
  const token = !isPublicEndpoint
    ? sessionStorage.getItem(environment.TOKEN_NAME) || localStorage.getItem(environment.TOKEN_NAME)
    : null;

  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
