import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NotificacionService } from '../../../core/services/notificacion.service';

// ─── Lista blanca de formatos permitidos ──────────────────────────────────────
const FORMATOS_PERMITIDOS: Record<string, string> = {
  'application/pdf':                                                                    'PDF',
  'application/msword':                                                                 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':           'DOCX',
  'application/vnd.ms-excel':                                                          'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':                 'XLSX',
  'application/vnd.ms-powerpoint':                                                     'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':         'PPTX',
  'image/jpeg':                                                                         'JPG',
  'image/png':                                                                          'PNG',
};

const MIME_ACEPTADOS = Object.keys(FORMATOS_PERMITIDOS).join(',');

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  private notificacion = inject(NotificacionService);

  // Inputs
  allowMultiple = input<boolean>(true);
  maxFileSize   = input<number>(4 * 1024 * 1024); // 4 MB por defecto

  // Output
  filesSelected = output<File[]>();

  // Estado interno
  protected archivosSeleccionados = signal<File[]>([]);
  protected arrastrando           = signal(false);
  protected procesando            = signal(false);
  protected readonly mimeAceptados = MIME_ACEPTADOS;

  protected cantidadArchivos = computed(() => this.archivosSeleccionados().length);

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.procesarArchivos(input.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      void this.procesarArchivos(event.dataTransfer.files);
    }
  }

  removerArchivo(indice: number): void {
    this.archivosSeleccionados.update(lista => lista.filter((_, i) => i !== indice));
    this.filesSelected.emit(this.archivosSeleccionados());
  }

  limpiarArchivos(): void {
    this.archivosSeleccionados.set([]);
    this.filesSelected.emit([]);
  }

  /** @deprecated Alias para compatibilidad con código existente */
  clearFiles(): void { this.limpiarArchivos(); }

  // ─── Procesamiento de archivos ─────────────────────────────────────────────

  private async procesarArchivos(listaArchivos: FileList): Promise<void> {
    this.procesando.set(true);
    const maxBytes = this.maxFileSize();
    const validos: File[] = [];

    for (const archivo of Array.from(listaArchivos)) {
      // 1. Validar tipo MIME contra la lista blanca
      if (!FORMATOS_PERMITIDOS[archivo.type]) {
        const extensionesLegibles = Object.values(FORMATOS_PERMITIDOS).join(', ');
        this.notificacion.advertencia(
          `"${archivo.name}" tiene un formato no permitido. Formatos aceptados: ${extensionesLegibles}`
        );
        continue;
      }

      // 2. Comprimir imágenes JPG/PNG antes de validar tamaño
      let archivoFinal = archivo;
      const esImagen = archivo.type === 'image/jpeg' || archivo.type === 'image/png';
      if (esImagen) {
        archivoFinal = await this.comprimirImagen(archivo);
      }

      // 3. Validar tamaño (después de compresión si aplica)
      if (archivoFinal.size > maxBytes) {
        const limite = this.formatearTamanio(maxBytes);
        const tamanio = this.formatearTamanio(archivoFinal.size);
        this.notificacion.error(
          `"${archivo.name}" supera el límite de ${limite}` +
          (esImagen ? ` (tras compresión: ${tamanio})` : ` (tamaño: ${tamanio})`)
        );
        continue;
      }

      validos.push(archivoFinal);
    }

    if (validos.length > 0) {
      if (this.allowMultiple()) {
        this.archivosSeleccionados.update(actual => [...actual, ...validos]);
      } else {
        this.archivosSeleccionados.set([validos[0]]);
      }
      this.filesSelected.emit(this.archivosSeleccionados());
    }

    this.procesando.set(false);
  }

  /**
   * Comprime imágenes usando Canvas API del navegador.
   * - JPG: calidad 0.92, reducción ~20-30%, impercetible al ojo humano.
   * - PNG: lossless (canvas elimina metadatos, puede reducir tamaño).
   * Si la compresión no mejora el tamaño, devuelve el archivo original.
   */
  private comprimirImagen(archivo: File): Promise<File> {
    return new Promise(resolve => {
      const img = new Image();
      const urlTemporal = URL.createObjectURL(archivo);

      img.onload = () => {
        URL.revokeObjectURL(urlTemporal);
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(archivo); return; }
        ctx.drawImage(img, 0, 0);

        // JPG: calidad 0.92 (casi sin pérdida). PNG: lossless (sin parámetro de calidad)
        const calidad = archivo.type === 'image/jpeg' ? 0.92 : undefined;

        canvas.toBlob(blob => {
          if (!blob || blob.size >= archivo.size) {
            resolve(archivo); // Si no mejoró el tamaño, usar el original
            return;
          }
          resolve(new File([blob], archivo.name, { type: archivo.type, lastModified: Date.now() }));
        }, archivo.type, calidad);
      };

      img.onerror = () => { URL.revokeObjectURL(urlTemporal); resolve(archivo); };
      img.src = urlTemporal;
    });
  }

  // ─── Helpers de presentación ────────────────────────────────────────────────

  protected getIconoArchivo(nombreArchivo: string): string {
    const ext = nombreArchivo.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf')                     return 'pdf';
    if (['doc', 'docx'].includes(ext))     return 'word';
    if (['xls', 'xlsx'].includes(ext))     return 'excel';
    if (['ppt', 'pptx'].includes(ext))     return 'ppt';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
    return 'file';
  }

  protected formatearTamanio(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // Alias para compatibilidad con componentes que usan el API anterior
  formatSize(bytes: number): string      { return this.formatearTamanio(bytes); }
  formatSizeLimit(bytes: number): string { return this.formatearTamanio(bytes); }
  getFileIcon(nombre: string): string    { return this.getIconoArchivo(nombre); }
}
