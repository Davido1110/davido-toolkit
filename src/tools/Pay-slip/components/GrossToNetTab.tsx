import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

const DEFAULT_NLD_RATE = 10.5;
const DEFAULT_CTY_RATE = 21.5;

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + ' đ';
}

function parseNum(s: string): number {
  const cleaned = s.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatInput(s: string): string {
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('vi-VN');
}

function InputField({
  label, value, onChange, suffix, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formatInput(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
        {suffix && <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function RateField({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          className="w-28 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
      </div>
    </div>
  );
}

function SectionRow({ label, value }: { label: string; value: number }) {
  const isZero = value === 0;
  const isNeg = value < 0;
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${isNeg ? 'text-red-500' : 'text-gray-800'}`}>
        {isZero ? '—' : isNeg ? `− ${fmt(-value)}` : fmt(value)}
      </span>
    </div>
  );
}

function PaySlipCard({
  name, gross, bhBaseNum, kpi, phuCap, thuNhapNLD,
  bhxhNLD, nldRateNum, netNum,
  bhxhCty, ctyRateNum, chiPhiDN,
}: {
  name: string; gross: number; bhBaseNum: number; kpi: number; phuCap: number; thuNhapNLD: number;
  bhxhNLD: number; nldRateNum: number; netNum: number;
  bhxhCty: number; ctyRateNum: number; chiPhiDN: number;
}) {
  const now = new Date();
  const month = `Tháng ${now.getMonth() + 1} / ${now.getFullYear()}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-start border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Phiếu lương</p>
          <p className="font-semibold text-gray-900 text-base">{name || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Kỳ lương</p>
          <p className="font-semibold text-gray-900">{month}</p>
        </div>
      </div>

      {/* Section 1: Lương & BHXH NLĐ → Net */}
      <div className="px-6 py-4 border-b border-gray-100">
        <SectionRow label="Lương Gross (HĐLĐ)" value={gross} />
        <SectionRow label="Lương đóng bảo hiểm" value={bhBaseNum} />
        <SectionRow label={`BHXH NLĐ đóng (${nldRateNum}%)`} value={-bhxhNLD} />
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-gray-900 text-sm">Lương Net</span>
          <span className="font-bold text-gray-900 text-base tabular-nums">{fmt(netNum)}</span>
        </div>
      </div>

      {/* Section 2: Thu nhập NLĐ */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Thu nhập người lao động</p>
        <SectionRow label="Lương Net" value={netNum} />
        <SectionRow label="KPI dự kiến" value={kpi} />
        <SectionRow label="Phụ cấp" value={phuCap} />
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">Thu nhập NLĐ</span>
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5 whitespace-nowrap">
              trước thuế TNCN
            </span>
          </div>
          <span className="font-bold text-green-600 text-base tabular-nums ml-4">{fmt(thuNhapNLD)}</span>
        </div>
      </div>

      {/* Section 3: Quỹ lương DN */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Quỹ lương doanh nghiệp</p>
        <SectionRow label="Thu nhập NLĐ" value={thuNhapNLD} />
        <SectionRow label={`BHXH công ty đóng (${ctyRateNum}%)`} value={bhxhCty} />
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-gray-900 text-sm">Tổng quỹ lương vị trí</span>
          <span className="font-bold text-gray-900 text-base tabular-nums">{fmt(chiPhiDN)}</span>
        </div>
      </div>

      {/* Footer: Formulas */}
      <div className="px-6 py-4 bg-gray-50 text-xs text-gray-400 space-y-1">
        <p>Lương Net = Gross − BHXH NLĐ</p>
        <p>Thu nhập NLĐ = Lương Net + KPI + Phụ cấp</p>
        <p>Quỹ lương vị trí = Thu nhập NLĐ + BHXH công ty</p>
        <p>BHXH NLĐ = Lương đóng BH × {nldRateNum}% &nbsp;·&nbsp; BHXH Cty = Lương đóng BH × {ctyRateNum}%</p>
      </div>
    </div>
  );
}

function NetToGross() {
  const [name, setName] = useState('');
  const [luongNet, setLuongNet] = useState('');
  const [luongBH, setLuongBH] = useState('');
  const [phuCap, setPhuCap] = useState('');
  const [kpi, setKpi] = useState('');
  const [nldRate, setNldRate] = useState(String(DEFAULT_NLD_RATE));
  const [ctyRate, setCtyRate] = useState(String(DEFAULT_CTY_RATE));
  const captureRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function renderCanvas() {
    if (!captureRef.current) return null;
    return html2canvas(captureRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  }

  async function handleCapture() {
    setCopying(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopying(false);
      });
    } catch {
      setCopying(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `phieu-luong-${name || 'NV'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  const netNum     = parseNum(luongNet);
  const bhBaseNum  = parseNum(luongBH);
  const phuCapNum  = parseNum(phuCap);
  const kpiNum     = parseNum(kpi);
  const nldRateNum = parseFloat(nldRate) || 0;
  const ctyRateNum = parseFloat(ctyRate) || 0;

  // Net = Gross − BHXH NLĐ  →  Gross = Net + BHXH NLĐ
  const bhxhNLD    = Math.round(bhBaseNum * (nldRateNum / 100));
  const gross      = netNum + bhxhNLD;
  const bhxhCty    = Math.round(bhBaseNum * (ctyRateNum / 100));
  // Thu nhập NLĐ = Net + KPI + Phụ cấp
  const thuNhapNLD = netNum + kpiNum + phuCapNum;
  // Chi phí DN = Thu nhập NLĐ + BHXH Cty
  const chiPhiDN   = thuNhapNLD + bhxhCty;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Input form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Nhập liệu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ tên nhân viên"
              />
            </div>
            <InputField label="Lương Net" value={luongNet} onChange={setLuongNet} suffix="đ" hint="Lương thực nhận mục tiêu" />
            <InputField label="Lương đóng bảo hiểm" value={luongBH} onChange={setLuongBH} suffix="đ" hint="Mức lương tính BHXH" />
            <InputField label="Phụ cấp" value={phuCap} onChange={setPhuCap} suffix="đ" />
            <InputField label="KPI dự kiến" value={kpi} onChange={setKpi} suffix="đ" />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Tỷ lệ bảo hiểm</p>
            <div className="flex gap-6">
              <RateField label="Mức đóng NLĐ" value={nldRate} onChange={(v) => {
                setNldRate(v);
                const nld = parseFloat(v) || 0;
                setCtyRate(String(Math.round((32 - nld) * 10) / 10));
              }} />
              <RateField label="Mức đóng Cty" value={ctyRate} onChange={(v) => {
                setCtyRate(v);
                const cty = parseFloat(v) || 0;
                setNldRate(String(Math.round((32 - cty) * 10) / 10));
              }} />
            </div>
          </div>
        </div>

        {netNum > 0 && (
          <div ref={captureRef}>
            <PaySlipCard
              name={name}
              gross={gross}
              bhBaseNum={bhBaseNum}
              kpi={kpiNum}
              phuCap={phuCapNum}
              thuNhapNLD={thuNhapNLD}
              bhxhNLD={bhxhNLD}
              nldRateNum={nldRateNum}
              netNum={netNum}
              bhxhCty={bhxhCty}
              ctyRateNum={ctyRateNum}
              chiPhiDN={chiPhiDN}
            />
          </div>
        )}
      </div>

      {netNum > 0 ? (
        <div className="flex gap-3">
          <button
            onClick={handleCapture}
            disabled={copying || downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {copying ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Đang sao chép...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy ảnh
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={copying || downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Đang tải...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Tải ảnh
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <p className="text-3xl mb-2">🔄</p>
          <p className="text-sm">Nhập lương Net để xem kết quả</p>
        </div>
      )}
    </div>
  );
}

export function GrossToNetTab() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <NetToGross />
    </div>
  );
}
