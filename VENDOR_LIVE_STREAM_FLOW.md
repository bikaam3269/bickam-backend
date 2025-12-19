# Vendor Live Stream Flow - دليل شامل

## نظرة عامة

هذا الدليل يشرح flow البائع (Vendor) عند إنشاء وإدارة البث المباشر.

## Flow البائع (Vendor/Publisher)

### 1. إنشاء البث المباشر

#### Endpoint: `POST /api/v1/live-streams`

```json
{
  "title": "عرض المنتجات الجديدة",
  "description": "تعرف على أحدث المنتجات",
  "scheduledAt": null  // null = يبدأ فوراً، أو تاريخ مستقبلي للبث المجدول
}
```

#### ما يحدث تلقائياً:

1. ✅ **توليد Channel Name**: `channel_{vendorId}_{timestamp}`
2. ✅ **توليد Publisher Token**: token للبائع كـ publisher
3. ✅ **إنشاء Live Stream Record**: في قاعدة البيانات
4. ✅ **إذا كان البث فوري** (scheduledAt = null):
   - يتم تعيين `status = 'live'`
   - يتم تعيين `startedAt = الآن`
   - ✅ **البائع يُضاف تلقائياً كـ viewer** (محسوب في viewer count)
   - ✅ **إشعار المتابعين** ببدء البث

#### Response:

```json
{
  "statusCode": 201,
  "message": "Live stream created successfully",
  "data": {
    "id": 123,
    "vendorId": 5,
    "title": "عرض المنتجات الجديدة",
    "channelName": "channel_5_1234567890",
    "agoraToken": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
    "status": "live",
    "viewerCount": 1,  // ✅ البائع محسوب
    "startedAt": "2024-01-01T12:00:00.000Z",
    "vendor": { ... }
  }
}
```

### 2. الحصول على Token (Publisher)

#### Endpoint: `GET /api/v1/live-streams/:id/token?role=publisher`

```json
{
  "token": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
  "channelName": "channel_5_1234567890",
  "uid": 5,
  "uidType": "number",
  "role": "publisher",
  "appId": "39eda0b38ebe46dfa8f0f34ae13979ea",
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

### 3. الانضمام إلى Agora Channel (Publisher)

في Flutter/React:

```dart
// 1. Get token
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'publisher',  // ✅ publisher للبائع
);

// 2. Initialize Agora
agoraEngine = createAgoraRtcEngine();
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId,
));

// 3. Enable video/audio
await agoraEngine!.enableVideo();
await agoraEngine!.enableAudio();

// 4. Join as publisher (broadcaster)
await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleBroadcaster,  // ✅ broadcaster
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    publishCameraTrack: true,
    publishMicrophoneTrack: true,
  ),
);
```

### 4. إنهاء البث

#### Endpoint: `PUT /api/v1/live-streams/:id/end`

```json
{
  "statusCode": 200,
  "message": "Live stream ended successfully",
  "data": {
    "id": 123,
    "status": "ended",
    "endedAt": "2024-01-01T13:00:00.000Z"
  }
}
```

## ملاحظات مهمة

### ✅ البائع يُضاف تلقائياً كـ Viewer

عند إنشاء أو بدء البث:
- ✅ البائع يُضاف تلقائياً في `LiveStreamViewer`
- ✅ `viewerCount` يبدأ من 1 (يشمل البائع)
- ✅ البائع لا يحتاج استدعاء `joinLiveStream` يدوياً

### 🔑 Publisher vs Viewer

- **Publisher (البائع)**:
  - Role: `publisher`
  - Client Role: `clientRoleBroadcaster`
  - يرسل الفيديو والصوت
  - يُضاف تلقائياً كـ viewer أيضاً

- **Viewer (المشاهد)**:
  - Role: `subscriber`
  - Client Role: `clientRoleAudience`
  - يشاهد الفيديو فقط
  - يحتاج استدعاء `joinLiveStream`

### 📊 Viewer Count

`viewerCount` يشمل:
- ✅ البائع (publisher) - يُضاف تلقائياً
- ✅ جميع المشاهدين (subscribers) - يُضافون عند `joinLiveStream`

## Flow Diagram

```
Vendor Creates Live Stream
    ↓
Generate Publisher Token
    ↓
Create Live Stream Record
    ↓
If Immediate Start:
    ├─ Set status = 'live'
    ├─ Set startedAt = now
    ├─ ✅ Auto-join vendor as viewer
    ├─ Update viewerCount = 1
    └─ Notify followers
    ↓
Vendor Gets Token (role=publisher)
    ↓
Vendor Joins Agora Channel (as broadcaster)
    ↓
[Streaming...]
    ↓
Vendor Ends Stream
    ↓
Set status = 'ended'
```

## API Endpoints للبائع

| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| إنشاء بث | POST | `/live-streams` | ✅ Vendor |
| بدء بث مجدول | PUT | `/live-streams/:id/start` | ✅ Vendor |
| إنهاء بث | PUT | `/live-streams/:id/end` | ✅ Vendor |
| الحصول على Token | GET | `/live-streams/:id/token?role=publisher` | ✅ Vendor |
| قائمة بثوث البائع | GET | `/live-streams/vendor/:vendorId` | ❌ Public |

## مثال كامل

### 1. إنشاء البث

```javascript
// POST /api/v1/live-streams
const response = await fetch('/api/v1/live-streams', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'عرض المنتجات',
    description: 'تعرف على أحدث المنتجات'
  })
});

const { data: liveStream } = await response.json();
// liveStream.viewerCount = 1 (البائع محسوب)
```

### 2. الحصول على Token

```javascript
// GET /api/v1/live-streams/:id/token?role=publisher
const tokenResponse = await fetch(
  `/api/v1/live-streams/${liveStream.id}/token?role=publisher`,
  {
    headers: { 'Authorization': 'Bearer token' }
  }
);

const { data: tokenData } = await tokenResponse.json();
```

### 3. الانضمام إلى Agora

```javascript
// في Flutter/React
await agoraEngine.joinChannel(
  token: tokenData.token,
  channelId: tokenData.channelName,
  uid: tokenData.uid,
  options: {
    clientRoleType: 'broadcaster',  // publisher
    publishCameraTrack: true,
    publishMicrophoneTrack: true
  }
);
```

### 4. إنهاء البث

```javascript
// PUT /api/v1/live-streams/:id/end
await fetch(`/api/v1/live-streams/${liveStream.id}/end`, {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer token' }
});
```

## الخلاصة

✅ **البائع لا يحتاج `joinLiveStream`** - يُضاف تلقائياً عند إنشاء/بدء البث

✅ **البائع هو Publisher** - يرسل الفيديو والصوت

✅ **البائع محسوب في viewerCount** - يبدأ من 1

✅ **البائع يحتاج Token** - للحصول على publisher token للانضمام إلى Agora

