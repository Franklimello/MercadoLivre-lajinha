import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  await readFile(
    new URL("../src/lib/notification-permission.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
);
function load({ browser = true, secure = true, storageBlocked = false } = {}) {
  const values = new Map();
  const notification = { permission: "default" };
  const window = Object.assign(new EventTarget(), {
    isSecureContext: secure,
    Notification: notification,
    PushManager: class {},
  });
  const document = new EventTarget();
  const context = {
    exports: {},
    Event,
    ...(browser
      ? {
          window,
          document,
          Notification: notification,
          navigator: { serviceWorker: {} },
          sessionStorage: {
            getItem(key) {
              if (storageBlocked) throw new Error();
              return values.get(key) ?? null;
            },
            setItem(key, value) {
              if (storageBlocked) throw new Error();
              values.set(key, value);
            },
          },
        }
      : {}),
  };
  vm.runInNewContext(outputText, context);
  return { api: context.exports, window, document, notification };
}

test("permission checks are safe during SSR and on insecure or unsupported browsers", () => {
  assert.equal(
    load({ browser: false }).api.getNotificationPermission(),
    "unsupported",
  );
  assert.equal(
    load({ secure: false }).api.getNotificationPermission(),
    "unsupported",
  );
  const { api, window } = load();
  delete window.PushManager;
  assert.equal(api.getNotificationPermission(), "unsupported");
});

test("reads each native permission state without requesting permission", () => {
  const { api, notification } = load();
  for (const permission of ["default", "granted", "denied"]) {
    notification.permission = permission;
    assert.equal(api.getNotificationPermission(), permission);
  }
});

test("dismissal persists for this session and tolerates blocked storage", () => {
  const { api } = load();
  assert.equal(api.isNotificationPromptDismissed(), false);
  api.dismissNotificationPrompt();
  assert.equal(api.isNotificationPromptDismissed(), true);
  const blocked = load({ storageBlocked: true }).api;
  assert.doesNotThrow(() => blocked.dismissNotificationPrompt());
  assert.equal(blocked.isNotificationPromptDismissed(), false);
});

test("all mounted consumers update on permission changes and clean up listeners", () => {
  const { api, window, document } = load();
  let updates = 0;
  const unsubscribe = api.subscribeNotificationPermission(() => updates++);
  api.notifyPermissionChange();
  window.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(updates, 3);
  unsubscribe();
  api.notifyPermissionChange();
  window.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(updates, 3);
});
