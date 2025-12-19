# Fix: Agora SDK errInvalidToken in Flutter

## Problem
Token validation passes on backend, but Agora SDK in Flutter returns:
```
ErrorCodeType.errInvalidToken
ConnectionStateType.connectionStateFailed
reason: ConnectionChangedReasonType.connectionChangedInvalidToken
```

## Root Cause
Since tokens from **Agora UI work** but tokens from **your code don't**, this indicates:
1. **App Certificate mismatch** - The App Certificate in your code doesn't match Agora Console
2. **App Certificate not enabled** - App Certificate might not be enabled in Agora Console

## Solution

### Step 1: Verify App Certificate in Agora Console

1. Go to [Agora Console](https://console.agora.io/)
2. Select your project
3. Go to **Project Management** → **Edit**
4. Check **App Certificate**:
   - ✅ Must be **Enabled**
   - ✅ Must be **32 characters** exactly
   - ✅ Copy the **exact value**

### Step 2: Update App Certificate in Code

**Option A: Use Environment Variables (Recommended)**

Create/update `.env` file:
```bash
AGORA_APP_ID=39eda0b38ebe46dfa8f0f34ae13979ea
AGORA_APP_CERTIFICATE=your_32_character_certificate_from_console
```

**Option B: Update Code Directly**

In `agoraService.js`:
```javascript
this.appCertificate = 'your_32_character_certificate_from_console'; // From Agora Console
```

### Step 3: Use UID = 0 (Like Agora UI)

The code now uses **UID = 0 by default** (like Agora UI), which:
- ✅ Allows any UID to join
- ✅ More compatible with Agora SDK
- ✅ Matches Agora UI behavior

**Important:** When using UID = 0, you can use **any UID** in Flutter:

```dart
// Token was generated with UID = 0
// You can use any UID when joining
await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: 0, // ✅ Can use 0 or any number
  options: ChannelMediaOptions(
    clientRoleType: ClientRoleType.clientRoleAudience,
    // ...
  ),
);
```

## Flutter Code Fix

### 1. Get Token from API

```dart
final tokenResponse = await liveStreamService.getLiveStreamToken(
  liveStreamId,
  role: 'subscriber', // or 'publisher' for vendor
);
```

### 2. Check Token Response

```dart
print('Token Response:');
print('  App ID: ${tokenResponse.appId}');
print('  Channel: ${tokenResponse.channelName}');
print('  UID: ${tokenResponse.uid}');
print('  UID Type: ${tokenResponse.uidType}');
print('  Role: ${tokenResponse.role}');
print('  Validation: ${tokenResponse.validation.isValid}');
```

### 3. Initialize Agora with Correct App ID

```dart
// CRITICAL: Use App ID from token response
agoraEngine = createAgoraRtcEngine();
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId, // ✅ MUST match backend App ID
));
```

### 4. Join Channel

```dart
// If token was generated with UID = 0, you can use any UID
int joinUid = tokenResponse.uid == 0 ? 0 : tokenResponse.uid;

await agoraEngine!.joinChannel(
  token: tokenResponse.token,
  channelId: tokenResponse.channelName,
  uid: joinUid, // Use UID from response (or 0 if token allows any)
  options: ChannelMediaOptions(
    clientRoleType: tokenResponse.role == 'publisher'
        ? ClientRoleType.clientRoleBroadcaster
        : ClientRoleType.clientRoleAudience,
    channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
    publishCameraTrack: tokenResponse.role == 'publisher',
    publishMicrophoneTrack: tokenResponse.role == 'publisher',
  ),
);
```

## Debugging Checklist

Before reporting an error, verify:

- [ ] **App Certificate is enabled** in Agora Console
- [ ] **App Certificate in code matches** Agora Console (32 characters)
- [ ] **App ID in Flutter matches** `tokenResponse.appId`
- [ ] **Channel name in Flutter matches** `tokenResponse.channelName` exactly
- [ ] **UID matches** (if token UID ≠ 0, use exact UID; if 0, can use any)
- [ ] **Role matches**: `publisher` → `Broadcaster`, `subscriber` → `Audience`
- [ ] **Token is fresh** (generated within last 24 hours)

## Common Mistakes

### ❌ Wrong: Using Hardcoded App ID
```dart
// DON'T DO THIS
await agoraEngine!.initialize(RtcEngineContext(
  appId: 'YOUR_AGORA_APP_ID', // ❌ Hardcoded
));
```

### ✅ Correct: Using App ID from Response
```dart
// DO THIS
await agoraEngine!.initialize(RtcEngineContext(
  appId: tokenResponse.appId, // ✅ From API
));
```

### ❌ Wrong: Using Different UID
```dart
// If token was generated with UID = 10, don't use UID = 20
await agoraEngine!.joinChannel(
  token: token,
  channelId: channelName,
  uid: 20, // ❌ Wrong if token was for UID = 10
);
```

### ✅ Correct: Using Token UID (or 0)
```dart
// If token UID = 0, you can use any UID
// If token UID = 10, you MUST use UID = 10
await agoraEngine!.joinChannel(
  token: token,
  channelId: channelName,
  uid: tokenResponse.uid == 0 ? 0 : tokenResponse.uid, // ✅ Correct
);
```

## Testing

### Test 1: Validate Token Format
```bash
POST /api/v1/live-streams/validate-token
{
  "token": "your_token_here"
}
```

Should return: `"isValid": true`

### Test 2: Compare with Agora UI Token

1. Generate token from Agora Console
2. Generate token from your API
3. Compare:
   - Both should start with `006`
   - Both should contain same App ID
   - Both should have similar length

### Test 3: Check Backend Logs

Look for:
```
✅ Agora credentials loaded: {
  appId: '...',
  certificateLength: 32,  // ✅ Must be 32
  certificateSet: true
}

🔑 Token Generation Details: {
  uid: 0,  // ✅ Using UID = 0 (like Agora UI)
  method: 'buildTokenWithUid',
  appCertificateLength: 32,  // ✅ Must be 32
  ...
}
```

## If Still Not Working

1. **Double-check App Certificate**:
   - Go to Agora Console
   - Copy App Certificate exactly (32 characters)
   - Update in code
   - Restart server

2. **Use UID = 0**:
   - Code now uses UID = 0 by default
   - This matches Agora UI behavior
   - More compatible with SDK

3. **Check Flutter App ID**:
   - Must match `tokenResponse.appId`
   - Don't use hardcoded value

4. **Verify Channel Name**:
   - Must match exactly (case-sensitive)
   - No extra spaces or characters

5. **Check Token Freshness**:
   - Tokens expire after 24 hours
   - Generate new token if old

## Summary

The fix is to:
1. ✅ **Enable App Certificate** in Agora Console
2. ✅ **Update App Certificate** in code to match Console
3. ✅ **Use UID = 0** (now default, like Agora UI)
4. ✅ **Use App ID from token response** in Flutter
5. ✅ **Match all parameters** exactly (channel, uid, role)

