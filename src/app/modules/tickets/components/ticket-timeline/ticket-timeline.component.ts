import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ticket } from '../../../../core/models/ticket.model';
import { MatIconModule } from '@angular/material/icon';

interface TimelineEvent {
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
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './ticket-timeline.component.html',
  styleUrls: ['./ticket-timeline.component.scss']
})
export class TicketTimelineComponent implements OnChanges {
  @Input() ticket: Ticket | null = null;

  timelineEvents: TimelineEvent[] = [];

  ngOnChanges(): void {
    if (this.ticket) {
      this.generateTimelineEvents();
    }
  }

  private generateTimelineEvents(): void {
    if (!this.ticket) return;

    this.timelineEvents = [];

    // Evento de creación
    this.timelineEvents.push({
      type: 'created',
      timestamp: this.ticket.createdAt,
      text: 'Ticket creado',
      user: this.ticket.createdByName,
      icon: 'add_circle'
    });

    // Eventos de asignación
    if (this.ticket.assignedTo && this.ticket.assignedToName) {
      this.timelineEvents.push({
        type: 'assigned',
        timestamp: this.ticket.updatedAt,
        text: `Asignado a ${this.ticket.assignedToName}`,
        icon: 'person'
      });
    }

    // Eventos de comentarios
    if (this.ticket.comments && this.ticket.comments.length > 0) {
      this.ticket.comments.forEach(comment => {
        this.timelineEvents.push({
          type: 'comment',
          timestamp: comment.createdAt,
          text: 'Comentario añadido',
          user: comment.createdByName,
          details: comment.text,
          icon: 'comment'
        });
      });
    }

    // Evento de resolución
    if (this.ticket.resolvedAt) {
      this.timelineEvents.push({
        type: 'resolved',
        timestamp: this.ticket.resolvedAt,
        text: 'Ticket resuelto',
        details: this.ticket.statusNote,
        icon: 'check_circle'
      });
    }

    // Evento de cierre
    if (this.ticket.closedAt) {
      this.timelineEvents.push({
        type: 'closed',
        timestamp: this.ticket.closedAt,
        text: 'Ticket cerrado',
        details: this.ticket.statusNote,
        icon: 'cancel'
      });
    }

    // Ordenar eventos por timestamp (más recientes primero)
    this.timelineEvents.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getIconBgClass(eventType: string): string {
    switch (eventType) {
      case 'created': return 'bg-blue-500';
      case 'assigned': return 'bg-purple-500';
      case 'comment': return 'bg-gray-500';
      case 'status': return 'bg-orange-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-700';
      default: return 'bg-gray-500';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
