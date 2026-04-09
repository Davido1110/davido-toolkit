import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { BundleType } from '../types';
import { StatusBadge } from './StatusBadge';
import { DownloadButton } from './DownloadButton';

export function BundleView() {
  const { profile } = useAuth();
  const [activeBundle, setActiveBundle] = useState<BundleType>('onboarding');
  const { docs, loading } = useDocuments({ bundleFilter: activeBundle, statusFilter: 'approved' });
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [_acksLoading, setAcksLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    getDocs(query(
      collection(db, 'doc_vault_acknowledgments'),
      where('userId', '==', profile.uid)
    )).then((snap) => {
      if (!active) return;
      const docIds = new Set(snap.docs.map((d) => d.data().docId as string));
      setAcks(docIds);
      setAcksLoading(false);
    }).catch(() => setAcksLoading(false));
    return () => { active = false; };
  }, [profile]);

  const ackedCount = docs.filter((d) => acks.has(d.id)).length;

  const tabCls = (b: BundleType) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeBundle === b
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="p-6 space-y-6">
      {/* Bundle tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveBundle('onboarding')} className={tabCls('onboarding')}>
          📋 Onboarding
        </button>
        <button onClick={() => setActiveBundle('training')} className={tabCls('training')}>
          🎓 Đào tạo chuyên môn
        </button>
      </div>

      {/* Progress */}
      {!loading && docs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiến độ xác nhận</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{ackedCount} / {docs.length} tài liệu</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: docs.length > 0 ? `${(ackedCount / docs.length) * 100}%` : '0%' }}
            />
          </div>
          {ackedCount === docs.length && docs.length > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              ✅ Bạn đã xác nhận tất cả tài liệu trong bộ này!
            </p>
          )}
        </div>
      )}

      {/* Document list */}
      {loading && (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}</div>
      )}

      {!loading && docs.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">{activeBundle === 'onboarding' ? '📋' : '🎓'}</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Chưa có tài liệu nào trong bộ {activeBundle === 'onboarding' ? 'Onboarding' : 'Đào tạo chuyên môn'}.
          </p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {docs.map((d) => {
            const acked = acks.has(d.id);
            return (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <div className="flex-shrink-0 text-xl">
                  {acked ? (
                    <span title="Đã xác nhận" className="text-green-500">✅</span>
                  ) : (
                    <span title="Chưa xác nhận" className="text-amber-500">⏳</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.canonicalName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">v{d.versionMajor}.{d.versionMinor}</span>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
                {d.downloadURL && (
                  <DownloadButton
                    downloadURL={d.downloadURL}
                    filename={d.canonicalName}
                    label="Xem tài liệu"
                    className="flex-shrink-0 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
