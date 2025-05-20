import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="bg-gradient-to-r from-indigo-600 to-indigo-800 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo y Título -->
          <div class="flex items-center">
            <a [routerLink]="['/dashboard']" class="flex items-center">
              <!-- Logo (SVG inline o una imagen) -->
              <div class="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-white font-bold text-lg ml-2">Sistema de Tickets TI</span>
            </a>
          </div>

          <!-- Menú de Navegación (Escritorio) -->
          <div class="hidden md:flex items-center space-x-4">
            <ng-container *ngIf="user">
              <a [routerLink]="['/dashboard']" class="text-white hover:bg-indigo-500 hover:bg-opacity-75 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Dashboard</a>
              <a [routerLink]="['/tickets']" class="text-white hover:bg-indigo-500 hover:bg-opacity-75 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Tickets</a>
              
              <!-- Enlaces de Admin -->
              <ng-container *ngIf="user.role === 'admin'">
                <a [routerLink]="['/usuarios']" class="text-white hover:bg-indigo-500 hover:bg-opacity-75 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Usuarios</a>
                <a [routerLink]="['/configuracion']" class="text-white hover:bg-indigo-500 hover:bg-opacity-75 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Configuración</a>
              </ng-container>
            </ng-container>
          </div>

          <!-- Sección derecha (Perfil/Login y botón móvil) -->
          <div class="flex items-center">
            <!-- Botón de menú móvil -->
            <button 
              *ngIf="user"
              type="button" 
              class="md:hidden p-2 rounded-md text-white hover:bg-indigo-500 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              (click)="toggleMobileMenu()"
            >
              <span class="sr-only">Abrir menú</span>
              <!-- Icono de hamburguesa cuando está cerrado -->
              <svg *ngIf="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <!-- Icono X cuando está abierto -->
              <svg *ngIf="mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <ng-container *ngIf="user; else loginButtons">
              <div class="relative">
                <!-- Botón de perfil con click -->
                <button 
                  (click)="toggleProfileMenu()"
                  class="flex items-center text-sm focus:outline-none hover:bg-indigo-500 hover:bg-opacity-30 py-2 px-3 rounded-md transition-colors duration-200">
                  <div class="w-8 h-8 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center mr-2">
                    {{ (user.displayName || user.email || 'U')[0].toUpperCase() }}
                  </div>
                  <span class="text-white mr-1 hidden sm:block">{{ user.displayName || user.email }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" 
                       [class.transform]="isProfileMenuOpen" 
                       [class.rotate-180]="isProfileMenuOpen"
                       class="h-5 w-5 text-white transition-transform duration-200" 
                       viewBox="0 0 20 20" 
                       fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>

                <!-- Menú desplegable con click -->
                <div *ngIf="isProfileMenuOpen" 
                     class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 transition-all duration-200 ease-in-out scale-in-origin-top">
                  <a [routerLink]="['/perfil']" 
                     (click)="isProfileMenuOpen = false"
                     class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                     Mi Perfil
                  </a>
                  <button (click)="logout()" 
                          class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Cerrar sesión
                  </button>
                </div>
                
                <!-- Overlay para cerrar el menú al hacer click fuera -->
                <div *ngIf="isProfileMenuOpen" 
                     (click)="closeProfileMenu()" 
                     class="fixed inset-0 z-10 bg-transparent"></div>
              </div>
            </ng-container>

            <ng-template #loginButtons>
              <div *ngIf="showLoginButtons">
                <a [routerLink]="['/auth/login']" class="text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Iniciar sesión
                </a>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Menú móvil -->
      <div class="md:hidden border-t border-indigo-400" *ngIf="user && mobileMenuOpen">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <a [routerLink]="['/dashboard']" 
             (click)="toggleMobileMenu()"
             class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
            Dashboard
          </a>
          <a [routerLink]="['/tickets']" 
             (click)="toggleMobileMenu()"
             class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
            Tickets
          </a>
          
          <!-- Enlaces de Admin -->
          <ng-container *ngIf="user.role === 'admin'">
            <a [routerLink]="['/usuarios']" 
               (click)="toggleMobileMenu()"
               class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
              Usuarios
            </a>
            <a [routerLink]="['/departamentos']" 
               (click)="toggleMobileMenu()"
               class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
              Departamentos
            </a>
            <a [routerLink]="['/configuracion']" 
               (click)="toggleMobileMenu()"
               class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
              Configuración
            </a>
          </ng-container>
          
          <!-- Enlaces de Soporte -->
          <ng-container *ngIf="user.role === 'admin' || user.role === 'support'">
            <a [routerLink]="['/reportes']" 
               (click)="toggleMobileMenu()"
               class="text-white hover:bg-indigo-500 hover:bg-opacity-75 block px-3 py-2 rounded-md text-base font-medium">
              Reportes
            </a>
          </ng-container>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    /* Animación para el menú desplegable */
    .scale-in-origin-top {
      animation: scaleIn 0.15s ease-in-out;
      transform-origin: top right;
    }
    
    @keyframes scaleIn {
      0% {
        opacity: 0;
        transform: scale(0.95);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `]
})
export class NavbarComponent {
  @Input() user: UserProfile | null = null;
  @Input() showLoginButtons: boolean = true;
  mobileMenuOpen = false;
  isProfileMenuOpen = false;

  constructor(private authService: AuthService) {}

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    // Cerrar el menú de perfil si está abierto
    if (this.isProfileMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    // Cerrar el menú móvil si está abierto
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    }
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  logout() {
    this.isProfileMenuOpen = false;
    this.mobileMenuOpen = false;
    this.authService.logout().subscribe();
  }
}