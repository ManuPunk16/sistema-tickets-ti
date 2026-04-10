import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';

import { UserService }       from '../../../../core/services/user.service';
import { DepartmentService } from '../../../../core/services/department.service';
import {
  RolUsuario,
  ETIQUETA_ROL,
  ROLES_ASIGNABLES,
} from '../../../../core/enums/roles-usuario.enum';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  private fb                = inject(FormBuilder);
  private route             = inject(ActivatedRoute);
  private router            = inject(Router);
  private userService       = inject(UserService);
  private departmentService = inject(DepartmentService);

  modoEdicion  = signal(false);
  cargando     = signal(false);
  enviando     = signal(false);
  mensajeError = signal<string | null>(null);
  private userId = signal('');

  departamentos = toSignal(this.departmentService.getDepartments(), { initialValue: [] as string[] });

  readonly rolesAsignables = ROLES_ASIGNABLES;
  readonly etiquetaRol     = ETIQUETA_ROL;

  formulario = this.fb.group({
    email:       ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    password:    ['', [Validators.required, Validators.minLength(6)]],
    role:        [RolUsuario.User as string, Validators.required],
    department:  [''],
    position:    [''],
  });

  constructor() {
    this.route.params.pipe(
      switchMap(params => {
        const id = params['id'];
        if (!id) {
          this.router.navigate(['/auth/register']);
          return of(null);
        }

        this.modoEdicion.set(true);
        this.userId.set(id);
        this.cargando.set(true);
        this.formulario.get('password')?.disable();

        return this.userService.getUserById(id);
      })
    ).subscribe({
      next: (usuario) => {
        if (!usuario) return;
        this.formulario.patchValue({
          email:       usuario.email ?? '',
          displayName: usuario.displayName ?? '',
          role:        usuario.role,
          department:  usuario.department ?? '',
          position:    usuario.position   ?? '',
        });
        this.cargando.set(false);
      },
      error: (err) => {
        this.mensajeError.set('Error al cargar usuario: ' + err.message);
        this.cargando.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.formulario.invalid) return;

    this.enviando.set(true);
    this.mensajeError.set(null);
    const datos = this.formulario.getRawValue();

    if (this.modoEdicion()) {
      this.userService.updateUser(this.userId(), {
        displayName: datos.displayName ?? undefined,
        role:        datos.role as unknown as RolUsuario,
        department:  datos.department  || undefined,
        position:    datos.position    || undefined,
      }).subscribe({
        next: ()    => this.router.navigate(['/usuarios']),
        error: (err) => {
          this.enviando.set(false);
          this.mensajeError.set('Error al actualizar: ' + err.message);
        },
      });
    } else {
      this.userService.createUser({
        email:       datos.email!,
        displayName: datos.displayName!,
        password:    datos.password!,
        role:        datos.role as 'admin' | 'support' | 'user',
        department:  datos.department || undefined,
        position:    datos.position   || undefined,
      }).subscribe({
        next: ()    => this.router.navigate(['/usuarios']),
        error: (err) => {
          this.enviando.set(false);
          this.mensajeError.set(err.error?.error ?? err.message);
        },
      });
    }
  }
}
