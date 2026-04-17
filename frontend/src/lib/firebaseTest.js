// Firebase Integration Test Script
// Run this in browser console to test Firebase setup

import { db, auth, storage } from "@/firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Test Suite for Firebase Integration
 */
export const runFirebaseTests = async () => {
  console.log("🧪 Starting Firebase Integration Tests...\n");
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check if db is defined
  console.log("Test 1: Firestore DB Initialization");
  if (db) {
    console.log("✅ PASS: db is defined");
    results.passed++;
    results.tests.push({ name: "DB Initialization", status: "PASS" });
  } else {
    console.error("❌ FAIL: db is undefined");
    results.failed++;
    results.tests.push({ name: "DB Initialization", status: "FAIL" });
  }

  // Test 2: Check if auth is defined
  console.log("\nTest 2: Firebase Auth Initialization");
  if (auth) {
    console.log("✅ PASS: auth is defined");
    results.passed++;
    results.tests.push({ name: "Auth Initialization", status: "PASS" });
  } else {
    console.error("❌ FAIL: auth is undefined");
    results.failed++;
    results.tests.push({ name: "Auth Initialization", status: "FAIL" });
  }

  // Test 3: Check if storage is defined
  console.log("\nTest 3: Firebase Storage Initialization");
  if (storage) {
    console.log("✅ PASS: storage is defined");
    results.passed++;
    results.tests.push({ name: "Storage Initialization", status: "PASS" });
  } else {
    console.error("❌ FAIL: storage is undefined");
    results.failed++;
    results.tests.push({ name: "Storage Initialization", status: "FAIL" });
  }

  // Test 4: Test collection() call
  console.log("\nTest 4: collection() Function Call");
  try {
    const usersRef = collection(db, "users");
    if (usersRef) {
      console.log("✅ PASS: collection(db, 'users') successful");
      console.log("   Collection path:", usersRef.path);
      results.passed++;
      results.tests.push({ name: "collection() Call", status: "PASS" });
    }
  } catch (error) {
    console.error("❌ FAIL: collection() error:", error.message);
    results.failed++;
    results.tests.push({ name: "collection() Call", status: "FAIL", error: error.message });
  }

  // Test 5: Test Firestore read (will fail if not authenticated, but that's ok)
  console.log("\nTest 5: Firestore Read Operation");
  try {
    const usersRef = collection(db, "users");
    await getDocs(usersRef);
    console.log("✅ PASS: Firestore read successful");
    results.passed++;
    results.tests.push({ name: "Firestore Read", status: "PASS" });
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log("✅ PASS: Firestore working (permission denied is expected)");
      results.passed++;
      results.tests.push({ name: "Firestore Read", status: "PASS", note: "Permission denied (expected)" });
    } else {
      console.error("❌ FAIL: Firestore read error:", error.message);
      results.failed++;
      results.tests.push({ name: "Firestore Read", status: "FAIL", error: error.message });
    }
  }

  // Test 6: Test subcollection path
  console.log("\nTest 6: Subcollection Path");
  try {
    const messagesRef = collection(db, "complaints", "test123", "messages");
    if (messagesRef) {
      console.log("✅ PASS: Subcollection path successful");
      console.log("   Collection path:", messagesRef.path);
      results.passed++;
      results.tests.push({ name: "Subcollection Path", status: "PASS" });
    }
  } catch (error) {
    console.error("❌ FAIL: Subcollection error:", error.message);
    results.failed++;
    results.tests.push({ name: "Subcollection Path", status: "FAIL", error: error.message });
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log("=".repeat(50));

  // Print detailed results
  console.log("\n📋 DETAILED RESULTS:");
  results.tests.forEach((test, index) => {
    const icon = test.status === "PASS" ? "✅" : "❌";
    console.log(`${index + 1}. ${icon} ${test.name}: ${test.status}`);
    if (test.note) console.log(`   Note: ${test.note}`);
    if (test.error) console.log(`   Error: ${test.error}`);
  });

  if (results.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Firebase is working correctly!");
  } else {
    console.log("\n⚠️ SOME TESTS FAILED. Check errors above.");
  }

  return results;
};

/**
 * Quick test - just check if Firebase is initialized
 */
export const quickTest = () => {
  console.log("⚡ Quick Firebase Test");
  console.log("DB:", db ? "✅" : "❌");
  console.log("Auth:", auth ? "✅" : "❌");
  console.log("Storage:", storage ? "✅" : "❌");
  
  if (db && auth && storage) {
    console.log("✅ All Firebase services initialized!");
    return true;
  } else {
    console.error("❌ Some Firebase services not initialized!");
    return false;
  }
};

/**
 * Test collection call with specific collection name
 */
export const testCollection = (collectionName) => {
  console.log(`🧪 Testing collection("${collectionName}")...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    console.log("✅ Success!");
    console.log("Path:", collectionRef.path);
    console.log("Type:", collectionRef.type);
    return collectionRef;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.firebaseTests = {
    runFirebaseTests,
    quickTest,
    testCollection
  };
  console.log("💡 Firebase tests loaded! Run in console:");
  console.log("   window.firebaseTests.quickTest()");
  console.log("   window.firebaseTests.runFirebaseTests()");
  console.log("   window.firebaseTests.testCollection('users')");
}

export default {
  runFirebaseTests,
  quickTest,
  testCollection
};
