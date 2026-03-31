import { useState } from 'react'
import { ContractType, PhotoFields, StylistFields, EcomFields, LivestreamFields, ContractFields } from './types'
import { suggestSoHopDong, suggestSoBbnt } from './utils/formatters'
import { calcStylistTotal } from './generators/buildStylistData'
import { calcEcomTotal } from './generators/buildEcomData'
import { buildHDPhotoData, buildBBNTPhotoData } from './generators/buildPhotoData'
import { buildHDStylistData, buildBBNTStylistData } from './generators/buildStylistData'
import { buildHDEcomData, buildBBNTEcomData } from './generators/buildEcomData'
import { buildHDLivestreamData } from './generators/buildLivestreamData'
import { fillAndDownload } from './utils/fillTemplate'
import { formatCurrency } from './utils/numberToWords'

// ─── Type Selector ────────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  {
    id: 'photo' as ContractType,
    icon: '📷',
    label: 'Photographer',
    desc: 'Hợp đồng chụp ảnh sản phẩm, event & hậu kỳ',
  },
  {
    id: 'stylist' as ContractType,
    icon: '👗',
    label: 'Stylist',
    desc: 'Hợp đồng styling trang phục theo look',
  },
  {
    id: 'ecom' as ContractType,
    icon: '🛒',
    label: 'Ecom',
    desc: 'Hợp đồng chụp ảnh nền trắng e-commerce',
  },
  {
    id: 'livestream' as ContractType,
    icon: '🎙️',
    label: 'Livestream',
    desc: 'Hợp đồng dịch vụ host livestream',
  },
]

// ─── Empty form defaults ──────────────────────────────────────────────────────

function defaultCommon() {
  const today = new Date().toISOString().split('T')[0]
  return {
    ho_ten: '', cccd: '', ngay_cap: '', noi_cap: '',
    dia_chi: '', dien_thoai: '', email: '',
    ngay_ky: today, so_hop_dong: '',
    ten_tai_khoan: '', so_tai_khoan: '', ngan_hang: '',
    ngay_bbnt: today, so_bbnt: '',
  }
}

function defaultPhoto(): PhotoFields {
  return { ...defaultCommon(), type: 'photo', tong_gia_tri: '', noi_dung_1: '', noi_dung_2: '', noi_dung_3: '' }
}

// ─── Quick fill sample data (from original template files) ───────────────────

function quickFillPhoto(): PhotoFields {
  return {
    type: 'photo',
    ho_ten: 'Võ Trường Giang',
    cccd: '051096011559',
    ngay_cap: '14/03/2023',
    noi_cap: 'Cục trưởng Cục Cảnh sát QLHC về TTXH',
    dia_chi: 'Thôn Năng Tây 2, Xã Vệ Giang, tỉnh Quảng Ngãi',
    dien_thoai: '0786534135',
    email: '',
    ngay_ky: '2026-03-03',
    so_hop_dong: '0303/2026/TB-LEO',
    ten_tai_khoan: 'VÕ TRƯỜNG GIANG',
    so_tai_khoan: '0786534135',
    ngan_hang: 'MB BANK – NGÂN HÀNG QUÂN ĐỘI',
    tong_gia_tri: '3200000',
    noi_dung_1: 'Release sản phẩm (3 gói): Release thắt lưng Navo, Release ví Harvey, Release Briefcase Neo.',
    noi_dung_2: 'Set up hình ảnh (9 hình): Set up thắt lưng Nicholas & túi Damon.',
    noi_dung_3: 'Retouch hình ảnh (29 hình): Retouch thêm thắt lưng Navo (2 hình), Retouch thêm hình Briefcase Neo (14 hình), Retouch hình thắt lưng Nigel - mẫu tây (4 hình), Retouch hình túi tote Damon - mẫu tây (9 hình).',
    ngay_bbnt: '2026-03-03',
    so_bbnt: '0303/BBNTLEONARDO-2026',
  }
}

function quickFillStylist(): StylistFields {
  return {
    type: 'stylist',
    ho_ten: 'Nguyễn Hà Minh Trí',
    cccd: '079201026635',
    ngay_cap: '26/11/2025',
    noi_cap: 'Cục trưởng Cục Cảnh sát QLHC về TTXH TP.HCM',
    dia_chi: '155 Tô Ngọc Vân, Hiệp Bình, TP.HCM',
    dien_thoai: '0981644485',
    email: 'toriisntme@gmail.com',
    ngay_ky: '2026-02-04',
    so_hop_dong: '0402/2026/TB-LEO',
    ten_tai_khoan: 'NGUYỄN HÀ MINH TRÍ',
    so_tai_khoan: '102871104669',
    ngan_hang: 'VIETIN BANK – NGÂN HÀNG THƯƠNG MẠI',
    so_look_outdoor: '3',
    so_look_indoor: '2',
    ngay_bbnt: '2026-02-04',
    so_bbnt: '0402/BBNTLEONARDO-2026',
  }
}

function quickFillLivestream(): LivestreamFields {
  return {
    type: 'livestream',
    ho_ten: 'Nguyễn Thị Mai',
    cccd: '079201012345',
    ngay_cap: '01/01/2024',
    noi_cap: 'Cục trưởng Cục Cảnh sát QLHC về TTXH TP.HCM',
    dia_chi: '123 Lê Văn Việt, TP. Thủ Đức, TP.HCM',
    dien_thoai: '0901234567',
    email: 'nguyenthimai@gmail.com',
    ngay_ky: '2026-03-25',
    so_hop_dong: '25032026/HĐLEONARDO',
    ten_tai_khoan: 'NGUYỄN THỊ MAI',
    so_tai_khoan: '0901234567',
    ngan_hang: 'MB BANK – NGÂN HÀNG QUÂN ĐỘI',
    kenh_livestream: 'TikTok Shop Leonardo',
    thoi_luong: '02 ca/ngày, mỗi ca 02 tiếng',
    thu_lao: '5000000',
    ngay_thanh_toan: '15',
    ngay_ket_thuc: '2026-06-25',
    ngay_bbnt: '2026-03-25',
    so_bbnt: '',
  }
}

function quickFillEcom(): EcomFields {
  return {
    type: 'ecom',
    ho_ten: 'Ngô Nguyễn Tấn Lộc',
    cccd: '087098000062',
    ngay_cap: '',
    noi_cap: 'Cục trưởng cục cảnh sát quản lí hành chính về trật tự xã hội',
    dia_chi: '2P Hưng Phú, phường 09, Quận 8, Tp.HCM',
    dien_thoai: '0901237682',
    email: 'locngo25307@gmail.com',
    ngay_ky: '2026-02-02',
    so_hop_dong: '0202/HĐLEONARDO-2026',
    ten_tai_khoan: 'NGO NGUYEN TAN LOC',
    so_tai_khoan: '0901237682',
    ngan_hang: 'BIDV',
    so_tam: '211',
    drive_link_1: 'https://drive.google.com/drive/folders/1K332pwRLbWT-7O2yC0tpHUOmhH5lifK8?usp=drive_link',
    drive_link_2: 'https://drive.google.com/drive/folders/1kAVdiU0wIrgcGMmBekIXCosLRle7RDlb?usp=drive_link',
    drive_link_3: 'https://drive.google.com/drive/folders/1LK4AGAniwqKQ8iTCSZTwxRdbA4T1v1p9?usp=drive_link',
    ngay_bbnt: '2026-02-02',
    so_bbnt: '0202/BBNTLEONARDO-2026',
  }
}
function defaultStylist(): StylistFields {
  return { ...defaultCommon(), type: 'stylist', so_look_outdoor: '', so_look_indoor: '' }
}
function defaultEcom(): EcomFields {
  return { ...defaultCommon(), type: 'ecom', so_tam: '', drive_link_1: '', drive_link_2: '', drive_link_3: '' }
}
function defaultLivestream(): LivestreamFields {
  const today = new Date().toISOString().split('T')[0]
  return { ...defaultCommon(), type: 'livestream', kenh_livestream: '', thoi_luong: '', thu_lao: '', ngay_thanh_toan: '', ngay_ket_thuc: today }
}

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls + (props.className ? ' ' + props.className : '')} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={3} className={inputCls + ' resize-none ' + (props.className ?? '')} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-2 mb-4">
      {children}
    </h3>
  )
}

// ─── Summary box ──────────────────────────────────────────────────────────────

function SummaryBox({ fields }: { fields: ContractFields }) {
  let total = 0
  let extra: React.ReactNode = null

  if (fields.type === 'photo') {
    total = parseInt(fields.tong_gia_tri.replace(/\D/g, ''), 10) || 0
  } else if (fields.type === 'stylist') {
    const c = calcStylistTotal(fields)
    total = c.total
    extra = (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
        <div>Outdoor: {c.outdoor} look × 880.000 = {formatCurrency(c.tong_outdoor)} VNĐ</div>
        <div>Indoor: {c.indoor} look × 660.000 = {formatCurrency(c.tong_indoor)} VNĐ</div>
      </div>
    )
  } else if (fields.type === 'ecom') {
    const c = calcEcomTotal(fields)
    total = c.total
    extra = (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {c.soTam} tấm × 60.000 = {formatCurrency(c.total)} VNĐ
      </div>
    )
  } else {
    total = parseInt(fields.thu_lao.replace(/\D/g, ''), 10) || 0
    extra = (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Thù lao: {formatCurrency(total)} VNĐ/tháng
      </div>
    )
  }

  if (!total) return null
  const tax = Math.round(total * 0.1)
  const net = total - tax

  return (
    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 p-4 space-y-2">
      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Tóm tắt thanh toán</div>
      {extra}
      <div className="grid grid-cols-3 gap-2 text-sm mt-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Tổng giá trị</div>
          <div className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(total)} VNĐ</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Thuế TNCN (10%)</div>
          <div className="font-semibold text-red-500">- {formatCurrency(tax)} VNĐ</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Thực nhận</div>
          <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(net)} VNĐ</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContractGenerator() {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [contractType, setContractType] = useState<ContractType | null>(null)
  const [fields, setFields] = useState<ContractFields | null>(null)
  const [downloading, setDownloading] = useState<'hd' | 'bbnt' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function selectType(t: ContractType) {
    setContractType(t)
    if (t === 'photo') setFields(defaultPhoto())
    else if (t === 'stylist') setFields(defaultStylist())
    else if (t === 'ecom') setFields(defaultEcom())
    else setFields(defaultLivestream())
    setStep('form')
  }

  function update(key: string, value: string) {
    setFields(prev => prev ? { ...prev, [key]: value } as ContractFields : prev)
  }

  // When date fields are first populated, auto-fill suggestion if empty
  function handleDateChange(key: 'ngay_ky' | 'ngay_bbnt' | 'ngay_ket_thuc', value: string) {
    setFields(prev => {
      if (!prev) return prev
      const next = { ...prev, [key]: value } as ContractFields
      if (key === 'ngay_ky') next.so_hop_dong = suggestSoHopDong(value, prev.type)
      if (key === 'ngay_bbnt') next.so_bbnt = suggestSoBbnt(value)
      return next
    })
  }

  async function download(docType: 'hd' | 'bbnt') {
    if (!fields) return
    setError(null)
    setDownloading(docType)
    try {
      const name = fields.ho_ten.toUpperCase().replace(/\s+/g, '_')
      const date = fields.ngay_ky.replace(/-/g, '')

      if (fields.type === 'photo') {
        if (docType === 'hd') {
          await fillAndDownload('/templates/HD_Photo.docx', buildHDPhotoData(fields), `HD_Photo_${name}_${date}.docx`)
        } else {
          await fillAndDownload('/templates/BBNT_Photo.docx', buildBBNTPhotoData(fields), `BBNT_Photo_${name}_${date}.docx`)
        }
      } else if (fields.type === 'stylist') {
        if (docType === 'hd') {
          await fillAndDownload('/templates/HD_Stylist.docx', buildHDStylistData(fields), `HD_Stylist_${name}_${date}.docx`)
        } else {
          await fillAndDownload('/templates/BBNT_Stylist.docx', buildBBNTStylistData(fields), `BBNT_Stylist_${name}_${date}.docx`)
        }
      } else if (fields.type === 'ecom') {
        if (docType === 'hd') {
          await fillAndDownload('/templates/HD_Ecom.docx', buildHDEcomData(fields), `HD_Ecom_${name}_${date}.docx`)
        } else {
          await fillAndDownload('/templates/BBNT_Ecom.docx', buildBBNTEcomData(fields), `BBNT_Ecom_${name}_${date}.docx`)
        }
      } else {
        await fillAndDownload('/templates/HD_Livestream.docx', buildHDLivestreamData(fields), `HD_Livestream_${name}_${date}.docx`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setDownloading(null)
    }
  }

  // ── Type selector screen ────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contract Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Chọn loại hợp đồng cần tạo</p>
        <div className="grid gap-4">
          {CONTRACT_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => selectType(ct.id)}
              className="flex items-center gap-5 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left group"
            >
              <span className="text-4xl">{ct.icon}</span>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {ct.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{ct.desc}</div>
                <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">Tạo Hợp Đồng + Biên Bản Nghiệm Thu</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!fields) return null
  const ct = CONTRACT_TYPES.find(c => c.id === contractType)!

  function quickFill() {
    if (contractType === 'photo') setFields(quickFillPhoto())
    else if (contractType === 'stylist') setFields(quickFillStylist())
    else if (contractType === 'ecom') setFields(quickFillEcom())
    else setFields(quickFillLivestream())
  }

  // ── Form screen ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep('select')}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {ct.icon} Hợp Đồng {ct.label}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{ct.desc}</p>
        </div>
        <button
          onClick={quickFill}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          ⚡ Quick fill
        </button>
      </div>

      {/* Section: Bên B */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <SectionTitle>Thông tin Bên B</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Họ và tên">
            <Input value={fields.ho_ten} onChange={e => update('ho_ten', e.target.value)} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Số CCCD">
            <Input value={fields.cccd} onChange={e => update('cccd', e.target.value)} placeholder="012345678901" />
          </Field>
          <Field label="Ngày cấp CCCD">
            <Input value={fields.ngay_cap} onChange={e => update('ngay_cap', e.target.value)} placeholder="DD/MM/YYYY" />
          </Field>
          <Field label="Nơi cấp">
            <Input value={fields.noi_cap} onChange={e => update('noi_cap', e.target.value)} placeholder="Cục trưởng Cục Cảnh sát..." />
          </Field>
        </div>
        <Field label="Địa chỉ">
          <Input value={fields.dia_chi} onChange={e => update('dia_chi', e.target.value)} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số điện thoại">
            <Input value={fields.dien_thoai} onChange={e => update('dien_thoai', e.target.value)} placeholder="0901 234 567" />
          </Field>
          <Field label="Email">
            <Input type="email" value={fields.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" />
          </Field>
        </div>
      </div>

      {/* Section: Hợp Đồng */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <SectionTitle>Thông tin Hợp Đồng</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày ký">
            <Input type="date" value={fields.ngay_ky} onChange={e => handleDateChange('ngay_ky', e.target.value)} />
          </Field>
          <Field label="Số hợp đồng">
            <Input value={fields.so_hop_dong} onChange={e => update('so_hop_dong', e.target.value)} placeholder="Auto-generated" />
          </Field>
        </div>
      </div>

      {/* Section: Livestream details */}
      {fields.type === 'livestream' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <SectionTitle>Thông tin Livestream</SectionTitle>
          <Field label="Kênh Livestream">
            <Input value={fields.kenh_livestream} onChange={e => update('kenh_livestream', e.target.value)} placeholder="TikTok Shop Leonardo" />
          </Field>
          <Field label="Thời lượng">
            <Input value={fields.thoi_luong} onChange={e => update('thoi_luong', e.target.value)} placeholder="02 ca/ngày, mỗi ca 02 tiếng" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày thanh toán hàng tháng">
              <Input type="number" min="1" max="31" value={fields.ngay_thanh_toan} onChange={e => update('ngay_thanh_toan', e.target.value)} placeholder="15" />
            </Field>
            <Field label="Ngày kết thúc hợp đồng">
              <Input type="date" value={fields.ngay_ket_thuc} onChange={e => handleDateChange('ngay_ket_thuc', e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {/* Section: Thanh toán */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <SectionTitle>Thông tin thanh toán</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tên tài khoản">
            <Input value={fields.ten_tai_khoan} onChange={e => update('ten_tai_khoan', e.target.value)} placeholder="NGUYEN VAN A" />
          </Field>
          <Field label="Số tài khoản">
            <Input value={fields.so_tai_khoan} onChange={e => update('so_tai_khoan', e.target.value)} placeholder="0123456789" />
          </Field>
        </div>
        <Field label="Ngân hàng">
          <Input value={fields.ngan_hang} onChange={e => update('ngan_hang', e.target.value)} placeholder="MB BANK – NGÂN HÀNG QUÂN ĐỘI" />
        </Field>

        {/* Type-specific pricing */}
        {fields.type === 'photo' && (
          <Field label="Tổng giá trị hợp đồng (VNĐ)">
            <Input
              type="number"
              value={fields.tong_gia_tri}
              onChange={e => update('tong_gia_tri', e.target.value)}
              placeholder="3200000"
            />
          </Field>
        )}
        {fields.type === 'stylist' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số look Outdoor (880.000 VNĐ/look)">
              <Input type="number" min="0" value={fields.so_look_outdoor} onChange={e => update('so_look_outdoor', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Số look Indoor (660.000 VNĐ/look)">
              <Input type="number" min="0" value={fields.so_look_indoor} onChange={e => update('so_look_indoor', e.target.value)} placeholder="0" />
            </Field>
          </div>
        )}
        {fields.type === 'ecom' && (
          <Field label="Số tấm hình (60.000 VNĐ/tấm)">
            <Input type="number" min="0" value={fields.so_tam} onChange={e => update('so_tam', e.target.value)} placeholder="0" />
          </Field>
        )}
        {fields.type === 'livestream' && (
          <Field label="Thù lao (VNĐ/tháng)">
            <Input type="number" min="0" value={fields.thu_lao} onChange={e => update('thu_lao', e.target.value)} placeholder="5000000" />
          </Field>
        )}

        <SummaryBox fields={fields} />
      </div>

      {/* Section: BBNT */}
      {fields.type !== 'livestream' && <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <SectionTitle>Thông tin Biên Bản Nghiệm Thu</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày BBNT">
            <Input type="date" value={fields.ngay_bbnt} onChange={e => handleDateChange('ngay_bbnt', e.target.value)} />
          </Field>
          <Field label="Số BBNT">
            <Input value={fields.so_bbnt} onChange={e => update('so_bbnt', e.target.value)} placeholder="Auto-generated" />
          </Field>
        </div>

        {fields.type === 'photo' && (
          <>
            <Field label="Nội dung nghiệm thu #1 (Release)">
              <Textarea value={fields.noi_dung_1} onChange={e => update('noi_dung_1', e.target.value)} placeholder="Release sản phẩm (3 gói): ..." />
            </Field>
            <Field label="Nội dung nghiệm thu #2 (Set up)">
              <Textarea value={fields.noi_dung_2} onChange={e => update('noi_dung_2', e.target.value)} placeholder="Set up hình ảnh (9 hình): ..." />
            </Field>
            <Field label="Nội dung nghiệm thu #3 (Retouch)">
              <Textarea value={fields.noi_dung_3} onChange={e => update('noi_dung_3', e.target.value)} placeholder="Retouch hình ảnh (29 hình): ..." />
            </Field>
          </>
        )}

        {fields.type === 'ecom' && (
          <>
            <Field label="Google Drive Link 1">
              <Input value={fields.drive_link_1} onChange={e => update('drive_link_1', e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
            <Field label="Google Drive Link 2">
              <Input value={fields.drive_link_2} onChange={e => update('drive_link_2', e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
            <Field label="Google Drive Link 3">
              <Input value={fields.drive_link_3} onChange={e => update('drive_link_3', e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
          </>
        )}
      </div>}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Download buttons */}
      <div className={`grid gap-4 pb-8 ${fields.type === 'livestream' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <button
          onClick={() => download('hd')}
          disabled={!!downloading}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {downloading === 'hd' ? (
            <span className="animate-spin">⏳</span>
          ) : '📄'}
          Tải Hợp Đồng
        </button>
        {fields.type !== 'livestream' && (
          <button
            onClick={() => download('bbnt')}
            disabled={!!downloading}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {downloading === 'bbnt' ? (
              <span className="animate-spin">⏳</span>
            ) : '✅'}
            Tải Biên Bản NT
          </button>
        )}
      </div>
    </div>
  )
}
