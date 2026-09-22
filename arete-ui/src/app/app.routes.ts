import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';
import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { userGuard } from './guards/user-guard';

export const routes: Routes = [
  { path: 'campus', redirectTo: 'campus/inicio', pathMatch: 'full' },
  {
    path: 'campus/:section',
    title: 'Aretè · Gestión de clases',
    canActivate: [
      (route) => {
        const router = inject(Router);
        if (!inject(AuthService).isLoggedIn()) return router.parseUrl('/login');
        return (
          ['inicio', 'calendario', 'gestion', 'chat'].includes(
            route.paramMap.get('section') ?? '',
          ) || router.parseUrl('/campus/inicio')
        );
      },
    ],
    loadComponent: () => import('./components/campus/campus').then((m) => m.Campus),
  },
  {
    path: '',
    title: 'Arete - Portada',
    loadComponent: () => import('./components/hero/hero.component').then((m) => m.HeroComponent),
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    title: 'Panel de Administrador',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin-chat',
    title: 'Chat Administrador',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/chat/chat').then((m) => m.Chat),
    data: { role: 'admin' },
  },
  {
    path: 'app',
    title: 'Arete App',
    canActivate: [userGuard],
    loadComponent: () => import('./components/user-shell/user-shell').then((m) => m.UserShell),
    children: [
      {
        path: 'classes',
        loadComponent: () =>
          import('./components/classes-view/classes-view').then((m) => m.ClassesView),
      },
      {
        path: 'chat',
        loadComponent: () => import('./components/chat/chat').then((m) => m.Chat),
        data: { role: 'student' },
      },
      {
        path: 'videos',
        loadComponent: () =>
          import('./components/videos-view/videos-view').then((m) => m.VideosView),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./components/events-view/events-view').then((m) => m.EventsView),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./components/profile-view/profile-view').then((m) => m.ProfileView),
      },
      { path: '', redirectTo: 'classes', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
