import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PasswordMatchValidator } from '../../validators/password-match.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: PasswordMatchValidator.match('password', 'confirmPassword')
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    const { email, password, displayName } = this.registerForm.value;

    this.authService.register(email, password, displayName).subscribe({
      next: () => {
        // Este bloque no se ejecutará debido a que register siempre lanza un error
        this.snackBar.open('Registro exitoso. ¡Bienvenido!', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/dashboard']);
      },
      error: (error: Error) => { // Tipo explícito para evitar el error TS7006
        this.isLoading = false;
        this.snackBar.open('Registro completado: ' + error.message, 'Cerrar', {
          duration: 5000
        });
        this.router.navigate(['/auth/login']);
      }
    });
  }

  loginWithGoogle() {
    this.isLoading = true;
    this.authService.loginWithGoogle().subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Error al registrarse con Google: ' + this.getErrorMessage(err), 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  private getErrorMessage(error: any): string {
    switch(error.code) {
      case 'auth/email-already-in-use':
        return 'La dirección de correo ya está en uso';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil';
      default:
        return error.message;
    }
  }
}
