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
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icons/icon-192x192.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
