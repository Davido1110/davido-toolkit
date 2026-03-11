import { EcomFields } from '../types'
import { splitDate, buildValueFields } from '../utils/formatters'

const RATE_PER_PHOTO = 60_000

export function calcEcomTotal(f: EcomFields) {
  const soTam = parseInt(f.so_tam, 10) || 0
  return { soTam, total: soTam * RATE_PER_PHOTO }
}

export function buildHDEcomData(f: EcomFields): Record<string, string> {
  const { total } = calcEcomTotal(f)
  const { ngay, thang, nam } = splitDate(f.ngay_ky)
  return {
    so_hop_dong: f.so_hop_dong,
    ngay, thang, nam,
    ho_ten_display: f.ho_ten,
    cccd: f.cccd,
    noi_cap: f.noi_cap,
    dia_chi: f.dia_chi,
    dien_thoai: f.dien_thoai,
    email: f.email,
    ten_tai_khoan: f.ten_tai_khoan.toUpperCase(),
    so_tai_khoan: f.so_tai_khoan,
    ngan_hang: f.ngan_hang.toUpperCase(),
    ...buildValueFields(total),
  }
}

export function buildBBNTEcomData(f: EcomFields): Record<string, string> {
  const { soTam, total } = calcEcomTotal(f)
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
    so_tam: String(soTam),
    drive_link_1: f.drive_link_1,
    drive_link_2: f.drive_link_2,
    drive_link_3: f.drive_link_3,
    ...buildValueFields(total),
  }
}
