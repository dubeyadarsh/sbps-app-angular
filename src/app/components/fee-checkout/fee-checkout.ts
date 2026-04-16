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
  @Input() studentGrade!: string; 
  @Output() paymentComplete = new EventEmitter<number>();

  groupedDues: { [key: string]: any[] } = {};
  groupedKeys: string[] = [];
  
  transportRoutes: any[] = [];
  selectedRouteId: number | null = null;
  paidFeeMatrix: { [key: number]: number[] } = {};

  // Aligned with the academic year (April = 1, March = 12) to match tuition
  masterMonths = [
    { id: 1, name: 'Apr' }, { id: 2, name: 'May' }, { id: 3, name: 'Jun' },
    { id: 4, name: 'Jul' }, { id: 5, name: 'Aug' }, { id: 6, name: 'Sep' },
    { id: 7, name: 'Oct' }, { id: 8, name: 'Nov' }, { id: 9, name: 'Dec' },
    { id: 10, name: 'Jan' }, { id: 11, name: 'Feb' }, { id: 12, name: 'Mar' }
  ];

  availableTransportMonths: any[] = [];

  paymentMode = 'CASH';
  isProcessing = false;
  isLoading = true; 

  cartTotal = 0;
  concessionTotal = 0;
  netPayable = 0;
  
  // NEW: The exact amount the user decides to pay
  actualPaidAmount: number = 0;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadDues();
    this.loadTransportRoutes();
  }

  loadTransportRoutes() {
    this.api.getTransportRoutes().subscribe({
      next: (res: any) => {
        this.transportRoutes = Array.isArray(res) ? res : (res.data || []);
        this.cdr.detectChanges();
      }
    });
  }

  loadDues() {
    this.isLoading = true;
    this.cdr.detectChanges(); 

    this.api.getPendingDues(`${this.studentId}?standard=${this.studentGrade}`).subscribe({
      next: (res: any) => {
        let pendingDues = [];

        if (res.data && res.data.pendingDues) {
          pendingDues = res.data.pendingDues;
          this.paidFeeMatrix = res.data.paidFeeMatrix || {};
        } else {
          pendingDues = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        }
        
        this.groupedDues = pendingDues.reduce((acc: any, due: any) => {
  due.selected = false;
  // Initialize with the currently selected type
  due.balanceDue = this.studentAdmissionType === 'NEW' ? (due.newAmount || due.balanceDue) : (due.oldAmount || due.balanceDue);
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
        if (this.selectedRouteId) this.onRouteSelect();

        this.isLoading = false; 
        this.cdr.detectChanges(); 
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        alert('Failed to load dues configuration.');
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

  onPayingAmountChange(due: any) {
    let paying = due.payingAmount ? parseFloat(due.payingAmount) : 0;
    let concession = due.concessionAmount ? parseFloat(due.concessionAmount) : 0;

    if (paying + concession > due.balanceDue) {
      paying = due.balanceDue - concession;
      if (paying < 0) paying = 0;
      due.payingAmount = paying;
    }
    this.calculateTotals();
  }

  onConcessionChange(due: any) {
    let concession = due.concessionAmount ? parseFloat(due.concessionAmount) : 0;
    if (concession > due.balanceDue) {
      concession = due.balanceDue;
      due.concessionAmount = concession;
    }
    due.payingAmount = due.balanceDue - concession;
    this.calculateTotals();
  }

  onRouteSelect() {
    if (this.selectedRouteId) {
      const route = this.transportRoutes.find(r => r.id === this.selectedRouteId);
      const paidMonths = (route && route.feeTypeId) ? (this.paidFeeMatrix[route.feeTypeId] || []) : [];
      
      this.availableTransportMonths = this.masterMonths
        .filter(m => !paidMonths.includes(m.id))
        .map(m => ({ ...m, selected: false }));
    } else {
      this.availableTransportMonths = [];
    }
    this.calculateTotals();
  }

  onMonthToggle() {
    this.calculateTotals();
  }

  getTransportTotal(): number {
    if (!this.selectedRouteId) return 0;
    const route = this.transportRoutes.find(r => r.id === this.selectedRouteId);
    if (!route) return 0;
    
    const selectedCount = this.availableTransportMonths.filter(m => m.selected).length;
    return route.monthlyFee * selectedCount;
  }

  // Purely sums up the selected items. No cascading or mutating data.
  calculateTotals() {
    this.cartTotal = 0;
    this.concessionTotal = 0;

    for (const key in this.groupedDues) {
      for (const due of this.groupedDues[key]) {
        if (due.selected) {
          let paying = due.payingAmount ? parseFloat(due.payingAmount) : 0;
          let concession = due.concessionAmount ? parseFloat(due.concessionAmount) : 0;
          this.cartTotal += paying;
          this.concessionTotal += concession;
        }
      }
    }
    
    this.netPayable = this.cartTotal + this.getTransportTotal();
    
    // Auto-fill the custom paid input to match the total bill by default
    this.actualPaidAmount = this.netPayable;
    
    this.cdr.detectChanges();
  }

 processPayment() {
    if (this.netPayable <= 0 && this.concessionTotal <= 0) return;
    
    this.isProcessing = true;
    this.cdr.detectChanges(); 

    const items: any[] = [];
    let totalExpected = 0;   

    // 1. Process standard dues
    for (const key in this.groupedDues) {
      for (const due of this.groupedDues[key]) {
        if (due.selected) {
          const paying = due.payingAmount ? parseFloat(due.payingAmount) : 0;
          const concession = due.concessionAmount ? parseFloat(due.concessionAmount) : 0;
          
          if (paying === 0 && concession === 0) continue; 

          totalExpected += due.balanceDue;

          items.push({
            feeTypeId: due.feeTypeId,
            month: due.dueMonth,
            amount: paying,
            concessionAmount: concession
          });
        }
      }
    }

    // 2. Process transport dues
    if (this.selectedRouteId) {
      const route = this.transportRoutes.find(r => r.id === this.selectedRouteId);
      if (route) {
        const selectedMonths = this.availableTransportMonths.filter(m => m.selected);
        
        selectedMonths.forEach(m => {
          let expectedAmt = route.monthlyFee;
          totalExpected += expectedAmt;

          items.push({
            feeTypeId: 3, 
            month: m.id,
            amount: expectedAmt,
            concessionAmount: 0
          });
        });
      }
    }

    // 3. Calculate exact remaining due
    let finalRemainingDue = this.netPayable - this.actualPaidAmount;
    if (finalRemainingDue < 0) finalRemainingDue = 0;

    // NO BACKEND AUTOMATION: Push the past remaining due directly into the items array!
    if (finalRemainingDue > 0) {
      items.push({
        feeTypeId: 60002,
        month: null,
        amount: finalRemainingDue,
        concessionAmount: 0
      });
    }

    const payload = {
      studentId: this.studentId,
      paymentMode: this.paymentMode,
      totalAmount: totalExpected,
      paidAmount: this.actualPaidAmount, 
      discountedAmount: this.concessionTotal,
      remainingAmount: finalRemainingDue, 
      items: items // Now includes 60002 if applicable
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
  // Add this property to your class
studentAdmissionType: 'OLD' | 'NEW' = 'OLD';

// Add this function to handle the toggle
onStudentTypeChange() {
  for (const key in this.groupedDues) {
    for (const due of this.groupedDues[key]) {
      // Only swap amounts for items that actually have a difference (like Admission Fees)
      if (due.oldAmount !== undefined && due.newAmount !== undefined) {
        // Swap the balance due based on selection
        due.balanceDue = this.studentAdmissionType === 'NEW' ? due.newAmount : due.oldAmount;
        
        // Reset the paying amount to match the new balance
        due.payingAmount = due.balanceDue;
        
        // Reset concession
        due.concessionAmount = 0;
      }
    }
  }
  this.calculateTotals();
}

// In your loadDues() subscription, ensure the mapping preserves the new/old amounts
// Update this specific block inside loadDues():

}