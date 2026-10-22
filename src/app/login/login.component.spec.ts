import { LoginComponent } from './login.component';
import { of, throwError } from 'rxjs';

/**
 * Pruebas unitarias para LoginComponent.
 * Guiadas directamente de Semana07_CalProSoft (UnitTest_Login.cs) y ANEXOS:
 * CP-01-1: Login ok
 * CP-01-2: Login fallido por credenciales inválidas
 */
describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockLoginService: any;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockLoginService = {
      login: () => of({ jwtToken: 'token-jwt-ok' })
    };
    mockAuthService = {
      fetchCurrentUser: () => of({ username: 'ADMIN', role: { name: 'ADMIN' } }),
      resolveHomeRoute: () => '/pages/dashboard'
    };
    mockRouter = {
      navigate: () => {}
    };

    component = Object.create(LoginComponent.prototype);
    component.username = '';
    component.password = '';
    component.errorMessage = '';
    component.showForgotPasswordInfo = false;
    (component as any).loginService = mockLoginService;
    (component as any).authService = mockAuthService;
    (component as any).router = mockRouter;
  });

  // CASO DE PRUEBA 1: Login ok (CP-01-1)
  it('LoginOK: credenciales correctas guarda token y navega a la ruta principal', () => {
    // preparacion
    component.username = 'ADMIN';
    component.password = '1234';

    let navigateRoute = '';
    mockRouter.navigate = (routes: string[]) => {
      navigateRoute = routes[0];
    };

    // ejecucion
    component.onSubmit();

    // afirmacion
    expect(component.errorMessage).toBe('');
    expect(navigateRoute).toBe('/pages/dashboard');
  });

  // CASO DE PRUEBA 2: Login Fallido 1 - Credenciales incorrectas (CP-01-2)
  it('LoginFail1: contrasena incorrecta muestra mensaje de credenciales invalidas', () => {
    // preparacion
    component.username = 'ADMIN';
    component.password = 'ADMIN'; // Contraseña errónea

    mockLoginService.login = () => throwError(() => new Error('INVALID_CREDENTIALS'));

    // ejecucion
    component.onSubmit();

    // afirmacion
    expect(component.errorMessage).toBe('Credenciales invalidas. Intenta nuevamente.');
  });

  // CASO DE PRUEBA 3: Validación de campos obligatorios en formulario
  it('LoginCamposVacios: no permite envio con campos vacios', () => {
    // preparacion
    component.username = '';
    component.password = '';

    // ejecucion
    component.onSubmit();

    // afirmacion
    expect(component.errorMessage).toBe('Ingresa tu usuario y tu contrasena');
  });
});
