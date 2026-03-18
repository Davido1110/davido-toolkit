import { useRef, useState } from 'react';
import type { Employee, MonthlyInput, InputAction } from '../types';
import { parseCombinedExcel, downloadCombinedTemplate } from '../utils/excelImport';
import { countWorkingDays } from '../logic/payroll';

function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}

interface Props {
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  input: MonthlyInput;
  dispatch: React.Dispatch<InputAction>;
  onCalculate: () => void;
}

// ─── Numeric Input ────────────────────────────────────────────────────────────

interface NumericInputProps {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
}

function NumericInput({ value, onChange, placeholder, className }: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const displayValue = focused
    ? value || ''
    : value ? value.toLocaleString('vi-VN') : '';

  return (
    <input
      type={focused ? 'number' : 'text'}
      className={className}
      value={displayValue}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}


// ─── Month helpers ────────────────────────────────────────────────────────────

function currentMonthDefault(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function monthOptions(): string[] {
  const now = new Date();
  const options: string[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }
  return options.reverse();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MonthlyInputTab({ employees, onUpdateEmployees, input, dispatch, onCalculate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const incomeMap = new Map<string, number>(input.incomes.map((e) => [e.employeeId, e.amount]));
  const totalIncome = input.incomes.reduce((s, e) => s + e.amount, 0);
  const ctyTotal = employees.filter((e) => e.entity === 'Cty').reduce((s, e) => s + (incomeMap.get(e.id) ?? 0), 0);
  const hkdTotal = employees.filter((e) => e.entity === 'HKD').reduce((s, e) => s + (incomeMap.get(e.id) ?? 0), 0);

  const months = monthOptions();
  const displayMonth = input.month || currentMonthDefault();

  const inputCls = 'px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);
    try {
      const { employees: emps, incomes } = await parseCombinedExcel(file);
      if (emps.length === 0) {
        setImportError('File không có dữ liệu hợp lệ');
        return;
      }
      onUpdateEmployees(emps);
      dispatch({ type: 'IMPORT_INCOMES', incomes });
    } catch (err) {
      setImportError('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-5xl">

      {/* ── Monthly Config ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tháng</label>
          <select
            className={inputCls}
            value={displayMonth}
            onChange={(e) => {
              const m = e.target.value;
              dispatch({ type: 'SET_MONTH', month: m, workingDays: countWorkingDays(m) });
            }}
          >
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Công chuẩn
            <span className="ml-1 font-normal text-gray-400">(ngày)</span>
          </label>
          <input
            type="number"
            min={1}
            max={31}
            className={inputCls + ' w-full'}
            value={input.workingDays || ''}
            onChange={(e) => dispatch({ type: 'SET_WORKING_DAYS', workingDays: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">R1 — Doanh thu Cty (VNĐ)</label>
          <NumericInput className={inputCls + ' w-full'} value={input.r1} onChange={(r1) => dispatch({ type: 'SET_R1', r1 })} placeholder="500.000.000" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">R2 — Doanh thu HKD (VNĐ)</label>
          <NumericInput className={inputCls + ' w-full'} value={input.r2} onChange={(r2) => dispatch({ type: 'SET_R2', r2 })} placeholder="200.000.000" />
        </div>
      </div>

      {/* ── Import Section ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              Danh sách nhân viên & TN nội bộ tháng {displayMonth}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Import một file Excel chứa đầy đủ thông tin nhân viên và thu nhập nội bộ tháng này.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => downloadCombinedTemplate()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              📥 File mẫu
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📤 Import Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {importError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            ⚠️ {importError}
          </div>
        )}

        {employees.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center gap-3 h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-3xl">📂</span>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Chưa có dữ liệu</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Nhấn để import file Excel hoặc tải File mẫu</p>
            </div>
          </div>
        ) : (
          /* Data table */
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mã NV</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Họ tên</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Pháp nhân</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Lương HĐLĐ</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Phụ cấp</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Hoa hồng</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">TN nội bộ</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const income = incomeMap.get(emp.id) ?? 0;
                    return (
                      <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{emp.id}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{emp.name}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${emp.entity === 'Cty' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                            {emp.entity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{fmt(emp.baseSalary)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{fmt(emp.allowance)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {emp.hasCommission
                            ? <span className="text-green-600 dark:text-green-400">{(emp.commissionRate * 100).toFixed(2)}%</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">{fmt(income)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 font-semibold text-sm">
                    <td colSpan={2} className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      Tổng — {employees.length} nhân viên
                    </td>
                    <td />
                    <td />
                    <td />
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
                      Cty: {fmt(ctyTotal)}<br />HKD: {fmt(hkdTotal)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-900 dark:text-gray-100">{fmt(totalIncome)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Calculate ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={onCalculate}
          disabled={employees.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          🧮 Tính toán
        </button>
      </div>
    </div>
  );
}
