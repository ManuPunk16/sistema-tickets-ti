import { Component, ChangeDetectionStrategy, signal, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);

  readonly user = input<UserProfile | null>(null);
  readonly showLoginButtons = input(true);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly isProfileMenuOpen = signal(false);

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
    // Cerrar el menú de perfil si está abierto
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
    // Cerrar el menú móvil si está abierto
    if (this.mobileMenuOpen()) this.mobileMenuOpen.set(false);
  }

  protected closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  protected logout(): void {
    this.isProfileMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.authService.logout().subscribe();
  }
}