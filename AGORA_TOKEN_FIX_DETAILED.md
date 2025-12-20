# حل مشكلة Agora errInvalidToken - دليل شامل

## المشكلة
عند استخدام الـ token المولّد من API، يظهر الخطأ:
```
Agora Error: ErrorCodeType.errInvalidToken
```

## الأسباب المحتملة

### 1. **مشكلة في نوع الـ UID**
- Agora يدعم نوعين من الـ UIDs:
  - **Numeric UID**: رقم (0-4294967295)
  - **String UID (Account)**: نص (account-based)
- بعض الحالات تتطلب string UID بدلاً من numeric

### 2. **عدم تطابق App ID**
- الـ App ID في Flutter يجب أن يطابق الـ App ID في Backend

### 3. **عدم تطابق Channel Name**
- Channel name يجب أن يكون مطابق تماماً (case-sensitive)

### 4. **عدم تطابق Role**
- Role في token يجب أن يطابق role في `joinChannel`

### 5. **Token منتهي الصلاحية**
- Token صالح لمدة 24 ساعة افتراضياً

## الحلول المطبقة

### 1. دعم كلا نوعي الـ UID
الآن الكود يدعم:
- **Numeric UID**: للاستخدام العادي
- **String UID**: كـ fallback إذا فشل numeric

```javascript
// في agoraService.js
generateToken(channelName, uid, role, expirationTimeInSeconds, useStringUid = false) {
  if (useStringUid || typeof uid === 'string') {
    // Use account-based token
    token = RtcTokenBuilder.buildTokenWithAccount(...);
  } else {
    // Use numeric UID token
    token = RtcTokenBuilder.buildTokenWithUid(...);
  }
}
```

### 2. Fallback Mechanism
إذا فشل توليد token بـ numeric UID، يتم المحاولة بـ string UID تلقائياً:

```javascript
// في liveStreamService.js
try {
  // Try numeric UID first
  token = agoraService.generateToken(..., numericUserId, ..., false);
} catch (error) {
  // Fallback to string UID
  token = agoraService.generateToken(..., String(numericUserId), ..., true);
}
```

### 3. Enhanced Logging
تم إضافة logging مفصل لتشخيص المشاكل:

```javascript
console.log('🔑 Token Generation Details:', {
  channelName,
  uid,
  role,
  useStringUid,
  appId,
  tokenLength,
  expirationTimeInSeconds
});
```

### 4. Response يحتوي على معلومات إضافية
الآن الـ response يحتوي على:
```json
{
  "token": "...",
  "channelName": "...",
  "uid": 10,
  "uidType": "number",  // ✅ جديد: نوع الـ UID
  "role": "subscriber",
  "appId": "39eda0b38ebe46dfa8f0f34ae13979ea"
}
```

## كيفية الاستخدام في Flutter

### 1. الحصول على Token
```dart
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber',
);
```

### 2. استخدام الـ UID الصحيح
```dart
// Check UID type from response
dynamic uid;
if (tokenResponse.uidType == 'string') {
  // Use as string
  uid = tokenResponse.uid.toString();
} else {
  // Use as number
  uid = tokenResponse.uid;
}
```

### 3. Join Channel
```dart
await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: uid, // Use the correct UID type
  options: ChannelMediaOptions(
    clientRoleType: tokenResponse.role == 'publisher'
        ? ClientRoleType.clientRoleBroadcaster
        : ClientRoleType.clientRoleAudience,
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
  ),
);
```

## Debugging Steps

### 1. تحقق من الـ Logs في Backend
ابحث عن:
```
🔑 Token Generation Details: { ... }
🔑 Agora Token Generated Successfully: { ... }
```

### 2. تحقق من الـ Response
```dart
print('Token Response:');
print('  App ID: ${tokenResponse.appId}');
print('  Channel: ${tokenResponse.channelName}');
print('  UID: ${tokenResponse.uid}');
print('  UID Type: ${tokenResponse.uidType}');
print('  Role: ${tokenResponse.role}');
print('  Token: ${tokenResponse.token.substring(0, 50)}...');
```

### 3. تحقق من Flutter Code
- ✅ App ID يطابق `tokenResponse.appId`
- ✅ Channel name يطابق `tokenResponse.channelName`
- ✅ UID يطابق `tokenResponse.uid` (مع مراعاة النوع)
- ✅ Role يطابق `tokenResponse.role`

## Checklist

قبل الإبلاغ عن خطأ، تأكد من:

- [ ] استخدم `tokenResponse.appId` في `initialize`
- [ ] استخدم `tokenResponse.channelName` في `joinChannel`
- [ ] استخدم `tokenResponse.uid` مع مراعاة `uidType`
- [ ] استخدم `tokenResponse.role` لتحديد `clientRoleType`
- [ ] تحقق من الـ logs في Backend
- [ ] تحقق من أن الـ token غير منتهي الصلاحية
- [ ] تحقق من أن الـ live stream status هو `live`

## إذا استمرت المشكلة

### 1. تحقق من Agora Credentials
```javascript
// في agoraService.js
console.log('App ID:', this.appId);
console.log('App Certificate:', this.appCertificate ? 'Set' : 'Not Set');
```

### 2. تحقق من Token Format
الـ token يجب أن يبدأ بـ:
- `006` للـ App ID
- يليه الـ App ID
- ثم معلومات الـ token

### 3. Test Token Manually
استخدم [Agora Token Validator](https://www.agora.io/en/blog/token-validator/) للتحقق من صحة الـ token.

### 4. Contact Support
إذا استمرت المشكلة، قدم:
- الـ logs من Backend
- الـ response من API
- كود Flutter المستخدم
- رسالة الخطأ الكاملة

## ملاحظات مهمة

1. **UID Type**: الآن النظام يدعم كلا النوعين تلقائياً
2. **Fallback**: إذا فشل numeric UID، سيتم المحاولة بـ string UID
3. **Logging**: جميع التفاصيل مسجلة للـ debugging
4. **Response**: يحتوي على معلومات كافية للاستخدام الصحيح

## التغييرات في الكود

### agoraService.js
- ✅ دعم `buildTokenWithAccount` للـ string UID
- ✅ دعم `buildTokenWithUid` للـ numeric UID
- ✅ Enhanced logging
- ✅ Better error handling

### liveStreamService.js
- ✅ Fallback mechanism
- ✅ Enhanced logging
- ✅ Return uidType في الـ response


