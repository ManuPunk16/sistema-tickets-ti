import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NotificacionService, Notificacion } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-notificaciones-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Contenedor fijo de toasts — esquina inferior derecha -->
    <div
      class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      @for (n of notificaciones(); track n.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg border px-4 py-3 text-sm transition-all duration-300 animate-[slideIn_0.2s_ease-out]"
          [class]="estiloContenedor(n)"
          role="alert"
        >
          <!-- Icono -->
          <span class="flex-shrink-0 mt-0.5" [innerHTML]="icono(n.tipo)"></span>

          <!-- Mensaje -->
          <p class="flex-1 leading-snug font-medium" [class]="estiloTexto(n)">{{ n.mensaje }}</p>

          <!-- Botón cerrar -->
          <button
            type="button"
            (click)="cerrar(n.id)"
            class="flex-shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-opacity"
            [class]="estiloCerrar(n)"
            aria-label="Cerrar notificación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
  `],
})
export class NotificacionesToastComponent {
  private notificacionService = inject(NotificacionService);
  protected notificaciones = this.notificacionService.notificaciones;

  protected cerrar(id: string): void {
    this.notificacionService.cerrar(id);
  }

  protected estiloContenedor(n: Notificacion): string {
    const estilos: Record<string, string> = {
      exito:       'bg-green-50 border-green-200',
      error:       'bg-red-50 border-red-200',
      advertencia: 'bg-yellow-50 border-yellow-200',
      info:        'bg-blue-50 border-blue-200',
    };
    return estilos[n.tipo] ?? estilos['info'];
  }

  protected estiloTexto(n: Notificacion): string {
    const estilos: Record<string, string> = {
      exito:       'text-green-800',
      error:       'text-red-800',
      advertencia: 'text-yellow-800',
      info:        'text-blue-800',
    };
    return estilos[n.tipo] ?? estilos['info'];
  }

  protected estiloCerrar(n: Notificacion): string {
    const estilos: Record<string, string> = {
      exito:       'focus:ring-green-500',
      error:       'focus:ring-red-500',
      advertencia: 'focus:ring-yellow-500',
      info:        'focus:ring-blue-500',
    };
    return estilos[n.tipo] ?? estilos['info'];
  }

  protected icono(tipo: string): string {
    const iconos: Record<string, string> = {
      exito: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`,
      advertencia: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`,
    };
    return iconos[tipo] ?? iconos['info'];
  }
}
