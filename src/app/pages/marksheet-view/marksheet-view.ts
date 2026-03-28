import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';
import { MARKSHEET_TEMPLATES, TEMPLATE_META } from './marksheet-template';
import { STANDARDS } from "../../constants/constant"

@Component({
  selector: 'app-marksheet-view',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './marksheet-view.html',
  styleUrls: ['./marksheet-view.css']
})
export class MarksheetViewComponent implements OnInit {
  availableGrades = STANDARDS;
  selectedGrade: string = '';
  selectedExamId: string = '';
  selectedStudentId: string = '';
  selectedTemplate: string = '';

  exams: any[] = [];
  students: any[] = [];
  marksheet: any = null;
  isLoading: boolean = false;

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  // ==========================================
  // 1. SMART TEMPLATE LOGIC
  // ==========================================
  
  get isAnnualExamSelected(): boolean {
    if (!this.selectedExamId || !this.exams.length) return false;
    const exam = this.exams.find(e => String(e.id) === String(this.selectedExamId));
    return exam?.name?.toLowerCase().includes('annual') || false;
  }

  get availableTemplates() {
    const isAnnual = this.isAnnualExamSelected;
    return TEMPLATE_META.filter(t => t.isAnnual === isAnnual);
  }

  // ==========================================
  // 2. COMPONENT EVENTS
  // ==========================================

  onGradeChange(): void {
    this.selectedExamId = '';
    this.selectedStudentId = '';
    this.marksheet = null;
    this.students = [];
    if (!this.selectedGrade) return;

    this.api.getExams(this.selectedGrade).subscribe({
      next: (res) => { this.exams = res; this.cdr.detectChanges(); }
    });
  }

  onExamChange(): void {
    this.selectedStudentId = '';
    this.marksheet = null;
    if (!this.selectedExamId) return;

    if (this.availableTemplates.length > 0) {
      this.selectedTemplate = this.availableTemplates[0].key;
    }

    this.api.getStudentsByGrade(this.selectedGrade).subscribe({
      next: (res) => {
        this.students = res.data?.content || res.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  loadMarksheet(): void {
    if (!this.selectedExamId || !this.selectedStudentId) {
      this.notify.showError("Please select an exam and a student.");
      return;
    }
    this.isLoading = true;
    this.marksheet = null;

    this.api.getMarksheet(Number(this.selectedExamId), Number(this.selectedStudentId)).subscribe({
      next: (res) => {
        this.marksheet = res.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.notify.showError(e.error?.message || 'Failed to generate marksheet.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  printMarksheet(): void {
    if (!this.marksheet) return;

    const templateFn = MARKSHEET_TEMPLATES[this.selectedTemplate];
    if (!templateFn) {
        this.notify.showError("Invalid template selected.");
        return;
    }

    const html = templateFn(this.marksheet);
    const win = window.open('', '_blank');
    
    if (!win) {
      this.notify.showError("Please allow pop-ups to print the marksheet.");
      return;
    }

    // Safely write to the new document and ensure it finishes rendering before triggering print
    win.document.open();
    win.document.write(html);
    win.document.close();
    
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
}