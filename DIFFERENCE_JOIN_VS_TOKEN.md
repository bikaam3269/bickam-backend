# الفرق بين `/join` و `/token` في Live Stream

## 🔑 الفرق الأساسي

### `POST /api/v1/live-streams/:id/join`
**الوظيفة:** تسجيل المستخدم في قاعدة البيانات كـ "مشاهد" للبث

### `GET /api/v1/live-streams/:id/token?role=subscriber`
**الوظيفة:** الحصول على Agora Token للانضمام إلى قناة Agora

---

## 📊 مقارنة تفصيلية

| الميزة | `/join` | `/token` |
|--------|---------|----------|
| **النوع** | `POST` | `GET` |
| **الوظيفة** | تسجيل في قاعدة البيانات | الحصول على Agora Token |
| **يحدث في** | قاعدة البيانات (MySQL) | Agora Service |
| **ينشئ** | سجل في `live_stream_viewers` | Token string |
| **يحدث** | في Backend فقط | في Backend + Agora |
| **الاستخدام** | لتتبع المشاهدين | للانضمام إلى Agora Channel |

---

## 🔍 ما يحدث في كل endpoint

### 1️⃣ `POST /api/v1/live-streams/:id/join`

#### ما يحدث في الكود:
```javascript
async joinLiveStream(liveStreamId, userId) {
  // 1. التحقق من وجود البث
  const liveStream = await LiveStream.findByPk(liveStreamId);
  
  // 2. التحقق من أن البث "live"
  if (liveStream.status !== 'live') {
    throw new Error('Live stream is not live');
  }
  
  // 3. التحقق من عدم الانضمام مسبقاً
  const existingViewer = await LiveStreamViewer.findOne({
    where: { liveStreamId, userId, leftAt: null }
  });
  
  // 4. إنشاء سجل جديد في قاعدة البيانات
  const viewer = await LiveStreamViewer.create({
    liveStreamId,
    userId,
    joinedAt: new Date()
  });
  
  // 5. تحديث عدد المشاهدين
  await this.updateViewerCount(liveStreamId);
  
  return viewer;
}
```

#### ما يحدث في قاعدة البيانات:
```sql
-- ينشئ سجل في جدول live_stream_viewers
INSERT INTO live_stream_viewers (
  live_stream_id, 
  user_id, 
  joined_at, 
  created_at, 
  updated_at
) VALUES (1, 10, NOW(), NOW(), NOW());

-- يحدث viewer_count في live_streams
UPDATE live_streams 
SET viewer_count = viewer_count + 1 
WHERE id = 1;
```

#### الاستجابة:
```json
{
  "statusCode": 200,
  "message": "Joined live stream successfully",
  "data": null
}
```

---

### 2️⃣ `GET /api/v1/live-streams/:id/token?role=subscriber`

#### ما يحدث في الكود:
```javascript
async getLiveStreamToken(liveStreamId, userId, role = 'subscriber') {
  // 1. التحقق من وجود البث
  const liveStream = await LiveStream.findByPk(liveStreamId);
  
  // 2. التحقق من أن البث "live" (للمشاهدين)
  if (liveStream.status !== 'live' && role === 'subscriber') {
    throw new Error('Live stream is not live');
  }
  
  // 3. التحقق من الصلاحيات (publisher فقط للتاجر)
  if (role === 'publisher' && liveStream.vendorId !== userId) {
    throw new Error('Only the vendor can be a publisher');
  }
  
  // 4. إنشاء Agora Token
  const token = agoraService.generateToken(
    liveStream.channelName,  // "channel_5_1234567890"
    userId,                  // 10
    role                     // "subscriber"
  );
  
  return {
    token,                    // "00639eda0b38ebe46dfa8f0f34ae13979eaIAB..."
    channelName: liveStream.channelName,
    uid: userId,
    role
  };
}
```

#### ما يحدث في Agora Service:
```javascript
// ينشئ token باستخدام Agora SDK
const token = RtcTokenBuilder.buildTokenWithUid(
  appId,                    // "39eda0b38ebe46dfa8f0f34ae13979ea"
  appCertificate,           // "6fba24e49439495895d64b1c2f84272f"
  channelName,             // "channel_5_1234567890"
  userId,                   // 10
  RtcRole.SUBSCRIBER,       // دور المشاهد
  privilegeExpiredTs        // وقت انتهاء الصلاحية
);
```

#### الاستجابة:
```json
{
  "statusCode": 200,
  "message": "Token generated successfully",
  "data": {
    "token": "00639eda0b38ebe46dfa8f0f34ae13979eaIAB...",
    "channelName": "channel_5_1234567890",
    "uid": 10,
    "role": "subscriber"
  }
}
```

---

## 🎯 متى تستخدم كل واحد؟

### استخدام `/join`:
✅ **متى:** عندما تريد تسجيل المستخدم كـ "مشاهد" في قاعدة البيانات

**الفوائد:**
- تتبع عدد المشاهدين
- معرفة من يشاهد البث
- إحصائيات دقيقة
- يمكن استخدامه لإرسال إشعارات

**مثال:**
```dart
// المستخدم يضغط على "مشاهدة البث"
await liveStreamService.joinLiveStream(liveStreamId);
// الآن المستخدم مسجل في قاعدة البيانات
```

---

### استخدام `/token`:
✅ **متى:** عندما تريد الانضمام إلى Agora Channel لمشاهدة البث فعلياً

**الفوائد:**
- الحصول على Token للانضمام إلى Agora
- مشاهدة البث المباشر
- التفاعل الصوتي/المرئي

**مثال:**
```dart
// الحصول على Token
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber',
);

// استخدام Token للانضمام إلى Agora
await agoraEngine.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience,
  ),
);
// الآن المستخدم يشاهد البث فعلياً
```

---

## 🔄 الترتيب الصحيح للاستخدام

### الخطوة 1: الانضمام إلى البث (API)
```dart
// تسجيل في قاعدة البيانات
await liveStreamService.joinLiveStream(liveStreamId);
```

### الخطوة 2: الحصول على Token
```dart
// الحصول على Agora Token
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber',
);
```

### الخطوة 3: الانضمام إلى Agora (في التطبيق)
```dart
// الانضمام إلى Agora Channel
await agoraEngine.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience,
  ),
);
```

---

## ❓ أسئلة شائعة

### س: هل يمكن استخدام `/token` بدون `/join`؟
**ج:** نعم تقنياً، لكن `/join` مهم لتتبع المشاهدين في قاعدة البيانات.

### س: هل يمكن استخدام `/join` بدون `/token`؟
**ج:** نعم، لكن لن يتمكن المستخدم من مشاهدة البث فعلياً. سيكون مسجلاً فقط في قاعدة البيانات.

### س: ما الفرق بينهما من ناحية الأمان؟
**ج:** 
- `/join`: يتحقق من أن البث "live"
- `/token`: يتحقق من أن البث "live" + يتحقق من الصلاحيات (publisher فقط للتاجر)

### س: هل يجب استخدامهما معاً؟
**ج:** نعم، الأفضل استخدامهما معاً:
1. `/join` لتسجيل المستخدم
2. `/token` للحصول على Token
3. استخدام Token للانضمام إلى Agora

---

## 📱 مثال كامل في Flutter

```dart
class LiveStreamViewer {
  Future<void> watchLiveStream(int liveStreamId) async {
    try {
      // الخطوة 1: تسجيل في قاعدة البيانات
      await liveStreamService.joinLiveStream(liveStreamId);
      print('✅ Joined in database');
      
      // الخطوة 2: الحصول على Token
      final tokenResponse = await liveStreamService.getLiveStreamToken(
        liveStreamId,
        role: 'subscriber',
      );
      print('✅ Got token');
      
      // الخطوة 3: الانضمام إلى Agora
      await agoraEngine.joinChannel(
        token: tokenResponse.token,
        channelId: tokenResponse.channelName,
        uid: tokenResponse.uid,
        options: ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleAudience,
        ),
      );
      print('✅ Watching live stream now!');
      
    } catch (e) {
      print('❌ Error: $e');
    }
  }
}
```

---

## 🎯 ملخص

| | `/join` | `/token` |
|---|---|---|
| **الغرض** | تسجيل في قاعدة البيانات | الحصول على Agora Token |
| **النتيجة** | سجل في `live_stream_viewers` | Token string |
| **الاستخدام** | لتتبع المشاهدين | للانضمام إلى Agora |
| **مطلوب لـ** | الإحصائيات | مشاهدة البث فعلياً |

**الخلاصة:** استخدمهما معاً للحصول على أفضل تجربة! 🎉

