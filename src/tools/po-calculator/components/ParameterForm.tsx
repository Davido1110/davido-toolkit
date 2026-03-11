import type { GlobalParams } from '../types';
import { useLang } from '../context/LangContext';

interface Props {
  params: GlobalParams;
  onChange: (params: GlobalParams) => void;
  onCalculate: () => void;
  disabled: boolean;
  loading: boolean;
}

export function ParameterForm({ params, onChange, onCalculate, disabled, loading }: Props) {
  const { t } = useLang();

  const set = (key: keyof GlobalParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      onChange({ ...params, [key]: val });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.ltLabel}
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={params.lt}
          onChange={set('lt')}
          className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.dLabel}
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={params.d}
          onChange={set('d')}
          className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>

      <button
        onClick={onCalculate}
        disabled={disabled || loading}
        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t.calculating : t.calculate}
      </button>
    </div>
  );
}
