import type { PayrollRow, ReconciliationSummary } from '../types';
import { exportReconciliationExcel } from '../utils/excelExport';

interface Props {
  rows: PayrollRow[];
  summary: ReconciliationSummary;
  month: string;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function ExportTab({ rows, summary, month }: Props) {
  const ctyRows = rows.filter((r) => r.entity === 'Cty');
  const hkdRows = rows.filter((r) => r.entity === 'HKD');

  function ExportCard({
    title,
    description,
    count,
    total,
    disabled,
    onExport,
    color,
  }: {
    title: string;
    description: string;
    count: number;
    total: number;
    disabled: boolean;
    onExport: () => void;
    color: 'blue' | 'purple' | 'green';
  }) {
    const colorMap = {
      blue: {
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        badge: 'bg-blue-600 text-white',
        btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      },
      purple: {
        border: 'border-purple-200 dark:border-purple-800',
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        badge: 'bg-purple-600 text-white',
        btn: 'bg-purple-600 hover:bg-purple-700 text-white',
      },
      green: {
        border: 'border-green-200 dark:border-green-800',
        bg: 'bg-green-50 dark:bg-green-900/10',
        badge: 'bg-green-600 text-white',
        btn: 'bg-green-600 hover:bg-green-700 text-white',
      },
    }[color];

    return (
      <div className={`rounded-xl border ${colorMap.border} ${colorMap.bg} p-5 flex flex-col gap-3`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap.badge}`}>
            {count} NV
          </span>
        </div>
        {total > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tổng TN: <span className="font-semibold tabular-nums">{fmt(total)} đ</span>
          </p>
        )}
        <button
          onClick={onExport}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colorMap.btn}`}
        >
          📥 Tải xuống Excel
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Xuất file bảng lương</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tháng {month}</p>
      </div>

      <div className="flex flex-col gap-4">
        <ExportCard
          title="Bảng lương — Cty Leonardo"
          description="Xuất bảng lương pháp nhân Công ty TNHH Leonardo"
          count={ctyRows.length}
          total={summary.ctyTotal}
          disabled={ctyRows.length === 0}
          onExport={() => exportReconciliationExcel(rows, summary, month)}
          color="blue"
        />
        <ExportCard
          title="Bảng lương — HKD Lê Khắc Thông"
          description="Xuất bảng lương hộ kinh doanh"
          count={hkdRows.length}
          total={summary.hkdTotal}
          disabled={hkdRows.length === 0}
          onExport={() => exportReconciliationExcel(rows, summary, month)}
          color="purple"
        />
        <ExportCard
          title="Đối soát tổng hợp"
          description={`Xuất file đối soát toàn công ty. Kết quả: ${summary.matched ? 'KHỚP ✅' : 'KHÔNG KHỚP ❌'}`}
          count={rows.length}
          total={summary.grandTotal}
          disabled={rows.length === 0}
          onExport={() => exportReconciliationExcel(rows, summary, month)}
          color="green"
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        {[
          { label: 'Tổng Cty', value: summary.ctyTotal, color: 'text-blue-700 dark:text-blue-300' },
          { label: 'Tổng HKD', value: summary.hkdTotal, color: 'text-purple-700 dark:text-purple-300' },
          { label: 'Tổng cộng', value: summary.grandTotal, color: 'text-gray-900 dark:text-gray-100' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm font-semibold tabular-nums ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
