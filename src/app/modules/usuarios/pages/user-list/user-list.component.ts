import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService }      from '../../../../core/services/user.service';
import { DepartmentService } from '../../../../core/services/department.service';
import { UserProfile }      from '../../../../core/models/user.model';
import {
  RolUsuario,
  ETIQUETA_ROL,
  CLASE_ROL,
  ROLES_ASIGNABLES,
} from '../../../../core/enums/roles-usuario.enum';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './user-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
  private userService       = inject(UserService);
  private departmentService = inject(DepartmentService);
  private fb                = inject(FormBuilder);

  private todos      = signal<UserProfile[]>([]);
  cargando           = signal(true);
  mensajeError       = signal<string | null>(null);
  textoBusqueda      = signal('');
  rolFiltro          = signal<RolUsuario | 'todos'>('todos');
  departamentoFiltro = signal('todos');
  departamentos      = signal<string[]>([]);

  // -- Modal crear usuario --
  modalCrearAbierto = signal(false);
  enviandoCrear     = signal(false);
  errorCrear        = signal<string | null>(null);

  formularioCrear = this.fb.group({
    email:       ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    password:    ['', [Validators.required, Validators.minLength(6)]],
    role:        [RolUsuario.User as string, Validators.required],
    department:  [''],
    position:    [''],
  });

  usuarios = computed(() => {
    let lista = this.todos();

    const texto = this.textoBusqueda().toLowerCase();
    if (texto) {
      lista = lista.filter(u =>
        u.displayName?.toLowerCase().includes(texto) ||
        u.email?.toLowerCase().includes(texto) ||
        u.position?.toLowerCase().includes(texto)
      );
    }

    const rol = this.rolFiltro();
    if (rol !== 'todos') lista = lista.filter(u => u.role === rol);

    const dep = this.departamentoFiltro();
    if (dep !== 'todos') lista = lista.filter(u => u.department === dep);

    return lista;
  });

  readonly etiquetaRol      = ETIQUETA_ROL;
  readonly claseRol         = CLASE_ROL;
  readonly rolesDisponibles = ROLES_ASIGNABLES;

  constructor() {
    this.cargarUsuarios();
    this.departmentService.getDepartments().subscribe(deps =>
      this.departamentos.set(deps)
    );
  }

  abrirModal(): void {
    this.formularioCrear.reset({
      email: '', displayName: '', password: '',
      role: RolUsuario.User, department: '', position: '',
    });
    this.errorCrear.set(null);
    this.modalCrearAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalCrearAbierto.set(false);
  }

  onCrearUsuario(): void {
    if (this.formularioCrear.invalid) return;

    this.enviandoCrear.set(true);
    this.errorCrear.set(null);
    const datos = this.formularioCrear.getRawValue();

    this.userService.createUser({
      email:       datos.email!,
      displayName: datos.displayName!,
      password:    datos.password!,
      role:        datos.role as 'admin' | 'support' | 'user',
      department:  datos.department || undefined,
      position:    datos.position   || undefined,
    }).subscribe({
      next: () => {
        this.enviandoCrear.set(false);
        this.cerrarModal();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.enviandoCrear.set(false);
        this.errorCrear.set(err.error?.error ?? err.message);
      },
    });
  }

  private cargarUsuarios(): void {
    this.cargando.set(true);
    this.userService.getAllUsers().subscribe({
      next: (usuarios) => {
        this.todos.set(usuarios as unknown as UserProfile[]);
        this.cargando.set(false);
      },
      error: (err) => {
        this.mensajeError.set('Error al cargar usuarios: ' + err.message);
        this.cargando.set(false);
      },
    });
  }

  inicialUsuario(user: UserProfile): string {
    return (user.displayName || user.email || 'U')[0].toUpperCase();
  }
}
