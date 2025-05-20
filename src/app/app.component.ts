import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  template: `
    <router-outlet></router-outlet>
    <!-- Overlay de carga durante la inicialización -->
    <div *ngIf="initializing" class="fixed inset-0 bg-indigo-900 bg-opacity-75 flex items-center justify-center z-50">
      <div class="text-center text-white">
        <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-lg">Cargando aplicación...</p>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Sistema de Tickets TI';
  initializing = true;
  
  constructor(private authService: AuthService) {}
  
  ngOnInit() {
    // Inicializar el servicio de autenticación y asegurar la restauración de sesión
    this.authService.initializeAuth().subscribe({
      next: () => {
        this.initializing = false;
      },
      error: (err) => {
        console.error('Error al inicializar autenticación:', err);
        this.initializing = false;
      }
    });
  }
}
