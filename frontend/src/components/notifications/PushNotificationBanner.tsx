'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFcm } from '@/hooks/useFcm';
import { Button } from '@/components/ui/button';
import { Bell, ShieldCheck, Loader2 } from 'lucide-react';

export function PushNotificationBanner() {
  const { user } = useAuth();
  const { notificationsEnabled, requestPermissionAndRegister, loading } = useFcm();

  if (!user || notificationsEnabled) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Bell className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Ative as notificações push:</strong> Receba alertas instantâneos quando compradores enviarem mensagens nas suas negociações.
          </span>
        </div>
        <Button
          size="xs"
          onClick={() => requestPermissionAndRegister()}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 text-xs shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              Ativando...
            </>
          ) : (
            'Ativar Notificações'
          )}
        </Button>
      </div>
    </div>
  );
}
