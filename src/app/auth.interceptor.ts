import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NotificationService } from './services/notification';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notify = inject(NotificationService);
  
  // FIX 1: Read directly from localStorage to prevent Circular Dependency with AuthService
  const token = localStorage.getItem('auth_token');

  // Attach the token to the outgoing request
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // Pass the request to the next handler and listen for the response
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      console.log('Interceptor caught error status:', error.status);
      
      // FIX 2 & 3: Handle both 401/403 and status 0 (CORS/Network errors)
      if (error.status === 401 || error.status === 403 || error.status === 0) {
        
        // Ensure we don't show the error if they are just typing bad credentials on the login page
        if (!req.url.includes('/api/auth/login')) {
          if (error.status === 0) {
            notify.showError('Server connection lost. Please log in again.');
          } else {
            notify.showError('Your session has expired. Please log in again.');
          }
        }

        // Wipe the local storage completely
        localStorage.clear(); 
        
        // FIX 4: Use Angular Router for seamless SPA redirection
        router.navigate(['/login']);
      }

      // Pass the error back to the component so it can stop its loading spinners
      return throwError(() => error);
    })
  );
};