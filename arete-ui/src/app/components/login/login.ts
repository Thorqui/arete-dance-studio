import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Role } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginAs(role: Role) {
    this.authService.login(role);
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/app/classes']);
    }
  }
}
