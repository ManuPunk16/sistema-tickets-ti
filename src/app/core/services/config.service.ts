import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SystemConfig {
  nombreSistema:       string;
  emailSoporte:        string;
  modoMantenimiento:   boolean;
  notificacionesEmail: boolean;
  notifNuevoTicket:    boolean;
  notifCambioEstado:   boolean;
  notifComentario:     boolean;
  recordatorioActivo:  boolean;
  diasRecordatorio:    number;
  slaBaja:    number;
  slaMedia:   number;
  slaAlta:    number;
  slaCritica: number;
}

/** @deprecated Usar SystemConfig (campos en español) */
export interface LegacySystemConfig {
  systemName:                  string;
  supportEmail:                string;
  maintenanceMode:             boolean;
  emailNotificationsEnabled:   boolean;
  newTicketNotification:       boolean;
  statusChangeNotification:    boolean;
  commentNotification:         boolean;
  reminderEnabled:             boolean;
  reminderDays:                number;
  slaSettings: { low: number; medium: number; high: number; critical: number; };
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private readonly urlBase = `${environment.apiUrl}/configuracion`;

  /** Obtiene la configuración actual del sistema desde MongoDB */
  getSystemConfig(): Observable<SystemConfig> {
    return this.http
      .get<{ ok: boolean; configuracion: SystemConfig }>(this.urlBase)
      .pipe(
        map(r => r.configuracion),
        catchError(() => of(this.configPorDefecto()))
      );
  }

  /** Actualiza campos de configuración (solo admin) */
  saveSystemConfig(config: Partial<SystemConfig>): Observable<SystemConfig> {
    return this.http
      .put<{ ok: boolean; configuracion: SystemConfig }>(this.urlBase, config)
      .pipe(map(r => r.configuracion));
  }

  private configPorDefecto(): SystemConfig {
    return {
      nombreSistema:       'Sistema de Tickets TI',
      emailSoporte:        '',
      modoMantenimiento:   false,
      notificacionesEmail: true,
      notifNuevoTicket:    true,
      notifCambioEstado:   true,
      notifComentario:     true,
      recordatorioActivo:  false,
      diasRecordatorio:    7,
      slaBaja:    72,
      slaMedia:   24,
      slaAlta:    8,
      slaCritica: 2,
    };
  }
}

