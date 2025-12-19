# حل مشكلة Agora Error: errInvalidToken

## المشكلة
عند محاولة الانضمام لقناة Agora في Flutter، يظهر الخطأ:
```
Agora Error: ErrorCodeType.errInvalidToken
```

## الأسباب المحتملة

### 1. عدم تطابق App ID
- **المشكلة**: الـ App ID في Flutter مختلف عن الـ App ID في Backend
- **الحل**: استخدم نفس الـ App ID في كلا المكانين

### 2. عدم تطابق Role
- **المشكلة**: الـ token تم توليده كـ `subscriber` لكن تستخدم `clientRoleBroadcaster` في Flutter
- **الحل**: تأكد من أن الـ role في Flutter يطابق الـ role المستخدم في توليد الـ token

### 3. عدم تطابق UID
- **المشكلة**: الـ uid المستخدم في Flutter مختلف عن الـ userId المستخدم في توليد الـ token
- **الحل**: استخدم نفس الـ uid من الـ response

### 4. Channel Name غير صحيح
- **المشكلة**: الـ channelName في Flutter مختلف عن الـ channelName في الـ response
- **الحل**: استخدم الـ channelName من الـ response مباشرة

## الحلول المطبقة

### 1. إضافة App ID في الـ Response
الآن الـ API يرجع App ID مع الـ token:

```json
{
  "statusCode": 200,
  "message": "Token generated successfully",
  "data": {
    "token": "agora_token_here",
    "channelName": "channel_5_1234567890",
    "uid": 10,
    "role": "subscriber",
    "appId": "39eda0b38ebe46dfa8f0f34ae13979ea"  // ✅ جديد
  }
}
```

### 2. تحسين Validation
- التأكد من أن الـ userId رقم صحيح
- Logging أفضل للـ debugging

## كيفية الاستخدام الصحيح في Flutter

### الخطوة 1: الحصول على Token
```dart
// Get token from API
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber', // أو 'publisher' للبائع
);

// Response contains:
// - token: Agora token
// - channelName: Channel name
// - uid: User ID (use this exact value)
// - role: 'publisher' or 'subscriber'
// - appId: Agora App ID (use this exact value)
```

### الخطوة 2: تهيئة Agora SDK
```dart
// Initialize Agora with App ID from response
agoraEngine = createAgoraRtcEngine();
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId, // ✅ استخدم App ID من الـ response
));
```

### الخطوة 3: الانضمام للقناة
```dart
// Determine role based on tokenResponse.role
ClientRoleType clientRole;
if (tokenResponse.role == 'publisher') {
  clientRole = ClientRoleType.clientRoleBroadcaster;
} else {
  clientRole = ClientRoleType.clientRoleAudience;
}

// Join channel with exact values from response
await agoraEngine!.joinChannel(
  token: tokenResponse.token,           // ✅ Token من الـ response
  channelId: tokenResponse.channelName, // ✅ Channel name من الـ response
  uid: tokenResponse.uid,               // ✅ UID من الـ response
  options: ChannelMediaOptions(
    clientRoleType: clientRole,         // ✅ Role بناءً على tokenResponse.role
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    publishCameraTrack: tokenResponse.role == 'publisher',
    publishMicrophoneTrack: tokenResponse.role == 'publisher',
  ),
);
```

## مثال كامل صحيح

### للبائع (Vendor/Publisher)
```dart
// 1. Get publisher token
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'publisher', // ✅ publisher للبائع
);

// 2. Initialize Agora
agoraEngine = createAgoraRtcEngine();
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId, // ✅ من الـ response
));

// 3. Enable video/audio
await agoraEngine!.enableVideo();
await agoraEngine!.enableAudio();

// 4. Join as broadcaster
await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleBroadcaster, // ✅ broadcaster
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    publishCameraTrack: true,
    publishMicrophoneTrack: true,
  ),
);
```

### للمشاهد (User/Subscriber)
```dart
// 1. Get subscriber token
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber', // ✅ subscriber للمشاهد
);

// 2. Initialize Agora
agoraEngine = createAgoraRtcEngine();
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId, // ✅ من الـ response
));

// 3. Join as audience
await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience, // ✅ audience
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    publishCameraTrack: false,
    publishMicrophoneTrack: false,
  ),
);

// 4. Listen for remote video/audio
agoraEngine!.registerEventHandler(
  RtcEngineEventHandler(
    onUserJoined: (uid, elapsed) {
      print('User joined: $uid');
    },
    onUserPublished: (uid, mediaType) async {
      await agoraEngine!.subscribe(uid, mediaType);
      if (mediaType == 'video') {
        // Display remote video
      }
    },
  ),
);
```

## Checklist للتحقق من المشكلة

قبل الإبلاغ عن خطأ، تأكد من:

- [ ] الـ App ID في Flutter يطابق الـ App ID من الـ response
- [ ] الـ role في Flutter يطابق الـ role من الـ response
  - `publisher` → `clientRoleBroadcaster`
  - `subscriber` → `clientRoleAudience`
- [ ] الـ uid في Flutter يطابق الـ uid من الـ response
- [ ] الـ channelName في Flutter يطابق الـ channelName من الـ response
- [ ] الـ token غير منتهي الصلاحية (24 ساعة)
- [ ] الـ live stream status هو `live` (للمشاهدين)
- [ ] المستخدم مسجل دخول (token موجود في header)

## Debugging

### 1. Log الـ Response
```dart
print('Token Response:');
print('  App ID: ${tokenResponse.appId}');
print('  Channel: ${tokenResponse.channelName}');
print('  UID: ${tokenResponse.uid}');
print('  Role: ${tokenResponse.role}');
print('  Token length: ${tokenResponse.token.length}');
```

### 2. Log في Backend
الـ Backend الآن يسجل معلومات الـ token:
```
🔑 Agora Token Generated: {
  liveStreamId: 123,
  userId: 10,
  role: 'subscriber',
  channelName: 'channel_5_1234567890',
  appId: '39eda0b38ebe46dfa8f0f34ae13979ea',
  tokenLength: 256
}
```

### 3. التحقق من الـ Token
يمكنك استخدام [Agora Token Validator](https://www.agora.io/en/blog/token-validator/) للتحقق من صحة الـ token.

## ملاحظات مهمة

1. **لا تستخدم App ID hardcoded**: دائماً استخدم الـ App ID من الـ response
2. **Role يجب أن يطابق**: `publisher` = `Broadcaster`, `subscriber` = `Audience`
3. **UID يجب أن يكون رقم**: تأكد من تحويل الـ uid إلى رقم إذا كان string
4. **Channel Name حساس**: يجب أن يكون مطابق تماماً (case-sensitive)
5. **Token expiration**: الـ token صالح لمدة 24 ساعة افتراضياً

## إذا استمرت المشكلة

1. تحقق من الـ logs في Backend
2. تأكد من أن الـ Agora credentials صحيحة
3. تحقق من أن الـ live stream status هو `live`
4. تأكد من أن المستخدم لديه صلاحيات صحيحة


