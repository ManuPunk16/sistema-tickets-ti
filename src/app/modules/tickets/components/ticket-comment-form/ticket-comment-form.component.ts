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
  templateUrl: './ticket-comment-form.component.html',
  styleUrls: ['./ticket-comment-form.component.scss']
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
