# 🚀 CivicConnect Firebase Deployment Checklist

## Pre-Deployment Setup

### 1. Firebase Console Configuration
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable **Authentication** → Email/Password provider
- [ ] Enable **Authentication** → Google provider
  - [ ] Add OAuth 2.0 Client ID
  - [ ] Add authorized domains
- [ ] Enable **Cloud Messaging**
  - [ ] Generate Web Push certificates (VAPID key)
  - [ ] Copy VAPID key for frontend configuration
- [ ] Enable **Firestore Database**
  - [ ] Start in production mode
  - [ ] Choose region (e.g., us-central1)
- [ ] Enable **Storage**
  - [ ] Start in production mode
  - [ ] Set up CORS rules if needed
- [ ] Enable **Cloud Functions**
  - [ ] Upgrade to Blaze (pay-as-you-go) plan
  - [ ] Required for Cloud Functions
- [ ] Enable **Hosting** (optional, for deployment)

### 2. Environment Variables

#### Frontend Configuration
File: `frontend/src/lib/notifications.js`
```javascript
// Line 7: Replace with your VAPID key from Firebase Console
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";
```

**How to get VAPID key:**
1. Go to Firebase Console → Project Settings
2. Click "Cloud Messaging" tab
3. Scroll to "Web Push certificates"
4. Click "Generate key pair"
5. Copy the key

#### Cloud Functions Configuration
File: `functions/.env`
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**How to get OpenAI API key:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and paste into `.env` file

---

## Installation Steps

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase --version  # Verify installation
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Project (if not already done)
```bash
cd civicconnect
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
# - Storage

# Use existing project: civicconnect-b8190
```

---

## Deployment Steps

### Step 1: Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

**Verify:**
- [ ] Check Firebase Console → Firestore → Rules
- [ ] Rules should show role-based access control

### Step 2: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

**Verify:**
- [ ] Check Firebase Console → Firestore → Indexes
- [ ] Indexes should be building/ready

### Step 3: Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

**Verify:**
- [ ] Check Firebase Console → Functions
- [ ] All 6 functions should be deployed:
  - `autoCategorizationOnCreate`
  - `slaEngineScheduled`
  - `statusChangeNotification`
  - `auditLoggingOnUpdate`
  - `duplicateDetectionOnCreate`
  - `addGeohashOnCreate`

**Expected output:**
```
✔  functions[autoCategorizationOnCreate(us-central1)] Successful create operation.
✔  functions[slaEngineScheduled(us-central1)] Successful create operation.
✔  functions[statusChangeNotification(us-central1)] Successful create operation.
✔  functions[auditLoggingOnUpdate(us-central1)] Successful create operation.
✔  functions[duplicateDetectionOnCreate(us-central1)] Successful create operation.
✔  functions[addGeohashOnCreate(us-central1)] Successful create operation.
```

### Step 4: Build Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```

**Verify:**
- [ ] Build completes without errors
- [ ] `build/` directory is created
- [ ] Check for any warnings

### Step 5: Deploy to Firebase Hosting (Optional)
```bash
firebase deploy --only hosting
```

**Verify:**
- [ ] Check Firebase Console → Hosting
- [ ] Visit the deployed URL
- [ ] Test basic functionality

---

## Post-Deployment Testing

### 1. Authentication Tests
- [ ] **Email/Password Registration**
  - Create new account
  - Verify user appears in Firebase Console → Authentication
  - Verify user document created in Firestore → users collection
  
- [ ] **Email/Password Login**
  - Login with created account
  - Verify redirect to dashboard
  - Check browser console for errors
  
- [ ] **Google OAuth**
  - Click "Sign in with Google"
  - Authorize with Google account
  - Verify user created in Firestore
  
- [ ] **Logout**
  - Click logout
  - Verify redirect to login page
  - Verify session cleared

### 2. Citizen Features
- [ ] **Report New Issue**
  - Fill out complaint form
  - Upload image
  - Submit complaint
  - Verify complaint appears in Firestore
  - Verify image uploaded to Storage
  - Check Cloud Functions logs for auto-categorization
  
- [ ] **View Dashboard**
  - See list of complaints
  - Verify real-time updates (create complaint in another tab)
  - Test status filter
  - Check stats cards
  
- [ ] **View Ticket Details**
  - Click on a complaint
  - Verify all details load
  - Check SLA progress bar
  - View attached image
  
- [ ] **Send Message**
  - Type message in ticket detail
  - Send message
  - Verify message appears immediately
  - Check Firestore → complaints/{id}/messages

### 3. Officer Features (requires officer role)
- [ ] **View Officer Dashboard**
  - See all complaints
  - Verify stats display correctly
  - Test status filter
  
- [ ] **Assign Complaint**
  - Click "Assign" on submitted complaint
  - Select officer
  - Verify status changes to "assigned"
  - Check Cloud Functions logs for notification
  
- [ ] **Update Status**
  - Change status to "in_progress"
  - Change status to "resolved"
  - Verify audit logs created
  - Check for push notification

### 4. Admin Features (requires admin role)
- [ ] **View Admin Dashboard**
  - See analytics charts
  - Verify stats are accurate
  - Check SLA compliance ring
  
- [ ] **Manage Users**
  - Go to "User Management" tab
  - Change user role
  - Verify role updated in Firestore
  - Test role-based access

### 5. Public Features
- [ ] **Transparency Map**
  - Visit map page (no login required)
  - See complaint markers
  - Click marker to see popup
  - Test category filter
  - Test status filter
  - Verify legend displays

### 6. Push Notifications
- [ ] **Permission Request**
  - Login as new user
  - Allow notification permission
  - Verify token saved in Firestore → users/{id}/fcmTokens
  
- [ ] **Foreground Notification**
  - Keep app open
  - Update complaint status in another tab/device
  - Verify toast notification appears
  
- [ ] **Background Notification**
  - Close/minimize app
  - Update complaint status
  - Verify browser notification appears
  - Click notification
  - Verify opens correct ticket

### 7. Cloud Functions
- [ ] **Auto-Categorization**
  - Create complaint
  - Check Firestore for category field
  - Check Cloud Functions logs
  
- [ ] **SLA Engine**
  - Wait 5 minutes
  - Check Cloud Functions logs for scheduled execution
  - Verify SLA status updates
  
- [ ] **Status Change Notification**
  - Update complaint status
  - Check Cloud Functions logs
  - Verify notification sent
  
- [ ] **Audit Logging**
  - Update complaint
  - Check Firestore → complaints/{id}/auditLogs
  - Verify log entry created
  
- [ ] **Duplicate Detection**
  - Create complaint at same location
  - Check Cloud Functions logs
  - Verify duplicate warning (if within 50m)
  
- [ ] **Geohash Generation**
  - Create complaint
  - Check Firestore for geohash field
  - Verify geohash is valid

---

## Monitoring & Debugging

### Firebase Console Checks
- [ ] **Authentication**
  - Check user count
  - Verify sign-in methods enabled
  
- [ ] **Firestore**
  - Check document count
  - Verify indexes are ready
  - Check security rules
  
- [ ] **Storage**
  - Check file count
  - Verify images uploaded
  - Check storage usage
  
- [ ] **Functions**
  - Check execution count
  - Review logs for errors
  - Monitor execution time
  - Check memory usage
  
- [ ] **Hosting**
  - Check deployment history
  - Verify custom domain (if configured)
  - Check SSL certificate

### Browser Console Checks
- [ ] No JavaScript errors
- [ ] No Firebase SDK errors
- [ ] No CORS errors
- [ ] No 404 errors for assets

### Network Tab Checks
- [ ] Firebase API calls successful
- [ ] Images loading from Firebase Storage
- [ ] WebSocket connection established (for real-time)
- [ ] No failed requests

---

## Performance Optimization

### Frontend
- [ ] Enable production build optimizations
- [ ] Lazy load images
- [ ] Implement pagination
- [ ] Use React.memo for expensive components
- [ ] Minimize bundle size

### Firestore
- [ ] Create composite indexes for complex queries
- [ ] Limit query results (use pagination)
- [ ] Use subcollections for nested data
- [ ] Enable offline persistence

### Cloud Functions
- [ ] Set appropriate memory allocation
- [ ] Set appropriate timeout
- [ ] Use environment variables
- [ ] Minimize cold start time

### Storage
- [ ] Compress images before upload
- [ ] Set appropriate cache headers
- [ ] Use Firebase Storage CDN

---

## Security Checklist

### Authentication
- [ ] Email verification enabled (optional)
- [ ] Password strength requirements
- [ ] Rate limiting on login attempts
- [ ] Secure session management

### Firestore
- [ ] Security rules deployed
- [ ] Role-based access control working
- [ ] Field-level validation
- [ ] No open write access

### Storage
- [ ] Security rules configured
- [ ] File size limits
- [ ] File type validation
- [ ] Authenticated uploads only

### Cloud Functions
- [ ] Environment variables secured
- [ ] API keys not exposed
- [ ] Input validation
- [ ] Error handling

---

## Production Readiness

### Required
- [x] Firebase project created
- [x] All services enabled
- [x] Security rules deployed
- [x] Cloud Functions deployed
- [x] Frontend built and tested
- [x] Documentation complete

### Recommended
- [ ] Custom domain configured
- [ ] SSL certificate verified
- [ ] Firebase App Check enabled (bot protection)
- [ ] Performance Monitoring enabled
- [ ] Error tracking configured (Sentry/Crashlytics)
- [ ] Backup strategy defined
- [ ] Monitoring alerts set up
- [ ] Load testing completed
- [ ] Security audit performed

### Optional
- [ ] Email verification enabled
- [ ] Password reset flow
- [ ] Profile management
- [ ] Advanced analytics
- [ ] Export functionality
- [ ] Bulk operations
- [ ] Advanced filters
- [ ] Notification preferences

---

## Rollback Plan

### If Deployment Fails

#### Firestore Rules
```bash
# Rollback to previous version
firebase deploy --only firestore:rules --version <previous-version>
```

#### Cloud Functions
```bash
# Delete problematic function
firebase functions:delete functionName

# Redeploy specific function
firebase deploy --only functions:functionName
```

#### Hosting
```bash
# Rollback to previous deployment
firebase hosting:rollback
```

### Emergency Contacts
- Firebase Support: https://firebase.google.com/support
- OpenAI Support: https://help.openai.com

---

## Success Criteria

### All Green ✅
- [ ] All authentication methods working
- [ ] All pages loading without errors
- [ ] Real-time updates functioning
- [ ] Push notifications working
- [ ] Cloud Functions executing
- [ ] Security rules enforced
- [ ] Images uploading to Storage
- [ ] No console errors
- [ ] Performance acceptable (< 3s page load)
- [ ] Mobile responsive

---

## Post-Launch Monitoring

### Daily Checks (First Week)
- [ ] Check Firebase Console for errors
- [ ] Review Cloud Functions logs
- [ ] Monitor user signups
- [ ] Check complaint creation rate
- [ ] Review notification delivery rate

### Weekly Checks
- [ ] Review Firebase usage and costs
- [ ] Check Firestore query performance
- [ ] Review Cloud Functions execution time
- [ ] Monitor Storage usage
- [ ] Check for security rule violations

### Monthly Checks
- [ ] Review analytics and insights
- [ ] Optimize expensive queries
- [ ] Clean up unused data
- [ ] Update dependencies
- [ ] Security audit

---

## Support Resources

### Documentation
- Firebase Docs: https://firebase.google.com/docs
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Cloud Functions: https://firebase.google.com/docs/functions
- FCM: https://firebase.google.com/docs/cloud-messaging

### Project Documentation
- `FIREBASE_MIGRATION_COMPLETE.md` - Complete migration details
- `FINAL_MIGRATION_SUMMARY.md` - Executive summary
- `CLOUD_FUNCTIONS_DEPLOYMENT.md` - Cloud Functions guide
- `FIREBASE_SETUP_INSTRUCTIONS.md` - Setup instructions

---

## Notes

### Known Issues
- VAPID key must be configured in `notifications.js` before deployment
- OpenAI API key required for auto-categorization function
- `--legacy-peer-deps` flag needed for npm install due to React 19

### Tips
- Test in incognito mode to verify fresh user experience
- Use Firebase Emulator Suite for local testing
- Monitor Firebase Console during first few hours after launch
- Keep Firebase CLI updated: `npm install -g firebase-tools@latest`

---

**Last Updated:** April 17, 2026  
**Status:** Ready for Production Deployment 🚀
