/* Firebase public configuration is supplied by the app when registering the worker. */
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js",
);
const config =
  self.MLL_FIREBASE_CONFIG ||
  JSON.parse(new URL(self.location.href).searchParams.get("config") || "null");
if (config) {
  firebase.initializeApp(config);
  firebase.messaging().onBackgroundMessage((payload) => {
    // Firebase already displays messages that contain a notification payload.
    if (payload.notification) return;
    self.registration.showNotification(
      payload.data?.title || "Mercado Livre Lajinha",
      {
        body: payload.data?.body || "Você recebeu uma mensagem.",
        data: payload.data,
      },
    );
  });
}
