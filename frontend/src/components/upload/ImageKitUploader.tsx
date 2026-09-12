'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export interface UploadedImage {
  url: string;
  fileId: string;
}

interface ImageKitUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
}

export function ImageKitUploader({
  images,
  onChange,
  maxImages = 5,
}: ImageKitUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (files.length > remainingSlots) {
      toast.error(`Você só pode adicionar mais ${remainingSlots} imagem(ns). Limite: 5 fotos.`);
      return;
    }

    setUploading(true);
    const newUploaded: UploadedImage[] = [];

    try {
      // 1. Obter parâmetros de assinatura do backend
      let authParams: { token: string; expire: number; signature: string };
      try {
        authParams = await apiFetch('/upload/auth');
      } catch {
        authParams = {
          token: 'mock-token-' + Date.now(),
          expire: Math.floor(Date.now() / 1000) + 1800,
          signature: 'mock-sig',
        };
      }

      const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`A imagem "${file.name}" excede o tamanho máximo de 5MB.`);
          continue;
        }

        if (publicKey && publicKey !== 'your_imagekit_public_key') {
          // Upload real para o ImageKit
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', file.name);
          formData.append('publicKey', publicKey);
          formData.append('signature', authParams.signature);
          formData.append('expire', String(authParams.expire));
          formData.append('token', authParams.token);

          const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Falha no upload para o ImageKit');
          const data = await res.json();
          newUploaded.push({ url: data.url, fileId: data.fileId });
        } else {
          // Modo desenvolvimento: gera preview data URL
          const previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(file);
          });
          newUploaded.push({
            url: previewUrl,
            fileId: `mock-file-${Date.now()}-${i}`,
          });
        }
      }

      onChange([...images, ...newUploaded]);
      toast.success(`${newUploaded.length} imagem(ns) adicionada(s)!`);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao enviar imagem. Verifique sua conexão.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          Fotos do Anúncio ({images.length}/{maxImages})
        </label>
        <span className="text-xs text-muted-foreground">Máximo de 5 fotos</span>
      </div>

      {/* Grid de Imagens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <div
            key={img.fileId || idx}
            className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/40 shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {idx === 0 && (
              <span className="absolute bottom-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                Principal
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-destructive text-white p-1 rounded-full transition-colors opacity-90 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Botão de Upload */}
        {images.length < maxImages && (
          <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-primary/5 cursor-pointer transition-colors p-3 text-center">
            {uploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin mb-1.5" />
            ) : (
              <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary mb-1.5" />
            )}
            <span className="text-xs font-semibold text-foreground">
              {uploading ? 'Enviando...' : 'Adicionar Foto'}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG até 5MB</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
