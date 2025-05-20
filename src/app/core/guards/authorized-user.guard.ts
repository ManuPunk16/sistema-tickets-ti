import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AuthorizedUserGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.getCurrentUser().pipe(
      take(1),
      map(user => {
        // Permitir acceso solo a usuarios con rol válido (no pending ni inactive)
        if (!user) {
          this.router.navigate(['/auth/login'], { 
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        // Verificar si el rol es válido
        const validRoles = ['admin', 'support', 'user'];
        // Todos los posibles roles incluyendo los no válidos
        const allRoles = [...validRoles, 'pending', 'inactive'] as const;
        const isValidRole = validRoles.includes(user.role as typeof allRoles[number]);
        
        if (!isValidRole) {
          // Si el usuario está pendiente o inactivo
          this.authService.logout().subscribe();
          
          if ((user.role as typeof allRoles[number]) === 'pending') {
            this.snackBar.open('Su cuenta está pendiente de aprobación por un administrador', 'Cerrar', {
              duration: 5000
            });
          } else {
            this.snackBar.open('Su cuenta ha sido desactivada', 'Cerrar', {
              duration: 5000
            });
          }
          
          return false;
        }
        
        // Verificar restricción adicional de rol si existe
        const requiredRoles = route.data['roles'] as string[];
        if (requiredRoles && !requiredRoles.includes(user.role)) {
          this.snackBar.open('No tiene permisos para acceder a esta sección', 'Cerrar', {
            duration: 5000
          });
          this.router.navigate(['/dashboard']);
          return false;
        }
        
        return true;
      })
    );
  }
}