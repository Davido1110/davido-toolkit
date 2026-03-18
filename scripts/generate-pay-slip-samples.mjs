import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../public');

// ── 1. Employee master file ─────────────────────────────────────────────────

const employees = [
  // Cty — Công ty TNHH Leonardo
  ['NV001', 'Nguyễn Văn A',   'Cty', 10_000_000, 'Có',    5,   1_000_000],
  ['NV002', 'Trần Thị Bảo',   'Cty', 12_000_000, 'Có',    3,   1_000_000],
  ['NV003', 'Lê Minh Cường',  'Cty',  8_000_000, 'Không', 0,   1_000_000],
  ['NV004', 'Phạm Thị Dung',  'Cty',  9_000_000, 'Không', 0,   1_000_000],
  ['NV005', 'Hoàng Văn Em',   'Cty', 15_000_000, 'Có',    4,   1_000_000],
  // HKD — Hộ kinh doanh Lê Khắc Thông
  ['NV006', 'Vũ Thị Phương',  'HKD',  8_000_000, 'Không', 0,   1_000_000],
  ['NV007', 'Đặng Quốc Giang','HKD', 10_000_000, 'Có',    6,   1_000_000],
  ['NV008', 'Bùi Thị Hà',     'HKD',  7_000_000, 'Không', 0,   1_000_000],
  ['NV009', 'Ngô Văn Inh',    'HKD', 11_000_000, 'Không', 0,   1_000_000],
  ['NV010', 'Đinh Thị Kim',   'HKD',  9_000_000, 'Có',    2.5, 1_000_000],
];

const empHeaders = ['Mã NV', 'Họ tên', 'Pháp nhân (Cty/HKD)', 'Lương HĐLĐ', 'Có HH (Có/Không)', 'Tỷ lệ HH (%)', 'Phụ cấp'];
const empData = [empHeaders, ...employees];

const empWs = XLSX.utils.aoa_to_sheet(empData);
empWs['!cols'] = [10, 22, 22, 14, 18, 14, 12].map(w => ({ wch: w }));

// Header style
for (let c = 0; c < empHeaders.length; c++) {
  const addr = XLSX.utils.encode_cell({ r: 0, c });
  empWs[addr].s = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };
}

const empWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(empWb, empWs, 'Danh sách NV');
const empPath = join(OUT, 'pay-slip-mau-nhan-vien.xlsx');
XLSX.writeFile(empWb, empPath, { bookType: 'xlsx', cellStyles: true });
console.log('✅ Employee sample:', empPath);


// ── 2. Monthly income file (03/2026) ────────────────────────────────────────
//   R1 (Cty revenue) = 500,000,000
//   R2 (HKD revenue) = 300,000,000

const incomes = [
  // NV001: Cty, HH 5% × 500M = 25M, gap = 51M-10M-1M-25M = 15M
  ['NV001', 51_000_000],
  // NV002: Cty, HH 3% × 500M = 15M, gap = 40M-12M-1M-15M = 12M
  ['NV002', 40_000_000],
  // NV003: Cty, no HH, gap = 18M-8M-1M = 9M
  ['NV003', 18_000_000],
  // NV004: Cty, no HH, gap = 16M-9M-1M = 6M
  ['NV004', 16_000_000],
  // NV005: Cty, HH 4% × 500M = 20M, gap = 45M-15M-1M-20M = 9M
  ['NV005', 45_000_000],
  // NV006: HKD, no HH, gap = 12M-8M-1M = 3M
  ['NV006', 12_000_000],
  // NV007: HKD, HH 6% × 300M = 18M, gap = 38M-10M-1M-18M = 9M
  ['NV007', 38_000_000],
  // NV008: HKD, no HH, gap = 10M-7M-1M = 2M
  ['NV008', 10_000_000],
  // NV009: HKD, no HH, gap = 20M-11M-1M = 8M
  ['NV009', 20_000_000],
  // NV010: HKD, HH 2.5% × 300M = 7.5M, gap = 25M-9M-1M-7.5M = 7.5M
  ['NV010', 25_000_000],
];

const incHeaders = ['Mã NV', 'Tổng TN nội bộ'];
const incData = [incHeaders, ...incomes];

const incWs = XLSX.utils.aoa_to_sheet(incData);
incWs['!cols'] = [{ wch: 10 }, { wch: 18 }];

for (let c = 0; c < incHeaders.length; c++) {
  const addr = XLSX.utils.encode_cell({ r: 0, c });
  incWs[addr].s = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '166534' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

// Add a note row at the bottom
const noteRow = incomes.length + 2;
const noteAddr = XLSX.utils.encode_cell({ r: noteRow, c: 0 });
incWs[noteAddr] = { t: 's', v: '* R1 (Cty) = 500,000,000  |  R2 (HKD) = 300,000,000  |  Tháng 03/2026' };

const incWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(incWb, incWs, 'Thu nhập tháng 03-2026');
const incPath = join(OUT, 'pay-slip-mau-thu-nhap-03-2026.xlsx');
XLSX.writeFile(incWb, incPath, { bookType: 'xlsx', cellStyles: true });
console.log('✅ Income sample:  ', incPath);

console.log('\nDone. Files saved to /public/ — accessible at:');
console.log('  /pay-slip-mau-nhan-vien.xlsx');
console.log('  /pay-slip-mau-thu-nhap-03-2026.xlsx');
