import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NavbarComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private authService    = inject(AuthService);
  private router         = inject(Router);
  private route          = inject(ActivatedRoute);
  private notificaciones = inject(NotificacionService);

  protected cargando        = signal(false);
  protected mostrarPassword = signal(false);
  protected googleHabilitado = false;

  protected formulario = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    if (!this.authService.isAuthInitialized()) {
      this.authService.initializeAuth().subscribe({
        next:  () => this.verificarYRedirigir(),
        error: () => this.iniciarComponente()
      });
    } else {
      this.verificarYRedirigir();
    }
  }

  private verificarYRedirigir(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.verificarRedirect();
  }

  private verificarRedirect(): void {
    this.authService.checkRedirectResult().subscribe({
      next: result => {
        if (result) {
          this.router.navigate(['/dashboard']);
          return;
        }
        this.iniciarComponente();
      },
      error: err => {
        this.notificaciones.error(this.obtenerMensajeError(err));
        this.iniciarComponente();
      }
    });
  }

  private iniciarComponente(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.route.queryParams.subscribe(params => {
      const mensaje = params['message'];
      if (mensaje) {
        const textos: Record<string, string> = {
          pendingApproval: 'Su cuenta está pendiente de aprobación por un administrador.',
          accountInactive: 'Su cuenta ha sido desactivada. Contacte al administrador.',
          loginRequired:   'Debe iniciar sesión para acceder al sistema.',
          sessionExpired:  'Su sesión ha expirado. Por favor inicie sesión nuevamente.',
        };
        this.notificaciones.advertencia(textos[mensaje] ?? mensaje);
      }
    });
  }

  protected togglePassword(): void {
    this.mostrarPassword.update(v => !v);
  }

  protected onSubmit(): void {
    if (this.formulario.invalid) return;

    this.cargando.set(true);
    const { email, password } = this.formulario.value;

    this.authService.login(email!, password!).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: err => {
        this.cargando.set(false);
        this.notificaciones.error(this.obtenerMensajeError(err));
      }
    });
  }

  protected loginConGoogle(): void {
    this.cargando.set(true);
    this.authService.loginWithGoogle().subscribe({
      next: result => {
        if (result === null) {
          this.notificaciones.info('Redirigiendo a Google para autenticación...');
        } else {
          this.router.navigate(['/dashboard']);
          this.cargando.set(false);
        }
      },
      error: err => {
        this.cargando.set(false);
        this.notificaciones.error(this.obtenerMensajeError(err));
      }
    });
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message?.includes('pending') || error.message?.includes('aprobación')) {
        return 'Su cuenta está pendiente de aprobación por un administrador.';
      }
      if (error.message?.includes('desactivada') || error.message?.includes('Cuenta')) {
        return error.message;
      }
    }
    const err = error as { code?: string; message?: string };
    switch (err.code) {
      case 'auth/popup-closed-by-user':      return 'Inicio de sesión cancelado.';
      case 'auth/network-request-failed':    return 'Error de red. Verifica tu conexión.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':        return 'Correo o contraseña incorrectos.';
      case 'auth/too-many-requests':         return 'Demasiados intentos fallidos. Espera unos minutos.';
      default:                               return 'Error al iniciar sesión. Intenta de nuevo.';
    }
  }
}

