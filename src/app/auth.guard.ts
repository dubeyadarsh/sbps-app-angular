import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const expectedRole = route.data?.['role'];
  if (expectedRole && authService.getRole() !== expectedRole) {
    router.navigate(['/dashboard']); // Redirect unauthorized users
    return false;
  }

  return true;
};