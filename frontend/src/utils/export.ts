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
 * Export to PDF
 */
export const exportToPDF = ({ plan, items }: ExportData) => {
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
