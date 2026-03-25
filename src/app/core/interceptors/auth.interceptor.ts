import { HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Solo interceptar llamadas al propio API
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const token$ = from(auth.currentUser?.getIdToken() ?? Promise.resolve(null));

  return token$.pipe(
    switchMap(token => {
      const reqConToken = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(reqConToken);
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        authService.logout().subscribe(() => {
          router.navigate(['/auth/login'], { queryParams: { expired: 'true' } });
        });
      }
      return throwError(() => error);
    })
  );
};
