import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getSOPs, getPublishedSOPs, deleteSOP, updateSOP } from '../lib/firestore';
import type { SOP } from '../types';

interface Props {
  onView: (sop: SOP) => void;
  onEdit: (sop: SOP) => void;
  onNew: () => void;
}

type ViewMode = 'list' | 'card' | 'table';
type GroupMode = 'none' | 'category';

const CATEGORY_COLORS: Record<string, string> = {
  Marketing:  'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Content:    'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Ecom:       'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Operations: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};
const catColor = (c: string) => CATEGORY_COLORS[c] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

function ActionButtons({ sop, isCMO, onView, onEdit, onToggle, onDelete }: {
  sop: SOP; isCMO: boolean;
  onView: () => void; onEdit: () => void;
  onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={onView}
        className="px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        Xem
      </button>
      {isCMO && <>
        <button onClick={onEdit}
          className="px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Sửa
        </button>
        <button onClick={onToggle}
          className="px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          {sop.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
        <button onClick={onDelete}
          className="px-2.5 py-1 text-xs text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          Xóa
        </button>
      </>}
    </div>
  );
}

// ── Row (list) ─────────────────────────────────────────────────────────────────
function RowItem({ sop, isCMO, onView, onEdit, onToggle, onDelete }: {
  sop: SOP; isCMO: boolean;
  onView: () => void; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div onClick={onView} className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-600 truncate">
            {sop.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${catColor(sop.category)}`}>
            {sop.category}
          </span>
          {sop.status === 'draft' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0">Nháp</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sop.description}</p>
      </div>
      <div className="text-xs text-gray-400 shrink-0 hidden sm:block">{sop.steps.length} bước</div>
      <div onClick={e => e.stopPropagation()}>
        <ActionButtons sop={sop} isCMO={isCMO} onView={onView} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function CardItem({ sop, isCMO, onView, onEdit, onToggle, onDelete }: {
  sop: SOP; isCMO: boolean;
  onView: () => void; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div onClick={onView} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColor(sop.category)}`}>
          {sop.category}
        </span>
        {sop.status === 'draft' && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Nháp</span>
        )}
      </div>
      <div>
        <h3 onClick={onView}
          className="font-semibold text-sm text-gray-900 dark:text-white hover:text-blue-600 cursor-pointer leading-snug">
          {sop.title}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {sop.description || '—'}
        </p>
      </div>
      <div onClick={e => e.stopPropagation()} className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-400">{sop.steps.length} bước</span>
        <ActionButtons sop={sop} isCMO={isCMO} onView={onView} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
function TableView({ sops, isCMO, onView, onEdit, onToggle, onDelete }: {
  sops: SOP[]; isCMO: boolean;
  onView: (s: SOP) => void; onEdit: (s: SOP) => void;
  onToggle: (s: SOP) => void; onDelete: (s: SOP) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tên SOP</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Danh mục</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Trạng thái</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Bước</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {sops.map(sop => (
            <tr key={sop.id} onClick={() => onView(sop)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
              <td className="px-4 py-2.5">
                <span className="font-medium text-gray-900 dark:text-white">
                  {sop.title}
                </span>
                {sop.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-xs">{sop.description}</p>
                )}
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catColor(sop.category)}`}>{sop.category}</span>
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  sop.status === 'published'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>{sop.status === 'published' ? 'Published' : 'Nháp'}</span>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell">{sop.steps.length}</td>
              <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                <ActionButtons sop={sop} isCMO={isCMO}
                  onView={() => onView(sop)} onEdit={() => onEdit(sop)}
                  onToggle={() => onToggle(sop)} onDelete={() => onDelete(sop)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SOPList({ onView, onEdit, onNew }: Props) {
  const { profile } = useAuth();
  const isCMO = profile?.role === 'admin';
  const isLead = profile?.role === 'manager';

  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [groupMode, setGroupMode] = useState<GroupMode>('category');

  async function load() {
    setLoading(true);
    try {
      const data = isCMO || isLead ? await getSOPs() : await getPublishedSOPs();
      setSops(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggleStatus(sop: SOP) {
    await updateSOP(sop.id, { status: sop.status === 'published' ? 'draft' : 'published' });
    load();
  }

  async function handleDelete(sop: SOP) {
    if (!confirm(`Xóa SOP "${sop.title}"?`)) return;
    await deleteSOP(sop.id);
    load();
  }

  const categories = ['all', ...Array.from(new Set(sops.map(s => s.category))).sort()];

  const filtered = sops.filter(s => {
    const matchSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchCat = filterCategory === 'all' || s.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  // Group by category if enabled
  const grouped: Record<string, SOP[]> = {};
  if (groupMode === 'category') {
    for (const sop of filtered) {
      if (!grouped[sop.category]) grouped[sop.category] = [];
      grouped[sop.category].push(sop);
    }
  } else {
    grouped['__all__'] = filtered;
  }

  function renderSops(list: SOP[]) {
    const actions = (sop: SOP) => ({
      onView: () => onView(sop),
      onEdit: () => onEdit(sop),
      onToggle: () => handleToggleStatus(sop),
      onDelete: () => handleDelete(sop),
    });

    if (viewMode === 'table') {
      return <TableView sops={list} isCMO={isCMO}
        onView={onView} onEdit={onEdit}
        onToggle={handleToggleStatus} onDelete={handleDelete} />;
    }
    if (viewMode === 'card') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(sop => <CardItem key={sop.id} sop={sop} isCMO={isCMO} {...actions(sop)} />)}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map(sop => <RowItem key={sop.id} sop={sop} isCMO={isCMO} {...actions(sop)} />)}
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Danh sách SOP
          <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
        </h2>
        {isCMO && (
          <button onClick={onNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Tạo SOP mới
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <input type="text" placeholder="Tìm kiếm SOP..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Category filter */}
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả danh mục' : c}</option>)}
        </select>

        {/* Status filter — CMO/Lead only */}
        {(isCMO || isLead) && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Tất cả</option>
            <option value="published">Published</option>
            <option value="draft">Nháp</option>
          </select>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Group toggle */}
        <button onClick={() => setGroupMode(g => g === 'none' ? 'category' : 'none')}
          className={`px-3 py-2 text-xs rounded-lg border transition-colors font-medium flex items-center gap-1.5 ${
            groupMode === 'category'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}>
          <span>{groupMode === 'category' ? '✓' : ''}</span>
          Nhóm danh mục
        </button>

        {/* View mode switcher */}
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {([
            { mode: 'list' as ViewMode, icon: '☰' },
            { mode: 'card' as ViewMode, icon: '⊞' },
            { mode: 'table' as ViewMode, icon: '▤' },
          ]).map(({ mode, icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm">Chưa có SOP nào{search ? ' phù hợp' : ''}.</div>
          {isCMO && !search && (
            <button onClick={onNew} className="mt-3 text-blue-500 text-sm hover:underline">Tạo SOP đầu tiên</button>
          )}
        </div>
      )}

      {/* Content */}
      {groupMode === 'category'
        ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, list]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${catColor(cat)}`}>{cat}</span>
              <span className="text-xs text-gray-400">{list.length} SOP</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            </div>
            {renderSops(list)}
          </div>
        ))
        : renderSops(filtered)
      }
    </div>
  );
}
