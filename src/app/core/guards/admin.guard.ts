import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../enums/roles-usuario.enum';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  return authService.getCurrentUser().pipe(
    take(1),
    map(usuario => {
      if (usuario?.role === RolUsuario.Admin) return true;
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
