import { Injectable, signal } from '@angular/core';

export type Role = 'user' | 'admin' | null;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // A signal to hold the current role, null means not logged in
  public currentRole = signal<Role>(null);

  login(role: Role) {
    this.currentRole.set(role);
  }

  logout() {
    this.currentRole.set(null);
  }

  isAdmin(): boolean {
    return this.currentRole() === 'admin';
  }

  isUser(): boolean {
    return this.currentRole() === 'user';
  }

  isLoggedIn(): boolean {
    return this.currentRole() !== null;
  }
}
