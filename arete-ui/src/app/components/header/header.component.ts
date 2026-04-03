import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);

  /* Controla si el menú móvil está abierto */
  isMenuOpen = false;

  /* Activa el fondo glassmorphism al bajar del scroll */
  isScrolled = false;

  /* ID de la sección actualmente visible ('hero' | 'about' | 'styles' | 'schedule' | 'contact') */
  activeSection = 'hero';

  /* IDs de las secciones de la página (en el mismo orden que aparecen) */
  private sections = ['hero', 'about', 'styles', 'schedule', 'contact'];

  ngOnInit(): void {
    /* Calculamos la sección activa al cargar la página */
    this.detectActiveSection();
  }

  /* Listener de scroll: actualiza isScrolled y la sección activa */
  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
    this.detectActiveSection();
  }

  /* Recorre las secciones y marca la que esté más centrada en pantalla */
  private detectActiveSection(): void {
    const scrollY = window.scrollY + window.innerHeight / 3; /* Umbral: 1/3 de la pantalla */

    for (let i = this.sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(this.sections[i]);
      if (el && el.offsetTop <= scrollY) {
        this.activeSection = this.sections[i];
        break;
      }
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
    this.closeMenu();
  }
}
