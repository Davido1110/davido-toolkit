import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SKURow, GlobalParams } from '../types';
import { recomputeRow } from '../utils/calculator';
import { useLang } from '../context/LangContext';

interface Props {
  rows: SKURow[];
  allRows: SKURow[];
  params: GlobalParams;
  onUpdateRow: (id: string, updated: SKURow) => void;
}

type ColKey = 'sku_code' | 'category' | 'product_name' | 'attribute' | 'avg' | 'soh' | 'oo' | 'week_left' | 'bare_soh' | 'qty' | 'projected_soh';

interface ColDef {
  key: ColKey;
  width: number;
  align: 'left' | 'right';
  editable?: true;
}

const COL_DEFS: ColDef[] = [
  { key: 'sku_code',      width: 120, align: 'left' },
  { key: 'category',      width: 200, align: 'left' },
  { key: 'product_name',  width: 240, align: 'left' },
  { key: 'attribute',     width: 120, align: 'left' },
  { key: 'avg',           width: 80,  align: 'right', editable: true },
  { key: 'soh',           width: 80,  align: 'right', editable: true },
  { key: 'oo',            width: 80,  align: 'right', editable: true },
  { key: 'week_left',     width: 90,  align: 'right' },
  { key: 'bare_soh',      width: 110, align: 'right' },
  { key: 'qty',           width: 80,  align: 'right' },
  { key: 'projected_soh', width: 120, align: 'right' },
];

function rowBg(row: SKURow): string {
  if (row.stockout_during_lt) return 'bg-red-100 hover:bg-red-200';
  if (row.qty > 0) return 'bg-yellow-50 hover:bg-yellow-100';
  return 'hover:bg-gray-50';
}

function fmt(val: number): string {
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}

function fmtWeekLeft(val: number): string {
  if (!isFinite(val)) return '∞';
  return val % 1 === 0 ? val.toString() : val.toFixed(1);
}

interface EditableCellProps {
  value: number;
  onChange: (v: number) => void;
}

function EditableCell({ value, onChange }: EditableCellProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    if (!isNaN(n)) onChange(n);
  };
  return (
    <div className="editable-cell">
      <input
        type="number"
        min={0}
        step="any"
        defaultValue={value}
        key={value}
        onBlur={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

export function DataTable({ rows, allRows, params, onUpdateRow }: Props) {
  const { t } = useLang();
  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 40;

  // Column labels derived from translations
  const colLabels: Record<ColKey, string> = {
    sku_code:      t.colSku,
    category:      t.colCategory,
    product_name:  t.colName,
    attribute:     t.colAttr,
    avg:           'AVG',
    soh:           'SOH',
    oo:            'OO',
    week_left:     t.colWeekLeft,
    bare_soh:      t.colBareSoh,
    qty:           'QTY',
    projected_soh: t.colProjectedSOH,
  };

  const colHints: Partial<Record<ColKey, string>> = t.colHints;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const handleEdit = useCallback(
    (row: SKURow, key: 'avg' | 'soh' | 'oo', val: number) => {
      const updated = recomputeRow({ ...row, [key]: val }, params);
      onUpdateRow(row.id, updated);
    },
    [params, onUpdateRow],
  );

  const totalWidth = useMemo(() => COL_DEFS.reduce((s, c) => s + c.width, 0), []);
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex gap-6 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
        <span>{t.statTotal}: <strong>{allRows.length}</strong></span>
        <span>{t.statShown}: <strong>{rows.length}</strong></span>
        <span className="text-yellow-700 dark:text-yellow-400">
          {t.statNeedsOrder}: <strong>{rows.filter((r) => r.qty > 0).length}</strong>
        </span>
        <span className="text-red-700 dark:text-red-400">
          {t.statStockout}: <strong>{rows.filter((r) => r.stockout_during_lt).length}</strong>
        </span>
      </div>

      {/* Shared scroll container — header + rows scroll together */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {/* Sticky header — wrapper is direct child of the scroll container */}
        <div className="sticky top-0 z-10" style={{ minWidth: totalWidth }}>
          <div className="flex bg-blue-800 text-white text-xs font-semibold">
            {COL_DEFS.map((col) => {
              const hint = colHints[col.key];
              return (
                <div
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className={`px-3 py-2 border-r border-blue-700 last:border-r-0 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <div>{colLabels[col.key]}</div>
                  {hint && (
                    <div className="text-blue-200 font-normal mt-0.5" style={{ fontSize: '10px', lineHeight: '1.2' }}>
                      {hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Virtualized rows */}
        <div style={{ height: virtualizer.getTotalSize(), minWidth: totalWidth, position: 'relative' }}>
          {virtualItems.map((vItem) => {
            const row = rows[vItem.index];
            return (
              <div
                key={row.id}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{ position: 'absolute', top: vItem.start, left: 0, width: '100%', height: ROW_HEIGHT }}
                className={`flex items-center border-b border-gray-200 text-sm ${rowBg(row)}`}
              >
                {COL_DEFS.map((col) => {
                  const val = row[col.key];
                  return (
                    <div
                      key={col.key}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-3 h-full flex items-center border-r border-gray-200 last:border-r-0 ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      } ${col.editable ? 'bg-white/60' : ''}`}
                    >
                      {col.editable ? (
                        <EditableCell
                          value={val as number}
                          onChange={(v) => handleEdit(row, col.key as 'avg' | 'soh' | 'oo', v)}
                        />
                      ) : (
                        <span className="truncate" title={String(val)}>
                          {col.key === 'week_left'
                            ? fmtWeekLeft(val as number)
                            : typeof val === 'number'
                              ? fmt(val)
                              : (val as string)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
