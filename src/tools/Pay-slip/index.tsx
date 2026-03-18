import { useState, useReducer, useCallback } from 'react';
import type { Employee, MonthlyInput, InputAction, PayrollRow, ReconciliationSummary, ActiveTab } from './types';
import { DEFAULT_CONSTANTS, STORAGE_KEY } from './constants';
import { runPayroll, buildReconciliation, countWorkingDays } from './logic/payroll';
import { MonthlyInputTab } from './components/MonthlyInputTab';
import { PayrollResultTab } from './components/PayrollResultTab';
import { GuideTab } from './components/GuideTab';
import { SuggestionTab } from './Suggestion/components/SuggestionTab';

function currentMonthDefault(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${mm}/${now.getFullYear()}`;
}

const _defaultMonth = currentMonthDefault();
const INITIAL_INPUT: MonthlyInput = {
  month: _defaultMonth,
  workingDays: countWorkingDays(_defaultMonth),
  r1: 7_000_000_000,
  r2: 3_000_000_000,
  incomes: [],
};

function inputReducer(state: MonthlyInput, action: InputAction): MonthlyInput {
  switch (action.type) {
    case 'SET_MONTH':
      return { ...state, month: action.month, workingDays: action.workingDays };
    case 'SET_WORKING_DAYS':
      return { ...state, workingDays: action.workingDays };
    case 'SET_R1':
      return { ...state, r1: action.r1 };
    case 'SET_R2':
      return { ...state, r2: action.r2 };
    case 'SET_INCOME': {
      const exists = state.incomes.some((e) => e.employeeId === action.employeeId);
      if (exists) {
        return {
          ...state,
          incomes: state.incomes.map((e) =>
            e.employeeId === action.employeeId ? { ...e, amount: action.amount } : e
          ),
        };
      }
      return {
        ...state,
        incomes: [...state.incomes, { employeeId: action.employeeId, amount: action.amount }],
      };
    }
    case 'IMPORT_INCOMES':
      return { ...state, incomes: action.incomes };
    case 'RESET':
      return INITIAL_INPUT;
    default:
      return state;
  }
}

function loadEmployees(): Employee[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Employee[]) : [];
  } catch {
    return [];
  }
}

export default function PaySlipTool() {
  const [employees, setEmployeesRaw] = useState<Employee[]>(loadEmployees);
  const [consts] = useState(DEFAULT_CONSTANTS);
  const [input, dispatch] = useReducer(inputReducer, INITIAL_INPUT);
  const [payrollRows, setPayrollRows] = useState<PayrollRow[] | null>(null);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('input');

  const updateEmployees = useCallback((updated: Employee[]) => {
    setEmployeesRaw(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // quota exceeded — ignore
    }
  }, []);

  function handleCalculate() {
    const rows = runPayroll(employees, input, consts);
    const rec = buildReconciliation(rows, input);
    setPayrollRows(rows);
    setSummary(rec);
    setActiveTab('result');
  }

  const hasResult = payrollRows !== null && summary !== null;

  const tabCls = (id: ActiveTab, disabled = false) =>
    `flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
      disabled
        ? 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
        : activeTab === id
        ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 overflow-x-auto">
        <button className={tabCls('suggestion')} onClick={() => setActiveTab('suggestion')}>
          <span>💡</span> Gợi ý bộ số
        </button>

        <button className={tabCls('input')} onClick={() => setActiveTab('input')}>
          <span>📋</span> Bảng lương tháng
        </button>
        <button
          className={tabCls('result', !hasResult)}
          onClick={() => hasResult && setActiveTab('result')}
          disabled={!hasResult}
          title={!hasResult ? 'Chưa tính toán' : undefined}
        >
          <span>📊</span> Kết Quả
          {hasResult && payrollRows.some((r) => r.warnings.some((w) => w.level === 'error')) && (
            <span className="ml-1 w-2 h-2 rounded-full bg-red-500 inline-block" />
          )}
        </button>
        <button className={tabCls('guide')} onClick={() => setActiveTab('guide')}>
          <span>📖</span> Hướng Dẫn
        </button>

        {/* Employee count badge */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          <span>{employees.length} NV</span>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'input' && (
          <MonthlyInputTab
            employees={employees}
            onUpdateEmployees={updateEmployees}
            input={input}
            dispatch={dispatch}
            onCalculate={handleCalculate}
          />
        )}
        {activeTab === 'result' && hasResult && (
          <PayrollResultTab rows={payrollRows} summary={summary} month={input.month} />
        )}
        {activeTab === 'guide' && <GuideTab />}
        <div className={activeTab === 'suggestion' ? '' : 'hidden'}>
          <SuggestionTab employees={employees} />
        </div>
      </div>
    </div>
  );
}
