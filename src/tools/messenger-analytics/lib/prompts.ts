export function stage1Prompt(conversationText: string): string {
  return `Phân tích cuộc hội thoại khách hàng sau và trả về JSON với các trường:

- outcome: "order" | "no_buy" | "complaint" | "inquiry" (kết quả cuộc trò chuyện)
- products: string[] (tên sản phẩm được đề cập)
- customerLanguage: string[] (cụm từ đặc trưng khách hàng dùng, tối đa 5)
- keyInsight: string (nhận xét chính 1-2 câu: lý do mua/không mua, vấn đề chính)
- objections: string[] (lý do phản đối hoặc do dự, nếu có)

CHỈ trả về JSON thuần túy, không có markdown code block, không giải thích thêm.

Hội thoại:
${conversationText}`;
}

export function stage2Prompt(summariesJson: string): string {
  return `Dựa trên ${JSON.parse(summariesJson).length} tóm tắt hội thoại khách hàng sau, hãy tổng hợp thành các chủ đề chính:

1. **Ngôn ngữ khách hàng**: Các cụm từ và cách diễn đạt phổ biến nhất
2. **Dịp mua hàng**: Lý do/dịp thúc đẩy khách hàng mua
3. **Câu hỏi lặp lại**: Những câu hỏi khách hàng hỏi nhiều nhất
4. **Khiếu nại sản phẩm**: Các vấn đề về sản phẩm được đề cập
5. **Yêu cầu tính năng**: Những gì khách hàng muốn nhưng chưa có
6. **Đề cập đối thủ**: Tên đối thủ cạnh tranh được nhắc đến
7. **Rào cản chuyển đổi**: Lý do chính khiến khách không mua
8. **Script hiệu quả**: Các cách tiếp cận dẫn đến đơn hàng thành công

Trả lời bằng Markdown có cấu trúc rõ ràng, chi tiết và có ví dụ cụ thể từ dữ liệu.

Dữ liệu tóm tắt:
${summariesJson}`;
}

export function stage3MarketingPrompt(themes: string): string {
  return `Bạn là CMO của một thương hiệu thời trang Việt Nam. Dựa trên phân tích hội thoại khách hàng sau, hãy viết BÁO CÁO MARKETING chi tiết bằng Markdown.

Mỗi mục theo format **Insight → Evidence → Action (I-E-A)**:

# Báo Cáo Marketing — Phân Tích Hội Thoại Khách Hàng

## 1. Khai Thác Ngôn Ngữ Khách Hàng
- Các cụm từ khách hàng thực sự dùng
- Bảng: Cụm từ | Tần suất | Đề xuất dùng trong quảng cáo/SEO

## 2. Trigger Mua Hàng
- Dịp/lý do thúc đẩy mua
- Ý tưởng timing cho campaign

## 3. Content Gaps
- Câu hỏi lặp lại mà website/FAQ chưa trả lời
- Đề xuất cụ thể: bài blog, video, FAQ cần tạo

## 4. Thông Tin Cạnh Tranh
- Đối thủ được đề cập
- Cơ hội định vị

## 5. Rào Cản Chuyển Đổi
- Lý do hàng đầu khiến khách không mua
- Script phản bác

Dữ liệu phân tích:
${themes}`;
}

export function stage3CskhPrompt(themes: string): string {
  return `Bạn là Sales Director của một thương hiệu thời trang Việt Nam. Dựa trên phân tích hội thoại khách hàng, hãy viết BÁO CÁO CSKH/SALES chi tiết bằng Markdown.

# Báo Cáo CSKH & Sales — Phân Tích Hội Thoại

## 1. Script Chiến Thắng
- Pattern hội thoại dẫn đến đơn hàng thành công
- Template script tái sử dụng được (với ví dụ cụ thể)

## 2. Xử Lý Phản Đối
- Top objections với script đề xuất
- Bảng: Phản đối | Script đề xuất

## 3. Pattern Mất Đơn
- Lý do hội thoại kết thúc không có đơn hàng
- Điểm can thiệp để cải thiện

## 4. Training Gaps
- Kiến thức/kỹ năng nhân viên cần bổ sung
- Nội dung training cụ thể cần xây dựng

## 5. FAQ Quick Replies
Bảng top 5 câu hỏi lặp lại + câu trả lời mẫu:
| Câu hỏi | Câu trả lời nhanh |
|---------|------------------|

Dữ liệu phân tích:
${themes}`;
}

export function stage3RdPrompt(themes: string): string {
  return `Bạn là Product Manager của một thương hiệu thời trang Việt Nam. Dựa trên phân tích hội thoại khách hàng, hãy viết BÁO CÁO R&D/SẢN PHẨM chi tiết bằng Markdown.

# Báo Cáo R&D & Sản Phẩm — Voice of Customer

## 1. Vấn Đề Chất Lượng (Critical)
- Báo cáo lỗi theo SKU với mức độ nghiêm trọng và hành động
- Bảng: SKU | Vấn đề | Tần suất | Mức độ | Hành động

## 2. Yêu Cầu Tính Năng
- Những gì khách hàng muốn nhưng chưa có
- Ưu tiên theo tần suất và impact

## 3. Phản Hồi Size & Quy Cách
- Kỳ vọng vs thực tế về size/kích thước
- Đề xuất điều chỉnh

## 4. Ý Tưởng Sản Phẩm Mới (Voice of Customer)
- Nhu cầu chưa được đáp ứng → SKU tiềm năng
- Bảng: Nhu cầu | Tần suất | SKU tiềm năng

## 5. Tín Hiệu Chất Lượng NCC
- Cluster vấn đề theo lô/nhà cung cấp
- Đề xuất audit nhà cung cấp

Dữ liệu phân tích:
${themes}`;
}

export function stage3ExecPrompt(themes: string): string {
  return `Bạn là CEO của một thương hiệu thời trang Việt Nam. Dựa trên phân tích hội thoại khách hàng, hãy viết BÁO CÁO TỔNG HỢP cho ban lãnh đạo bằng Markdown.

# Báo Cáo Tổng Hợp — Phân Tích Hội Thoại Khách Hàng

## Tóm Tắt Điều Hành (Executive Summary)
2-3 đoạn ngắn về tình hình tổng thể, xu hướng chính, ưu tiên hành động.

## Sức Khỏe Kinh Doanh
- Ước tính tỷ lệ chuyển đổi (conversion rate)
- Top khiếu nại
- Top SKU được đề cập
- Điểm mạnh

## Insights Theo Phòng Ban
### Marketing: (3-5 điểm)
### CSKH/Sales: (3-5 điểm)
### R&D/Sản phẩm: (3-5 điểm)

## Pattern Liên Phòng Ban (I-E-A format)

## Top 5 Hành Động Ưu Tiên
| # | Hành động | Phòng ban | Impact | Deadline đề xuất |
|---|-----------|-----------|--------|-----------------|

Dữ liệu phân tích:
${themes}`;
}

export function chatPrompt(question: string, relevantSummaries: string): string {
  return `Bạn là chuyên gia phân tích dữ liệu hội thoại khách hàng. Dựa trên dữ liệu tóm tắt các hội thoại sau, hãy trả lời câu hỏi của người dùng.

Yêu cầu:
- Trích dẫn số cuộc hội thoại cụ thể [N] khi đưa ra bằng chứng
- Rõ ràng khi dữ liệu không đủ để trả lời chính xác
- Trả lời bằng Tiếng Việt, ngắn gọn và có cấu trúc

Câu hỏi: ${question}

Dữ liệu tóm tắt hội thoại:
${relevantSummaries}`;
}
