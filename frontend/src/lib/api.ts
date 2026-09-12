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

export interface ApiFetchOptions extends RequestInit {
  /** Only for public GET/HEAD endpoints; writes always retain authentication. */
  publicRead?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { publicRead = false, ...request } = options;
  const method = (request.method || "GET").toUpperCase();
  const anonymousRead = publicRead && ["GET", "HEAD"].includes(method);
  const headers = new Headers(request.headers);
  // Bodyless reads need no JSON content type or extra CORS preflight.
  if (
    request.body != null &&
    !(request.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Se o usuário estiver autenticado, injeta o token Bearer
  if (!anonymousRead && typeof window !== "undefined" && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch (e) {
      console.error("Falha ao obter token do Firebase", e);
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...request,
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
