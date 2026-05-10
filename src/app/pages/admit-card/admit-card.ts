import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../services/api-service';
import { SCHOOL_LOGO_BASE64 } from '../../services/constant';
import { NotificationService } from '../../services/notification';
import { baseApiUrl, STANDARDS } from '../../constants/constant';

@Component({
  selector: 'app-admit-card-hub',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './admit-card.html',
  styleUrls: ['./admit-card.css']
})
export class AdmitCardHubComponent implements OnInit {

  schoolLogo = SCHOOL_LOGO_BASE64;
    backendUrl = baseApiUrl; 

  // Selections
  examsList: any[] = []; 
  standards: string[] = STANDARDS.map(std => std.value);
  selectedExamId: number | null = null;
  selectedStandard: string = '';
  currentClassConfig: any = null;

  // State
  isLoading = false;
  hasSavedSchedule = false;

  // Data Arrays
  subjectsList: string[] = [];
  scheduleData: any[] = [];
  studentsList: any[] = [];
  selectedHolidays: string[] = [];
  
  // Quick Copy State
  scheduledStandards: string[] = [];
  copyFromStandard: string = '';

  // Official Syllabus Patterns for the checkboxes
  questionPatterns = [
    'MCQs', 'Long Answers', 'Short Answers', 'True/False', 
    'Fill in the Blanks', 'Matching', 'Map Work', 'Diagrams'
  ];

  aiForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef,
    private toastr: NotificationService
  ) {}

  ngOnInit(): void {
    this.initAiForm();
    this.loadExams();
  }

  initAiForm() {
    this.aiForm = this.fb.group({
      startDate: ['', Validators.required],
      startTime: ['09:30', Validators.required],
      endTime: ['12:30', Validators.required]
    });
  }

  // ==========================================
  // EXAM & DROPDOWN LOGIC
  // ==========================================
  
  loadExams() {
    this.apiService.getAllExams().subscribe({
      next: (res: any) => this.examsList = res.data || res,
      error: () => this.toastr.showError(`Could not load exams from the database.`)
    });
  }

  onExamChange() {
    if (!this.selectedExamId) return;

    // Fetch classes that already have schedules for the Quick Copy dropdown
    this.apiService.getScheduledStandards(this.selectedExamId).subscribe({
      next: (res: any) => {
        this.scheduledStandards = res.data || res;
      }
    });

    this.onSelectionChange();
  }

  onSelectionChange() {
    if (!this.selectedExamId || !this.selectedStandard) return;
    
    this.isLoading = true;
    this.hasSavedSchedule = false;
    this.scheduleData = [];
    this.copyFromStandard = ''; // Reset copy dropdown
    this.cdr.detectChanges();

    // 1. Fetch Students
    this.apiService.getStudentsByStandard(this.selectedStandard).subscribe({
      next: (res: any) => this.studentsList = res.data || res,
      error: () => this.studentsList = []
    });

    // 2. Fetch Subjects
    this.apiService.getSubjectsByClass(this.selectedStandard).subscribe({
      next: (res: any) => {
        const rawSubjects = res.data || res;
        if (Array.isArray(rawSubjects) && rawSubjects.length > 0) {
          this.subjectsList = typeof rawSubjects[0] === 'string' ? rawSubjects : rawSubjects.map(s => s.name || s.subjectName);
        } else {
          this.subjectsList = ['ENGLISH', 'HINDI', 'MATHEMATICS', 'SCIENCE', 'SOCIAL SCIENCE', 'COMPUTER'];
        }
        this.checkExistingSchedule();
      },
      error: () => {
        this.subjectsList = ['ENGLISH', 'HINDI', 'MATHEMATICS', 'SCIENCE', 'SOCIAL SCIENCE', 'COMPUTER'];
        this.checkExistingSchedule();
      }
    });

    // 3. Fetch Class-Wise Configuration
    this.apiService.getAdmitCardConfig(this.selectedStandard).subscribe({
      next: (res: any) => {
        this.currentClassConfig = res.data || res;
      }
    });
  }

  checkExistingSchedule() {
    this.apiService.getScheduleForAdmitCard(this.selectedExamId!, this.selectedStandard).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        if (data && data.length > 0) {
          this.scheduleData = data;
          this.hasSavedSchedule = true;
        } else {
          this.setupEmptyGrid();
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.setupEmptyGrid();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setupEmptyGrid() {
    this.scheduleData = this.subjectsList.map(sub => ({
      subjectName: sub,
      examDate: '',
      startTime: '',
      endTime: '',
      syllabusText: '',
      patterns: [] 
    }));
  }

  // ==========================================
  // SMART SCHEDULER & QUICK COPY LOGIC
  // ==========================================

  addHoliday(event: any) {
    const date = event.target.value;
    if (date && !this.selectedHolidays.includes(date)) {
      this.selectedHolidays.push(date);
    }
    event.target.value = ''; 
  }

  removeHoliday(dateToRemove: string) {
    this.selectedHolidays = this.selectedHolidays.filter(d => d !== dateToRemove);
  }

  autoFillSchedule() {
    if (this.aiForm.invalid) {
      this.toastr.showError(`Please fill Start Date and Shift Times.`); // Assuming showError is your universal alert
      return;
    }

    const { startDate, startTime, endTime } = this.aiForm.value;
    const holidayArray = this.selectedHolidays;

    const parts = startDate.split('-');
    let currentDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    const generatedSchedule = [];

    for (let i = 0; i < this.subjectsList.length; i++) {
      while (true) {
        const dayOfWeek = currentDate.getDay(); 
        const dateString = this.datePipe.transform(currentDate, 'yyyy-MM-dd')!;

        if (dayOfWeek !== 0 && !holidayArray.includes(dateString)) break;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      generatedSchedule.push({
        subjectName: this.subjectsList[i],
        examDate: this.datePipe.transform(currentDate, 'yyyy-MM-dd'),
        startTime: startTime,
        endTime: endTime,
        syllabusText: '',
        patterns: []
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.scheduleData = generatedSchedule;
  }

 // ==========================================
  // SMART SCHEDULER & QUICK COPY LOGIC
  // ==========================================

  copySchedule() {
    if (!this.copyFromStandard) {
      this.toastr.showError(`Please select a class to copy from.`);
      return;
    }

    this.apiService.getScheduleForAdmitCard(this.selectedExamId!, this.copyFromStandard).subscribe({
      next: (res: any) => {
        const copiedData = res.data || res;
        
        if (!copiedData || copiedData.length === 0) {
          this.toastr.showError(`No saved schedule found for Class ${this.copyFromStandard}.`);
          return;
        }

        // Loop through the subjects and map the data over
        for (let i = 0; i < this.scheduleData.length; i++) {
          if (copiedData[i]) {
            // 1. Copy the Dates and Times
            this.scheduleData[i].examDate = copiedData[i].examDate;
            this.scheduleData[i].startTime = copiedData[i].startTime;
            this.scheduleData[i].endTime = copiedData[i].endTime;
            
            // 2. Copy the Syllabus and Restore the Checkbox Ticks!
            const rawSyllabus = copiedData[i].syllabusText || '';
            
            // If it contains ' - ', it means it has both Text and Checkboxes
            if (rawSyllabus.includes(' - ')) {
              const parts = rawSyllabus.split(' - ');
              
              // Put the chapter text back in the input box
              this.scheduleData[i].syllabusText = parts[0]; 
              
              // Read the right side of the string and automatically tick the matching boxes
              const savedPatterns = parts[1];
              this.scheduleData[i].patterns = this.questionPatterns.filter(pat => savedPatterns.includes(pat));
              
            } else {
              // If it's just standard text with no boxes checked
              this.scheduleData[i].syllabusText = rawSyllabus;
              this.scheduleData[i].patterns = [];
            }
          }
        }

        this.toastr.showSuccess(`Copied dates, times, and syllabus from Class ${this.copyFromStandard}.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.showError(`Failed to fetch the schedule to copy.`);
      }
    });
  }

  // ==========================================
  // SYLLABUS CHECKBOXES & SAVING LOGIC
  // ==========================================

  togglePattern(row: any, pattern: string) {
    if (!row.patterns) row.patterns = [];
    const index = row.patterns.indexOf(pattern);
    if (index > -1) row.patterns.splice(index, 1);
    else row.patterns.push(pattern);
  }

  saveSchedule() {
    const invalid = this.scheduleData.some(row => !row.examDate || !row.startTime);
    if (invalid) {
      this.toastr.showError(`Please ensure all subjects have an Exam Date and Time before saving.`);
      return;
    }

    this.isLoading = true;

    const payloadToSave = this.scheduleData.map(row => {
      const patternString = row.patterns && row.patterns.length > 0 ? row.patterns.join(', ') : '';
      const combinedSyllabus = [row.syllabusText, patternString].filter(Boolean).join(' - ');
      
      return {
        ...row,
        syllabusText: combinedSyllabus 
      };
    });
    
    this.apiService.saveApprovedSchedule(this.selectedExamId!, this.selectedStandard, payloadToSave).subscribe({
      next: () => {
        this.hasSavedSchedule = true;
        this.isLoading = false;

        // Dynamically add to Quick Copy list
        if (!this.scheduledStandards.includes(this.selectedStandard)) {
          this.scheduledStandards.push(this.selectedStandard);
        }

        this.toastr.showSuccess(`Schedule Saved Successfully! You can now print Admit Cards.`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.showError(`Error saving schedule.`);
        this.isLoading = false;
      }
    });
  }

 // =======================================================================
  // BULK PRINTING LOGIC (PERFECT VERTICAL BALANCE & SPACING)
  // =======================================================================
  
  printAdmitCards() {
    if (this.studentsList.length === 0) {
      this.toastr.showError(`No students found in this class.`);
      return;
    }

    const printWindow = window.open('', '_blank', 'top=0,left=0,height=1000,width=800');
    if (!printWindow) {
      this.toastr.showError(`Popup blocked. Please allow popups for this site.`);
      return;
    }

    const examName = this.examsList.find(e => e.id === Number(this.selectedExamId))?.name || 'Examination';
    const academicYear = this.examsList.find(e => e.id === Number(this.selectedExamId))?.academicYear || '2025-26';
    const config = this.currentClassConfig;
    
    // --- DYNAMIC COMPACT MODE LOGIC ---
    const isJuniorClass = ['PG', 'LKG', 'UKG'].includes(this.selectedStandard);
    const cardsPerPage = isJuniorClass ? 2 : 1;
    const sizeClass = isJuniorClass ? 'half-page-card' : 'full-page-card';
    
    const instructionsHtml = config?.instructions
      ? config.instructions.split('\n').map((line: string) => `<li>${line}</li>`).join('')
      : '<li>Candidate must check all particulars carefully.</li><li>Keep this Admit Card safely and bring it to the exam daily.</li>';

    let timetableHtml = '';
    let syllabusHtml = '';

    this.scheduleData.forEach(row => {
      const parts = row.examDate.split('-');
      // Force it to local time at 12:00 Noon: new Date(year, monthIndex, day, hours, minutes)
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const formattedDate = this.datePipe.transform(dateObj, 'dd-MM-yyyy');
      timetableHtml += `
        <tr>
          <td style="text-align: left; font-weight: bold;">${row.subjectName.toUpperCase()}</td>
          <td>${formattedDate}</td>
          <td>${dayName}</td>
          <td>${row.startTime} - ${row.endTime}</td>
          <td></td>
          <td></td>
        </tr>
      `;

      const patternStr = row.patterns && row.patterns.length > 0 ? row.patterns.join(', ') : '';
      const finalSyllabus = row.syllabusText && row.syllabusText.includes('-') 
                            ? row.syllabusText 
                            : [row.syllabusText, patternStr].filter(Boolean).join(' - ') || 'As per CBSE syllabus';

      syllabusHtml += `
        <tr>
          <td style="width: 25%; font-weight: bold; text-align: left;">${row.subjectName.toUpperCase()}</td>
          <td style="width: 75%; text-align: left;">${finalSyllabus}</td>
        </tr>
      `;
    });


    let allCardsHtml = '';
    this.studentsList.forEach((student, index) => {
        
      const isNewPage = index > 0 && (index % cardsPerPage === 0);
      const pageBreakClass = isNewPage ? 'page-break' : '';
      const showCutLine = isJuniorClass && (index % 2 === 0) && (index < this.studentsList.length - 1);

      let photoBoxHtml = '';
      if (config?.showPhotoBox !== false) {
        const photoFileName = student.photoUrl || student.photo || student.image;
        if (photoFileName) {
          const imgUrl = photoFileName.startsWith('http') ? photoFileName : `${this.backendUrl}api/students/photos/${photoFileName}`;
          photoBoxHtml = `
            <div class="photo-box" style="padding: 0; overflow: hidden;">
              <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Student Photo">
            </div>`;
        } else {
          photoBoxHtml = `<div class="photo-box"><div class="photo-placeholder">PASTE PHOTO</div></div>`;
        }
      }

      allCardsHtml += `
        <div class="admit-card-wrapper ${sizeClass} ${pageBreakClass}">
          <div class="admit-card-border">
            
            <div class="header-section">
              <div class="header-top">
                <img src="${this.schoolLogo}" class="school-logo" alt="Logo">
                <div class="school-details">
                  <h1>S.B. PUBLIC SCHOOL</h1>
                  <h4>CBSE Pattern</h4>
                  <p>Bhawanipur, Jairampur, Jaunpur<br>9648796060, 9140217658</p>
                </div>
              </div>
              <div class="header-meta">
                <div>SESSION : ${academicYear}</div>
                <div>CLASS & SECTION : ${this.selectedStandard}</div>
                <div>EXAMINATION : ${examName.toUpperCase()}</div>
              </div>
            </div>

            <div class="title-section">
              <h3>${config?.cardTitle || 'ADMIT CARD FOR REGULAR CANDIDATES'}</h3>
            </div>

            <div class="student-info-section">
              <table class="student-details-table">
                <tr><td class="lbl">CLASS ROLL NO</td><td class="col">:</td><td class="val">${student.rollNumber || '___'}</td></tr>
                <tr><td class="lbl">CANDIDATE NAME</td><td class="col">:</td><td class="val bold-name">${student.name.toUpperCase()}</td></tr>
                <tr><td class="lbl">ADMISSION NO</td><td class="col">:</td><td class="val">${student.srNumber || '___'}</td></tr>
                <tr><td class="lbl">DATE OF BIRTH</td><td class="col">:</td><td class="val">${this.datePipe.transform(student.dob, 'dd-MM-yyyy')}</td></tr>
                <tr><td class="lbl">FATHER NAME</td><td class="col">:</td><td class="val">${student.fathersName || '_________________'}</td></tr>
                <tr><td class="lbl">MOTHER NAME</td><td class="col">:</td><td class="val">${student.mothersName || student.mother || '_________________'}</td></tr>
              </table>
              ${photoBoxHtml}
            </div>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="text-align: left; width: 22%;">SUBJECT NAME</th>
                    <th style="width: 14%;">DATE</th>
                    <th style="width: 10%;">DAY</th>
                    <th style="width: 14%;">TIME</th>
                    <th style="width: 20%;">STUDENT'S SIGN</th>
                    <th style="width: 20%;">INVIGILATOR'S SIGN</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetableHtml}
                </tbody>
              </table>

              <div class="syllabus-wrapper">
                <div style="background: #e5e5e5; border: 1.5px solid #000; padding: 5px; text-align: center; font-weight: bold; font-size: 12px;">
                  SYLLABUS & PAPER PATTERN
                </div>
                <table class="data-table syllabus-table">
                  <tbody>
                    ${syllabusHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="instructions-section">
              <ol>
                ${instructionsHtml}
              </ol>
            </div>
            
            <div class="bottom-signatures">
                <div class="sig-line">${config?.leftSignLabel || 'Class Teacher'}</div>
                <div class="sig-line">${config?.rightSignLabel || 'Principal'}</div>
            </div>

          </div>
        </div>
        
        ${showCutLine ? '<div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - Cut Here - - - - - - - - - - - - - - - - - - - ✂</div>' : ''}
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Admit Cards</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
            
            .admit-card-wrapper { width: 100%; padding: 5mm 8mm; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
            .full-page-card { height: 285mm; }
            .half-page-card { height: 140mm; }
            .page-break { page-break-before: always; }
            .cut-line { text-align: center; font-size: 12px; color: #555; margin: 0; padding: 2px 0; font-family: monospace; letter-spacing: 1px;}
            
            .admit-card-border { border: 2px solid #000; height: 100%; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
            
            /* THESE SECTIONS WILL NEVER SHRINK OR HIDE */
            .header-section, .title-section, .student-info-section, .instructions-section, .bottom-signatures { flex-shrink: 0; }
            
            .header-section { border-bottom: 2px solid #000; }
            .header-top { display: flex; align-items: center; padding: 4px 12px; }
            .school-logo { width: 65px; height: auto; margin-right: 15px; }
            .school-details { text-align: center; flex: 1; margin-right: 80px; }
            .school-details h1 { margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 1px; }
            .school-details h4 { margin: 2px 0; font-size: 13px; }
            .school-details p { margin: 0; font-size: 11px; }
            .header-meta { display: flex; justify-content: space-between; border-top: 2px solid #000; padding: 4px 15px; font-size: 11px; font-weight: bold; }
            
            .title-section { text-align: center; padding: 6px 0; }
            .title-section h3 { margin: 0; font-size: 14px; text-decoration: underline; text-transform: uppercase; }
            
            .student-info-section { display: flex; justify-content: space-between; padding: 0 15px 5px 15px; }
            .student-details-table { border-collapse: collapse; font-size: 11px; font-weight: bold; }
            .student-details-table td { padding: 2px 0; }
            .student-details-table .lbl { width: 140px; }
            .student-details-table .col { width: 15px; text-align: center; }
            .student-details-table .val { font-weight: normal; font-size: 12px; text-transform: uppercase; }
            .student-details-table .bold-name { font-weight: bold; font-size: 13px; }
            .photo-box { width: 75px; height: 95px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; font-weight: bold; text-align: center; background-color: #f8f9fa; }
            
            /* TABLES: Grow to fill space */
            .table-container { padding: 0 10px; flex-grow: 1; display: flex; flex-direction: column; }
            
            /* SYLLABUS WRAPPER: Pushes down to create a balanced gap */
            .syllabus-wrapper { margin-top: 15px; padding-top: 10px; }
            
            /* INCREASED PADDING FOR BETTER HEIGHT ABSORPTION */
            .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 0; }
            .data-table th, .data-table td { border: 1.5px solid #000; padding: 7px 5px; text-align: center; }
            .data-table th { background-color: #e5e5e5; font-weight: bold; padding: 6px; }
            .syllabus-table th, .syllabus-table td { border-top: none; } 
            .syllabus-table td { padding: 6px 8px; font-size: 11px; }
            
            .instructions-section { padding: 8px 15px; font-size: 11px; font-style: italic; }
            .instructions-section ol { padding-left: 20px; margin: 2px 0 0 0; }
            .instructions-section li { margin-bottom: 2px; }
            
            /* SIGNATURES: Pushes down alongside syllabus */
            .bottom-signatures { display: flex; justify-content: space-between; padding: 5px 40px 10px 40px; margin-top: auto; }
            .sig-line { border-top: 1.5px solid #000; padding-top: 4px; font-size: 11px; font-weight: bold; width: 160px; text-align: center; margin-top: 30px;}
          </style>
        </head>
        <body>
          ${allCardsHtml}
          
          <script>
            window.onload = function() {
              Promise.all(Array.from(document.images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                  img.addEventListener('load', resolve);
                  img.addEventListener('error', resolve); 
                });
              })).then(() => {
                setTimeout(function() { 
                  window.print(); 
                  window.close(); 
                }, 300);
              });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}