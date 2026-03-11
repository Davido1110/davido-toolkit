import { useMemo } from 'react';
import type { SKURow, FilterState } from '../types';
import { useLang } from '../context/LangContext';

interface Props {
  rows: SKURow[];
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

function parseCategory(cat: string): [string, string, string] {
  const parts = cat.split('>').map((s) => s.trim());
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

export function FilterBar({ rows, filter, onChange }: Props) {
  const { t } = useLang();

  const categories = useMemo(() => {
    const l1 = new Set<string>();
    const l2Map: Record<string, Set<string>> = {};
    const l3Map: Record<string, Set<string>> = {};

    for (const row of rows) {
      const [a, b, c] = parseCategory(row.category);
      if (a) {
        l1.add(a);
        if (b) {
          if (!l2Map[a]) l2Map[a] = new Set();
          l2Map[a].add(b);
          if (c) {
            const key2 = `${a}>${b}`;
            if (!l3Map[key2]) l3Map[key2] = new Set();
            l3Map[key2].add(c);
          }
        }
      }
    }

    return { l1: [...l1].sort(), l2Map, l3Map };
  }, [rows]);

  const l2Options = filter.level1 ? [...(categories.l2Map[filter.level1] ?? [])].sort() : [];
  const l3Options =
    filter.level1 && filter.level2
      ? [...(categories.l3Map[`${filter.level1}>${filter.level2}`] ?? [])].sort()
      : [];

  const set = (key: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const update: FilterState = { ...filter, [key]: e.target.value };
    if (key === 'level1') { update.level2 = ''; update.level3 = ''; }
    if (key === 'level2') { update.level3 = ''; }
    onChange(update);
  };

  const inputCls = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200';

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      {/* Search */}
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.searchLabel}</label>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={filter.search}
          onChange={set('search')}
          className={inputCls}
        />
      </div>

      {/* Level 1 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.catL1}</label>
        <select value={filter.level1} onChange={set('level1')} className={`${inputCls} min-w-[140px]`}>
          <option value="">{t.all}</option>
          {categories.l1.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Level 2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.catL2}</label>
        <select value={filter.level2} onChange={set('level2')} disabled={!filter.level1} className={`${inputCls} min-w-[140px] disabled:opacity-50`}>
          <option value="">{t.all}</option>
          {l2Options.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Level 3 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t.catL3}</label>
        <select value={filter.level3} onChange={set('level3')} disabled={!filter.level2} className={`${inputCls} min-w-[140px] disabled:opacity-50`}>
          <option value="">{t.all}</option>
          {l3Options.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Clear */}
      {(filter.search || filter.level1) && (
        <button
          onClick={() => onChange({ search: '', level1: '', level2: '', level3: '' })}
          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {t.clear}
        </button>
      )}
    </div>
  );
}
