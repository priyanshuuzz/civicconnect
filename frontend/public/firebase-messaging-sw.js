// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and served at the root

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyA3577UYsUcd_cgZjiLs0YXlAY505RKyEs",
  authDomain: "civicconnect-b8190.firebaseapp.com",
  projectId: "civicconnect-b8190",
  storageBucket: "civicconnect-b8190.firebasestorage.app",
  messagingSenderId: "448109429534",
  appId: "1:448109429534:web:9494921785c9d28c17ff0f",
  measurementId: "G-M6PPBLEVPY"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'CivicConnect';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.complaintId || 'default',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  const complaintId = event.notification.data?.complaintId;
  const urlToOpen = complaintId 
    ? `${self.location.origin}/ticket/${complaintId}`
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
