import { StylistFields } from '../types'
import { splitDate, buildValueFields } from '../utils/formatters'
import { formatCurrency } from '../utils/numberToWords'

const RATE_OUTDOOR = 880_000
const RATE_INDOOR  = 660_000

export function calcStylistTotal(f: StylistFields) {
  const outdoor = parseInt(f.so_look_outdoor, 10) || 0
  const indoor  = parseInt(f.so_look_indoor, 10)  || 0
  return {
    outdoor,
    indoor,
    tong_outdoor: outdoor * RATE_OUTDOOR,
    tong_indoor:  indoor  * RATE_INDOOR,
    total:        outdoor * RATE_OUTDOOR + indoor * RATE_INDOOR,
  }
}

export function buildHDStylistData(f: StylistFields): Record<string, string> {
  const { total } = calcStylistTotal(f)
  const { ngay, thang, nam } = splitDate(f.ngay_ky)
  return {
    so_hop_dong: f.so_hop_dong,
    ngay, thang, nam,
    ho_ten_display: f.ho_ten,
    cccd: f.cccd,
    ngay_cap: f.ngay_cap,
    noi_cap: f.noi_cap,
    dia_chi: f.dia_chi,
    dien_thoai: f.dien_thoai,
    email: f.email,
    so_tai_khoan: f.so_tai_khoan,
    ngan_hang: f.ngan_hang.toUpperCase(),
    ...buildValueFields(total),
  }
}

export function buildBBNTStylistData(f: StylistFields): Record<string, string> {
  const { outdoor, indoor, tong_outdoor, tong_indoor, total } = calcStylistTotal(f)
  const hd   = splitDate(f.ngay_ky)
  const bbnt = splitDate(f.ngay_bbnt)
  return {
    so_bbnt: f.so_bbnt,
    so_hop_dong: f.so_hop_dong,
    ngay: hd.ngay, thang: hd.thang, nam: hd.nam,
    ngay_bbnt: bbnt.ngay, thang_bbnt: bbnt.thang, nam_bbnt: bbnt.nam,
    ho_ten_upper: f.ho_ten.toUpperCase(),
    dia_chi: f.dia_chi,
    cccd: f.cccd,
    so_look_outdoor: String(outdoor),
    tong_outdoor: formatCurrency(tong_outdoor),
    so_look_indoor: String(indoor),
    tong_indoor: formatCurrency(tong_indoor),
    ...buildValueFields(total),
  }
}
