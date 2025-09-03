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
  templateUrl: './ticket-files.component.html',
  styleUrls: ['./ticket-files.component.scss']
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
