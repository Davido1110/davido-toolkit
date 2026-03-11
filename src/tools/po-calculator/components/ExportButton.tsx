import { useState } from 'react';
import type { SKURow } from '../types';
import { exportToExcel } from '../utils/excelExporter';
import { useLang } from '../context/LangContext';

interface Props {
  rows: SKURow[];
}

export function ExportButton({ rows }: Props) {
  const { t } = useLang();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      exportToExcel(rows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || rows.length === 0}
      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {exporting ? t.exporting : t.exportBtn(rows.length)}
    </button>
  );
}
