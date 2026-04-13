import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileUploadComponent } from '../../../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-ticket-comment-form',
  standalone: true,
  imports: [ReactiveFormsModule, FileUploadComponent],
  templateUrl: './ticket-comment-form.component.html',
  styleUrl: './ticket-comment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketCommentFormComponent {
  private fb = inject(FormBuilder);

  commentSubmitted = output<{ comment: string; files: File[] }>();

  protected commentForm = this.fb.group({
    comment: ['', Validators.required],
  });
  protected isSubmitting = signal(false);
  protected selectedFiles = signal<File[]>([]);

  protected onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
  }

  protected onSubmit(): void {
    if (this.commentForm.invalid) return;

    this.isSubmitting.set(true);
    const comment = this.commentForm.value.comment ?? '';
    this.commentSubmitted.emit({ comment, files: this.selectedFiles() });
    this.commentForm.reset();
    this.selectedFiles.set([]);
    this.isSubmitting.set(false);
  }
}
