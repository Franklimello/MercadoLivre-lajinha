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
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-xs transition-all">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-black text-2xl text-primary tracking-tight transition-transform hover:scale-105">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm">
            <ShoppingBag className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <span className="hidden sm:inline-block text-foreground">
            Mercado <span className="text-amber-500">Lajinha</span>
          </span>
          <span className="sm:hidden text-foreground">
            M<span className="text-amber-500">L</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          <Link href="/" className="text-foreground/70 hover:text-primary transition-colors flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Produtos
          </Link>
          <Link
            href="/veiculos"
            className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors"
          >
            <Car className="h-4 w-4" />
            Veículos
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/anunciar"
            className={buttonVariants({
              size: 'default',
              className: 'hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all rounded-full px-6',
            })}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Anunciar Grátis
          </Link>

          {loading ? (
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-10 w-10 rounded-full p-0 outline-none flex items-center justify-center cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 font-bold text-primary">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl">
                <div className="p-3 text-sm font-medium bg-muted/30 rounded-lg mb-2">
                  <p className="font-bold text-base text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/conta')} className="flex items-center cursor-pointer p-2.5 rounded-md hover:bg-primary/5">
                  <User className="mr-3 h-4 w-4 text-primary" />
                  <span className="font-medium">Minha Conta</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/negociacoes')} className="flex items-center cursor-pointer p-2.5 rounded-md hover:bg-primary/5">
                  <MessageSquare className="mr-3 h-4 w-4 text-primary" />
                  <span className="font-medium">Mensagens</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer p-2.5 rounded-md hover:bg-destructive/5 mt-1">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="default" onClick={() => signInWithGoogle()} className="font-bold gap-2 rounded-full px-6 shadow-md hover:shadow-lg transition-all">
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background/90 backdrop-blur-xl border-t flex items-center justify-around px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <Link href="/" className="flex flex-col items-center justify-center w-16 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
          <ShoppingBag className="h-5 w-5 mb-1" />
          Produtos
        </Link>
        <Link href="/veiculos" className="flex flex-col items-center justify-center w-16 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
          <Car className="h-5 w-5 mb-1" />
          Veículos
        </Link>
        <Link href="/anunciar" className="flex flex-col items-center justify-center w-16 text-[10px] font-bold text-primary transition-transform hover:scale-105 group">
          <div className="bg-primary text-primary-foreground p-3 rounded-full -mt-6 shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all border-4 border-background">
            <PlusCircle className="h-6 w-6" />
          </div>
          <span className="mt-1">Anunciar</span>
        </Link>
        <Link href="/negociacoes" className="flex flex-col items-center justify-center w-16 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
          <MessageSquare className="h-5 w-5 mb-1" />
          Chat
        </Link>
        <Link href="/conta" className="flex flex-col items-center justify-center w-16 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
          <User className="h-5 w-5 mb-1" />
          Conta
        </Link>
      </div>
    </header>
  );
}
