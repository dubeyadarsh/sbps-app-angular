import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-fee-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fee-checkout.html',
  styleUrls: ['./fee-checkout.css']
})
export class FeeCheckoutComponent implements OnInit {
  @Input() studentId!: number;
  @Output() paymentComplete = new EventEmitter<void>();

  groupedDues: { [key: string]: any[] } = {};
  groupedKeys: string[] = [];

  paymentMode = 'CASH';
  isProcessing = false;
  isLoading = true; // NEW: Added loading state

  cartTotal = 0;
  concessionTotal = 0;
  netPayable = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDues();
  }

  loadDues() {
    this.isLoading = true;
    this.api.getPendingDues(this.studentId).subscribe({
      next: (res: any) => {
        // CRITICAL FIX: Safely extract the array. 
        // If ApiService already unwrapped it, 'res' is the array. Otherwise, it's 'res.data'.
        const dataArray = Array.isArray(res) ? res : (res.data || []);
        
        const pendingDues = dataArray.filter((d: any) => d.status !== 'PAID');
        
        // Group by Fee Name
        this.groupedDues = pendingDues.reduce((acc: any, due: any) => {
          due.selected = false;
          due.payingAmount = due.balanceDue;
          due.concessionAmount = 0;
          
          if (!acc[due.feeTypeName]) acc[due.feeTypeName] = [];
          acc[due.feeTypeName].push(due);
          return acc;
        }, {});

        // Sort each group sequentially by academic month
        for (const key in this.groupedDues) {
          this.groupedDues[key].sort((a: any, b: any) => (a.dueMonth || 0) - (b.dueMonth || 0));
        }
        
        this.groupedKeys = Object.keys(this.groupedDues);
        this.isLoading = false; // Turn off loading
      },
      error: (err) => {
        console.error("Error fetching dues:", err);
        this.isLoading = false;
      }
    });
  }

  onDueSelectionChange(group: any[], index: number) {
    const current = group[index];
    
    if (!current.selected) {
      for (let i = index + 1; i < group.length; i++) {
        group[i].selected = false;
        group[i].payingAmount = group[i].balanceDue;
        group[i].concessionAmount = 0;
      }
    }
    this.calculateTotals();
  }

  calculateTotals() {
    this.cartTotal = 0;
    this.concessionTotal = 0;

    for (const key in this.groupedDues) {
      for (const due of this.groupedDues[key]) {
        if (due.selected) {
          let paying = due.payingAmount ? parseFloat(due.payingAmount) : 0;
          let concession = due.concessionAmount ? parseFloat(due.concessionAmount) : 0;

          if (paying + concession > due.balanceDue) {
            paying = due.balanceDue - concession;
            if (paying < 0) paying = 0;
            due.payingAmount = paying;
          }

          this.cartTotal += paying;
          this.concessionTotal += concession;
        }
      }
    }
    this.netPayable = this.cartTotal;
  }

  processPayment() {
    if (this.cartTotal <= 0 && this.concessionTotal <= 0) return;
    this.isProcessing = true;

    const items: any[] = [];
    for (const key in this.groupedDues) {
      for (const due of this.groupedDues[key]) {
        if (due.selected) {
          items.push({
            dueId: due.id,
            amount: due.payingAmount ? parseFloat(due.payingAmount) : 0,
            concessionAmount: due.concessionAmount ? parseFloat(due.concessionAmount) : 0
          });
        }
      }
    }

    const payload = {
      studentId: this.studentId,
      paymentMode: this.paymentMode,
      items: items
    };

    this.api.processPayment(payload).subscribe({
      next: () => {
        this.isProcessing = false;
        this.paymentComplete.emit();
      },
      error: () => {
        this.isProcessing = false;
        alert('Payment processing failed. Please check balance.');
      }
    });
  }

  hasDues(): boolean {
    return this.groupedKeys.length > 0;
  }

  formatMonth(m: number): string {
    if (!m) return 'One-Time';
    const months = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    return months[m - 1] || 'Unknown';
  }
}