'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { apiFetch } from '@/lib/api';

export interface ChatMessage {
  id: string;
  negotiationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export function useSocketChat(negotiationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // 1. Carrega histórico prévio via REST
  useEffect(() => {
    if (!negotiationId) return;

    setLoading(true);
    apiFetch<ChatMessage[]>(`/negotiations/${negotiationId}/messages`)
      .then((history) => {
        setMessages(history || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar histórico de mensagens:', err);
      })
      .finally(() => setLoading(false));
  }, [negotiationId]);

  // 2. Conexão WebSocket via Socket.IO
  useEffect(() => {
    if (!negotiationId) return;

    let socket: Socket;

    const setupSocket = async () => {
      let token = '';
      if (auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
        } catch (e) {
          console.error(e);
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      socket = io(`${apiUrl}/chat`, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('joinNegotiation', { negotiationId });
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('newMessage', (newMessage: ChatMessage) => {
        setMessages((prev) => {
          // Evita duplicatas
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      });

      socketRef.current = socket;
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [negotiationId]);

  const sendMessage = (content: string) => {
    if (!content.trim() || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      negotiationId,
      content: content.trim(),
    });
  };

  return {
    messages,
    loading,
    connected,
    sendMessage,
  };
}
