"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { apiFetch, ApiError } from "@/lib/api";
import { resourcePolicy } from "@/lib/query-keys";
import {
  appendChatMessage,
  applyReadReceipt,
  updateConversationPreview,
  type ChatMessage,
  type UnreadSummary,
} from "@/lib/chat-cache";
import type { Negotiation } from "@/lib/chat";

const emptyUnread: UnreadSummary = { total: 0, conversations: [] };
const ChatContext = createContext<{
  socket: Socket | null;
  connected: boolean;
  unread: UnreadSummary;
  getRecentMessages: (id: string) => ChatMessage[];
}>({
  socket: null,
  connected: false,
  unread: emptyUnread,
  getRecentMessages: () => [],
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;
  const userId = user?.id;
  const queryClient = useQueryClient();
  const buffer = useRef({ uid: "", rooms: new Map<string, ChatMessage[]>() });
  const getRecentMessages = useCallback(
    (id: string) =>
      buffer.current.uid === uid ? buffer.current.rooms.get(id) || [] : [],
    [uid],
  );
  const [transport, setTransport] = useState<{
    uid: string;
    socket: Socket;
    connected: boolean;
  } | null>(null);
  const connected = !!uid && transport?.uid === uid && transport.connected;
  const unreadKey = useMemo(
    () => resourcePolicy("/negotiations/unread", uid).queryKey,
    [uid],
  );
  const unread = useQuery<UnreadSummary>({
    queryKey: unreadKey,
    queryFn: ({ signal }) => apiFetch("/negotiations/unread", { signal }),
    enabled: !!userId && !!uid,
    staleTime: 15_000,
    gcTime: 60_000,
    refetchInterval: connected ? false : 30_000,
    refetchIntervalInBackground: false,
    retry: (count, error) =>
      !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
      count < 1,
  });

  useEffect(() => {
    if (!uid || !userId) return;
    buffer.current = { uid, rooms: new Map() };
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const received = new Set<string>();
    const refreshUnread = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!disposed)
          void queryClient.invalidateQueries({
            queryKey: unreadKey,
            exact: true,
          });
      }, 150);
    };
    const socket = io(
      `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "")}/chat`,
      {
        autoConnect: false,
        transports: ["websocket", "polling"],
        tryAllTransports: true,
        auth: async (done) => {
          try {
            const current = auth.currentUser;
            if (disposed || current?.uid !== uid) return done({ token: "" });
            const token = await current.getIdToken();
            done({ token: disposed ? "" : token });
          } catch {
            done({ token: "" });
          }
        },
      },
    );
    socket.on("connect", () => {
      if (disposed) return;
      setTransport({ uid, socket, connected: true });
      refreshUnread();
      // Catch up previews missed while disconnected, without refetching profiles.
      void queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "private" &&
          q.queryKey[1] === uid &&
          q.queryKey[3] === "/negotiations",
      });
    });
    const disconnected = () => {
      if (!disposed) setTransport({ uid, socket, connected: false });
    };
    socket.on("disconnect", disconnected);
    socket.on("connect_error", disconnected);
    socket.on("inboxMessage", (message: ChatMessage) => {
      if (
        disposed ||
        !message?.id ||
        !message.negotiationId ||
        received.has(message.id)
      )
        return;
      received.add(message.id);
      const rooms = buffer.current.rooms;
      rooms.set(
        message.negotiationId,
        appendChatMessage(rooms.get(message.negotiationId) || [], message),
      );
      if (rooms.size > 10) rooms.delete(rooms.keys().next().value!);
      if (received.size > 500) received.delete(received.values().next().value!);
      const historyKey = resourcePolicy(
        `/negotiations/${message.negotiationId}/messages`,
        uid,
      ).queryKey;
      // Do not create partial histories for conversations never opened.
      queryClient.setQueryData<ChatMessage[]>(historyKey, (items) =>
        items ? appendChatMessage(items, message) : undefined,
      );
      let missingConversation = false;
      queryClient.setQueriesData<Negotiation[]>(
        {
          predicate: (q) =>
            q.queryKey[0] === "private" &&
            q.queryKey[1] === uid &&
            q.queryKey[3] === "/negotiations",
        },
        (items) => {
          if (!items) return items;
          if (!items.some((item) => item.id === message.negotiationId))
            missingConversation = true;
          return updateConversationPreview(items, message);
        },
      );
      if (missingConversation)
        void queryClient.invalidateQueries({
          predicate: (q) =>
            q.queryKey[0] === "private" &&
            q.queryKey[1] === uid &&
            q.queryKey[3] === "/negotiations",
        });
      if (message.senderId !== userId) {
        queryClient.setQueryData<UnreadSummary>(unreadKey, (current) => {
          const summary = current || emptyUnread;
          const rows = summary.conversations.filter(
            (row) => row.id !== message.negotiationId,
          );
          const count =
            (summary.conversations.find(
              (row) => row.id === message.negotiationId,
            )?.count || 0) + 1;
          return {
            total: summary.total + 1,
            conversations: [...rows, { id: message.negotiationId, count }],
          };
        });
        refreshUnread();
      }
    });
    socket.on(
      "messagesRead",
      (receipt: {
        negotiationId: string;
        messageIds: string[];
        readAt: string;
      }) => {
        if (
          disposed ||
          !receipt?.negotiationId ||
          !Array.isArray(receipt.messageIds)
        )
          return;
        const rooms = buffer.current.rooms;
        const recent = rooms.get(receipt.negotiationId);
        if (recent)
          rooms.set(
            receipt.negotiationId,
            applyReadReceipt(recent, receipt.messageIds, receipt.readAt),
          );
        const key = resourcePolicy(
          `/negotiations/${receipt.negotiationId}/messages`,
          uid,
        ).queryKey;
        queryClient.setQueryData<ChatMessage[]>(key, (items) =>
          items
            ? applyReadReceipt(items, receipt.messageIds, receipt.readAt)
            : undefined,
        );
        refreshUnread();
      },
    );
    socket.connect();
    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      socket.removeAllListeners();
      socket.disconnect();
      if (buffer.current.uid === uid) buffer.current.rooms.clear();
    };
  }, [uid, userId, queryClient, unreadKey]);

  return (
    <ChatContext.Provider
      value={{
        socket: uid && transport?.uid === uid ? transport.socket : null,
        connected,
        unread: userId ? unread.data || emptyUnread : emptyUnread,
        getRecentMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
export function useChatInbox() {
  return useContext(ChatContext);
}
