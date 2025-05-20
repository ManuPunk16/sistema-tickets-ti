import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-login',
  standalone: true,
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
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Verificar si el usuario ya está autenticado
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Verificar parámetros de query para mensajes
    this.route.queryParams.subscribe(params => {
      const message = params['message'];
      if (message) {
        let messageText = '';
        switch (message) {
          case 'pendingApproval':
            messageText = 'Su cuenta está pendiente de aprobación por un administrador.';
            break;
          case 'accountInactive':
            messageText = 'Su cuenta ha sido desactivada. Contacte al administrador.';
            break;
          case 'loginRequired':
            messageText = 'Debe iniciar sesión para acceder al sistema.';
            break;
          case 'sessionExpired':
            messageText = 'Su sesión ha expirado. Por favor inicie sesión nuevamente.';
            break;
          default:
            messageText = message;
        }
        
        if (messageText) {
          this.snackBar.open(messageText, 'Cerrar', { 
            duration: 6000,
            panelClass: ['error-snackbar']
          });
        }
      }
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
    
    try {
      this.authService.loginWithGoogle().subscribe({
        next: (result) => {
          // Si es null, significa que ocurrirá una redirección
          if (result === null) {
            console.log('Redirección a Google iniciada...');
            this.snackBar.open('Redirigiendo a Google para autenticación...', 'OK', { duration: 3000 });
            // No desactivamos isLoading ya que la página se recargará
          } else {
            this.router.navigate(['/dashboard']);
            this.isLoading = false;
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error de autenticación:', err);
          
          const message = this.getErrorMessage(err);
          this.snackBar.open(message, 'Cerrar', {
            duration: 5000
          });
        },
        complete: () => {
          // Este bloque puede que no se ejecute en caso de redirección
          this.isLoading = false;
        }
      });
    } catch (error) {
      this.isLoading = false;
      console.error('Error al iniciar proceso de login con Google:', error);
      this.snackBar.open('Error al iniciar el proceso de autenticación con Google', 'Cerrar', {
        duration: 5000
      });
    }
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
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return 'Correo electrónico o contraseña incorrectos.';
    }
    if (error.code === 'auth/invalid-credential') {
      return 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
    }
    if (error.code === 'auth/too-many-requests') {
      return 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
    }
    
    // Si Firebase no puede conectarse a la base de datos
    if (error.message?.includes('Failed to get document')) {
      return 'Error al acceder a la base de datos. Por favor, contacta al administrador.';
    }
    
    return error.message || 'Error al iniciar sesión. Inténtalo de nuevo.';
  }
}
