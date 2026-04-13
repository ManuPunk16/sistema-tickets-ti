import { Component, ChangeDetectionStrategy, input, OnChanges } from '@angular/core';
import { Ticket } from '../../../../core/models/ticket.model';

interface EventoTimeline {
  type: string;
  timestamp: string;
  text: string;
  user?: string;
  details?: string;
  icon: string;
}

@Component({
  selector: 'app-ticket-timeline',
  standalone: true,
  imports: [],
  templateUrl: './ticket-timeline.component.html',
  styleUrl: './ticket-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketTimelineComponent implements OnChanges {
  ticket = input<Ticket | null>(null);

  protected eventosTimeline: EventoTimeline[] = [];

  ngOnChanges(): void {
    if (this.ticket()) {
      this.generarEventos();
    }
  }

  private generarEventos(): void {
    const t = this.ticket();
    if (!t) return;

    this.eventosTimeline = [];

    // Evento de creación
    this.eventosTimeline.push({
      type: 'created',
      timestamp: t.createdAt,
      text: 'Ticket creado',
      user: t.creadoPorNombre,
      icon: 'add_circle',
    });

    // Evento de asignación
    if (t.asignadoAUid && t.asignadoANombre) {
      this.eventosTimeline.push({
        type: 'assigned',
        timestamp: t.updatedAt,
        text: `Asignado a ${t.asignadoANombre}`,
        icon: 'person',
      });
    }

    // Eventos de comentarios
    if (t.comentarios && t.comentarios.length > 0) {
      t.comentarios.forEach(comment => {
        this.eventosTimeline.push({
          type: 'comment',
          timestamp: comment.creadoEn,
          text: 'Comentario añadido',
          user: comment.autorNombre,
          details: comment.texto,
          icon: 'comment',
        });
      });
    }

    // Evento de resolución
    if (t.fechaResolucion) {
      this.eventosTimeline.push({
        type: 'resolved',
        timestamp: t.fechaResolucion,
        text: 'Ticket resuelto',
        icon: 'check_circle',
      });
    }

    // Evento de cierre
    if (t.estado === 'cerrado' && !t.fechaResolucion) {
      this.eventosTimeline.push({
        type: 'closed',
        timestamp: t.updatedAt,
        text: 'Ticket cerrado',
        icon: 'cancel',
      });
    }

    // Ordenar por fecha (más reciente primero)
    this.eventosTimeline.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  protected getClaseIcono(type: string): string {
    const mapa: { [key: string]: string } = {
      created: 'bg-blue-500',
      assigned: 'bg-indigo-500',
      comment: 'bg-gray-400',
      resolved: 'bg-green-500',
      closed: 'bg-red-500',
    };
    return mapa[type] ?? 'bg-gray-400';
  }

  protected formatearFecha(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
