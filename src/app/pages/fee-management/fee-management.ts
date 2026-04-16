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

  // Global Filters
  selectedGrade: string = '';
  
  // Tab 1: Transactions Data
  selectedStudentFilter: number | '' = '';
  classStudentsForFilter: any[] = [];
  pagedRecords: any[] = [];
  isTableLoading: boolean = false;
  
  // Tab 2: Due Report Data
  selectedTillMonth: string = ''; 
  dueReports: any[] = [];
  isReportLoading: boolean = false;

  // View Controls
  activeTab: 'transactions' | 'duereport' = 'transactions';
  reportStats = { total: 0, collected: 0, pending: 0, overdue: 0 };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;

  // Modals
  isSidePanelOpen: boolean = false;
  currentFee: { id?: number; studentName?: string; grade?: string } = {};
  isSearchModalOpen: boolean = false;
  tempSelectedGrade: string = '';
  tempSelectedStudent: any = null;
  studentSearchResults: any[] = [];

  // Static Data
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

  academicMonths = [
    { id: 1, name: 'Apr' }, { id: 2, name: 'May' }, { id: 3, name: 'Jun' },
    { id: 4, name: 'Jul' }, { id: 5, name: 'Aug' }, { id: 6, name: 'Sep' },
    { id: 7, name: 'Oct' }, { id: 8, name: 'Nov' }, { id: 9, name: 'Dec' },
    { id: 10, name: 'Jan' }, { id: 11, name: 'Feb' }, { id: 12, name: 'Mar' }
  ];

  constructor(
    private feeService: ApiService,
    public notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  switchTab(tab: 'transactions' | 'duereport'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadData();
  }

  onFilterChange(trigger: 'grade' | 'student' | 'month' = 'grade'): void {
    this.currentPage = 1;
    
    // When grade changes, fetch the student list for the dropdown filter
    if (trigger === 'grade') {
      this.selectedStudentFilter = '';
      this.classStudentsForFilter = [];
      if (this.selectedGrade) {
        this.feeService.getStudentsByStandard(this.selectedGrade).subscribe({
          next: (res: any) => {
            this.classStudentsForFilter = Array.isArray(res) ? res : (res.data || []);
          }
        });
      }
    }
    
    this.loadData();
  }

  loadData(): void {
    if (!this.selectedGrade) return;
    this.fetchReportStats();
    
    if (this.activeTab === 'transactions') {
      this.fetchTableData();
    } else if (this.activeTab === 'duereport') {
      if (this.selectedTillMonth) {
        this.fetchDueReport();
      } else {
        this.dueReports = []; 
      }
    }
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
      this.selectedGrade, 
      this.selectedStudentFilter, 
      this.currentPage - 1, 
      this.pageSize
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

fetchDueReport(): void {
    this.isReportLoading = true;
    const tillMonthParam = this.selectedTillMonth ? Number(this.selectedTillMonth) : undefined;

    this.feeService.getClassDueReport(this.selectedGrade, tillMonthParam).subscribe({
      next: (res: any) => {
        let rawReports = res.data || [];
        
        // NEW FRONTEND CHECK: Filter out any items that end in ₹0 or ₹0.00
        this.dueReports = rawReports.map((rep: any) => {
          rep.dueBreakdown = rep.dueBreakdown.filter((item: string) => {
            return !item.endsWith('₹0') && !item.endsWith('₹0.00');
          });
          return rep;
        }).filter((rep: any) => rep.dueBreakdown.length > 0); // Hide student entirely if no dues are left

        this.isReportLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.showError('Failed to load due report.');
        this.isReportLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  printDueReport(): void {
    const win = window.open('', '_blank');
    if (!win) return;

    let rows = '';
    let grandTotal = 0;

    this.dueReports.forEach(row => {
      grandTotal += parseFloat(row.totalDue);
      const itemsHtml = row.dueBreakdown.map((item: string) => `<div>• ${item}</div>`).join('');
      
      rows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>${row.studentName}</strong><br><small style="color:gray;">SR: ${row.srNumber}</small></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: #ef4444; font-weight: bold;">₹${Number(row.totalDue).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; color: #555;">${itemsHtml}</td>
        </tr>
      `;
    });

    const monthLabel = this.selectedTillMonth ? this.academicMonths.find(m => m.id == Number(this.selectedTillMonth))?.name : 'All Months';

    win.document.write(`
      <html>
      <head>
        <title>Fee Due Report - Grade ${this.selectedGrade}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; padding: 10px; border: 1px solid #ddd; text-align: left; }
          h2, h3 { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 30px;">
          <h2>S. B. PUBLIC SCHOOL</h2>
          <h3>Fee Due Report</h3>
          <p>Class: <strong>${this.selectedGrade}</strong> | Calculated Until: <strong>${monthLabel}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student Details</th>
              <th>Total Due</th>
              <th>Pending Breakdowns</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 10px; text-align: right; font-weight: bold;">Class Total Pending:</td>
              <td colspan="2" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ef4444; font-size: 16px;">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `);
    
    win.document.close();
    setTimeout(() => win.print(), 300);
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

  openRecordFeePanel(studentId: number, studentName: string, grade?: string): void {
    this.currentFee = { 
      id: studentId, 
      studentName, 
      grade: grade || this.selectedGrade 
    };
    this.isSidePanelOpen = true;
    this.cdr.detectChanges();
  }

  closePanel(): void {
    this.isSidePanelOpen = false;
    setTimeout(() => { this.currentFee = {}; this.cdr.detectChanges(); }, 300);
  }

  onPaymentSuccess(transactionId?: number): void {
    this.closePanel();
    this.loadData();
    
    this.notificationService.showSuccess('Payment recorded successfully!');
    
    if (transactionId) {
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
        ? `<br><small style="color:gray; font-size:9px;">(Disc: ₹${Number(item.concessionAmount).toFixed(2)})</small>` 
        : '';
      
      return `
      <tr>
        <td style="padding:6px 0; border-bottom:1px solid #eee;">${item.feeTypeName}${concessionText}</td>
        <td style="padding:6px 0; border-bottom:1px solid #eee;">${item.feeMonth}</td>
        <td style="padding:6px 0; border-bottom:1px solid #eee;text-align:right;">₹${Number(item.paidAmount).toFixed(2)}</td>
      </tr>`;
    }).join('');

    win.document.write(`
<html>
<head>
  <title>Receipt #${receipt.receiptId}</title>
  <style>
    /* Force A4 Page without browser margins */
    @page { size: A4; margin: 0; }
    
    body { 
      font-family: monospace; 
      margin: 0; 
      padding: 0; 
      background: #fff; 
    }
    
    /* Strictly sized to 1/4 of an A4 page and locked to top-left */
    .receipt-container { 
      width: 105mm; 
      height: 148mm; 
      position: absolute; 
      top: 0; 
      left: 0; 
      padding: 15px; 
      box-sizing: border-box;
      color: #000; 
      font-size: 11px; 
      overflow: hidden; 
      /* Optional cut guide: border-right: 1px dashed #ccc; border-bottom: 1px dashed #ccc; */
    }
    
    .watermark-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 0; pointer-events: none; }
    .watermark-text { transform: rotate(-30deg); font-size: 20px; font-weight: bold; color: rgba(0,0,0,0.06); white-space: nowrap; }
    .content-layer { position: relative; z-index: 1; background: transparent; }
    
    .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="watermark-layer"><div class="watermark-text">S.B. PUBLIC SCHOOL</div></div>
    
    <div class="content-layer">
      <div class="center bold" style="font-size:13px;">S. B. PUBLIC SCHOOL</div>
      <div class="center" style="font-size:10px;">Fee Receipt</div>
      <div class="divider"></div>
      
      <div style="display:flex; justify-content:space-between; font-size: 10px;">
        <div><span class="bold">Rct:</span> #${receipt.receiptId}</div>
        <div><span class="bold">Date:</span> ${new Date(receipt.paymentDate).toLocaleDateString('en-IN')}</div>
        <div><span class="bold">Mode:</span> ${receipt.paymentMode}</div>
      </div>
      
      <div class="divider"></div>
      <table style="font-size: 10px;">
        <tr><td class="bold" width="45">Student</td><td>: ${receipt.studentName}</td></tr>
        <tr><td class="bold">Father</td><td>: ${receipt.fatherName}</td></tr>
        <tr><td class="bold">Class</td><td>: ${receipt.grade || "-"}</td></tr>
        <tr><td class="bold">SR No</td><td>: ${receipt.srNumber || "-"}</td></tr>
      </table>
      <div class="divider"></div>
    <table>
        <thead><tr class="bold"><td>Fee</td><td>Period</td><td class="right">Amt</td></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      
      <div class="divider"></div>
      
      <div class="right bold" style="font-size: 13px;">Total Paid: ₹${Number(receipt.totalPaid).toFixed(2)}</div>
      
      ${receipt.totalConcession > 0 ? `<div class="right" style="font-size: 10px; color: #777; margin-top: 2px;">Total Discount: ₹${Number(receipt.totalConcession).toFixed(2)}</div>` : ''}
      
      <div class="right bold" style="font-size: 12px; margin-top: 4px;">Remaining Due: ₹${Number(receipt.remainingDue).toFixed(2)}</div>
      
      <div class="divider"></div>
      <div class="center" style="font-size:9px; margin-top: 8px;">System Generated Receipt</div>
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
    this.tempSelectedGrade = '';
    this.tempSelectedStudent = null;
    this.studentSearchResults = [];
  }

  closeStudentSearchModal(): void { 
    this.isSearchModalOpen = false; 
  }

  onGradeSelectedInModal(): void {
    this.tempSelectedStudent = null;
    if (!this.tempSelectedGrade) {
      this.studentSearchResults = [];
      return;
    }
    
    this.feeService.getStudentsByStandard(this.tempSelectedGrade).subscribe({
      next: (res: any) => {
        this.studentSearchResults = Array.isArray(res) ? res : (res.data || []);
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.showError('Failed to load students.')
    });
  }

  onStudentSelectedInModal(): void {
    if (this.tempSelectedStudent) {
      this.closeStudentSearchModal();
      this.openRecordFeePanel(
        this.tempSelectedStudent.id, 
        this.tempSelectedStudent.name || this.tempSelectedStudent.studentName,
        this.tempSelectedGrade
      );
    }
  }

  deleteReceipt(record: any): void {
    const confirmDelete = window.confirm(`Are you sure you want to delete Receipt #${record.receiptId}? This will reverse the payment and restore the student's pending dues.`);
    
    if (confirmDelete) {
      this.feeService.deleteTransaction(record.receiptId).subscribe({
        next: () => {
          this.notificationService.showSuccess('Receipt deleted and dues reverted successfully.');
          this.loadData(); 
        },
        error: (err) => {
          this.notificationService.showError('Failed to delete the receipt.');
        }
      });
    }
  }
  
}