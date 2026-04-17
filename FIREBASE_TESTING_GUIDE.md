# 🧪 Firebase Testing Guide

## Quick Start Testing

### Method 1: Automatic Tests (Recommended)

The app now runs validation automatically on startup. Just check the browser console!

**Expected Output:**
```
🔥 Firebase Initialized
✅ Firestore DB: Connected
✅ Auth: Connected
✅ Storage: Connected
🔥 Firebase Service Layer Loaded
✅ DB imported: Success
✅ Storage imported: Success
🔍 Starting Firebase Validation...
✅ Firebase Validation: PASSED
```

### Method 2: Manual Console Tests

Open browser console (F12) and run:

```javascript
// Quick test
window.firebaseTests.quickTest()

// Full test suite
await window.firebaseTests.runFirebaseTests()

// Test specific collection
window.firebaseTests.testCollection('users')
```

---

## 🔍 Detailed Testing Steps

### Step 1: Start Development Server

```bash
cd frontend
npm start
```

### Step 2: Open Browser Console

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for Firebase initialization logs

### Step 3: Check Initialization Logs

You should see:
```
🔥 Firebase Initialized
✅ Firestore DB: Connected
✅ Auth: Connected
✅ Storage: Connected
✅ FCM Messaging: Supported
```

If you see ❌ errors, check:
- Firebase config in `firebase.js`
- Network connection
- Firebase project status

### Step 4: Run Quick Test

In console:
```javascript
window.firebaseTests.quickTest()
```

Expected output:
```
⚡ Quick Firebase Test
DB: ✅
Auth: ✅
Storage: ✅
✅ All Firebase services initialized!
```

### Step 5: Run Full Test Suite

In console:
```javascript
await window.firebaseTests.runFirebaseTests()
```

Expected output:
```
🧪 Starting Firebase Integration Tests...

Test 1: Firestore DB Initialization
✅ PASS: db is defined

Test 2: Firebase Auth Initialization
✅ PASS: auth is defined

Test 3: Firebase Storage Initialization
✅ PASS: storage is defined

Test 4: collection() Function Call
✅ PASS: collection(db, 'users') successful
   Collection path: users

Test 5: Firestore Read Operation
✅ PASS: Firestore working (permission denied is expected)

Test 6: Subcollection Path
✅ PASS: Subcollection path successful
   Collection path: complaints/test123/messages

==================================================
📊 TEST SUMMARY
==================================================
✅ Passed: 6
❌ Failed: 0
📈 Total: 6
🎯 Success Rate: 100%
==================================================

🎉 ALL TESTS PASSED! Firebase is working correctly!
```

---

## 🧪 Test Scenarios

### Test 1: Registration Flow

1. Go to `/register`
2. Fill form and submit
3. Check console for:
   ```
   ✅ User created in Firebase Auth
   ✅ User document created in Firestore
   ```

### Test 2: Login Flow

1. Go to `/login`
2. Enter credentials
3. Check console for:
   ```
   ✅ Firebase Auth successful
   ✅ User data fetched from Firestore
   ✅ FCM token setup initiated
   ```

### Test 3: Create Complaint

1. Login
2. Go to `/report`
3. Fill form and upload image
4. Submit
5. Check console for:
   ```
   ✅ Image uploaded to Firebase Storage
   ✅ Complaint created in Firestore
   ✅ Audit log created
   ```

### Test 4: Real-time Updates

1. Open dashboard in two browser tabs
2. Create complaint in tab 1
3. Check tab 2 - should update automatically
4. Check console for:
   ```
   ✅ Real-time update received
   ```

### Test 5: Messages

1. Open ticket detail page
2. Send message
3. Check console for:
   ```
   ✅ Message created in Firestore
   ✅ Real-time message received
   ```

---

## 🐛 Troubleshooting

### Issue: "db is undefined"

**Console shows:**
```
❌ Firestore DB: ERROR: Not initialized
```

**Solutions:**
1. Check `firebase.js` for errors
2. Verify Firebase config is correct
3. Check network tab for Firebase API calls
4. Clear cache and restart: `rm -rf node_modules/.cache && npm start`

### Issue: "collection() error"

**Console shows:**
```
❌ FAIL: collection() error: Cannot read property 'collection' of undefined
```

**Solutions:**
1. Run `window.firebaseTests.quickTest()` to check initialization
2. Check if `db` is imported correctly in the file
3. Verify path alias is working: `@/firebase`
4. Check webpack config in `craco.config.js`

### Issue: "Permission denied"

**Console shows:**
```
FirebaseError: Missing or insufficient permissions
```

**This is NORMAL!**
- Firestore security rules are working
- User needs to be authenticated first
- Not an initialization error

**Solution:**
- Login first
- Then try the operation again

### Issue: "Firebase not initialized"

**Console shows:**
```
❌ Firebase Validation: FAILED
```

**Solutions:**
1. Check Firebase project exists
2. Verify API key is correct
3. Check Firebase project is active (not deleted)
4. Verify domain is authorized in Firebase Console

---

## 📊 Test Results Interpretation

### All Green (✅)
```
✅ Passed: 6
❌ Failed: 0
🎯 Success Rate: 100%
```
**Status:** Everything working perfectly!  
**Action:** No action needed

### Some Red (❌)
```
✅ Passed: 4
❌ Failed: 2
🎯 Success Rate: 67%
```
**Status:** Some issues detected  
**Action:** Check detailed results for specific errors

### All Red (❌)
```
✅ Passed: 0
❌ Failed: 6
🎯 Success Rate: 0%
```
**Status:** Firebase not initialized  
**Action:** Check `firebase.js` and Firebase config

---

## 🔧 Manual Debug Commands

### Check Firebase Exports

```javascript
import { db, auth, storage } from "@/firebase";
console.log("DB:", db);
console.log("Auth:", auth);
console.log("Storage:", storage);
```

### Test Collection Call

```javascript
import { collection } from "firebase/firestore";
import { db } from "@/firebase";

const usersRef = collection(db, "users");
console.log("Collection ref:", usersRef);
console.log("Path:", usersRef.path);
```

### Test Firestore Read

```javascript
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

const usersRef = collection(db, "users");
const snapshot = await getDocs(usersRef);
console.log("Documents:", snapshot.size);
```

### Test Firestore Write

```javascript
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase";

const testData = {
  test: true,
  timestamp: new Date()
};

const docRef = await addDoc(collection(db, "test"), testData);
console.log("Document created:", docRef.id);
```

---

## 📝 Test Checklist

Before deploying to production, verify:

- [ ] All initialization logs show ✅
- [ ] Quick test passes
- [ ] Full test suite passes (6/6)
- [ ] Registration works
- [ ] Login works
- [ ] Create complaint works
- [ ] Real-time updates work
- [ ] Messages work
- [ ] No console errors
- [ ] No network errors

---

## 🎯 Success Criteria

### Initialization
- ✅ Firebase initialized
- ✅ Firestore connected
- ✅ Auth connected
- ✅ Storage connected

### Operations
- ✅ Can call collection()
- ✅ Can read from Firestore
- ✅ Can write to Firestore
- ✅ Real-time updates working

### User Flows
- ✅ Registration successful
- ✅ Login successful
- ✅ Create complaint successful
- ✅ Messages working

---

## 💡 Pro Tips

1. **Always check console first** - Most issues show up there
2. **Use quick test** - Fast way to verify initialization
3. **Run full suite** - Comprehensive validation
4. **Test in incognito** - Avoid cache issues
5. **Check Network tab** - See Firebase API calls
6. **Clear cache often** - `rm -rf node_modules/.cache`

---

## 📞 Need Help?

If tests fail:

1. **Check console logs** - Look for specific errors
2. **Run debug utility** - `window.firebaseTests.runFirebaseTests()`
3. **Check Firebase Console** - Verify project is active
4. **Clear cache** - `rm -rf node_modules/.cache && npm start`
5. **Hard refresh** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

**Last Updated:** April 17, 2026  
**Status:** ✅ All Tests Passing
