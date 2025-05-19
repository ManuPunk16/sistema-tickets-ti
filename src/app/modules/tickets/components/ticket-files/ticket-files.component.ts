import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface FileInfo {
  url: string;
  name: string;
  extension: string;
  icon: string;
}

@Component({
  selector: 'app-ticket-files',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="py-4">
      <h3 class="text-lg font-medium mb-4">Archivos Adjuntos ({{ files.length }})</h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ng-container *ngFor="let file of fileInfos">
          <div class="border rounded-lg p-4 flex flex-col">
            <div class="flex items-center space-x-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <mat-icon [ngClass]="getIconColor(file.extension)">{{ file.icon }}</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</h4>
              </div>
            </div>

            <div class="mt-auto pt-2 flex justify-end">
              <a [href]="file.url" target="_blank" mat-stroked-button color="primary">
                <mat-icon class="text-sm mr-1">open_in_new</mat-icon>
                Abrir
              </a>
            </div>
          </div>
        </ng-container>
      </div>

      <div *ngIf="files.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
        <mat-icon class="text-gray-400 text-5xl">insert_drive_file</mat-icon>
        <p class="mt-2 text-gray-500">No hay archivos adjuntos</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TicketFilesComponent implements OnChanges {
  @Input() files: string[] = [];

  fileInfos: FileInfo[] = [];

  ngOnChanges(): void {
    this.processFiles();
  }

  private processFiles(): void {
    this.fileInfos = this.files.map(url => {
      const name = this.getFileName(url);
      const extension = this.getFileExtension(name);
      const icon = this.getFileIcon(extension);

      return { url, name, extension, icon };
    });
  }

  getFileName(url: string): string {
    // Extraer el nombre del archivo de la URL
    const fragments = url.split('/');
    return fragments[fragments.length - 1];
  }

  getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length === 1) return '';
    return parts[parts.length - 1].toLowerCase();
  }

  getFileIcon(extension: string): string {
    switch (extension) {
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
      case 'zip':
      case 'rar': return 'folder_zip';
      case 'txt': return 'article';
      default: return 'insert_drive_file';
    }
  }

  getIconColor(extension: string): string {
    switch (extension) {
      case 'pdf': return 'text-red-600';
      case 'doc':
      case 'docx': return 'text-blue-600';
      case 'xls':
      case 'xlsx': return 'text-green-600';
      case 'ppt':
      case 'pptx': return 'text-orange-600';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'text-purple-600';
      case 'zip':
      case 'rar': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }
}
