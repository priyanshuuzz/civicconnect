// Firebase Debug and Validation Utility
import { db, auth, storage } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

/**
 * Validate Firebase initialization
 * Run this on app startup to ensure everything is working
 */
export const validateFirebaseSetup = async () => {
  console.log("🔍 Starting Firebase Validation...");
  
  const results = {
    initialized: false,
    db: false,
    auth: false,
    storage: false,
    canReadFirestore: false,
    errors: []
  };

  try {
    // Check if db is defined
    if (!db) {
      results.errors.push("❌ Firestore DB is undefined");
      console.error("❌ Firestore DB is undefined");
      return results;
    }
    results.db = true;
    console.log("✅ Firestore DB: Initialized");

    // Check if auth is defined
    if (!auth) {
      results.errors.push("❌ Firebase Auth is undefined");
      console.error("❌ Firebase Auth is undefined");
    } else {
      results.auth = true;
      console.log("✅ Firebase Auth: Initialized");
    }

    // Check if storage is defined
    if (!storage) {
      results.errors.push("❌ Firebase Storage is undefined");
      console.error("❌ Firebase Storage is undefined");
    } else {
      results.storage = true;
      console.log("✅ Firebase Storage: Initialized");
    }

    // Test Firestore read operation
    try {
      console.log("🔍 Testing Firestore read operation...");
      const testCollection = collection(db, "users");
      console.log("✅ collection() call successful");
      
      // Try to read (will fail if no permission, but that's ok)
      await getDocs(testCollection);
      results.canReadFirestore = true;
      console.log("✅ Firestore read test: Success");
    } catch (readError) {
      // Permission denied is ok - it means Firestore is working
      if (readError.code === 'permission-denied') {
        results.canReadFirestore = true;
        console.log("✅ Firestore read test: Working (permission denied is expected)");
      } else {
        results.errors.push(`❌ Firestore read error: ${readError.message}`);
        console.error("❌ Firestore read error:", readError);
      }
    }

    results.initialized = results.db && results.auth && results.storage;

    if (results.initialized) {
      console.log("✅ Firebase Validation: PASSED");
    } else {
      console.error("❌ Firebase Validation: FAILED");
      console.error("Errors:", results.errors);
    }

  } catch (error) {
    results.errors.push(`❌ Validation error: ${error.message}`);
    console.error("❌ Firebase validation error:", error);
  }

  return results;
};

/**
 * Debug collection() calls
 * Use this to test if collection() is working correctly
 */
export const debugCollectionCall = (collectionName) => {
  console.log(`🔍 Testing collection("${collectionName}")...`);
  
  try {
    if (!db) {
      console.error("❌ db is undefined!");
      return null;
    }
    
    console.log("✅ db is defined:", db);
    
    const collectionRef = collection(db, collectionName);
    console.log("✅ collection() returned:", collectionRef);
    
    return collectionRef;
  } catch (error) {
    console.error(`❌ Error calling collection("${collectionName}"):`, error);
    return null;
  }
};

/**
 * Get Firebase status for display
 */
export const getFirebaseStatus = () => {
  return {
    db: db ? "✅ Connected" : "❌ Not initialized",
    auth: auth ? "✅ Connected" : "❌ Not initialized",
    storage: storage ? "✅ Connected" : "❌ Not initialized",
  };
};

export default {
  validateFirebaseSetup,
  debugCollectionCall,
  getFirebaseStatus
};
