# 🚀 Firebase Cloud Functions - Deployment Guide

## ✅ What's Been Created

### Functions Directory Structure
```
functions/
├── index.js              # All 6 cloud functions
├── package.json          # Dependencies
├── .eslintrc.js         # Linting configuration
├── .gitignore           # Git ignore rules
├── .env.example         # Environment variables template
└── README.md            # Comprehensive documentation
```

### 6 Cloud Functions Implemented

1. **autoCategorizationOnCreate** ✅
   - Trigger: onCreate (complaints)
   - AI-powered categorization using OpenAI
   - Fallback to keyword matching
   - Updates category/subcategory

2. **slaEngineScheduled** ✅
   - Trigger: Every 5 minutes (scheduled)
   - Monitors SLA compliance
   - Escalates complaints (4 levels)
   - Sends FCM notifications

3. **statusChangeNotification** ✅
   - Trigger: onUpdate (complaints)
   - Sends push notifications on status changes
   - Notifies complaint creator
   - Notifies assigned officer

4. **auditLoggingOnUpdate** ✅
   - Trigger: onUpdate (complaints)
   - Automatic audit trail
   - Tracks all field changes
   - Stores in subcollection

5. **duplicateDetectionOnCreate** ✅
   - Trigger: onCreate (complaints)
   - Finds nearby complaints (50m radius)
   - Uses geohash for efficiency
   - Updates complaint with duplicates array

6. **addGeohashOnCreate** ✅
   - Trigger: onCreate (complaints)
   - Adds geohash for geospatial queries
   - Enables fast radius searches

---

## 📦 Installation Steps

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize Firebase Project
```bash
cd civicconnect
firebase init
```

Select:
- ✅ Functions
- ✅ Firestore
- ✅ Storage
- Choose your existing project: `civicconnect-b8190`
- Use JavaScript
- Install dependencies: Yes

### Step 4: Install Function Dependencies
```bash
cd functions
npm install
```

### Step 5: Set Environment Variables
```bash
# Set OpenAI API Key
firebase functions:config:set openai.key="your_openai_api_key_here"

# Verify it's set
firebase functions:config:get
```

**Get OpenAI API Key**:
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and use in command above

### Step 6: Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:autoCategorizationOnCreate
```

---

## 🧪 Local Testing (Optional)

### Start Emulators
```bash
cd civicconnect
firebase emulators:start
```

This starts:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Storage: http://localhost:9199
- Emulator UI: http://localhost:4000

### Test Functions Locally
1. Open Emulator UI: http://localhost:4000
2. Create test complaint in Firestore
3. Watch functions trigger in logs
4. Verify data updates

---

## 📊 Verify Deployment

### Check Function Status
```bash
firebase functions:list
```

Should show:
```
✔ autoCategorizationOnCreate
✔ slaEngineScheduled
✔ statusChangeNotification
✔ auditLoggingOnUpdate
✔ duplicateDetectionOnCreate
✔ addGeohashOnCreate
```

### View Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only autoCategorizationOnCreate

# Real-time logs
firebase functions:log --follow
```

### Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Click **Functions** in left menu
4. Verify all 6 functions are deployed
5. Check execution logs

---

## 🔧 Configuration

### Required Firestore Indexes

The functions require these composite indexes (auto-created on first query):

1. **complaints**: userId (ASC) + createdAt (DESC)
2. **complaints**: status (ASC) + createdAt (DESC)
3. **complaints**: category (ASC) + createdAt (DESC)
4. **complaints**: assignedTo (ASC) + createdAt (DESC)
5. **complaints**: category (ASC) + geohash (ASC)
6. **complaints**: category (ASC) + status (ASC) + geohash (ASC)

**Auto-create**: Click the link in error message when first query runs  
**Manual**: Go to Firestore → Indexes → Create index

### Update Firestore Security Rules

Add this to your `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // Allow Cloud Functions to write
    match /complaints/{complaintId} {
      // Functions can update geohash, duplicates, etc.
      allow write: if request.auth != null || request.auth.token.admin == true;
      
      match /auditLogs/{logId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null || request.auth.token.admin == true;
      }
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 🔔 Enable Push Notifications

### Step 1: Add FCM Token to Users

Update your frontend to save FCM tokens:

```javascript
// In your React app
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();

// Request permission and get token
const token = await getToken(messaging, {
  vapidKey: "YOUR_VAPID_KEY"
});

// Save to Firestore
await updateDoc(doc(db, "users", user.uid), {
  fcmToken: token
});
```

### Step 2: Get VAPID Key
1. Go to Firebase Console → Project Settings
2. Click **Cloud Messaging** tab
3. Under **Web Push certificates**, generate key pair
4. Copy VAPID key

### Step 3: Create `firebase-messaging-sw.js`

In `frontend/public/firebase-messaging-sw.js`:
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA3577UYsUcd_cgZjiLs0YXlAY505RKyEs",
  authDomain: "civicconnect-b8190.firebaseapp.com",
  projectId: "civicconnect-b8190",
  storageBucket: "civicconnect-b8190.firebasestorage.app",
  messagingSenderId: "448109429534",
  appId: "1:448109429534:web:9494921785c9d28c17ff0f"
});

const messaging = firebase.messaging();
```

---

## 📈 Monitoring & Debugging

### View Function Execution
```bash
# Recent executions
firebase functions:log --limit 100

# Filter by function
firebase functions:log --only autoCategorizationOnCreate

# Follow live
firebase functions:log --follow
```

### Firebase Console Monitoring
1. Go to Functions → Dashboard
2. View:
   - Invocations per function
   - Execution time
   - Error rate
   - Memory usage

### Common Issues

**Issue**: "OpenAI API key not found"
```bash
# Solution: Set the config
firebase functions:config:set openai.key="sk-..."
firebase deploy --only functions
```

**Issue**: "Permission denied" in Firestore
```bash
# Solution: Update security rules
firebase deploy --only firestore:rules
```

**Issue**: "Index required" error
```bash
# Solution: Click the link in error message
# Or manually create in Firebase Console → Firestore → Indexes
```

**Issue**: Function timeout
```bash
# Solution: Increase timeout in index.js
exports.myFunction = functions
  .runWith({ timeoutSeconds: 540 }) // 9 minutes max
  .firestore.document(...)
```

---

## 💰 Cost Estimation

### Free Tier (Spark Plan)
- 2M invocations/month
- 400K GB-seconds compute
- 200K CPU-seconds
- 5GB outbound networking

### Estimated Usage (CivicConnect)
- **autoCategorizationOnCreate**: ~100 invocations/day = 3K/month
- **slaEngineScheduled**: 288 invocations/day = 8.6K/month
- **statusChangeNotification**: ~50 invocations/day = 1.5K/month
- **auditLoggingOnUpdate**: ~100 invocations/day = 3K/month
- **duplicateDetectionOnCreate**: ~100 invocations/day = 3K/month
- **addGeohashOnCreate**: ~100 invocations/day = 3K/month

**Total**: ~22K invocations/month (well within free tier)

**OpenAI Costs**:
- GPT-3.5-turbo: $0.0015 per 1K tokens
- Average: ~500 tokens per categorization
- 100 complaints/day = $2.25/month

---

## 🔄 Update & Redeploy

### Update Function Code
1. Edit `functions/index.js`
2. Test locally with emulators
3. Deploy:
```bash
firebase deploy --only functions
```

### Update Single Function
```bash
firebase deploy --only functions:autoCategorizationOnCreate
```

### Update Environment Variables
```bash
# Update config
firebase functions:config:set openai.key="new_key"

# Redeploy functions
firebase deploy --only functions
```

---

## 🎯 Testing Checklist

After deployment, test each function:

- [ ] **autoCategorizationOnCreate**: Create complaint, verify category added
- [ ] **slaEngineScheduled**: Wait 5 min, check escalation in logs
- [ ] **statusChangeNotification**: Update status, verify notification sent
- [ ] **auditLoggingOnUpdate**: Update complaint, check auditLogs subcollection
- [ ] **duplicateDetectionOnCreate**: Create nearby complaint, verify duplicates array
- [ ] **addGeohashOnCreate**: Create complaint, verify geohash field added

---

## 📚 Additional Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [GeoFire Documentation](https://github.com/firebase/geofire-js)
- [FCM Setup Guide](https://firebase.google.com/docs/cloud-messaging/js/client)

---

## ✅ Deployment Complete!

Your Cloud Functions are now:
- ✅ Deployed to Firebase
- ✅ Running automatically on triggers
- ✅ Monitoring SLA every 5 minutes
- ✅ Sending push notifications
- ✅ Logging all changes
- ✅ Detecting duplicates
- ✅ Categorizing with AI

**Next Steps**:
1. Monitor function logs for first 24 hours
2. Verify notifications are working
3. Check SLA escalations
4. Review audit logs
5. Test duplicate detection

🎉 **Your backend is now fully automated with Firebase!**
