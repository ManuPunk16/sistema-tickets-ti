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
  template: `
    <div class="timeline">
      <h3 class="text-lg font-medium mb-4">Historial del ticket</h3>

      <div class="timeline-events">
        <div *ngFor="let event of timelineEvents; let first = first; let last = last" class="timeline-event">
          <div class="flex">
            <div class="timeline-icon mr-4">
              <div [ngClass]="getIconBgClass(event.type)" class="w-10 h-10 rounded-full flex items-center justify-center">
                <mat-icon class="text-white">{{ event.icon }}</mat-icon>
              </div>
              <div *ngIf="!last" class="timeline-line"></div>
            </div>

            <div class="timeline-content">
              <div class="text-sm text-gray-500 mb-1">{{ formatDate(event.timestamp) }}</div>
              <p class="font-medium">{{ event.text }}</p>
              <p *ngIf="event.user" class="text-sm text-gray-600">Por {{ event.user }}</p>
              <p *ngIf="event.details" class="mt-1 text-gray-700 whitespace-pre-line">{{ event.details }}</p>
            </div>
          </div>

          <div *ngIf="!last" class="mt-2"></div>
        </div>

        <!-- Empty State -->
        <div *ngIf="timelineEvents.length === 0" class="text-center py-6">
          <p class="text-gray-500">No hay eventos registrados para este ticket</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .timeline-icon {
      position: relative;
    }

    .timeline-line {
      position: absolute;
      top: 40px;
      left: 20px;
      bottom: -20px;
      width: 2px;
      background-color: #e5e7eb;
    }

    .timeline-event:last-child .timeline-line {
      display: none;
    }
  `]
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
