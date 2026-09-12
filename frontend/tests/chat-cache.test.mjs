import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
async function load(path) {
 const source = await readFile(new URL(path, import.meta.url), "utf8");
 const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
 return import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
}
const cache = await load("../src/lib/chat-cache.ts");
const keys = await load("../src/lib/query-keys.ts");
const msg = (id, createdAt = "2026-09-12T12:00:00.000Z") => ({ id, createdAt, negotiationId: "n1", senderId: "buyer", content: id, readAt: null });
test("ack and broadcast duplicates preserve the same history reference", () => {
 const items = [msg("a")];
 assert.equal(cache.appendChatMessage(items, msg("a")), items);
});
test("history stays bounded and orders simultaneous messages deterministically", () => {
 const items = Array.from({length: 200}, (_, i) => msg(String(i).padStart(3, "0")));
 const next = cache.appendChatMessage(items, msg("200"));
 assert.equal(next.length, 200);
 assert.equal(next[0].id, "001");
 assert.equal(next.at(-1).id, "200");
});
test("HTTP snapshots cannot erase messages arriving in flight or newer read receipts", () => {
 const next = cache.mergeChatMessages([msg("a")], [{...msg("a"), readAt: "2026-09-12T12:01:00.000Z"}, msg("b")]);
 assert.deepEqual(next.map(m => m.id), ["a", "b"]);
 assert.equal(next[0].readAt, "2026-09-12T12:01:00.000Z");
});
test("read receipts only mark displayed IDs and unchanged receipts preserve references", () => {
 const items = [msg("a"), msg("b")];
 const next = cache.applyReadReceipt(items, ["a"], "now");
 assert.equal(next[0].readAt, "now");
 assert.equal(next[1], items[1]);
 assert.equal(cache.applyReadReceipt(next, ["a"], "later"), next);
});
test("conversation previews update instantly and ignore older events", () => {
 const items = [{id:"n2", updatedAt:"2026-09-12T11:00:00.000Z", messages:[]}, {id:"n1", updatedAt:"2026-09-12T10:00:00.000Z", messages:[]}];
 const next = cache.updateConversationPreview(items, msg("hello"));
 assert.equal(next[0].id, "n1");
 assert.equal(next[0].messages[0].content, "hello");
 assert.equal(cache.updateConversationPreview(next, msg("older", "2026-09-11T12:00:00.000Z")), next);
 assert.equal(cache.updateConversationPreview(items, {...msg("unknown"), negotiationId:"other"}), items);
});
test("reading chat does not invalidate every private resource and caches isolate users", () => {
 assert.deepEqual(keys.mutationTargets("/negotiations/n1/messages/read"), []);
 assert.notDeepEqual(keys.resourcePolicy("/negotiations/unread", "user1").queryKey, keys.resourcePolicy("/negotiations/unread", "user2").queryKey);
});

test("unread icon badge hides at zero, shows counts and caps at 99+", async () => {
 const source = await readFile(new URL("../src/components/chat/UnreadBadge.tsx", import.meta.url), "utf8");
 const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } });
 const exports = {};
 new Function("React", "exports", outputText)(React, exports);
 const badge = count => renderToStaticMarkup(React.createElement(exports.UnreadBadge, { count }));
 assert.equal(badge(0), "");
 assert.match(badge(3), />3<\/span>/);
 assert.match(badge(100), />99\+<\/span>/);
 assert.match(badge(3), /aria-hidden="true"/);
});
