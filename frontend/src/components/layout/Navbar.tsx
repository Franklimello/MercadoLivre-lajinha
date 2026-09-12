'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShoppingBag, Car, PlusCircle, MessageSquare, User, LogOut, LogIn } from 'lucide-react';

export function Navbar() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span>Mercado <span className="text-amber-500">Lajinha</span></span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-foreground/80 hover:text-foreground transition-colors">
            Produtos
          </Link>
          <Link
            href="/veiculos"
            className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors"
          >
            <Car className="h-4 w-4 text-primary" />
            <span>Veículos</span>
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/anunciar"
            className={buttonVariants({
              size: 'sm',
              className: 'hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs',
            })}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Anunciar Grátis
          </Link>

          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-9 w-9 rounded-full p-0 outline-none flex items-center justify-center cursor-pointer">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 font-bold text-primary">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 text-sm font-medium">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/conta')} className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  Minha Conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/negociacoes')} className="flex items-center cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  Minhas Negociações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="outline" onClick={() => signInWithGoogle()} className="font-medium gap-1.5">
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t flex items-center justify-around px-2 shadow-lg">
        <Link href="/" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
          <ShoppingBag className="h-5 w-5 mb-1" />
          Produtos
        </Link>
        <Link href="/veiculos" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
          <Car className="h-5 w-5 mb-1" />
          Veículos
        </Link>
        <Link href="/anunciar" className="flex flex-col items-center justify-center text-xs font-medium text-primary font-bold">
          <div className="bg-primary text-primary-foreground p-2 rounded-full -mt-5 shadow-md">
            <PlusCircle className="h-6 w-6" />
          </div>
          Anunciar
        </Link>
        <Link href="/negociacoes" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
          <MessageSquare className="h-5 w-5 mb-1" />
          Chat
        </Link>
        <Link href="/conta" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
          <User className="h-5 w-5 mb-1" />
          Conta
        </Link>
      </div>
    </header>
  );
}
