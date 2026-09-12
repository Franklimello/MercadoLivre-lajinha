'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFcm } from '@/hooks/useFcm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  User,
  ShoppingBag,
  MessageSquare,
  MessageCircle,
  Bell,
  PlusCircle,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface MyProduct {
  id: string;
  title: string;
  price: number | string;
  stock: number;
  status: 'ACTIVE' | 'PAUSED' | 'SOLD';
  type: 'PRODUCT' | 'VEHICLE';
  createdAt: string;
  images: { url: string; position: number }[];
  category: { name: string };
  _count: { negotiations: number };
}

export default function ContaPage() {
  const { user, loading: authLoading, signInWithGoogle, updateProfile } = useAuth();
  const { notificationsEnabled, requestPermissionAndRegister, loading: fcmLoading } = useFcm();

  const [products, setProducts] = useState<MyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tab, setTab] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'SOLD'>('ALL');
  
  // WhatsApp State
  const [whatsapp, setWhatsapp] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (user?.whatsapp) {
      setWhatsapp(user.whatsapp);
    }
  }, [user]);

  const loadMyProducts = () => {
    if (!user) return;
    setLoadingProducts(true);
    apiFetch<MyProduct[]>('/products/my/all')
      .then((data) => setProducts(data || []))
      .catch((err) => {
        console.error(err);
        toast.error('Erro ao carregar seus anúncios.');
      })
      .finally(() => setLoadingProducts(false));
  };

  useEffect(() => {
    loadMyProducts();
  }, [user]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim() || whatsapp.trim().length < 10) {
      toast.error('Informe um WhatsApp válido com DDD (ex: 33999998888).');
      return;
    }

    setSavingPhone(true);
    try {
      await updateProfile({ whatsapp: whatsapp.trim() });
      toast.success('WhatsApp atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar WhatsApp.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: 'ACTIVE' | 'PAUSED' | 'SOLD') => {
    try {
      await apiFetch(`/products/${productId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(
        newStatus === 'ACTIVE'
          ? 'Anúncio reativado!'
          : newStatus === 'PAUSED'
          ? 'Anúncio pausado.'
          : 'Anúncio marcado como vendido!'
      );
      loadMyProducts();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status do anúncio.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza de que deseja excluir este anúncio permanentemente?')) {
      return;
    }

    try {
      await apiFetch(`/products/${productId}`, {
        method: 'DELETE',
      });
      toast.success('Anúncio excluído com sucesso.');
      loadMyProducts();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir anúncio.');
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
          <User className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Faça login para ver sua conta</h2>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta Google para gerenciar seus anúncios e dados.
        </p>
        <Button onClick={() => signInWithGoogle()} className="w-full font-semibold h-11">
          Entrar com Google
        </Button>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    if (tab === 'ALL') return true;
    return p.status === tab;
  });

  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const pausedCount = products.filter((p) => p.status === 'PAUSED').length;
  const soldCount = products.filter((p) => p.status === 'SOLD').length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header do Perfil */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-xs">
            <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Membro Lajinha</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Link
            href="/anunciar"
            className={buttonVariants({
              className: 'flex-1 md:flex-initial font-bold gap-1.5 bg-primary text-primary-foreground',
            })}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Anúncio
          </Link>
          <Link
            href="/negociacoes"
            className={buttonVariants({
              variant: 'outline',
              className: 'flex-1 md:flex-initial font-medium gap-1.5',
            })}
          >
            <MessageSquare className="h-4 w-4" />
            Negociações
          </Link>
        </div>
      </div>

      {/* Grid de Requisitos Obrigatórios do Vendedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuração de WhatsApp */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-bold">WhatsApp do Vendedor</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Obrigatório para publicar anúncios. Nunca exposto publicamente; apenas entregue ao comprador após negociação iniciada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePhone} className="flex gap-2">
              <Input
                placeholder="Ex: 33999998888"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="h-10 text-sm"
              />
              <Button
                type="submit"
                disabled={savingPhone}
                className="h-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </form>
            {user.whatsapp && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Cadastrado: {user.whatsapp}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notificações Push FCM */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-bold">Notificações Push</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Obrigatório para publicar anúncios. Garante que você não perca compradores interessados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    notificationsEnabled ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
                <span className="font-semibold text-foreground">
                  {notificationsEnabled ? 'Notificações Ativas' : 'Notificações Desativadas'}
                </span>
              </div>
              <Button
                size="sm"
                variant={notificationsEnabled ? 'outline' : 'default'}
                disabled={fcmLoading}
                onClick={() => requestPermissionAndRegister()}
                className="font-bold text-xs"
              >
                {fcmLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : notificationsEnabled ? (
                  'Reconectar Dispositivo'
                ) : (
                  'Ativar Agora'
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Seu dispositivo atual receberá alertas de novas negociações e mensagens.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gerenciamento de Meus Anúncios */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Meus Anúncios</h2>
            <p className="text-xs text-muted-foreground">
              Total de {products.length} anúncio(s) cadastrado(s)
            </p>
          </div>

          {/* Filtros de Status */}
          <div className="flex gap-1.5 bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'ALL' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setTab('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'ACTIVE' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ativos ({activeCount})
            </button>
            <button
              onClick={() => setTab('PAUSED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'PAUSED' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pausados ({pausedCount})
            </button>
            <button
              onClick={() => setTab('SOLD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                tab === 'SOLD' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vendidos ({soldCount})
            </button>
          </div>
        </div>

        {loadingProducts ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-3">
            {filteredProducts.map((p) => {
              const coverImg = p.images?.[0]?.url;
              const linkUrl = p.type === 'VEHICLE' ? `/veiculos/${p.id}` : `/produtos/${p.id}`;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted border border-border">
                      {coverImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverImg}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            p.status === 'ACTIVE'
                              ? 'default'
                              : p.status === 'PAUSED'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-[10px] font-bold"
                        >
                          {p.status === 'ACTIVE'
                            ? 'Ativo'
                            : p.status === 'PAUSED'
                            ? 'Pausado'
                            : 'Vendido'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{p.category?.name}</span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground truncate">{p.title}</h3>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-extrabold text-primary">
                          {Number(p.price).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <span>•</span>
                        <span>{p._count.negotiations} negociação(ões)</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Anúncio */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap border-t sm:border-t-0 pt-2 sm:pt-0">
                    <Link
                      href={linkUrl}
                      target="_blank"
                      className={buttonVariants({
                        size: 'sm',
                        variant: 'outline',
                        className: 'text-xs gap-1',
                      })}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver
                    </Link>

                    {p.status === 'ACTIVE' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(p.id, 'PAUSED')}
                          className="text-xs gap-1"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Pausar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(p.id, 'SOLD')}
                          className="text-xs gap-1 text-emerald-600 border-emerald-600/30 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Vendido
                        </Button>
                      </>
                    )}

                    {p.status === 'PAUSED' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(p.id, 'ACTIVE')}
                          className="text-xs gap-1 text-primary border-primary/30"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Reativar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(p.id, 'SOLD')}
                          className="text-xs gap-1 text-emerald-600 border-emerald-600/30"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Vendido
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-bold text-foreground">Nenhum anúncio nesta categoria</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Você ainda não tem anúncios {tab === 'ACTIVE' ? 'ativos' : tab === 'PAUSED' ? 'pausados' : tab === 'SOLD' ? 'vendidos' : 'cadastrados'}.
            </p>
            <Link href="/anunciar" className={buttonVariants({ className: 'font-semibold text-xs mt-2' })}>
              Publicar Novo Anúncio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
