# Deep Token Validation - Verify Token with Agora

## Overview

The deep validation endpoint tests if your App Certificate is correct by generating a test token with the same parameters and comparing structures.

## Endpoint

**POST** `/api/v1/live-streams/validate-token`

## Request

### Basic Validation (Format Only)

```json
{
  "token": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
  "deep": false
}
```

### Deep Validation (Tests App Certificate)

```json
{
  "token": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
  "channelName": "channel_5_1234567890",
  "uid": 10,
  "role": "subscriber",
  "deep": true
}
```

## Response

### Basic Validation Response

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
      "length": 139,
      "appIdMatch": true,
      "appIdFound": true
    },
    "formatValidation": {
      "isValid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

### Deep Validation Response

```json
{
  "statusCode": 200,
  "message": "Token is valid",
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "formatValidation": {
      "isValid": true,
      "errors": [],
      "warnings": []
    },
    "deepValidation": {
      "isValid": true,
      "errors": [],
      "warnings": [],
      "diagnostics": {
        "formatValid": true,
        "testTokenGenerated": true,
        "testTokenLength": 139,
        "originalTokenLength": 139,
        "lengthSimilar": true,
        "bothStartWith006": true,
        "appIdConsistent": true,
        "certificateLengthValid": true,
        "overallStatus": "Token structure is valid and App Certificate appears correct"
      },
      "recommendations": []
    }
  }
}
```

### Deep Validation Failed (App Certificate Issue)

```json
{
  "statusCode": 200,
  "message": "Token validation failed",
  "data": {
    "isValid": false,
    "errors": [
      "Test token generation failed: Failed to generate token: ...",
      "App Certificate length is 30, expected 32"
    ],
    "warnings": [],
    "deepValidation": {
      "isValid": false,
      "errors": [
        "Failed to generate test token. App Certificate might be incorrect."
      ],
      "recommendations": [
        "Verify App Certificate is enabled and correct in Agora Console",
        "Verify App Certificate matches Agora Console exactly"
      ],
      "diagnostics": {
        "formatValid": true,
        "testTokenGenerated": false,
        "overallStatus": "Token validation failed - see errors above"
      }
    }
  }
}
```

## How Deep Validation Works

1. **Format Validation**: Checks token format (starts with '006', length, etc.)
2. **Test Token Generation**: Tries to generate a new token with same parameters
3. **Structure Comparison**: Compares original token with test token
4. **App Certificate Verification**: If test token generation succeeds, App Certificate is likely correct
5. **Diagnostics**: Provides detailed information about what's working and what's not

## When to Use Deep Validation

Use deep validation when:
- ✅ Token format validation passes but SDK returns `errInvalidToken`
- ✅ You want to verify App Certificate is correct
- ✅ You need detailed diagnostics
- ✅ You suspect App Certificate mismatch

## Example Usage

### Using curl:

```bash
# Deep validation
curl -X POST http://localhost:5000/api/v1/live-streams/validate-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "00639eda0b38ebe46dfa8f0f34ae13979ea...",
    "channelName": "channel_5_1234567890",
    "uid": 10,
    "role": "subscriber",
    "deep": true
  }'
```

### Using Postman:

1. Use **"Deep Validate Token (Test App Certificate)"** request
2. Set `deep: true` in body
3. Provide `token`, `channelName`, `uid`, and `role`

## Interpreting Results

### ✅ Deep Validation Passes

If `deepValidation.isValid: true`:
- ✅ App Certificate is correct
- ✅ Token structure is valid
- ✅ Token should work in SDK

**Action**: Check Flutter code for:
- App ID mismatch
- Channel name mismatch
- UID mismatch
- Role mismatch

### ❌ Deep Validation Fails

If `deepValidation.isValid: false`:
- ❌ App Certificate is likely incorrect
- ❌ App Certificate might not be enabled
- ❌ Token will fail in SDK

**Action**: 
1. Go to Agora Console
2. Verify App Certificate is enabled
3. Copy exact App Certificate (32 characters)
4. Update in code
5. Restart server
6. Test again

## Diagnostics Explained

### `testTokenGenerated: true`
- ✅ App Certificate is working
- ✅ Can generate tokens successfully

### `testTokenGenerated: false`
- ❌ App Certificate issue
- ❌ Cannot generate tokens
- ❌ Token will fail in SDK

### `appIdConsistent: true`
- ✅ App ID in token matches configured App ID
- ✅ Token was generated with correct App ID

### `certificateLengthValid: true`
- ✅ App Certificate length is 32 characters
- ✅ Format is correct

### `lengthSimilar: true`
- ✅ Test token length similar to original
- ✅ Indicates same generation method

## Recommendations

The endpoint provides specific recommendations:

- **"Verify App Certificate is enabled and correct in Agora Console"**
  - Go to Agora Console → Project Settings
  - Enable App Certificate if not enabled
  - Copy exact value

- **"Verify App Certificate matches Agora Console exactly"**
  - Check App Certificate in code
  - Must be exactly 32 characters
  - Must match Agora Console exactly

- **"App Certificate must be exactly 32 characters"**
  - Current length is wrong
  - Update to 32 characters

## Summary

**Deep Validation** tests if your App Certificate works by:
1. ✅ Generating a test token
2. ✅ Comparing structures
3. ✅ Verifying App Certificate is correct

If deep validation **passes** but SDK still fails → Check Flutter code
If deep validation **fails** → Fix App Certificate first


