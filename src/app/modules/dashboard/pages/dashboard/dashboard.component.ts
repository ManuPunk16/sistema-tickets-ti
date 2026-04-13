import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ReportService } from '../../../../core/services/report.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TicketMetric } from '../../../../core/models/report.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly authService   = inject(AuthService);
  private readonly reportService = inject(ReportService);

  // Usuario actual como signal — sin async pipe en el template
  protected readonly currentUser$ = toSignal(
    this.authService.getCurrentUser(),
    { initialValue: null }
  );

  // Métricas crudas cargadas desde el servicio
  private readonly metricas = signal<TicketMetric | null>(null);

  // Contadores derivados — se recalculan automáticamente al mutar `metricas`
  protected readonly unassignedTicketsCount = computed(() =>
    this.metricas()?.ticketsByStatus['nuevo'] ?? 0
  );
  protected readonly inProgressTicketsCount = computed(() => {
    const s = this.metricas()?.ticketsByStatus;
    return s ? (s['en_proceso'] || 0) + (s['asignado'] || 0) : 0;
  });
  protected readonly resolvedTicketsCount = computed(() => {
    const s = this.metricas()?.ticketsByStatus;
    return s ? (s['resuelto'] || 0) + (s['cerrado'] || 0) : 0;
  });
  protected readonly totalTicketsCount = computed(() =>
    this.metricas()?.totalTickets ?? 0
  );

  // Porcentajes para barras de progreso
  protected readonly newTicketsPercent        = computed(() => this.calcularPorcentaje('nuevo'));
  protected readonly assignedTicketsPercent   = computed(() => this.calcularPorcentaje('asignado'));
  protected readonly inProgressTicketsPercent = computed(() => this.calcularPorcentaje('en_proceso'));
  protected readonly waitingTicketsPercent    = computed(() => this.calcularPorcentaje('en_espera'));
  protected readonly resolvedTicketsPercent   = computed(() => {
    const total = this.totalTicketsCount();
    if (total === 0) return 0;
    const s = this.metricas()?.ticketsByStatus ?? {};
    return Math.round(((s['resuelto'] || 0) + (s['cerrado'] || 0)) * 100 / total);
  });

  constructor() {
    // Cargar métricas al inicializar — sin ngOnInit
    this.reportService.getTicketMetrics().subscribe(metrics => this.metricas.set(metrics));
  }

  private calcularPorcentaje(estado: string): number {
    const total = this.totalTicketsCount();
    if (total === 0) return 0;
    return Math.round((this.metricas()?.ticketsByStatus[estado] || 0) * 100 / total);
  }
}
