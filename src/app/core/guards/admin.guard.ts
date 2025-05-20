import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
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
        const isAdmin = user?.role === 'admin';
        
        if (!isAdmin) {
          this.snackBar.open('Acceso denegado. Requiere privilegios de administrador', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          
          this.router.navigate(['/dashboard']);
        }
        
        return isAdmin;
      })
    );
  }
}