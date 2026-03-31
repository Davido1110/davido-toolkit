export type ContractType = 'photo' | 'stylist' | 'ecom' | 'livestream'

export interface CommonFields {
  // Bên B info
  ho_ten: string          // full name — stored as typed, uppercased in output
  cccd: string
  ngay_cap: string        // DD/MM/YYYY
  noi_cap: string
  dia_chi: string
  dien_thoai: string
  email: string

  // Contract info
  ngay_ky: string         // YYYY-MM-DD (date input)
  so_hop_dong: string

  // Bank info
  ten_tai_khoan: string
  so_tai_khoan: string
  ngan_hang: string

  // BBNT info
  ngay_bbnt: string       // YYYY-MM-DD
  so_bbnt: string
}

export interface PhotoFields extends CommonFields {
  type: 'photo'
  tong_gia_tri: string    // manual input (raw number string, e.g. "3200000")
  noi_dung_1: string      // Release description
  noi_dung_2: string      // Set up description
  noi_dung_3: string      // Retouch description
}

export interface StylistFields extends CommonFields {
  type: 'stylist'
  so_look_outdoor: string
  so_look_indoor: string
  // tong_gia_tri auto-calculated
}

export interface EcomFields extends CommonFields {
  type: 'ecom'
  so_tam: string
  drive_link_1: string
  drive_link_2: string
  drive_link_3: string
  // tong_gia_tri auto-calculated
}

export interface LivestreamFields extends CommonFields {
  type: 'livestream'
  kenh_livestream: string
  thoi_luong: string
  thu_lao: string          // raw number string, e.g. "5000000"
  ngay_thanh_toan: string  // day of month, e.g. "15"
  ngay_ket_thuc: string    // YYYY-MM-DD
  // Bank info used for payment reference — already in CommonFields
}

export type ContractFields = PhotoFields | StylistFields | EcomFields | LivestreamFields
