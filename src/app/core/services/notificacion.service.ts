import { Injectable, signal, computed } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'advertencia' | 'info';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  duracion: number; // milisegundos
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private _notificaciones = signal<Notificacion[]>([]);

  /** Lista de notificaciones activas (solo lectura) */
  readonly notificaciones = computed(() => this._notificaciones());

  /** Muestra un mensaje de éxito */
  exito(mensaje: string, duracion = 3000): void {
    this._agregar('exito', mensaje, duracion);
  }

  /** Muestra un mensaje de error */
  error(mensaje: string, duracion = 5000): void {
    this._agregar('error', mensaje, duracion);
  }

  /** Muestra un mensaje de advertencia */
  advertencia(mensaje: string, duracion = 4000): void {
    this._agregar('advertencia', mensaje, duracion);
  }

  /** Muestra un mensaje informativo */
  info(mensaje: string, duracion = 3000): void {
    this._agregar('info', mensaje, duracion);
  }

  /** Elimina una notificación por ID */
  cerrar(id: string): void {
    this._notificaciones.update(lista => lista.filter(n => n.id !== id));
  }

  private _agregar(tipo: TipoNotificacion, mensaje: string, duracion: number): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notificacion: Notificacion = { id, tipo, mensaje, duracion };

    this._notificaciones.update(lista => [...lista, notificacion]);

    // Auto-eliminar después de la duración indicada
    setTimeout(() => this.cerrar(id), duracion);
  }
}
