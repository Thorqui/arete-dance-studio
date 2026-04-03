import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss'
})
export class ProfileView {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
