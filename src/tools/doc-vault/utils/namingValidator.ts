import { DeptCode, LoaiCode, DocFormat, DEPT_CODES, LOAI_CODES } from '../types';

export interface ParsedName {
  dept: DeptCode;
  loai: LoaiCode;
  yyyymm: string;
  tenTaiLieu: string;
  versionMajor: number;
  versionMinor: number;
  format: DocFormat;
}

const DEPT_PATTERN = DEPT_CODES.join('|');
const LOAI_PATTERN = LOAI_CODES.join('|');
const NAME_REGEX = new RegExp(
  `^(${DEPT_PATTERN})-(${LOAI_PATTERN})-(\\d{6})-([A-Za-z0-9]+)-v(\\d+)\\.(\\d+)\\.(docx|xlsx)$`
);

export function validateName(filename: string): { valid: boolean; parsed?: ParsedName; error?: string } {
  const match = filename.match(NAME_REGEX);
  if (!match) {
    return {
      valid: false,
      error: 'Tên file không đúng chuẩn. Định dạng: [DEPT]-[LOAI]-[YYYYMM]-[TenTaiLieu]-v[X.Y].[ext]',
    };
  }
  const [, dept, loai, yyyymm, tenTaiLieu, major, minor, ext] = match;
  const month = parseInt(yyyymm.slice(4, 6), 10);
  const year = parseInt(yyyymm.slice(0, 4), 10);
  if (month < 1 || month > 12) return { valid: false, error: 'Tháng trong tên file không hợp lệ (01–12).' };
  if (year < 2000 || year > 2100) return { valid: false, error: 'Năm trong tên file không hợp lệ.' };
  return {
    valid: true,
    parsed: {
      dept: dept as DeptCode,
      loai: loai as LoaiCode,
      yyyymm,
      tenTaiLieu,
      versionMajor: parseInt(major, 10),
      versionMinor: parseInt(minor, 10),
      format: ext as DocFormat,
    },
  };
}

export function buildCanonicalName(parts: ParsedName): string {
  return `${parts.dept}-${parts.loai}-${parts.yyyymm}-${parts.tenTaiLieu}-v${parts.versionMajor}.${parts.versionMinor}.${parts.format}`;
}

export function toAsciiPascalCase(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^A-Za-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function suggestCanonicalName(
  dept: DeptCode,
  loai: LoaiCode,
  yyyymm: string,
  title: string,
  major: number,
  minor: number,
  format: DocFormat
): string {
  const ascii = toAsciiPascalCase(title) || 'TenTaiLieu';
  return buildCanonicalName({ dept, loai, yyyymm, tenTaiLieu: ascii, versionMajor: major, versionMinor: minor, format });
}
