# CivicConnect Cloud Functions

Firebase Cloud Functions for backend logic and automation.

## 📋 Functions Overview

### 1. **autoCategorizationOnCreate**
- **Trigger**: `onCreate` (complaints collection)
- **Purpose**: Automatically categorize complaints using AI
- **Flow**:
  1. Triggered when new complaint is created
  2. Combines title + description
  3. Calls OpenAI API for categorization
  4. Falls back to keyword matching if AI fails
  5. Updates complaint with category/subcategory
  6. Adds audit log

### 2. **slaEngineScheduled**
- **Trigger**: Scheduled (every 5 minutes)
- **Purpose**: Monitor SLA compliance and escalate
- **Flow**:
  1. Runs every 5 minutes
  2. Fetches all open complaints
  3. Calculates SLA percentage
  4. Escalates based on thresholds:
     - 50% → Ward Officer (Level 2)
     - 75% → Department Head (Level 3)
     - 100% → Municipal Commissioner (Level 4)
  5. Sends FCM notifications
  6. Adds audit logs

### 3. **statusChangeNotification**
- **Trigger**: `onUpdate` (complaints collection)
- **Purpose**: Send push notifications on status changes
- **Flow**:
  1. Detects status field changes
  2. Sends FCM notification to complaint creator
  3. If assigned, notifies the assigned officer
  4. Includes complaint details in notification data

### 4. **auditLoggingOnUpdate**
- **Trigger**: `onUpdate` (complaints collection)
- **Purpose**: Automatic audit trail for all changes
- **Flow**:
  1. Compares before/after states
  2. Tracks changes in: status, assignedTo, category, priority, escalationLevel
  3. Creates audit log entry with old/new values
  4. Stores in `complaints/{id}/auditLogs` subcollection

### 5. **duplicateDetectionOnCreate**
- **Trigger**: `onCreate` (complaints collection)
- **Purpose**: Detect nearby duplicate complaints
- **Flow**:
  1. Triggered on complaint creation
  2. Uses geohash queries for efficiency
  3. Finds complaints within 50 meters
  4. Filters by same category
  5. Updates complaint with duplicates array
  6. Adds audit log if duplicates found

### 6. **addGeohashOnCreate**
- **Trigger**: `onCreate` (complaints collection)
- **Purpose**: Add geohash for efficient geospatial queries
- **Flow**:
  1. Calculates geohash from lat/lng
  2. Adds to complaint document
  3. Enables fast radius queries

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project initialized

### Installation

1. **Navigate to functions directory**:
```bash
cd functions
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set environment variables**:
```bash
# Set OpenAI API key
firebase functions:config:set openai.key="your_openai_api_key"

# Or use .env file for local development
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

4. **Deploy functions**:
```bash
# Deploy all functions
npm run deploy

# Or deploy specific function
firebase deploy --only functions:autoCategorizationOnCreate
```

---

## 🧪 Local Testing

### Start Firebase Emulators
```bash
npm run serve
```

This starts:
- Functions emulator on http://localhost:5001
- Firestore emulator on http://localhost:8080
- Auth emulator on http://localhost:9099

### Test Individual Functions

**Test onCreate trigger**:
```javascript
// Create a test complaint in Firestore emulator
// Functions will automatically trigger
```

**Test scheduled function**:
```bash
# Manually trigger scheduled function
firebase functions:shell
> slaEngineScheduled()
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All functions
npm run logs

# Specific function
firebase functions:log --only autoCategorizationOnCreate

# Real-time logs
firebase functions:log --follow
```

### Firebase Console
- Go to Firebase Console → Functions
- View execution logs, errors, and performance metrics

---

## 🔧 Configuration

### Environment Variables

**Set via Firebase CLI**:
```bash
firebase functions:config:set openai.key="sk-..."
```

**View current config**:
```bash
firebase functions:config:get
```

**Delete config**:
```bash
firebase functions:config:unset openai.key
```

### Function Configuration

Edit `index.js` to modify:
- SLA thresholds
- Escalation levels
- Duplicate detection radius
- Scheduled function frequency

---

## 📝 Firestore Structure

### Complaints Collection
```javascript
complaints/{complaintId}
  ├─ title: string
  ├─ description: string
  ├─ category: string
  ├─ subcategory: string
  ├─ location: GeoPoint
  ├─ geohash: string (added by function)
  ├─ status: string
  ├─ priority: string
  ├─ slaDeadline: timestamp
  ├─ escalationLevel: number
  ├─ userId: string
  ├─ assignedTo: string
  ├─ duplicates: array (added by function)
  ├─ hasDuplicates: boolean
  ├─ aiConfidence: number (added by function)
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp
```

### Audit Logs Subcollection
```javascript
complaints/{complaintId}/auditLogs/{logId}
  ├─ action: string
  ├─ actorId: string
  ├─ details: string
  ├─ changes: array
  └─ createdAt: timestamp
```

### Users Collection (for FCM)
```javascript
users/{userId}
  ├─ name: string
  ├─ email: string
  ├─ role: string
  ├─ fcmToken: string (for notifications)
  └─ createdAt: timestamp
```

---

## 🔐 Security

### IAM Permissions
Functions run with Firebase Admin SDK privileges:
- Full read/write access to Firestore
- Can send FCM notifications
- Can call external APIs (OpenAI)

### API Keys
- Store OpenAI key in Firebase config (encrypted)
- Never commit API keys to git
- Use `.env` for local development only

---

## 🐛 Troubleshooting

### Function not triggering
1. Check Firebase Console → Functions for errors
2. Verify trigger path matches Firestore collection
3. Check function deployment status

### OpenAI API errors
1. Verify API key is set: `firebase functions:config:get`
2. Check OpenAI account has credits
3. Review function logs for error details

### Notification not sending
1. Verify user has `fcmToken` in Firestore
2. Check FCM token is valid (not expired)
3. Ensure Firebase Cloud Messaging is enabled

### Duplicate detection not working
1. Verify `geohash` field exists on complaints
2. Check `addGeohashOnCreate` function deployed
3. Ensure location data is valid GeoPoint

---

## 📈 Performance Optimization

### Reduce Cold Starts
- Keep functions warm with scheduled pings
- Use minimum instances (paid plan)

### Optimize Queries
- Use composite indexes for complex queries
- Limit query results with `.limit()`
- Use geohash for location queries

### Batch Operations
- Use batched writes for multiple updates
- Limit batch size to 500 operations

---

## 🔄 CI/CD

### GitHub Actions Example
```yaml
name: Deploy Functions
on:
  push:
    branches: [main]
    paths: ['functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
        working-directory: functions
      - run: npm run deploy
        working-directory: functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

## 📚 Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [GeoFire Docs](https://github.com/firebase/geofire-js)
- [FCM Docs](https://firebase.google.com/docs/cloud-messaging)

---

## 🆘 Support

For issues or questions:
1. Check function logs: `npm run logs`
2. Review Firebase Console errors
3. Test locally with emulators
4. Check this README for common issues
