import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TicketComment } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-comments-list',
  standalone: true,
  imports: [],
  templateUrl: './ticket-comments-list.component.html',
  styleUrl: './ticket-comments-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketCommentsListComponent {
  comments = input<TicketComment[]>([]);

  protected get sortedComments(): TicketComment[] {
    return [...this.comments()].sort((a, b) =>
      new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
    );
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
