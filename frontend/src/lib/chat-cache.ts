import type { Negotiation } from "./chat";
export interface ChatMessage {
  delivery?: "sending";
  id: string;
  negotiationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: { id: string; name: string; avatarUrl: string | null };
}
export interface UnreadSummary {
  total: number;
  conversations: { id: string; count: number }[];
}
export function appendChatMessage(
  messages: ChatMessage[],
  message: ChatMessage,
) {
  if (messages.some((item) => item.id === message.id)) return messages;
  // Sorting is bounded and happens only when a message arrives, never per keystroke.
  return [...messages, message]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .slice(-200);
}
export function mergeChatMessages(
  snapshot: ChatMessage[],
  recent: ChatMessage[],
) {
  const messages = new Map(recent.map((message) => [message.id, message]));
  for (const message of snapshot) {
    const buffered = messages.get(message.id);
    messages.set(
      message.id,
      !message.readAt && buffered?.readAt
        ? { ...message, readAt: buffered.readAt }
        : message,
    );
  }
  return [...messages.values()]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .slice(-200);
}
export function applyReadReceipt(
  messages: ChatMessage[],
  ids: string[],
  readAt: string,
) {
  const read = new Set(ids);
  let changed = false;
  const next = messages.map((message) => {
    if (!read.has(message.id) || message.readAt) return message;
    changed = true;
    return { ...message, readAt };
  });
  return changed ? next : messages;
}
export function updateConversationPreview(
  items: Negotiation[],
  message: ChatMessage,
) {
  const index = items.findIndex((item) => item.id === message.negotiationId);
  if (index < 0) return items;
  const existing = items[index];
  if ((existing.messages?.[0]?.createdAt || "") > message.createdAt)
    return items;
  const next = [...items];
  next[index] = {
    ...existing,
    updatedAt: message.createdAt,
    messages: [
      {
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
      },
    ],
  };
  return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
