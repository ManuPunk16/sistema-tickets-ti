import { Component, OnInit } from '@angular/core';

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
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
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
