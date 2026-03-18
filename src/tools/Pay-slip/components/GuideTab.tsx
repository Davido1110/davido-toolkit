export function GuideTab() {
  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-8 text-sm text-gray-700 dark:text-gray-300">

      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-2">
        <span className="text-5xl">💸</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bảng Lương — Hướng Dẫn Sử Dụng</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl">
          Công cụ này giúp bạn tính bảng lương thuế cho nhân viên thuộc 2 pháp nhân — chỉ cần nhập thu nhập nội bộ, hệ thống tự tính OT, phụ cấp và hoa hồng.
        </p>
      </div>

      {/* What are the 2 entities */}
      <Section icon="🏢" title="2 Pháp nhân là gì?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card color="blue">
            <p className="font-semibold text-blue-700 dark:text-blue-300">Cty</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Công ty TNHH Leonardo</p>
            <p className="mt-2 text-xs">Hoa hồng tính theo <strong>R1</strong> (doanh thu của Cty)</p>
          </Card>
          <Card color="purple">
            <p className="font-semibold text-purple-700 dark:text-purple-300">HKD</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hộ kinh doanh Lê Khắc Thông</p>
            <p className="mt-2 text-xs">Hoa hồng tính theo <strong>R2</strong> (doanh thu của HKD)</p>
          </Card>
        </div>
      </Section>

      {/* 4 steps */}
      <Section icon="🗺️" title="Quy trình 4 bước">
        <ol className="flex flex-col gap-4">
          {[
            {
              step: '1',
              tab: 'Tab 👥 Danh Sách NV',
              title: 'Nhập danh sách nhân viên',
              desc: 'Thêm từng nhân viên hoặc upload file Excel mẫu. Thông tin này được lưu lại cho các tháng sau — bạn chỉ cần làm 1 lần.',
              color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            },
            {
              step: '2',
              tab: 'Tab 📋 Nhập Tháng',
              title: 'Nhập thu nhập nội bộ tháng này',
              desc: 'Chọn tháng, nhập R1/R2 (doanh thu 2 pháp nhân), sau đó nhập tổng thu nhập nội bộ cho từng người. Có thể upload Excel thay vì gõ tay.',
              color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
            },
            {
              step: '3',
              tab: 'Nhấn nút 🧮 Tính toán',
              title: 'Hệ thống tự tính bảng lương',
              desc: 'Hệ thống tính OT, hoa hồng, phụ cấp cho từng người và kiểm tra xem tổng có khớp với bảng nội bộ không.',
              color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
            },
            {
              step: '4',
              tab: 'Tab 📤 Xuất File',
              title: 'Tải xuống file Excel',
              desc: 'Xuất bảng lương riêng cho Cty, HKD và file đối soát tổng hợp.',
              color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
            },
          ].map(({ step, tab, title, desc, color }) => (
            <li key={step} className="flex gap-4 items-start">
              <span className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${color}`}>
                {step}
              </span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{tab}</p>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Formula explained simply */}
      <Section icon="🧮" title="Hệ thống tính lương như thế nào?">
        <p className="mb-3">Với mỗi nhân viên, hệ thống tính theo thứ tự:</p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Bước 1', formula: 'Hoa hồng = Tỷ lệ HH × Doanh thu (R1 hoặc R2)', note: 'Chỉ áp dụng nếu nhân viên có hoa hồng' },
            { label: 'Bước 2', formula: 'Chênh lệch = TN nội bộ − Lương HĐLĐ − Phụ cấp − Hoa hồng', note: 'Đây là phần còn lại cần "đẩy" vào OT' },
            { label: 'Bước 3', formula: 'Giờ OT = Chênh lệch ÷ Đơn giá OT  →  làm tròn lên 0.5h', note: 'Đơn giá OT = Lương HĐLĐ ÷ 26 ngày ÷ 8 giờ × 1.5' },
            { label: 'Bước 4', formula: 'Phụ cấp = 1,000,000 + phần dư làm tròn', note: 'Đảm bảo tổng khớp chính xác với TN nội bộ' },
          ].map(({ label, formula, note }) => (
            <div key={label} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500 w-12 pt-0.5">{label}</span>
              <div>
                <p className="font-mono text-xs text-gray-800 dark:text-gray-200">{formula}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-xs">
          ✅ <strong>Đảm bảo:</strong> Lương gộp + Phụ cấp + Hoa hồng = Thu nhập nội bộ (chính xác từng đồng)
        </div>
      </Section>

      {/* Worked example */}
      <Section icon="📝" title="Ví dụ minh họa">
        <div className="flex flex-col gap-4">
          <ExampleCard
            name="Nguyễn Văn A"
            entity="Cty"
            fields={[
              ['Lương HĐLĐ', '10,000,000 đ'],
              ['Hoa hồng', '5% × R1 (500M) = 25,000,000 đ'],
              ['TN nội bộ', '51,000,000 đ'],
              ['Chênh lệch', '51M − 10M − 1M − 25M = 15,000,000 đ'],
              ['Giờ OT', '≈ 208 giờ'],
              ['Tiền OT', '≈ 15,000,000 đ'],
              ['Phụ cấp', '≈ 1,000,000 đ'],
            ]}
            total="25M + 10M + 15M + 1M = 51,000,000 đ ✅"
          />
          <ExampleCard
            name="Trần Thị B"
            entity="HKD"
            fields={[
              ['Lương HĐLĐ', '8,000,000 đ'],
              ['Hoa hồng', 'Không có'],
              ['TN nội bộ', '12,000,000 đ'],
              ['Chênh lệch', '12M − 8M − 1M = 3,000,000 đ'],
              ['Giờ OT', '52 giờ'],
              ['Tiền OT', '≈ 3,000,000 đ'],
              ['Phụ cấp', '≈ 1,000,000 đ'],
            ]}
            total="0 + 8M + 3M + 1M = 12,000,000 đ ✅"
          />
        </div>
      </Section>

      {/* Warnings explained */}
      <Section icon="⚠️" title="Các cảnh báo có thể gặp">
        <div className="flex flex-col gap-2">
          {[
            { icon: '⛔', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', label: 'Lỗi (đỏ)', items: ['OT > 72 giờ/tháng — vượt giới hạn pháp lý', 'Chênh lệch âm — TN nội bộ thấp hơn lương cơ bản + phụ cấp', 'Hoa hồng lớn hơn cả thu nhập nội bộ'] },
            { icon: '⚠️', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800', label: 'Cảnh báo (vàng)', items: ['OT từ 40–72 giờ/tháng — nên kiểm tra lại', 'Thu nhập nội bộ = 0', 'Nhân viên có trong danh sách nhưng chưa nhập thu nhập'] },
          ].map(({ icon, bg, label, items }) => (
            <div key={label} className={`p-3 rounded-lg border ${bg}`}>
              <p className="font-semibold text-xs mb-2">{icon} {label}</p>
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs">
                    <span className="mt-0.5 text-gray-400">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Excel format */}
      <Section icon="📂" title="Định dạng file Excel upload">
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-semibold mb-2">File danh sách nhân viên (Tab 1)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    {['Mã NV', 'Họ tên', 'Pháp nhân', 'Lương HĐLĐ', 'Có HH', 'Tỷ lệ HH (%)', 'Phụ cấp'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-1.5 font-mono">NV001</td>
                    <td className="px-3 py-1.5">Nguyễn Văn A</td>
                    <td className="px-3 py-1.5">Cty</td>
                    <td className="px-3 py-1.5">10000000</td>
                    <td className="px-3 py-1.5">Có</td>
                    <td className="px-3 py-1.5">5</td>
                    <td className="px-3 py-1.5">1000000</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-1.5 font-mono">NV002</td>
                    <td className="px-3 py-1.5">Trần Thị B</td>
                    <td className="px-3 py-1.5">HKD</td>
                    <td className="px-3 py-1.5">8000000</td>
                    <td className="px-3 py-1.5">Không</td>
                    <td className="px-3 py-1.5">0</td>
                    <td className="px-3 py-1.5">1000000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">• Cột "Pháp nhân": gõ chính xác <strong>Cty</strong> hoặc <strong>HKD</strong> &nbsp;•&nbsp; Cột "Có HH": gõ <strong>Có</strong> hoặc <strong>Không</strong> &nbsp;•&nbsp; Tỷ lệ HH nhập dạng % (5 = 5%)</p>
          </div>

          <div>
            <p className="font-semibold mb-2">File thu nhập tháng (Tab 2)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-green-700 text-white">
                    {['Mã NV', 'Tổng TN nội bộ'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[['NV001', '51000000'], ['NV002', '12000000']].map(([id, amt], i) => (
                    <tr key={id} className={`border-t border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                      <td className="px-3 py-1.5 font-mono">{id}</td>
                      <td className="px-3 py-1.5">{amt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">• Mã NV phải khớp với danh sách nhân viên &nbsp;•&nbsp; Nhập số nguyên, không cần dấu phẩy</p>
          </div>
        </div>
      </Section>

      {/* Tips */}
      <Section icon="💡" title="Mẹo sử dụng">
        <ul className="flex flex-col gap-2">
          {[
            'Danh sách nhân viên được lưu tự động — không cần nhập lại mỗi tháng.',
            'Thu nhập tháng KHÔNG được lưu — mỗi tháng mở tool là bắt đầu lại từ đầu.',
            'Nhấn "📥 File mẫu" ở Tab 1 và Tab 2 để tải file Excel đúng định dạng.',
            'Sau khi tính, kiểm tra mục "Đối soát" — kết quả phải hiển thị ✅ KHỚP trước khi xuất file.',
            'Dòng màu đỏ/vàng trong kết quả = có cảnh báo — hover vào biểu tượng để xem chi tiết.',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Section>

    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-bold text-base text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Card({ color, children }: { color: 'blue' | 'purple'; children: React.ReactNode }) {
  const cls = color === 'blue'
    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
    : 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10';
  return (
    <div className={`border rounded-xl p-4 ${cls}`}>{children}</div>
  );
}

function ExampleCard({ name, entity, fields, total }: {
  name: string; entity: string;
  fields: [string, string][];
  total: string;
}) {
  const isHkd = entity === 'HKD';
  return (
    <div className={`rounded-xl border p-4 ${isHkd ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10' : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isHkd ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>{entity}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{name}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        {fields.map(([label, value]) => (
          <>
            <span key={label} className="text-gray-500 dark:text-gray-400">{label}</span>
            <span key={value} className="text-gray-800 dark:text-gray-200">{value}</span>
          </>
        ))}
      </div>
      <div className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
        Tổng: {total}
      </div>
    </div>
  );
}
