import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConfigService } from '../../../../core/services/config.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="p-4 md:p-6">
      <h1 class="text-2xl font-bold mb-6">Configuración del Sistema</h1>

      <div *ngIf="loading" class="flex justify-center my-8">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <mat-card *ngIf="!loading">
        <mat-card-content>
          <mat-tab-group>
            <!-- Configuración General -->
            <mat-tab label="General">
              <div class="p-4">
                <form [formGroup]="generalForm" (ngSubmit)="saveGeneralSettings()">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline">
                      <mat-label>Nombre del Sistema</mat-label>
                      <input matInput formControlName="systemName">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Email de Soporte</mat-label>
                      <input matInput formControlName="supportEmail" type="email">
                      <mat-error *ngIf="generalForm.get('supportEmail')?.hasError('email')">
                        Ingrese un email válido
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div>
                    <mat-slide-toggle formControlName="maintenanceMode" color="warn">
                      Modo de Mantenimiento
                    </mat-slide-toggle>
                    <p *ngIf="generalForm.get('maintenanceMode')?.value" class="text-sm text-red-500 mt-1">
                      El sistema estará inaccesible excepto para administradores
                    </p>
                  </div>

                  <div class="mt-4 flex justify-end">
                    <button mat-raised-button color="primary" type="submit" [disabled]="generalForm.pristine || generalForm.invalid">
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Configuración de Notificaciones -->
            <mat-tab label="Notificaciones">
              <div class="p-4">
                <form [formGroup]="notificationsForm" (ngSubmit)="saveNotificationSettings()">
                  <mat-card class="mb-4 bg-gray-50">
                    <mat-card-content>
                      <h3 class="text-lg font-medium mb-4">Notificaciones por Email</h3>

                      <div class="grid gap-4">
                        <mat-slide-toggle formControlName="emailNotificationsEnabled" color="primary">
                          Habilitar notificaciones por email
                        </mat-slide-toggle>

                        <mat-slide-toggle formControlName="newTicketNotification" [disabled]="!notificationsForm.get('emailNotificationsEnabled')?.value">
                          Notificar cuando se crea un nuevo ticket
                        </mat-slide-toggle>

                        <mat-slide-toggle formControlName="statusChangeNotification" [disabled]="!notificationsForm.get('emailNotificationsEnabled')?.value">
                          Notificar cambios de estado
                        </mat-slide-toggle>

                        <mat-slide-toggle formControlName="commentNotification" [disabled]="!notificationsForm.get('emailNotificationsEnabled')?.value">
                          Notificar nuevos comentarios
                        </mat-slide-toggle>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="mb-4 bg-gray-50">
                    <mat-card-content>
                      <h3 class="text-lg font-medium mb-4">Recordatorios</h3>

                      <div class="grid gap-4">
                        <mat-slide-toggle formControlName="reminderEnabled" color="primary">
                          Habilitar recordatorios
                        </mat-slide-toggle>

                        <mat-form-field appearance="outline" *ngIf="notificationsForm.get('reminderEnabled')?.value">
                          <mat-label>Días para recordatorio de ticket sin actividad</mat-label>
                          <input matInput type="number" formControlName="reminderDays" min="1">
                        </mat-form-field>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <div class="mt-4 flex justify-end">
                    <button mat-raised-button color="primary" type="submit" [disabled]="notificationsForm.pristine || notificationsForm.invalid">
                      Guardar Configuración
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <!-- Categorías y prioridades personalizables -->
            <mat-tab label="Categorías y Prioridades">
              <div class="p-4">
                <form [formGroup]="categoriesForm" (ngSubmit)="saveCategoriesSettings()">
                  <!-- Categorías de Tickets -->
                  <h3 class="text-lg font-medium mb-4">Categorías de Tickets</h3>

                  <div class="mb-6">
                    <!-- Aquí iría un sistema para gestionar categorías personalizadas -->
                    <p class="text-sm text-gray-500 italic">Funcionalidad para gestión de categorías en desarrollo.</p>
                  </div>

                  <mat-divider class="my-6"></mat-divider>

                  <!-- SLAs por prioridad -->
                  <h3 class="text-lg font-medium mb-4">Tiempos de Respuesta (SLA)</h3>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <mat-form-field appearance="outline">
                      <mat-label>Tiempo respuesta - Prioridad Baja (horas)</mat-label>
                      <input matInput type="number" formControlName="slaLow" min="0">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Tiempo respuesta - Prioridad Media (horas)</mat-label>
                      <input matInput type="number" formControlName="slaMedium" min="0">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Tiempo respuesta - Prioridad Alta (horas)</mat-label>
                      <input matInput type="number" formControlName="slaHigh" min="0">
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Tiempo respuesta - Prioridad Crítica (horas)</mat-label>
                      <input matInput type="number" formControlName="slaCritical" min="0">
                    </mat-form-field>
                  </div>

                  <div class="mt-4 flex justify-end">
                    <button mat-raised-button color="primary" type="submit" [disabled]="categoriesForm.pristine || categoriesForm.invalid">
                      Guardar Configuración
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    mat-tab-group {
      min-height: 400px;
    }
  `]
})
export class SystemSettingsComponent implements OnInit {
  generalForm: FormGroup;
  notificationsForm: FormGroup;
  categoriesForm: FormGroup;

  loading = true;

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {
    this.generalForm = this.createGeneralForm();
    this.notificationsForm = this.createNotificationsForm();
    this.categoriesForm = this.createCategoriesForm();
  }

  ngOnInit(): void {
    // Simulamos carga de configuración
    setTimeout(() => {
      this.loading = false;

      // En una implementación real, aquí cargarías los datos desde el servicio
      // this.configService.getGeneralSettings().subscribe(settings => {
      //   this.generalForm.patchValue(settings);
      // });
    }, 500);
  }

  createGeneralForm(): FormGroup {
    return this.fb.group({
      systemName: ['Sistema de Tickets TI', Validators.required],
      supportEmail: ['soporte@empresa.com', [Validators.required, Validators.email]],
      maintenanceMode: [false]
    });
  }

  createNotificationsForm(): FormGroup {
    return this.fb.group({
      emailNotificationsEnabled: [true],
      newTicketNotification: [true],
      statusChangeNotification: [true],
      commentNotification: [true],
      reminderEnabled: [false],
      reminderDays: [7, [Validators.min(1), Validators.max(30)]]
    });
  }

  createCategoriesForm(): FormGroup {
    return this.fb.group({
      slaLow: [48, [Validators.required, Validators.min(0)]],
      slaMedium: [24, [Validators.required, Validators.min(0)]],
      slaHigh: [8, [Validators.required, Validators.min(0)]],
      slaCritical: [4, [Validators.required, Validators.min(0)]]
    });
  }

  saveGeneralSettings(): void {
    if (this.generalForm.invalid) return;

    // En una implementación real, guardarías en la base de datos
    // this.configService.saveGeneralSettings(this.generalForm.value).subscribe();

    this.snackBar.open('Configuración general guardada', 'Cerrar', { duration: 3000 });
  }

  saveNotificationSettings(): void {
    if (this.notificationsForm.invalid) return;

    // this.configService.saveNotificationSettings(this.notificationsForm.value).subscribe();

    this.snackBar.open('Configuración de notificaciones guardada', 'Cerrar', { duration: 3000 });
  }

  saveCategoriesSettings(): void {
    if (this.categoriesForm.invalid) return;

    // this.configService.saveCategoriesSettings(this.categoriesForm.value).subscribe();

    this.snackBar.open('Configuración de categorías y SLAs guardada', 'Cerrar', { duration: 3000 });
  }
}
