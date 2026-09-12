'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ImageKitUploader, type UploadedImage } from '@/components/upload/ImageKitUploader';
import { WhatsAppPromptModal } from '@/components/products/WhatsAppPromptModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { PlusCircle, ShoppingBag, Car, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AnunciarPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('GOOD');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>('/products/categories')
      .then((cats) => setCategories(cats))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Você precisa estar logado para publicar.');
      signInWithGoogle();
      return;
    }

    // Valida se o usuário cumpriu os requisitos obrigatórios
    if (!user.whatsapp || !user.notificationsEnabled) {
      setShowRequirementModal(true);
      return;
    }

    if (images.length === 0) {
      toast.error('Adicione pelo menos 1 foto do produto.');
      return;
    }

    if (images.length > 5) {
      toast.error('Máximo de 5 fotos permitido.');
      return;
    }

    if (!categoryId) {
      toast.error('Selecione uma categoria.');
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Informe um valor de preço válido.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string }>('/products', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          price: numericPrice,
          stock: parseInt(stock, 10) || 1,
          condition,
          categoryId,
          images,
          city: 'Lajinha',
          state: 'MG',
        }),
      });

      toast.success('Anúncio publicado com sucesso!');
      router.push(`/produtos/${created.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao publicar anúncio.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PlusCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Faça login para anunciar</h2>
        <p className="text-sm text-muted-foreground">
          Para garantir a segurança das negociações locais, é necessário entrar com sua conta Google antes de publicar.
        </p>
        <Button onClick={() => signInWithGoogle()} className="w-full font-semibold h-11">
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <Link
          href="/veiculos/novo"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/15 transition-colors"
        >
          <Car className="h-3.5 w-3.5" />
          É um veículo? Clique aqui
        </Link>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Publicar Novo Anúncio</CardTitle>
          <CardDescription>
            Preencha os detalhes do seu produto. Seu WhatsApp não será exibido publicamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload de até 5 fotos */}
            <ImageKitUploader images={images} onChange={setImages} maxImages={5} />

            {/* Título */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Título do anúncio *
              </label>
              <Input
                placeholder="Ex: Celular Samsung Galaxy A54 128GB"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
              />
            </div>

            {/* Categoria e Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Categoria *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Estado de Conservação *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="NEW">Novo (na caixa)</option>
                  <option value="LIKE_NEW">Seminovo (pouquíssimo uso)</option>
                  <option value="GOOD">Bom estado (marcas leves)</option>
                  <option value="FAIR">Usado (funcional com marcas)</option>
                </select>
              </div>
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Preço (R$) *
                </label>
                <Input
                  placeholder="0,00"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Quantidade em Estoque *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Descrição detalhada *
              </label>
              <Textarea
                placeholder="Descreva o tempo de uso, funcionamento, acompanha caixa ou acessórios..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-bold h-12 shadow-sm text-base"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar Anúncio Agora'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Modal de Requisitos (WhatsApp e Notificações) */}
      <WhatsAppPromptModal
        open={showRequirementModal}
        onOpenChange={setShowRequirementModal}
        onCompleted={() => {
          toast.info('Dados preenchidos. Agora você pode clicar em Publicar!');
        }}
      />
    </div>
  );
}
