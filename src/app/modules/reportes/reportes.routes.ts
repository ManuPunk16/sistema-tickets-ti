import { Routes } from '@angular/router';
import { DashboardReportComponent } from './pages/dashboard-report/dashboard-report.component';
import { PerformanceReportComponent } from './pages/performance-report/performance-report.component';
import { DepartmentReportComponent } from './pages/department-report/department-report.component';

export const REPORTES_ROUTES: Routes = [
  { path: '', component: DashboardReportComponent },
  { path: 'rendimiento', component: PerformanceReportComponent },
  { path: 'departamentos', component: DepartmentReportComponent },
];
