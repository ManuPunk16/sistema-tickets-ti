import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NotificacionesToastComponent } from '../../shared/components/notificaciones-toast/notificaciones-toast.component';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    SidebarComponent,
    NotificacionesToastComponent
  ],
  template: `
    <div class="flex flex-col min-h-screen">
      <!-- Navbar fijo en la parte superior -->
      <app-navbar [user]="currentUser$ | async" class="fixed top-0 left-0 right-0 z-20"></app-navbar>

      <!-- Contenedor principal con sidebar y contenido -->
      <div class="flex flex-grow pt-16">
        <!-- Sidebar fijo -->
        <app-sidebar [user]="currentUser$ | async" class="hidden lg:block fixed left-0 top-16 bottom-0 z-10"></app-sidebar>

        <!-- Contenido principal con desplazamiento -->
        <div class="flex-grow lg:ml-64 transition-all duration-300 min-h-[calc(100vh-64px-40px)]">
          <div class="container mx-auto px-4 py-6">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-gray-800 text-white text-center py-4 mt-auto lg:ml-64">
        <p class="text-xs">© 2025 Sistema de Tickets TI. Todos los derechos reservados.</p>
      </footer>

      <!-- Toast de notificaciones global -->
      <app-notificaciones-toast></app-notificaciones-toast>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  currentUser$: Observable<UserProfile | null>;
  
  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.getCurrentUser();
  }
  
  ngOnInit(): void {}
}
