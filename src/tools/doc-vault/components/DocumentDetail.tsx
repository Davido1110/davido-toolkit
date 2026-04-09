import { useState } from 'react';
import { doc, updateDoc, addDoc, collection, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { deleteFile, isLocalURL, pathFromLocalURL } from '../lib/localFileStore';
import { DownloadButton } from './DownloadButton';
import { useAuth } from '../../../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { getAllowedTransitions } from '../utils/lifecycle';
import { DocRecord, DEPT_LABELS, LOAI_LABELS } from '../types';
import { StatusBadge } from './StatusBadge';
import { VersionHistory } from './VersionHistory';

interface Props {
  doc: DocRecord;
  onBack: () => void;
  onRequestChange: (doc: DocRecord) => void;
  onReload: () => void;
}

export function DocumentDetail({ doc: d, onBack, onRequestChange, onReload }: Props) {
  const { profile } = useAuth();
  const perm = usePermission(d);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ackDone, setAckDone] = useState(false);

  const role = (profile?.role ?? 'user') as 'user' | 'manager' | 'admin';
  const transitions = getAllowedTransitions(d.status, role);

  const handleTransition = async (toStatus: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const docRef = doc(db, 'doc_vault', d.id);
      const updates: Record<string, unknown> = {
        status: toStatus,
        updatedAt: serverTimestamp(),
      };
      if (toStatus === 'approved') {
        updates.approvedBy = profile?.uid;
        updates.approvedAt = serverTimestamp();
      }
      await updateDoc(docRef, updates);

      // Destroy: delete local file
      if (toStatus === 'destroyed' && d.currentStoragePath) {
        try {
          if (isLocalURL(d.downloadURL)) {
            await deleteFile(pathFromLocalURL(d.downloadURL));
          }
          await updateDoc(docRef, { currentStoragePath: '', downloadURL: '' });
        } catch {
          // File may already be gone
        }
      }
      onReload();
    } catch {
      alert('Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'doc_vault_acknowledgments'), {
        docId: d.id,
        docVersion: `${d.versionMajor}.${d.versionMinor}`,
        userId: profile.uid,
        userName: profile.name,
        acknowledgedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'doc_vault', d.id), {
        ackUserIds: arrayUnion(profile.uid),
        updatedAt: serverTimestamp(),
      });
      setAckDone(true);
      onReload();
    } catch {
      alert('Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const labelCls = 'text-xs text-gray-500 dark:text-gray-400';
  const valueCls = 'text-sm font-medium text-gray-900 dark:text-white';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Quay lại
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={d.status} />
            {d.acl.isSensitive && (
              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full">
                🔒 Nhạy cảm
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white break-all">{d.canonicalName}</h1>
        </div>
        {d.downloadURL && d.status !== 'destroyed' && (
          <DownloadButton
            downloadURL={d.downloadURL}
            filename={d.canonicalName}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          />
        )}
      </div>

      {/* Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Thông tin tài liệu</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><p className={labelCls}>Phòng ban</p><p className={valueCls}>{DEPT_LABELS[d.dept]} ({d.dept})</p></div>
          <div><p className={labelCls}>Loại</p><p className={valueCls}>{LOAI_LABELS[d.loai]}</p></div>
          <div><p className={labelCls}>Phiên bản</p><p className={`${valueCls} font-mono`}>v{d.versionMajor}.{d.versionMinor}</p></div>
          <div><p className={labelCls}>Danh mục</p><p className={valueCls}>{d.category || '—'}</p></div>
          <div><p className={labelCls}>Năm</p><p className={valueCls}>{d.year}</p></div>
          {d.project && <div><p className={labelCls}>Dự án</p><p className={valueCls}>{d.project}</p></div>}
          <div><p className={labelCls}>Người tạo</p><p className={valueCls}>{d.createdByName}</p></div>
          <div><p className={labelCls}>Ngày tạo</p><p className={valueCls}>{d.createdAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}</p></div>
          <div><p className={labelCls}>Cập nhật</p><p className={valueCls}>{d.updatedAt?.toDate?.().toLocaleDateString('vi-VN') ?? '—'}</p></div>
          {d.bundles.length > 0 && (
            <div className="md:col-span-2">
              <p className={labelCls}>Bộ tài liệu</p>
              <div className="flex gap-2 mt-1">
                {d.bundles.map((b) => (
                  <span key={b} className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
                    {b === 'onboarding' ? 'Onboarding' : 'Đào tạo'}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className={labelCls}>Yêu cầu xác nhận</p>
            <p className={valueCls}>{d.requiresAck ? 'Có' : 'Không'}</p>
          </div>
        </div>
        {d.description && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className={labelCls}>Mô tả</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{d.description}</p>
          </div>
        )}
      </div>

      {/* ACL panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Phân quyền truy cập</h2>
        {perm.canApprove ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{d.acl.viewers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Người xem</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{d.acl.editors.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Người chỉnh sửa</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{d.acl.approvers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Người duyệt</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {perm.canEdit ? '✏️ Bạn có quyền chỉnh sửa tài liệu này.' : '👁 Bạn có quyền xem tài liệu này.'}
          </p>
        )}
        {d.requiresAck && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {d.ackUserIds.length} / {d.acl.viewers.length + d.acl.editors.length + d.acl.approvers.length} người đã xác nhận
          </p>
        )}
      </div>

      {/* Acknowledge */}
      {perm.canAcknowledge && !ackDone && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Tài liệu yêu cầu xác nhận đã đọc</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Vui lòng xác nhận sau khi đọc xong nội dung.</p>
          </div>
          <button
            onClick={handleAcknowledge}
            disabled={busy}
            className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            Tôi đã đọc
          </button>
        </div>
      )}
      {ackDone && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-sm text-green-700 dark:text-green-300">
          ✅ Đã xác nhận thành công.
        </div>
      )}

      {/* Actions */}
      {(transitions.length > 0 || perm.canEdit) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Thao tác</h2>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.to}
                onClick={() => handleTransition(t.to, t.confirmMessage)}
                disabled={busy}
                className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                  t.variant === 'primary'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : t.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
            {perm.canEdit && d.status === 'approved' && (
              <button
                onClick={() => onRequestChange(d)}
                disabled={busy}
                className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Gửi yêu cầu thay đổi
              </button>
            )}
          </div>
        </div>
      )}

      {/* Version History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          <span>Lịch sử phiên bản</span>
          <span>{historyOpen ? '▲' : '▼'}</span>
        </button>
        {historyOpen && (
          <div className="mt-4">
            <VersionHistory docId={d.id} />
          </div>
        )}
      </div>
    </div>
  );
}
