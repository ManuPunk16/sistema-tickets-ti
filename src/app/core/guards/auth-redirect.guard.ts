import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const AuthRedirectGuard = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    console.log('AuthRedirectGuard: Verificando autenticación...');
    
    // NUEVO: Asegurarse de que la autenticación está inicializada
    if (!authService.isAuthInitialized()) {
      console.log('AuthRedirectGuard: Esperando inicialización de auth...');
      
      // Esperar a que se complete la inicialización
      await firstValueFrom(authService.initializeAuth());
      console.log('AuthRedirectGuard: Inicialización completada');
    }
    
    // Ahora verificamos con usuarios actualizados
    const isLoggedIn = authService.isLoggedIn();
    console.log('AuthRedirectGuard: ¿Usuario logueado?', isLoggedIn);
    
    if (isLoggedIn) {
      const user = authService.getCurrentUserSync();
      console.log('AuthRedirectGuard: Usuario actual:', user);
      
      if (user) {
        console.log('AuthRedirectGuard: Redirigiendo al dashboard...');
        router.navigate(['/dashboard']);
        return false; // Impide el acceso a la ruta de login
      }
    }
    
    console.log('AuthRedirectGuard: Permitiendo acceso a página de login');
    return true;
  } catch (error) {
    console.error('Error en AuthRedirectGuard:', error);
    return true;
  }
};