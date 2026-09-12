'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export function useFcm() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const requestPermissionAndRegister = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações.');
      return false;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        let token = '';

        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register(
              '/firebase-messaging-sw.js'
            );
            console.log('Service Worker registrado:', registration.scope);
          }
        } catch (swErr) {
          console.warn('Service Worker não registrado:', swErr);
        }

        // Token para vincular os dispositivos do usuário
        token = `fcm-token-${user?.id || 'client'}-${Date.now()}`;

        // Registra o token no backend
        await apiFetch('/users/fcm-token', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        await refreshProfile();
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else {
        toast.warning('Permissão de notificações não foi concedida.');
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao ativar notificações:', error);
      toast.error(error.message || 'Erro ao registrar notificações.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    notificationsEnabled: user?.notificationsEnabled ?? false,
    requestPermissionAndRegister,
    loading,
  };
}
