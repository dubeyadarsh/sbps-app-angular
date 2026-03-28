import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification'; 
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  isLoading = false;
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    if (!this.credentials.username || !this.credentials.password) {
      this.notify.showError("Please enter both your username and password.");
      return;
    }

    this.isLoading = true;
    
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify.showSuccess("Welcome back!");
        this.router.navigate(['/dashboard']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        // The backend returns a 401 with a "message" property if credentials fail
        this.notify.showError(err.error?.message || "Invalid credentials. Please try again.");
        this.cdr.detectChanges();
      }
    });
  }
}