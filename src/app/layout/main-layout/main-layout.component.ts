import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    RouterLink,
    RouterOutlet
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  isOpen = true;
  currentUser$: Observable<UserProfile | null>;

  navItems = [
    { name: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { name: 'Tickets', route: '/tickets', icon: 'support' },
    { name: 'Reportes', route: '/reportes', icon: 'assessment' },
  ];

  adminItems = [
    { name: 'Usuarios', route: '/usuarios', icon: 'people' },
    { name: 'Departamentos', route: '/departamentos', icon: 'business' },
    { name: 'Configuración', route: '/configuracion', icon: 'settings' },
  ];

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    // Ajustar para dispositivos móviles
    if (window.innerWidth < 768) {
      this.isOpen = false;
    }
  }

  toggleSidenav() {
    this.isOpen = !this.isOpen;
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
