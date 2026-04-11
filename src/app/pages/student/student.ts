import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { NotificationService } from '../../services/notification';
import { ApiService } from '../../services/api-service';
import { ChangeDetectorRef } from '@angular/core';
import { ACADEMIC_YEAR } from '../../services/constant';
import { baseApiUrl } from '../../constants/constant';
export interface Student {
  id: number; 
  srNumber: string;
  name: string;
  fathersName: string;
  mothersName: string;
  aadharNumber: string;
  phoneNumber: string;
  standard: string;
  dob: string;
  address: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string; // For the UI
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule,],
  templateUrl: './student.html',
  styleUrls: ['./student.css']
})
export class StudentsComponent implements OnInit {
  
  @ViewChild('idCardElement', { static: false }) idCardElement!: ElementRef;
// Add this inside your StudentsComponent class
  readonly defaultAvatar: string = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
  selectedGrade: string = ''; 
  searchText: string = '';
  currentPage: number = 1;
  pageSize: number = 30; 
  isLoading: boolean = false; 
  
  isSidePanelOpen: boolean = false;
  panelMode: 'add' | 'edit' = 'add';
  currentStudent: Partial<Student> = {}; 
  formErrors: any = {}; // Tracks validation errors
  academicYear = ACADEMIC_YEAR;
  showIdModal: boolean = false;
  generatedStudent: Student | null = null;
  allStudents: Student[] = [];
totalItems: number = 0;
  totalPages: number = 0;
  constructor(
    private notificationService: NotificationService,
    private studentService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}
  selectedPhotoFile: File | null = null;
  photoPreviewUrl: string | ArrayBuffer | null = null;
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
  ngOnInit(): void {}

  onFilterChange(): void { 
    this.currentPage = 1; 
    if (this.selectedGrade) {
      this.loadStudentsByGrade(this.selectedGrade);
    } else {
      this.allStudents = [];
    }
  }

  loadStudentsByGrade(grade: string): void {
    this.isLoading = true;
    
    // Pass page - 1 because Spring Boot expects page 0 for the first page
    this.studentService.getStudentsByGrade(grade, this.searchText, this.currentPage - 1, this.pageSize).subscribe({
      next: (response: any) => {
        // Spring's Page object stores the actual array inside 'content'
        this.allStudents = response.data.content || [];
        
        // Map the backend pagination metadata to our local variables
        this.totalItems = response.data.totalElements;
        this.totalPages = response.data.totalPages;
        
       // Replace the UI-Avatars loop with this:
        // Inside loadStudentsByGrade's success callback:
        this.allStudents.forEach(s => {
           if (s.photoUrl) {
             // Append your backend API path here!
             s.avatar = `${baseApiUrl}api/students/photos/${s.photoUrl}`; 
           } else {
             s.avatar = this.defaultAvatar;
           }
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.notificationService.showError(`Failed to load students for Grade ${grade}.`);
        this.isLoading = false;
        this.allStudents = [];
        this.totalItems = 0;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // FORM VALIDATION
  // ==========================================
validateForm(): boolean {
    this.formErrors = {};
    let isValid = true;

    // Add validation for the Standard
    if (!this.currentStudent.standard) { this.formErrors.standard = 'Standard/Grade is required'; isValid = false; }
    if (!this.currentStudent.name?.trim()) { this.formErrors.name = 'Full Name is required'; isValid = false; }
    if (!this.currentStudent.fathersName?.trim()) { this.formErrors.fathersName = 'Father\'s Name is required'; isValid = false; }
    if (!this.currentStudent.mothersName?.trim()) { this.formErrors.mothersName = 'Mother\'s Name is required'; isValid = false; }
    if (!this.currentStudent.phoneNumber?.trim()) { this.formErrors.phoneNumber = 'Phone Number is required'; isValid = false; }
    if (!this.currentStudent.dob) { this.formErrors.dob = 'Date of Birth is required'; isValid = false; }

    return isValid;
  }
saveStudent(): void {
    if (!this.validateForm()) {
      this.notificationService.showError('Please fill in all mandatory fields.');
      return;
    }

    this.isLoading = true; 

    if (this.panelMode === 'add') {
      this.studentService.addStudent(this.currentStudent).subscribe({
        next: (response: any) => {
          this.handlePhotoUploadAndFinalize(response.data.id, response.message, response.data);
        },
        error: (err: any) => {
          this.notificationService.showError(err.error?.message || 'Error adding student');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.studentService.updateStudent(this.currentStudent.id!.toString(), this.currentStudent).subscribe({
        next: (response: any) => {
          this.handlePhotoUploadAndFinalize(this.currentStudent.id!, response.message, response.data);
        },
        error: (err: any) => {
          this.notificationService.showError(err.error?.message || 'Error updating student');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Helper method to upload photo (if selected) and wrap up the save process
  private handlePhotoUploadAndFinalize(studentId: number, successMsg: string, studentData: any): void {
    if (this.selectedPhotoFile) {
      // Call the API service to upload the photo using FormData
      this.studentService.uploadStudentPhoto(studentId, this.selectedPhotoFile).subscribe({
        next: () => {
          this.finalizeSaveProcess(successMsg, studentData);
        },
        error: () => {
          this.notificationService.showError("Student saved, but photo upload failed.");
          this.finalizeSaveProcess(successMsg, studentData);
        }
      });
    } else {
      this.finalizeSaveProcess(successMsg, studentData);
    }
  }

  private finalizeSaveProcess(successMsg: string, studentData: any): void {
    this.notificationService.showSuccess(successMsg);
    this.closePanel();
    if (this.selectedGrade) this.loadStudentsByGrade(this.selectedGrade); 
    
    // Only show ID modal if it was a new student
    if (this.panelMode === 'add') {
      this.openIdModal(studentData);
    }
    
    this.isLoading = false;
    this.cdr.detectChanges();
  }
  deleteStudent(student: Student): void {
    if(confirm(`Are you sure you want to delete ${student.name}'s record? This cannot be undone.`)) {
      this.isLoading = true;
      this.studentService.deleteStudent(student.id.toString()).subscribe({
        next: (response: any) => {
          this.notificationService.showSuccess(response.message);
          if (this.selectedGrade) this.loadStudentsByGrade(this.selectedGrade);
          if (this.pagedStudents.length === 1 && this.currentPage > 1) this.currentPage--;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.notificationService.showError(err.error?.message || 'Error deleting student');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ==========================================
  // BULK UPLOAD
  // ==========================================
  downloadTemplate(): void {
    this.studentService.downloadTemplate().subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_bulk_upload_template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  onFileSelected(event: any): void {
    // PREVENT UPLOAD IF NO GRADE IS SELECTED
    if (!this.selectedGrade) {
      this.notificationService.showError('Please select a Grade from the dropdown before uploading.');
      event.target.value = ''; // Reset input
      return;
    }

    const file: File = event.target.files[0];
    if (file) {
      this.isLoading = true;
      
      // Pass the selectedGrade to the service
      this.studentService.uploadBulk(file, this.selectedGrade).subscribe({
        next: (response: any) => {
          this.notificationService.showSuccess(response.message);
          this.loadStudentsByGrade(this.selectedGrade); // Refresh grid
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.notificationService.showError(err.error?.message || 'Upload failed.');
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
      event.target.value = ''; // Reset input
    }
  }
  // ... Keep existing pagination and modal getters/setters unchanged ...
  get filteredStudents(): Student[] {
    if (!this.selectedGrade) return [];
    let result = this.allStudents; 
    if (this.searchText) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(search)) || 
        (s.srNumber && s.srNumber.toLowerCase().includes(search)) ||
        (s.phoneNumber && s.phoneNumber.includes(search))
      );
    }
    return result;
  }
 get startIndex(): number { return (this.currentPage - 1) * this.pageSize; }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.totalItems); }
  goToPage(page: number): void { 
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadStudentsByGrade(this.selectedGrade); // Fetch the new page from the backend!
    } 
  }

  // 4. Simplify Data Getters
  get pagedStudents(): Student[] {
    // We no longer slice the array! We just display exactly what the backend gave us.
    return this.allStudents; 
  }
  
  get pages(): number[] { 
    return Array.from({ length: this.totalPages }, (_, i) => i + 1); 
  }
 openPanel(mode: 'add' | 'edit', student?: Student): void {
    this.panelMode = mode;
    this.formErrors = {}; 
    this.selectedPhotoFile = null; // Reset
    this.photoPreviewUrl = null;   // Reset
    
    if (mode === 'edit' && student) {
      this.currentStudent = { ...student };
    } else {
      this.currentStudent = { standard: '' };
    }
    this.isSidePanelOpen = true;
  }
  closePanel(): void { this.isSidePanelOpen = false; this.currentStudent = {}; this.formErrors = {}; }
  openAddStudentModal(): void { this.openPanel('add'); }
  viewStudentProfile(student: Student): void { this.notificationService.showSuccess(`Loading profile view...`); }
  downloadIdCardFromTable(student: Student): void { this.openIdModal(student); }
  openIdModal(student: Student): void { this.generatedStudent = student; this.showIdModal = true; }
  closeIdModal(): void { this.showIdModal = false; this.generatedStudent = null; }
  downloadIdCardPDF(): void {
    if (!this.idCardElement) return;
    this.notificationService.showSuccess('Preparing high-quality ID Card...');
    const element = this.idCardElement.nativeElement;
    html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', [54, 86]); 
      pdf.addImage(imgData, 'PNG', 0, 0, 54, 86);
      pdf.save(`${this.generatedStudent?.name?.replace(/\s+/g, '_')}_ID_Card.pdf`);
      this.closeIdModal();
    });
  }
  onPhotoSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Validate file size (e.g., max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.notificationService.showError("Image is too large. Maximum size is 2MB.");
        event.target.value = ''; // Reset
        return;
      }
      
      this.selectedPhotoFile = file;

      // Read file to show instant preview in UI
      const reader = new FileReader();
      reader.onload = e => this.photoPreviewUrl = reader.result;
      reader.readAsDataURL(file);
    }
  }
 // ==========================================
  // BULK ID GENERATION (8 Cards per Landscape A4)
  // OPTIMIZED FOR LARGE BATCHES
  // ==========================================
@ViewChild('bulkContainer', { static: false }) bulkContainer!: ElementRef;

showProgressModal: boolean = false;
progressCurrent: number = 0;
progressTotal: number = 0;
progressPercent: number = 0;
progressCurrentBatch: number = 0;
progressTotalBatches: number = 0;
progressCurrentStudent: string = '';
isGenerating: boolean = false;
cancelGeneration: boolean = false;

// ==========================================
// OPTIMIZED BULK ID GENERATION WITH PROGRESS
// ==========================================

async generateBulkIDs(): Promise<void> {
  if (!this.allStudents || this.allStudents.length === 0) {
    this.notificationService.showError("No students found.");
    return;
  }

  // Show progress modal
  this.showProgressModal = true;
  this.isGenerating = true;
  this.cancelGeneration = false;
  this.progressCurrent = 0;
  this.progressTotal = this.allStudents.length;
  this.progressPercent = 0;
  this.cdr.detectChanges();

  // Prepare container
  const container = document.querySelector('.bulk-print-container') as HTMLElement;
  if (!container) {
    this.closeProgressModal();
    return;
  }

  container.classList.add('printing-active');
  
  // Pre-load all images first
  await this.preloadAllImages(container);
  
  if (this.cancelGeneration) {
    this.cleanupGeneration(container);
    return;
  }

  try {
    const cardsPerPage = 8;
    const totalBatches = Math.ceil(this.allStudents.length / cardsPerPage);
    this.progressTotalBatches = totalBatches;
    
    // Process batches one by one with UI updates
    for (let batch = 0; batch < totalBatches; batch++) {
      if (this.cancelGeneration) break;
      
      this.progressCurrentBatch = batch + 1;
      this.cdr.detectChanges();
      
      await this.generateBatchPDF(batch, cardsPerPage, container);
      
      // Small delay between batches for UI to breathe
      if (batch < totalBatches - 1) {
        await this.delay(500);
      }
    }
    
    if (!this.cancelGeneration) {
      this.notificationService.showSuccess(`Successfully generated ${this.progressTotalBatches} PDF file(s)!`);
    }
  } catch (err) {
    console.error('Generation error:', err);
    this.notificationService.showError("Generation interrupted. Please try again.");
  } finally {
    this.cleanupGeneration(container);
  }
}

private async preloadAllImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  const total = images.length;
  
  for (let i = 0; i < images.length; i++) {
    if (this.cancelGeneration) return;
    
    const img = images[i] as HTMLImageElement;
    if (!img.complete) {
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }
    
    // Update progress for image loading
    this.progressCurrent = i + 1;
    this.progressPercent = (this.progressCurrent / total) * 30; // 30% for loading
    this.progressCurrentStudent = `Loading images... (${i + 1}/${total})`;
    this.cdr.detectChanges();
    
    // Small delay to prevent UI freeze
    if (i % 10 === 0) await this.delay(10);
  }
}

private async generateBatchPDF(batchIndex: number, cardsPerPage: number, container: HTMLElement): Promise<void> {
  const startIdx = batchIndex * cardsPerPage;
  const endIdx = Math.min(startIdx + cardsPerPage, this.allStudents.length);
  const pdf = new jsPDF('l', 'mm', 'a4');
  
  const cardWidth = 54, cardHeight = 86;
  const cols = 4, rows = 2;
  const gapX = 5, gapY = 5;
  
  const startX = (297 - ((cols * cardWidth) + (3 * gapX))) / 2;
  const startY = (210 - ((rows * cardHeight) + (1 * gapY))) / 2;
  
  // Process cards in this batch with progress updates
  for (let i = startIdx; i < endIdx; i++) {
    if (this.cancelGeneration) return;
    
    const element = document.getElementById(`print-card-${i}`);
    if (!element) continue;
    
    // Update progress
    this.progressCurrent = i + 1;
    this.progressPercent = 30 + ((this.progressCurrent / this.progressTotal) * 70);
    this.progressCurrentStudent = this.allStudents[i]?.name || `Student ${i + 1}`;
    this.cdr.detectChanges();
    
    // Yield to browser to prevent freezing
    await this.delay(1);
    
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      imageTimeout: 0,
      backgroundColor: '#ffffff',
      allowTaint: false
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const indexOnPage = i - startIdx;
    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);
    
    pdf.addImage(imgData, 'JPEG', 
      startX + (col * (cardWidth + gapX)), 
      startY + (row * (cardHeight + gapY)), 
      cardWidth, cardHeight
    );
    
    // Clean up canvas
    canvas.width = 0;
    canvas.height = 0;
  }
  
  // Save PDF
  const fileName = `ID_Cards_Batch_${batchIndex + 1}_of_${this.progressTotalBatches}.pdf`;
  pdf.save(fileName);
  
  // Allow UI to update after save
  await this.delay(100);
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

private cleanupGeneration(container: HTMLElement): void {
  container.classList.remove('printing-active');
  this.isGenerating = false;
  this.closeProgressModal();
  this.cdr.detectChanges();
}

closeProgressModal(): void {
  this.showProgressModal = false;
  this.isGenerating = false;
  this.cancelGeneration = false;
}

cancelBulkGeneration(): void {
  this.cancelGeneration = true;
  this.notificationService.showError("Cancelling generation... Please wait.");
}
}