export interface Participant {
  id: string;
  name: string;
  avatarUrl: string | null;
  whatsapp?: string;
}
export interface Negotiation {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    price: number | string;
    status: string;
    type: string;
    images: { url: string }[];
  };
  buyer: Participant;
  seller: Participant;
  messages?: { content: string; createdAt: string; senderId: string }[];
}
