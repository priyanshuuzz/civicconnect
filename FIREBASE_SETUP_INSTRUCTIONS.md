# 🚀 Quick Firebase Setup Instructions

## Step-by-Step Setup (5 minutes)

### 1️⃣ Install Firebase Package
```bash
cd civicconnect/frontend
npm install firebase@^11.2.0 --legacy-peer-deps
```

### 2️⃣ Firebase Console Setup

#### Go to: https://console.firebase.google.com

#### A. Enable Authentication
1. Click **Authentication** → **Get Started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**
4. Enable **Google** 
   - Add your email as test user
   - Add `localhost` to authorized domains

#### B. Create Firestore Database
1. Click **Firestore Database** → **Create database**
2. Select **Start in production mode**
3. Choose location: **us-central (Iowa)** or closest to you
4. Click **Enable**

#### C. Enable Storage
1. Click **Storage** → **Get started**
2. Use default security rules
3. Click **Done**

#### D. Create Required Indexes
1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index**
3. Create these 4 indexes:

**Index 1:**
- Collection ID: `complaints`
- Fields: `userId` (Ascending), `createdAt` (Descending)
- Query scope: Collection

**Index 2:**
- Collection ID: `complaints`
- Fields: `status` (Ascending), `createdAt` (Descending)
- Query scope: Collection

**Index 3:**
- Collection ID: `complaints`
- Fields: `category` (Ascending), `createdAt` (Descending)
- Query scope: Collection

**Index 4:**
- Collection ID: `complaints`
- Fields: `assignedTo` (Ascending), `createdAt` (Descending)
- Query scope: Collection

### 3️⃣ Deploy Security Rules

#### Firestore Rules
1. Go to **Firestore Database** → **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    match /complaints/{complaintId} {
      allow read: if true;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) || isOfficerOrAdmin();
      allow delete: if isAdmin();
      
      match /messages/{messageId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if false;
      }
      
      match /auditLogs/{logId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated();
        allow update, delete: if false;
      }
    }
  }
}
```

3. Click **Publish**

#### Storage Rules
1. Go to **Storage** → **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /complaints/{complaintId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### 4️⃣ Start the App
```bash
npm start
```

### 5️⃣ Test Authentication
1. Go to http://localhost:3000
2. Click **Sign up**
3. Create account with email/password
4. Or use **Continue with Google**

---

## ✅ What's Working Now

- ✅ User registration (email/password)
- ✅ Google OAuth sign-in
- ✅ Persistent sessions
- ✅ User role management
- ✅ Protected routes

---

## 🔄 What Still Needs Page Updates

The following pages need to be updated to use Firebase instead of the old API:

1. **Report Issue Page** - Create complaints
2. **Citizen Dashboard** - View my complaints
3. **Ticket Detail Page** - View/update single complaint
4. **Officer Dashboard** - Manage assigned complaints
5. **Admin Dashboard** - View all complaints & users
6. **Transparency Map** - Public complaint map

These pages currently try to call the old backend API. They need to be updated to use the new `firebaseService.js` functions.

---

## 🎯 Quick Test

After setup, you should be able to:

1. ✅ Register a new account
2. ✅ Login with email/password
3. ✅ Login with Google
4. ✅ Stay logged in after refresh
5. ✅ Logout

---

## 🆘 Common Issues

### "Firebase: Error (auth/popup-blocked)"
**Solution**: Allow popups for localhost in your browser

### "Missing or insufficient permissions"
**Solution**: Make sure you published the Firestore security rules

### "The query requires an index"
**Solution**: Click the link in the error to auto-create the index, or manually create it in Firebase Console

### "Firebase not defined"
**Solution**: Run `npm install firebase@^11.2.0 --legacy-peer-deps`

---

## 📝 Next Steps

Once authentication is working, we need to update each page component to use Firebase:

1. Update `ReportIssuePage.js` to use `createComplaint()`
2. Update `CitizenDashboard.js` to use `subscribeToComplaints()`
3. Update `TicketDetailPage.js` to use `getComplaintById()` and `subscribeToMessages()`
4. Update `OfficerDashboard.js` to use Firebase queries
5. Update `AdminDashboard.js` to use `getDashboardStats()`
6. Update `TransparencyMap.js` to use `getMapComplaints()`

See `FIREBASE_MIGRATION_GUIDE.md` for detailed migration instructions.
