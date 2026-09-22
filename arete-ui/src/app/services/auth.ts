import { Injectable, signal } from '@angular/core';

export type Role = 'user' | 'admin' | 'teacher' | null;
const SESSION_KEY = 'arete.demo.role';
function savedRole(): Role {
  try {
    const role = sessionStorage.getItem(SESSION_KEY);
    return role === 'user' || role === 'admin' || role === 'teacher' ? role : null;
  } catch {
    return null;
  }
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  public currentRole = signal<Role>(savedRole());
  login(role: Role) {
    this.currentRole.set(role);
    try {
      if (role) sessionStorage.setItem(SESSION_KEY, role);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Session remains in memory. */
    }
  }
  logout() {
    this.login(null);
  }
  isAdmin(): boolean {
    return this.currentRole() === 'admin';
  }
  isUser(): boolean {
    return this.currentRole() === 'user';
  }
  isTeacher(): boolean {
    return this.currentRole() === 'teacher';
  }
  isLoggedIn(): boolean {
    return this.currentRole() !== null;
  }
}
