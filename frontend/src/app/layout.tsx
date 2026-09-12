import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { Toaster } from "@/components/ui/sonner";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { QueryProvider } from "@/components/cache/QueryProvider";
import { PwaExperience, OfflineNotice } from "@/components/pwa/PwaExperience";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#246044",
};
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Mercado Livre Lajinha | Usados perto de você",
    template: "%s | Mercado Livre Lajinha",
  },
  description:
    "Compre e venda produtos usados e veículos em Lajinha e região. Negocie direto pelo chat e WhatsApp.",
  icons: {
    icon: "/brand/icon.svg",
    shortcut: "/brand/icon.svg",
    apple: "/brand/pwa-192.png",
  },
  applicationName: "Mercado Livre Lajinha",
  appleWebApp: { capable: true, title: "Lajinha", statusBarStyle: "default" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="site-body">
        <MotionProvider>
          <QueryProvider>
            <AuthProvider>
              <a href="#conteudo" className="skip-link">
                Pular para o conteúdo
              </a>
              <Navbar />
              <PushNotificationBanner />
              <OfflineNotice />
              <main id="conteudo" tabIndex={-1} className="site-main">
                {children}
              </main>
              <PwaExperience />
              <Footer />
              <Toaster position="top-right" />
            </AuthProvider>
          </QueryProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
