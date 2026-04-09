import { useState } from 'react';
import { DEPT_CODES, DEPT_LABELS, LOAI_CODES, LOAI_LABELS } from '../types';
import { suggestCanonicalName, validateName } from '../utils/namingValidator';
import type { DeptCode, LoaiCode, DocFormat } from '../types';

const now = new Date();
const defaultYYYYMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

export function NamingGuide() {
  const [dept, setDept] = useState<DeptCode>('HR');
  const [loai, setLoai] = useState<LoaiCode>('SOP');
  const [yyyymm, setYyyymm] = useState(defaultYYYYMM);
  const [title, setTitle] = useState('');
  const [major, setMajor] = useState(1);
  const [minor, setMinor] = useState(0);
  const [format, setFormat] = useState<DocFormat>('docx');
  const [copied, setCopied] = useState(false);

  const generated = suggestCanonicalName(dept, loai, yyyymm, title, major, minor, format);
  const { valid } = validateName(generated);

  const handleCopy = () => {
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const selectCls = inputCls;
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Convention Reference */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quy ước đặt tên tài liệu</h2>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Định dạng chuẩn</p>
          <code className="block text-base font-mono text-blue-800 dark:text-blue-300">
            [DEPT]-[LOAI]-[YYYYMM]-[TenTaiLieu]-v[X.Y].[ext]
          </code>
          <div className="mt-3 space-y-1 text-xs text-blue-700 dark:text-blue-300">
            <p><strong>Ví dụ:</strong> <code>HR-SOP-202601-QuiTrinhOnboarding-v1.0.docx</code></p>
            <p><code>FIN-RPT-202604-BaoCaoQuiI2026-v1.0.xlsx</code></p>
            <p><code>GEN-POL-202601-NoiQuyLamViec-v2.1.docx</code></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DEPT table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Mã phòng ban (DEPT)</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-tl-lg">Mã</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-tr-lg">Phòng ban</th>
                </tr>
              </thead>
              <tbody>
                {DEPT_CODES.map((code) => (
                  <tr key={code} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900 dark:text-white">{code}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{DEPT_LABELS[code]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* LOAI table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Mã loại tài liệu (LOAI)</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-tl-lg">Mã</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-tr-lg">Loại</th>
                </tr>
              </thead>
              <tbody>
                {LOAI_CODES.map((code) => (
                  <tr key={code} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900 dark:text-white">{code}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{LOAI_LABELS[code]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Quy tắc phiên bản (vX.Y)</p>
          <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300">
            <li><strong>Major (X)</strong>: Tăng khi có thay đổi lớn về nội dung hoặc cấu trúc</li>
            <li><strong>Minor (Y)</strong>: Tăng khi chỉnh sửa nhỏ, bổ sung, sửa lỗi chính tả</li>
            <li>Phiên bản đầu tiên luôn là <code>v1.0</code></li>
          </ul>
        </div>
      </section>

      {/* Name Builder */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Công cụ tạo tên tài liệu</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Phòng ban (DEPT)</label>
              <select value={dept} onChange={(e) => setDept(e.target.value as DeptCode)} className={selectCls}>
                {DEPT_CODES.map((c) => <option key={c} value={c}>{c} — {DEPT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Loại tài liệu (LOAI)</label>
              <select value={loai} onChange={(e) => setLoai(e.target.value as LoaiCode)} className={selectCls}>
                {LOAI_CODES.map((c) => <option key={c} value={c}>{c} — {LOAI_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tháng/Năm (YYYYMM)</label>
              <input
                type="text"
                placeholder="202601"
                value={yyyymm}
                maxLength={6}
                onChange={(e) => setYyyymm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Tên tài liệu (tiếng Việt hoặc ASCII)</label>
              <input
                type="text"
                placeholder="Ví dụ: Quy Trình Onboarding Nhân Viên Mới"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>Major</label>
                <input type="number" min={1} value={major} onChange={(e) => setMajor(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Minor</label>
                <input type="number" min={0} value={minor} onChange={(e) => setMinor(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Định dạng</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as DocFormat)} className={selectCls}>
                  <option value="docx">docx</option>
                  <option value="xlsx">xlsx</option>
                </select>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border-2 ${valid ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:bg-red-900/20'}`}>
            <span className="text-lg">{valid ? '✅' : '❌'}</span>
            <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all">{generated}</code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {copied ? 'Đã copy!' : 'Copy'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
