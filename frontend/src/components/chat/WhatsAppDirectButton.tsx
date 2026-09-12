import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { phoneDigits } from "@/lib/marketplace";
export function WhatsAppDirectButton({
  phone,
  sellerName,
  productTitle,
  className = "",
}: {
  phone: string;
  sellerName: string;
  productTitle: string;
  className?: string;
}) {
  if (!phone) return null;
  const digits = phoneDigits(phone);
  const fullPhone =
    digits.length > 11 && digits.startsWith("55") ? digits : "55" + digits;
  const message = encodeURIComponent(
    `Olá, ${sellerName}! Vi seu anúncio “${productTitle}” no Mercado Livre Lajinha e tenho interesse.`,
  );
  return (
    <a
      href={`https://api.whatsapp.com/send?phone=${fullPhone}&text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", size: "sm", className })}
    >
      <MessageCircle />
      WhatsApp<span className="sr-only"> (abre em outra aba)</span>
    </a>
  );
}
