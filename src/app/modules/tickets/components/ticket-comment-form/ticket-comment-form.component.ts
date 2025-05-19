import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-ticket-comment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    FileUploadComponent
  ],
  template: `
    <form [formGroup]="commentForm" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Agregar comentario</mat-label>
        <textarea matInput formControlName="comment" rows="3"
          placeholder="Escribe un comentario..."></textarea>
        <mat-error *ngIf="commentForm.get('comment')?.hasError('required')">
          El comentario no puede estar vacío
        </mat-error>
      </mat-form-field>

      <div class="mb-3">
        <app-file-upload (filesSelected)="onFilesSelected($event)"></app-file-upload>
      </div>

      <div class="flex justify-end">
        <button mat-raised-button color="primary" type="submit"
          [disabled]="commentForm.invalid || isSubmitting">
          <div class="flex items-center">
            <mat-spinner *ngIf="isSubmitting" diameter="20" class="mr-2"></mat-spinner>
            <span>Comentar</span>
          </div>
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TicketCommentFormComponent {
  @Output() commentSubmitted = new EventEmitter<{comment: string, files: File[]}>();

  commentForm: FormGroup;
  isSubmitting = false;
  selectedFiles: File[] = [];

  constructor(private fb: FormBuilder) {
    this.commentForm = this.fb.group({
      comment: ['', Validators.required]
    });
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
  }

  onSubmit(): void {
    if (this.commentForm.invalid) return;

    this.isSubmitting = true;
    const comment = this.commentForm.value.comment;

    this.commentSubmitted.emit({
      comment,
      files: this.selectedFiles
    });

    // Reset form
    this.commentForm.reset();
    this.selectedFiles = [];
    this.isSubmitting = false;
  }
}
