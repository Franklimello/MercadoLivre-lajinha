export type NotificationStatus = NotificationPermission | "unsupported";
const PERMISSION_EVENT = "marketplace:notification-permission";
const DISMISSED_KEY = "marketplace:notification-prompt-dismissed";

export function getNotificationPermission(): NotificationStatus {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  )
    return "unsupported";
  return Notification.permission;
}

export function subscribeNotificationPermission(onChange: () => void) {
  window.addEventListener(PERMISSION_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener(PERMISSION_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function notifyPermissionChange() {
  window.dispatchEvent(new Event(PERMISSION_EVENT));
}

export function isNotificationPromptDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissNotificationPrompt() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    /* Dismissal still works in memory when storage is unavailable. */
  }
  notifyPermissionChange();
}
