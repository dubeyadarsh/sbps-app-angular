import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

// Define how our data should look
export interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend?: number; // Positive or negative percentage
  trendLabel?: string;
  iconBgColor: string;
  iconColor: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor() { }

  // Simulate an API call returning the top statistics
  getDashboardStats(): Observable<StatCard[]> {
    const stats: StatCard[] = [
      {
        title: 'Total Students',
        value: '1,250',
        icon: 'group',
        trend: 5.2,
        iconBgColor: 'rgba(52, 152, 219, 0.1)',
        iconColor: '#3498db'
      },
      {
        title: 'Fees Collected',
        value: '$45,200',
        icon: 'payments',
        trend: -2.1,
        iconBgColor: 'rgba(46, 204, 113, 0.1)',
        iconColor: '#2ecc71'
      },
      {
        title: 'Pending Fees',
        value: '$8,750',
        icon: 'account_balance_wallet',
        trend: 12,
        iconBgColor: 'rgba(243, 156, 18, 0.1)',
        iconColor: '#f39c12'
      },
      {
        title: 'Upcoming Events',
        value: '12',
        icon: 'event',
        trendLabel: 'Static',
        iconBgColor: 'rgba(155, 89, 182, 0.1)',
        iconColor: '#9b59b6'
      }
    ];
    return of(stats); // Returns as an observable to mimic Http client
  }
}