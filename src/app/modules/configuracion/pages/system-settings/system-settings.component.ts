import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService, SystemConfig } from '../../../../core/services/config.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';

type PestanaActiva = 'general' | 'notificaciones' | 'sla';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
})
export class SystemSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  private notificacion = inject(NotificacionService);

  protected cargando = signal(true);
  protected guardandoGeneral = signal(false);
  protected guardandoNotificaciones = signal(false);
  protected guardandoSla = signal(false);
  protected pestanaActiva = signal<PestanaActiva>('general');

  protected formularioGeneral: FormGroup = this.fb.group({
    nombreSistema: ['', Validators.required],
    emailSoporte: ['', [Validators.required, Validators.email]],
    modoMantenimiento: [false],
  });

  protected formularioNotificaciones: FormGroup = this.fb.group({
    notificacionesEmail: [true],
    notifNuevoTicket: [true],
    notifCambioEstado: [true],
    notifComentario: [true],
    recordatorioActivo: [false],
    diasRecordatorio: [7, [Validators.min(1), Validators.max(30)]],
  });

  protected formularioSla: FormGroup = this.fb.group({
    slaBaja: [72, [Validators.required, Validators.min(1)]],
    slaMedia: [24, [Validators.required, Validators.min(1)]],
    slaAlta: [8, [Validators.required, Validators.min(1)]],
    slaCritica: [2, [Validators.required, Validators.min(1)]],
  });

  // Computed para deshabilitar controles de notificaciones individuales
  protected notificacionesEmailActivas = computed(
    () => !!this.formularioNotificaciones.get('notificacionesEmail')?.value
  );

  protected recordatorioActivo = computed(
    () => !!this.formularioNotificaciones.get('recordatorioActivo')?.value
  );

  ngOnInit(): void {
    this.configService.getSystemConfig().subscribe({
      next: (config: SystemConfig) => {
        this.formularioGeneral.patchValue({
          nombreSistema: config.nombreSistema,
          emailSoporte: config.emailSoporte,
          modoMantenimiento: config.modoMantenimiento,
        });
        this.formularioNotificaciones.patchValue({
          notificacionesEmail: config.notificacionesEmail,
          notifNuevoTicket: config.notifNuevoTicket,
          notifCambioEstado: config.notifCambioEstado,
          notifComentario: config.notifComentario,
          recordatorioActivo: config.recordatorioActivo,
          diasRecordatorio: config.diasRecordatorio,
        });
        this.formularioSla.patchValue({
          slaBaja: config.slaBaja,
          slaMedia: config.slaMedia,
          slaAlta: config.slaAlta,
          slaCritica: config.slaCritica,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.notificacion.error('Error al cargar la configuración del sistema');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarPestana(pestana: PestanaActiva): void {
    this.pestanaActiva.set(pestana);
  }

  protected guardarGeneral(): void {
    if (this.formularioGeneral.invalid) return;
    this.guardandoGeneral.set(true);

    this.configService.saveSystemConfig(this.formularioGeneral.value).subscribe({
      next: () => {
        this.notificacion.exito('Configuración general guardada correctamente');
        this.formularioGeneral.markAsPristine();
        this.guardandoGeneral.set(false);
      },
      error: () => {
        this.notificacion.error('Error al guardar la configuración general');
        this.guardandoGeneral.set(false);
      },
    });
  }

  protected guardarNotificaciones(): void {
    if (this.formularioNotificaciones.invalid) return;
    this.guardandoNotificaciones.set(true);

    this.configService.saveSystemConfig(this.formularioNotificaciones.value).subscribe({
      next: () => {
        this.notificacion.exito('Configuración de notificaciones guardada correctamente');
        this.formularioNotificaciones.markAsPristine();
        this.guardandoNotificaciones.set(false);
      },
      error: () => {
        this.notificacion.error('Error al guardar la configuración de notificaciones');
        this.guardandoNotificaciones.set(false);
      },
    });
  }

  protected guardarSla(): void {
    if (this.formularioSla.invalid) return;
    this.guardandoSla.set(true);

    this.configService.saveSystemConfig(this.formularioSla.value).subscribe({
      next: () => {
        this.notificacion.exito('Configuración de SLAs guardada correctamente');
        this.formularioSla.markAsPristine();
        this.guardandoSla.set(false);
      },
      error: () => {
        this.notificacion.error('Error al guardar la configuración de SLAs');
        this.guardandoSla.set(false);
      },
    });
  }
}
