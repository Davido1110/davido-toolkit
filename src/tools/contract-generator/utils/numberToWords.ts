const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
               'mười sáu', 'mười bảy', 'mười tám', 'mười chín']

function readHundreds(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const tens = Math.floor(rest / 10)
  const unit = rest % 10

  let result = h > 0 ? `${ones[h]} trăm` : ''

  if (rest === 0) return result
  if (rest < 10) {
    result += (h > 0 ? ' lẻ ' : '') + ones[unit]
  } else if (rest < 20) {
    result += (h > 0 ? ' ' : '') + teens[rest - 10]
  } else {
    result += (h > 0 ? ' ' : '') + ones[tens] + ' mươi'
    if (unit === 1) result += ' mốt'
    else if (unit === 5) result += ' lăm'
    else if (unit > 0) result += ' ' + ones[unit]
  }
  return result.trim()
}

export function numberToWords(num: number): string {
  if (num === 0) return 'không đồng'

  const billion = Math.floor(num / 1_000_000_000)
  const million = Math.floor((num % 1_000_000_000) / 1_000_000)
  const thousand = Math.floor((num % 1_000_000) / 1_000)
  const remainder = num % 1_000

  const parts: string[] = []
  if (billion > 0) parts.push(readHundreds(billion) + ' tỷ')
  if (million > 0) parts.push(readHundreds(million) + ' triệu')
  if (thousand > 0) parts.push(readHundreds(thousand) + ' nghìn')
  if (remainder > 0) parts.push(readHundreds(remainder))

  const result = parts.join(' ')
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng'
}

export function formatCurrency(num: number): string {
  return num.toLocaleString('vi-VN').replace(/\./g, '.')
}
