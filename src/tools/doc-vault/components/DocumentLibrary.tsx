import { useState } from 'react';
import { DocRecord, DEPT_CODES, DEPT_LABELS, DocStatus } from '../types';
import { STATUS_LABELS } from '../utils/lifecycle';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../../../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { DownloadButton } from './DownloadButton';

interface Props {
  onView: (doc: DocRecord) => void;
}

const ALL_STATUSES: DocStatus[] = ['draft', 'review', 'approved', 'archived', 'destroyed', 'rejected'];

export function DocumentLibrary({ onView }: Props) {
  const { profile } = useAuth();
  const { docs, loading, error, reload } = useDocuments();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const isAdmin = profile?.role === 'admin';

  const filtered = docs.filter((d) => {
    if (!isAdmin && d.status === 'destroyed') return false;
    if (search && !d.canonicalName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept && d.dept !== filterDept) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });

  const inputCls = 'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Tìm kiếm tên tài liệu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} flex-1 min-w-48`}
        />
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className={inputCls}>
          <option value="">Tất cả phòng ban</option>
          {DEPT_CODES.map((c) => <option key={c} value={c}>{c} — {DEPT_LABELS[c]}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls}>
          <option value="">Tất cả trạng thái</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
          >
            ☰
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-2 text-sm ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
          >
            ⊞
          </button>
        </div>
        <button
          onClick={reload}
          className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          ↻
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-gray-500 dark:text-gray-400">Không có tài liệu nào.</p>
        </div>
      )}

      {/* Table view */}
      {!loading && filtered.length > 0 && viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tên tài liệu</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Phòng ban</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Phiên bản</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Cập nhật</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(doc)}
                      className="text-left font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs block"
                    >
                      {doc.canonicalName}
                    </button>
                    {doc.acl.isSensitive && (
                      <span className="text-xs text-red-500 dark:text-red-400">🔒 Nhạy cảm</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                      {doc.dept}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400 text-xs font-mono">
                    v{doc.versionMajor}.{doc.versionMinor}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400">
                    {doc.updatedAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.downloadURL && doc.status !== 'destroyed' && (
                        <DownloadButton
                          downloadURL={doc.downloadURL}
                          filename={doc.canonicalName}
                          label="↓"
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        />
                      )}
                      <button
                        onClick={() => onView(doc)}
                        className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors"
                      >
                        Xem
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card view */}
      {!loading && filtered.length > 0 && viewMode === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <StatusBadge status={doc.status} />
                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                  {doc.dept}
                </span>
              </div>
              <button
                onClick={() => onView(doc)}
                className="text-left text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 mb-2"
              >
                {doc.canonicalName}
              </button>
              {doc.acl.isSensitive && (
                <span className="text-xs text-red-500 dark:text-red-400 block mb-2">🔒 Nhạy cảm</span>
              )}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  v{doc.versionMajor}.{doc.versionMinor}
                </span>
                <div className="flex gap-2">
                  {doc.downloadURL && doc.status !== 'destroyed' && (
                    <DownloadButton
                      downloadURL={doc.downloadURL}
                      filename={doc.canonicalName}
                      label="↓"
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    />
                  )}
                  <button
                    onClick={() => onView(doc)}
                    className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Xem
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} tài liệu {search || filterDept || filterStatus ? '(đã lọc)' : ''}
      </p>
    </div>
  );
}
