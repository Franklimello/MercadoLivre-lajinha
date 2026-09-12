'use client';

import React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface WhatsAppDirectButtonProps {
  phone: string;
  sellerName: string;
  productTitle: string;
  className?: string;
}

export function WhatsAppDirectButton({
  phone,
  sellerName,
  productTitle,
  className = '',
}: WhatsAppDirectButtonProps) {
  if (!phone) return null;

  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;

  const message = encodeURIComponent(
    `Olá ${sellerName}! Vi seu anúncio "${productTitle}" no Mercado Lajinha e tenho interesse em negociar com você.`
  );

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({
        className: `bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-xs transition-colors ${className}`,
      })}
    >
      <MessageCircle className="h-5 w-5" />
      Conversar no WhatsApp
    </a>
  );
}
