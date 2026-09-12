export interface Category {
  id: string;
  name: string;
  slug: string;
}
export interface ListingPhoto {
  url: string;
  position: number;
  fileId?: string;
}
export interface ProductSummary {
  id: string;
  title: string;
  price: number | string;
  condition: string;
  city: string;
  state: string;
  createdAt: string;
  images: ListingPhoto[];
  category?: { id?: string; name: string; slug: string };
  type: string;
}
export interface VehicleSpecs {
  vehicleType: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  engine: string;
  color?: string;
  bodyType?: string;
  plateEnd?: string;
}
export interface VehicleSummary extends ProductSummary {
  vehicle: VehicleSpecs;
}
export interface ListingDetail extends ProductSummary {
  sellerId: string;
  description: string;
  stock: number;
  status: string;
  categoryId: string;
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  vehicle?: VehicleSpecs;
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export const conditions: Record<string, string> = {
  NEW: "Novo",
  LIKE_NEW: "Seminovo",
  GOOD: "Bom estado",
  FAIR: "Usado",
};
export const productStatuses: Record<string, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  SOLD: "Vendido",
};
export const negotiationStatuses: Record<string, string> = {
  OPEN: "Aberta",
  NEGOTIATING: "Em negociação",
  AGREED: "Acordo fechado",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
};
export const vehicleTypes = [
  { value: "CAR", label: "Carros" },
  { value: "MOTORCYCLE", label: "Motos" },
  { value: "TRUCK", label: "Caminhões" },
  { value: "UTILITY", label: "Utilitários" },
  { value: "AGRI_MACHINE", label: "Máquinas agrícolas" },
  { value: "OTHER", label: "Outros" },
];
export const fuels = [
  "Flex",
  "Gasolina",
  "Diesel",
  "Etanol",
  "Híbrido/Elétrico",
];
export const transmissions = ["Manual", "Automático", "Automatizado / CVT"];
export const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export function formatPrice(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
export function formatDate(value: string, month: "short" | "long" = "short") {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month,
    year: "numeric",
  });
}
export function relativeDate(value: string, now = Date.now()) {
  const days = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 86400000),
  );
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}
export function errorMessage(
  error: unknown,
  fallback = "Não foi possível concluir. Tente novamente.",
) {
  return error instanceof Error ? error.message : fallback;
}
export function listingHref(item: { id: string; type?: string }) {
  return `/${item.type === "VEHICLE" ? "veiculos" : "produtos"}/${item.id}`;
}
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}
export function validPhone(value: string) {
  return /^(?:55)?\d{10,11}$/.test(phoneDigits(value));
}
