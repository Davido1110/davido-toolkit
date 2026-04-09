import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DocVersion } from '../types';
import { DownloadButton } from './DownloadButton';

export function VersionHistory({ docId }: { docId: string }) {
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getDocs(query(
      collection(db, 'doc_vault_versions'),
      where('docId', '==', docId),
      orderBy('uploadedAt', 'desc')
    )).then((snap) => {
      if (!active) return;
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocVersion)));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [docId]);

  if (loading) {
    return <div className="py-4 text-sm text-gray-500 dark:text-gray-400">Đang tải lịch sử...</div>;
  }

  if (versions.length === 0) {
    return <div className="py-4 text-sm text-gray-500 dark:text-gray-400">Chưa có lịch sử phiên bản.</div>;
  }

  return (
    <div className="space-y-3">
      {versions.map((v, i) => (
        <div
          key={v.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
        >
          <div className="flex-shrink-0 mt-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${i === 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
              v{v.versionMajor}.{v.versionMinor}
              {i === 0 && <span className="ml-1">★</span>}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.canonicalName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {v.uploadedByName} · {v.uploadedAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}
            </p>
            {v.changeNote && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{v.changeNote}"</p>
            )}
          </div>
          {v.downloadURL && (
            <DownloadButton
              downloadURL={v.downloadURL}
              filename={v.canonicalName}
              label="Tải xuống"
              className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-0 p-0 cursor-pointer"
            />
          )}
        </div>
      ))}
    </div>
  );
}
