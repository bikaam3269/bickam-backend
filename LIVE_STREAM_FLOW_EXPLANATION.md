# شرح تدفق البث المباشر (Live Streaming Flow)

## 📺 نظرة عامة

البث المباشر يتكون من مرحلتين رئيسيتين:
1. **التاجر (Vendor)** - ينشئ ويدير البث المباشر
2. **العميل/المستخدم (Customer/User)** - يشاهد ويتفاعل مع البث

---

## 🏪 تدفق التاجر (Vendor Flow)

### المرحلة 1: إنشاء البث المباشر

#### الخطوة 1.1: إنشاء البث (Create Live Stream)
```
POST /api/v1/live-streams
Headers: Authorization: Bearer {vendor_token}
Body: {
  "title": "عرض خاص على المنتجات",
  "description": "انضموا إلينا الآن",
  "scheduledAt": null  // null = يبدأ فوراً
}
```

**ما يحدث في الخلفية:**
1. ✅ التحقق من أن المستخدم تاجر (vendor)
2. ✅ إنشاء `channelName` فريد: `channel_{vendorId}_{timestamp}`
3. ✅ إنشاء Agora Token للتاجر (publisher role)
4. ✅ حفظ البث في قاعدة البيانات مع:
   - `status: 'live'` (إذا كان فوري) أو `'scheduled'` (إذا كان مجدول)
   - `viewerCount: 0`
   - `startedAt: الآن` (إذا كان فوري)
5. ✅ إرسال إشعارات للمتابعين (followers) أن التاجر بدأ بث مباشر

**الاستجابة:**
```json
{
  "statusCode": 201,
  "data": {
    "id": 1,
    "vendorId": 5,
    "title": "عرض خاص على المنتجات",
    "channelName": "channel_5_1234567890",
    "agoraToken": "token_string...",
    "status": "live",
    "viewerCount": 0,
    "startedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### الخطوة 1.2: البدء في البث (إذا كان مجدول)
```
PUT /api/v1/live-streams/{id}/start
Headers: Authorization: Bearer {vendor_token}
```

**ما يحدث:**
1. ✅ تغيير `status` من `'scheduled'` إلى `'live'`
2. ✅ تحديث `startedAt` بالوقت الحالي
3. ✅ إنشاء Agora Token جديد
4. ✅ إرسال إشعارات للمتابعين

---

### المرحلة 2: الحصول على Token والانضمام إلى Agora

#### الخطوة 2.1: الحصول على Publisher Token
```
GET /api/v1/live-streams/{id}/token?role=publisher
Headers: Authorization: Bearer {vendor_token}
```

**ما يحدث:**
1. ✅ التحقق من أن المستخدم هو التاجر صاحب البث
2. ✅ إنشاء Agora Token مع `role: 'publisher'`
3. ✅ إرجاع Token + Channel Name + UID

**الاستجابة:**
```json
{
  "statusCode": 200,
  "data": {
    "token": "agora_token_string",
    "channelName": "channel_5_1234567890",
    "uid": 5,
    "role": "publisher"
  }
}
```

#### الخطوة 2.2: الانضمام إلى Agora Channel (في التطبيق)
```dart
// Flutter Example
await agoraEngine.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleBroadcaster, // Publisher
  ),
);
```

**الآن التاجر يبث مباشرة!** 📹

---

### المرحلة 3: إدارة البث أثناء البث المباشر

#### 3.1: إرسال رسائل في البث
```
POST /api/v1/live-streams/{id}/messages
Headers: Authorization: Bearer {vendor_token}
Body: {
  "message": "مرحباً بكم جميعاً!"
}
```

#### 3.2: حذف رسائل (التاجر يمكنه حذف أي رسالة)
```
DELETE /api/v1/live-streams/{id}/messages/{messageId}
Headers: Authorization: Bearer {vendor_token}
```

#### 3.3: عرض إحصائيات البث
- عدد المشاهدين: `viewerCount`
- عدد الإعجابات: `GET /api/v1/live-streams/{id}/likes`
- الرسائل: `GET /api/v1/live-streams/{id}/messages`

---

### المرحلة 4: إنهاء البث

#### الخطوة 4.1: إنهاء البث
```
PUT /api/v1/live-streams/{id}/end
Headers: Authorization: Bearer {vendor_token}
```

**ما يحدث:**
1. ✅ تغيير `status` من `'live'` إلى `'ended'`
2. ✅ تحديث `endedAt` بالوقت الحالي
3. ✅ إغلاق Agora Channel (في التطبيق)

**في التطبيق:**
```dart
await agoraEngine.leaveChannel();
await liveStreamService.endLiveStream(liveStreamId);
```

---

## 👥 تدفق العميل/المستخدم (Customer/User Flow)

### المرحلة 1: اكتشاف البث المباشر

#### الخطوة 1.1: عرض جميع البثات النشطة
```
GET /api/v1/live-streams
Headers: Authorization: Bearer {user_token}  // Optional
```

**الاستجابة:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "title": "عرض خاص على المنتجات",
      "vendor": {
        "id": 5,
        "name": "متجر الأزياء",
        "logoImage": "logo.jpg"
      },
      "viewerCount": 150,
      "likesCount": 45,
      "userLiked": false,
      "status": "live"
    }
  ]
}
```

#### الخطوة 1.2: عرض تفاصيل بث معين
```
GET /api/v1/live-streams/{id}
Headers: Authorization: Bearer {user_token}  // Optional
```

---

### المرحلة 2: الانضمام إلى البث

#### الخطوة 2.1: الانضمام إلى البث (API)
```
POST /api/v1/live-streams/{id}/join
Headers: Authorization: Bearer {user_token}
```

**ما يحدث:**
1. ✅ التحقق من أن البث `status: 'live'`
2. ✅ إنشاء سجل في `live_stream_viewers`:
   - `liveStreamId`
   - `userId`
   - `joinedAt: الآن`
   - `leftAt: null`
3. ✅ تحديث `viewerCount` في `live_streams`

#### الخطوة 2.2: الحصول على Subscriber Token
```
GET /api/v1/live-streams/{id}/token?role=subscriber
Headers: Authorization: Bearer {user_token}
```

**الاستجابة:**
```json
{
  "statusCode": 200,
  "data": {
    "token": "agora_token_string",
    "channelName": "channel_5_1234567890",
    "uid": 10,
    "role": "subscriber"
  }
}
```

#### الخطوة 2.3: الانضمام إلى Agora Channel (في التطبيق)
```dart
// Flutter Example
await agoraEngine.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: tokenResponse.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience, // Subscriber
  ),
);
```

**الآن المستخدم يشاهد البث!** 👀

---

### المرحلة 3: التفاعل مع البث

#### 3.1: إرسال رسائل في البث
```
POST /api/v1/live-streams/{id}/messages
Headers: Authorization: Bearer {user_token}
Body: {
  "message": "منتج رائع!"
}
```

**ما يحدث:**
1. ✅ التحقق من أن البث `status: 'live'`
2. ✅ التحقق من طول الرسالة (1-500 حرف)
3. ✅ حفظ الرسالة في `live_stream_messages`

#### 3.2: عرض الرسائل
```
GET /api/v1/live-streams/{id}/messages?limit=50&offset=0
Headers: Authorization: Bearer {user_token}  // Optional
```

**الاستجابة:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "id": 1,
      "message": "منتج رائع!",
      "user": {
        "id": 10,
        "name": "أحمد محمد",
        "type": "user"
      },
      "createdAt": "2024-01-15T10:05:00Z"
    }
  ]
}
```

#### 3.3: الإعجاب بالبث
```
POST /api/v1/live-streams/{id}/like
Headers: Authorization: Bearer {user_token}
```

**ما يحدث:**
1. ✅ التحقق من وجود إعجاب سابق
2. ✅ إذا موجود: حذفه (Unlike)
3. ✅ إذا غير موجود: إنشاؤه (Like)
4. ✅ إرجاع الحالة الجديدة + عدد الإعجابات

**الاستجابة:**
```json
{
  "statusCode": 200,
  "data": {
    "liked": true,
    "likesCount": 46
  }
}
```

#### 3.4: عرض عدد الإعجابات
```
GET /api/v1/live-streams/{id}/likes
```

---

### المرحلة 4: مغادرة البث

#### الخطوة 4.1: مغادرة البث
```
POST /api/v1/live-streams/{id}/leave
Headers: Authorization: Bearer {user_token}
```

**ما يحدث:**
1. ✅ البحث عن سجل في `live_stream_viewers`:
   - `liveStreamId`
   - `userId`
   - `leftAt: null`
2. ✅ تحديث `leftAt` بالوقت الحالي
3. ✅ تحديث `viewerCount` في `live_streams`

**في التطبيق:**
```dart
await agoraEngine.leaveChannel();
await liveStreamService.leaveLiveStream(liveStreamId);
```

---

## 🔄 مخطط التدفق الكامل

### التاجر (Vendor):
```
1. إنشاء البث
   ↓
2. الحصول على Publisher Token
   ↓
3. الانضمام إلى Agora (Publisher)
   ↓
4. يبدأ البث المباشر 📹
   ↓
5. إدارة البث (رسائل، إحصائيات)
   ↓
6. إنهاء البث
```

### المستخدم (User):
```
1. عرض البثات النشطة
   ↓
2. اختيار بث
   ↓
3. الانضمام إلى البث (API)
   ↓
4. الحصول على Subscriber Token
   ↓
5. الانضمام إلى Agora (Subscriber)
   ↓
6. مشاهدة البث 👀
   ↓
7. التفاعل (رسائل، إعجاب)
   ↓
8. مغادرة البث
```

---

## 📊 حالات البث (Status Flow)

```
scheduled → live → ended
    ↓
cancelled (يمكن إلغاء البث المجدول)
```

- **scheduled**: البث مجدول لوقت لاحق
- **live**: البث مباشر الآن
- **ended**: البث انتهى
- **cancelled**: البث ألغي قبل البدء

---

## 🔐 الصلاحيات والأدوار

### التاجر (Vendor):
- ✅ يمكنه إنشاء بث مباشر
- ✅ يمكنه بدء/إنهاء البث
- ✅ يمكنه الحصول على Publisher Token
- ✅ يمكنه حذف أي رسالة في البث
- ✅ يمكنه إرسال رسائل

### المستخدم (User):
- ✅ يمكنه عرض البثات النشطة
- ✅ يمكنه الانضمام إلى البث
- ✅ يمكنه الحصول على Subscriber Token
- ✅ يمكنه إرسال رسائل
- ✅ يمكنه الإعجاب بالبث
- ✅ يمكنه حذف رسائله فقط

---

## 🎯 نقاط مهمة

1. **Agora Integration**:
   - التاجر = Publisher (يُبث)
   - المستخدم = Subscriber (يشاهد)
   - كلاهما يحتاج Token من API

2. **Viewer Count**:
   - يتم تحديثه تلقائياً عند الانضمام/المغادرة
   - يعتمد على `live_stream_viewers` حيث `leftAt IS NULL`

3. **Real-time Updates**:
   - الرسائل: يمكن استخدام Polling أو WebSocket
   - عدد المشاهدين: يتم تحديثه عند كل join/leave
   - الإعجابات: يتم تحديثها فوراً

4. **Notifications**:
   - يتم إرسال إشعارات للمتابعين عند بدء البث
   - يمكن إضافة إشعارات عند رسائل جديدة (اختياري)

---

## 📱 مثال على التكامل الكامل

### التاجر:
```dart
// 1. إنشاء البث
final liveStream = await liveStreamService.createLiveStream(
  title: 'عرض خاص',
  description: 'انضموا الآن',
);

// 2. الحصول على Token
final token = await liveStreamService.getLiveStreamToken(
  liveStream.id,
  role: 'publisher',
);

// 3. الانضمام إلى Agora
await agoraEngine.joinChannel(
  token: token.token,
  channelId: token.channelName,
  uid: token.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleBroadcaster,
  ),
);

// 4. البث المباشر الآن! 📹
```

### المستخدم:
```dart
// 1. عرض البثات
final streams = await liveStreamService.getActiveLiveStreams();

// 2. اختيار بث
final stream = streams.first;

// 3. الانضمام
await liveStreamService.joinLiveStream(stream.id);

// 4. الحصول على Token
final token = await liveStreamService.getLiveStreamToken(
  stream.id,
  role: 'subscriber',
);

// 5. الانضمام إلى Agora
await agoraEngine.joinChannel(
  token: token.token,
  channelId: token.channelName,
  uid: token.uid,
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience,
  ),
);

// 6. مشاهدة البث الآن! 👀

// 7. إرسال رسالة
await liveStreamService.sendMessage(stream.id, 'مرحباً!');

// 8. الإعجاب
await liveStreamService.toggleLike(stream.id);
```

---

## ❓ أسئلة شائعة

**س: هل يمكن للمستخدم أن يكون publisher؟**
ج: لا، فقط التاجر يمكنه أن يكون publisher.

**س: ماذا يحدث إذا انقطع الاتصال؟**
ج: يجب إعادة الاتصال يدوياً. يمكن إضافة آلية إعادة الاتصال التلقائي.

**س: كيف يتم تحديث عدد المشاهدين؟**
ج: تلقائياً عند كل `join` أو `leave` API call.

**س: هل يمكن حذف بث مباشر؟**
ج: حالياً لا يوجد endpoint لحذف البث، فقط إنهاؤه.

---

هذا هو التدفق الكامل للبث المباشر! 🎉

