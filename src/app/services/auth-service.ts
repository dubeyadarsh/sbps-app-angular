import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { baseApiUrl } from '../constants/constant';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${baseApiUrl}api/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: any) {
    return this.http.post<any>(`${this.baseUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('user_role', res.role);
        localStorage.setItem('username', res.username);
      })
    );
  }

  logout() {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem('auth_token'); }
  getRole(): string | null { return localStorage.getItem('user_role'); }
  isLoggedIn(): boolean { return !!this.getToken(); }
  isAdmin(): boolean { return this.getRole() === 'ADMIN'; }
}