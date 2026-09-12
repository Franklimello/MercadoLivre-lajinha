let registrationPromise: Promise<ServiceWorkerRegistration> | undefined;
export function registerMarketplaceWorker() {
  if (!window.isSecureContext || !("serviceWorker" in navigator))
    return Promise.reject(new Error("PWA requires a secure context"));
  registrationPromise ??= navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch((error) => {
      registrationPromise = undefined;
      throw error;
    });
  return registrationPromise;
}
