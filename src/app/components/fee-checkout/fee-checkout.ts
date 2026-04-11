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
  
  availableFacilities: any[] = []; 
  transportRoutes: any[] = [];
  
  // Transport Model
  selectedRouteId: number | null = null;
  transportMonths: number = 1;

  paymentMode = 'CASH';
  isProcessing = false;
  isLoading = true; 
  isAssigning = false; 

  cartTotal = 0;
  concessionTotal = 0;
  netPayable = 0;
isCustomAmount = false;
  customAmount: number | null = null;
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

    this.api.getAvailableFacilities(this.studentId).subscribe({
      next: (res: any) => {
        this.availableFacilities = Array.isArray(res) ? res : (res.data || []);
        this.cdr.detectChanges();
      }
    });
  }

  addFacility(feeTypeId: number) {
    this.isAssigning = true;
    this.api.assignOptionalFacility(this.studentId, feeTypeId).subscribe({
      next: () => {
        this.isAssigning = false;
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

  // NEW: Helper to get transport amount on the fly
  getTransportTotal(): number {
    if (!this.selectedRouteId || this.transportMonths < 1) return 0;
    const route = this.transportRoutes.find(r => r.id === this.selectedRouteId);
    return route ? (route.monthlyFee * this.transportMonths) : 0;
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
    
    // UPDATED: Net Payable now includes the dynamic transport cost
    this.netPayable = this.cartTotal + this.getTransportTotal();
    this.cdr.detectChanges();
  }

  processPayment() {
    if (this.netPayable <= 0 && this.concessionTotal <= 0) return;
    
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

    // UPDATED: Payload now sends the transport details directly 
    const payload = {
      studentId: this.studentId,
      paymentMode: this.paymentMode,
      items: items,
      transportData: this.selectedRouteId ? {
        routeId: this.selectedRouteId,
        months: this.transportMonths,
        totalAmount: this.getTransportTotal()
      } : null
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
  onCustomAmountToggle() {
    if (!this.isCustomAmount) {
      this.customAmount = null;
      // Reset everything back to full amounts
      for (const key in this.groupedDues) {
        for (const due of this.groupedDues[key]) {
          if (due.selected) { due.payingAmount = due.balanceDue; }
        }
      }
      this.calculateTotals();
    } else {
      this.customAmount = this.netPayable;
      this.distributeCustomAmount();
    }
  }

  distributeCustomAmount() {
    if (!this.isCustomAmount || this.customAmount === null) return;

    let remaining = this.customAmount;
    this.cartTotal = 0;
    this.concessionTotal = 0;

    // Collect all selected rows
    let selectedDues: any[] = [];
    for (const key of this.groupedKeys) {
      selectedDues.push(...this.groupedDues[key].filter((d: any) => d.selected));
    }

    // Distribute the custom amount down the list
    for (let due of selectedDues) {
      let maxPayable = due.balanceDue - (due.concessionAmount ? parseFloat(due.concessionAmount) : 0);

      if (remaining >= maxPayable) {
        due.payingAmount = maxPayable;
        remaining -= maxPayable;
      } else if (remaining > 0) {
        due.payingAmount = remaining;
        remaining = 0;
      } else {
        due.payingAmount = 0;
      }

      this.cartTotal += due.payingAmount;
      this.concessionTotal += (due.concessionAmount ? parseFloat(due.concessionAmount) : 0);
    }

    this.netPayable = this.cartTotal + this.getTransportTotal();
    this.cdr.detectChanges();
  }
}