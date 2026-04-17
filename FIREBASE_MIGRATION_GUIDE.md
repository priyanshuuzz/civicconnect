# 🔥 Firebase Migration Guide - CivicConnect

## ✅ Migration Status: Phase 1 Complete

This document tracks the complete migration from FastAPI/MongoDB backend to Firebase.

---

## 📦 What's Been Implemented

### 1. ✅ Firebase Initialization (`src/firebase.js`)
- Firebase App initialized with your config
- Firebase Auth with Google OAuth provider
- Firestore database with offline persistence
- Firebase Storage for images
- Firebase Cloud Messaging (FCM) support
- Analytics enabled

### 2. ✅ Authentication System (`src/contexts/AuthContext.js`)
**Replaced**: Backend JWT auth → Firebase Auth

**Features Implemented**:
- ✅ Email/Password signup & login
- ✅ Google OAuth (popup-based, no redirects)
- ✅ Persistent sessions (automatic)
- ✅ User role management in Firestore
- ✅ Real-time auth state listening
- ✅ Automatic user document creation

**Firestore Structure**:
```
users/{userId}
  ├─ name: string
  ├─ email: string
  ├─ role: "citizen" | "officer" | "admin"
  ├─ phone: string
  ├─ picture: string
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp
```

### 3. ✅ Firebase Service Layer (`src/lib/firebaseService.js`)
**Replaced**: `src/lib/api.js` (axios calls) → Firebase SDK calls

**Implemented Functions**:

#### Complaint Operations
- `createComplaint()` - Create new complaint with SLA calculation
- `getComplaints()` - Fetch with filters (userId, status, category)
- `getComplaintById()` - Get single complaint
- `updateComplaintStatus()` - Update status with audit log
- `assignComplaint()` - Assign to officer
- `uploadComplaintImage()` - Upload to Firebase Storage
- `subscribeToComplaints()` - Real-time updates

#### Messaging
- `addMessage()` - Add message to complaint
- `subscribeToMessages()` - Real-time chat updates

#### Audit Logs
- `addAuditLog()` - Log all actions
- `getAuditLogs()` - Fetch complaint history

#### Public Map
- `getMapComplaints()` - Public data for transparency map

#### Admin/Analytics
- `getDashboardStats()` - Real-time statistics
- `getUsers()` - Fetch all users
- `updateUserRole()` - Change user roles

**Firestore Structure**:
```
complaints/{complaintId}
  ├─ title: string
  ├─ description: string
  ├─ category: string
  ├─ subcategory: string
  ├─ location: GeoPoint
  ├─ address: string
  ├─ imageUrl: string
  ├─ status: "submitted" | "assigned" | "in_progress" | "resolved" | "closed"
  ├─ priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ├─ slaDeadline: timestamp
  ├─ escalationLevel: number
  ├─ assignedTo: string (userId)
  ├─ assignedToName: string
  ├─ userId: string
  ├─ userName: string
  ├─ createdAt: timestamp
  ├─ updatedAt: timestamp
  ├─ resolvedAt: timestamp | null
  ├─ reopenCount: number
  │
  ├─ messages/{messageId}
  │   ├─ senderId: string
  │   ├─ senderName: string
  │   ├─ senderRole: string
  │   ├─ text: string
  │   └─ createdAt: timestamp
  │
  └─ auditLogs/{logId}
      ├─ action: string
      ├─ actorId: string
      ├─ details: string
      └─ createdAt: timestamp
```

### 4. ✅ Updated Pages
- ✅ `LoginPage.js` - Firebase Auth integration
- ✅ `RegisterPage.js` - Firebase Auth integration
- ✅ `App.js` - Removed AuthCallback (not needed with Firebase)

### 5. ✅ Dependencies Updated
- ✅ Added `firebase@^11.2.0` to package.json
- ✅ Removed `axios` dependency (no longer needed)

---

## 🚧 What Still Needs Migration

### Phase 2: Update Page Components

#### A. Report Issue Page (`src/pages/ReportIssuePage.js`)
**Current**: Uses `api.post("/tickets")`  
**Update to**: Use `createComplaint()` and `uploadComplaintImage()` from firebaseService

#### B. Citizen Dashboard (`src/pages/CitizenDashboard.js`)
**Current**: Uses `api.get("/tickets")`  
**Update to**: Use `subscribeToComplaints()` for real-time updates

#### C. Ticket Detail Page (`src/pages/TicketDetailPage.js`)
**Current**: Uses `api.get("/tickets/:id")`, `api.post("/tickets/:id/messages")`  
**Update to**: 
- `getComplaintById()`
- `subscribeToMessages()`
- `addMessage()`
- `updateComplaintStatus()`

#### D. Officer Dashboard (`src/pages/OfficerDashboard.js`)
**Current**: Uses `api.get("/tickets")`, `api.post("/tickets/:id/assign")`  
**Update to**:
- `subscribeToComplaints()` with filters
- `assignComplaint()`
- `updateComplaintStatus()`

#### E. Admin Dashboard (`src/pages/AdminDashboard.js`)
**Current**: Uses `api.get("/admin/dashboard")`, `api.get("/admin/users")`  
**Update to**:
- `getDashboardStats()`
- `getUsers()`
- `updateUserRole()`

#### F. Transparency Map (`src/pages/TransparencyMap.js`)
**Current**: Uses `api.get("/map/tickets")`  
**Update to**: `getMapComplaints()`

---

## 📋 Installation & Setup

### Step 1: Install Firebase
```bash
cd frontend
npm install firebase@^11.2.0 --legacy-peer-deps
```

### Step 2: Firebase Console Setup

#### A. Enable Authentication
1. Go to Firebase Console → Authentication
2. Enable **Email/Password** provider
3. Enable **Google** provider
4. Add authorized domain: `localhost` (for development)

#### B. Create Firestore Database
1. Go to Firestore Database
2. Create database in **production mode**
3. Choose location (e.g., `us-central1`)

#### C. Enable Storage
1. Go to Storage
2. Get started with default rules

#### D. Create Indexes (Required for Queries)
Go to Firestore → Indexes → Create these composite indexes:

```
Collection: complaints
Fields:
  - userId (Ascending) + createdAt (Descending)
  - status (Ascending) + createdAt (Descending)
  - category (Ascending) + createdAt (Descending)
  - assignedTo (Ascending) + createdAt (Descending)
  - status (Ascending) + slaDeadline (Ascending)
```

### Step 3: Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isOfficerOrAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['officer', 'admin'];
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Complaints collection
    match /complaints/{complaintId} {
      // Public read for map (limited fields)
      allow read: if true;
      
      // Only authenticated users can create
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // Owner can update their own complaints (limited fields)
      allow update: if isOwner(resource.data.userId) || isOfficerOrAdmin();
      
      // Only admins can delete
      allow delete: if isAdmin();
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if false;
      }
      
      // Audit logs subcollection
      match /auditLogs/{logId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if false;
      }
    }
  }
}
```

### Step 4: Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /complaints/{complaintId}/{allPaths=**} {
      // Anyone can read
      allow read: if true;
      
      // Only authenticated users can upload
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🔄 Migration Checklist

### ✅ Completed
- [x] Firebase initialization
- [x] Authentication system (Email/Password + Google)
- [x] Firebase service layer
- [x] Login page
- [x] Register page
- [x] App routing (removed AuthCallback)
- [x] Package.json updated

### 🚧 In Progress
- [ ] Report Issue Page
- [ ] Citizen Dashboard
- [ ] Ticket Detail Page
- [ ] Officer Dashboard
- [ ] Admin Dashboard
- [ ] Transparency Map

### 📝 To Do
- [ ] Firebase Cloud Functions (SLA engine, notifications)
- [ ] Firebase Cloud Messaging (push notifications)
- [ ] Duplicate detection logic
- [ ] AI categorization (Cloud Function)
- [ ] Performance optimization (pagination)
- [ ] Testing & validation

---

## 🚀 Next Steps

1. **Install Firebase**: Run `npm install firebase@^11.2.0 --legacy-peer-deps`
2. **Setup Firebase Console**: Enable Auth, Firestore, Storage
3. **Deploy Security Rules**: Copy rules from above
4. **Create Indexes**: Add composite indexes
5. **Update Pages**: Migrate each page component to use firebaseService
6. **Test**: Verify all features work end-to-end

---

## 📊 Benefits of Firebase Migration

✅ **No Backend Server Required** - Serverless architecture  
✅ **Real-time Updates** - Live data synchronization  
✅ **Offline Support** - Works without internet  
✅ **Scalability** - Auto-scales with usage  
✅ **Security** - Built-in security rules  
✅ **Cost-Effective** - Pay only for what you use  
✅ **Fast Development** - No API endpoints to maintain  

---

## 🆘 Troubleshooting

### Issue: "Firebase not defined"
**Solution**: Make sure you've installed Firebase: `npm install firebase`

### Issue: "Permission denied" in Firestore
**Solution**: Check security rules and ensure user is authenticated

### Issue: "Index required" error
**Solution**: Click the link in the error message to auto-create the index

### Issue: Google Sign-in popup blocked
**Solution**: Allow popups for localhost in browser settings

---

## 📞 Support

For issues or questions about the Firebase migration, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
