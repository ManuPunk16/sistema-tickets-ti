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
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center mb-6">
        <button mat-icon-button [routerLink]="['/usuarios']" matTooltip="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-2xl font-bold ml-2">{{ isEditMode ? 'Editar' : 'Nuevo' }} Usuario</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <form *ngIf="!loading" [formGroup]="userForm" (ngSubmit)="onSubmit()" class="p-4">
            <!-- Email -->
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" placeholder="ejemplo@correo.com" type="email">
              <mat-error *ngIf="userForm.get('email')?.hasError('required')">
                El email es obligatorio
              </mat-error>
              <mat-error *ngIf="userForm.get('email')?.hasError('email')">
                Ingresa un email válido
              </mat-error>
            </mat-form-field>

            <!-- Nombre -->
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Nombre completo</mat-label>
              <input matInput formControlName="displayName" placeholder="Nombre completo">
              <mat-error *ngIf="userForm.get('displayName')?.hasError('required')">
                El nombre es obligatorio
              </mat-error>
            </mat-form-field>

            <!-- Contraseña (solo para nuevos usuarios) -->
            <div *ngIf="!isEditMode">
              <mat-form-field appearance="outline" class="w-full mb-4">
                <mat-label>Contraseña</mat-label>
                <input matInput formControlName="password" type="password" autocomplete="new-password">
                <mat-error *ngIf="userForm.get('password')?.hasError('required')">
                  La contraseña es obligatoria
                </mat-error>
                <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                  La contraseña debe tener al menos 6 caracteres
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Rol -->
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Rol</mat-label>
              <mat-select formControlName="role">
                <mat-option value="admin">Administrador</mat-option>
                <mat-option value="support">Soporte</mat-option>
                <mat-option value="user">Usuario</mat-option>
              </mat-select>
              <mat-error *ngIf="userForm.get('role')?.hasError('required')">
                El rol es obligatorio
              </mat-error>
            </mat-form-field>

            <!-- Departamento -->
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Departamento</mat-label>
              <mat-select formControlName="department">
                <mat-option value="">Sin departamento</mat-option>
                <mat-option *ngFor="let department of departments$ | async" [value]="department">
                  {{ department }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Cargo/Posición -->
            <mat-form-field appearance="outline" class="w-full mb-4">
              <mat-label>Cargo</mat-label>
              <input matInput formControlName="position" placeholder="Cargo o posición">
            </mat-form-field>

            <div class="flex justify-end gap-2 mt-4">
              <button mat-stroked-button [routerLink]="['/usuarios']" type="button">
                Cancelar
              </button>
              <button mat-raised-button color="primary" type="submit"
                [disabled]="userForm.invalid || isSubmitting">
                <div class="flex items-center">
                  <mat-spinner *ngIf="isSubmitting" diameter="20" class="mr-2"></mat-spinner>
                  <span>{{ isEditMode ? 'Actualizar' : 'Crear' }}</span>
                </div>
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
      if (id) {
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
      }
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
