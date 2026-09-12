"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { auth } from "@/lib/firebase";
import { useApiResource } from "./useApiResource";
export interface ChatMessage {
  id: string;
  negotiationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}
export function useSocketChat(negotiationId: string) {
  const history = useApiResource<ChatMessage[]>(
    `/negotiations/${negotiationId}/messages`,
  );
  const reloadHistory = history.reload;
  const [incoming, setIncoming] = useState<{
    room: string;
    items: ChatMessage[];
  }>({ room: "", items: [] });
  const [connection, setConnection] = useState<{
    room: string;
    ready: boolean;
  }>({ room: "", ready: false });
  const [revision, setRevision] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    let disposed = false;
    let socket: Socket | undefined;
    let joinTimer: ReturnType<typeof setTimeout> | undefined;
    async function setup() {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      if (disposed) return;
      socket = io(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/chat`,
        { auth: { token }, transports: ["websocket", "polling"] },
      );
      socketRef.current = socket;
      socket.on("connect", () => {
        let attempts = 0;
        const join = () => {
          if (disposed || !socket?.connected) return;
          socket
            .timeout(5000)
            .emit(
              "joinNegotiation",
              { negotiationId },
              (error: Error | null, result?: { status: string }) => {
                if (disposed) return;
                if (!error && result?.status === "joined") {
                  setConnection({ room: negotiationId, ready: true });
                  reloadHistory();
                } else if (++attempts < 3) {
                  joinTimer = setTimeout(join, 1000);
                }
              },
            );
        };
        join();
      });
      socket.on("disconnect", () =>
        setConnection({ room: negotiationId, ready: false }),
      );
      socket.on("connect_error", () =>
        setConnection({ room: negotiationId, ready: false }),
      );
      socket.on("newMessage", (message: ChatMessage) => {
        if (message.negotiationId !== negotiationId) return;
        setIncoming((prev) => {
          const items = prev.room === negotiationId ? prev.items : [];
          return {
            room: negotiationId,
            items: items.some((m) => m.id === message.id)
              ? items
              : [...items, message],
          };
        });
      });
    }
    setup().catch(() => {
      if (!disposed) setConnection({ room: negotiationId, ready: false });
    });
    return () => {
      disposed = true;
      clearTimeout(joinTimer);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [negotiationId, revision, reloadHistory]);
  const connected = connection.room === negotiationId && connection.ready;
  async function sendMessage(content: string): Promise<void> {
    if (!content.trim() || !socketRef.current?.connected || !connected)
      throw new Error("A conversa está desconectada. Reconecte para enviar.");
    return new Promise((resolve, reject) => {
      socketRef
        .current!.timeout(10000)
        .emit(
          "sendMessage",
          { negotiationId, content: content.trim() },
          (
            error: Error | null,
            result?: { status: string; message?: string },
          ) => {
            if (error) {
              reject(
                new Error(
                  "O envio não foi confirmado. Confira a conversa antes de tentar novamente.",
                ),
              );
              return;
            }
            if (result?.status !== "sent") {
              reject(
                new Error(
                  result?.message || "Não foi possível enviar a mensagem.",
                ),
              );
              return;
            }
            resolve();
          },
        );
    });
  }
  const combined = [
    ...(history.data || []),
    ...(incoming.room === negotiationId ? incoming.items : []),
  ];
  const messages = Array.from(
    new Map(combined.map((m) => [m.id, m])).values(),
  ).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return {
    messages,
    loading: history.loading,
    error: history.error,
    reload: history.reload,
    connected,
    sendMessage,
    reconnect: () => {
      setConnection({ room: negotiationId, ready: false });
      setRevision((v) => v + 1);
    },
  };
}
