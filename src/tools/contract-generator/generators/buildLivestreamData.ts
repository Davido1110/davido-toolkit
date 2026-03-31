import { LivestreamFields } from '../types'
import { splitDate, buildValueFields } from '../utils/formatters'

export function buildHDLivestreamData(f: LivestreamFields): Record<string, string> {
  const total = parseInt(f.thu_lao.replace(/\D/g, ''), 10) || 0
  const { ngay, thang, nam } = splitDate(f.ngay_ky)
  const ket_thuc = splitDate(f.ngay_ket_thuc)
  return {
    so_hop_dong: f.so_hop_dong,
    ngay, thang, nam,
    ho_ten: f.ho_ten.toUpperCase(),
    cccd: f.cccd,
    noi_cap: f.noi_cap,
    dia_chi: f.dia_chi,
    dien_thoai: f.dien_thoai,
    email: f.email,
    kenh_livestream: f.kenh_livestream,
    thoi_luong: f.thoi_luong,
    ngay_thanh_toan: f.ngay_thanh_toan,
    ngay_ket_thuc_ngay: ket_thuc.ngay,
    ngay_ket_thuc_thang: ket_thuc.thang,
    ngay_ket_thuc_nam: ket_thuc.nam,
    ...buildValueFields(total),
  }
}
