# حل مشكلة Agora Token - App Certificate

## المشكلة
عند توليد token من Agora UI يعمل، لكن من الكود لا يعمل.

## السبب الرئيسي
**App Certificate غير مفعّل أو غير صحيح** في Agora Console.

## الحلول

### 1. التحقق من App Certificate في Agora Console

#### الخطوات:
1. سجل دخول إلى [Agora Console](https://console.agora.io/)
2. اختر المشروع الخاص بك
3. اذهب إلى **Project Management** → **Edit**
4. تحقق من **App Certificate**:
   - ✅ يجب أن يكون **مفعّل (Enabled)**
   - ✅ يجب أن يكون **32 حرف** بالضبط
   - ✅ يجب أن يكون **نفس القيمة** في الكود

#### إذا كان App Certificate غير مفعّل:
1. اضغط على **Enable** بجانب App Certificate
2. انسخ الـ **App Certificate** الجديد
3. حدث الكود أو ملف `.env`

### 2. تحديث App Certificate في الكود

#### الطريقة الأولى: استخدام Environment Variables (مُوصى بها)
```bash
# في ملف .env
AGORA_APP_ID=39eda0b38ebe46dfa8f0f34ae13979ea
AGORA_APP_CERTIFICATE=your_32_character_certificate_here
```

#### الطريقة الثانية: تحديث الكود مباشرة
```javascript
// في agoraService.js
this.appId = '39eda0b38ebe46dfa8f0f34ae13979ea';
this.appCertificate = 'your_32_character_certificate_here'; // ✅ من Agora Console
```

### 3. التحقق من App Certificate في الكود

الكود الآن يتحقق تلقائياً من:
- ✅ طول App Certificate (يجب أن يكون 32 حرف)
- ✅ وجود App ID و App Certificate
- ✅ صحة توليد الـ token

### 4. Fallback Mechanism

الكود الآن يدعم 3 طرق لتوليد الـ token:

1. **Numeric UID** (الأولوية): يستخدم UID الفعلي للمستخدم
2. **UID = 0** (Fallback): مثل Agora UI - يسمح لأي UID بالانضمام
3. **String UID** (Last Resort): يستخدم string UID

```javascript
// الكود يحاول بالترتيب:
// 1. numericUserId (مثل: 10)
// 2. UID = 0 (مثل Agora UI)
// 3. String UID (مثل: "10")
```

## كيفية التحقق من أن App Certificate صحيح

### 1. من الـ Logs
ابحث عن:
```
✅ Agora credentials loaded: {
  appId: '...',
  certificateLength: 32,  // ✅ يجب أن يكون 32
  certificateSet: true
}
```

### 2. من Token Generation
```
🔑 Token Generation Details: {
  appCertificateLength: 32,  // ✅ يجب أن يكون 32
  tokenStartsWith: '006...', // ✅ يجب أن يبدأ بـ 006
  ...
}
```

### 3. Test Token
استخدم [Agora Token Validator](https://www.agora.io/en/blog/token-validator/) للتحقق من صحة الـ token.

## Checklist

- [ ] App Certificate مفعّل في Agora Console
- [ ] App Certificate في الكود يطابق Agora Console
- [ ] App Certificate طوله 32 حرف بالضبط
- [ ] App ID في الكود يطابق Agora Console
- [ ] الـ token يبدأ بـ `006`
- [ ] الـ logs تظهر `certificateLength: 32`

## إذا استمرت المشكلة

### 1. تحقق من الـ Logs
```bash
# ابحث عن:
✅ Agora credentials loaded
🔑 Token Generation Details
🔑 Agora Token Generated Successfully
```

### 2. قارن Token من Agora UI مع Token من الكود
- افتح Agora Console
- أنشئ token مؤقت
- قارن الـ App ID و App Certificate المستخدمة

### 3. استخدم UID = 0 مؤقتاً
الكود الآن يستخدم UID = 0 تلقائياً إذا فشل UID الفعلي (مثل Agora UI).

### 4. Contact Support
إذا استمرت المشكلة:
- قدم الـ logs الكاملة
- قدم screenshot من Agora Console
- تأكد من أن App Certificate مفعّل

## ملاحظات مهمة

1. **App Certificate يجب أن يكون 32 حرف بالضبط**
2. **App Certificate يجب أن يكون مفعّل في Agora Console**
3. **App Certificate في الكود يجب أن يطابق Agora Console**
4. **UID = 0 يسمح لأي UID بالانضمام** (مثل Agora UI)
5. **الكود الآن يحاول 3 طرق تلقائياً** إذا فشلت الأولى


