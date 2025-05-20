import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const AuthorizedUserGuard = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    // Verificar si el usuario está logueado usando la propiedad sincrónica
    if (!authService.isLoggedIn()) {
      // Si no hay usuario autenticado, redirigir al login
      router.navigate(['/auth/login'], {
        queryParams: {
          message: 'loginRequired',
          returnUrl: state.url
        }
      });
      return false;
    }
    
    // Obtener el perfil del usuario
    const user = await firstValueFrom(authService.getCurrentUser());
    
    // Verificar si el usuario tiene un perfil válido
    if (!user) {
      router.navigate(['/auth/login'], {
        queryParams: {
          message: 'loginRequired',
          returnUrl: state.url
        }
      });
      return false;
    }

    // Verificar si el rol es válido
    const roles = route.data['roles'] as Array<string>;
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en AuthorizedUserGuard:', error);
    router.navigate(['/auth/login'], {
      queryParams: { message: 'sessionExpired' }
    });
    return false;
  }
};