# KiotViet Public API — Instruction Reference

> **Source:** https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api/
> **Base URL:** `https://public.kiotapi.com`
> **Industry:** Bán buôn, Bán lẻ (Retail)

---

## 1. Giới thiệu

KiotViet Public API được phát triển để hỗ trợ việc tích hợp và trao đổi dữ liệu giữa KiotViet và các nền tảng website, thương mại điện tử, CRM…

**Các đối tượng hỗ trợ:**
- **Nhóm hàng** — lấy danh sách nhóm hàng hóa (2.3)
- **Hàng hóa** — lấy thông tin sản phẩm, tạo mới, sửa, xóa sản phẩm (2.4)
- **Đặt hàng** — lấy thông tin đơn hàng, tạo, cập nhật, hủy đơn hàng (2.5)
- **Hóa đơn** — lấy thông tin hóa đơn, tạo, cập nhật, hủy hóa đơn (2.12)
- **Khách hàng** — lấy danh sách khách hàng và thao tác (2.6)
- **Phiếu nhập hàng** — thông tin phiếu nhập (2.15)
- **API phụ trợ:** Chi nhánh, Người dùng (2.8), Tài khoản ngân hàng (2.9), Thu khác (2.10), Webhook (2.11), Nhóm khách hàng (2.13), Sổ quỹ (2.14)

> **Lưu ý:** Các Params có `?` trong giá trị là những trường có thể không truyền (optional).

---

## 2. Chức năng

### Common Headers (tất cả API trừ Auth)

```
Retailer: <tên gian hàng>
Authorization: Bearer <access_token>
```

### Rate Limit

- **GET requests:** 5,000 requests/hour

---

## 2.1 – 2.2. Authenticate & Access Token

### 2.2. Lấy thông tin Access Token

- **Method:** `POST`
- **URL:** `https://id.kiotviet.vn/connect/token`
- **Header:** `Content-Type: application/x-www-form-urlencoded`

**Request Body:**
```
scopes=PublicApi.Access
grant_type=client_credentials
client_id=<ClientId>
client_secret=<ClientSecret>
```

**Response:**
```json
{
  "access_token": "<token>",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

---

## 2.3. Nhóm hàng (Categories)

### 2.3.1. Lấy danh sách nhóm hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/categories`

**Request Params:**
```
lastModifiedFrom  : datetime?  // thời gian cập nhật
pageSize          : int?       // mặc định 20, tối đa 100
currentItem       : int        // bản ghi bắt đầu, mặc định 0
orderBy           : string     // ví dụ: orderBy=name
orderDirection    : string     // Asc (mặc định) | Desc
hierachicalData   : boolean    // true = theo cấp, false = flat list
```

**Response (hierachicalData = true):**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "categoryId": 0,
    "parentId": null,
    "categoryName": "",
    "retailerId": 0,
    "hasChild": false,
    "modifiedDate": null,
    "createdDate": "",
    "children": []
  }],
  "removedIds": [],
  "timestamp": ""
}
```

**Response (hierachicalData = false):** Trả về flat list, không có `children`.

---

### 2.3.2. Lấy chi tiết nhóm hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/categories/{id}`

**Request Params:** `id: long`

**Response:**
```json
{
  "data": {
    "categoryId": 0,
    "parentId": null,
    "categoryName": "",
    "retailerId": 0,
    "hasChild": null,
    "modifiedDate": null,
    "createdDate": "",
    "children": []
  }
}
```

---

### 2.3.3. Thêm mới nhóm hàng

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/categories`

**Request Body:**
```json
{
  "categoryName": "string",
  "parentId": 0
}
```

**Response:**
```json
{
  "message": "Cập nhật dữ liệu thành công",
  "data": { "categoryId": 0, "categoryName": "", ... }
}
```

---

### 2.3.4. Cập nhật nhóm hàng

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/categories/{id}`

**Request Body:**
```json
{
  "parentId": 0,
  "categoryName": "string"
}
```

---

### 2.3.5. Xóa nhóm hàng

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/categories/{id}`

**Response:**
```json
{ "message": "Xóa dữ liệu thành công" }
```

---

## 2.4. Hàng hóa (Products)

### 2.4.1. Lấy danh sách hàng hóa

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/products`

**Request Params:**
```
orderBy                   : string    // orderBy=Name
orderDirection            : string    // Asc | Desc
lastModifiedFrom          : datetime?
pageSize                  : int       // mặc định 20, tối đa 100
currentItem               : int
includeInventory          : boolean   // lấy thông tin tồn kho
includePricebook          : boolean   // lấy bảng giá
IncludeSerials            : boolean   // lấy serial/IMEI
IncludeBatchExpires       : boolean   // lấy lô/hạn sử dụng
includeWarranties         : boolean   // lấy bảo hành
masterUnitId              : long?     // filter hàng hóa đơn vị
masterProductId           : long?     // filter hàng hóa cùng loại
categoryId                : int?      // filter theo nhóm hàng
BranchIds                 : int[]     // filter tồn kho theo chi nhánh
includeRemoveIds          : boolean   // lấy danh sách ID bị xóa
includeQuantity           : boolean   // lấy định mức tồn
productType               : int?      // 1: combo, 2: thông thường, 3: dịch vụ
includeMaterial           : boolean   // lấy hàng thành phần
isActive                  : boolean?  // đang kinh doanh
name                      : string    // tìm kiếm theo tên
includeSoftDeletedAttribute: boolean  // lấy thuộc tính đã xóa mềm
tradeMarkId               : int?      // filter thương hiệu
IncludeProductShelves     : boolean?  // lấy vị trí sản phẩm
```

**Response:**
```json
{
  "removeId": [],
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0,
    "code": "",
    "barCode": "",
    "retailerId": 0,
    "allowsSale": true,
    "name": "",
    "categoryId": 0,
    "categoryName": "",
    "tradeMarkId": 0,
    "tradeMarkName": "",
    "fullName": "",
    "description": "",
    "hasVariants": false,
    "attributes": [{ "productId": 0, "attributeName": "", "attributeValue": "" }],
    "unit": "",
    "masterUnitId": null,
    "masterProductId": null,
    "conversionValue": null,
    "units": [{
      "id": 0, "code": "", "name": "", "fullName": "",
      "unit": "", "conversionValue": 0, "basePrice": 0
    }],
    "images": [{ "Image": "" }],
    "inventories": [{
      "productId": 0,
      "productCode": "",
      "productName": "",
      "branchId": 0,
      "branchName": "",
      "onHand": null,
      "cost": null,
      "onOrder": 0,
      "reserved": 0,
      "minQuality": 0,
      "maxQuality": 0
    }],
    "priceBooks": [{
      "priceBookId": 0, "priceBookName": "", "productId": 0,
      "isActive": true, "startDate": null, "endDate": null, "price": 0
    }],
    "basePrice": null,
    "weight": null,
    "modifiedDate": "",
    "createdDate": "",
    "minQuantity": 0,
    "maxQuantity": 0,
    "taxType": "",
    "taxRate": "",
    "taxRateDirect": null,
    "productTaxs": [{ "id": 0, "productId": 0, "taxId": 0, "value": null, "name": "" }],
    "purchaseTax": { "id": 0, "productId": 0, "taxId": 0, "value": null, "name": "" }
  }]
}
```

---

### 2.4.2. Lấy chi tiết hàng hóa

- **Method:** `GET`
- **URL by ID:** `https://public.kiotapi.com/products/{id}`
- **URL by Code:** `https://public.kiotapi.com/products/code/{code}`
- **URL with soft-deleted attrs:** `https://public.kiotapi.com/products/{id}?includeSoftDeletedAttribute=true`

---

### 2.4.3. Thêm mới hàng hóa

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/products`

**Request Body:**
```json
{
  "name": "",
  "code": "",
  "barCode": "",
  "fullName": "",
  "categoryId": 0,
  "allowsSale": true,
  "description": "",
  "hasVariants": false,
  "isProductSerial": false,
  "attributes": [{ "attributeName": "", "attributeValue": "" }],
  "unit": "",
  "masterProductId": null,
  "masterUnitId": null,
  "conversionValue": 1.0,
  "inventories": [{ "branchId": 0, "branchName": "", "onHand": null, "cost": null }],
  "basePrice": null,
  "weight": null,
  "images": [],
  "productTaxs": [{ "taxId": 0 }],
  "purchaseTax": { "taxId": 0 }
}
```

---

### 2.4.4. Cập nhật hàng hóa

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/products/{id}`
- **Query Param:** `branchId: int`

**Request Body:** Tương tự tạo mới, thêm `"isActive": bool`, `"isRewardPoint": bool`.

---

### 2.4.5. Xóa hàng hóa

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/products/{id}`

---

### 2.4.6. Lấy thông tin thuộc tính sản phẩm

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/attributes/allwithdistinctvalue`

**Response:**
```json
[{
  "name": "",
  "id": 0,
  "attributeValues": [
    { "value": "", "attributeId": 0 }
  ]
}]
```

---

### 2.4.7. Thêm mới danh sách hàng hóa (bulk)

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/listaddproducts`

**Request Body:** `{ "listProducts": [ {...}, {...} ] }`

---

### 2.4.8. Cập nhật danh sách hàng hóa (bulk)

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/listupdatedproducts`

**Request Body:** `{ "listProducts": [ { "id": 0, ... } ] }`

---

### 2.4.9. Lấy danh sách tồn kho hàng hóa

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/productOnHands`

**Request Params:**
```
orderBy          : string
orderDirection   : string   // Asc | Desc
lastModifiedFrom : datetime?
branchIds        : int[]
pageSize         : int      // tối đa 100
currentItem      : int
```

**Response:**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0,
    "code": "",
    "createdDate": null,
    "modifiedDate": null,
    "inventories": [
      { "branchId": 0, "onhand": 0.0, "reserved": 0.0 }
    ]
  }]
}
```

---

## 2.5. Đặt hàng (Orders)

> **Lưu ý:** API đặt hàng yêu cầu cửa hàng bật setting "Cho phép đặt hàng". Nếu tắt, API trả lỗi.

### 2.5.1. Lấy danh sách đặt hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/orders`

**Request Params:**
```
branchIds             : int[]
customerIds           : long[]
customerCode          : string
status                : int[]       // trạng thái đơn
includePayment        : boolean
includeOrderDelivery  : boolean
lastModifiedFrom      : datetime?
toDate                : datetime?
pageSize              : int?        // tối đa 100
currentItem           : int
orderBy               : string
orderDirection        : string      // Asc | Desc
createdDate           : datetime?
saleChannelId         : int?
```

**Response:**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0,
    "code": "",
    "purchaseDate": "",
    "branchId": 0,
    "branchName": "",
    "soldById": null,
    "soldByName": "",
    "customerId": null,
    "customerCode": "",
    "customerName": "",
    "total": 0,
    "totalPayment": 0,
    "discountRatio": null,
    "discount": null,
    "status": 0,
    "statusValue": "",
    "description": "",
    "usingCod": false,
    "totalTax": null,
    "saleChannelId": null,
    "modifiedDate": "",
    "createdDate": "",
    "payments": [{
      "id": 0, "code": "", "amount": 0, "method": "",
      "status": null, "statusValue": "", "transDate": "",
      "bankAccount": "", "accountId": null
    }],
    "orderDetails": [{
      "productId": 0,
      "productCode": "",
      "productName": "",
      "isMaster": true,
      "quantity": 0,
      "price": 0,
      "discountRatio": null,
      "discount": null,
      "note": ""
    }],
    "orderDelivery": {
      "deliveryCode": "", "type": null, "price": null,
      "receiver": "", "contactNumber": "", "address": "",
      "locationId": null, "locationName": "",
      "weight": null, "length": null, "width": null, "height": null,
      "partnerDeliveryId": null,
      "partnerDelivery": { "code": "", "name": "", "address": "", "contactNumber": "", "email": "" }
    }
  }]
}
```

---

### 2.5.2. Lấy chi tiết đặt hàng

- **URL by ID:** `GET https://public.kiotapi.com/orders/{id}`
- **URL by Code:** `GET https://public.kiotapi.com/orders/code/{code}`

---

### 2.5.3. Thêm mới đặt hàng

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/orders`

> Khi tạo từ KV Sync, thêm header: `Partner: KVSync`

**Request Body:**
```json
{
  "isApplyVoucher": true,
  "purchaseDate": "",
  "branchId": 0,
  "soldById": null,
  "cashierId": null,
  "discount": 0,
  "description": "",
  "method": "Cash",
  "totalPayment": 0,
  "accountId": null,
  "makeInvoice": false,
  "saleChannelId": null,
  "orderDetails": [{
    "productId": 0,
    "productCode": "",
    "productName": "",
    "quantity": 0,
    "price": 0,
    "discount": null,
    "discountRatio": null,
    "note": "",
    "OrderDetailTaxs": [{ "TaxId": 0 }]
  }],
  "orderDelivery": { ... },
  "customer": {
    "id": 0, "code": "", "name": "", "gender": true,
    "birthDate": "", "contactNumber": "", "address": "", "email": "", "comment": ""
  },
  "surchages": [{ "id": 0, "code": "", "price": 0 }],
  "Payments": [{
    "Method": "Voucher", "MethodStr": "Voucher",
    "Amount": 0, "Id": -1, "AccountId": null,
    "VoucherId": 0, "VoucherCampaignId": 0
  }]
}
```

**Tax IDs:**
- Thuế khấu trừ: `1`=VAT 0%, `2`=VAT 5%, `3`=VAT 8%, `4`=VAT 10%, `5`=KCT, `12`=KKKNT
- Thuế trực tiếp: `6`=1%, `7`=2%, `8`=3%, `9`=5%, `64`=0%+5%TNCN, `65`=0%+1.5%TNCN, `66`=0%+2%TNCN

---

### 2.5.4. Cập nhật đặt hàng

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/orders/{id}`

**Request Body:** Tương tự tạo mới.

---

### 2.5.5. Xóa đặt hàng

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/orders/{id}?IsVoidPayment=true`

**Params:**
```
id            : long
IsVoidPayment : bool  // hủy phiếu thanh toán kèm (mặc định false)
```

---

## 2.6. Khách hàng (Customers)

### 2.6.1. Lấy danh sách khách hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/customers`

**Request Params:**
```
code                   : string
name                   : string
contactNumber          : string
lastModifiedFrom       : datetime?
pageSize               : int?       // tối đa 100
currentItem            : int?
orderBy                : string
orderDirection         : string
includeRemoveIds       : boolean
includeTotal           : boolean    // lấy TotalInvoice, TotalPoint, TotalRevenue
includeCustomerGroup   : boolean
birthDate              : string
groupId                : int
includeCustomerSocial  : boolean    // lấy Psid Facebook fanpage
```

**Response:**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0, "code": "", "name": "",
    "gender": null, "birthDate": null,
    "contactNumber": "", "address": "",
    "locationName": "", "wardName": "",
    "email": "", "organization": "", "comments": "", "taxCode": "",
    "debt": 0, "totalInvoiced": null, "totalPoint": null, "totalRevenue": null,
    "retailerId": 0, "modifiedDate": null, "createdDate": "",
    "rewardPoint": null, "psidFacebook": null
  }],
  "removeId": []
}
```

---

### 2.6.2. Lấy chi tiết khách hàng

- **URL by ID:** `GET https://public.kiotapi.com/customers/{id}`
- **URL by Code:** `GET https://public.kiotapi.com/customers/code/{code}`

---

### 2.6.3. Thêm mới khách hàng

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/customers`

**Request Body:**
```json
{
  "code": "", "name": "", "gender": true,
  "birthDate": null, "contactNumber": "",
  "subNumber": "", "IdentificationNumber": "",
  "address": "", "locationName": "", "wardName": "",
  "email": "", "comments": "",
  "groupIds": [], "branchId": []
}
```

---

### 2.6.4. Cập nhật khách hàng

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/customers/{id}`

---

### 2.6.5. Xóa khách hàng

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/customers/{id}`

---

### 2.6.6. Thêm mới danh sách khách hàng (bulk)

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/listaddcutomers`
- **Body:** `{ "listCustomers": [...] }`

---

### 2.6.7. Cập nhật danh sách khách hàng (bulk)

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/listupdatecustomers`
- **Body:** `{ "listCustomers": [{ "id": 0, ... }] }`

---

## 2.7. Danh sách chi nhánh (Branches)

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/branches`

**Request Params:**
```
lastModifiedFrom  : datetime?
pageSize          : int?
currentItem       : int?
orderBy           : string
orderDirection    : string
includeRemoveIds  : boolean
```

**Response:**
```json
{
  "removedIds": [],
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0,
    "branchName": "",
    "branchCode": "",
    "contactNumber": "",
    "retailerId": 0,
    "email": "",
    "address": "",
    "modifiedDate": null,
    "createdDate": ""
  }],
  "timestamp": ""
}
```

---

## 2.8. Danh sách người dùng (Users)

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/users`

**Request Params:** `lastModifiedFrom`, `pageSize`, `currentItem`, `orderBy`, `orderDirection`, `includeRemoveIds`

**Response:**
```json
{
  "total": 0, "pageSize": 0,
  "data": [{
    "id": 0, "userName": "", "givenName": "",
    "address": "", "mobilePhone": "", "email": "",
    "description": "", "retailerId": 0,
    "birthDate": "", "createdDate": ""
  }],
  "removeIds": []
}
```

---

## 2.9. Danh sách tài khoản ngân hàng (Bank Accounts)

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/BankAccounts`

**Response:**
```json
{
  "total": 0, "pageSize": 0,
  "data": [{
    "id": 0, "bankName": "", "accountNumber": "",
    "description": "", "retailerId": 0,
    "modifiedDate": null, "createdDate": ""
  }],
  "removeIds": []
}
```

---

## 2.10. Thu khác (Surcharges)

### 2.10.1. Lấy danh sách thu khác

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/surchages`

**Request Params:** `branchId`, `lastModifiedFrom`, `pageSize`, `currentItem`, `orderBy`, `orderDirection`

---

### 2.10.2. Thêm mới thu khác

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/surchages`

**Body:** `{ "name": "", "code": "", "value": null }`

---

### 2.10.3. Cập nhật thu khác

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/surchages/{id}`

---

### 2.10.4. Ngừng/kích hoạt thu khác

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/surchages/{id}/activesurchage`
- **Body:** `{ "isActive": true }`

---

## 2.11. Webhook

> Webhook là cơ chế data push — KiotViet chủ động gọi vào server bên thứ ba khi có thay đổi.

**Lưu ý quan trọng:**
- Thời gian phản hồi tối đa: **5 giây**
- Nếu bên đăng ký trả về HTTP 4xx (400, 401, 403, 404, 405), KiotViet sẽ **ngưng gửi** request tới endpoint đó

### 2.11.1. Đăng ký Webhook

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/webhooks`

**Body:**
```json
{
  "Webhook": {
    "Type": "product.update",
    "Url": "https://your-server.com/webhook",
    "IsActive": true,
    "Description": "",
    "Secret": "<base64-encoded-secret>"
  }
}
```

**Secret / HMAC SHA-256:**
- Tạo mã bí mật ngẫu nhiên (≥8 ký tự), mã hóa Base64
- KiotViet ký bằng `HMAC-SHA256(secret, requestBody)` và truyền qua header `X-Hub-Signature`
- Bên nhận xác thực chữ ký; trả `401` nếu không khớp

---

### 2.11.2. Hủy đăng ký Webhook

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/webhooks/{id}`

---

### 2.11.11. Danh sách Webhook

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/webhooks`

---

### 2.11.12. Chi tiết Webhook

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/webhooks/{id}`

---

### Webhook Event Types

| Event | Trigger |
|-------|---------|
| `customer.update` | Cập nhật khách hàng |
| `customer.delete` | Xóa khách hàng |
| `product.update` | Cập nhật hàng hóa |
| `product.delete` | Xóa hàng hóa |
| `stock.update` | Cập nhật tồn kho |
| `order.update` | Cập nhật đặt hàng |
| `invoice.update` | Cập nhật hóa đơn |
| `pricebook.update` | Cập nhật bảng giá |
| `pricebook.delete` | Xóa bảng giá |
| `pricebookdetail.update` | Thêm hàng vào bảng giá |
| `pricebookdetail.delete` | Xóa hàng khỏi bảng giá |
| `category.update` | Cập nhật danh mục |
| `category.delete` | Xóa danh mục |
| `branch.update` | Cập nhật chi nhánh |
| `branch.delete` | Xóa chi nhánh |

**Webhook Payload Structure (example: stock.update):**
```json
{
  "Id": "string",
  "Attempt": 0,
  "Notifications": [{
    "Action": "string",
    "Data": [{
      "ProductId": 0,
      "ProductCode": "",
      "ProductName": "",
      "BranchId": 0,
      "BranchName": "",
      "Cost": 0,
      "OnHand": 0,
      "Reserved": 0
    }]
  }]
}
```

---

## 2.12. Hóa đơn (Invoices)

### 2.12.1. Lấy danh sách hóa đơn

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/invoices`

**Request Params:**
```
branchIds              : int[]
customerIds            : long[]
customerCode           : string
status                 : int[]
includePayment         : boolean
includeInvoiceDelivery : boolean
lastModifiedFrom       : datetime?
toDate                 : datetime?
pageSize               : int?         // tối đa 100
currentItem            : int
orderBy                : string
orderDirection         : string
orderId                : long?        // filter theo đơn đặt hàng
createdDate            : datetime?
fromPurchaseDate       : datetime?
toPurchaseDate         : datetime?
```

**Response:**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0, "code": "", "purchaseDate": "",
    "branchId": 0, "branchName": "",
    "soldById": null, "soldByName": "",
    "customerId": null, "customerCode": "", "customerName": "",
    "total": 0, "totalPayment": 0,
    "status": 0, "statusValue": "",
    "usingCod": false,
    "createdDate": "", "modifiedDate": "",
    "totalTax": null,
    "payments": [{ ... }],
    "invoiceOrderSurcharges": [{ ... }],
    "invoiceDetails": [{
      "productId": 0, "productCode": "", "productName": "",
      "quantity": 0, "price": 0,
      "discountRatio": null, "discount": null, "note": "",
      "serialNumbers": "",
      "productBatchExpire": { "id": 0, "batchName": "", "expireDate": "" }
    }],
    "invoiceDelivery": {
      "deliveryCode": "", "type": null, "status": 0, "statusValue": "",
      "price": null, "receiver": "", "contactNumber": "", "address": "",
      "usingPriceCod": false, "priceCodPayment": 0,
      "partnerDelivery": { ... }
    }
  }]
}
```

**Invoice Delivery Status:**
`1`=Chờ xử lý, `2`=Đang giao hàng, `3`=Giao thành công, `4`=Đang chuyển hoàn, `5`=Đã chuyển hoàn, `6`=Đã hủy, `7`=Đang lấy hàng, `8`=Chờ lấy lại, `9`=Đã lấy hàng, `10`=Chờ giao lại, `11`=Chờ chuyển hàng, `12`=Chờ chuyển hoàn lại

---

### 2.12.2. Lấy chi tiết hóa đơn

- **URL by ID:** `GET https://public.kiotapi.com/invoices/{id}`
- **URL by Code:** `GET https://public.kiotapi.com/invoices/code/{code}`

---

### 2.12.3. Thêm mới hóa đơn

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/invoices`

**Request Body:**
```json
{
  "isApplyVoucher": true,
  "branchId": 0,
  "purchaseDate": "",
  "customerId": null,
  "discount": null,
  "totalPayment": 0,
  "saleChannelId": null,
  "method": "Cash",
  "accountId": null,
  "usingCod": false,
  "soldById": 0,
  "orderId": null,
  "invoiceDetails": [{
    "productId": 0, "productCode": "", "productName": "",
    "quantity": 0, "price": 0, "discount": null,
    "discountRatio": null, "note": "", "serialNumbers": "",
    "InvoiceDetailTaxs": [{ "TaxId": 0 }]
  }],
  "deliveryDetail": {
    "deliveryCode": "", "type": null, "status": 0,
    "price": null, "receiver": "", "contactNumber": "",
    "address": "", "locationId": 0, "locationName": "", "wardName": "",
    "weight": 0, "length": 0, "width": 0, "height": 0,
    "usingPriceCod": false, "partnerDeliveryId": null,
    "expectedDelivery": "", "partnerDelivery": { ... }
  },
  "surchages": [{ "id": 0, "code": "", "price": 0 }],
  "Payments": [{
    "Method": "Voucher", "MethodStr": "Voucher",
    "Amount": 0, "Id": -1, "AccountId": null,
    "VoucherId": 0, "VoucherCampaignId": 0
  }]
}
```

---

### 2.12.4. Cập nhật hóa đơn

- **Method:** `PUT`
- **URL:** `https://public.kiotapi.com/invoices/{id}`

**Key fields:** `purchaseDate`, `status`, `soldById`, `codPaymentMethod`, `deliveryDetail`, `invoiceDetails`

---

### 2.12.5. Xóa hóa đơn

- **Method:** `DELETE`
- **URL:** `https://public.kiotapi.com/invoices`

**Body:**
```json
{
  "id": 0,
  "isVoidPayment": false
}
```

---

## 2.13. Nhóm khách hàng (Customer Groups)

### 2.13.1. Lấy danh sách nhóm khách hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/customers/group`

**Response:**
```json
{
  "total": 0,
  "data": [{
    "id": 0,
    "name": "",
    "description": "",
    "createdDate": "",
    "createdBy": 0,
    "retailerId": 0,
    "discount": null,
    "customerGroupDetails": [
      { "id": 0, "customerId": 0, "groupId": 0 }
    ]
  }]
}
```

---

## 2.14. Sổ quỹ (Cash Flow)

### 2.14.1. Lấy danh sách sổ quỹ

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/cashflow`

**Request Params:**
```
branchIds                : int[]
code                     : string[]
userId                   : long?
accountId                : int?
partnerType              : string    // A: tất cả, C: khách hàng, S: nhà cung cấp, U: nhân viên, D: đối tác giao hàng, O: khác
method                   : string[]
cashFlowGroupId          : int?[]
usedForFinancialReporting: int?      // 0: không hoạch toán, 1: hoạch toán
partnerName              : string
contactNumber            : string
isReceipt                : bool?     // true: thu, false: chi
includeAccount           : bool
includeBranch            : bool?
includeUser              : bool?
startDate                : datetime?
endDate                  : datetime?
status                   : int?      // 0: Đã thanh toán, 1: Đã hủy
ids                      : long?[]
pageSize                 : int?
```

---

### 2.14.2. Thanh toán hóa đơn

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/payments`

**Body:**
```json
{
  "amount": 0,
  "method": "Cash",
  "accountId": null,
  "invoiceId": 0
}
```

**Response:**
```json
{
  "paymentId": 0,
  "paymentCode": "",
  "amount": 0,
  "method": "Cash",
  "accountId": null,
  "invoiceId": 0,
  "DocumentCode": 0
}
```

---

## 2.15. Nhập hàng / Purchase Orders

### 2.15.1. Lấy danh sách nhập hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/purchaseorders`

**Request Params:**
```
branchIds            : int[]
status               : int[]
includePayment       : boolean
includeOrderDelivery : boolean
fromPurchaseDate     : date?
toPurchaseDate       : date?
pageSize             : int?
TaxIds               : int[]
```

**Response:**
```json
{
  "total": 0,
  "pageSize": 0,
  "data": [{
    "id": 0, "code": "",
    "branchId": 0, "branchName": "",
    "purchaseDate": "",
    "discountRatio": 0,
    "total": 0,
    "supplierId": 0, "supplierName": "", "supplierCode": "",
    "purchaseById": null, "purchaseName": "",
    "totalTax": null,
    "purchaseOrderDetails": [{
      "productId": 0, "ProductCode": "", "productName": "",
      "quantity": 0, "price": 0, "discount": "",
      "serialNumbers": "",
      "productBatchExpire": { "id": 0, "batchName": "", "expireDate": "" },
      "purchaseOrderDetailTaxes": [{ "id": 0, "detailId": 0, "taxId": 0, "detailTax": null }]
    }]
  }]
}
```

---

### 2.15.2. Lấy chi tiết nhập hàng

- **Method:** `GET`
- **URL:** `https://public.kiotapi.com/purchaseorders/{id}`

---

### 2.15.3. Thêm mới nhập hàng

- **Method:** `POST`
- **URL:** `https://public.kiotapi.com/purchaseorders`

**Request Body:**
```json
{
  "purchaseDate": "",
  "branchId": 0,
  "supplier": {
    "code": "", "name": "", "contactNumber": "",
    "address": "", "email": "", "comment": ""
  },
  "description": "",
  "isDraft": 0,
  "discount": null,
  "discountRatio": null,
  "paidAmount": 0,
  "paymentMethod": "Cash",
  "accountId": null,
  "isApplyPurchaseTax": false,
  "surcharges": [{
    "code": "", "name": "", "value": null,
    "valueRatio": null, "isSupplierExpense": false, "type": 0
  }],
  "purchaseOrderDetails": [{
    "productCode": "",
    "description": "",
    "quantity": 0,
    "price": 0,
    "discount": null,
    "discountRatio": null,
    "productTax": { "taxId": 0, "productId": 0 }
  }]
}
```

---

## Quick Reference — Endpoint Summary

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 2.2 | POST | `/connect/token` (id.kiotviet.vn) | Lấy Access Token |
| 2.3.1 | GET | `/categories` | Danh sách nhóm hàng |
| 2.3.2 | GET | `/categories/{id}` | Chi tiết nhóm hàng |
| 2.3.3 | POST | `/categories` | Tạo nhóm hàng |
| 2.3.4 | PUT | `/categories/{id}` | Cập nhật nhóm hàng |
| 2.3.5 | DELETE | `/categories/{id}` | Xóa nhóm hàng |
| 2.4.1 | GET | `/products` | Danh sách hàng hóa + tồn kho |
| 2.4.2 | GET | `/products/{id}` | Chi tiết hàng hóa |
| 2.4.3 | POST | `/products` | Tạo hàng hóa |
| 2.4.4 | PUT | `/products/{id}` | Cập nhật hàng hóa |
| 2.4.5 | DELETE | `/products/{id}` | Xóa hàng hóa |
| 2.4.6 | GET | `/attributes/allwithdistinctvalue` | Thuộc tính sản phẩm |
| 2.4.7 | POST | `/listaddproducts` | Tạo hàng hóa (bulk) |
| 2.4.8 | PUT | `/listupdatedproducts` | Cập nhật hàng hóa (bulk) |
| 2.4.9 | GET | `/productOnHands` | Tồn kho hàng hóa |
| 2.5.1 | GET | `/orders` | Danh sách đặt hàng |
| 2.5.2 | GET | `/orders/{id}` | Chi tiết đặt hàng |
| 2.5.3 | POST | `/orders` | Tạo đặt hàng |
| 2.5.4 | PUT | `/orders/{id}` | Cập nhật đặt hàng |
| 2.5.5 | DELETE | `/orders/{id}` | Xóa đặt hàng |
| 2.6.1 | GET | `/customers` | Danh sách khách hàng |
| 2.6.2 | GET | `/customers/{id}` | Chi tiết khách hàng |
| 2.6.3 | POST | `/customers` | Tạo khách hàng |
| 2.6.4 | PUT | `/customers/{id}` | Cập nhật khách hàng |
| 2.6.5 | DELETE | `/customers/{id}` | Xóa khách hàng |
| 2.7 | GET | `/branches` | Danh sách chi nhánh |
| 2.8 | GET | `/users` | Danh sách người dùng |
| 2.9 | GET | `/BankAccounts` | Tài khoản ngân hàng |
| 2.10.1 | GET | `/surchages` | Danh sách thu khác |
| 2.11.1 | POST | `/webhooks` | Đăng ký webhook |
| 2.11.2 | DELETE | `/webhooks/{id}` | Hủy webhook |
| 2.11.11 | GET | `/webhooks` | Danh sách webhook |
| 2.12.1 | GET | `/invoices` | Danh sách hóa đơn |
| 2.12.2 | GET | `/invoices/{id}` | Chi tiết hóa đơn |
| 2.12.3 | POST | `/invoices` | Tạo hóa đơn |
| 2.12.4 | PUT | `/invoices/{id}` | Cập nhật hóa đơn |
| 2.12.5 | DELETE | `/invoices` | Xóa hóa đơn |
| 2.13.1 | GET | `/customers/group` | Nhóm khách hàng |
| 2.14.1 | GET | `/cashflow` | Sổ quỹ |
| 2.14.2 | POST | `/payments` | Thanh toán hóa đơn |
| 2.15.1 | GET | `/purchaseorders` | Danh sách nhập hàng |
| 2.15.2 | GET | `/purchaseorders/{id}` | Chi tiết nhập hàng |
| 2.15.3 | POST | `/purchaseorders` | Tạo phiếu nhập hàng |
