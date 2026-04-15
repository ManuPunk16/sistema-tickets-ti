import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../../../core/services/auditoria.service';
import type {
  RegistroAuditoria,
  ResumenAuditoria,
  FiltrosAuditoria,
  AccionAuditoria,
  RecursoAuditoria,
} from '../../../../core/models/auditoria.model';
import {
  ETIQUETA_ACCION,
  ETIQUETA_RECURSO,
} from '../../../../core/models/auditoria.model';

@Component({
  selector: 'app-auditoria-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditoria-log.component.html',
})
export class AuditoriaLogComponent implements OnInit {
  private auditoriaService = inject(AuditoriaService);

  // ─── Estado reactivo ───────────────────────────────────────────────────────
  cargando         = signal(false);
  cargandoResumen  = signal(false);
  registros        = signal<RegistroAuditoria[]>([]);
  resumen          = signal<ResumenAuditoria | null>(null);
  errorMensaje     = signal<string | null>(null);
  paginaActual     = signal(1);
  totalRegistros   = signal(0);
  totalPaginas     = signal(0);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  filtroUid        = signal('');
  filtroAccion     = signal<AccionAuditoria | ''>('');
  filtroRecurso    = signal<RecursoAuditoria | ''>('');
  filtroExito      = signal<boolean | ''>('');
  filtroDesde      = signal('');
  filtroHasta      = signal('');
  readonly limite  = 50;

  // ─── Listas para selects ───────────────────────────────────────────────────
  readonly acciones = Object.entries(ETIQUETA_ACCION) as [AccionAuditoria, string][];
  readonly recursos = Object.entries(ETIQUETA_RECURSO) as [RecursoAuditoria, string][];

  // ─── Estado derivado ───────────────────────────────────────────────────────
  hayRegistros = computed(() => this.registros().length > 0);
  paginasArray = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarRegistros();
  }

  // ─── Carga de datos ────────────────────────────────────────────────────────
  cargarResumen(): void {
    this.cargandoResumen.set(true);
    this.auditoriaService.obtenerResumen().subscribe({
      next: (datos) => {
        this.resumen.set(datos);
        this.cargandoResumen.set(false);
      },
      error: () => this.cargandoResumen.set(false),
    });
  }

  cargarRegistros(pagina = 1): void {
    this.cargando.set(true);
    this.errorMensaje.set(null);

    const filtros: FiltrosAuditoria = {
      pagina,
      limite: this.limite,
    };

    const uid = this.filtroUid().trim();
    if (uid)                              filtros.uid     = uid;
    if (this.filtroAccion())              filtros.accion  = this.filtroAccion() as AccionAuditoria;
    if (this.filtroRecurso())             filtros.recurso = this.filtroRecurso() as RecursoAuditoria;
    if (this.filtroExito() !== '')        filtros.exito   = this.filtroExito() as boolean;
    if (this.filtroDesde())               filtros.desde   = this.filtroDesde();
    if (this.filtroHasta())               filtros.hasta   = this.filtroHasta();

    this.auditoriaService.obtenerRegistros(filtros).subscribe({
      next: (resp) => {
        this.registros.set(resp.datos);
        this.totalRegistros.set(resp.total);
        this.totalPaginas.set(resp.paginas);
        this.paginaActual.set(resp.pagina);
        this.cargando.set(false);
      },
      error: (err) => {
        this.errorMensaje.set('Error al cargar los registros de auditoría.');
        this.cargando.set(false);
      },
    });
  }

  // ─── Acciones de UI ────────────────────────────────────────────────────────
  aplicarFiltros(): void {
    this.cargarRegistros(1);
  }

  limpiarFiltros(): void {
    this.filtroUid.set('');
    this.filtroAccion.set('');
    this.filtroRecurso.set('');
    this.filtroExito.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.cargarRegistros(1);
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.cargarRegistros(pagina);
  }

  // ─── Helpers de visualización ──────────────────────────────────────────────
  protected etiquetaAccion(accion: AccionAuditoria): string {
    return ETIQUETA_ACCION[accion] ?? accion;
  }

  protected etiquetaRecurso(recurso: RecursoAuditoria): string {
    return ETIQUETA_RECURSO[recurso] ?? recurso;
  }

  protected claseAccion(accion: AccionAuditoria): string {
    if (accion.startsWith('auth.'))          return 'bg-blue-100 text-blue-800';
    if (accion.startsWith('ticket.'))        return 'bg-indigo-100 text-indigo-800';
    if (accion.startsWith('usuario.'))       return 'bg-purple-100 text-purple-800';
    if (accion.startsWith('departamento.'))  return 'bg-yellow-100 text-yellow-800';
    if (accion.startsWith('configuracion.')) return 'bg-orange-100 text-orange-800';
    if (accion.startsWith('reporte.'))       return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  }

  protected claseExito(exito: boolean): string {
    return exito
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  }

  protected formatearDetalle(detalle: Record<string, unknown>): string {
    if (!detalle || Object.keys(detalle).length === 0) return '—';
    return JSON.stringify(detalle, null, 2);
  }
}
