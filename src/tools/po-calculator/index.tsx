import { useState, useCallback, useMemo } from 'react';
import type { SKURow, GlobalParams, FilterState } from './types';
import { FileUpload } from './components/FileUpload';
import { ParameterForm } from './components/ParameterForm';
import { FilterBar } from './components/FilterBar';
import { DataTable } from './components/DataTable';
import { ExportButton } from './components/ExportButton';
import { GuideTab } from './components/GuideTab';
import { parseExcelFile } from './utils/excelParser';
import { LangProvider, useLang } from './context/LangContext';

type ActiveTab = 'tool' | 'guide';
type AppStep  = 'upload' | 'review';

const DEFAULT_PARAMS: GlobalParams = { lt: 12, d: 12 };
const DEFAULT_FILTER: FilterState  = { level1: '', level2: '', level3: '', search: '' };

function parseCategory(cat: string): [string, string, string] {
  const parts = cat.split('>').map((s) => s.trim());
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

function applyFilter(rows: SKURow[], filter: FilterState): SKURow[] {
  return rows.filter((row) => {
    if (filter.level1 || filter.level2 || filter.level3) {
      const [l1, l2, l3] = parseCategory(row.category);
      if (filter.level1 && l1 !== filter.level1) return false;
      if (filter.level2 && l2 !== filter.level2) return false;
      if (filter.level3 && l3 !== filter.level3) return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      return (
        row.sku_code.toLowerCase().includes(q) ||
        row.product_name.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

// Inner component — can safely use useLang() because LangProvider wraps it below
function POCalculatorInner() {
  const { lang, setLang, t } = useLang();
  const [activeTab, setActiveTab] = useState<ActiveTab>('tool');
  const [step, setStep]           = useState<AppStep>('upload');
  const [params, setParams]       = useState<GlobalParams>(DEFAULT_PARAMS);
  const [file, setFile]           = useState<File | null>(null);
  const [rows, setRows]           = useState<SKURow[]>([]);
  const [filter, setFilter]       = useState<FilterState>(DEFAULT_FILTER);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleCalculate = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseExcelFile(file, params);
      if (parsed.length === 0) {
        setError(t.errorNoRows);
        return;
      }
      setRows(parsed);
      setFilter(DEFAULT_FILTER);
      setStep('review');
    } catch (e) {
      setError(t.errorParse + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [file, params, t]);

  const handleUpdateRow = useCallback((id: string, updated: SKURow) => {
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const filteredRows = useMemo(() => applyFilter(rows, filter), [rows, filter]);

  const tabCls = (id: ActiveTab) =>
    `flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
      activeTab === id
        ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
        <button className={tabCls('tool')}  onClick={() => setActiveTab('tool')}>
          <span>📊</span> {t.tabTool}
        </button>
        <button className={tabCls('guide')} onClick={() => setActiveTab('guide')}>
          <span>📖</span> {t.tabGuide}
        </button>

        {/* Language toggle — pushed to the right */}
        <div className="ml-auto flex items-center">
          <button
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <span className="text-base leading-none">{lang === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Guide tab */}
      {activeTab === 'guide' && <GuideTab />}

      {/* Tool tab — Upload step */}
      {activeTab === 'tool' && step === 'upload' && (
        <div className="max-w-2xl mx-auto w-full px-6 py-8 flex flex-col gap-6">

          {/* Step 1 — Upload */}
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📦</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {t.uploadTitle}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.uploadSubtitle}</p>
            </div>
          </div>

          <FileUpload onFile={setFile} />

          <div className="flex justify-end">
            <a
              href="/po-calculator-template.xlsx"
              download="po-calculator-template.xlsx"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.downloadTemplate}
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Step 2 — Parameters */}
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚙️</span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                {t.paramsTitle}
              </h2>
              <ParameterForm
                params={params}
                onChange={setParams}
                onCalculate={handleCalculate}
                disabled={!file}
                loading={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Formula hint */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">🧮 {t.formulasLabel}</p>
            <p className="font-mono text-xs">QTY = max(0, AVG × (LT + D) − (SOH + OO))</p>
            <p className="font-mono text-xs">Projected SOH = SOH − AVG × LT + OO + QTY</p>
            {file && (
              <p className="mt-2 text-blue-600 dark:text-blue-400 text-xs">
                📅 {t.coverageTarget(params.lt, params.d)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tool tab — Review step */}
      {activeTab === 'tool' && step === 'review' && (
        <div className="flex-1 flex flex-col overflow-hidden px-4 py-4 gap-3">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                LT = <strong>{params.lt}w</strong> &nbsp; D = <strong>{params.d}w</strong>
              </span>
              <button onClick={() => setStep('upload')} className="text-sm text-brand-600 hover:underline">
                {t.editParams}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" />
                  {t.needsOrder}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
                  {t.stockoutRisk}
                </span>
              </div>
              <ExportButton rows={rows} />
            </div>
          </div>

          <FilterBar rows={rows} filter={filter} onChange={setFilter} />

          <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
            {filteredRows.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400">
                {t.statNoMatch}
              </div>
            ) : (
              <DataTable
                rows={filteredRows}
                allRows={rows}
                params={params}
                onUpdateRow={handleUpdateRow}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function POCalculator() {
  return (
    <LangProvider>
      <POCalculatorInner />
    </LangProvider>
  );
}
