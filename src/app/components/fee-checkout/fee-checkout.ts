import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';

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

  // Separated view models
  oneTimeFees: any[] = [];
  recurringGroups: any[] = [];

  grandTotal: number = 0;
  paymentMode: string = 'CASH';
  isLoading: boolean = true;
  isAssigning: boolean = false;
  isSubmitting: boolean = false;

  availableFacilities: any[] = [];
  selectedFacility: string = '';

  private readonly MONTHS = [
    'Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'
  ];

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.studentId) {
      this.fetchAvailableFacilities();
      this.fetchDues();
    }
  }

  fetchAvailableFacilities(): void {
    this.api.getAvailableFacilities(this.studentId).subscribe({
      next: (res) => { this.availableFacilities = res.data || []; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  fetchDues(): void {
    this.isLoading = true;
    this.api.getPendingDues(this.studentId).subscribe({
      next: (res) => {
        this.buildViewModels(res.data || []);
        this.recalculateTotal();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notify.showError('Could not fetch dues.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildViewModels(dues: any[]): void {
    // Split into one-time and recurring
    const oneTime = dues.filter(d => !d.isRecurring);
    const recurring = dues.filter(d => d.isRecurring);

    // One-time: flat list, mark paid ones clearly
    this.oneTimeFees = oneTime.map(d => ({ ...d, selected: false }));

    // Recurring: group by feeTypeId, sorted by dueMonth
    const grouped: Record<number, any> = {};
    for (const due of recurring) {
      if (!grouped[due.feeTypeId]) {
        grouped[due.feeTypeId] = {
          feeTypeId: due.feeTypeId,
          feeTypeName: due.feeTypeName,
          months: [],
          paidCount: 0
        };
      }
      grouped[due.feeTypeId].months.push({ ...due, selected: false });
    }

    this.recurringGroups = Object.values(grouped).map((g: any) => {
      g.months.sort((a: any, b: any) => a.dueMonth - b.dueMonth);
      g.paidCount = g.months.filter((m: any) => m.status === 'PAID').length;
      return g;
    });
  }

  getMonthName(month: number): string {
    if (!month) return 'One-Time';
    return this.MONTHS[month - 1] || `Month ${month}`;
  }

  isPreviousMonthUnpaid(months: any[], index: number): boolean {
    if (index === 0) return false;
    const prev = months[index - 1];
    return prev.status !== 'PAID' && !prev.selected;
  }

  toggleMonth(due: any, months: any[], index: number): void {
    if (due.status === 'PAID') return;
    if (this.isPreviousMonthUnpaid(months, index)) return;
    due.selected = !due.selected;
    this.recalculateTotal();
  }

  recalculateTotal(): void {
    let total = 0;
    this.oneTimeFees.forEach(d => { if (d.selected) total += d.balanceDue; });
    this.recurringGroups.forEach(g =>
      g.months.forEach((d: any) => { if (d.selected) total += d.balanceDue; })
    );
    this.grandTotal = total;
    this.cdr.detectChanges();
  }

  assignFacility(): void {
    if (!this.selectedFacility || this.isAssigning) return;
    this.isAssigning = true;

    this.api.assignOptionalFacility(this.studentId, Number(this.selectedFacility)).subscribe({
      next: () => {
        this.notify.showSuccess('Facility added to ledger!');
        this.selectedFacility = '';
        this.fetchAvailableFacilities();
        this.fetchDues();
      },
      error: (err) => this.notify.showError(err.error?.message || 'Failed to add facility.'),
      complete: () => { this.isAssigning = false; this.cdr.detectChanges(); }
    });
  }

  submitPayment(): void {
    const items: any[] = [];
    this.oneTimeFees.forEach(d => { if (d.selected) items.push({ dueId: d.id, amount: d.balanceDue }); });
    this.recurringGroups.forEach(g =>
      g.months.forEach((d: any) => { if (d.selected) items.push({ dueId: d.id, amount: d.balanceDue }); })
    );

    if (!items.length) {
      this.notify.showError('Please select at least one fee.');
      return;
    }

    this.isSubmitting = true;
    this.api.processPayment({ studentId: this.studentId, paymentMode: this.paymentMode, items }).subscribe({
      next: () => {
        this.notify.showSuccess('Payment processed!');
        this.paymentComplete.emit();
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'Payment failed.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }
}