export type Lang = 'vi' | 'en';

export const translations = {
  vi: {
    // Tabs
    tabTool: 'Công cụ',
    tabGuide: 'Hướng dẫn',

    // Upload step
    uploadTitle: 'Tải lên file hàng tồn kho',
    uploadSubtitle: 'File Excel với các cột: Mã hàng | Nhóm hàng | Tên hàng | Thuộc tính | AVG | SOH | OO',
    paramsTitle: 'Thông số chung',
    errorNoRows: 'Không tìm thấy dòng dữ liệu. Hãy kiểm tra file Excel có dữ liệu từ cột A–G bắt đầu từ dòng 2.',
    errorParse: 'Không thể đọc file: ',
    formulasLabel: 'Công thức:',
    coverageTarget: (lt: number, d: number) => `Với LT=${lt}, D=${d}: mục tiêu phủ tồn = ${lt + d} tuần`,

    // Review step
    editParams: 'Chỉnh thông số',
    needsOrder: 'Cần đặt hàng',
    stockoutRisk: 'Nguy cơ hết hàng',

    // FileUpload
    dropHere: 'Thả file Excel vào đây',
    clickBrowse: 'hoặc nhấp để chọn file (.xlsx, .xls)',
    clickReplace: 'Nhấp hoặc kéo để thay thế',
    downloadTemplate: 'Tải file mẫu',

    // ParameterForm
    ltLabel: 'Thời gian giao hàng — LT (tuần)',
    dLabel: 'Hệ số nhu cầu — D (tuần)',
    calculate: 'Tính toán',
    calculating: 'Đang tính…',

    // FilterBar
    searchLabel: 'Tìm kiếm SKU / Tên hàng',
    searchPlaceholder: 'Nhập để tìm kiếm…',
    catL1: 'Nhóm hàng L1',
    catL2: 'Nhóm hàng L2',
    catL3: 'Nhóm hàng L3',
    all: 'Tất cả',
    clear: 'Xóa bộ lọc',

    // DataTable column headers
    colSku: 'Mã hàng',
    colCategory: 'Nhóm hàng',
    colName: 'Tên hàng',
    colAttr: 'Thuộc tính',
    colWeekLeft: 'Tuần còn lại',
    colBareSoh: 'Tồn kho W12',
    colProjectedSOH: 'Tồn kho dự kiến',

    // DataTable column header hints (shown as subtitle)
    colHints: {
      avg:           'Doanh số TB / tuần',
      soh:           'Tồn kho hiện tại',
      oo:            'Đang trên đường về',
      week_left:     'Số tuần đủ hàng hiện tại',
      bare_soh:      'Tồn kho W12 nếu không đặt',
      qty:           'Số lượng cần đặt',
      projected_soh: 'Tồn kho sau khi hàng về',
    },

    // DataTable stats bar
    statTotal: 'Tổng',
    statShown: 'Hiển thị',
    statNeedsOrder: 'Cần đặt',
    statStockout: 'Nguy cơ hết',
    statNoMatch: 'Không có hàng nào khớp bộ lọc.',

    // ExportButton
    exporting: 'Đang xuất…',
    exportBtn: (n: number) => `Xuất Excel (${n} dòng)`,

    // GuideTab
    guide: {
      abbrevTitle: 'Giải thích viết tắt',
      formulaTitle: 'Logic tính toán',
      exampleTitle: 'Ví dụ minh họa',
      colorTitle: 'Màu sắc các dòng',
      inputTitle: 'Định dạng file đầu vào',

      abbrevTerm: 'Viết tắt',
      abbrevFull: 'Tên đầy đủ',
      abbrevDesc: 'Mô tả',

      abbrevRows: [
        { term: 'AVG',           full: 'Doanh số bán trung bình / tuần', desc: 'Trung bình số lượng bán ra mỗi tuần trong 12 tuần gần nhất.' },
        { term: 'SOH',           full: 'Tồn kho hiện tại',               desc: 'Số lượng hàng hiện đang có trong kho.' },
        { term: 'OO',            full: 'Đang trên đường về',              desc: 'Số lượng đã đặt hàng, đang sản xuất hoặc vận chuyển, chưa về kho.' },
        { term: 'LT',            full: 'Thời gian giao hàng',            desc: 'Số tuần từ lúc đặt hàng đến khi nhận được hàng tại kho (sản xuất + vận chuyển + nhập kho).' },
        { term: 'D',             full: 'Hệ số nhu cầu',                  desc: 'Số tuần hàng muốn đặt mỗi lần đặt hàng.' },
        { term: 'Week Left',     full: 'Số tuần còn lại',                desc: 'Số tuần đủ hàng để bán với lượng SOH và OO hiện tại. = (SOH + OO) / AVG.' },
        { term: 'Bare SOH',      full: 'Tồn kho W12 nếu không đặt hàng',desc: 'Tồn kho dự kiến ở tuần thứ LT nếu không đặt đơn hàng nào. = max(0, SOH + OO − AVG × LT).' },
        { term: 'QTY',           full: 'Số lượng cần đặt',               desc: 'Số lượng đề xuất cần đặt mua. Bằng 0 nghĩa là tồn kho hiện tại đủ dùng.' },
        { term: 'Projected SOH', full: 'Tồn kho dự kiến',                desc: 'Tồn kho ở tuần thứ LT sau khi đơn hàng mới về. = Bare SOH + QTY.' },
        { term: 'SKU',           full: 'Mã hàng hóa',                    desc: 'Mã định danh duy nhất cho từng sản phẩm / biến thể.' },
      ],

      qtyTitle: 'Số lượng cần đặt (QTY)',
      projTitle: 'Tồn kho dự kiến',

      qtyExplain: [
        { term: 'Week Left',              desc: '— Số tuần còn đủ hàng = (SOH + OO) / AVG.' },
        { term: 'Nếu Week Left ≤ LT+D−4',desc: '— Cần đặt hàng: QTY = AVG × D (đặt đủ D tuần doanh số).' },
        { term: 'Nếu Week Left > LT+D−4',desc: '— Tồn kho đủ, không cần đặt: QTY = 0.' },
      ],
      projExplain: [
        { term: 'max(0, SOH + OO − AVG × LT)', desc: '— Tồn kho thực tế còn lại khi hàng về (không thể âm — nếu hết hàng thì = 0).' },
        { term: '+ QTY',                        desc: '— Cộng đơn hàng mới vừa về kho.' },
      ],

      exampleInputs: 'Dữ liệu đầu vào',
      exampleSteps: 'Tính từng bước',
      coverageComment: '// Mục tiêu phủ tồn = LT + D = 4 + 8 = 12 tuần',
      validationComment: '// Kiểm tra: 840 / 105 = 8 tuần = D ✓',

      colorRed: 'Đỏ — Sẽ hết hàng trong thời gian chờ',
      colorRedDesc: 'SOH + OO < AVG × LT. Tồn kho hiện tại + hàng đang về không đủ để cầm cự trong thời gian chờ đơn hàng mới. Kho sẽ thiếu hàng trước khi đơn về đến.',
      colorYellow: 'Vàng — Cần đặt hàng',
      colorYellowDesc: 'QTY > 0. Tồn kho đủ trong thời gian chờ nhưng cần đặt thêm để đảm bảo đủ dự trữ sau khi hàng về.',
      colorWhite: 'Trắng — Tồn kho đủ',
      colorWhiteDesc: 'QTY = 0. Tồn kho hiện tại + hàng đang về đủ phủ toàn bộ khoảng LT + D.',

      inputNote: 'Tải lên file .xlsx hoặc .xls. Dòng 1 là tiêu đề và bị bỏ qua. Dữ liệu bắt đầu từ dòng 2.',
      inputColCol: 'Cột',
      inputColField: 'Trường',
      inputColType: 'Kiểu',
      inputColExample: 'Ví dụ',
      inputRows: [
        { col: 'A', field: 'Mã hàng', type: 'Văn bản', example: 'SKU-001' },
        { col: 'B', field: 'Nhóm hàng', type: 'Văn bản', example: 'Điện tử > Điện thoại > iPhone' },
        { col: 'C', field: 'Tên hàng', type: 'Văn bản', example: 'iPhone 15 Pro' },
        { col: 'D', field: 'Thuộc tính', type: 'Văn bản', example: '128GB Đen' },
        { col: 'E', field: 'AVG', type: 'Số', example: '105' },
        { col: 'F', field: 'SOH', type: 'Số', example: '200' },
        { col: 'G', field: 'OO', type: 'Số', example: '150' },
      ],
      inputFootnote: 'Nhóm hàng dùng dấu > để phân cấp (ví dụ: L1 > L2 > L3). Hỗ trợ tối đa 3 cấp.',
    },
  },

  en: {
    // Tabs
    tabTool: 'Tool',
    tabGuide: 'How it works',

    // Upload step
    uploadTitle: 'Upload Inventory File',
    uploadSubtitle: 'Excel file with columns: SKU Code | Category | Product Name | Attribute | AVG | SOH | OO',
    paramsTitle: 'Global Parameters',
    errorNoRows: 'No data rows found. Check your Excel file has data in columns A–G starting from row 2.',
    errorParse: 'Failed to parse file: ',
    formulasLabel: 'Formulas:',
    coverageTarget: (lt: number, d: number) => `With LT=${lt}, D=${d}: coverage target = ${lt + d} weeks`,

    // Review step
    editParams: 'Edit parameters',
    needsOrder: 'Needs order',
    stockoutRisk: 'Stock-out risk',

    // FileUpload
    dropHere: 'Drop your Excel file here',
    clickBrowse: 'or click to browse (.xlsx, .xls)',
    clickReplace: 'Click or drag to replace',
    downloadTemplate: 'Download Template',

    // ParameterForm
    ltLabel: 'Lead Time — LT (weeks)',
    dLabel: 'Demand Factor — D (weeks)',
    calculate: 'Calculate',
    calculating: 'Calculating…',

    // FilterBar
    searchLabel: 'Search SKU / Name',
    searchPlaceholder: 'Type to search…',
    catL1: 'Category L1',
    catL2: 'Category L2',
    catL3: 'Category L3',
    all: 'All',
    clear: 'Clear',

    // DataTable column headers
    colSku: 'SKU Code',
    colCategory: 'Category',
    colName: 'Product Name',
    colAttr: 'Attribute',
    colWeekLeft: 'Weeks Left',
    colBareSoh: 'Bare SOH',
    colProjectedSOH: 'Projected SOH',

    // DataTable column header hints (shown as subtitle)
    colHints: {
      avg:           'Avg weekly sales',
      soh:           'Stock on hand',
      oo:            'On order',
      week_left:     'Weeks of stock remaining',
      bare_soh:      'SOH at W12 if no order',
      qty:           'Suggested order qty',
      projected_soh: 'SOH at W12 after order arrives',
    },

    // DataTable stats bar
    statTotal: 'Total',
    statShown: 'Shown',
    statNeedsOrder: 'Needs order',
    statStockout: 'Stock-out risk',
    statNoMatch: 'No rows match the current filter.',

    // ExportButton
    exporting: 'Exporting…',
    exportBtn: (n: number) => `Export Excel (${n} rows)`,

    // GuideTab
    guide: {
      abbrevTitle: 'Abbreviations',
      formulaTitle: 'Calculation Logic',
      exampleTitle: 'Worked Example',
      colorTitle: 'Row Color Coding',
      inputTitle: 'Input File Format',

      abbrevTerm: 'Term',
      abbrevFull: 'Full Name',
      abbrevDesc: 'Description',

      abbrevRows: [
        { term: 'AVG',           full: 'Average Weekly Sales',            desc: 'Pre-calculated 12-week average of units sold per week for this SKU.' },
        { term: 'SOH',           full: 'Stock On Hand',                   desc: 'Current quantity physically available in the warehouse right now.' },
        { term: 'OO',            full: 'On Order',                        desc: 'Quantity already ordered from supplier — in production or in transit, not yet received.' },
        { term: 'LT',            full: 'Lead Time',                       desc: 'Number of weeks from placing an order to receiving it at the warehouse (production + shipping + receiving).' },
        { term: 'D',             full: 'Demand Factor',                   desc: 'Weeks of supply to order per purchase order.' },
        { term: 'Week Left',     full: 'Weeks of Stock Remaining',        desc: 'How many weeks the current SOH + OO will last at current sales rate. = (SOH + OO) / AVG.' },
        { term: 'Bare SOH',      full: 'SOH at W[LT] if no order placed', desc: 'Projected stock at week LT assuming no new order is placed. = max(0, SOH + OO − AVG × LT).' },
        { term: 'QTY',           full: 'Order Quantity',                  desc: 'Suggested number of units to order now. Zero means current stock is sufficient.' },
        { term: 'Projected SOH', full: 'Projected Stock On Hand',         desc: 'Estimated warehouse stock at week LT after the new order arrives. = Bare SOH + QTY.' },
        { term: 'SKU',           full: 'Stock Keeping Unit',              desc: 'Unique product identifier — one per distinct product/variant combination.' },
      ],

      qtyTitle: 'Order Quantity (QTY)',
      projTitle: 'Projected Stock On Hand',

      qtyExplain: [
        { term: 'Week Left',                desc: '— Weeks of stock remaining = (SOH + OO) / AVG.' },
        { term: 'If Week Left ≤ LT + D − 4', desc: '— Order needed: QTY = AVG × D (a full D weeks of supply).' },
        { term: 'If Week Left > LT + D − 4', desc: '— Sufficient stock, no order: QTY = 0.' },
      ],
      projExplain: [
        { term: 'max(0, SOH + OO − AVG × LT)', desc: '— Stock physically remaining at arrival (floored at 0 — inventory can\'t go below zero).' },
        { term: '+ QTY',                        desc: '— Plus the new order arriving at the warehouse.' },
      ],

      exampleInputs: 'Inputs',
      exampleSteps: 'Step-by-step',
      coverageComment: '// Coverage target = LT + D = 4 + 8 = 12 weeks',
      validationComment: '// Validation: 840 / 105 = 8 weeks = D ✓',

      colorRed: 'Red — Will stock out during lead time',
      colorRedDesc: 'SOH + OO < AVG × LT. Current stock + on-order is not enough to last through the lead time waiting period. Stock will go negative before the new order arrives.',
      colorYellow: 'Yellow — Needs ordering',
      colorYellowDesc: 'QTY > 0. Stock is sufficient during lead time, but a purchase order is needed to maintain desired coverage after arrival.',
      colorWhite: 'White — Sufficient stock',
      colorWhiteDesc: 'QTY = 0. Current stock + on-order covers the full LT + D window.',

      inputNote: 'Upload an .xlsx or .xls file. Row 1 is treated as a header and skipped. Data begins from row 2.',
      inputColCol: 'Column',
      inputColField: 'Field',
      inputColType: 'Type',
      inputColExample: 'Example',
      inputRows: [
        { col: 'A', field: 'SKU Code', type: 'Text', example: 'SKU-001' },
        { col: 'B', field: 'Category', type: 'Text', example: 'Electronics > Phones > iPhone' },
        { col: 'C', field: 'Product Name', type: 'Text', example: 'iPhone 15 Pro' },
        { col: 'D', field: 'Attribute', type: 'Text', example: '128GB Black' },
        { col: 'E', field: 'AVG', type: 'Number', example: '105' },
        { col: 'F', field: 'SOH', type: 'Number', example: '200' },
        { col: 'G', field: 'OO', type: 'Number', example: '150' },
      ],
      inputFootnote: 'Category uses > as the level separator (e.g. L1 > L2 > L3). Up to 3 levels supported.',
    },
  },
} as const;

export type Translations = (typeof translations)[Lang];
