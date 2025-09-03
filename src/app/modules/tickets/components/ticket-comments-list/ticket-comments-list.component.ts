import { Component, Input } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TicketComment } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-comments-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatDividerModule
],
  templateUrl: './ticket-comments-list.component.html',
  styleUrls: ['./ticket-comments-list.component.scss']
})
export class TicketCommentsListComponent {
  @Input() comments: TicketComment[] = [];

  get sortedComments(): TicketComment[] {
    // Ordenar por fecha (más reciente primero)
    return [...this.comments].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
