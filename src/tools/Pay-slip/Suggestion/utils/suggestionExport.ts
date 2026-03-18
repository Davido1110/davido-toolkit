import * as XLSX from 'xlsx';
import type { EmployeeSuggestion, ScenarioKey, ScenarioSliders } from '../logic/suggestion';

const IMPORT_HEADERS = [
  'Mã NV',
  'Họ tên',
  'Pháp nhân',
  'Chức vụ',
  'Có HH',
  'TN_NB Thấp',
  'TN_NB Trung bình',
  'TN_NB Cao',
];

export function downloadSuggestionTemplate(): void {
  const example = [
    ['NV001', 'Nguyễn Văn A', 'Cty', 'Quản lý / Giám đốc',              'Có',    20_000_000, 35_000_000, 55_000_000],
    ['NV002', 'Trần Thị B',   'HKD', 'Trưởng/Phó phòng',                'Không', 15_000_000, 25_000_000, 40_000_000],
    ['',      'Nhân viên C',  'Cty', 'Nhân viên Đặc thù (KD, TT)',      'Có',    18_000_000, 28_000_000, 45_000_000],
    ['',      'Nhân viên D',  'Cty', 'Nhân viên (HC, KT, Kho...)',       'Không', 10_000_000, 15_000_000, 20_000_000],
  ];

  const data: (string | number)[][] = [IMPORT_HEADERS, ...example];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [10, 22, 10, 28, 8, 16, 18, 14].map((w) => ({ wch: w }));

  // Header style
  for (let c = 0; c < IMPORT_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'Template_GoiY_NhanVien.xlsx', { bookType: 'xlsx', cellStyles: true });
}

const HEADERS = [
  'Mã NV',
  'Họ tên',
  'Pháp nhân',
  'Lương HĐLĐ',
  'Phụ cấp',
  'Hoa hồng',
  'TN nội bộ',
];

// col index constants for styling
const C_MA_NV = 0;
const C_HO_TEN = 1;
const C_PHAP_NHAN = 2;
const C_LUONG = 3;
const C_PHU_CAP = 4;
const C_HOA_HONG = 5;
const C_TN_NOI_BO = 6;

const COL_WIDTHS = [10, 25, 12, 16, 12, 12, 16];

export function exportMasterDataExcel(
  suggestions: EmployeeSuggestion[],
  sliderState: Map<string, Record<ScenarioKey, ScenarioSliders>>,
  month: string
): void {
  const data: (string | number)[][] = [
    HEADERS,
    ...suggestions.map((sug) => {
      const empSliders = sliderState.get(sug.employee.id);
      const sl = empSliders?.mid ?? sug.mid.initialSliders;
      const { employee } = sug;
      const hhRate = employee.hasCommission ? sl.hhRate : 0;
      return [
        employee.empId || '',
        employee.name,
        employee.entity,
        sl.baseSalary,
        sl.pc,
        hhRate,   // stored as decimal (e.g. 0.0018) — formatted as % below
        '',       // TN nội bộ — blank
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = COL_WIDTHS.map((w) => ({ wch: w }));

  // Header row style
  for (let c = 0; c < HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }

  // Data row styles
  for (let rowIdx = 0; rowIdx < suggestions.length; rowIdx++) {
    const sheetRow = rowIdx + 1;
    for (let c = 0; c < HEADERS.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: sheetRow, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      const isNumber = c === C_LUONG || c === C_PHU_CAP || c === C_HOA_HONG || c === C_TN_NOI_BO;
      ws[addr].s = {
        alignment: { horizontal: isNumber || c === C_PHAP_NHAN ? 'center' : 'left', vertical: 'center' },
        numFmt:
          c === C_LUONG || c === C_PHU_CAP ? '#,##0' :
          c === C_HOA_HONG ? '0.00%' :
          c === C_TN_NOI_BO ? '#,##0' : undefined,
        font: c === C_HOA_HONG ? { color: { rgb: '16A34A' } } :
              c === C_MA_NV ? { color: { rgb: '6B7280' } } : undefined,
      };
      // right-align numbers
      if (c === C_LUONG || c === C_PHU_CAP || c === C_TN_NOI_BO) {
        ws[addr].s.alignment.horizontal = 'right';
      }
      if (c === C_HOA_HONG) {
        ws[addr].s.alignment.horizontal = 'center';
      }
      // entity pill — center
      if (c === C_HO_TEN) {
        ws[addr].s.alignment.horizontal = 'left';
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp');
  XLSX.writeFile(wb, `GoiY_TongHop_${month.replace('/', '-')}.xlsx`, {
    bookType: 'xlsx',
    cellStyles: true,
  });
}
