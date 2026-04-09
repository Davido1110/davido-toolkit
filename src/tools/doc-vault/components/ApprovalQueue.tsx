import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import { ChangeRequest } from '../types';
import { StatusBadge } from './StatusBadge';

export function ApprovalQueue() {
  const { profile } = useAuth();
  const { docs, loading, reload } = useDocuments({ statusFilter: 'review' });
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [crLoading, setCrLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getDocs(query(collection(db, 'doc_vault_change_requests'), where('status', '==', 'pending')))
      .then((snap) => {
        if (!active) return;
        setCrs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChangeRequest)));
        setCrLoading(false);
      })
      .catch(() => setCrLoading(false));
    return () => { active = false; };
  }, [busy]);

  const approveDoc = async (docId: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'doc_vault', docId), {
        status: 'approved',
        approvedBy: profile?.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      reload();
    } catch { alert('Phê duyệt thất bại.'); }
    finally { setBusy(false); }
  };

  const rejectDoc = async (docId: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'doc_vault', docId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      reload();
    } catch { alert('Từ chối thất bại.'); }
    finally { setBusy(false); }
  };

  const approveCR = async (cr: ChangeRequest) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'doc_vault_change_requests', cr.id), {
        status: 'approved',
        reviewedBy: profile?.uid,
        reviewedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'doc_vault', cr.docId), {
        versionMajor: cr.proposedVersionMajor,
        versionMinor: cr.proposedVersionMinor,
        currentStoragePath: cr.proposedStoragePath,
        downloadURL: cr.proposedDownloadURL,
        updatedAt: serverTimestamp(),
      });
      setCrs((prev) => prev.filter((c) => c.id !== cr.id));
    } catch { alert('Duyệt thay đổi thất bại.'); }
    finally { setBusy(false); }
  };

  const rejectCR = async (cr: ChangeRequest) => {
    const note = rejectNote[cr.id] ?? '';
    setBusy(true);
    try {
      await updateDoc(doc(db, 'doc_vault_change_requests', cr.id), {
        status: 'rejected',
        reviewedBy: profile?.uid,
        reviewedAt: serverTimestamp(),
        reviewNote: note,
      });
      setCrs((prev) => prev.filter((c) => c.id !== cr.id));
    } catch { alert('Từ chối thay đổi thất bại.'); }
    finally { setBusy(false); }
  };

  const btnPrimary = 'px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50';
  const btnDanger = 'px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50';

  return (
    <div className="p-6 space-y-8">
      {/* Document approvals */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Tài liệu chờ phê duyệt
          {!loading && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({docs.length})</span>}
        </h2>

        {loading && <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}</div>}

        {!loading && docs.length === 0 && (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm">Không có tài liệu nào cần duyệt.</p>
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.canonicalName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {d.dept} · {d.createdByName} · {d.updatedAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}
                  </p>
                </div>
                <StatusBadge status={d.status} />
                <div className="flex gap-2">
                  <button onClick={() => approveDoc(d.id)} disabled={busy} className={btnPrimary}>Phê duyệt</button>
                  <button onClick={() => rejectDoc(d.id)} disabled={busy} className={btnDanger}>Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Change request approvals */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Yêu cầu thay đổi phiên bản
          {!crLoading && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({crs.length})</span>}
        </h2>

        {crLoading && <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />}

        {!crLoading && crs.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Không có yêu cầu thay đổi nào đang chờ.</p>
        )}

        {!crLoading && crs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {crs.map((cr) => (
              <div key={cr.id} className="p-4 space-y-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Đề xuất v{cr.proposedVersionMajor}.{cr.proposedVersionMinor}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {cr.requestedByName} · {cr.requestedAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}
                    </p>
                    {cr.changeNote && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 italic">"{cr.changeNote}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveCR(cr)} disabled={busy} className={btnPrimary}>Chấp thuận</button>
                    <button onClick={() => rejectCR(cr)} disabled={busy} className={btnDanger}>Từ chối</button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Ghi chú từ chối (tùy chọn)..."
                  value={rejectNote[cr.id] ?? ''}
                  onChange={(e) => setRejectNote((prev) => ({ ...prev, [cr.id]: e.target.value }))}
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
