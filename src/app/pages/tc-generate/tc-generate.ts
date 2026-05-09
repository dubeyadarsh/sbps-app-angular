import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms'; // Added FormsModule here
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../services/api-service';
import { SCHOOL_LOGO_BASE64 } from '../../services/constant';

@Component({
  selector: 'app-tc-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule], // Added FormsModule here
  providers: [DatePipe],
  templateUrl: './tc-generate.html',
  styleUrls: ['./tc-generate.css']
})
export class TcGeneratorComponent implements OnInit {
  
  // Selection State
  standards: string[] = ['PG', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  selectedStandard: string = '';
  studentsList: any[] = [];
  selectedStudentId: string = '';
schoolLogo: string = SCHOOL_LOGO_BASE64;
  // Data State
  studentData: any = null;
  tcData: any = null;
  subjectsList: string = 'Loading subjects...'; 
  dobInWords: string = ''; 
  
  // Form & View State
  tcForm!: FormGroup;
  isLoadingStudents = false;
  isLoadingData = false;
  isSaving = false;
  showPreview = false;
  
  promotedClassOptions: string[] = [
    'Not Promoted', 'First (I)', 'Second (II)', 'Third (III)', 'Fourth (IV)', 
    'Fifth (V)', 'Sixth (VI)', 'Seventh (VII)', 'Eighth (VIII)', 'Ninth (IX)', 
    'Tenth (X)', 'Eleventh (XI)', 'Twelfth (XII)', 'Higher Education'
  ];
  
  leavingReasons: string[] = [
    'Parents Request', 'Father Transferred', 'Course Completed', 'Relocating to another city', 'Other'
  ];

  constructor(
    private fb: FormBuilder, 
    private apiService: ApiService,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initTcForm();
  }

  initTcForm() {
    const today = this.datePipe.transform(new Date(), 'yyyy-MM-dd');
    
    this.tcForm = this.fb.group({
      aadharNumber: [''], // NEW
      penNumber: [''],    // NEW
      nationality: ['Indian', Validators.required],
      category: ['General', Validators.required],
      dateOfAdmission: ['', Validators.required],
      promotedToClass: ['', Validators.required], 
      duesPaidMonth: ['', Validators.required],
      workingDays: ['', [Validators.required, Validators.min(0)]],
      daysPresent: ['', [Validators.required, Validators.min(0)]],
      conduct: ['Good', Validators.required],
      reasonForLeaving: ['Parents Request', Validators.required],
      remarks: ['N/A'],
      dateOfApplication: [today, Validators.required],
      dateStruckOff: [today, Validators.required],
      issueDate: [today, Validators.required]
    });
  }

  onStandardChange(standardValue: string) {
    if (!standardValue) return;
    this.selectedStandard = standardValue;
    
    // Reset student selection when class changes
    this.selectedStudentId = '';
    this.studentData = null; 
    
    this.isLoadingStudents = true;
    this.studentsList = [];
    this.cdr.detectChanges();

    this.apiService.getStudentsByStandard(standardValue).subscribe({
      next: (res) => {
        const fetchedData = res.data || res;
        this.studentsList = [...(Array.isArray(fetchedData) ? fetchedData : [])];
        this.isLoadingStudents = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => { 
        this.isLoadingStudents = false; 
        this.cdr.detectChanges(); 
      }
    });

    this.apiService.getSubjectsByClass(standardValue).subscribe({
      next: (res) => {
        const subjects = res.data || res; 
        this.subjectsList = Array.isArray(subjects) ? subjects.join(', ') : 'ENGLISH, HINDI, MATHS, SCIENCE, SOCIAL SCIENCE';
        this.cdr.detectChanges();
      },
      error: (err) => { 
        this.subjectsList = 'ENGLISH, HINDI, MATHS, SCIENCE, SOCIAL SCIENCE, COMPUTER'; 
        this.cdr.detectChanges();
      }
    });
  }

  onStudentChange(studentIdValue: string) {
    if (!studentIdValue) return;
    this.selectedStudentId = studentIdValue;
    this.loadStudentAndTcData(Number(studentIdValue));
  }

  loadStudentAndTcData(studentId: number) {
    this.isLoadingData = true;
    this.showPreview = false;
    this.studentData = null;
    this.cdr.detectChanges(); // Force UI to show loading spinner

    this.apiService.getStudentById(studentId).subscribe({
      next: (studentRes) => {
        this.studentData = studentRes.data || studentRes; 
        if (this.studentData.dob) {
          this.dobInWords = this.convertDateToWords(this.studentData.dob);
        }
        this.checkExistingTc(studentId);
      },
      error: (err) => {
        this.isLoadingData = false;
        this.cdr.detectChanges();
        alert("Error loading student details.");
      }
    });
  }

  checkExistingTc(studentId: number) {
    this.apiService.getTcByStudentId(studentId).subscribe({
      next: (tcRes) => {
        this.isLoadingData = false; 
        if (tcRes && (tcRes.id || tcRes.data)) {
          const actualTcData = tcRes.data || tcRes;
          this.tcData = actualTcData;
          this.tcForm.patchValue({
            ...actualTcData,
            dateOfAdmission: this.datePipe.transform(actualTcData.dateOfAdmission, 'yyyy-MM-dd'),
            dateOfApplication: this.datePipe.transform(actualTcData.dateOfApplication || new Date(), 'yyyy-MM-dd'),
            dateStruckOff: this.datePipe.transform(actualTcData.dateStruckOff || new Date(), 'yyyy-MM-dd'),
            issueDate: this.datePipe.transform(actualTcData.issueDate || new Date(), 'yyyy-MM-dd')
          });
        } else {
          this.tcData = null;
          this.initTcForm(); 
        }
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.isLoadingData = false;
        this.initTcForm(); 
        this.cdr.detectChanges();
      }
    });
  }

 generatePreview() {
    // 1. SMART VALIDATION CHECK
    if (this.tcForm.invalid) {
      this.tcForm.markAllAsTouched();
      
      // Find exactly which fields are missing/invalid
      const invalidFields = [];
      for (const name in this.tcForm.controls) {
        if (this.tcForm.controls[name].invalid) {
          invalidFields.push(name);
        }
      }
      
      console.error("Form Validation Failed! Missing fields:", invalidFields);
      alert("Cannot generate TC! Please fill the following required fields:\n\n" + invalidFields.join(", "));
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();
    
    // 2. CONSTRUCT PAYLOAD
    const payload: any = {
      student: { id: this.studentData.id },
      ...this.tcForm.value
    };

    // 3. UPSERT LOGIC
    if (this.tcData && this.tcData.id) {
      payload.id = this.tcData.id;
    }

    // 4. API CALL
    this.apiService.saveTcData(payload).subscribe({
      next: (res) => {
        this.tcData = res.data || res;
        this.isSaving = false;
        this.showPreview = true;
        this.cdr.detectChanges(); // Guarantees view updates to the print preview
      },
      error: (err) => { 
        console.error("API Save Error:", err);
        this.isSaving = false; 
        this.cdr.detectChanges(); 
        alert("Failed to save TC. Check your backend console for details.");
      }
    });
  }

  editForm() { 
    this.showPreview = false; 
    this.cdr.detectChanges(); 
  }
  
printDocument() {
    const printElement = document.getElementById('printable-certificate');
    if (!printElement) {
      alert("Error: Could not find certificate to print.");
      return;
    }
    
    const printContents = printElement.innerHTML;
    const printWindow = window.open('', '_blank', 'top=0,left=0,height=1000,width=800');
    if (!printWindow) {
      alert("Error: Popup blocked. Please allow popups to print.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Transfer Certificate</title>
          <style>
            /* STRICT A4 COMPRESSION RULES */
            @page { size: A4 portrait; margin: 0; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 0; 
              padding: 18mm 18mm; /* Reduced top margin to pull content up */
              background: white; 
              color: black;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            
            /* Header */
            .tc-official-header { margin-bottom: 8px; } 
            .header-grid { display: grid; grid-template-columns: 100px 1fr 100px; align-items: center; margin-bottom: 6px; }
            .header-logo-left, .header-logo-right { display: flex; justify-content: center; align-items: center; }
            .official-logo { width: 85px; height: auto; object-fit: contain; }
            .header-center-content { display: flex; flex-direction: column; align-items: center; text-align: center; }
            .school-name { font-size: 28px; font-weight: 700; margin: 0 0 2px 0; letter-spacing: 1px; text-transform: uppercase; }
            .school-subtitle { font-size: 11px; font-weight: 700; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .school-address { font-size: 13px; font-style: italic; margin: 0 0 4px 0; }
            .school-meta-line { display: flex; justify-content: center; gap: 24px; font-size: 12px; margin-top: 2px; }
            .header-divider { border-top: 3px solid #000; border-bottom: 1px solid #000; height: 2px; margin: 0 auto; width: 100%; }

            /* Title */
            .tc-title-bar { margin: 12px 0; text-align: center; } 
            .tc-title-bar h2 { display: inline-block; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1.5px; border: 1.5px solid #000; padding: 4px 25px; border-radius: 4px; background-color: #e5e5e5 !important; }

            /* ID Bars */
            .tc-meta-bar, .tc-id-bar { display: flex; justify-content: space-between; padding: 4px 15px; font-size: 13px; }
            .tc-id-bar { border-top: 1px solid #000; margin-bottom: 8px; }

            /* 24-Point Body Grid - COMPACTED FOR ONE PAGE */
            .tc-body-grid { padding: 5px 5px; font-size: 14px; } /* Slightly smaller font */
            .t-row { display: grid; grid-template-columns: 25px 380px 15px 1fr; margin-bottom: 6.5px; align-items: start; } /* Halved the row margin */
            .multi-line { margin-bottom: 8px; }
            .t-num { text-align: right; padding-right: 5px; }
            .t-lbl { padding-right: 10px; }
            .t-col { text-align: center; }
            .t-val { font-weight: 500; }
            .t-val.bold { font-weight: bold; font-size: 15px; }
            
            .flex-between { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
            .sub-text { padding-left: 15px; white-space: nowrap; }

            /* Footer - TIGHTENED */
            .tc-footer { margin-top: 15px; padding: 0 10px; } /* Pulled up from 60px */
            .declaration { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 35px; padding: 0 15px; line-height: 1.3; } /* Pulled up from 50px */
            .signature-row { display: flex; justify-content: space-between; align-items: flex-end; }
            .date-box { font-size: 14px; }
            .sig-box { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }
  // ==========================================
  // HELPER: Convert Date to Words
  // ==========================================
  convertDateToWords(dateString: string): string {
    if (!dateString) return '';
    
    // FIX: Split the string manually to completely bypass Javascript timezone shifting bugs
    const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const parts = cleanDate.split('-');
    
    // Fallback if the date format is unexpected
    if (parts.length !== 3) return dateString; 

    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1; // Array is 0-indexed
    const day = parseInt(parts[2], 10);

    const days = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Twenty-Third', 'Twenty-Fourth', 'Twenty-Fifth', 'Twenty-Sixth', 'Twenty-Seventh', 'Twenty-Eighth', 'Twenty-Ninth', 'Thirtieth', 'Thirty-First'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    let yearWords = year.toString();
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (year >= 2000 && year < 2100) {
        const remainder = year - 2000;
        let remStr = '';
        if (remainder < 20) remStr = ones[remainder];
        else remStr = tens[Math.floor(remainder / 10)] + (remainder % 10 !== 0 ? ' ' + ones[remainder % 10] : '');
        yearWords = `Two Thousand ${remStr}`.trim();
    }
    
    return `${days[day]} - ${months[monthIndex]} - ${yearWords}`;
  }
  resetTcForm() {
    const today = this.datePipe.transform(new Date(), 'yyyy-MM-dd');
    this.tcForm.reset({
      aadharNumber: '', // NEW
      penNumber: '',    // NEW
      nationality: 'Indian',
      category: 'General',
      conduct: 'Good',
      reasonForLeaving: 'Parents Request',
      remarks: 'N/A',
      dateOfApplication: today,
      dateStruckOff: today,
      issueDate: today
    });
  }
}