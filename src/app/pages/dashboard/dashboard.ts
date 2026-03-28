import { Component, OnInit, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';

import { ApiService } from '../../services/api-service'; 
import { NotificationService } from '../../services/notification'; 
import { AuthService } from '../../services/auth-service';

export interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

export interface EventDto {
  title: string;
  description: string;
  eventDate: string;
  targetAudience: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  imports: [CommonModule, BaseChartDirective, FormsModule],
  standalone: true
})
export class DashboardComponent implements OnInit {
  
  // Grabs both the Line and Bar charts from the HTML so we can force them to update
  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;
  
  // =========================================
  // 1. DASHBOARD STATE
  // =========================================
  statCards: StatCard[] = [];

  // =========================================
  // 2. CHART CONFIGURATIONS
  // =========================================
  
  // Chart A: Fee Collection Trend (Line Chart)
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [], 
    datasets: [{
      data: [], 
      label: 'Fee Collected (₹)',
      fill: true,
      tension: 0.4, 
      borderWidth: 4,
      pointRadius: 0, 
      pointHoverRadius: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.1)', // Soft green tint
      borderColor: '#10b981', // Emerald green line
      pointBackgroundColor: '#10b981'
    }]
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        mode: 'index', intersect: false, backgroundColor: '#fff',
        titleColor: '#000', bodyColor: '#666', borderColor: '#eef0f4', borderWidth: 1
      }
    },
    scales: { 
      x: { grid: { display: false } }, 
      y: { display: false, min: 0 } 
    }
  };

  // Chart B: Student Distribution (Bar Chart)
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Total Students',
      backgroundColor: '#3b82f6', // Bright Blue
      borderRadius: 6, // Rounded bar tops
      barPercentage: 0.6
    }]
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff', titleColor: '#000', bodyColor: '#666', 
        borderColor: '#eef0f4', borderWidth: 1
      }
    },
    scales: { 
      x: { grid: { display: false } }, 
      y: { border: { dash: [4, 4] }, grid: { color: '#e2e8f0' }, beginAtZero: true } 
    }
  };

  // =========================================
  // 3. EVENT CALENDAR STATE
  // =========================================
  upcomingEvents: any[] = [];
  showEventModal: boolean = false;
  isSubmittingEvent: boolean = false;
  
  // Model for the Add Event Form
  newEvent: EventDto = { 
    title: '', 
    description: '', 
    eventDate: '', 
    targetAudience: '' 
  };

  constructor(
    private apiService: ApiService,
    private notify: NotificationService,
    private cdr : ChangeDetectorRef,
    public authService: AuthService // Must be public to use in HTML (e.g., authService.isAdmin())
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.loadEvents();
  }

  // =========================================
  // 4. DATA FETCHING METHODS
  // =========================================
  
  loadDashboardData(): void {
    this.apiService.getDashboardSummary().subscribe({
      next: (data) => {
        // 1. Populate the 4 Top Stat Cards
        this.statCards = [
          { title: 'Total Enrolled Students', value: data.totalStudents, icon: 'people', iconBgColor: '#eff6ff', iconColor: '#3b82f6' },
          { title: "Today's Collection", value: `₹${data.todayCollection.toLocaleString()}`, icon: 'payments', iconBgColor: '#fffbeb', iconColor: '#f59e0b' },
          { title: "This Month's Collection", value: `₹${data.currentMonthCollection.toLocaleString()}`, icon: 'account_balance_wallet', iconBgColor: '#ecfdf5', iconColor: '#10b981' },
          { title: "Total Outstanding Dues", value: `₹${data.totalPendingFees.toLocaleString()}`, icon: 'warning_amber', iconBgColor: '#fef2f2', iconColor: '#ef4444' }
        ];

        // 2. Populate Fee Collection Line Chart
        this.lineChartData.labels = data.chartLabels;
        this.lineChartData.datasets[0].data = data.chartData;

        // 3. Populate Student Distribution Bar Chart
        this.barChartData.labels = data.studentChartLabels;
        this.barChartData.datasets[0].data = data.studentChartData;
        
        // 4. Force Angular to re-render both charts
        this.charts?.forEach(chart => chart.update());
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Failed to load dashboard data", err);
        this.notify.showError("Failed to load dashboard statistics.");
                this.cdr.detectChanges();

      }
    });
  }

  loadEvents(): void {
    this.apiService.getUpcomingEvents().subscribe({
      next: (events) =>{
        this.upcomingEvents = events
        this.cdr.detectChanges();

      },
      error: (err) => {
        console.error("Failed to load events", err);
        this.notify.showError("Could not load upcoming events.");
      }
    });
  }

  // =========================================
  // 5. EVENT MODAL LOGIC
  // =========================================
  
  openEventModal(): void {
    // Reset the form whenever the modal opens
    this.newEvent = { title: '', description: '', eventDate: '', targetAudience: '' };
    this.showEventModal = true;
  }

  closeEventModal(): void {
    this.showEventModal = false;
  }

  saveEvent(): void {
    // Basic validation
    if (!this.newEvent.title || !this.newEvent.eventDate) {
      this.notify.showError("Event Title and Date are required.");
      return;
    }
    
    this.isSubmittingEvent = true;
    
    this.apiService.addEvent(this.newEvent).subscribe({
      next: (res) => {
        this.notify.showSuccess(res.message || "Event added successfully!");
        this.closeEventModal();
        this.loadEvents(); // Instantly refresh the calendar list
        this.isSubmittingEvent = false;
      this.cdr.detectChanges();

      },
      error: (err) => {
        this.notify.showError(err.error?.message || "Failed to add event.");
        this.isSubmittingEvent = false;
                this.cdr.detectChanges();

      }
    });
  }
}