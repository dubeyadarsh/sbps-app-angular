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
  pageSize: number = 32; 
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
// BULK ID GENERATION — Pure jsPDF, no html2canvas
// Card styled to exactly match single ID card (270×430px → 54×86mm, 1px = 0.2mm)
// ==========================================
isGenerating: boolean = false;

async generateBulkIDs(): Promise<void> {
  if (!this.allStudents?.length) {
    this.notificationService.showError('No students found.');
    return;
  }

  this.isGenerating = true;
  this.cdr.detectChanges();
  this.notificationService.showSuccess('Preparing ID cards…');

  try {
    const imageMap = await this.preloadStudentImages();

    const pdf     = new jsPDF('l', 'mm', 'a4');
    const cols    = 4, rows = 2;
    const cardW   = 54, cardH = 86;
    const gapX    = 5,  gapY  = 6;
    const totalW  = cols * cardW + (cols - 1) * gapX;  // 231 mm
    const totalH  = rows * cardH + (rows - 1) * gapY;  // 178 mm
    const startX  = (297 - totalW) / 2;                 //  33 mm
    const startY  = (210 - totalH) / 2;                 //  16 mm
    const perPage = cols * rows;                         //   8 cards

    for (let i = 0; i < this.allStudents.length; i++) {
      const pos = i % perPage;
      if (i > 0 && pos === 0) pdf.addPage();

      const col = pos % cols;
      const row = Math.floor(pos / cols);
      const x   = startX + col * (cardW + gapX);
      const y   = startY + row * (cardH + gapY);

      this.drawIdCard(pdf, this.allStudents[i], x, y, cardW, cardH,
                      imageMap.get(this.allStudents[i].id) ?? null);
    }

    pdf.save(`ID_Cards_Grade_${this.selectedGrade}_${this.academicYear}.pdf`);
    this.notificationService.showSuccess(`✅ ${this.allStudents.length} ID cards generated!`);
  } catch (err) {
    console.error(err);
    this.notificationService.showError('Failed to generate ID cards.');
  } finally {
    this.isGenerating = false;
    this.cdr.detectChanges();
  }
}

// ── Parallel image prefetch (5 at a time, with browser cache) ──────────────
private async preloadStudentImages(): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();

  const load = async (s: Student): Promise<void> => {
    if (!s.photoUrl) { map.set(s.id, null); return; }
    try {
      const res  = await fetch(`${baseApiUrl}api/students/photos/${s.photoUrl}`,
                               { mode: 'cors', cache: 'force-cache' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const b64  = await new Promise<string>((ok, fail) => {
        const r = new FileReader();
        r.onloadend = () => ok(r.result as string);
        r.onerror   = fail;
        r.readAsDataURL(blob);
      });
      map.set(s.id, b64);
    } catch { map.set(s.id, null); }
  };

  for (let i = 0; i < this.allStudents.length; i += 5)
    await Promise.all(this.allStudents.slice(i, i + 5).map(load));

  return map;
}

// ── Draw one card — pixel-matched to .id-card-wrapper CSS (1px = 0.2mm) ───
private drawIdCard(
  pdf: jsPDF, s: Student,
  x: number, y: number, w: number, h: number,
  imgData: string | null
): void {

  // ── Card base: white fill + light border (#e2e8f0) ──────────────────────
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, w, h, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.25);
  pdf.rect(x, y, w, h, 'S');

  // ════════════════════════════════════════════════════════════════════════
  // HEADER  — bg #000080 (Navy Blue), height increased to 15mm
  // ════════════════════════════════════════════════════════════════════════
  pdf.setFillColor(0, 0, 128);   // Updated to --primary-color: #000080
  const headerHeight = 15;
  pdf.rect(x, y, w, headerHeight, 'F');

  // School name: White, bold
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('S.B. PUBLIC SCHOOL', x + w / 2, y + 6, { align: 'center' });

  // Subtitle/Year: Moved slightly up to y+10 to clear the photo frame
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(210, 210, 255); 
  pdf.text(`Identity Card | ${this.academicYear}`, x + w / 2, y + 10, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════
  // PHOTO ROW — Shifted down to y + 12 to avoid hiding the "Year" text
  // ════════════════════════════════════════════════════════════════════════
  const photoW = 17, photoH = 19;
  const photoX = x + (w - photoW) / 2;
  const photoY = y + 12; // Lowered from 10 to 12 to prevent overlap

  // Photo Frame Shadow
  pdf.setFillColor(200, 200, 200);
  pdf.rect(photoX + 0.4, photoY + 0.4, photoW + 0.8, photoH + 0.8, 'F');

  // White border
  pdf.setFillColor(255, 255, 255);
  pdf.rect(photoX - 0.6, photoY - 0.6, photoW + 1.2, photoH + 1.2, 'F');

  // Photo image
  if (imgData) {
    try {
      const fmt = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(imgData, fmt, photoX, photoY, photoW, photoH);
    } catch { this.drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH); }
  } else {
    this.drawPhotoPlaceholder(pdf, photoX, photoY, photoW, photoH);
  }

  // SIDE LABELS (Session & SR No) - Adjusted Y to match new photo position
  const sideLabelY = photoY + 6;
  pdf.setFontSize(4.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38); // Red labels
  pdf.text('SESSION', x + 3, sideLabelY);
  pdf.text('S.R. No.', x + w - 3, sideLabelY, { align: 'right' });

  pdf.setFontSize(5.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text(this.academicYear, x + 3, sideLabelY + 4);
  pdf.text(s.srNumber || '-', x + w - 3, sideLabelY + 4, { align: 'right' });

  // ════════════════════════════════════════════════════════════════════════
  // STUDENT NAME — Shifted down slightly
  // ════════════════════════════════════════════════════════════════════════
  const nameY = photoY + photoH + 5; 
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 128); // Match navy primary
  pdf.text((s.name || '').toUpperCase(), x + w / 2, nameY, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════
  // GRADE PILL
  // ════════════════════════════════════════════════════════════════════════
  const gradeStr = `Grade: ${s.standard}`;
  pdf.setFontSize(7);
  const pillW = pdf.getTextWidth(gradeStr) + 5;
  const pillH = 4.5;
  const gradeY = nameY + 5.5;
  const pillX = x + (w - pillW) / 2;

  pdf.setFillColor(240, 240, 255);
  pdf.roundedRect(pillX, gradeY - 3.2, pillW, pillH, 1, 1, 'F');
  pdf.setTextColor(0, 0, 128);
  pdf.text(gradeStr, x + w / 2, gradeY, { align: 'center' });

  // ════════════════════════════════════════════════════════════════════════
  // DETAILS GRID — Added Mother's Name to fill vertical space
  // ════════════════════════════════════════════════════════════════════════
  const divY = gradeY + 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineDashPattern([0.5, 0.5], 0);
  pdf.line(x + 5, divY, x + w - 5, divY);
  pdf.setLineDashPattern([], 0);

  let detY = divY + 4;
  const rowGap = 3.8; // Tightened gap slightly to fit 4 rows

  // Added Mother's Name to utilize the space effectively
  const details = [
    { label: 'Father:', value: s.fathersName || '-' },
    { label: 'Mother:', value: s.mothersName || '-' },
    { label: 'D.O.B:',  value: this.formatDate(s.dob) },
    { label: 'Phone:',  value: s.phoneNumber || '-' },
  ];

  pdf.setFontSize(6);
  for (const d of details) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(d.label, x + 4, detY);

    pdf.setTextColor(30, 41, 59);
    pdf.text(this.truncate(d.value, 22), x + w - 4, detY, { align: 'right' });
    detY += rowGap;
  }

  // ════════════════════════════════════════════════════════════════════════
  // FOOTER — Address and Signature
  // ════════════════════════════════════════════════════════════════════════
  const footerY = y + h - 15;
  pdf.setFillColor(250, 250, 252);
  pdf.rect(x + 0.5, footerY, w - 1, 14.5, 'F');

  // Address
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  const addrLines = pdf.splitTextToSize(`Add: ${s.address || 'N/A'}`, w - 8);
  pdf.text(addrLines.slice(0, 2), x + w / 2, footerY + 3.5, { align: 'center', lineHeightFactor: 1.1 });

  // Signature
  const sigY = y + h - 4.5;
  pdf.setDrawColor(0, 0, 128);
  pdf.setLineWidth(0.2);
  pdf.line(x + w / 2 - 10, sigY, x + w / 2 + 10, sigY);
  
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PRINCIPAL SIGNATURE', x + w / 2, sigY + 2.5, { align: 'center' });
}

// ── Grey placeholder when no photo ─────────────────────────────────────────
private drawPhotoPlaceholder(
  pdf: jsPDF, x: number, y: number, w: number, h: number
): void {
  pdf.setFillColor(241, 245, 249);  // #f1f5f9
  pdf.rect(x, y, w, h, 'F');
  pdf.setFontSize(4);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);  // #94a3b8
  pdf.text('No Photo', x + w / 2, y + h / 2 + 0.8, { align: 'center' });
}

// ── Helpers ────────────────────────────────────────────────────────────────
private formatDate(raw: string): string {
  if (!raw) return '-';
  try {
    const d = new Date(raw);
    return [String(d.getDate()).padStart(2,'0'),
            String(d.getMonth()+1).padStart(2,'0'),
            d.getFullYear()].join('-');
  } catch { return raw; }
}

private truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.substring(0, max - 1) + '…' : text;
}

}