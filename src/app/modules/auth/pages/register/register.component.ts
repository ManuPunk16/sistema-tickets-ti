import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { PasswordMatchValidator } from '../../validators/password-match.validator';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb             = inject(FormBuilder);
  private readonly authService    = inject(AuthService);
  private readonly deptService    = inject(DepartmentService);
  private readonly notificacion   = inject(NotificacionService);
  private readonly router         = inject(Router);

  protected readonly cargando              = signal(false);
  protected readonly ocultarPassword       = signal(true);
  protected readonly ocultarConfirmPassword = signal(true);

  // Listas reactivas con toSignal — sin async pipe ni suscripciones manuales
  protected readonly departamentos = toSignal(
    this.deptService.getDepartments(),
    { initialValue: [] as string[] }
  );
  protected readonly usuarioActual = toSignal(
    this.authService.getCurrentUser(),
    { initialValue: null }
  );

  protected readonly formulario = this.fb.group({
    displayName:     ['', [Validators.required]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    role:            ['user', [Validators.required]],
    department:      [''],
    position:        [''],
  }, {
    validators: PasswordMatchValidator.match('password', 'confirmPassword'),
  });

  constructor() {
    // Verificar que el usuario sea admin; de lo contrario, redirigir
    this.authService.getCurrentUser().pipe(take(1)).subscribe(usuario => {
      if (!usuario || usuario.role !== 'admin') {
        this.notificacion.advertencia('Solo administradores pueden registrar nuevos usuarios');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  protected onSubmit(): void {
    if (this.formulario.invalid) return;

    this.cargando.set(true);
    const { email, password, displayName, role, department, position } = this.formulario.value;

    // Paso 1: crear en Firebase Auth
    this.authService.registerUser(email!, password!).subscribe({
      next: (credential) => {
        const uid = credential.user.uid;

        // Paso 2: registrar en MongoDB con el rol asignado por el admin
        this.authService.registrarUsuarioPorAdmin({
          uid,
          email:      email!,
          displayName: displayName!,
          role:        role! as 'admin' | 'support' | 'user',
          department:  department  || undefined,
          position:    position    || undefined,
        }).subscribe({
          next: () => {
            this.cargando.set(false);
            this.notificacion.exito(
              `Usuario ${displayName} creado con rol de ${this.getRoleText(role!)}`
            );
            this.router.navigate(['/usuarios']);
          },
          error: (err: unknown) => this.manejarError(err),
        });
      },
      error: (err: unknown) => this.manejarError(err),
    });
  }

  protected toggleOcultarPassword(): void {
    this.ocultarPassword.update(v => !v);
  }

  protected toggleOcultarConfirmPassword(): void {
    this.ocultarConfirmPassword.update(v => !v);
  }

  private getRoleText(role: string): string {
    const textos: Record<string, string> = {
      admin:   'Administrador',
      support: 'Soporte',
      user:    'Usuario',
    };
    return textos[role] ?? role;
  }

  private manejarError(error: unknown): void {
    this.cargando.set(false);
    const err = error as { code?: string; message?: string };

    let mensaje = 'Ocurrió un error durante el registro';
    if (err.code === 'auth/email-already-in-use') {
      mensaje = 'Este correo electrónico ya está registrado';
    } else if (err.code === 'auth/invalid-email') {
      mensaje = 'El correo electrónico no es válido';
    } else if (err.code === 'auth/weak-password') {
      mensaje = 'La contraseña es demasiado débil';
    } else if (err.message) {
      mensaje = err.message;
    }

    this.notificacion.error(mensaje);
  }
}
