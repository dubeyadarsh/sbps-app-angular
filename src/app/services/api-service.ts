import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student } from '../pages/student/student';
import { baseApiUrl } from '../constants/constant';
// Matches the Spring Boot ApiResponse class
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  // Point this to your Spring Boot backend URL
  private apiUrl = baseApiUrl;

  constructor(private http: HttpClient) {}

  // ==========================================
  // STUDENT ENDPOINTS
  // ==========================================

  addStudent(student: Partial<Student>): Observable<ApiResponse<Student>> {
    return this.http.post<ApiResponse<Student>>(`${this.apiUrl}api/students`, student);
  }

  updateStudent(id: string, student: Partial<Student>): Observable<ApiResponse<Student>> {
    return this.http.put<ApiResponse<Student>>(`${this.apiUrl}api/students/${id}`, student);
  }

  deleteStudent(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}api/students/${id}`);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}api/students/bulk-upload/template`, { responseType: 'blob' });
  }

  uploadBulk(file: File, standard: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('standard', standard); 
    return this.http.post(`${this.apiUrl}api/students/bulk-upload`, formData);
  }

  getStudentsByGrade(grade: string, searchKeyword: string = '', page: number = 0, size: number = 5): Observable<any> {
    let url = `${this.apiUrl}api/students?standard=${grade}&page=${page}&size=${size}`;
    if (searchKeyword) {
      url += `&search=${encodeURIComponent(searchKeyword)}`; 
    }
    return this.http.get(url);
  }

  searchStudents(searchQuery: string): Observable<any> {
    const params = new HttpParams()
      .set('search', searchQuery)
      .set('size', '5'); 
    return this.http.get(`${this.apiUrl}api/students`, { params });
  }

  // Add this method to ApiService



  // Returns enriched dues (feeTypeName, isRecurring) for checkout panel
  getPendingDues(studentId: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/pending/${studentId}`);
  }

  // Only optional + unassigned facilities for this student
  getAvailableFacilities(studentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/available-facilities/${studentId}`);
  }

  processPayment(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}api/fees/pay`, payload);
  }

  getReportStats(grade: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/stats`, {
      params: new HttpParams().set('grade', grade)
    });
  }

  getReceiptDetails(receiptId: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/receipt/${receiptId}`);
  }

  assignOptionalFacility(studentId: number, feeTypeId: number): Observable<any> {
    const params = new HttpParams()
      .set('studentId', studentId.toString())
      .set('feeTypeId', feeTypeId.toString());
    return this.http.post<any>(`${this.apiUrl}api/fees/assign-facility`, null, { params });
  }

  getFeeTypes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/config/types`);
  }

  getClassFeeRules(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/config/rules`);
  }

  saveClassFeeRule(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}api/fees/config/rules`, payload);
  }

  deleteClassFeeRule(ruleId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}api/fees/config/rules/${ruleId}`);
  }

  // Add these methods to your existing ApiService class

// ================================================
// SUBJECTS
// ================================================
getSubjects(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/marksheet/subjects`);
}

createSubject(payload: { name: string; code: string }): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}api/marksheet/subjects`, payload);
}

updateSubject(id: number, payload: { name: string; code: string }): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}api/marksheet/subjects/${id}`, payload);
}

deleteSubject(id: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}api/marksheet/subjects/${id}`);
}

// ================================================
// GRADE CONFIG
// ================================================
getGradeConfig(standard: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/marksheet/config/grade/${standard}`);
}

saveGradeConfig(payload: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}api/marksheet/config/grade`, payload);
}

updateGradeConfig(id: number, payload: any): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}api/marksheet/config/grade/${id}`, payload);
}

deleteGradeConfig(id: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}api/marksheet/config/grade/${id}`);
}

// ================================================
// EXAMS
// ================================================
getExams(standard: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/marksheet/config/exams/${standard}`);
}

createExam(payload: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}api/marksheet/config/exams`, payload);
}

deleteExam(id: number): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}api/marksheet/config/exams/${id}`);
}

// ================================================
// MARKS ENTRY
// ================================================
getMarksGrid(examId: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/marksheet/marks/grid/${examId}`);
}

saveMarks(payload: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}api/marksheet/marks/save`, payload);
}

// ================================================
// MARKSHEET VIEW
// ================================================
getMarksheet(examId: number, studentId: number): Observable<any> {
  const params = new HttpParams()
    .set('examId', examId.toString())
    .set('studentId', studentId.toString());
  return this.http.get<any>(`${this.apiUrl}api/marksheet/marks/marksheet`, { params });
}
uploadStudentPhoto(studentId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type header manually here; Angular does it automatically for FormData
    return this.http.post(`${this.apiUrl}api/students/photos/${studentId}`, formData);
  }
  getDashboardSummary() {
    return this.http.get<any>(`${this.apiUrl}api/dashboard/summary`);
  }
  getUpcomingEvents() {
    return this.http.get<any[]>(`${this.apiUrl}api/events/upcoming`);
  }

  addEvent(eventData: any) {
    return this.http.post<any>(`${this.apiUrl}api/events`, eventData);
  }
  getStoredFiles(category: string = '') {
    return this.http.get<any[]>(`${this.apiUrl}api/storage?category=${category}`);
  }

  uploadStoredFile(title: string, category: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', category);
    return this.http.post<any>(`${this.apiUrl}api/storage/upload`, formData);
  }

  deleteStoredFile(id: number) {
    return this.http.delete<any>(`${this.apiUrl}api/storage/${id}`);
  }

  // Helper method to trigger the browser's download prompt natively
  downloadFileUrl(id: number): string {
    return `${this.apiUrl}api/storage/download/${id}`;
  }

  generateWordPaper(params: any) {
    // We convert the object into query parameters to match your Spring Boot @RequestParam setup
    const queryString = new URLSearchParams(params).toString();
    
    return this.http.post(`${this.apiUrl}api/exams/generate-word?${queryString}`, {}, {
      responseType: 'blob' // CRITICAL: Tells Angular to expect a file, not JSON
    });
  }
  getSubjectsByGrade(grade: string) {
    return this.http.get<any[]>(`${this.apiUrl}api/exams/subjects-by-grade?grade=${grade}`);
  }
  // Add this to fetch the list of routes for the dropdown
getTransportRoutes() {
  return this.http.get(`${this.apiUrl}api/transport-routes`);
}

// Add this to tell the backend to generate the dues based on the route and months selected
assignTransportRoute(studentId: number, routeId: number, months: number) {
  // Assuming you create a POST endpoint for this on the backend
  return this.http.post(`${this.apiUrl}api/fees/assign-transport`, {
    studentId,
    routeId,
    months
  });
}
// Add this inside api-service.ts
  deleteTransaction(receiptId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}api/fees/transaction/${receiptId}`);
  }
// Add these to your existing ApiService class in api-service.ts

// Fetches the master rules for a grade (e.g., Grade 5 has Tuition: 2000, Exam: 500)
getClassFeeRulesByGrade(grade: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/fees/config/rules/${grade}`);
}

// Simple list of students for the dropdown
getStudentsByStandard(grade: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}api/students/list?standard=${grade}`);
}
getStudentPaidTransactions(studentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/fees/transactions/student/${studentId}`);
  }
  // Update this method in api-service.ts
  getClassDueReport(grade: string, tillMonth?: number | string): Observable<any> {
    let url = `${this.apiUrl}api/fees/due-report?standard=${grade}`;
    if (tillMonth) {
      url += `&tillMonth=${tillMonth}`;
    }
    return this.http.get<any>(url);
  }
 // In your api-service.ts
  getFeeTransactions(grade: string, studentId: number | string, page: number, size: number): Observable<any> {
    let url = `${this.apiUrl}api/fees/transactions?standard=${grade}&page=${page}&size=${size}`;
    if (studentId) {
      url += `&studentId=${studentId}`;
    }
    return this.http.get<any>(url);
  }
  // Add this to api-service.ts
public getRosterByStandards(standards: string[]) {
  // Joins the array into a comma-separated string: "LKG,UKG,1"
  const params = { standards: standards.join(',') }; 
  return this.http.get(`${baseApiUrl}api/students/roster`, { params });
}
}