'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ImageKitUploader, type UploadedImage } from '@/components/upload/ImageKitUploader';
import { WhatsAppPromptModal } from '@/components/products/WhatsAppPromptModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Car, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NovoVeiculoPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);

  // Campos do formulário
  const [vehicleType, setVehicleType] = useState('CAR');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [fuel, setFuel] = useState('Flex');
  const [transmission, setTransmission] = useState('Manual');
  const [engine, setEngine] = useState('1.0');
  const [bodyType, setBodyType] = useState('Hatch');
  const [plateEnd, setPlateEnd] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [description, setDescription] = useState('');

  useEffect(() => {
    apiFetch<Category[]>('/products/categories')
      .then((cats) => setCategories(cats))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Faça login para anunciar.');
      signInWithGoogle();
      return;
    }

    if (!user.whatsapp || !user.notificationsEnabled) {
      setShowRequirementModal(true);
      return;
    }

    if (images.length === 0) {
      toast.error('Adicione pelo menos 1 foto do veículo.');
      return;
    }

    if (images.length > 5) {
      toast.error('Máximo de 5 fotos permitido.');
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Informe um valor de preço válido.');
      return;
    }

    const veiculosCat = categories.find((c) => c.slug === 'veiculos') || categories[0];
    if (!veiculosCat) {
      toast.error('Categoria de veículos indisponível.');
      return;
    }

    const title = `${brand} ${model} ${engine} ${year}`;

    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string }>('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          price: numericPrice,
          condition,
          categoryId: veiculosCat.id,
          images,
          vehicleType,
          brand,
          model,
          year: parseInt(year, 10),
          mileage: parseInt(mileage, 10) || 0,
          color,
          fuel,
          transmission,
          engine,
          bodyType,
          plateEnd: plateEnd || undefined,
          city: 'Lajinha',
          state: 'MG',
        }),
      });

      toast.success('Veículo anunciado com sucesso!');
      router.push(`/veiculos/${created.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao anunciar veículo.');
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
          <Car className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Faça login para anunciar veículo</h2>
        <p className="text-sm text-muted-foreground">
          Entre com sua conta Google para publicar seu veículo com total segurança.
        </p>
        <Button onClick={() => signInWithGoogle()} className="w-full font-semibold h-11 bg-indigo-600 text-white">
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link href="/veiculos" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Veículos
      </Link>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Car className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Classificados Lajinha</span>
          </div>
          <CardTitle className="text-2xl font-bold">Anunciar Veículo</CardTitle>
          <CardDescription>
            Preencha a ficha técnica completa para atrair compradores qualificados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload de até 5 fotos */}
            <ImageKitUploader images={images} onChange={setImages} maxImages={5} />

            {/* Tipo de Veículo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Tipo de Veículo *</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary"
              >
                <option value="CAR">Carro de Passeio</option>
                <option value="MOTORCYCLE">Moto</option>
                <option value="TRUCK">Caminhão</option>
                <option value="UTILITY">Utilitário / Caminhonete / Van</option>
                <option value="AGRI_MACHINE">Máquina Agrícola / Trator</option>
                <option value="OTHER">Outro tipo de veículo</option>
              </select>
            </div>

            {/* Marca e Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Marca / Fabricante *</label>
                <Input
                  placeholder="Ex: Fiat, Chevrolet, Honda, John Deere"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Modelo / Versão *</label>
                <Input
                  placeholder="Ex: Strada Freedom, Onix LTZ, CG 160 Fan"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Ano, Quilometragem, Preço */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Ano Fabricação/Modelo *</label>
                <Input
                  type="number"
                  min="1950"
                  max="2030"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Quilometragem (km) *</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 45000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Preço (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Câmbio, Combustível, Motor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Câmbio *</label>
                <select
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automático">Automático</option>
                  <option value="Automatizado / CVT">Automatizado / CVT</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Combustível *</label>
                <select
                  value={fuel}
                  onChange={(e) => setFuel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="Flex">Flex (Gasolina/Etanol)</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Etanol">Etanol</option>
                  <option value="Híbrido/Elétrico">Híbrido / Elétrico</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Motor / Cilindrada *</label>
                <Input
                  placeholder="Ex: 1.0, 1.4, 2.0 Turbo, 160cc"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Cor, Carroceria, Final da Placa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Cor *</label>
                <Input
                  placeholder="Ex: Prata, Branco, Preto"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Carroceria</label>
                <Input
                  placeholder="Ex: Sedan, Hatch, SUV, Picape"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Final da Placa</label>
                <Input
                  maxLength={1}
                  placeholder="Ex: 7"
                  value={plateEnd}
                  onChange={(e) => setPlateEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Descrição do Veículo *</label>
              <Textarea
                rows={4}
                placeholder="Detalhes sobre revisões, pneus, documentação em dia, IPVA pago, opcionais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-bold h-12 shadow-sm text-base bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Publicando Veículo...
                </>
              ) : (
                'Publicar Anúncio de Veículo'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
