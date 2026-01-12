import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, AlertCircle, FileSpreadsheet, ArrowRight, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { importTestCases } from '../api/testcase';
import { Button } from './ui/Button';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  onSuccess: () => void;
}

// 시스템 필드 정의
const DB_FIELDS = [
  { key: 'title', label: 'Title (제목)', required: true, description: '테스트 케이스 제목 (필수)' },
  { key: 'description', label: 'Description (설명)', required: false, description: '테스트 케이스 설명' },
  {
    key: 'precondition',
    label: 'Preconditions (사전 조건)',
    required: false,
    description: '테스트 실행 전 필요한 조건',
  },
  { key: 'steps', label: 'Steps (테스트 단계)', required: false, description: '테스트 실행 단계' },
  { key: 'expectedResult', label: 'Expected Result (기대 결과)', required: false, description: '예상되는 결과' },
  { key: 'priority', label: 'Priority (우선순위)', required: false, description: 'LOW / MEDIUM / HIGH' },
  { key: 'automationType', label: 'Automation Type (자동화 여부)', required: false, description: 'MANUAL / AUTOMATED' },
  {
    key: 'category',
    label: 'Category (카테고리)',
    required: false,
    description: '사용자 정의 카테고리 (예: Smoke, Regression)',
  },
  { key: 'folderName', label: 'Folder (폴더)', required: false, description: '폴더 이름 (없으면 자동 생성)' },
];

// 자동 매핑을 위한 키워드 매칭
const FIELD_KEYWORDS: Record<string, string[]> = {
  title: ['title', 'name', 'test case', 'testcase', '제목', '이름', '테스트케이스'],
  description: ['description', 'desc', 'summary', '설명', '요약'],
  precondition: ['precondition', 'preconditions', 'pre-condition', 'prerequisite', '사전조건', '전제조건'],
  steps: ['steps', 'step', 'test steps', 'procedure', '단계', '테스트단계', '절차'],
  expectedResult: ['expected', 'expected result', 'expected outcome', 'result', '기대결과', '예상결과'],
  priority: ['priority', 'importance', 'severity', '우선순위', '중요도'],
  automationType: ['automation', 'type', 'automated', 'manual', '자동화', '타입', '유형'],
  category: ['category', 'tag', 'label', 'group', '카테고리', '태그', '분류', '그룹'],
  folderName: ['folder', 'foldername', 'folder name', 'directory', '폴더', '폴더명', '디렉토리'],
};

// 자동 매핑 함수
const autoMapField = (csvHeader: string): string | null => {
  const normalizedHeader = csvHeader.toLowerCase().trim();

  for (const [fieldKey, keywords] of Object.entries(FIELD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedHeader.includes(keyword.toLowerCase())) {
        return fieldKey;
      }
    }
  }

  // 정확히 일치하는 경우
  const exactMatch = DB_FIELDS.find((f) => f.key.toLowerCase() === normalizedHeader);
  if (exactMatch) return exactMatch.key;

  return null;
};

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, currentFolderId, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; failureCount: number; failures: any[] } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [totalRowCount, setTotalRowCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 매핑된 필드 수 계산
  const mappedFieldsCount = useMemo(() => {
    return Object.values(mapping).filter((v) => v).length;
  }, [mapping]);

  // title 필드가 매핑되었는지 확인
  const isTitleMapped = useMemo(() => {
    return Object.values(mapping).includes('title');
  }, [mapping]);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setMapping({});
    setResult(null);
    setShowPreview(false);
    setTotalRowCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);

      // 전체 행 수 파싱
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (fullResults) => {
          setTotalRowCount(fullResults.data.length);
        },
      });

      // CSV 파싱 (헤더 + 미리보기 데이터)
      Papa.parse(selectedFile, {
        header: true,
        preview: 6, // 헤더 + 5행 미리보기
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setPreviewData(results.data as Record<string, string>[]);

            // 자동 매핑 시도
            const initialMapping: Record<string, string> = {};
            results.meta.fields.forEach((header) => {
              const mappedField = autoMapField(header);
              if (mappedField) {
                // 이미 매핑된 필드가 아닌 경우에만 매핑
                if (!Object.values(initialMapping).includes(mappedField)) {
                  initialMapping[header] = mappedField;
                }
              }
            });
            setMapping(initialMapping);
            setStep('mapping');
          }
        },
        error: (error) => {
          alert(`CSV 파싱 오류: ${error.message}`);
        },
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleMappingChange = (csvHeader: string, dbField: string) => {
    setMapping((prev) => {
      const newMapping = { ...prev };

      // 같은 DB 필드가 다른 CSV 헤더에 이미 매핑되어 있으면 제거
      if (dbField) {
        Object.keys(newMapping).forEach((key) => {
          if (newMapping[key] === dbField && key !== csvHeader) {
            delete newMapping[key];
          }
        });
      }

      if (dbField) {
        newMapping[csvHeader] = dbField;
      } else {
        delete newMapping[csvHeader];
      }

      return newMapping;
    });
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const response = await importTestCases(currentFolderId, file, mapping);
      if (response.success) {
        setResult(response.data);
        setStep('result');
      }
    } catch {
      alert('Import 실패');
    } finally {
      setUploading(false);
    }
  };

  // 미리보기에서 매핑된 값 표시
  const getMappedPreviewValue = (row: Record<string, string>, dbFieldKey: string): string => {
    const csvHeader = Object.keys(mapping).find((k) => mapping[k] === dbFieldKey);
    if (csvHeader && row[csvHeader]) {
      return row[csvHeader];
    }
    return '-';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">CSV Import</h2>
              <p className="text-sm text-slate-500">
                {step === 'upload' && 'CSV 파일을 업로드하세요'}
                {step === 'mapping' && '필드 매핑을 확인하세요'}
                {step === 'result' && 'Import 결과'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Progress Steps */}
        {step !== 'result' && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">1</span>
                파일 선택
              </div>
              <ArrowRight size={16} className="text-slate-400" />
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  step === 'mapping' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">2</span>
                필드 매핑
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">CSV 파일을 드래그하거나 클릭하여 업로드</h3>
              <p className="text-sm text-slate-500 mb-4">지원 형식: .csv (UTF-8 인코딩 권장)</p>
              <Button variant="outline" size="sm">
                파일 선택
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-emerald-600" size={24} />
                  <div>
                    <p className="font-medium text-slate-900">{file?.name}</p>
                    <p className="text-sm text-slate-500">
                      {headers.length}개 컬럼 · <span className="text-indigo-600 font-medium">{totalRowCount}개 케이스</span>{' '}
                      Import 예정
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('upload');
                    setFile(null);
                    setHeaders([]);
                    setPreviewData([]);
                    setMapping({});
                  }}
                >
                  다른 파일 선택
                </Button>
              </div>

              {/* Mapping Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">필드 매핑</h3>
                  <span className="text-sm text-slate-500">
                    {mappedFieldsCount}개 필드 매핑됨
                    {!isTitleMapped && <span className="text-red-500 ml-2">⚠️ Title 필드 매핑 필요</span>}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">CSV 컬럼</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase w-12"></th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          시스템 필드
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          샘플 데이터
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {headers.map((header) => (
                        <tr key={header} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{header}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ArrowRight size={16} className="text-slate-400 mx-auto" />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                              value={mapping[header] || ''}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                            >
                              <option value="">— 건너뛰기 —</option>
                              {DB_FIELDS.map((field) => {
                                const isAlreadyMapped = Object.entries(mapping).some(
                                  ([k, v]) => v === field.key && k !== header
                                );
                                return (
                                  <option key={field.key} value={field.key} disabled={isAlreadyMapped}>
                                    {field.label} {field.required ? '*' : ''} {isAlreadyMapped ? '(이미 매핑됨)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-sm text-slate-600 truncate block max-w-[200px]"
                              title={previewData[0]?.[header]}
                            >
                              {previewData[0]?.[header] || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Toggle */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <Eye size={16} />
                  매핑 결과 미리보기
                  {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showPreview && (
                  <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-indigo-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-indigo-900">#</th>
                            {DB_FIELDS.filter((f) => Object.values(mapping).includes(f.key)).map((field) => (
                              <th key={field.key} className="px-3 py-2 text-left font-medium text-indigo-900">
                                {field.label.split(' (')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {previewData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                              {DB_FIELDS.filter((f) => Object.values(mapping).includes(f.key)).map((field) => (
                                <td key={field.key} className="px-3 py-2 max-w-[150px] truncate">
                                  {getMappedPreviewValue(row, field.key)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div className="text-center py-8">
              {result.failureCount === 0 ? (
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-emerald-600" size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-amber-600" size={32} />
                </div>
              )}

              <h3 className="text-xl font-bold text-slate-900 mb-2">Import 완료</h3>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">{result.successCount}</p>
                  <p className="text-sm text-slate-500">성공</p>
                </div>
                {result.failureCount > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">{result.failureCount}</p>
                    <p className="text-sm text-slate-500">실패</p>
                  </div>
                )}
              </div>

              {result.failures.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left max-h-48 overflow-y-auto">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    실패 내역
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.failures.map((fail, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium">행 {fail.row}:</span>
                        <span>{fail.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {step === 'mapping' && currentFolderId && <span>📁 현재 폴더에 Import됩니다</span>}
            {step === 'mapping' && !currentFolderId && <span>📁 루트 폴더에 Import됩니다</span>}
          </div>
          <div className="flex gap-3">
            {step === 'mapping' && (
              <>
                <Button variant="ghost" onClick={handleClose}>
                  취소
                </Button>
                <Button variant="primary" onClick={handleImport} disabled={!isTitleMapped || uploading}>
                  {uploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Import 중...
                    </>
                  ) : (
                    'Import 실행'
                  )}
                </Button>
              </>
            )}
            {step === 'result' && (
              <Button
                variant="primary"
                onClick={() => {
                  onSuccess();
                  handleClose();
                }}
              >
                확인
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
