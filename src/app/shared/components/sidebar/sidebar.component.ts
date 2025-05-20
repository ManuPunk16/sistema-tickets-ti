import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="w-64 bg-gradient-to-b from-gray-900 to-indigo-900 text-white h-full overflow-y-auto">
      <div class="p-6 flex flex-col h-full">
        <!-- Navegación -->
        <nav class="space-y-2 flex-grow">
          <div class="pb-2">
            <a [routerLink]="['/dashboard']" 
               routerLinkActive="bg-indigo-700" 
               class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                </svg>
                <span>Dashboard</span>
              </div>
            </a>
          </div>

          <div class="pb-2">
            <a [routerLink]="['/tickets']" 
               routerLinkActive="bg-indigo-700" 
               class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
                <span>Tickets</span>
              </div>
            </a>
          </div>

          <div class="pb-2">
            <a [routerLink]="['/reportes']" 
               routerLinkActive="bg-indigo-700" 
               class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>Reportes</span>
              </div>
            </a>
          </div>

          <!-- Sección Admin -->
          <ng-container *ngIf="user?.role === 'admin'">
            <div class="pt-4 pb-2 px-4">
              <div class="border-t border-indigo-700 my-2"></div>
              <h3 class="text-xs uppercase text-indigo-300 font-semibold tracking-wider">Administración</h3>
            </div>

            <div class="pb-2">
              <a [routerLink]="['/usuarios']" 
                 routerLinkActive="bg-indigo-700" 
                 class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 014.75-2.906z" />
                  </svg>
                  <span>Usuarios</span>
                </div>
              </a>
            </div>

            <div class="pb-2">
              <a [routerLink]="['/departamentos']" 
                 routerLinkActive="bg-indigo-700" 
                 class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
                  </svg>
                  <span>Departamentos</span>
                </div>
              </a>
            </div>

            <div class="pb-2">
              <a [routerLink]="['/configuracion']" 
                 routerLinkActive="bg-indigo-700" 
                 class="block px-4 py-3 rounded-md text-white hover:bg-indigo-800 transition-colors duration-200">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                  </svg>
                  <span>Configuración</span>
                </div>
              </a>
            </div>
          </ng-container>
        </nav>

        <!-- Versión del sistema -->
        <div class="pt-4 mt-auto text-xs text-indigo-300">
          <p>v1.0.0</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SidebarComponent {
  @Input() user: UserProfile | null = null;
}