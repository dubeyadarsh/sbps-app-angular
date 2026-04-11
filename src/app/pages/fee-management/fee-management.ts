import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeeCheckoutComponent } from '../../components/fee-checkout/fee-checkout';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, FeeCheckoutComponent],
  templateUrl: './fee-management.html',
  styleUrls: ['./fee-management.css']
})
export class FeesComponent implements OnInit {

  selectedGrade: string = '';
  searchText: string = '';

  pagedRecords: any[] = [];
  reportStats = { total: 0, collected: 0, pending: 0, overdue: 0 };

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;

  isSidePanelOpen: boolean = false;
  currentFee: { id?: number; studentName?: string } = {};

  isSearchModalOpen: boolean = false;
  studentSearchQuery: string = '';
  studentSearchResults: any[] = [];
  isTableLoading: boolean = false;

  standards: any[] = [
    { label: 'Grade PG', value: 'PG' },
    { label: 'Grade LKG', value: 'LKG' },
    { label: 'Grade UKG', value: 'UKG' },
    { label: 'Grade 1', value: '1' },
    { label: 'Grade 2', value: '2' },
    { label: 'Grade 3', value: '3' },
    { label: 'Grade 4', value: '4' },
    { label: 'Grade 5', value: '5' },
    { label: 'Grade 6', value: '6' },
    { label: 'Grade 7', value: '7' },
    { label: 'Grade 8', value: '8' },
    { label: 'Grade 9', value: '9' },
    { label: 'Grade 10', value: '10' },
    { label: 'Grade 11', value: '11' },
  ];

  constructor(
    private feeService: ApiService,
    public notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  loadData(): void {
    if (!this.selectedGrade) return;
    this.fetchReportStats();
    this.fetchTableData();
  }

  fetchReportStats(): void {
    this.feeService.getReportStats(this.selectedGrade).subscribe({
      next: (res: any) => { this.reportStats = res.data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  fetchTableData(): void {
    this.isTableLoading = true;
    this.feeService.getFeeTransactions(
      this.selectedGrade, this.searchText, this.currentPage - 1, this.pageSize
    ).subscribe({
      next: (res: any) => {
        const page = res.data;
        this.pagedRecords = page.content;
        this.totalItems = page.totalElements;
        this.totalPages = page.totalPages;
        this.isTableLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.showError('Failed to load transactions.');
        this.isTableLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchTableData();
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startIndex(): number { return (this.currentPage - 1) * this.pageSize; }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.totalItems); }

  openRecordFeePanel(studentId: number, studentName: string): void {
    this.currentFee = { id: studentId, studentName };
    this.isSidePanelOpen = true;
    this.cdr.detectChanges();
  }

  closePanel(): void {
    this.isSidePanelOpen = false;
    setTimeout(() => { this.currentFee = {}; this.cdr.detectChanges(); }, 300);
  }

  // UPDATED: Now receives the transactionId and triggers success flow
  onPaymentSuccess(transactionId?: number): void {
    this.closePanel();
    this.loadData();
    
    // 1. Show Success Message
    this.notificationService.showSuccess('Payment recorded successfully!');
    
    // 2. Automatically download/print the receipt if ID was returned
    if (transactionId) {
      // Re-use our existing download logic
      this.downloadReceipt({ receiptId: transactionId });
    }
  }

  downloadReceipt(record: any): void {
    this.feeService.getReceiptDetails(record.receiptId).subscribe({
      next: (res: any) => this.printReceipt(res.data),
      error: () => this.notificationService.showError('Could not fetch receipt details for printing.')
    });
  }

  printReceipt(receipt: any): void {
    const win = window.open('', '_blank');
    if (!win) return;

    const rows = receipt.lineItems.map((item: any) => {
      const concessionText = item.concessionAmount > 0 
        ? `<br><small style="color:gray; font-size:10px;">(Discount: ₹${Number(item.concessionAmount).toFixed(2)})</small>` 
        : '';
      
      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.feeTypeName}${concessionText}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.feeMonth}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(item.paidAmount).toFixed(2)}</td>
      </tr>`;
    }).join('');

    win.document.write(`
<html>
<head>
  <title>Receipt #${receipt.receiptId}</title>
  <style>
    body {
      font-family: monospace;
      margin: 0;
      padding: 20px 0;
      background: #fff;
    }
    
    /* Center the receipt container itself horizontally on the page */
    .receipt-container {
      width: 300px;
      position: relative;
      margin: 0 auto; /* Centers the 300px box on the printed page */
      padding: 10px;
      color: #000;
      font-size: 12px;
    }

    /* WATERMARK LOGIC: Stretches to the exact height of the content layer, perfectly centering the text */
    .watermark-layer {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    }
    .watermark-text {
      transform: rotate(-30deg);
      font-size: 24px;
      font-weight: bold;
      color: rgba(0,0,0,0.08);
      white-space: nowrap;
    }

    /* Ensures content stays above the watermark */
    .content-layer {
      position: relative;
      z-index: 1;
      background: transparent;
    }

    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 0; }
  </style>
</head>
<body>
  
  <div class="receipt-container">
    
    <div class="watermark-layer">
      <div class="watermark-text">S.B. PUBLIC SCHOOL</div>
    </div>
    
    <div class="content-layer">
      <div class="center bold" style="font-size:14px;">S. B. PUBLIC SCHOOL</div>
      <div class="center" style="font-size:11px;">Fee Receipt</div>

      <div class="divider"></div>

      <div>
        <div><span class="bold">Receipt:</span> #${receipt.receiptId}</div>
        <div><span class="bold">Date:</span> ${new Date(receipt.paymentDate).toLocaleDateString('en-IN')}</div>
        <div><span class="bold">Mode:</span> ${receipt.paymentMode}</div>
      </div>

      <div class="divider"></div>

      <div>
        <table>
          <tr><td class="bold">Student</td><td>: ${receipt.studentName}</td></tr>
          <tr><td>Father</td><td>: ${receipt.fatherName}</td></tr>
          <tr><td>Class</td><td>: ${receipt.grade || "-"}</td></tr>
          <tr><td>SR No</td><td>: ${receipt.srNumber || "-"}</td></tr>
        </table>
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr class="bold">
            <td>Fee</td>
            <td>Month</td>
            <td class="right">Amt</td>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="right bold" style="font-size: 14px;">
        Total Paid: ₹${Number(receipt.totalPaid).toFixed(2)}
      </div>
      ${receipt.totalConcession > 0 ? `
      <div class="right" style="font-size: 11px; color: #555; margin-top: 4px;">
        Total Discount: ₹${Number(receipt.totalConcession).toFixed(2)}
      </div>` : ''}

      <div class="divider"></div>

      <div class="center" style="font-size:10px;">
        Thank You!
      </div>
    </div>
  </div>

</body>
</html>
`);
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  openStudentSearchModal(): void {
    this.isSearchModalOpen = true;
    this.studentSearchQuery = '';
    this.studentSearchResults = [];
  }

  closeStudentSearchModal(): void { this.isSearchModalOpen = false; }

  selectStudentForPayment(student: any): void {
    this.closeStudentSearchModal();
    this.openRecordFeePanel(student.id, student.name);
  }

  searchMasterStudents(): void {
    if (this.studentSearchQuery.trim().length < 2) {
      this.studentSearchResults = [];
      return;
    }
    this.feeService.searchStudents(this.studentSearchQuery).subscribe({
      next: (res: any) => { this.studentSearchResults = res.data.content; },
      error: () => this.notificationService.showError('Search failed.')
    });
  }
  deleteReceipt(record: any): void {
  const confirmDelete = window.confirm(`Are you sure you want to delete Receipt #${record.receiptId}? This will reverse the payment and restore the student's pending dues.`);
  
  if (confirmDelete) {
    this.feeService.deleteTransaction(record.receiptId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Receipt deleted and dues reverted successfully.');
        this.loadData(); // Refresh the table and stats
      },
      error: (err) => {
        this.notificationService.showError('Failed to delete the receipt.');
      }
    });
  }
}
}