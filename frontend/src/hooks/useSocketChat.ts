"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatInbox } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { resourcePolicy } from "@/lib/query-keys";
import {
  appendChatMessage,
  applyReadReceipt,
  mergeChatMessages,
  type ChatMessage,
} from "@/lib/chat-cache";
export type { ChatMessage } from "@/lib/chat-cache";
const emptyMessages: ChatMessage[] = [];

export function useSocketChat(negotiationId: string) {
  const { user, firebaseUser } = useAuth();
  const { socket, connected: online, getRecentMessages } = useChatInbox();
  const queryClient = useQueryClient();
  const historyKey = useMemo(
    () =>
      resourcePolicy(
        `/negotiations/${negotiationId}/messages`,
        firebaseUser?.uid,
      ).queryKey,
    [negotiationId, firebaseUser?.uid],
  );
  const history = useQuery<ChatMessage[]>({
    queryKey: historyKey,
    queryFn: async ({ signal }) => {
      const snapshot = await apiFetch<ChatMessage[]>(
        `/negotiations/${negotiationId}/messages`,
        { signal },
      );
      return mergeChatMessages(snapshot, getRecentMessages(negotiationId));
    },
    enabled: !!user && !!firebaseUser,
    staleTime: 15_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const refetch = history.refetch;
  const reloadHistory = useCallback(() => {
    void refetch({ cancelRefetch: false });
  }, [refetch]);
  const messages = history.data || emptyMessages;
  const [joined, setJoined] = useState<{
    room: string;
    socketId: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const hasJoined = useRef(new Set<string>());
  const pendingRead = useRef(false);
  const connected =
    online && joined?.room === negotiationId && joined.socketId === socket?.id;

  useEffect(() => {
    if (!socket || !online) return;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const join = () => {
      if (disposed || !socket.connected) return;
      socket
        .timeout(5000)
        .emit(
          "joinNegotiation",
          { negotiationId },
          (error: Error | null, result?: { status: string }) => {
            if (disposed) return;
            if (!error && result?.status === "joined" && socket.id) {
              setJoined({ room: negotiationId, socketId: socket.id });
              // Initial HTTP history loads in parallel. Refetch only to recover gaps.
              if (hasJoined.current.has(negotiationId)) reloadHistory();
              hasJoined.current.add(negotiationId);
            } else if (result?.status !== "forbidden" && ++attempts < 3) {
              retryTimer = setTimeout(join, 600);
            }
          },
        );
    };
    const receive = (message: ChatMessage) => {
      if (message.negotiationId !== negotiationId || !firebaseUser) return;
      const key = resourcePolicy(
        `/negotiations/${negotiationId}/messages`,
        firebaseUser.uid,
      ).queryKey;
      queryClient.setQueryData<ChatMessage[]>(key, (items) =>
        items ? appendChatMessage(items, message) : undefined,
      );
    };
    socket.on("newMessage", receive);
    join();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket.off("newMessage", receive);
      if (socket.connected) socket.emit("leaveNegotiation", { negotiationId });
    };
  }, [
    socket,
    online,
    negotiationId,
    revision,
    reloadHistory,
    queryClient,
    firebaseUser,
  ]);

  async function sendMessage(content: string): Promise<void> {
    if (!content.trim() || !socket?.connected || !connected)
      throw new Error("A conversa está desconectada. Reconecte para enviar.");
    return new Promise((resolve, reject) => {
      socket
        .timeout(10000)
        .emit(
          "sendMessage",
          { negotiationId, content: content.trim() },
          (
            error: Error | null,
            result?: { status: string; message?: ChatMessage | string },
          ) => {
            if (error)
              return reject(
                new Error(
                  "O envio não foi confirmado. Confira a conversa antes de tentar novamente.",
                ),
              );
            if (result?.status !== "sent")
              return reject(
                new Error(
                  typeof result?.message === "string"
                    ? result.message
                    : "Não foi possível enviar a mensagem.",
                ),
              );
            // The persisted acknowledgement covers a missed broadcast without duplicates.
            if (
              result.message &&
              typeof result.message !== "string" &&
              firebaseUser &&
              auth.currentUser?.uid === firebaseUser.uid
            ) {
              const key = resourcePolicy(
                `/negotiations/${negotiationId}/messages`,
                firebaseUser.uid,
              ).queryKey;
              queryClient.setQueryData<ChatMessage[]>(key, (items) =>
                items
                  ? appendChatMessage(items, result.message as ChatMessage)
                  : undefined,
              );
            }
            resolve();
          },
        );
    });
  }
  const markRead = useCallback(
    async (
      canRead: () => boolean = () =>
        document.visibilityState === "visible" && document.hasFocus(),
    ) => {
      if (!user || !firebaseUser || pendingRead.current || !canRead()) return;
      pendingRead.current = true;
      let changed = false;
      try {
        // Read the current cache again after each request so messages arriving
        // during the request are acknowledged only while the conversation is visible.
        for (let batch = 0; batch < 10 && canRead(); batch++) {
          if (auth.currentUser?.uid !== firebaseUser.uid) break;
          const items =
            queryClient.getQueryData<ChatMessage[]>(historyKey) || [];
          const ids = items
            .filter(
              (message) => message.senderId !== user.id && !message.readAt,
            )
            .map((message) => message.id);
          if (!ids.length) break;
          const receipt = await apiFetch<{
            readAt: string;
            messageIds: string[];
          }>(`/negotiations/${negotiationId}/messages/read`, {
            method: "PATCH",
            body: JSON.stringify({ messageIds: ids }),
          });
          if (auth.currentUser?.uid !== firebaseUser.uid) break;
          queryClient.setQueryData<ChatMessage[]>(historyKey, (current) =>
            current
              ? applyReadReceipt(current, receipt.messageIds, receipt.readAt)
              : undefined,
          );
          changed = true;
        }
      } catch {
        /* Keep unread messages intact when offline; retry on focus/next message. */
      } finally {
        pendingRead.current = false;
        if (changed)
          void queryClient.invalidateQueries({
            queryKey: resourcePolicy("/negotiations/unread", firebaseUser.uid)
              .queryKey,
            exact: true,
          });
      }
    },
    [user, firebaseUser, historyKey, negotiationId, queryClient],
  );

  return {
    messages,
    loading: history.isPending,
    error: history.data ? null : history.error,
    reload: reloadHistory,
    connected,
    sendMessage,
    markRead,
    reconnect: () => {
      if (socket && !socket.connected) socket.connect();
      setRevision((value) => value + 1);
    },
  };
}
