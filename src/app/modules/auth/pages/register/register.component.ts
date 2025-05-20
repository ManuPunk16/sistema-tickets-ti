import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PasswordMatchValidator } from '../../validators/password-match.validator';
import { UserService } from '../../../../core/services/user.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  departments$: Observable<string[]> | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private departmentService: DepartmentService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Mejorar el formulario para incluir los campos departamento y cargo
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['user', [Validators.required]],
      department: [''],
      position: ['']
    }, {
      validators: PasswordMatchValidator.match('password', 'confirmPassword')
    });
    
    // Cargar departamentos si está disponible el servicio
    try {
      this.departments$ = this.departmentService.getDepartments();
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  }

  ngOnInit(): void {
    // Verificar si el usuario actual es admin, de lo contrario redireccionar
    this.authService.getCurrentUser().subscribe(user => {
      if (!user || user.role !== 'admin') {
        this.snackBar.open('Solo administradores pueden registrar nuevos usuarios', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/dashboard']);
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    const { email, password, displayName, role, department, position } = this.registerForm.value;

    // Registro directo por el administrador (no pasa por estado pending)
    this.authService.registerUser(email, password).subscribe({
      next: (credential) => {
        // Crear el perfil con el rol seleccionado
        const uid = credential.user.uid;
        this.authService.createUserProfile(uid, {
          uid,
          email,
          displayName,
          role, // El rol seleccionado por el admin
          department: department || null,
          position: position || null,
          createdAt: new Date().toISOString(),
          createdBy: 'admin'
        }).subscribe({
          next: () => {
            this.snackBar.open(`Usuario ${displayName} creado exitosamente con rol de ${this.getRoleText(role)}`, 'Cerrar', {
              duration: 5000
            });
            this.router.navigate(['/usuarios']);
          },
          error: (err) => {
            this.handleError(err);
          }
        });
      },
      error: (err) => {
        this.handleError(err);
      }
    });
  }

  private getRoleText(role: string): string {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'support': return 'Soporte';
      case 'user': return 'Usuario';
      default: return role;
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    
    let errorMessage = 'Ocurrió un error durante el registro';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Este correo electrónico ya está registrado';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'El correo electrónico no es válido';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es demasiado débil';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('Error de registro:', error);
    
    this.snackBar.open(errorMessage, 'Cerrar', {
      duration: 5000
    });
  }
}
