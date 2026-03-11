import { PhotoFields } from '../types'
import { splitDate, buildValueFields } from '../utils/formatters'

export function buildHDPhotoData(f: PhotoFields): Record<string, string> {
  const total = parseInt(f.tong_gia_tri.replace(/\D/g, ''), 10) || 0
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
    ten_tai_khoan: f.ten_tai_khoan.toUpperCase(),
    so_tai_khoan: f.so_tai_khoan,
    ngan_hang: f.ngan_hang.toUpperCase(),
    ...buildValueFields(total),
  }
}

export function buildBBNTPhotoData(f: PhotoFields): Record<string, string> {
  const total = parseInt(f.tong_gia_tri.replace(/\D/g, ''), 10) || 0
  const hd = splitDate(f.ngay_ky)
  const bbnt = splitDate(f.ngay_bbnt)
  return {
    so_bbnt: f.so_bbnt,
    so_hop_dong: f.so_hop_dong,
    ngay: hd.ngay, thang: hd.thang, nam: hd.nam,
    ngay_bbnt: bbnt.ngay, thang_bbnt: bbnt.thang, nam_bbnt: bbnt.nam,
    ho_ten_upper: f.ho_ten.toUpperCase(),
    dia_chi: f.dia_chi,
    cccd: f.cccd,
    noi_dung_nghiem_thu_1: f.noi_dung_1,
    noi_dung_nghiem_thu_2: f.noi_dung_2,
    noi_dung_nghiem_thu_3: f.noi_dung_3,
    ...buildValueFields(total),
  }
}
