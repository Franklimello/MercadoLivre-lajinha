"use client";
import { usePathname } from "next/navigation";
export function Footer() {
  const path = usePathname();
  if (/^\/negociacoes\/.+/.test(path)) return null;
  return (
    <footer className="site-footer">
      <div className="shell caption">
        <span className="font-medium text-foreground">
          Mercado Livre Lajinha
        </span>
        <span>Produtos usados e veículos em Lajinha e região.</span>
      </div>
    </footer>
  );
}
