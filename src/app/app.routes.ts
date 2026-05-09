import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { StudentsComponent } from './pages/student/student';
import { FeesComponent } from './pages/fee-management/fee-management';
import { ExamComponent } from './pages/exams/exams';
import { FeeConfigComponent } from './pages/fee-config/fee-config';
import { MarksheetConfigComponent } from './pages/marksheet-config/marksheet-config';
import { MarksEntryComponent } from './pages/marks-entry/marks-entry';
import { MarksheetViewComponent } from './pages/marksheet-view/marksheet-view';
import { authGuard } from './auth.guard';
import { LoginComponent } from './pages/login/login';
import { TcGeneratorComponent } from './pages/tc-generate/tc-generate';

export const routes: Routes = [
  // 1. PUBLIC ROUTE (No Layout wrapper, full screen)
  { path: 'login', component: LoginComponent },

  // 2. PROTECTED ROUTES (Wrapped in Layout)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard], // This protects every single route inside 'children'
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
      // Standard Protected Routes (Staff & Admin)
      { path: 'dashboard', component: DashboardComponent },
      { path: 'students', component: StudentsComponent },
      { path: 'fees', component: FeesComponent },
      { path: 'marksheet', component: MarksEntryComponent },
      { path: 'view-marks', component: MarksheetViewComponent },
      { path: 'exams', component: ExamComponent },

      // Highly Protected Routes (Admin Only)
      { path: 'fee-config', component: FeeConfigComponent, data: { role: 'ADMIN' } },
      { path: 'marksheet-config', component: MarksheetConfigComponent, data: { role: 'ADMIN' } },
      { 
    path: 'tc-generator', 
    component: TcGeneratorComponent,
    title: 'TC Generator - SBPS' // Optional: sets the browser tab title
  },
    ]
  },
  
  // 3. FALLBACK ROUTE
  // The authGuard will automatically catch this and redirect to /login if they aren't authenticated
  { path: '**', redirectTo: 'dashboard' } 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }