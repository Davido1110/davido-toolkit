import { numberToWords, formatCurrency } from './numberToWords'

/** Parse "YYYY-MM-DD" → { ngay, thang, nam } */
export function splitDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  return { ngay: d, thang: m, nam: y }
}

/** Suggest contract number from date + type suffix */
export function suggestSoHopDong(isoDate: string, type: 'photo' | 'stylist' | 'ecom') {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  if (type === 'ecom') return `${m}${d}/HĐLEONARDO-${y}`
  return `${m}${d}/${y}/TB-LEO`
}

export function suggestSoBbnt(isoDate: string) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${m}${d}/BBNTLEONARDO-${y}`
}

/** Build the full currency string with Vietnamese words */
export function buildValueFields(totalVnd: number) {
  return {
    tong_gia_tri: formatCurrency(totalVnd),
    tong_gia_tri_chu: numberToWords(totalVnd),
    thue_tncn: formatCurrency(Math.round(totalVnd * 0.1)),
    thuc_nhan: formatCurrency(Math.round(totalVnd * 0.9)),
  }
}
