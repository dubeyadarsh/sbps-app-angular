import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification';
import { ApiService } from '../../services/api-service';
import { AuthService } from '../../services/auth-service';


export interface StoredFile {
  id: number;
  title: string;
  originalFileName: string;
  fileSize: number;
  category: string;
  uploadedAt: string;
}

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exams.html', // Pointing to your HTML file
  styleUrls: ['./exams.css']   // Pointing to your CSS file
})
export class ExamComponent implements OnInit {
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
  files: StoredFile[] = [];
  selectedCategory: string = 'All';
  searchText: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 6;

  // Upload Drawer State
  isSidePanelOpen: boolean = false;
  isUploading: boolean = false;
  newFileTitle: string = '';
  newFileCategory: string = 'Question Papers';
  selectedFile: File | null = null;

  categories = ['Question Papers', 'Syllabus', 'Circulars', 'Administrative'];

  constructor(
    private apiService: ApiService,
    private notify: NotificationService,
    public authService: AuthService,
    public cdr : ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.apiService.getStoredFiles(this.selectedCategory).subscribe({
      next: (res) => {
        this.files = res;
        this.cdr.detectChanges();
      },
      error: () => this.notify.showError('Failed to load files.')
    });
  }

  // --- FILTERS & PAGINATION ---
  get filteredFiles(): StoredFile[] {
    if (!this.searchText) return this.files;
    const search = this.searchText.toLowerCase();
    return this.files.filter(f => 
      f.title.toLowerCase().includes(search) || 
      f.originalFileName.toLowerCase().includes(search)
    );
  }

  get totalItems(): number { return this.filteredFiles.length; }
  get totalPages(): number { return Math.ceil(this.totalItems / this.pageSize) || 1; }
  get startIndex(): number { return (this.currentPage - 1) * this.pageSize; }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.totalItems); }
  get pagedFiles(): StoredFile[] { return this.filteredFiles.slice(this.startIndex, this.endIndex); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  onFilterChange(): void { 
    this.currentPage = 1; 
    this.loadFiles();
  }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages) this.currentPage = page; }

  // --- FORMATTERS ---
  formatBytes(bytes: number, decimals = 2): string {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // --- UPLOAD DRAWER ACTIONS ---
  openUploadPanel(): void {
    this.newFileTitle = '';
    this.selectedFile = null;
    this.isSidePanelOpen = true;
  }

  closePanel(): void {
    this.isSidePanelOpen = false;
    this.isUploading = false;
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile && !this.newFileTitle) {
      // Auto-fill title based on file name if empty
      this.newFileTitle = this.selectedFile.name.split('.')[0];
    }
  }

  uploadFile(): void {
    if (!this.newFileTitle || !this.selectedFile) {
      this.notify.showError('Please provide a title and select a file.');
      return;
    }

    this.isUploading = true;
    this.apiService.uploadStoredFile(this.newFileTitle, this.newFileCategory, this.selectedFile).subscribe({
      next: () => {
        this.notify.showSuccess('File uploaded successfully!');
        this.closePanel();
        this.loadFiles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'Upload failed.');
        this.isUploading = false;
      }
    });
  }

  // --- ACTIONS ---
  downloadFile(id: number, originalName: string): void {
    // Creating a temporary anchor tag to hit the GET endpoint natively
    // This allows the browser to handle the file download stream cleanly
    const link = document.createElement('a');
    link.href = this.apiService.downloadFileUrl(id);
    
    // If you are using JWT, append it to the URL if your backend allows URL params, 
    // OR change your api-service to download it as a Blob.
    // Assuming your backend AuthenticationFilter allows GET /api/storage/download/** if you tweak the filter.
    
    link.download = originalName;
    link.click();
  }

  deleteFile(file: StoredFile): void {
    if(confirm(`Delete "${file.title}" permanently?`)) {
      this.apiService.deleteStoredFile(file.id).subscribe({
        next: () => {
          this.notify.showSuccess('File deleted.');
          this.loadFiles();
        },
        error: () => this.notify.showError('Could not delete file.')
      });
    }
  }

  isGenerating: boolean = false;
  isExamSidePanelOpen : boolean = false;
  // The AI Prompt Model
  newPaper = {
    schoolName: 'S. B. PUBLIC SCHOOL', // Defaulting to your institution
    examName: 'Mid-Term Examination',
    examYear: '2025-2026',
    grade: '10',
    subject: 'Science',
    chapters: '',
    totalMarks: 40,
    questionTypes: [] as string[],
    includeAnswers: true
  };

  // Available Question Types for the UI Chips
  availableQuestionTypes = [
    'Multiple Choice (1 Mark)',
    'True/False (1 Mark)',
    'Fill in the Blanks (1 Mark)',
    'Short Answer (2-3 Marks)',
    'Long Answer (5 Marks)',
    'Matching Questions'
  ];


  openGeneratePanel(): void {
    this.isExamSidePanelOpen = true;
    this.onGradeChange();
  }

  // Toggle selection for Question Type chips
  toggleQuestionType(type: string): void {
    const index = this.newPaper.questionTypes.indexOf(type);
    if (index > -1) {
      this.newPaper.questionTypes.splice(index, 1); // Remove if already selected
    } else {
      this.newPaper.questionTypes.push(type); // Add if not selected
    }
  }

  // Trigger the AI Generation
  generateAndDownloadPaper(): void {
    // Basic Validation
    if (!this.newPaper.chapters || this.newPaper.questionTypes.length === 0) {
      this.notify.showError("Please provide chapters and select at least one question type.");
      return;
    }

    this.isGenerating = true;
    this.notify.showSuccess("AI is generating the paper. This may take 10-15 seconds...");

    // Convert the array of question types to a comma-separated string for the API
    const apiPayload = {
      ...this.newPaper,
      questionTypes: this.newPaper.questionTypes.join(', ')
    };

    this.apiService.generateWordPaper(apiPayload).subscribe({
      next: (blob: Blob) => {
        // Handle the binary file download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Clean up the file name
        const safeExamName = this.newPaper.examName.replace(/\s+/g, '_');
        a.download = `${this.newPaper.subject}_Grade_${this.newPaper.grade}_${safeExamName}.docx`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.notify.showSuccess("Question Paper downloaded successfully!");
        this.isGenerating = false;
        this.closeExamPanel();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.notify.showError("Failed to generate the document. Please try again.");
        this.isGenerating = false;
        this.cdr.detectChanges();

      }
    });
  }

  closeExamPanel(): void {
    this.isExamSidePanelOpen = false;
    this.isGenerating = false;
  }
  configuredSubjects: any[] = [];
  onGradeChange(): void {
    if (!this.newPaper.grade) return;
    
    this.apiService.getSubjectsByGrade(this.newPaper.grade).subscribe({
      next: (subjects) => {
        this.configuredSubjects = subjects;
        
        // Auto-select the first subject in the list and set its marks
        if (subjects.length > 0) {
          this.newPaper.subject = subjects[0].subjectName;
          this.newPaper.totalMarks = subjects[0].totalMarks;
        } else {
          this.newPaper.subject = '';
          this.newPaper.totalMarks = 0;
        }
      },
      error: () => this.notify.showError("Failed to fetch subjects for this grade.")
    });
  }

  // Triggered when the user changes the Subject dropdown
  onSubjectChange(): void {
    const selected = this.configuredSubjects.find(s => s.subjectName === this.newPaper.subject);
    if (selected) {
      // Automatically update the total marks field based on the config!
      this.newPaper.totalMarks = selected.totalMarks; 
    }
  }
}