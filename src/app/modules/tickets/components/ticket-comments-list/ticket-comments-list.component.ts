import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TicketComment } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-comments-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="comments-list">
      <h3 class="text-lg font-medium mb-4">Comentarios ({{ comments.length }})</h3>

      <div *ngIf="comments.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
        <mat-icon class="text-gray-400 text-5xl">chat</mat-icon>
        <p class="mt-2 text-gray-500">No hay comentarios aún</p>
      </div>

      <div *ngFor="let comment of sortedComments; let last = last" class="comment mb-4">
        <div class="flex items-start">
          <div class="comment-avatar mr-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center">
              {{ comment.createdByName[0].toUpperCase() }}
            </div>
          </div>
          <div class="comment-content flex-1">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">{{ comment.createdByName }}</h4>
                <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <p class="text-gray-700 whitespace-pre-line">{{ comment.text }}</p>
            </div>
          </div>
        </div>

        <mat-divider *ngIf="!last" class="my-4"></mat-divider>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
