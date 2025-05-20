import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Error al iniciar sesión: ' + this.getErrorMessage(err), 'Cerrar', {
          duration: 5000,
        });
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
        console.error('Error de autenticación:', err);
        
        // Mensaje más amigable según el tipo de error
        const message = this.getErrorMessage(err);
        this.snackBar.open(message, 'Cerrar', {
          duration: 5000
        });
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.message?.includes('pending')) {
      return 'Su cuenta está pendiente de aprobación por un administrador.';
    }
    if (error.code === 'auth/popup-closed-by-user') {
      return 'El proceso de inicio de sesión fue cancelado.';
    }
    if (error.code === 'auth/network-request-failed') {
      return 'Error de red. Por favor, verifica tu conexión.';
    }
    
    // Si Firebase no puede conectarse a la base de datos
    if (error.message?.includes('Failed to get document')) {
      return 'Error al acceder a la base de datos. Por favor, contacta al administrador.';
    }
    
    return error.message || 'Error al iniciar sesión. Inténtalo de nuevo.';
  }
}
