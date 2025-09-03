import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule
],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Input() allowMultiple: boolean = true;
  @Input() maxFileSize: number = 10 * 1024 * 1024; // 10MB por defecto
  @Input() acceptedFormats: string = '*'; // Por defecto acepta todos los formatos
  @Output() filesSelected = new EventEmitter<File[]>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFiles: File[] = [];
  isDragging: boolean = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filesSelected.emit(this.selectedFiles);
  }

  clearFiles(): void {
    this.selectedFiles = [];
    this.filesSelected.emit(this.selectedFiles);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private processFiles(fileList: FileList): void {
    const filesArray: File[] = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      // Validar tamaño
      if (file.size > this.maxFileSize) {
        console.warn(`Archivo ${file.name} excede el tamaño máximo de ${this.formatSizeLimit(this.maxFileSize)}`);
        continue;
      }

      // Validar tipo si se especificaron formatos aceptados
      if (this.acceptedFormats !== '*') {
        const fileType = file.type;
        const acceptedTypes = this.acceptedFormats.split(',');
        if (!acceptedTypes.some(type => fileType.match(type.trim().replace('*', '.*')))) {
          console.warn(`Tipo de archivo ${file.type} no permitido`);
          continue;
        }
      }

      validFiles.push(file);
    }

    if (!this.allowMultiple) {
      // Si no permite múltiples, reemplazar cualquier archivo previo
      this.selectedFiles = validFiles.slice(0, 1);
    } else {
      this.selectedFiles = [...this.selectedFiles, ...validFiles];
    }

    this.filesSelected.emit(this.selectedFiles);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSizeLimit(bytes: number): string {
    return this.formatSize(bytes);
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    switch(extension) {
      case 'pdf': return 'picture_as_pdf';
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'table_chart';
      case 'ppt':
      case 'pptx': return 'slideshow';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      case 'mp4':
      case 'avi':
      case 'mov': return 'movie';
      case 'mp3':
      case 'wav':
      case 'ogg': return 'music_note';
      case 'zip':
      case 'rar': return 'folder_zip';
      case 'txt': return 'text_snippet';
      default: return 'insert_drive_file';
    }
  }
}
