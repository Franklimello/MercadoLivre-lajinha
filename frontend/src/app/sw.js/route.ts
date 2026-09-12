// Public Firebase configuration only; never serialize server secrets here.
export const dynamic = "force-static";
export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  return new Response(
    `importScripts('/pwa-cache.js');\nself.MLL_FIREBASE_CONFIG = ${JSON.stringify(config)};\nif (self.MLL_FIREBASE_CONFIG.apiKey && self.MLL_FIREBASE_CONFIG.projectId && self.MLL_FIREBASE_CONFIG.messagingSenderId) { try { importScripts('/firebase-messaging-sw.js'); } catch (error) { console.warn('[PWA] Notificações indisponíveis neste momento.'); } }`,
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-store",
        "Service-Worker-Allowed": "/",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
