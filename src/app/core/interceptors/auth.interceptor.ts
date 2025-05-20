import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejar errores de autenticación 401 o 403
      if (error.status === 401 || error.status === 403) {
        // Cerrar sesión y redireccionar a login
        authService.logout().subscribe(() => {
          router.navigate(['/auth/login'], {
            queryParams: { expired: 'true' }
          });
        });
      }
      
      return throwError(() => error);
    })
  );
};