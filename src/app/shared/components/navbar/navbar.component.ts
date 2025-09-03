import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
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