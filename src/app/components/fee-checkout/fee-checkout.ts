import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
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
  @Output() paymentComplete = new EventEmitter<number>();

  groupedDues: { [key: string]: any[] } = {};
  groupedKeys: string[] = [];
  
  // NEW: Holds optional fees like Admission, Bus, etc.
  availableFacilities: any[] = []; 

  paymentMode = 'CASH';
  isProcessing = false;
  isLoading = true; 
  isAssigning = false; // Prevents double-clicks when adding a fee

  cartTotal = 0;
  concessionTotal = 0;
  netPayable = 0;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadDues();
  }

  loadDues() {
    this.isLoading = true;
    this.cdr.detectChanges(); 

    // Fetch pending dues
    this.api.getPendingDues(this.studentId).subscribe({
      next: (res: any) => {
        const dataArray = Array.isArray(res) ? res : (res.data || []);
        const pendingDues = dataArray.filter((d: any) => d.status !== 'PAID');
        
        this.groupedDues = pendingDues.reduce((acc: any, due: any) => {
          due.selected = false;
          due.payingAmount = due.balanceDue;
          due.concessionAmount = 0;
          
          if (!acc[due.feeTypeName]) acc[due.feeTypeName] = [];
          acc[due.feeTypeName].push(due);
          return acc;
        }, {});

        for (const key in this.groupedDues) {
          this.groupedDues[key].sort((a: any, b: any) => (a.dueMonth || 0) - (b.dueMonth || 0));
        }
        
        this.groupedKeys = Object.keys(this.groupedDues);
        this.isLoading = false; 
        this.cdr.detectChanges(); 
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    // NEW: Fetch optional facilities that can be added
    this.api.getAvailableFacilities(this.studentId).subscribe({
      next: (res: any) => {
        this.availableFacilities = Array.isArray(res) ? res : (res.data || []);
        this.cdr.detectChanges();
      }
    });
  }

  // NEW: Method to add an optional fee to the student's ledger
  addFacility(feeTypeId: number) {
    this.isAssigning = true;
    this.api.assignFacility(this.studentId, feeTypeId).subscribe({
      next: () => {
        this.isAssigning = false;
        // Reload everything so the new fee pops up in the checkout table!
        this.loadDues(); 
      },
      error: () => {
        this.isAssigning = false;
        alert('Could not add facility.');
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
    this.cdr.detectChanges();
  }

  processPayment() {
    if (this.cartTotal <= 0 && this.concessionTotal <= 0) return;
    
    this.isProcessing = true;
    this.cdr.detectChanges(); 

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
      next: (res: any) => {
        this.isProcessing = false;
        this.cdr.detectChanges();
        const transactionId = res.data?.id || res.id; 
        this.paymentComplete.emit(transactionId); 
      },
      error: () => {
        this.isProcessing = false;
        this.cdr.detectChanges();
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