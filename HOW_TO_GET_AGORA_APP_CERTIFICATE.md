# How to Get Agora App Certificate

## Step-by-Step Guide

### Step 1: Login to Agora Console

1. Go to [Agora Console](https://console.agora.io/)
2. Login with your Agora account

### Step 2: Select Your Project

1. After login, you'll see your projects list
2. Click on your project (or create a new one if you don't have one)

### Step 3: Navigate to Project Settings

1. In the project dashboard, look for **"Project Management"** or **"Settings"**
2. Click on **"Edit"** or **"Project Settings"** button
3. Or go to: **Project Management** → **Edit**

### Step 4: Find App Certificate

1. In the project settings page, you'll see:
   - **App ID**: `39eda0b38ebe46dfa8f0f34ae13979ea` (example)
   - **App Certificate**: `6fba24e49439495895d64b1c2f84272f` (example)

2. **Important**: 
   - App Certificate might be **hidden** (showing as `****`)
   - Click **"Show"** or **"Reveal"** button to see the full certificate
   - Or click **"Enable"** if it's not enabled yet

### Step 5: Enable App Certificate (If Not Enabled)

1. If App Certificate shows as **"Not Enabled"**:
   - Click **"Enable"** button
   - Agora will generate a new App Certificate
   - **Important**: Once enabled, you cannot disable it

2. If App Certificate is already enabled:
   - Click **"Show"** to reveal it
   - Copy the **entire 32-character string**

### Step 6: Copy App Certificate

1. The App Certificate is a **32-character string**
2. Example: `6fba24e49439495895d64b1c2f84272f`
3. Copy it **exactly** (no spaces, no extra characters)

## Visual Guide

```
Agora Console
  └── Projects
      └── [Your Project]
          └── Project Management / Settings
              └── Edit
                  ├── App ID: 39eda0b38ebe46dfa8f0f34ae13979ea
                  └── App Certificate: 6fba24e49439495895d64b1c2f84272f
                      └── [Show] or [Enable] button
```

## Alternative: Using Agora REST API

If you have API access, you can also get it via API:

```bash
# Get project info (requires API key)
curl -X GET \
  'https://api.agora.io/v1/projects/{project_id}' \
  -H 'Authorization: Basic {base64_encoded_credentials}'
```

## Update in Your Code

### Option 1: Environment Variable (Recommended)

Create/update `.env` file:
```bash
AGORA_APP_ID=39eda0b38ebe46dfa8f0f34ae13979ea
AGORA_APP_CERTIFICATE=6fba24e49439495895d64b1c2f84272f
```

### Option 2: Direct in Code

In `agoraService.js`:
```javascript
this.appId = '39eda0b38ebe46dfa8f0f34ae13979ea';
this.appCertificate = '6fba24e49439495895d64b1c2f84272f'; // From Agora Console
```

## Verification

After updating, check the logs when server starts:

```
✅ Agora credentials loaded: {
  appId: '39eda0b38ebe46dfa8f0f34ae13979ea',
  certificateLength: 32,  // ✅ Must be 32
  certificateSet: true
}
```

## Important Notes

1. **App Certificate is 32 characters** - exactly, no more, no less
2. **Case sensitive** - copy exactly as shown
3. **No spaces** - remove any spaces if present
4. **Once enabled, cannot disable** - be careful
5. **Keep it secret** - don't commit to public repositories

## Troubleshooting

### If App Certificate is Hidden:
- Click "Show" or "Reveal" button
- Some consoles require you to click a button to reveal it

### If App Certificate is Not Enabled:
- Click "Enable" button
- Agora will generate a new certificate
- Copy the new certificate

### If You Can't Find App Certificate:
- Make sure you're in the correct project
- Check if you have admin/owner permissions
- Try refreshing the page

## Security Best Practices

1. ✅ Use environment variables (don't hardcode)
2. ✅ Add `.env` to `.gitignore`
3. ✅ Don't share App Certificate publicly
4. ✅ Rotate certificate if compromised

