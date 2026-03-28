// marksheet-templates.ts
const schoolName= "S. B. PUBLIC SCHOOL"

export const MARKSHEET_TEMPLATES: Record<string, (data: any) => string> = {

  // ============================================================
  // 1. TERM EXAM - Portrait Classic 
  // ============================================================
  portrait_term: (d: any) => {
    const hasPractical = d.subjects?.some((s: any) => s.hasPractical);
    const subjectRows = d.subjects?.map((s: any) => `
      <tr class="${!s.marksEntered ? 'row-na' : (!s.passed ? 'row-fail' : '')}">
        <td class="sub-name">${s.subjectName}${!s.isCompulsory ? ' <span class="opt">(Opt)</span>' : ''}</td>
        <td class="c">${s.theoryMax}</td>
        <td class="c">${s.theoryPass}</td>
        <td class="c marks ${s.marksEntered && s.theoryObtained < s.theoryPass ? 'fail' : ''}">
          ${s.marksEntered ? s.theoryObtained : 'AB'}
        </td>
        ${hasPractical ? `
        <td class="c">${s.hasPractical ? s.practicalMax : '—'}</td>
        <td class="c marks ${s.marksEntered && s.hasPractical && s.practicalObtained < s.practicalPass ? 'fail' : ''}">
          ${s.hasPractical && s.marksEntered ? s.practicalObtained : '—'}
        </td>` : ''}
        <td class="c total">${s.marksEntered ? s.subjectTotal : '—'}</td>
        <td class="c">${s.subjectMaxTotal}</td>
        <td class="c grade">${s.grade}</td>
        <td class="c status">${!s.marksEntered ? 'AB' : (s.passed ? 'PASS' : 'FAIL')}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Marksheet — ${d.studentName}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; color: #000; background: white; padding: 40px; font-size: 14px; }
      .document-border { border: 4px double #1a1a1a; padding: 30px; min-height: 90vh; position: relative; }
      .school-header { text-align: center; margin-bottom: 24px; }
      .school-name { font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
      .school-tagline { font-size: 13px; color: #333; margin-bottom: 16px; }
      .report-title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; text-decoration: underline; margin-bottom: 24px; }
      
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
      .info-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .info-table td { padding: 4px 8px; border: none; }
      .info-label { font-weight: bold; width: 130px; }
      
      .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
      .marks-table th { background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; text-transform: uppercase; border: 1px solid #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .marks-table td { padding: 8px 10px; border: 1px solid #000; }
      .sub-name { font-weight: bold; }
      .c { text-align: center; }
      .marks { font-weight: bold; }
      .total { font-weight: bold; background: #f9f9f9; -webkit-print-color-adjust: exact; }
      .fail { color: #000; }
      .marks-table tfoot td { background: #f0f0f0; font-weight: bold; border-top: 2px solid #000; -webkit-print-color-adjust: exact; }
      
      .summary-section { margin-bottom: 40px; border: 1px solid #000; padding: 15px; background: #fafafa; -webkit-print-color-adjust: exact; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
      .sum-item strong { font-size: 16px; display: block; margin-top: 4px; }
      
      .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; }
      .sig-line { text-align: center; min-width: 150px; border-top: 1px solid #000; padding-top: 8px; font-weight: bold; text-transform: uppercase; font-size: 12px;}
      .seal-space { text-align: center; font-size: 11px; color: #666; width: 100px; height: 100px; border: 1px dashed #ccc; border-radius: 50%; line-height: 100px; margin-top: -40px; }
    </style></head><body>
    <div class="document-border">
      <div class="school-header">
        <div class="school-name">${schoolName}</div>
        <div class="school-tagline">Affiliated to Board of Secondary Education | Est. 2001</div>
        <div class="report-title">Statement of Marks</div>
      </div>
      
      <div class="info-grid">
        <table class="info-table">
          <tr><td class="info-label">Student Name:</td><td><strong>${d.studentName}</strong></td></tr>
          <tr><td class="info-label">Father's Name:</td><td>${d.fatherName || '—'}</td></tr>
          <tr><td class="info-label">SR Number:</td><td>${d.srNumber}</td></tr>
          <tr><td class="info-label">Class / Grade:</td><td>Grade ${d.standard}</td></tr>
        </table>
        <table class="info-table">
          <tr><td class="info-label">Examination:</td><td><strong>${d.examName}</strong></td></tr>
          <tr><td class="info-label">Academic Year:</td><td>${d.academicYear}</td></tr>
          <tr><td class="info-label">Date of Issue:</td><td>${d.examDate || '—'}</td></tr>
        </table>
      </div>
      
      <table class="marks-table">
        <thead>
          <tr>
            <th style="text-align:left;">Subject</th>
            <th>Max Marks</th><th>Min Pass</th><th>Marks Obt.</th>
            ${hasPractical ? '<th>Pr. Max</th><th>Pr. Obt.</th>' : ''}
            <th>Subject Total</th><th>Max Total</th><th>Grade</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="${hasPractical ? 6 : 4}" style="text-align: right; padding-right: 15px;"><strong>GRAND TOTAL</strong></td>
            <td class="c">${d.totalObtained}</td>
            <td class="c">${d.totalMaxMarks}</td>
            <td class="c">${d.overallGrade}</td>
            <td class="c">${d.result}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="summary-section">
        <div class="summary-grid">
          <div class="sum-item">Percentage: <strong>${d.percentage?.toFixed(2)}%</strong></div>
          <div class="sum-item">Overall Grade: <strong>${d.overallGrade}</strong></div>
          <div class="sum-item">Final Result: <strong>${d.result}</strong></div>
        </div>
      </div>
      
      <div class="signatures">
        <div class="sig-line">Class Teacher</div>
        <div class="seal-space">School Seal</div>
        <div class="sig-line">Principal</div>
      </div>
    </div>
    </body></html>`;
  },

  // ============================================================
  // 2. TERM EXAM - Landscape Standard 
  // ============================================================
  landscape_term: (d: any) => {
    const hasPractical = d.subjects?.some((s: any) => s.hasPractical);
    const subjectRows = d.subjects?.map((s: any) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;">${s.subjectName}${!s.isCompulsory ? '*' : ''}</td>
        <td class="tc">${s.theoryMax}</td>
        <td class="tc">${s.theoryPass}</td>
        <td class="tc fw ${s.marksEntered && s.theoryObtained < s.theoryPass ? 'fail-text' : ''}">${s.marksEntered ? s.theoryObtained : '—'}</td>
        ${hasPractical ? `
        <td class="tc">${s.hasPractical ? s.practicalMax : '—'}</td>
        <td class="tc fw ${s.marksEntered && s.hasPractical && s.practicalObtained < s.practicalPass ? 'fail-text' : ''}">${s.hasPractical && s.marksEntered ? s.practicalObtained : '—'}</td>
        ` : ''}
        <td class="tc fw bg-light">${s.marksEntered ? s.subjectTotal : '—'}</td>
        <td class="tc">${s.subjectMaxTotal}</td>
        <td class="tc fw">${s.grade}</td>
        <td class="tc fw ${!s.marksEntered ? 'mute' : (s.passed ? 'pass-text' : 'fail-text')}">${!s.marksEntered ? '—' : (s.passed ? 'PASS' : 'FAIL')}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Marksheet — ${d.studentName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 landscape; margin: 15mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 12px; background: white; padding: 20px; }
      .wrapper { border: 2px solid #000; padding: 20px; }
      
      .top-section { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 16px; }
      .school-block .name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
      .school-block .tagline { font-size: 11px; color: #444; margin-top: 4px; }
      .title-block { text-align: center; flex: 1; }
      .title-block h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 3px; margin: 0; }
      .exam-block { text-align: right; }
      .exam-block .exam-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
      
      .student-info { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 16px; font-size: 13px; }
      .info-item { display: flex; gap: 8px; }
      .info-lbl { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #555; align-self: center;}
      .info-val { font-weight: bold; border-bottom: 1px dotted #000; padding-bottom: 2px; min-width: 150px; }
      
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; border: 1.5px solid #000; }
      thead th { padding: 10px; background: #e0e0e0; color: #000; text-align: center; font-size: 11px; text-transform: uppercase; border: 1px solid #000; }
      thead th:first-child { text-align: left; }
      tbody td { border: 1px solid #999; }
      tfoot td { padding: 10px; background: #e0e0e0; font-weight: bold; border: 1px solid #000; text-align: center; }
      tfoot td:first-child { text-align: left; }
      
      .tc { text-align: center; } .fw { font-weight: bold; } .bg-light { background: #f5f5f5; }
      .pass-text { color: #000; } .fail-text { color: #000; text-decoration: underline; } .mute { color: #888; }
      
      .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
      .result-summary { display: flex; gap: 24px; border: 1.5px solid #000; padding: 12px 20px; background: #f9f9f9; }
      .rs-item { text-align: center; }
      .rs-lbl { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #444; }
      .rs-val { font-size: 18px; font-weight: 900; margin-top: 4px; }
      
      .signatures { display: flex; gap: 60px; }
      .sig-line { border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; min-width: 140px; text-align: center; }
    </style></head><body>
    <div class="wrapper">
      <div class="top-section">
        <div class="school-block">
          <div class="name">${schoolName}</div>
          <div class="tagline">Affiliated to State Board of Education</div>
        </div>
        <div class="title-block">
          <h1>Official Transcript</h1>
        </div>
        <div class="exam-block">
          <div class="exam-name">${d.examName}</div>
          <div>Year: ${d.academicYear}</div>
        </div>
      </div>
      
      <div class="student-info">
        <div class="info-item"><div class="info-lbl">Student Name:</div><div class="info-val">${d.studentName}</div></div>
        <div class="info-item"><div class="info-lbl">Father's Name:</div><div class="info-val">${d.fatherName || '—'}</div></div>
        <div class="info-item"><div class="info-lbl">SR Number:</div><div class="info-val">${d.srNumber}</div></div>
        <div class="info-item"><div class="info-lbl">Grade:</div><div class="info-val">${d.standard}</div></div>
        <div class="info-item"><div class="info-lbl">Date:</div><div class="info-val">${d.examDate || '—'}</div></div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="min-width:180px;">Subjects</th>
            <th>Th. Max</th><th>Pass</th><th>Th. Obt</th>
            ${hasPractical ? '<th>Pr. Max</th><th>Pr. Obt</th>' : ''}
            <th>Sub Total</th><th>Max Total</th><th>Grade</th><th>Result</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td></td><td></td><td></td>
            ${hasPractical ? '<td></td><td></td>' : ''}
            <td>${d.totalObtained}</td><td>${d.totalMaxMarks}</td>
            <td>${d.overallGrade}</td>
            <td>${d.result}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="bottom-section">
        <div class="result-summary">
          <div class="rs-item"><div class="rs-lbl">Percentage</div><div class="rs-val">${d.percentage?.toFixed(2)}%</div></div>
          <div class="rs-item"><div class="rs-lbl">Grade</div><div class="rs-val">${d.overallGrade}</div></div>
          <div class="rs-item"><div class="rs-lbl">Rank</div><div class="rs-val">#${d.rank || '—'}</div></div>
          <div class="rs-item"><div class="rs-lbl">Result</div><div class="rs-val">${d.result}</div></div>
        </div>
        <div class="signatures">
          <div class="sig-line">Class Teacher</div>
          <div class="sig-line">Principal</div>
        </div>
      </div>
    </div>
    </body></html>`;
  },

  // ============================================================
  // 3. ANNUAL EXAM - Portrait Modern (Detailed History Layout)
  // ============================================================
  portrait_annual: (d: any) => {
    const hasPrac = d.subjects?.some((s: any) => s.hasPractical);
    
    // Build 2-tier headers for each historical exam
    const topHeaders = d.includedExams?.map((ex: string) => `<th colspan="${hasPrac ? 3 : 2}">${ex}</th>`).join('') || '';
    const subHeaders = d.includedExams?.map((ex: string) => `<th>Th</th>${hasPrac ? '<th>Pr</th>' : ''}<th>Tot</th>`).join('') || '';

    const subjectRows = d.subjects?.map((s: any, idx: number) => {
      // Loop through historical marks dynamically and pull out precise Th/Pr/Total WITH MAX MARKS
      const historicalCols = d.includedExams?.map((ex: string) => {
        const em = s.historicalMarks?.[ex];
        if (!em || em.absent) {
          return `<td class="tc" style="color:#94a3b8;">-</td>` + 
                 (hasPrac ? `<td class="tc" style="color:#94a3b8;">-</td>` : '') + 
                 `<td class="tc" style="color:#ef4444;font-weight:700;">AB <span style="font-size:10px;color:#94a3b8;font-weight:normal;">/ ${em?.maxMarks || '-'}</span></td>`;
        }
        const th = em.theoryObtained !== null ? em.theoryObtained : '-';
        const pr = em.practicalObtained !== null ? em.practicalObtained : '-';
        return `<td class="tc">${th}</td>` + 
               (hasPrac ? `<td class="tc">${s.hasPractical ? pr : '-'}</td>` : '') + 
               `<td class="tc fw">${em.totalObtained} <span style="font-size:10px;color:#64748b;font-weight:normal;">/ ${em.maxMarks}</span></td>`;
      }).join('') || '';

      return `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 14px;font-weight:600;border-left:4px solid ${s.passed || !s.marksEntered ? '#0f172a' : '#ef4444'};">
          ${s.subjectName}${!s.isCompulsory ? ' <span class="opt">(Opt)</span>' : ''}
        </td>
        ${historicalCols}
        <td class="tc fw" style="background:#f1f5f9;">${s.marksEntered ? s.subjectTotal : '—'}</td>
        <td class="tc">${s.subjectMaxTotal}</td>
        <td class="tc fw">${s.grade}</td>
      </tr>`;
    }).join('');

    // Dynamic footers for individual exam totals
    const footerTotals = d.includedExams?.map((ex: string) => {
      const et = d.examTotals?.[ex];
      return `
        <td colspan="${hasPrac ? 2 : 1}"></td>
        <td class="tc fw">${et ? et.obtained + ' / ' + et.max : ''}</td>
      `;
    }).join('') || '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Annual Marksheet — ${d.studentName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: 'Segoe UI', Inter, Helvetica, sans-serif; color: #1e293b; background: white; font-size: 12px; }
      .page-wrapper { margin: 40px auto; max-width: 800px; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; }
      .header { background: #0f172a; color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; }
      .school-name { font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
      .exam-info { text-align: right; }
      .exam-title { font-size: 16px; font-weight: 600; color: #e2e8f0; }
      .exam-year { font-size: 12px; color: #94a3b8; margin-top: 4px; }
      .body-content { padding: 32px 40px; }
      
      .student-card { display: grid; grid-template-columns: 2fr 1fr; background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
      .info-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .info-list li { display: flex; flex-direction: column; gap: 2px; }
      .lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
      .val { font-size: 14px; font-weight: 600; color: #0f172a; }
      .result-banner { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
      .result-badge { padding: 8px 24px; border-radius: 6px; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
      .pass { background: #dcfce7; color: #166534; }
      .fail { background: #fee2e2; color: #991b1b; }
      
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      thead th { background: #e2e8f0; padding: 8px 10px; text-align: center; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border: 1px solid #cbd5e1; }
      tbody td { border: 1px solid #e2e8f0; padding: 6px 10px; }
      tfoot td { padding: 10px; background: #f8fafc; font-weight: 800; border: 1px solid #cbd5e1; text-align: center; }
      .tc { text-align: center; }
      .fw { font-weight: 700; }
      .opt { font-size:10px; color:#94a3b8; font-weight:normal; }
      
      .metrics { display: flex; gap: 16px; margin-bottom: 40px; }
      .metric-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
      .metric-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
      
      .sig-row { display: flex; justify-content: space-between; padding-top: 20px; }
      .sig-line { border-top: 1.5px solid #64748b; padding-top: 6px; font-size: 12px; font-weight: 600; color: #475569; min-width: 140px; text-align: center; margin-top: 40px; }
      
      @media print { .page-wrapper { margin: 0; border: none; } }
    </style></head><body>
    <div class="page-wrapper">
      <div class="header">
        <div>
          <div class="school-name">${schoolName}</div>
          <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">CONSOLIDATED ANNUAL REPORT</div>
        </div>
        <div class="exam-info">
          <div class="exam-title">${d.academicYear}</div>
          <div class="exam-year">Issued: ${d.examDate || '—'}</div>
        </div>
      </div>
      <div class="body-content">
        <div class="student-card">
          <ul class="info-list">
            <li><span class="lbl">Student Name</span><span class="val">${d.studentName}</span></li>
            <li><span class="lbl">Father's Name</span><span class="val">${d.fatherName || '—'}</span></li>
            <li><span class="lbl">Student ID / SR No</span><span class="val">${d.srNumber}</span></li>
            <li><span class="lbl">Grade & Section</span><span class="val">${d.standard}</span></li>
          </ul>
          <div class="result-banner">
            <span class="result-badge ${d.result === 'PASS' ? 'pass' : 'fail'}">${d.result}</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600;">Rank: #${d.rank || '—'}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="text-align:left;">Subject</th>
              ${topHeaders}
              <th rowspan="2">Final Total</th>
              <th rowspan="2">Max</th>
              <th rowspan="2">Grade</th>
            </tr>
            <tr>${subHeaders}</tr>
          </thead>
          <tbody>${subjectRows}</tbody>
          <tfoot>
            <tr>
              <td style="text-align:left;">YEAR TOTAL</td>
              ${footerTotals}
              <td class="tc fw">${d.totalObtained}</td>
              <td class="tc fw">${d.totalMaxMarks}</td>
              <td class="tc fw" style="color:#0369a1;">${d.overallGrade}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="metrics">
          <div class="metric-box"><div class="lbl">Total Marks</div><div class="metric-val">${d.totalObtained}/${d.totalMaxMarks}</div></div>
          <div class="metric-box"><div class="lbl">Percentage</div><div class="metric-val">${d.percentage?.toFixed(2)}%</div></div>
          <div class="metric-box"><div class="lbl">Overall Grade</div><div class="metric-val">${d.overallGrade}</div></div>
        </div>
        
        <div class="sig-row">
          <div class="sig-line">Class Teacher</div>
          <div class="sig-line">Principal</div>
        </div>
      </div>
    </div>
    </body></html>`;
  },

  // ============================================================
  // 4. ANNUAL EXAM - Landscape University (Detailed History)
  // ============================================================
  landscape_annual: (d: any) => {
    const hasPrac = d.subjects?.some((s: any) => s.hasPractical);
    
    const topHeaders = d.includedExams?.map((ex: string) => `<th colspan="${hasPrac ? 3 : 2}">${ex}</th>`).join('') || '';
    const subHeaders = d.includedExams?.map((ex: string) => `<th>Th</th>${hasPrac ? '<th>Pr</th>' : ''}<th>Tot</th>`).join('') || '';

    const subjectRows = d.subjects?.map((s: any) => {
      // Add MAX MARKS to historical cols here too
      const historicalCols = d.includedExams?.map((ex: string) => {
        const em = s.historicalMarks?.[ex];
        if (!em || em.absent) {
          return `<td class="tc mute">-</td>` + (hasPrac ? `<td class="tc mute">-</td>` : '') + `<td class="tc fail-text">AB <span class="mute" style="font-size:9px;font-weight:normal;">/ ${em?.maxMarks || '-'}</span></td>`;
        }
        const th = em.theoryObtained !== null ? em.theoryObtained : '-';
        const pr = em.practicalObtained !== null ? em.practicalObtained : '-';
        return `<td class="tc">${th}</td>` + (hasPrac ? `<td class="tc">${s.hasPractical ? pr : '-'}</td>` : '') + `<td class="tc fw">${em.totalObtained} <span class="mute" style="font-size:9px;font-weight:normal;">/ ${em.maxMarks}</span></td>`;
      }).join('') || '';

      return `
      <tr>
        <td style="padding:8px 12px;font-weight:600;">${s.subjectName}${!s.isCompulsory ? '*' : ''}</td>
        ${historicalCols}
        <td class="tc fw bg-light">${s.marksEntered ? s.subjectTotal : '—'}</td>
        <td class="tc">${s.subjectMaxTotal}</td>
        <td class="tc fw">${s.grade}</td>
        <td class="tc fw ${!s.marksEntered ? 'mute' : (s.passed ? 'pass-text' : 'fail-text')}">${!s.marksEntered ? '—' : (s.passed ? 'PASS' : 'FAIL')}</td>
      </tr>`;
    }).join('');

    const footerTotals = d.includedExams?.map((ex: string) => {
      const et = d.examTotals?.[ex];
      return `
        <td colspan="${hasPrac ? 2 : 1}"></td>
        <td class="tc fw">${et ? et.obtained + ' / ' + et.max : ''}</td>
      `;
    }).join('') || '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Annual Marksheet — ${d.studentName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 landscape; margin: 15mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; background: white; padding: 20px; }
      .wrapper { border: 2px solid #000; padding: 20px; }
      
      .top-section { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 16px; }
      .school-block .name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
      .school-block .tagline { font-size: 11px; color: #444; margin-top: 4px; }
      .title-block { text-align: center; flex: 1; }
      .title-block h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 3px; margin: 0; }
      .exam-block { text-align: right; }
      .exam-block .exam-name { font-size: 14px; font-weight: bold; text-transform: uppercase; }
      
      .student-info { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 16px; font-size: 13px; }
      .info-item { display: flex; gap: 8px; }
      .info-lbl { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #555; align-self: center;}
      .info-val { font-weight: bold; border-bottom: 1px dotted #000; padding-bottom: 2px; min-width: 150px; }
      
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; border: 1.5px solid #000; }
      thead th { padding: 8px; background: #e0e0e0; color: #000; text-align: center; font-size: 10px; text-transform: uppercase; border: 1px solid #000; }
      tbody td { border: 1px solid #999; padding: 6px; }
      tfoot td { padding: 8px; background: #e0e0e0; font-weight: bold; border: 1px solid #000; text-align: center; }
      tfoot td:first-child { text-align: left; }
      
      .tc { text-align: center; } .fw { font-weight: bold; } .bg-light { background: #f5f5f5; }
      .pass-text { color: #000; } .fail-text { color: #000; text-decoration: underline; } .mute { color: #888; }
      
      .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
      .result-summary { display: flex; gap: 24px; border: 1.5px solid #000; padding: 12px 20px; background: #f9f9f9; }
      .rs-item { text-align: center; }
      .rs-lbl { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #444; }
      .rs-val { font-size: 18px; font-weight: 900; margin-top: 4px; }
      
      .signatures { display: flex; gap: 60px; }
      .sig-line { border-top: 1px solid #000; padding-top: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; min-width: 140px; text-align: center; }
    </style></head><body>
    <div class="wrapper">
      <div class="top-section">
        <div class="school-block">
          <div class="name">${schoolName}</div>
          <div class="tagline">Consolidated Annual Report</div>
        </div>
        <div class="title-block">
          <h1>Official Transcript</h1>
        </div>
        <div class="exam-block">
          <div class="exam-name">${d.academicYear}</div>
          <div>Issued: ${d.examDate || '—'}</div>
        </div>
      </div>
      
      <div class="student-info">
        <div class="info-item"><div class="info-lbl">Student Name:</div><div class="info-val">${d.studentName}</div></div>
        <div class="info-item"><div class="info-lbl">Father's Name:</div><div class="info-val">${d.fatherName || '—'}</div></div>
        <div class="info-item"><div class="info-lbl">SR Number:</div><div class="info-val">${d.srNumber}</div></div>
        <div class="info-item"><div class="info-lbl">Grade:</div><div class="info-val">${d.standard}</div></div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="text-align:left;min-width:140px;">Subjects</th>
            ${topHeaders}
            <th rowspan="2">Final Total</th><th rowspan="2">Max Total</th><th rowspan="2">Grade</th><th rowspan="2">Result</th>
          </tr>
          <tr>${subHeaders}</tr>
        </thead>
        <tbody>${subjectRows}</tbody>
        <tfoot>
          <tr>
            <td>YEAR TOTAL</td>
            ${footerTotals}
            <td class="tc fw">${d.totalObtained}</td><td>${d.totalMaxMarks}</td>
            <td>${d.overallGrade}</td>
            <td>${d.result}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="bottom-section">
        <div class="result-summary">
          <div class="rs-item"><div class="rs-lbl">Percentage</div><div class="rs-val">${d.percentage?.toFixed(2)}%</div></div>
          <div class="rs-item"><div class="rs-lbl">Overall Grade</div><div class="rs-val">${d.overallGrade}</div></div>
          <div class="rs-item"><div class="rs-lbl">Class Rank</div><div class="rs-val">#${d.rank || '—'}</div></div>
          <div class="rs-item"><div class="rs-lbl">Final Result</div><div class="rs-val">${d.result}</div></div>
        </div>
        <div class="signatures">
          <div class="sig-line">Class Teacher</div>
          <div class="sig-line">Principal</div>
        </div>
      </div>
    </div>
    </body></html>`;
  }
};

export type TemplateKey = keyof typeof MARKSHEET_TEMPLATES;

export const TEMPLATE_META: { key: TemplateKey; label: string; orientation: string; icon: string; isAnnual: boolean }[] = [
  { key: 'portrait_term',    label: 'Term Exam — Formal Portrait',  orientation: 'Portrait',  icon: 'account_balance', isAnnual: false },
  { key: 'landscape_term',   label: 'Term Exam — University Landscape', orientation: 'Landscape', icon: 'account_balance_wallet', isAnnual: false },
  
  { key: 'portrait_annual',  label: 'Annual Report — Detailed Portrait', orientation: 'Portrait',  icon: 'assignment', isAnnual: true },
  { key: 'landscape_annual', label: 'Annual Report — Detailed University', orientation: 'Landscape', icon: 'account_balance_wallet', isAnnual: true },
];