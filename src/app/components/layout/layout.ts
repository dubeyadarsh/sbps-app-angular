import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification';
import { RouterModule, RouterOutlet } from "@angular/router";
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
  imports: [RouterOutlet, CommonModule,RouterModule]
})
export class LayoutComponent implements OnInit {
  userName: string = 'Admin User';
  userRole: string = 'Super Admin';
  userAvatar: string = 'assets/avatar.jpg'; 
  
  // New variable for sidebar state
  isSidebarOpen: boolean = true; 
isMarksheetExpanded: boolean = false;
isConfigExpanded: boolean = false;
  constructor(private notificationService: NotificationService, public authService: AuthService) {}

  triggerTestNotification(): void {
    this.notificationService.showSuccess('Welcome back! Your dashboard is up to date.');
  }


  isMobileSidebarOpen: boolean = false; // Mobile

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // New methods for mobile handling
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }
  toggleMarksheetMenu(): void {
    // If sidebar is collapsed, expand it so the user can see the submenu
    if (!this.isSidebarOpen) {
      this.isSidebarOpen = true;
    }
    this.isMarksheetExpanded = !this.isMarksheetExpanded;
  }
   toggleConfigMenu(): void {
    // If sidebar is collapsed, expand it so the user can see the submenu
    if (!this.isSidebarOpen) {
      this.isSidebarOpen = true;
    }
    this.isConfigExpanded = !this.isConfigExpanded;
  }
  ngOnInit(): void {
    // Fetch dynamic user data set during login
    this.userName = localStorage.getItem('username') || 'Admin User';
    this.userRole = localStorage.getItem('user_role') || 'STAFF';
  }

  logout(): void {
    this.authService.logout();
  }
}
