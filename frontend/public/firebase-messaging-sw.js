// Scripts do Firebase para Service Worker de Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuração básica do Firebase Messaging
const firebaseConfig = {
  apiKey: "AIzaSyMockKeyForDevelopmentOnly",
  authDomain: "mercadolajinha.firebaseapp.com",
  projectId: "mercadolajinha",
  storageBucket: "mercadolajinha.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123"
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano:', payload);
  const notificationTitle = payload.notification?.title || 'Mercado Lajinha';
  const notificationOptions = {
    body: payload.notification?.body || 'Você recebeu uma nova notificação.',
    icon: '/icons/icon-192.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
