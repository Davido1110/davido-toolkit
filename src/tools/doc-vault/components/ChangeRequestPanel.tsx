import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { suggestCanonicalName } from '../utils/namingValidator';
import type { DeptCode, LoaiCode, DocFormat } from '../types';

interface Props {
  docId: string;
  docCanonicalName: string;
  dept: DeptCode;
  loai: LoaiCode;
  tenTaiLieu: string;
  format: DocFormat;
  currentVersionMajor: number;
  currentVersionMinor: number;
  onDone: () => void;
  onCancel: () => void;
}

export function ChangeRequestPanel({
  docId, docCanonicalName, dept, loai, tenTaiLieu, format,
  currentVersionMajor, currentVersionMinor, onDone, onCancel,
}: Props) {
  const { profile } = useAuth();
  const { upload, uploading, progress, error: uploadError, reset } = useFileUpload();
  const [file, setFile] = useState<File | null>(null);
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const newMajor = versionType === 'major' ? currentVersionMajor + 1 : currentVersionMajor;
  const newMinor = versionType === 'major' ? 0 : currentVersionMinor + 1;
  void suggestCanonicalName(dept, loai, '', tenTaiLieu, newMajor, newMinor, format); // used for side-effect awareness only

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !f.name.match(/\.(docx|xlsx)$/i)) {
      setError('Chỉ chấp nhận file .docx hoặc .xlsx');
      return;
    }
    setFile(f);
    setError('');
    reset();
  };

  const handleSubmit = async () => {
    if (!file) { setError('Vui lòng chọn file.'); return; }
    if (!changeNote.trim()) { setError('Vui lòng nhập ghi chú thay đổi.'); return; }
    if (!profile) return;

    setError('');
    try {
      const crId = crypto.randomUUID();
      const storagePath = `doc_vault/${docId}/staged/cr_${crId}/${file.name}`;
      const { downloadURL, storagePath: finalPath } = await upload(file, storagePath);

      await addDoc(collection(db, 'doc_vault_change_requests'), {
        docId,
        proposedVersionMajor: newMajor,
        proposedVersionMinor: newMinor,
        proposedStoragePath: finalPath,
        proposedDownloadURL: downloadURL,
        changeNote: changeNote.trim(),
        requestedBy: profile.uid,
        requestedByName: profile.name,
        requestedAt: serverTimestamp(),
        status: 'pending',
      });

      setDone(true);
    } catch {
      setError('Gửi yêu cầu thất bại. Vui lòng thử lại.');
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Yêu cầu thay đổi đã được gửi!</p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">Người duyệt sẽ xem xét và phê duyệt sớm.</p>
          <button onClick={onDone} className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">← Quay lại</button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Yêu cầu thay đổi phiên bản</h1>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
        Tài liệu hiện tại: <span className="font-mono font-medium text-gray-900 dark:text-white">{docCanonicalName}</span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        {/* Version type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Loại thay đổi</label>
          <div className="grid grid-cols-2 gap-3">
            {([['minor', `Thay đổi nhỏ → v${currentVersionMajor}.${currentVersionMinor + 1}`], ['major', `Thay đổi lớn → v${currentVersionMajor + 1}.0`]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setVersionType(val)}
                className={`p-3 rounded-lg border-2 text-sm text-left transition-colors ${versionType === val ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">File phiên bản mới</label>
          <input
            type="file"
            accept=".docx,.xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 file:text-sm hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
          {file && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đã chọn: {file.name}</p>}
        </div>

        {/* Change note */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ghi chú thay đổi <span className="text-red-500">*</span></label>
          <textarea
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            rows={3}
            placeholder="Mô tả những thay đổi trong phiên bản này..."
            className={inputCls}
          />
        </div>

        {/* Upload progress */}
        {uploading && (
          <div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đang tải lên... {progress}%</p>
          </div>
        )}

        {(error || uploadError) && (
          <p className="text-sm text-red-600 dark:text-red-400">{error || uploadError}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? `Đang tải lên (${progress}%)...` : 'Gửi yêu cầu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
