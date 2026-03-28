import { Component, OnInit , ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';
@Component({
  selector: 'app-fee-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fee-config.html',
  styleUrls: ['../fee-management/fee-management.css'] // Reusing your premium styles!
})
export class FeeConfigComponent implements OnInit {
  
  feeTypes: any[] = [];
  rules: any[] = [];
  
 newRule = {
    standard: '',
    feeTypeId: '',
    amount: null,
    isMandatory: true // Default to true
  };
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
    private api: ApiService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef // Inject it here
  ) {}

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadRules();
  }

  loadDropdowns(): void {
    this.api.getFeeTypes().subscribe(res => this.feeTypes = res || []);
  }

  loadRules(): void {
    this.api.getClassFeeRules().subscribe(res => {
       this.rules = res || [] ;
       this.cdr.detectChanges();

    });
  }

 saveRule(): void {
    // 1. INSTANT FRONTEND VALIDATION
    // Check if a rule already exists in our local array for this grade + fee type
    const isDuplicate = this.rules.some(rule => 
      rule.standard === this.newRule.standard && 
      rule.feeTypeId === Number(this.newRule.feeTypeId)
    );

    if (isDuplicate) {
      this.notify.showError('This fee facility is already mapped to the selected grade.');
      return; // Stop the save process
    }

    // 2. PROCEED TO SAVE
    this.api.saveClassFeeRule(this.newRule).subscribe({
      next: (res) => {
        this.notify.showSuccess('Fee rule added successfully!');
        
        // Reset form
        this.newRule.standard = '';
        this.newRule.feeTypeId = '';
        this.newRule.amount = null;
        this.newRule.isMandatory = true; 
        
        this.loadRules(); // Refresh grid
      },
      error: (err) => {
        // Catch any backend validation messages just in case
        this.notify.showError(err.error?.message || 'Failed to save fee rule.');
      }
    });
  }

  deleteRule(id: number): void {
    if (confirm('Are you sure you want to delete this fee mapping?')) {
      this.api.deleteClassFeeRule(id).subscribe({
        next: () => {
          this.notify.showSuccess('Rule deleted.');
          this.loadRules();
        },
        error: () => this.notify.showError('Could not delete rule.')
      });
    }
  }
}