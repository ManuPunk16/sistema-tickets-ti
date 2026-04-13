import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb             = inject(FormBuilder);
  private authService    = inject(AuthService);
  private notificaciones = inject(NotificacionService);

  protected cargando      = signal(false);
  protected correoEnviado = signal(false);

  protected formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected onSubmit(): void {
    if (this.formulario.invalid) return;

    this.cargando.set(true);
    const { email } = this.formulario.value;

    this.authService.resetPassword(email!).subscribe({
      next: () => {
        this.cargando.set(false);
        this.correoEnviado.set(true);
      },
      error: (err: { code?: string; message?: string }) => {
        this.cargando.set(false);
        this.notificaciones.error(this.obtenerMensajeError(err));
      }
    });
  }

  private obtenerMensajeError(error: { code?: string; message?: string }): string {
    switch (error.code) {
      case 'auth/user-not-found':  return 'No se encontró un usuario con este correo.';
      case 'auth/invalid-email':   return 'El correo electrónico no es válido.';
      default:                     return error.message ?? 'Error al enviar el correo. Intenta de nuevo.';
    }
  }
}
