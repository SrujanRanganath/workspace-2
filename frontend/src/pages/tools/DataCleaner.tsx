import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  FileCheck,
  Download,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Table,
  Search,
  ChevronRight,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  ArrowUpDown,
  Eye,
  X,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { apiClient, extractErrorMessage, downloadAuthenticatedFile } from '../../api/client';
import { DataCleanerResponse } from '../../types';
import { Navbar } from '../../components/Navbar';
import { LoadingButton } from '../../components/LoadingButton';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useToast } from '../../context/ToastContext';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const DataCleaner: React.FC = () => {
  const { success, info } = useToast();

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleaner response & states
  const [cleanerResult, setCleanerResult] = useState<DataCleanerResponse | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Table interactive features
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isColumnFilterOpen, setIsColumnFilterOpen] = useState(false);

  // 3 Enterprise Sample Datasets
  const sampleDatasets = [
    {
      name: 'Tech Workforce Payroll',
      filename: 'enterprise_payroll.csv',
      data: `id,employee_name,department,salary,tenure_years,performance_score
101,Alice Morgan,Engineering,98000,4.5,92
102,Marcus Vance,Product,89000,,88
103,Elena Rostova,AI Research,115000,6.2,96
104,David Chen,Infrastructure,92000,2.8,84
105,Sarah Jenkins,Engineering,104000,5.1,95
101,Alice Morgan,Engineering,98000,4.5,92
106,Tariq Al-Mansoor,Security,,3.4,90
107,Grace Hopper,Architecture,135000,8.0,99
108,Devon Miles,Support,68000,1.5,78
103,Elena Rostova,AI Research,115000,6.2,96
109,Kavita Patel,Engineering,101000,,91`,
    },
    {
      name: 'E-Commerce Transactions',
      filename: 'customer_orders.csv',
      data: `order_id,customer_name,item_count,total_amount,discount_code,fulfillment_days
8001,Jonathan Reed,3,149.50,SUMMER10,2
8002,Beatriz Silva,1,45.00,,4
8003,Li Wei,5,289.00,VIP20,1
8004,Amara Okafor,2,,DISCOUNT5,3
8005,Lucas Meyer,4,198.20,VIP20,2
8001,Jonathan Reed,3,149.50,SUMMER10,2
8006,Emma Watson,1,32.00,,5
8007,Noah Kim,6,340.00,SPRING15,1
8008,Chloe Dubois,2,,SUMMER10,3`,
    },
    {
      name: 'Cloud Telemetry Metrics',
      filename: 'server_telemetry.csv',
      data: `node_id,cluster_region,cpu_percent,memory_mb,latency_ms,packet_drop
node-us-east-1,us-east,48.2,14200,18.4,0
node-us-east-2,us-east,89.5,28400,,12
node-eu-west-1,eu-west,34.1,9800,28.1,0
node-ap-south-1,ap-south,62.8,,45.2,2
node-us-east-1,us-east,48.2,14200,18.4,0
node-sa-east-1,sa-east,55.0,16100,64.0,1
node-eu-west-1,eu-west,34.1,9800,28.1,0
node-ap-east-1,ap-east,78.9,22300,,5`,
    },
  ];

  const handleSelectSample = (sample: typeof sampleDatasets[0]) => {
    const blob = new Blob([sample.data], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], sample.filename, { type: 'text/csv' });
    setSelectedFile(file);
    setCleanerResult(null);
    setError(null);
    info(`Loaded sample dataset: ${sample.name}`);
  };

  const handleFileChange = (file: File) => {
    setError(null);
    const validExts = ['.csv', '.xlsx'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please select a valid CSV (.csv) or Excel (.xlsx) spreadsheet.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File size must not exceed 10 MB.');
      return;
    }

    setSelectedFile(file);
    setCleanerResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // POST /data-cleaner/clean
  const handleClean = async () => {
    if (!selectedFile) return;

    setError(null);
    setIsCleaning(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post<DataCleanerResponse>('/data-cleaner/clean', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCleanerResult(response.data);
      success('Dataset cleaning pipeline completed!');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsCleaning(false);
    }
  };

  // GET /data-cleaner/download/{filename}
  const handleDownloadCleaned = async () => {
    if (!cleanerResult?.filename) return;

    setError(null);
    setIsDownloading(true);

    try {
      await downloadAuthenticatedFile(
        `/data-cleaner/download/${encodeURIComponent(cleanerResult.filename)}`,
        cleanerResult.filename
      );
      success(`Downloaded ${cleanerResult.filename}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy preview as JSON
  const handleCopyJson = () => {
    if (!cleanerResult?.preview) return;
    navigator.clipboard.writeText(JSON.stringify(cleanerResult.preview, null, 2));
    success('Preview records copied as JSON');
  };

  // Toggle sort on column click
  const handleHeaderClick = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (col: string) => {
    setHiddenColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // Filtered and sorted preview rows
  const processedPreview = useMemo(() => {
    if (!cleanerResult?.preview) return [];
    let rows = [...cleanerResult.preview];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortColumn) {
      rows.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA || '').localeCompare(String(valB || ''))
          : String(valB || '').localeCompare(String(valA || ''));
      });
    }

    return rows;
  }, [cleanerResult?.preview, searchQuery, sortColumn, sortDirection]);

  // Visible column names
  const visibleColumns = useMemo(() => {
    return (cleanerResult?.column_names || []).filter((col) => !hiddenColumns.includes(col));
  }, [cleanerResult?.column_names, hiddenColumns]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <span>Workspace</span>
              <ChevronRight className="w-3 h-3 text-slate-700" />
              <span className="text-slate-300">Data Cleaner</span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>Interactive Record Explorer &amp; Imputation</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Tabular Dataset Cleaner &amp; Profiler
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              Endpoint: /data-cleaner/*
            </span>
          </div>
        </div>

        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Upload & Sample Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Preset Datasets & Upload Info (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Pre-Loaded Enterprise Datasets
              </span>
              <p className="text-xs text-slate-500">
                Test the deduplication and imputation pipeline with real synthetic data:
              </p>
              <div className="space-y-2 pt-1">
                {sampleDatasets.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{sample.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{sample.filename}</div>
                    </div>
                    <span className="text-[11px] text-indigo-400 font-mono">Load</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Stages Legend */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-300">FastAPI Pipeline Workflow</span>
              <div className="space-y-1.5 text-slate-400 font-mono text-[11px] pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">1.</span>
                  <span>Multipart CSV/XLSX Validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">2.</span>
                  <span>Row Hash Deduplication Filter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">3.</span>
                  <span>Statistical Mean/Mode Imputation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">4.</span>
                  <span>Quantile &amp; Standard Deviation Profiling</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Drag & Drop Dropzone (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/70 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-indigo-400" />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Select CSV or Excel Spreadsheet
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Drag and drop files here, or choose from pre-loaded datasets on the left
                </p>
              </div>

              {selectedFile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">{selectedFile.name}</span>
                  <span className="text-slate-500">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setCleanerResult(null);
                    }}
                    className="text-slate-500 hover:text-rose-400 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                Formats: .csv, .xlsx (up to 10 MB)
              </span>

              <LoadingButton
                type="button"
                onClick={handleClean}
                disabled={!selectedFile}
                isLoading={isCleaning}
                loadingText="Processing Pipeline..."
                variant="primary"
                size="sm"
                icon={FileSpreadsheet}
              >
                Clean Dataset
              </LoadingButton>
            </div>
          </div>
        </div>

        {/* Results Studio View */}
        {cleanerResult && (
          <div className="space-y-6 pt-2 animate-in fade-in duration-200">
            {/* Header Result Bar */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-100">
                    {cleanerResult.message || 'Dataset cleaned successfully.'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Artifact: {cleanerResult.filename}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Copy cleaned preview as JSON"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </button>

                <LoadingButton
                  type="button"
                  onClick={handleDownloadCleaned}
                  isLoading={isDownloading}
                  loadingText="Downloading..."
                  variant="primary"
                  size="sm"
                  icon={Download}
                >
                  Download Cleaned File
                </LoadingButton>
              </div>
            </div>

            {/* 1. Summary Metric Grid (Zero-Pill Tabular Numerals) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Original Rows</span>
                <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
                  {cleanerResult.original_rows?.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Raw input rows</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] text-emerald-400 font-medium">Cleaned Rows</span>
                <div className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                  {cleanerResult.cleaned_rows?.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Final preserved</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] text-rose-400 font-medium">Duplicates Dropped</span>
                <div className="text-xl font-bold font-mono text-rose-300 tabular-nums">
                  {cleanerResult.duplicates_removed?.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Identical hash removed</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] text-cyan-400 font-medium">Values Imputed</span>
                <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
                  {cleanerResult.missing_values_filled?.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Missing cells filled</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[11px] text-indigo-400 font-medium">Features Analyzed</span>
                <div className="text-xl font-bold font-mono text-indigo-300 tabular-nums">
                  {cleanerResult.total_columns ?? cleanerResult.column_names?.length ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Total columns</div>
              </div>
            </div>

            {/* 2. Interactive Preview Table with Search, Column Filter & Row Click Details */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-xs text-slate-200">
                    Cleaned Data Preview (Click any row to inspect fields)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search in preview..."
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-44"
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsColumnFilterOpen(!isColumnFilterOpen)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Toggle Columns"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>

                    {isColumnFilterOpen && (
                      <div
                        onMouseLeave={() => setIsColumnFilterOpen(false)}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-30 text-xs space-y-1"
                      >
                        <div className="px-2 py-1 font-semibold text-slate-300 text-[11px] border-b border-slate-800">
                          Visible Features
                        </div>
                        {cleanerResult.column_names?.map((col) => (
                          <label
                            key={col}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={!hiddenColumns.includes(col)}
                              onChange={() => toggleColumnVisibility(col)}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                            <span className="font-mono text-[11px] truncate">{col}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 text-slate-600 w-10 text-center">#</th>
                      {visibleColumns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleHeaderClick(col)}
                          className="py-2.5 px-3 font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {processedPreview.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRecord(row)}
                        className="hover:bg-slate-800/60 transition-colors odd:bg-slate-900/20 cursor-pointer group"
                      >
                        <td className="py-2 px-3 text-slate-600 text-center text-[10px] group-hover:text-indigo-400">
                          {idx + 1}
                        </td>
                        {visibleColumns.map((col) => (
                          <td key={col} className="py-2 px-3 text-slate-200 whitespace-nowrap">
                            {row[col] !== undefined && row[col] !== null ? (
                              String(row[col])
                            ) : (
                              <span className="text-slate-600 italic">null</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Missing Values & Inferred Schema Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Missing Value Density Report
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">missing_value_report</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cleanerResult.missing_value_report &&
                    Object.entries(cleanerResult.missing_value_report).map(([col, count]) => {
                      const num = Number(count) || 0;
                      return (
                        <div
                          key={col}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                        >
                          <span className="text-slate-300">{col}</span>
                          <span className={num > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            {num} missing ({num === 0 ? 'Clean' : 'Imputed'})
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Inferred Feature Schema
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">data_types</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cleanerResult.data_types &&
                    Object.entries(cleanerResult.data_types).map(([col, dtype]) => (
                      <div
                        key={col}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                      >
                        <span className="text-slate-300">{col}</span>
                        <span className="text-slate-400 text-[11px]">{String(dtype)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 4. Descriptive Statistics Table */}
            {cleanerResult.statistics && Object.keys(cleanerResult.statistics).length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    Descriptive Numeric Statistics
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">mean, std, quantiles</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 text-slate-200 font-semibold">Metric</th>
                        {Object.keys(cleanerResult.statistics).map((col) => (
                          <th key={col} className="py-2.5 px-3 text-indigo-300 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {Array.from(
                        new Set(
                          Object.values(cleanerResult.statistics).flatMap((s) =>
                            typeof s === 'object' && s !== null ? Object.keys(s) : []
                          )
                        )
                      ).map((metric) => (
                        <tr key={metric} className="hover:bg-slate-900/40 transition-colors odd:bg-slate-900/20">
                          <td className="py-2 px-3 text-slate-300 capitalize">{metric}</td>
                          {Object.keys(cleanerResult.statistics!).map((col) => {
                            const val = cleanerResult.statistics![col]?.[metric];
                            return (
                              <td key={col} className="py-2 px-3 text-slate-300 tabular-nums">
                                {typeof val === 'number'
                                  ? Number.isInteger(val)
                                    ? val.toString()
                                    : val.toFixed(2)
                                  : val !== undefined
                                  ? String(val)
                                  : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Record Inspector Modal */}
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-100"
            onClick={() => setSelectedRecord(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-sm text-slate-100">Record Attribute Inspector</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Object.entries(selectedRecord).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="font-mono text-slate-400 font-medium">{key}</span>
                    <span className="font-mono text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {val !== null && val !== undefined ? String(val) : 'null'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
