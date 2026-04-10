import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DepartmentService } from '../../../../core/services/department.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';

@Component({
  selector: 'app-department-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './department-form.component.html',
  styleUrls: ['./department-form.component.scss']
})
export class DepartmentFormComponent implements OnInit {
  private fb            = inject(FormBuilder);
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private deptService   = inject(DepartmentService);
  private notificacion  = inject(NotificacionService);

  departmentForm: FormGroup = this.fb.group({
    nombre:      ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', Validators.maxLength(500)]
  });

  protected isEditMode    = false;
  protected cargando      = signal(false);
  protected enviando      = signal(false);
  private departmentId: string | null = null;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.departmentId = id;
        this.cargando.set(true);

        this.deptService.getDepartmentById(id).subscribe({
          next: (dept) => {
            if (dept) {
              this.departmentForm.patchValue({
                nombre:      dept.nombre,
                descripcion: dept.descripcion
              });
            } else {
              this.notificacion.advertencia('Departamento no encontrado');
              this.router.navigate(['/departamentos']);
            }
            this.cargando.set(false);
          },
          error: (err: Error) => {
            this.notificacion.error('Error al cargar departamento: ' + err.message);
            this.router.navigate(['/departamentos']);
          }
        });
      }
    });
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) return;

    this.enviando.set(true);
    const datos = this.departmentForm.value;

    if (this.isEditMode && this.departmentId) {
      this.deptService.updateDepartment(this.departmentId, datos).subscribe({
        next: () => {
          this.notificacion.exito('Departamento actualizado correctamente');
          this.router.navigate(['/departamentos']);
        },
        error: (err: Error) => {
          this.notificacion.error('Error al actualizar departamento: ' + err.message);
          this.enviando.set(false);
        }
      });
    } else {
      this.deptService.createDepartment(datos).subscribe({
        next: () => {
          this.notificacion.exito('Departamento creado correctamente');
          this.router.navigate(['/departamentos']);
        },
        error: (err: Error) => {
          this.notificacion.error('Error al crear departamento: ' + err.message);
          this.enviando.set(false);
        }
      });
    }
  }
}
