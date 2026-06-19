importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// These will be replaced by the environment during build or used as defaults
// The user should provide these in their Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyCSIXAPFXbi5xj37eXTfVe5a2oHg_2j8mU",
  authDomain: "zetime-16774.firebaseapp.com",
  projectId: "zetime-16774",
  storageBucket: "zetime-16774.firebasestorage.app",
  messagingSenderId: "30878856713",
  appId: "1:30878856713:web:b245fd0d02e65745002ad8",
  measurementId: "G-0YL5XGWKGR"
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification.title;
    const isCall = payload.data && payload.data.type === 'call';
    
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon-192.png', // Fixed path
      badge: '/icon-192.png', // Added badge for status bar
      data: payload.data,
      tag: payload.data ? payload.data.tag || 'zetime-notif' : 'zetime-notif',
      renotify: true,
      requireInteraction: isCall, // Keep call notifications on screen until acted upon
      vibrate: isCall ? [200, 100, 200, 100, 200, 100, 200] : [100],
      actions: isCall ? [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' }
      ] : []
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  if (data && data.url) {
    url = data.url;
  } else if (data && data.type === 'call') {
    url = '/video-call'; // Assuming there is a video call route
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
