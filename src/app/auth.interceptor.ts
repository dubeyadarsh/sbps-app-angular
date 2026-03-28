import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './services/auth-service';
import { NotificationService } from './services/notification';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  
  const token = authService.getToken();

  // 1. Attach the token to the outgoing request
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // 2. Pass the request to the next handler and listen for the response
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
    console.log('Interceptor caught error status:', error.status);
      if (error.status === 401) {
        
        // Ensure we don't show the error if they are just typing bad credentials on the login page
        if (!req.url.includes('/api/auth/login')) {
          notify.showError('Your session has expired or the server restarted. Please log in again.');
        }

        // Wipe the local storage completely
        localStorage.clear(); 
        
        // Redirect to the login page immediately
        window.location.href = '/login';
      }

      // Pass the error back to the component so it can stop its loading spinners
      return throwError(() => error);
    })
  );
};