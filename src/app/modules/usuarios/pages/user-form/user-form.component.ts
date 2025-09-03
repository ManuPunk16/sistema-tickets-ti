import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { Observable, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  loading = false;
  isSubmitting = false;
  userId: string = '';
  departments$: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private departmentService: DepartmentService,
    private snackBar: MatSnackBar
  ) {
    this.userForm = this.createForm();
    this.departments$ = this.departmentService.getDepartments();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (!id) {
        // Ya no manejamos la creación aquí, redirigir a register
        this.router.navigate(['/auth/register']);
        return;
      }
      
      // Solo manejar la edición
      this.isEditMode = true;
      this.userId = id;
      this.loading = true;

      this.userService.getUserById(id).subscribe({
        next: (user) => {
          if (user) {
            this.userForm.patchValue({
              email: user.email,
              displayName: user.displayName,
              role: user.role,
              department: user.department,
              position: user.position
            });

            // Contraseña no se edita
            this.userForm.get('password')?.disable();
          } else {
            this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
            this.router.navigate(['/usuarios']);
          }
          this.loading = false;
        },
        error: (error) => {
          this.snackBar.open(`Error al cargar usuario: ${error.message}`, 'Cerrar', { duration: 3000 });
          this.router.navigate(['/usuarios']);
        }
      });
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      role: ['user', [Validators.required]],
      department: [''],
      position: ['']
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) return;

    this.isSubmitting = true;
    const userData = this.userForm.value;

    if (this.isEditMode) {
      // Actualizar usuario existente
      this.userService.updateUser(this.userId, userData).subscribe({
        next: () => {
          this.snackBar.open('Usuario actualizado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/usuarios']);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open(`Error al actualizar usuario: ${error.message}`, 'Cerrar', { duration: 5000 });
        }
      });
    } else {
      // Crear nuevo usuario
      this.authService.registerUser(userData.email, userData.password).pipe(
        switchMap(userCredential => {
          const uid = userCredential.user.uid;
          const newUser = {
            uid,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            department: userData.department || null,
            position: userData.position || null,
            createdAt: new Date().toISOString()
          };

          return this.userService.createUserProfile(uid, newUser);
        }),
        tap(() => {
          this.snackBar.open('Usuario creado correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/usuarios']);
        })
      ).subscribe({
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open(`Error al crear usuario: ${error.message}`, 'Cerrar', { duration: 5000 });
        }
      });
    }
  }
}
