// Firebase Cloud Messaging (FCM) - Push Notifications
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";

const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: Replace with actual VAPID key from Firebase Console

let messaging = null;

// Initialize messaging (only in browser, not in service worker)
try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging();
  }
} catch (error) {
  console.error("Error initializing Firebase Messaging:", error);
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} true if permission granted
 */
export const requestNotificationPermission = async () => {
  try {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Notification permission granted");
      return true;
    } else if (permission === "denied") {
      console.warn("Notification permission denied");
      toast.error("Notifications blocked. Enable them in browser settings.");
      return false;
    } else {
      console.log("Notification permission dismissed");
      return false;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

/**
 * Get FCM token for this device
 * @returns {Promise<string|null>} FCM token or null if failed
 */
export const getFCMToken = async () => {
  try {
    if (!messaging) {
      console.error("Firebase Messaging not initialized");
      return null;
    }

    // Register service worker first
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Service Worker registered:", registration);

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token obtained:", token.substring(0, 20) + "...");
      return token;
    } else {
      console.warn("No FCM token available. Request permission first.");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
    
    // Provide helpful error messages
    if (error.code === "messaging/permission-blocked") {
      toast.error("Notifications are blocked. Please enable them in your browser settings.");
    } else if (error.code === "messaging/unsupported-browser") {
      toast.error("Your browser doesn't support push notifications.");
    } else {
      toast.error("Failed to enable notifications. Please try again.");
    }
    
    return null;
  }
};

/**
 * Save FCM token to Firestore user document
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export const saveFCMTokenToFirestore = async (userId, token) => {
  try {
    if (!userId || !token) {
      console.error("Missing userId or token");
      return false;
    }

    const userRef = doc(db, "users", userId);
    
    // Add token to fcmTokens array (prevents duplicates with arrayUnion)
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastTokenUpdate: serverTimestamp(),
    });

    console.log("FCM token saved to Firestore");
    return true;
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
    return false;
  }
};

/**
 * Setup FCM for a logged-in user
 * Requests permission, gets token, and saves to Firestore
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} true if setup successful
 */
export const setupNotifications = async (userId) => {
  try {
    if (!userId) {
      console.error("No userId provided for notification setup");
      return false;
    }

    // Step 1: Request permission
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return false;
    }

    // Step 2: Get FCM token
    const token = await getFCMToken();
    if (!token) {
      return false;
    }

    // Step 3: Save token to Firestore
    const saved = await saveFCMTokenToFirestore(userId, token);
    if (!saved) {
      return false;
    }

    // Step 4: Setup foreground message listener
    setupForegroundMessageListener();

    toast.success("Notifications enabled successfully!");
    return true;
  } catch (error) {
    console.error("Error setting up notifications:", error);
    toast.error("Failed to setup notifications");
    return false;
  }
};

/**
 * Listen for foreground messages (when app is open)
 * Background messages are handled by service worker
 */
export const setupForegroundMessageListener = () => {
  if (!messaging) {
    console.error("Firebase Messaging not initialized");
    return;
  }

  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);

    const notificationTitle = payload.notification?.title || "CivicConnect";
    const notificationBody = payload.notification?.body || "You have a new notification";

    // Show toast notification
    toast.info(notificationBody, {
      description: notificationTitle,
      duration: 5000,
    });

    // Optionally show browser notification even in foreground
    if (Notification.permission === "granted") {
      new Notification(notificationTitle, {
        body: notificationBody,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: payload.data?.complaintId || "default",
        data: payload.data,
      });
    }
  });
};

/**
 * Check if notifications are currently enabled
 * @returns {boolean}
 */
export const areNotificationsEnabled = () => {
  if (!("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
};

/**
 * Handle token refresh (called when token changes)
 * @param {string} userId - User ID
 */
export const handleTokenRefresh = async (userId) => {
  try {
    const newToken = await getFCMToken();
    if (newToken) {
      await saveFCMTokenToFirestore(userId, newToken);
      console.log("FCM token refreshed and saved");
    }
  } catch (error) {
    console.error("Error refreshing FCM token:", error);
  }
};

export default {
  requestNotificationPermission,
  getFCMToken,
  saveFCMTokenToFirestore,
  setupNotifications,
  setupForegroundMessageListener,
  areNotificationsEnabled,
  handleTokenRefresh,
};
