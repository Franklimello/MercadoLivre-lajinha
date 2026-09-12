import { auth } from "./firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const mutationListeners = new Set<(endpoint: string) => Promise<unknown>>();
export function subscribeApiMutations(
  listener: (endpoint: string) => Promise<unknown>,
) {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Se o usuário estiver autenticado, injeta o token Bearer
  if (typeof window !== "undefined" && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (e) {
      console.error("Falha ao obter token do Firebase", e);
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    // TanStack owns data freshness; never reuse an HTTP-cached API response.
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    let errorMessage = "Erro ao processar requisição";
    try {
      const errorData = await response.json();
      errorMessage = Array.isArray(errorData.message)
        ? errorData.message.join(" ")
        : errorData.message || errorMessage;
    } catch {
      // Ignora erro de parse de JSON
    }
    throw new ApiError(errorMessage, response.status);
  }

  const result = response.status === 204 ? undefined : await response.json();
  if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) {
    // A completed write is successful even if a background refresh fails.
    await Promise.allSettled(
      [...mutationListeners].map((listener) => listener(endpoint)),
    );
  }
  return result as T;
}
