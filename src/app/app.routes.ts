import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.service';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
    title: 'Knowledge Hub · Login',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
    title: 'Knowledge Hub · Sign up',
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
        title: 'Knowledge Hub',
      },
      {
        path: 'search',
        loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
        title: 'Knowledge Hub · Search',
      },
      {
        path: 'research/:eventId',
        loadComponent: () => import('./pages/result/research-result.page').then((m) => m.ResearchResultPage),
        title: 'Knowledge Hub · Research',
      },
      {
        path: 'library',
        loadComponent: () => import('./pages/library/library.page').then((m) => m.LibraryPage),
        title: 'Knowledge Hub · Library',
      },
      {
        path: 'library/:id',
        loadComponent: () => import('./pages/result/saved-result.page').then((m) => m.SavedResultPage),
        title: 'Knowledge Hub · Library',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
