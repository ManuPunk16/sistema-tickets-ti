import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IArchivo } from '../../../../core/models/ticket.model';

@Component({
  selector: 'app-ticket-files',
  standalone: true,
  imports: [],
  templateUrl: './ticket-files.component.html',
  styleUrl: './ticket-files.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFilesComponent {
  // Recibe el array completo de IArchivo (antes solo URLs)
  archivos       = input<IArchivo[]>([]);
  // Si true, se muestra el botón de eliminar por archivo
  puedeEliminar  = input<boolean>(false);
  // Emite el archivo que el usuario confirmó eliminar
  archivoEliminado = output<IArchivo>();

  // ID del archivo con confirmación de borrado activa
  protected archivoAConfirmar = signal<string | null>(null);

  protected cantidadArchivos = computed(() => this.archivos().length);

  protected confirmarEliminacion(id: string): void {
    this.archivoAConfirmar.set(id);
  }

  protected cancelarEliminacion(): void {
    this.archivoAConfirmar.set(null);
  }

  protected ejecutarEliminacion(archivo: IArchivo): void {
    this.archivoAConfirmar.set(null);
    this.archivoEliminado.emit(archivo);
  }

  protected getIdArchivo(archivo: IArchivo): string {
    return (archivo._id ?? archivo.id ?? '');
  }

  protected getExtension(nombre: string): string {
    return nombre.split('.').pop()?.toLowerCase() ?? '';
  }

  protected getIconoArchivo(extension: string): string {
    if (extension === 'pdf')                          return 'pdf';
    if (['doc', 'docx'].includes(extension))          return 'word';
    if (['xls', 'xlsx'].includes(extension))          return 'excel';
    if (['ppt', 'pptx'].includes(extension))          return 'ppt';
    if (['jpg', 'jpeg', 'png'].includes(extension))   return 'image';
    return 'file';
  }

  protected getColorIcono(extension: string): string {
    if (extension === 'pdf')                          return 'text-red-500';
    if (['doc', 'docx'].includes(extension))          return 'text-blue-600';
    if (['xls', 'xlsx'].includes(extension))          return 'text-green-600';
    if (['ppt', 'pptx'].includes(extension))          return 'text-orange-500';
    if (['jpg', 'jpeg', 'png'].includes(extension))   return 'text-purple-500';
    return 'text-gray-500';
  }

  protected formatearTamanio(bytes: number): string {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
