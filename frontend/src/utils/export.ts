import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Plan, PlanItem } from '../api/plan';
import { TestCase } from '../api/testcase';

interface ExportData {
  plan: Plan;
  items: PlanItem[];
}

/**
 * Export to PDF using html2canvas for Korean text support
 * Falls back to jsPDF autoTable if html2canvas is not available
 */
export const exportToPDF = async ({ plan, items }: ExportData): Promise<void> => {
  // Try to use html2canvas for better Korean text support
  try {
    const html2canvas = (await import('html2canvas')).default;
    await exportToPDFWithHtml2Canvas({ plan, items }, html2canvas);
  } catch {
    // Fallback to basic jsPDF if html2canvas is not available
    exportToPDFBasic({ plan, items });
  }
};

/**
 * Export to PDF using html2canvas (Korean text support)
 */
const exportToPDFWithHtml2Canvas = async (
  { plan, items }: ExportData,
  html2canvas: typeof import('html2canvas').default
): Promise<void> => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width @ 96dpi-ish
  container.style.padding = '24px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily =
    "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

  const escapeHtml = (s: unknown) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const stats = items.reduce(
    (acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryParts = Object.entries(stats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  const rowsHtml = items
    .map((item, idx) => {
      const executed = item.executedAt ? new Date(item.executedAt).toLocaleString() : '-';
      return `<tr>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;width:34px;text-align:right;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(item.testCase.title)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;width:90px;">${escapeHtml(item.assignee || '-')}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;width:90px;">${escapeHtml(item.result)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(item.comment || '-')}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;vertical-align:top;width:130px;">${escapeHtml(executed)}</td>
      </tr>`;
    })
    .join('');

  container.innerHTML = `
    <div style="font-size:20px;font-weight:800;margin-bottom:8px;">Test Run Report</div>
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">${escapeHtml(plan.name)}</div>
    <div style="font-size:12px;color:#475569;margin-bottom:6px;">
      Status: <b style="color:#0f172a;">${escapeHtml(plan.status)}</b> · Total Cases: <b style="color:#0f172a;">${items.length}</b>
    </div>
    <div style="font-size:12px;color:#475569;margin-bottom:16px;">
      Summary: <span style="color:#0f172a;">${escapeHtml(summaryParts || '-')}</span>
    </div>

    <table style="border-collapse:collapse;width:100%;font-size:11px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:right;width:34px;">#</th>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:left;">Title</th>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:left;width:90px;">Assignee</th>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:left;width:90px;">Result</th>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:left;">Comment</th>
          <th style="padding:8px;border:1px solid #e2e8f0;background:#4f46e5;color:#fff;text-align:left;width:130px;">Executed</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = margin;
    let remainingHeight = imgHeight;
    let sourceY = 0;

    // Multi-page slicing
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, pageHeight - margin * 2);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.floor((sliceHeight * canvas.width) / imgWidth);
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(
        canvas,
        0,
        Math.floor((sourceY * canvas.width) / imgWidth),
        canvas.width,
        sliceCanvas.height,
        0,
        0,
        canvas.width,
        sliceCanvas.height
      );

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceImgHeight = (sliceCanvas.height * imgWidth) / sliceCanvas.width;
      doc.addImage(sliceData, 'PNG', margin, y, imgWidth, sliceImgHeight);

      remainingHeight -= sliceHeight;
      sourceY += sliceHeight;

      if (remainingHeight > 0) {
        doc.addPage();
        y = margin;
      }
    }

    doc.save(`${plan.name}_report.pdf`);
  } finally {
    container.remove();
  }
};

/**
 * Basic PDF export using jsPDF autoTable (fallback)
 */
const exportToPDFBasic = ({ plan, items }: ExportData) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(`Test Run Report: ${plan.name}`, 14, 22);

  // Metadata
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Status: ${plan.status} | Total Cases: ${items.length}`, 14, 32);

  // Summary Stats
  const stats = items.reduce(
    (acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  let summaryText = 'Summary: ';
  Object.entries(stats).forEach(([key, value]) => {
    summaryText += `${key}: ${value}  `;
  });
  doc.text(summaryText, 14, 40);

  // Table Data
  const tableData = items.map((item, index) => [
    (index + 1).toString(),
    item.testCase.title,
    item.assignee || '-',
    item.result,
    item.comment || '-',
    item.executedAt ? new Date(item.executedAt).toLocaleDateString() : '-',
  ]);

  // Table
  autoTable(doc, {
    startY: 50,
    head: [['#', 'Title', 'Assignee', 'Result', 'Comment', 'Executed Date']],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229] }, // Indigo color
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 }, // #
      1: { cellWidth: 'auto' }, // Title
      2: { cellWidth: 25 }, // Assignee
      3: { cellWidth: 25 }, // Result
      4: { cellWidth: 40 }, // Comment
      5: { cellWidth: 25 }, // Date
    },
  });

  // Save
  doc.save(`${plan.name}_report.pdf`);
};

/**
 * Export to Excel
 */
export const exportToExcel = ({ plan, items }: ExportData) => {
  // Summary Sheet
  const stats = items.reduce(
    (acc, item) => {
      acc[item.result] = (acc[item.result] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summaryData = [
    ['Test Plan Name', plan.name],
    ['Description', plan.description || '-'],
    ['Status', plan.status],
    ['Total Cases', items.length],
    ['Created At', new Date(plan.createdAt).toLocaleString()],
    [],
    ['Result Summary'],
    ...Object.entries(stats).map(([key, value]) => [key, value, `${((value / items.length) * 100).toFixed(1)}%`]),
  ];

  // Details Sheet
  const detailsData = [
    ['ID', 'Title', 'Priority', 'Assignee', 'Result', 'Comment', 'Executed At', 'Updated At'],
    ...items.map((item) => [
      item.testCaseId,
      item.testCase.title,
      item.testCase.priority,
      item.assignee || '-',
      item.result,
      item.comment || '-',
      item.executedAt ? new Date(item.executedAt).toLocaleString() : '-',
      item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-',
    ]),
  ];

  // Create Workbook
  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  const detailsWs = XLSX.utils.aoa_to_sheet(detailsData);

  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, detailsWs, 'Details');

  // Save
  XLSX.writeFile(wb, `${plan.name}_report.xlsx`);
};

// ============================================
// Test Case Export Functions
// ============================================

/**
 * HTML 태그를 제거하고 텍스트만 추출 (줄바꿈 유지)
 */
const stripHtmlToText = (html: string | null | undefined): string => {
  if (!html) return '';

  // <br>, <p>, </p>, <li> 등을 줄바꿈으로 변환
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]*>/g, '') // 나머지 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n/g, '\n') // 연속 줄바꿈 정리
    .trim();

  return text;
};

/**
 * 폴더 경로를 문자열로 변환
 */
const getFolderPathString = (testCase: TestCase): string => {
  if (!testCase.folderPath || testCase.folderPath.length === 0) {
    return 'Uncategorized';
  }
  return testCase.folderPath.map((f) => f.name).join(' / ');
};

/**
 * 케이스 ID 포맷
 */
const getCaseId = (testCase: TestCase): string => {
  return testCase.caseNumber ? `C${testCase.caseNumber}` : testCase.id.substring(0, 6).toUpperCase();
};

/**
 * 날짜 포맷
 */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

/**
 * Test Case를 Export용 행 데이터로 변환
 */
const testCaseToRow = (tc: TestCase): string[] => {
  return [
    getCaseId(tc),
    tc.title,
    tc.priority,
    tc.automationType === 'AUTOMATED' ? 'Automated' : 'Manual',
    tc.category || '',
    getFolderPathString(tc),
    stripHtmlToText(tc.precondition),
    stripHtmlToText(tc.steps),
    stripHtmlToText(tc.expectedResult),
    '-', // Created By (현재 데이터에 없음)
    formatDate(tc.createdAt),
    formatDate(tc.updatedAt),
  ];
};

const TEST_CASE_HEADERS = [
  'ID',
  'Title',
  'Priority',
  'Automation Type',
  'Category',
  'Folder Path',
  'Preconditions',
  'Steps',
  'Expected Result',
  'Created By',
  'Created At',
  'Updated At',
];

/**
 * Export Test Cases to CSV
 */
export const exportTestCasesToCSV = (testCases: TestCase[], filename: string = 'test_cases') => {
  // CSV 데이터 생성
  const rows = [TEST_CASE_HEADERS, ...testCases.map(testCaseToRow)];

  // CSV 문자열 생성 (셀 내 쉼표/줄바꿈 처리)
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell);
          // 쉼표, 줄바꿈, 큰따옴표가 있으면 큰따옴표로 감싸기
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');

  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 다운로드
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Export Test Cases to Excel
 */
export const exportTestCasesToExcel = (testCases: TestCase[], filename: string = 'test_cases') => {
  // 데이터 준비
  const data = [TEST_CASE_HEADERS, ...testCases.map(testCaseToRow)];

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 8 }, // ID
    { wch: 40 }, // Title
    { wch: 10 }, // Priority
    { wch: 12 }, // Automation Type
    { wch: 15 }, // Category
    { wch: 30 }, // Folder Path
    { wch: 40 }, // Preconditions
    { wch: 50 }, // Steps
    { wch: 40 }, // Expected Result
    { wch: 15 }, // Created By
    { wch: 18 }, // Created At
    { wch: 18 }, // Updated At
  ];

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

  // 다운로드
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
