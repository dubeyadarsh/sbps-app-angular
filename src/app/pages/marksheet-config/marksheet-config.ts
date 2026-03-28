import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';
import { STANDARDS } from '../../constants/constant';

@Component({
  selector: 'app-marksheet-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marksheet-config.html',
  styleUrls: ['./marksheet-config.css']
})
export class MarksheetConfigComponent implements OnInit {

  availableGrades = STANDARDS;
  activeSection: 'subjects' | 'config' | 'exams' = 'subjects';

  // ---- Subjects ----
  subjects: any[] = [];
  newSubject = { name: '', code: '' };
  editingSubjectId: number | null = null;
  editSubjectName = '';
  editSubjectCode = '';

  // ---- Grade Config ----
  gradeConfigs: any[] = [];
  newConfig = {
    standard: '',
    subjectId: '',
    theoryMaxMarks: 80,
    theoryPassMarks: 27,
    hasPractical: false,
    practicalMaxMarks: 20,
    practicalPassMarks: 7,
    isCompulsory: true,
    displayOrder: 0
  };

  // ---- Exams ----
  exams: any[] = [];
  newExam = { name: '', standard: '', academicYear: '', examDate: '' };

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSubjects();
  }

  // =========================================
  // SUBJECTS
  // =========================================
  loadSubjects(): void {
    this.api.getSubjects().subscribe({
      next: (res) => { this.subjects = res; this.cdr.detectChanges(); }
    });
  }

  saveSubject(): void {
    this.api.createSubject(this.newSubject).subscribe({
      next: () => {
        this.notify.showSuccess('Subject added.');
        this.newSubject = { name: '', code: '' };
        this.loadSubjects();
      },
      error: (e) => this.notify.showError(e.error?.message || 'Failed to add subject.')
    });
  }

  startEditSubject(s: any): void {
    this.editingSubjectId = s.id;
    this.editSubjectName = s.name;
    this.editSubjectCode = s.code || '';
  }

  saveEditSubject(id: number): void {
    this.api.updateSubject(id, { name: this.editSubjectName, code: this.editSubjectCode }).subscribe({
      next: () => {
        this.notify.showSuccess('Subject updated.');
        this.editingSubjectId = null;
        this.loadSubjects();
      },
      error: (e) => this.notify.showError(e.error?.message || 'Failed to update.')
    });
  }

  deleteSubject(id: number): void {
    if (!confirm('Delete this subject? This cannot be undone.')) return;
    this.api.deleteSubject(id).subscribe({
      next: () => { this.notify.showSuccess('Deleted.'); this.loadSubjects(); },
      error: () => this.notify.showError('Cannot delete — subject may be in use.')
    });
  }

  // =========================================
  // GRADE CONFIG
  // =========================================
  onGradeChange(): void {
    if (this.newConfig.standard) this.loadGradeConfig();
    else this.gradeConfigs = [];
  }

  loadGradeConfig(): void {
    this.api.getGradeConfig(this.newConfig.standard).subscribe({
      next: (res) => { this.gradeConfigs = res; this.cdr.detectChanges(); }
    });
  }

  saveConfig(): void {
    const payload: any = {
      standard: this.newConfig.standard,
      subjectId: Number(this.newConfig.subjectId),
      theoryMaxMarks: this.newConfig.theoryMaxMarks,
      theoryPassMarks: this.newConfig.theoryPassMarks,
      practicalMaxMarks: this.newConfig.hasPractical ? this.newConfig.practicalMaxMarks : null,
      practicalPassMarks: this.newConfig.hasPractical ? this.newConfig.practicalPassMarks : null,
      isCompulsory: this.newConfig.isCompulsory,
      displayOrder: this.newConfig.displayOrder
    };

    this.api.saveGradeConfig(payload).subscribe({
      next: () => {
        this.notify.showSuccess('Subject added to grade config.');
        this.loadGradeConfig();
      },
      error: (e) => this.notify.showError(e.error?.message || 'Failed to save config.')
    });
  }

  deleteConfig(id: number): void {
    if (!confirm('Remove this subject from the grade? Existing marks will be unaffected.')) return;
    this.api.deleteGradeConfig(id).subscribe({
      next: () => { this.notify.showSuccess('Removed.'); this.loadGradeConfig(); },
      error: (e) => this.notify.showError(e.error?.message || 'Delete failed.')
    });
  }

  // =========================================
  // EXAMS
  // =========================================
  loadExams(): void {
    if (!this.newExam.standard) return;
    this.api.getExams(this.newExam.standard).subscribe({
      next: (res) => { this.exams = res; this.cdr.detectChanges(); }
    });
  }

  saveExam(): void {
    this.api.createExam(this.newExam).subscribe({
      next: () => {
        this.notify.showSuccess('Exam created.');
        this.newExam.name = '';
        this.loadExams();
      },
      error: (e) => this.notify.showError(e.error?.message || 'Failed.')
    });
  }

  deleteExam(id: number): void {
    if (!confirm('Delete this exam? All marks entered for it will be lost.')) return;
    this.api.deleteExam(id).subscribe({
      next: () => { this.notify.showSuccess('Exam deleted.'); this.loadExams(); },
      error: () => this.notify.showError('Delete failed.')
    });
  }
}