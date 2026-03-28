import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api-service';
import { NotificationService } from '../../services/notification';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-marks-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './marks-entry.html',
  styleUrls: ['./marks-entry.css']
})
export class MarksEntryComponent implements OnInit {

  selectedGrade: string = '';
  selectedExamId: string = '';
  examName: string = '';

  exams: any[] = [];
  configs: any[] = [];  // ClassSubjectConfigDTO[] for selected grade
  rows: any[] = [];     // MarksEntryRowDTO[] with dirty tracking

  isLoading: boolean = false;
  isSaving: boolean = false;

  constructor(
    private api: ApiService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  onGradeChange(): void {
    this.selectedExamId = '';
    this.rows = [];
    this.configs = [];
    if (!this.selectedGrade) return;

    this.api.getExams(this.selectedGrade).subscribe({
      next: (res) => { this.exams = res; this.cdr.detectChanges(); }
    });
  }

  loadGrid(): void {
    if (!this.selectedExamId) return;

    const exam = this.exams.find(e => String(e.id) === String(this.selectedExamId));
    this.examName = exam?.name || '';

    this.isLoading = true;

    // Load config + marks grid in parallel
    forkJoin({
      config: this.api.getGradeConfig(this.selectedGrade),
      grid: this.api.getMarksGrid(Number(this.selectedExamId))
    }).subscribe({
      next: ({ config, grid }) => {
        this.configs = config;
        // Attach dirty tracking to each row
        this.rows = (grid.data || []).map((row: any) => ({
          ...row,
          _dirty: false,
          _saved: false,
          _hasError: false
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notify.showError('Failed to load marks grid.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onMarksChange(row: any, subjectIndex: number): void {
    row._dirty = true;
    row._saved = false;
    // Check for any errors in this row
    row._hasError = row.marks.some((m: any, i: number) =>
      this.isOverMax(m.theoryMarks, this.configs[i]?.theoryMaxMarks) ||
      this.isOverMax(m.practicalMarks, this.configs[i]?.practicalMaxMarks)
    );
  }

  isOverMax(value: number | null, max: number): boolean {
    return value != null && max != null && value > max;
  }

  getRowTotal(row: any): number {
    return row.marks.reduce((sum: number, m: any, i: number) => {
      return sum + (m.theoryMarks || 0) + (this.configs[i]?.hasPractical ? (m.practicalMarks || 0) : 0);
    }, 0);
  }

  getRowMax(row: any): number {
    return this.configs.reduce((sum: number, c: any) =>
      sum + c.theoryMaxMarks + (c.hasPractical ? c.practicalMaxMarks : 0), 0);
  }

  // Save all dirty rows
  saveAll(): void {
    const dirtyRows = this.rows.filter(r => r._dirty && !r._hasError);

    if (dirtyRows.length === 0) {
      this.notify.showError('No changes to save, or fix validation errors first.');
      return;
    }

    this.isSaving = true;
    let saved = 0;
    let failed = 0;

    const saveNext = (index: number) => {
      if (index >= dirtyRows.length) {
        this.isSaving = false;
        if (failed === 0) {
          this.notify.showSuccess(`Saved marks for ${saved} student(s).`);
        } else {
          this.notify.showError(`${saved} saved, ${failed} failed.`);
        }
        this.cdr.detectChanges();
        return;
      }

      const row = dirtyRows[index];
      const payload = {
        examId: Number(this.selectedExamId),
        studentId: row.studentId,
        marks: row.marks.map((m: any) => ({
          configId: m.configId,
          theoryMarks: m.theoryMarks ?? null,
          practicalMarks: m.practicalMarks ?? null
        }))
      };

      this.api.saveMarks(payload).subscribe({
        next: () => {
          row._dirty = false;
          row._saved = true;
          saved++;
          saveNext(index + 1);
        },
        error: () => {
          failed++;
          row._hasError = true;
          saveNext(index + 1);
        }
      });
    };

    saveNext(0);
  }
}