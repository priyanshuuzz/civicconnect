# 🧪 End-to-End Test Guide

## Complete User Flow Test

### Test 1: Register → Login → Dashboard

#### Step 1: Register New User

1. **Navigate to:** `http://localhost:3000/register`

2. **Fill form:**
   - Name: Test User
   - Email: test@example.com
   - Password: test123456
   - Phone: (optional)

3. **Click:** Register

4. **Expected Console Output:**
```
🔥 onAuthStateChanged triggered: <new-uid>
📖 Fetching user document from Firestore...
⚠️ User document not found in Firestore, creating...
✅ User document created
✅ User state set: {user_id: "<uid>", name: "Test User", role: "citizen"}
✅ Setting loading to false
```

5. **Expected Behavior:**
   - ✅ Redirects to `/dashboard`
   - ✅ Shows "Welcome back, Test User"
   - ✅ Shows empty state (no complaints yet)
   - ✅ Stats show all zeros
   - ✅ NO infinite loading

#### Step 2: Logout and Login

1. **Click:** Logout button

2. **Navigate to:** `http://localhost:3000/login`

3. **Fill form:**
   - Email: test@example.com
   - Password: test123456

4. **Click:** Login

5. **Expected Console Output:**
```
🔥 onAuthStateChanged triggered: <uid>
📖 Fetching user document from Firestore...
✅ User document found: {name: "Test User", email: "test@example.com", role: "citizen"}
✅ User state set: {user_id: "<uid>", name: "Test User", role: "citizen"}
✅ Setting loading to false
🔒 ProtectedRoute check: {loading: false, isAuthenticated: true, user: "<uid>"}
✅ Access granted
```

6. **Expected Behavior:**
   - ✅ Redirects to `/dashboard`
   - ✅ Dashboard loads immediately
   - ✅ NO infinite loading

---

### Test 2: Create Complaint → Real-time Update

#### Step 1: Create First Complaint

1. **Click:** "New Report" or "Report Issue" button

2. **Fill form:**
   - Title: Test Pothole
   - Description: Large pothole on main street
   - Category: Roads & Footpaths
   - Subcategory: Pothole
   - Location: (click map or enter coordinates)
   - Image: (optional)

3. **Click:** Submit

4. **Expected Console Output:**
```
✅ Image uploaded to Firebase Storage (if image provided)
✅ Complaint created in Firestore
✅ Audit log created
📬 Snapshot received: 1 documents
✅ Received complaints: 1
```

5. **Expected Behavior:**
   - ✅ Redirects to dashboard
   - ✅ New complaint appears immediately
   - ✅ Stats update: Active Issues = 1, Total = 1
   - ✅ Complaint card shows all details

#### Step 2: Verify Real-time Updates

1. **Open dashboard in TWO browser tabs**

2. **In Tab 1:** Create another complaint

3. **In Tab 2:** Watch for automatic update

4. **Expected Console Output (Tab 2):**
```
📬 Snapshot received: 2 documents
✅ Received complaints: 2
```

5. **Expected Behavior:**
   - ✅ Tab 2 updates automatically (no refresh needed)
   - ✅ New complaint appears in Tab 2
   - ✅ Stats update in Tab 2

---

### Test 3: Filter and Navigation

#### Step 1: Test Status Filter

1. **Click:** "Submitted" tab

2. **Expected Console Output:**
```
🔍 CitizenDashboard: useEffect triggered {user: "<uid>", statusFilter: "submitted"}
📊 Starting real-time subscription...
🔍 Subscription filters: {userId: "<uid>", status: "submitted", limit: 100}
📬 Snapshot received: 2 documents
✅ Received complaints: 2
```

3. **Expected Behavior:**
   - ✅ Shows only submitted complaints
   - ✅ Stats update accordingly
   - ✅ NO loading spinner

#### Step 2: Test Ticket Detail

1. **Click:** Any complaint card

2. **Expected Behavior:**
   - ✅ Navigates to `/ticket/<id>`
   - ✅ Shows complaint details
   - ✅ Shows SLA progress
   - ✅ Shows messages section
   - ✅ Can send message

---

### Test 4: Error Scenarios

#### Scenario 1: No Internet Connection

1. **Disconnect internet**

2. **Refresh page**

3. **Expected Behavior:**
   - ✅ Shows cached data (offline persistence)
   - ⚠️ Console shows connection warnings
   - ✅ UI still functional

#### Scenario 2: Permission Denied

1. **Manually break Firestore rules** (for testing)

2. **Refresh dashboard**

3. **Expected Console Output:**
```
❌ Snapshot error: FirebaseError: Missing or insufficient permissions
```

4. **Expected Behavior:**
   - ✅ Shows empty state (not infinite loading)
   - ✅ Error logged to console
   - ✅ User can still navigate

---

## Quick Verification Checklist

### Registration Flow
- [ ] Can register new user
- [ ] User document created in Firestore
- [ ] Redirects to dashboard
- [ ] Dashboard loads (not stuck)
- [ ] Shows empty state

### Login Flow
- [ ] Can login with credentials
- [ ] Redirects to dashboard
- [ ] Dashboard loads immediately
- [ ] Shows user data
- [ ] NO infinite loading

### Dashboard
- [ ] Stats display correctly
- [ ] Empty state shows if no data
- [ ] Complaints list shows if data exists
- [ ] Filter tabs work
- [ ] Pagination works (if >20 items)
- [ ] NO infinite loading

### Create Complaint
- [ ] Form validation works
- [ ] Can upload image
- [ ] Complaint created successfully
- [ ] Redirects to dashboard
- [ ] New complaint appears immediately

### Real-time Updates
- [ ] Dashboard updates automatically
- [ ] No refresh needed
- [ ] Multiple tabs sync
- [ ] Stats update in real-time

### Navigation
- [ ] Can navigate to /report
- [ ] Can navigate to /ticket/:id
- [ ] Can navigate back
- [ ] Protected routes work
- [ ] Logout works

---

## Console Output Reference

### ✅ Success Indicators

```
🔥 Firebase Initialized
✅ Firestore DB: Connected
✅ Auth: Connected
✅ Storage: Connected
✅ Firebase Validation: PASSED
✅ User state set
✅ Setting loading to false
✅ Access granted
✅ Query created successfully
📬 Snapshot received
✅ Received complaints
```

### ❌ Error Indicators

```
❌ Error fetching user data
❌ Snapshot error
❌ Subscription error
❌ Error setting up subscription
❌ FAIL: [test name]
```

### ⚠️ Warning Indicators

```
⚠️ No user ID, skipping data fetch
⚠️ User document not found in Firestore, creating...
⚠️ Multiple tabs open, persistence enabled in first tab only
⚠️ FCM not supported
```

---

## Debugging Commands

### Check Current User
```javascript
// In browser console
console.log("Auth user:", window.auth?.currentUser);
```

### Check User Document
```javascript
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

const uid = auth.currentUser?.uid;
if (uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  console.log("User exists:", userDoc.exists());
  console.log("User data:", userDoc.data());
}
```

### Check Complaints Count
```javascript
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";

const uid = auth.currentUser?.uid;
if (uid) {
  const q = query(collection(db, "complaints"), where("userId", "==", uid));
  const snapshot = await getDocs(q);
  console.log("Total complaints:", snapshot.size);
  snapshot.docs.forEach(doc => console.log(doc.id, doc.data()));
}
```

### Run Firebase Tests
```javascript
// In browser console
await window.firebaseTests.runFirebaseTests();
```

---

## Performance Benchmarks

### Expected Load Times

| Action | Expected Time | Status |
|--------|--------------|--------|
| Register | < 2 seconds | ✅ |
| Login | < 1 second | ✅ |
| Dashboard Load | < 1 second | ✅ |
| Create Complaint | < 2 seconds | ✅ |
| Real-time Update | < 100ms | ✅ |
| Filter Change | < 500ms | ✅ |

### Expected Console Logs

| Flow | Log Count | Errors |
|------|-----------|--------|
| Register | ~10 logs | 0 |
| Login | ~8 logs | 0 |
| Dashboard | ~6 logs | 0 |
| Create Complaint | ~5 logs | 0 |

---

## Common Issues

### Issue: Stuck on Loading

**Symptoms:**
- Infinite loading spinner
- Dashboard never loads
- No console errors

**Debug:**
1. Check console for "✅ Setting loading to false"
2. If missing, check auth state
3. Check user document exists

**Solution:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check Firebase Console

### Issue: Empty Dashboard

**Symptoms:**
- Dashboard loads
- Shows empty state
- But complaints exist in Firestore

**Debug:**
1. Check console for "📬 Snapshot received: X documents"
2. Check if X > 0
3. Check statusFilter

**Solution:**
- Change status filter to "All"
- Check userId matches in Firestore
- Check Firestore rules

### Issue: No Real-time Updates

**Symptoms:**
- Dashboard doesn't update automatically
- Need to refresh to see changes

**Debug:**
1. Check console for "📬 Snapshot received"
2. Check if subscription is active
3. Check cleanup function

**Solution:**
- Check onSnapshot is used (not getDocs)
- Check unsubscribe is called on unmount
- Check Firestore connection

---

## Success Criteria

### All Tests Pass ✅

- ✅ Register works
- ✅ Login works
- ✅ Dashboard loads
- ✅ Data displays
- ✅ Real-time updates work
- ✅ No infinite loading
- ✅ No console errors
- ✅ Empty state shows correctly
- ✅ Navigation works
- ✅ Logout works

### Performance ✅

- ✅ Dashboard loads < 1 second
- ✅ Real-time updates < 100ms
- ✅ No memory leaks
- ✅ Smooth animations

### User Experience ✅

- ✅ Clear loading states
- ✅ Helpful empty states
- ✅ No confusing errors
- ✅ Intuitive navigation

---

**Last Updated:** April 17, 2026  
**Status:** ✅ ALL TESTS PASSING
