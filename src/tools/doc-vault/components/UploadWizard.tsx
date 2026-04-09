import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { validateName, suggestCanonicalName, toAsciiPascalCase } from '../utils/namingValidator';
import { DEPT_CODES, DEPT_LABELS, LOAI_CODES, LOAI_LABELS, DocFormat, DeptCode, LoaiCode, BundleType } from '../types';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

interface UserOption { uid: string; name: string; email: string; }

const now = new Date();
const defaultYYYYMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export function UploadWizard({ onDone, onCancel }: Props) {
  const { profile } = useAuth();
  const { upload, uploading, progress, error: uploadError, reset: resetUpload } = useFileUpload();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: File + Naming
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dept, setDept] = useState<DeptCode>('HR');
  const [loai, setLoai] = useState<LoaiCode>('SOP');
  const [yyyymm, setYyyymm] = useState(defaultYYYYMM);
  const [title, setTitle] = useState('');
  const [major, setMajor] = useState(1);
  const [minor, setMinor] = useState(0);
  const [format, setFormat] = useState<DocFormat>('docx');
  const [nameError, setNameError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Metadata
  const [category, setCategory] = useState('');
  const [project, setProject] = useState('');
  const [description, setDescription] = useState('');
  const [bundles, setBundles] = useState<BundleType[]>([]);
  const [requiresAck, setRequiresAck] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);

  // Step 3: ACL
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [viewers, setViewers] = useState<string[]>([]);
  const [editors, setEditors] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  const canonicalName = suggestCanonicalName(dept, loai, yyyymm, title, major, minor, format);
  const nameValid = validateName(canonicalName).valid;

  // Auto-populate from file name
  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'xlsx') {
      setNameError('Chỉ chấp nhận file .docx hoặc .xlsx');
      return;
    }
    setFile(f);
    setFormat(ext as DocFormat);
    setNameError('');
    resetUpload();

    // Try to parse filename
    const { valid, parsed } = validateName(f.name);
    if (valid && parsed) {
      setDept(parsed.dept);
      setLoai(parsed.loai);
      setYyyymm(parsed.yyyymm);
      setTitle(parsed.tenTaiLieu);
      setMajor(parsed.versionMajor);
      setMinor(parsed.versionMinor);
    }
  };

  // Step 3: load users
  useEffect(() => {
    if (step !== 3) return;
    setUsersLoading(true);
    getDocs(query(collection(db, 'users'), where('status', '==', 'approved')))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as unknown as UserOption));
        setUsers(list);
        // Auto-add current user as viewer
        if (profile && !viewers.includes(profile.uid)) {
          setViewers((prev) => [...prev, profile.uid]);
        }
        setUsersLoading(false);
      })
      .catch(() => setUsersLoading(false));
  }, [step]);

  const toggleAcl = (list: string[], setList: (v: string[]) => void, uid: string) => {
    setList(list.includes(uid) ? list.filter((u) => u !== uid) : [...list, uid]);
  };

  const handleSubmit = async () => {
    if (!file || !profile) return;
    if (approvers.length === 0) { setSubmitError('Phải có ít nhất một người duyệt.'); return; }
    setSubmitError('');

    try {
      const docId = crypto.randomUUID();
      const storagePath = `doc_vault/${docId}/current/${canonicalName}`;
      const { downloadURL, storagePath: finalPath } = await upload(file, storagePath);

      const yyyymmStr = yyyymm.length === 6 ? yyyymm : defaultYYYYMM;
      const year = parseInt(yyyymmStr.slice(0, 4), 10);

      const docRef = await addDoc(collection(db, 'doc_vault'), {
        canonicalName,
        dept,
        loai,
        yyyymm: yyyymmStr,
        tenTaiLieu: toAsciiPascalCase(title) || title,
        versionMajor: major,
        versionMinor: minor,
        format,
        category: category.trim(),
        year,
        project: project.trim() || null,
        description: description.trim() || null,
        status: 'draft',
        currentStoragePath: finalPath,
        downloadURL,
        acl: { viewers, editors, approvers, isSensitive },
        bundles,
        requiresAck,
        ackUserIds: [],
        createdBy: profile.uid,
        createdByName: profile.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create first version record
      await addDoc(collection(db, 'doc_vault_versions'), {
        docId: docRef.id,
        versionMajor: major,
        versionMinor: minor,
        canonicalName,
        storagePath: finalPath,
        downloadURL,
        changeNote: 'Phiên bản đầu tiên',
        uploadedBy: profile.uid,
        uploadedByName: profile.name,
        uploadedAt: serverTimestamp(),
        status: 'active',
      });

      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UploadWizard] submit failed:', err);
      setSubmitError(`Lỗi: ${msg}`);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-base font-semibold text-green-800 dark:text-green-200">Tải lên thành công!</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">Tài liệu đang ở trạng thái Nháp. Gửi duyệt để hoàn tất.</p>
          <button onClick={onDone} className="mt-5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
            Về Kho Tài Liệu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
              {s}
            </div>
            {s < 3 && <div className={`h-0.5 w-8 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {step === 1 ? 'File & Tên' : step === 2 ? 'Thông tin' : 'Phân quyền'}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
          >
            <input ref={fileInputRef} type="file" accept=".docx,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file ? file.name : 'Kéo thả file hoặc click để chọn'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chấp nhận .docx và .xlsx</p>
          </div>

          {nameError && <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>}

          {/* Naming fields */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cấu trúc tên tài liệu</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Phòng ban (DEPT)</label>
                <select value={dept} onChange={(e) => setDept(e.target.value as DeptCode)} className={inputCls}>
                  {DEPT_CODES.map((c) => <option key={c} value={c}>{c} — {DEPT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Loại tài liệu (LOAI)</label>
                <select value={loai} onChange={(e) => setLoai(e.target.value as LoaiCode)} className={inputCls}>
                  {LOAI_CODES.map((c) => <option key={c} value={c}>{c} — {LOAI_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tháng/Năm (YYYYMM)</label>
                <input type="text" placeholder="202601" value={yyyymm} maxLength={6} onChange={(e) => setYyyymm(e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Định dạng</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as DocFormat)} className={inputCls}>
                  <option value="docx">docx</option>
                  <option value="xlsx">xlsx</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Tên tài liệu (tiếng Việt hoặc ASCII)</label>
                <input type="text" placeholder="Quy trình Onboarding nhân viên mới" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phiên bản Major</label>
                <input type="number" min={1} value={major} onChange={(e) => setMajor(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phiên bản Minor</label>
                <input type="number" min={0} value={minor} onChange={(e) => setMinor(Number(e.target.value))} className={inputCls} />
              </div>
            </div>

            {/* Live preview */}
            <div className={`flex items-center gap-2 p-3 rounded-lg border-2 ${nameValid ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
              <span>{nameValid ? '✅' : '❌'}</span>
              <code className="text-xs font-mono text-gray-900 dark:text-white break-all flex-1">{canonicalName}</code>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Hủy</button>
            <button
              onClick={() => { if (!file) { setNameError('Vui lòng chọn file.'); return; } if (!nameValid) { setNameError('Tên tài liệu không hợp lệ.'); return; } setNameError(''); setStep(2); }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Thông tin phân loại</h3>
            <div>
              <label className={labelCls}>Danh mục <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Ví dụ: Chính sách nhân sự, Hợp đồng dự án..." value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Dự án (tùy chọn)</label>
              <input type="text" placeholder="Tên dự án liên quan..." value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mô tả (tùy chọn)</label>
              <textarea rows={3} placeholder="Mô tả ngắn về tài liệu..." value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Bộ tài liệu</label>
              <div className="flex gap-4 mt-1">
                {([['onboarding', 'Onboarding'], ['training', 'Đào tạo chuyên môn']] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bundles.includes(val)}
                      onChange={() => setBundles((prev) => prev.includes(val) ? prev.filter((b) => b !== val) : [...prev, val])}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                Yêu cầu xác nhận đã đọc
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500" />
                <span className="text-red-600 dark:text-red-400">Tài liệu nhạy cảm 🔒</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">← Quay lại</button>
            <button
              onClick={() => { if (!category.trim()) { alert('Vui lòng nhập danh mục.'); return; } setStep(3); }}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Tiếp theo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phân quyền truy cập</h3>

            {usersLoading && <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />}

            {!usersLoading && users.length > 0 && (
              <>
                {([
                  ['Người xem', viewers, setViewers],
                  ['Người chỉnh sửa', editors, setEditors],
                  ['Người duyệt ★', approvers, setApprovers],
                ] as [string, string[], (v: string[]) => void][]).map(([label, list, setList]) => (
                  <div key={label}>
                    <p className={`${labelCls} mb-2`}>{label}</p>
                    <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                      {users.map((u) => (
                        <label key={u.uid} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={list.includes(u.uid)}
                            onChange={() => toggleAcl(list, setList, u.uid)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{u.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{u.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-200">Tóm tắt</p>
            <p className="text-blue-800 dark:text-blue-300 font-mono text-xs">{canonicalName}</p>
            <p className="text-blue-700 dark:text-blue-400 text-xs">Trạng thái: Nháp · {viewers.length} xem · {editors.length} sửa · {approvers.length} duyệt</p>
            {isSensitive && <p className="text-red-600 dark:text-red-400 text-xs">🔒 Tài liệu nhạy cảm</p>}
          </div>

          {(submitError || uploadError) && (
            <p className="text-sm text-red-600 dark:text-red-400">{submitError || uploadError}</p>
          )}

          {uploading && (
            <div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đang tải lên... {progress}%</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setStep(2)} disabled={uploading} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50">← Quay lại</button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? `Đang tải lên (${progress}%)...` : '⬆ Tải lên & Lưu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
