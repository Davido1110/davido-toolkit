import { useState } from 'react';

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
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formatInput(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
        {suffix && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
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

interface ResultRow {
  label: string;
  value: number;
  highlight?: boolean;
  indent?: boolean;
  bold?: boolean;
  separator?: boolean;
}

function ResultTable({ rows, formulas }: { rows: ResultRow[]; formulas: string[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Kết quả tính toán
        </h3>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) =>
            row.separator ? (
              <tr key={i}>
                <td colSpan={2} className="py-0">
                  <div className="border-t border-gray-100 dark:border-gray-700" />
                </td>
              </tr>
            ) : (
              <tr
                key={i}
                className={row.highlight ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
              >
                <td
                  className={`px-5 py-2.5 text-gray-700 dark:text-gray-300 ${
                    row.indent ? 'pl-8 text-gray-500 dark:text-gray-400' : ''
                  } ${row.bold ? 'font-semibold' : ''}`}
                >
                  {row.indent && (
                    <span className="text-gray-300 dark:text-gray-600 mr-1.5">└</span>
                  )}
                  {row.label}
                </td>
                <td
                  className={`px-5 py-2.5 text-right tabular-nums ${
                    row.value < 0
                      ? 'text-red-600 dark:text-red-400'
                      : row.highlight
                      ? 'text-green-700 dark:text-green-400 font-semibold'
                      : 'text-gray-900 dark:text-gray-100'
                  } ${row.bold ? 'font-semibold' : ''}`}
                >
                  {row.value < 0 ? '− ' + fmt(-row.value) : fmt(row.value)}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
        {formulas.map((f, i) => <p key={i}>{f}</p>)}
      </div>
    </div>
  );
}

function GrossToNet() {
  const [luongCung, setLuongCung] = useState('');
  const [luongBH, setLuongBH] = useState('');
  const [phuCap, setPhuCap] = useState('');
  const [kpi, setKpi] = useState('');
  const [nldRate, setNldRate] = useState(String(DEFAULT_NLD_RATE));
  const [ctyRate, setCtyRate] = useState(String(DEFAULT_CTY_RATE));

  const luongCungNum = parseNum(luongCung);
  const luongBHNum = parseNum(luongBH);
  const phuCapNum = parseNum(phuCap);
  const kpiNum = parseNum(kpi);
  const nldRateNum = parseFloat(nldRate) || 0;
  const ctyRateNum = parseFloat(ctyRate) || 0;

  const bhxhNLD = Math.round(luongBHNum * (nldRateNum / 100));
  const thuNhapNLD = luongCungNum + phuCapNum + kpiNum - bhxhNLD;
  const bhxhCty = Math.round(luongBHNum * (ctyRateNum / 100));
  const chiPhiDN = thuNhapNLD + bhxhCty;

  const rows: ResultRow[] = [
    { label: 'Lương cứng (Gross)', value: luongCungNum },
    { label: 'Phụ cấp', value: phuCapNum, indent: true },
    { label: 'KPI', value: kpiNum, indent: true },
    { label: 'BHXH người LĐ đóng', value: -bhxhNLD, indent: true },
    { separator: true, label: '', value: 0 },
    { label: 'Thu nhập NLĐ (Net)', value: thuNhapNLD, bold: true, highlight: true },
    { separator: true, label: '', value: 0 },
    { label: 'BHXH công ty đóng', value: bhxhCty, indent: true },
    { label: 'Chi phí doanh nghiệp trả', value: chiPhiDN, bold: true },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Nhập liệu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Lương cứng" value={luongCung} onChange={setLuongCung} suffix="đ" hint="Lương hợp đồng (Gross)" />
          <InputField label="Lương đóng bảo hiểm" value={luongBH} onChange={setLuongBH} suffix="đ" hint="Mức lương tính BHXH" />
          <InputField label="Phụ cấp" value={phuCap} onChange={setPhuCap} suffix="đ" />
          <InputField label="KPI" value={kpi} onChange={setKpi} suffix="đ" />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Tỷ lệ bảo hiểm</p>
          <div className="flex gap-6">
            <RateField label="Mức đóng NLĐ" value={nldRate} onChange={setNldRate} />
            <RateField label="Mức đóng Cty" value={ctyRate} onChange={setCtyRate} />
          </div>
        </div>
      </div>

      {luongCungNum > 0 ? (
        <ResultTable
          rows={rows}
          formulas={[
            `Thu nhập NLĐ = Lương cứng + Phụ cấp + KPI − BHXH NLĐ`,
            `BHXH NLĐ = Lương đóng BH × ${nldRateNum}%`,
            `Chi phí DN = Thu nhập NLĐ + Lương đóng BH × ${ctyRateNum}%`,
          ]}
        />
      ) : (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-sm">Nhập lương cứng để xem kết quả</p>
        </div>
      )}
    </div>
  );
}

function NetToGross() {
  const [thuNhapNet, setThuNhapNet] = useState('');
  const [luongBH, setLuongBH] = useState('');
  const [phuCap, setPhuCap] = useState('');
  const [kpi, setKpi] = useState('');
  const [nldRate, setNldRate] = useState(String(DEFAULT_NLD_RATE));
  const [ctyRate, setCtyRate] = useState(String(DEFAULT_CTY_RATE));

  const thuNhapNetNum = parseNum(thuNhapNet);
  const luongBHNum = parseNum(luongBH);
  const phuCapNum = parseNum(phuCap);
  const kpiNum = parseNum(kpi);
  const nldRateNum = parseFloat(nldRate) || 0;
  const ctyRateNum = parseFloat(ctyRate) || 0;

  // Net = Gross + PC + KPI - BHXH_NLD
  // => Gross = Net - PC - KPI + BHXH_NLD
  const bhxhNLD = Math.round(luongBHNum * (nldRateNum / 100));
  const luongCung = thuNhapNetNum - phuCapNum - kpiNum + bhxhNLD;
  const bhxhCty = Math.round(luongBHNum * (ctyRateNum / 100));
  const chiPhiDN = thuNhapNetNum + bhxhCty;

  const rows: ResultRow[] = [
    { label: 'Thu nhập NLĐ (Net)', value: thuNhapNetNum },
    { label: 'Phụ cấp', value: -phuCapNum, indent: true },
    { label: 'KPI', value: -kpiNum, indent: true },
    { label: 'BHXH người LĐ đóng', value: bhxhNLD, indent: true },
    { separator: true, label: '', value: 0 },
    { label: 'Lương cứng (Gross)', value: luongCung, bold: true, highlight: true },
    { separator: true, label: '', value: 0 },
    { label: 'BHXH công ty đóng', value: bhxhCty, indent: true },
    { label: 'Chi phí doanh nghiệp trả', value: chiPhiDN, bold: true },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Nhập liệu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Thu nhập NLĐ (Net)" value={thuNhapNet} onChange={setThuNhapNet} suffix="đ" hint="Lương thực nhận mục tiêu" />
          <InputField label="Lương đóng bảo hiểm" value={luongBH} onChange={setLuongBH} suffix="đ" hint="Mức lương tính BHXH" />
          <InputField label="Phụ cấp" value={phuCap} onChange={setPhuCap} suffix="đ" />
          <InputField label="KPI" value={kpi} onChange={setKpi} suffix="đ" />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Tỷ lệ bảo hiểm</p>
          <div className="flex gap-6">
            <RateField label="Mức đóng NLĐ" value={nldRate} onChange={setNldRate} />
            <RateField label="Mức đóng Cty" value={ctyRate} onChange={setCtyRate} />
          </div>
        </div>
      </div>

      {thuNhapNetNum > 0 ? (
        <ResultTable
          rows={rows}
          formulas={[
            `Lương cứng = Net − Phụ cấp − KPI + BHXH NLĐ`,
            `BHXH NLĐ = Lương đóng BH × ${nldRateNum}%`,
            `Chi phí DN = Net + Lương đóng BH × ${ctyRateNum}%`,
          ]}
        />
      ) : (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <p className="text-3xl mb-2">🔄</p>
          <p className="text-sm">Nhập thu nhập NLĐ (Net) để xem kết quả</p>
        </div>
      )}
    </div>
  );
}

type Mode = 'gross-to-net' | 'net-to-gross';

export function GrossToNetTab() {
  const [mode, setMode] = useState<Mode>('gross-to-net');

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Mode switcher */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setMode('gross-to-net')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'gross-to-net'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Gross → Net
        </button>
        <button
          onClick={() => setMode('net-to-gross')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'net-to-gross'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Net → Gross
        </button>
      </div>

      {mode === 'gross-to-net' ? <GrossToNet /> : <NetToGross />}
    </div>
  );
}
