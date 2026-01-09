# Postman Collection Update Guide

## Updated Endpoints with New Query Parameters

### 1. Banners - GET `/api/v1/banners`

**New Optional Query Parameters:**
- `vendorId` (number) - Filter by vendor ID
- `governorateId` (number) - Filter by governorate ID  
- `action` (string) - Filter by action field
- `includeInactive` (boolean) - Include inactive banners (default: false)

**Example Requests:**
```
GET /api/v1/banners
GET /api/v1/banners?vendorId=10
GET /api/v1/banners?governorateId=5
GET /api/v1/banners?action=vendor_10
GET /api/v1/banners?vendorId=10&governorateId=5&includeInactive=true
```

---

### 2. Live Streams - GET `/api/v1/live-streams`

**New Optional Query Parameters:**
- `governorateId` (number) - Filter by vendor's governorate ID

**Example Requests:**
```
GET /api/v1/live-streams
GET /api/v1/live-streams?governorateId=5
```

**Response includes (for authenticated users):**
- `token` - Subscriber/Publisher token for the user
- `uid` - User ID to use in joinChannel
- `uidType` - Always "number"
- `role` - "publisher" (if vendor) or "subscriber" (if user)
- `appId` - Agora App ID

---

### 3. Products - GET `/api/v1/products`

**Existing Query Parameters (already supported):**
- `governorateId` (number) - Filter by vendor's governorate ID
- `vendorId` (number)
- `categoryId` (number)
- `subcategoryId` (number)
- `search` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `isActive` (boolean)
- `minQuantity` (number)
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `status` (string) - 'published', 'pending', 'rejected'

**Example Requests:**
```
GET /api/v1/products
GET /api/v1/products?governorateId=5
GET /api/v1/products?governorateId=5&categoryId=3&search=laptop
```

---

### 4. Vendors - GET `/api/v1/vendors`

**Existing Query Parameters (already supported):**
- `governorateId` (number) - Filter by vendor's governorate ID
- `categoryId` (number)
- `search` (string)
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Example Requests:**
```
GET /api/v1/vendors
GET /api/v1/vendors?governorateId=5
GET /api/v1/vendors?governorateId=5&categoryId=3&search=electronics
```

---

### 5. Marketplace Products - GET `/api/v1/marketplace-products`

**New Optional Query Parameters:**
- `governorateId` (number) - Filter by user's governorate ID
- `search` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Example Requests:**
```
GET /api/v1/marketplace-products
GET /api/v1/marketplace-products?governorateId=5
GET /api/v1/marketplace-products?governorateId=5&search=phone&minPrice=100
```

---

### 6. Marketplace Products (Admin) - GET `/api/v1/marketplace-products/admin`

**New Optional Query Parameters:**
- `governorateId` (number) - Filter by user's governorate ID
- `status` (string) - 'approved', 'pending', 'rejected'
- `userId` (number)
- `search` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Example Requests:**
```
GET /api/v1/marketplace-products/admin?governorateId=5
GET /api/v1/marketplace-products/admin?governorateId=5&status=pending
```

---

## Important Notes:

1. **All `governorateId` filters are optional** - If not provided, all results are returned
2. **Banner filters** - `vendorId`, `governorateId`, and `action` are all optional
3. **Live Stream tokens** - Only returned for authenticated users. Vendors get publisher tokens, users get subscriber tokens
4. **Response format** - All endpoints return data in the standard format:
   ```json
   {
     "statusCode": 200,
     "message": "Success message",
     "data": [...]
   }
   ```

---

## Postman Collection Update Steps:

1. **Banners Endpoint:**
   - Add query parameters: `vendorId`, `governorateId`, `action`, `includeInactive`

2. **Live Streams Endpoint:**
   - Add query parameter: `governorateId`
   - Note: Response includes `token`, `uid`, `role`, `appId` for authenticated users

3. **Marketplace Products Endpoint:**
   - Add query parameter: `governorateId`

4. **Marketplace Products Admin Endpoint:**
   - Add query parameter: `governorateId`

5. **Products & Vendors:**
   - Already support `governorateId` - verify it's documented

---

## Testing Examples:

### Test Banner Filtering:
```
GET {{base_url}}/api/v1/banners?vendorId=10
GET {{base_url}}/api/v1/banners?governorateId=5
GET {{base_url}}/api/v1/banners?action=vendor_10&includeInactive=true
```

### Test Live Stream with Governorate:
```
GET {{base_url}}/api/v1/live-streams?governorateId=5
Authorization: Bearer {{user_token}}
```

### Test Marketplace Products with Governorate:
```
GET {{base_url}}/api/v1/marketplace-products?governorateId=5&search=laptop
```

---

## Response Examples:

### Live Streams Response (with token):
```json
{
  "statusCode": 200,
  "message": "Active live streams retrieved successfully",
  "data": [
    {
      "id": 34,
      "vendorId": 10,
      "title": "Live Stream Title",
      "channelName": "channel_10_1767963235557",
      "status": "live",
      "token": "00690125dcd7d7949b...",
      "uid": 123,
      "uidType": "number",
      "role": "subscriber",
      "appId": "90125dcd7d7949be8b9c617d24a15347"
    }
  ]
}
```

---

Last Updated: 2026-01-09

