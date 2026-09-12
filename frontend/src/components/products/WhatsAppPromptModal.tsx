'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Bell, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function WhatsAppPromptModal({
  open,
  onOpenChange,
  onCompleted,
}: WhatsAppPromptModalProps) {
  const { user, updateProfile } = useAuth();
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp || whatsapp.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD (ex: 33999998888).');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        whatsapp,
        notificationsEnabled: true,
      });
      toast.success('Perfil atualizado com sucesso! Você já pode publicar anúncios.');
      onOpenChange(false);
      onCompleted();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-2">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Requisitos para Anunciar
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Para garantir a confiança dos compradores em Lajinha, é obrigatório cadastrar seu WhatsApp e ativar notificações.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/60 p-3.5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade garantida:</strong> Seu WhatsApp nunca fica visível no anúncio público. Ele só é compartilhado quando você inicia uma negociação com um comprador.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Número de WhatsApp (com DDD)
            </label>
            <Input
              placeholder="Ex: 33999998888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full font-semibold h-11 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
