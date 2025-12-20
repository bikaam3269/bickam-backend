# دليل التحقق من صحة Agora Token

## نظرة عامة

الآن النظام يتحقق تلقائياً من صحة الـ token بعد توليده. يمكنك أيضاً التحقق يدوياً من الـ token.

## التحقق التلقائي

عند توليد token، النظام يتحقق تلقائياً من:

1. ✅ **Token Format**: يبدأ بـ `006`
2. ✅ **Token Length**: طول معقول (50-1000 حرف)
3. ✅ **App ID Match**: App ID في الـ token يطابق App ID المُكوّن
4. ✅ **Token Structure**: البنية الأساسية للـ token

### Response يحتوي على معلومات التحقق

```json
{
  "statusCode": 200,
  "message": "Token generated successfully",
  "data": {
    "token": "...",
    "channelName": "...",
    "uid": 10,
    "uidType": "number",
    "role": "subscriber",
    "appId": "39eda0b38ebe46dfa8f0f34ae13979ea",
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

## التحقق اليدوي

### 1. من الـ Logs

ابحث عن:
```
✅ Token Validation: PASSED
🔑 Agora Token Generated Successfully: {
  validation: {
    isValid: true,
    errors: [],
    warnings: []
  }
}
```

### 2. من الـ Response

تحقق من `validation.isValid`:
- `true`: الـ token صحيح
- `false`: الـ token به مشاكل (راجع `errors` و `warnings`)

### 3. استخدام API Endpoint

#### Endpoint: `POST /api/v1/live-streams/validate-token`

```bash
POST /api/v1/live-streams/validate-token
Content-Type: application/json

{
  "token": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
  "channelName": "channel_5_1234567890",  // Optional
  "uid": 10,                              // Optional
  "role": "subscriber"                    // Optional
}
```

#### Response:

```json
{
  "statusCode": 200,
  "message": "Token is valid",
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "details": {
      "format": "valid",
      "length": 256,
      "startsWith": "00639eda0b",
      "appIdMatch": true,
      "appIdFound": true,
      "validatedAt": "2024-01-01T12:00:00.000Z",
      "tokenPreview": "00639eda0b38ebe46dfa8f0f34ae13979ea..."
    }
  }
}
```

#### مثال باستخدام curl:

```bash
curl -X POST http://localhost:5000/api/v1/live-streams/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "00639eda0b38ebe46dfa8f0f34ae13979ea..."
  }'
```

## معايير التحقق

### ✅ Token صحيح إذا:
- يبدأ بـ `006`
- طوله بين 50-1000 حرف
- يحتوي على App ID الصحيح
- البنية الأساسية صحيحة

### ❌ Token غير صحيح إذا:
- لا يبدأ بـ `006`
- طوله أقل من 50 حرف
- App ID لا يطابق App ID المُكوّن
- البنية الأساسية غير صحيحة

## أمثلة

### مثال 1: Token صحيح

```javascript
// Response
{
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}

// Logs
✅ Token Validation: PASSED {
  length: 256,
  appIdMatch: true,
  warnings: 0
}
```

### مثال 2: Token به تحذيرات

```javascript
// Response
{
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [
      "Token length (450) is shorter than expected minimum (500)"
    ]
  }
}

// Logs
✅ Token Validation: PASSED {
  length: 450,
  appIdMatch: true,
  warnings: 1
}
```

### مثال 3: Token غير صحيح

```javascript
// Response
{
  "validation": {
    "isValid": false,
    "errors": [
      "Token does not start with expected prefix \"006\"",
      "Token App ID (xxx) does not match configured App ID (39eda0b38ebe46dfa8f0f34ae13979ea)"
    ],
    "warnings": []
  }
}

// Logs
❌ Token Validation: FAILED {
  errors: [
    "Token does not start with expected prefix \"006\"",
    "Token App ID (xxx) does not match configured App ID (39eda0b38ebe46dfa8f0f34ae13979ea)"
  ],
  warnings: 0
}
```

## استخدام في Flutter

### التحقق من الـ Response

```dart
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber',
);

// Check validation
if (tokenResponse.validation.isValid) {
  print('✅ Token is valid');
  // Use token
  await agoraEngine!.joinChannel(
    token: tokenResponse.token,
    channelId: tokenResponse.channelName,
    uid: tokenResponse.uid,
    // ...
  );
} else {
  print('❌ Token validation failed:');
  tokenResponse.validation.errors.forEach((error) {
    print('  - $error');
  });
  // Handle error
}
```

## ملاحظات مهمة

1. **التحقق التلقائي**: يتم تلقائياً عند توليد الـ token
2. **التحقق اليدوي**: يمكن استخدام API endpoint للتحقق
3. **التحقق من Agora SDK**: التحقق النهائي يتم من Agora SDK عند `joinChannel`
4. **Errors vs Warnings**: 
   - **Errors**: مشاكل خطيرة تجعل الـ token غير صالح
   - **Warnings**: مشاكل محتملة لكن الـ token قد يعمل

## Troubleshooting

### إذا كان `isValid: false`:

1. **تحقق من App Certificate**: يجب أن يكون مفعّل في Agora Console
2. **تحقق من App ID**: يجب أن يطابق App ID في Agora Console
3. **تحقق من الـ Logs**: راجع رسائل الخطأ بالتفصيل
4. **استخدم Agora Token Validator**: [Agora Token Validator](https://www.agora.io/en/blog/token-validator/)

### إذا كان `warnings` موجودة:

- الـ token قد يعمل لكن هناك تحذيرات
- راجع التحذيرات وقرر إذا كانت مهمة
- في معظم الحالات، التحذيرات لا تمنع الـ token من العمل

## API Reference

### POST /api/v1/live-streams/validate-token

**Request Body:**
```json
{
  "token": "string (required)",
  "channelName": "string (optional)",
  "uid": "number|string (optional)",
  "role": "string (optional)"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Token is valid" | "Token validation failed",
  "data": {
    "isValid": boolean,
    "errors": string[],
    "warnings": string[],
    "details": {
      "format": "valid" | "invalid",
      "length": number,
      "startsWith": string,
      "appIdMatch": boolean,
      "appIdFound": boolean,
      "validatedAt": string,
      "tokenPreview": string
    }
  }
}
```


